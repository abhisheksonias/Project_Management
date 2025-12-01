-- Create view for project revenue based on milestones
create or replace view public.project_revenue as
with milestone_logged as (
  select
    m.id as milestone_id,
    m.project_id,
    m.is_hourly,
    m.amount,
    m.hourly_rate,
    coalesce(sum(wl.hours_num),0)::numeric(12,2) as logged_hours
  from public.milestones m
  left join public.tasks t on t.milestone_id = m.id
  left join public.work_logs wl on wl.task_id = t.id
  group by m.id, m.project_id, m.is_hourly, m.amount, m.hourly_rate
)
select
  mr.project_id,
  sum(case when mr.is_hourly then (mr.logged_hours * coalesce(mr.hourly_rate,0)) else coalesce(mr.amount,0) end)::numeric(14,2) as project_revenue
from milestone_logged mr
group by mr.project_id;

-- Create view for project profit
create or replace view public.project_profit as
select
  p.id as project_id,
  p.name,
  coalesce(pr.project_revenue,0)::numeric(14,2) as project_revenue,
  coalesce(pc.project_total_cost,0)::numeric(14,2) as project_total_cost,
  (coalesce(pr.project_revenue,0) - coalesce(pc.project_total_cost,0))::numeric(14,2) as profit,
  case when coalesce(pr.project_revenue,0) > 0 then round((coalesce(pr.project_revenue,0) - coalesce(pc.project_total_cost,0)) / coalesce(pr.project_revenue,1)::numeric * 100,2) else null end as profit_margin_percent
from public.projects p
left join public.project_revenue pr on pr.project_id = p.id
left join public.project_total_cost pc on pc.project_id = p.id;

-- Create view for user project revenue share
create or replace view public.user_project_revenue_share as
with user_hours as (
  select
    up.user_id,
    up.project_id,
    coalesce(up.total_hours,0)::numeric(12,2) as user_hours
  from (
    select user_id, coalesce(wl.project_id, t.project_id) as project_id, sum(coalesce(wl.hours_num,0)) as total_hours
    from public.work_logs wl
    left join public.tasks t on wl.task_id = t.id
    group by user_id, coalesce(wl.project_id, t.project_id)
  ) up
)
select
  uh.user_id,
  uh.project_id,
  uh.user_hours,
  pth.total_hours as project_total_hours,
  coalesce(pr.project_revenue,0)::numeric(14,2) as project_revenue,
  case when pth.total_hours > 0 then round(coalesce(pr.project_revenue,0) * (uh.user_hours / pth.total_hours), 2) else 0 end as user_revenue_share
from user_hours uh
left join public.project_total_hours pth on pth.project_id = uh.project_id
left join public.project_revenue pr on pr.project_id = uh.project_id;

-- Create view for user project profit
create or replace view public.user_project_profit as
select
  urs.user_id,
  urs.project_id,
  urs.user_hours,
  urs.project_revenue,
  urs.user_revenue_share,
  coalesce(puc.total_user_cost,0)::numeric(14,2) as user_cost,
  (urs.user_revenue_share - coalesce(puc.total_user_cost,0))::numeric(14,2) as user_profit
from public.user_project_revenue_share urs
left join public.project_user_costs puc on puc.user_id = urs.user_id and puc.project_id = urs.project_id;

