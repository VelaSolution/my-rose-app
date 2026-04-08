-- VELA HQ 운영 시스템 테이블

-- METT-TC 상황 판단
create table if not exists hq_mett (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mission text not null,
  enemy text,
  terrain text,
  troops text,
  time_constraint text,
  civil text,
  created_at timestamptz default now() not null
);

-- KPI 메트릭
create table if not exists hq_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  revenue bigint default 0,
  users_count int default 0,
  conversion_rate numeric(5,2) default 0,
  profit bigint default 0,
  custom_data jsonb default '{}',
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- 목표 (최대 2개)
create table if not exists hq_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  target_value numeric not null,
  current_value numeric default 0,
  metric_type text not null,
  start_date date not null,
  end_date date not null,
  status text default 'active' check (status in ('active','completed','failed')),
  created_at timestamptz default now() not null
);

-- 태스크
create table if not exists hq_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references hq_goals(id) on delete set null,
  title text not null,
  assignee text,
  deadline date,
  status text default 'pending' check (status in ('pending','in_progress','completed','failed')),
  result text,
  created_at timestamptz default now() not null
);

-- AAR (After Action Review)
create table if not exists hq_aar (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  goal text not null,
  result text not null,
  gap_reason text,
  improvement text,
  created_at timestamptz default now() not null
);

-- RLS
alter table hq_mett enable row level security;
alter table hq_metrics enable row level security;
alter table hq_goals enable row level security;
alter table hq_tasks enable row level security;
alter table hq_aar enable row level security;

create policy "own_mett" on hq_mett for all using (auth.uid() = user_id);
create policy "own_metrics" on hq_metrics for all using (auth.uid() = user_id);
create policy "own_goals" on hq_goals for all using (auth.uid() = user_id);
create policy "own_tasks" on hq_tasks for all using (auth.uid() = user_id);
create policy "own_aar" on hq_aar for all using (auth.uid() = user_id);
