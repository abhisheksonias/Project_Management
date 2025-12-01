-- Create user_salary_periods table for period-based salary tracking
create table if not exists public.user_salary_periods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_month date not null,            -- use 1st of month, e.g. '2025-11-01'
  monthly_salary numeric(12,2) not null, -- salary effective for this period
  note text null,
  created_at timestamptz not null default now(),
  constraint user_salary_periods_uniq unique (user_id, period_month)
) tablespace pg_default;

-- Add index for better query performance
create index if not exists idx_user_salary_periods_user_id on public.user_salary_periods(user_id);
create index if not exists idx_user_salary_periods_period_month on public.user_salary_periods(period_month);

-- Update function to use user_salary_periods table
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
  v_month_start := date_trunc('month', p_month_date)::date;

  user_id := p_user_id;
  month_start := v_month_start;

  -- pick salary from user_salary_periods (most recent <= month) else fallback to users.monthly_salary
  select usp.monthly_salary into v_salary
  from public.user_salary_periods usp
  where usp.user_id = p_user_id
    and usp.period_month <= v_month_start
  order by usp.period_month desc
  limit 1;

  if v_salary is null then
    select u.monthly_salary into v_salary from public.users u where u.id = p_user_id;
  end if;

  monthly_salary := v_salary;

  if v_salary is null then
    unpaid_leaves := 0;
    total_hours := 0;
    hourly_cost := null;
    return next;
  end if;

  -- unpaid leaves (full=1, half=0.5)
  select coalesce(sum(
    case when ul.is_paid = true then 0
         when coalesce(ul.leave_type,'full') = 'half' then 0.5
         else 1 end
  ),0)::numeric into v_unpaid
  from public.user_leaves ul
  where ul.user_id = p_user_id
    and date_trunc('month', ul.leave_date)::date = v_month_start;

  unpaid_leaves := v_unpaid;

  -- total hours from view
  select coalesce(umh.total_hours,0)::numeric into v_hrs
  from public.user_month_hours umh
  where umh.user_id = p_user_id and umh.month_start = v_month_start;

  total_hours := v_hrs;

  -- days in month
  v_days_in_month := extract(day from (date_trunc('month', p_month_date) + interval '1 month - 1 day'))::int;
  if v_days_in_month is null or v_days_in_month = 0 then v_days_in_month := 30; end if;

  v_daily_salary := v_salary / v_days_in_month;
  v_final_salary := v_salary - (v_daily_salary * v_unpaid);
  if v_final_salary < 0 then v_final_salary := 0; end if;

  if total_hours is null or total_hours <= 0 then
    hourly_cost := null;
  else
    hourly_cost := round(v_final_salary / total_hours, 2);
  end if;

  return next;
end;
$$ language plpgsql stable;

