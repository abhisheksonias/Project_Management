-- Create function to calculate hourly cost for user per month
create or replace function public.hourly_cost_for_user_month(
  p_user_id uuid,
  p_month_date date
)
returns table(
  user_id uuid,
  month_start date,
  monthly_salary numeric,
  unpaid_leaves numeric,
  total_hours numeric,
  hourly_cost numeric
) as
$$
declare
  v_days_in_month int;
  v_salary numeric;
  v_unpaid numeric;
  v_hrs numeric;
  v_daily_salary numeric;
  v_final_salary numeric;
  v_month_start date;
begin
  -- normalize month start into a local variable
  v_month_start := date_trunc('month', p_month_date)::date;

  -- set return columns' keys
  user_id := p_user_id;
  month_start := v_month_start;

  -- fetch salary (use table alias u)
  select u.monthly_salary into v_salary
  from public.users u
  where u.id = p_user_id;

  monthly_salary := v_salary;

  if v_salary is null then
    unpaid_leaves := 0;
    total_hours := 0;
    hourly_cost := null;
    return next;
  end if;

  -- compute unpaid leaves (full = 1, half = 0.5). paid leaves count as 0.
  select coalesce(sum(
    case
      when ul.is_paid = true then 0
      when coalesce(ul.leave_type,'full') = 'half' then 0.5
      else 1
    end
  ), 0)::numeric into v_unpaid
  from public.user_leaves ul
  where ul.user_id = p_user_id
    and date_trunc('month', ul.leave_date)::date = v_month_start;

  unpaid_leaves := v_unpaid;

  -- fetch total hours from view (if no row, treat as 0)
  select coalesce(umh.total_hours, 0)::numeric into v_hrs
  from public.user_month_hours umh
  where umh.user_id = p_user_id and umh.month_start = v_month_start;

  total_hours := v_hrs;

  -- compute days in month
  v_days_in_month := extract(day from (date_trunc('month', p_month_date) + interval '1 month - 1 day'))::int;
  if v_days_in_month is null or v_days_in_month = 0 then
    v_days_in_month := 30;
  end if;

  -- compute final salary after unpaid leaves
  v_daily_salary := v_salary / v_days_in_month;
  v_final_salary := v_salary - (v_daily_salary * v_unpaid);
  if v_final_salary < 0 then v_final_salary := 0; end if;

  -- compute hourly cost (null if no hours)
  if total_hours is null or total_hours <= 0 then
    hourly_cost := null;
  else
    hourly_cost := round(v_final_salary / total_hours, 2);
  end if;

  return next;
end;
$$ language plpgsql stable;

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

-- Create view for project total hours
create or replace view public.project_total_hours as
select
  coalesce(wl.project_id, t.project_id) as project_id,
  sum(coalesce(wl.hours_num,0))::numeric(12,2) as total_hours
from public.work_logs wl
left join public.tasks t on wl.task_id = t.id
group by coalesce(wl.project_id, t.project_id);

-- Create view for project total cost
create or replace view public.project_total_cost as
select
  project_id,
  coalesce(sum(total_user_cost),0)::numeric(14,2) as project_total_cost
from public.project_user_costs
group by project_id;

