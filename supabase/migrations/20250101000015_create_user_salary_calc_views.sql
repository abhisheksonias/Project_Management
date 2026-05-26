-- Create view for user month hours
create or replace view public.user_month_hours as
select
  wl.user_id,
  date_trunc('month', wl.created_at)::date as month_start,
  sum(coalesce(wl.hours_num,0))::numeric(12,2) as total_hours
from public.work_logs wl
group by wl.user_id, date_trunc('month', wl.created_at);

-- Create view for user project month hours
create or replace view public.user_project_month_hours as
select
  wl.user_id,
  coalesce(wl.project_id, t.project_id) as project_id,
  date_trunc('month', wl.created_at)::date as month_start,
  sum(coalesce(wl.hours_num,0))::numeric(12,2) as total_hours
from public.work_logs wl
left join public.tasks t on wl.task_id = t.id
group by wl.user_id, coalesce(wl.project_id, t.project_id), date_trunc('month', wl.created_at);

-- Create comprehensive view for user month salary calculations
create or replace view public.user_month_salary_calc as
with months as (
  select user_id, period_month as month_start from public.user_salary_periods
  union
  select user_id, month_start from public.user_month_hours
)
select
  m.user_id,
  m.month_start,
  es.effective_monthly_salary,
  ul.unpaid_leave_units,
  -- days in month
  extract(day from (date_trunc('month', m.month_start) + interval '1 month - 1 day'))::int as days_in_month,
  -- daily salary (null if no effective salary)
  case when es.effective_monthly_salary is not null
    then round(es.effective_monthly_salary / nullif(extract(day from (date_trunc('month', m.month_start) + interval '1 month - 1 day'))::numeric, 0), 2)
    else null end as daily_salary,
  -- deduction amount (null if no effective salary)
  case when es.effective_monthly_salary is not null
    then round((es.effective_monthly_salary / nullif(extract(day from (date_trunc('month', m.month_start) + interval '1 month - 1 day'))::numeric, 0)) * ul.unpaid_leave_units, 2)
    else null end as deduction_amount,
  -- net salary (null if no effective salary)
  case when es.effective_monthly_salary is not null
    then round(greatest(es.effective_monthly_salary - ((es.effective_monthly_salary / nullif(extract(day from (date_trunc('month', m.month_start) + interval '1 month - 1 day'))::numeric, 0)) * ul.unpaid_leave_units), 0), 2)
    else null end as net_monthly_salary,
  h.total_hours,
  -- hourly price (null if no hours or no net salary)
  case
    when h.total_hours > 0 and es.effective_monthly_salary is not null
      then round(greatest(es.effective_monthly_salary - ((es.effective_monthly_salary / nullif(extract(day from (date_trunc('month', m.month_start) + interval '1 month - 1 day'))::numeric, 0)) * ul.unpaid_leave_units), 0) / h.total_hours, 2)
    else null
  end as hourly_price
from months m
left join lateral (
  select usp.monthly_salary as effective_monthly_salary
  from public.user_salary_periods usp
  where usp.user_id = m.user_id and usp.period_month <= m.month_start
  order by usp.period_month desc
  limit 1
) es on true
left join lateral (
  select coalesce(sum(
    case
      when ul.is_paid = true then 0
      when coalesce(ul.leave_type,'full') = 'half' then 0.5
      else 1
    end
  ), 0) as unpaid_leave_units
  from public.user_leaves ul
  where ul.user_id = m.user_id and date_trunc('month', ul.leave_date)::date = m.month_start
) ul on true
left join lateral (
  select coalesce(umh.total_hours, 0)::numeric(12,2) as total_hours
  from public.user_month_hours umh
  where umh.user_id = m.user_id and umh.month_start = m.month_start
) h on true
order by m.user_id, m.month_start;

