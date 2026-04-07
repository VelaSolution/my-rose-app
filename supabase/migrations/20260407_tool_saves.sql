-- 범용 도구 데이터 클라우드 저장 테이블
create table if not exists tool_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool_key text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, tool_key)
);

-- RLS 정책
alter table tool_saves enable row level security;

create policy "Users can read own tool saves"
  on tool_saves for select
  using (auth.uid() = user_id);

create policy "Users can insert own tool saves"
  on tool_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tool saves"
  on tool_saves for update
  using (auth.uid() = user_id);

create policy "Users can delete own tool saves"
  on tool_saves for delete
  using (auth.uid() = user_id);

-- 인덱스
create index if not exists idx_tool_saves_user_tool on tool_saves(user_id, tool_key);
