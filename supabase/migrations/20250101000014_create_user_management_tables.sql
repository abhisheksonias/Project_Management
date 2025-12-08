-- Create user_leaves table
create table if not exists public.user_leaves (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  leave_date date not null,
  is_paid boolean not null default false,
  created_at timestamp with time zone not null default now(),
  leave_type text not null default 'full'::text,
  constraint user_leaves_unique unique (user_id, leave_date),
  constraint user_leaves_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade,
  constraint leave_type_check check (
    (leave_type = any (array['full'::text, 'half'::text]))
  )
) tablespace pg_default;

-- Create user_salary_periods table
create table if not exists public.user_salary_periods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  period_month date not null,
  monthly_salary numeric(12, 2) not null,
  note text null,
  created_at timestamp with time zone not null default now(),
  constraint user_salary_periods_uniq unique (user_id, period_month),
  constraint user_salary_periods_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade,
  constraint user_salary_periods_month_firstday_check check (
    (date_trunc('month'::text, (period_month)::timestamp with time zone) = period_month)
  )
) tablespace pg_default;

-- Create index for user_salary_periods
create index if not exists idx_user_salary_periods_user_month on public.user_salary_periods using btree (user_id, period_month desc) tablespace pg_default;

-- Create upsert_user_salary_period function
create or replace function public.upsert_user_salary_period(
  p_user_id uuid,
  p_period_month date,
  p_monthly_salary numeric,
  p_note text default null
) returns void as $$
begin
  insert into public.user_salary_periods (user_id, period_month, monthly_salary, note)
  values (p_user_id, date_trunc('month', p_period_month)::date, p_monthly_salary, p_note)
  on conflict (user_id, period_month) 
  do update set 
    monthly_salary = excluded.monthly_salary,
    note = coalesce(excluded.note, public.user_salary_periods.note),
    created_at = now();
end;
$$ language plpgsql;

