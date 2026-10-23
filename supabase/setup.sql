-- Tasklane database setup
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Safe to run more than once.

-- People on the team (one row per login)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  color text not null default '#2E6A4E',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2E6A4E',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee uuid references public.profiles (id) on delete set null,
  due date,
  description text not null default '',
  subtasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tasks_project_id_idx on public.tasks (project_id);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Create a profile automatically for every new login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, color)
  values (
    new.id,
    new.email,
    initcap(replace(split_part(new.email, '@', 1), '.', ' ')),
    (array['#2E6A4E', '#35689E', '#A85E14', '#8A4F9E', '#B23838', '#2F8A8A'])[1 + floor(random() * 6)::int]
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for anyone who signed up before this script ran
insert into public.profiles (id, email, name)
select id, email, initcap(replace(split_part(email, '@', 1), '.', ' ')) from auth.users
on conflict (id) do nothing;

-- Security: only signed-in team members can see or change anything.
-- New logins are created by the admin in Authentication -> Users, so "signed in" means "on the team".
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.templates enable row level security;

drop policy if exists "team reads profiles" on public.profiles;
create policy "team reads profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "people edit own profile" on public.profiles;
create policy "people edit own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "team manages projects" on public.projects;
create policy "team manages projects" on public.projects for all to authenticated using (true) with check (true);
drop policy if exists "team manages tasks" on public.tasks;
create policy "team manages tasks" on public.tasks for all to authenticated using (true) with check (true);
drop policy if exists "team manages templates" on public.templates;
create policy "team manages templates" on public.templates for all to authenticated using (true) with check (true);

-- Live updates: everyone sees changes without refreshing
do $$
declare t text;
begin
  foreach t in array array['projects', 'tasks', 'templates', 'profiles'] loop
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Starter templates (only added when there are none yet)
insert into public.templates (name, description, tasks)
select * from (values
  ('Website launch checklist', 'Everything from brand assets to going live.', '[
    {"title": "Collect brand assets", "priority": "medium", "offset": 2, "subtasks": ["Logo files", "Brand colors", "Fonts"]},
    {"title": "Sitemap and wireframes", "priority": "medium", "offset": 5, "subtasks": []},
    {"title": "Design homepage", "priority": "high", "offset": 10, "subtasks": ["Desktop", "Mobile"]},
    {"title": "Build inner pages", "priority": "medium", "offset": 18, "subtasks": []},
    {"title": "Test on phones and tablets", "priority": "high", "offset": 22, "subtasks": []},
    {"title": "SEO basics: titles, descriptions, sitemap", "priority": "medium", "offset": 24, "subtasks": []},
    {"title": "Go live and point the domain", "priority": "high", "offset": 26, "subtasks": ["Update DNS", "Check SSL", "Submit to Google"]}
  ]'::jsonb),
  ('New client onboarding', 'Welcome a client and get access to what you need.', '[
    {"title": "Send welcome email and contract", "priority": "high", "offset": 0, "subtasks": []},
    {"title": "Kickoff call", "priority": "high", "offset": 3, "subtasks": ["Prepare agenda", "Send calendar invite"]},
    {"title": "Get hosting and domain logins", "priority": "medium", "offset": 5, "subtasks": []},
    {"title": "Set up shared folder", "priority": "low", "offset": 5, "subtasks": []}
  ]'::jsonb),
  ('Blog post', 'One post from idea to published.', '[
    {"title": "Outline", "priority": "medium", "offset": 1, "subtasks": []},
    {"title": "First draft", "priority": "medium", "offset": 4, "subtasks": []},
    {"title": "Edit and add images", "priority": "low", "offset": 6, "subtasks": []},
    {"title": "Publish and share", "priority": "medium", "offset": 7, "subtasks": ["Post on LinkedIn", "Add to newsletter"]}
  ]'::jsonb)
) as v (name, description, tasks)
where not exists (select 1 from public.templates);
