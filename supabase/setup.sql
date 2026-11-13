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
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee uuid references public.profiles (id) on delete set null,
  due date,
  description text not null default '',
  subtasks jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
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

-- Updates for databases created by an earlier version of this script
alter table public.tasks alter column project_id drop not null;
alter table public.tasks add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null;

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

-- Workspaces (same as 003-workspaces.sql)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2E6A4E',
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
drop policy if exists "team manages workspaces" on public.workspaces;
create policy "team manages workspaces" on public.workspaces for all to authenticated using (true) with check (true);

insert into public.workspaces (name, color, position)
select * from (values ('IO Web', '#2E6A4E', 0), ('Website Ninja', '#B23838', 1)) as v (name, color, position)
where not exists (select 1 from public.workspaces);

-- Projects and tasks belong to one workspace; a template with no workspace is shared by both
alter table public.projects add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.tasks add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.templates add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;

-- Everything made before this update goes to the first workspace (IO Web)
update public.projects set workspace_id = (select id from public.workspaces order by position, created_at limit 1) where workspace_id is null;
update public.tasks t set workspace_id = coalesce((select p.workspace_id from public.projects p where p.id = t.project_id), (select id from public.workspaces order by position, created_at limit 1)) where workspace_id is null;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspaces') then
    alter publication supabase_realtime add table public.workspaces;
  end if;
end $$;

-- Email alerts (same as 004-email-alerts.sql)
create extension if not exists pg_net with schema extensions;

alter table public.profiles add column if not exists email_alerts boolean not null default true;
alter table public.projects add column if not exists owner uuid references public.profiles (id) on delete set null;
alter table public.projects add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null;

-- Make text safe to put inside an email
create or replace function public.tasklane_html(t text)
returns text language sql immutable as $$
  select replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- Send one email to a teammate, unless they turned alerts off or no Resend key is set yet
create or replace function public.tasklane_send_email(to_id uuid, subject text, body_html text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  recipient record;
  api_key text;
  sender text;
begin
  select email, email_alerts into recipient from public.profiles where id = to_id;
  if recipient.email is null or not recipient.email_alerts then return; end if;
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then return; end if;
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'tasklane_from' limit 1;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', coalesce(sender, 'Tasklane <onboarding@resend.dev>'),
      'to', jsonb_build_array(recipient.email),
      'subject', subject,
      'html', '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1C221F;max-width:560px">'
        || body_html
        || '<p style="margin-top:24px"><a href="https://donnaninja.github.io/tasklane/" style="background:#2E6A4E;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Open Tasklane</a></p>'
        || '<p style="color:#646E68;font-size:12px;margin-top:24px">You get this because a teammate assigned you work in Tasklane. To stop these emails, open Tasklane, click Edit my name, and turn off email alerts.</p></div>'
    )
  );
end $$;
revoke all on function public.tasklane_send_email(uuid, text, text) from public, anon, authenticated;

create or replace function public.tasklane_person(id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(name, ' ', 1), ''), 'A teammate') from public.profiles where profiles.id = $1
$$;

-- Tasks: email the assignee when someone else gives them a task
create or replace function public.tasklane_task_alert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := coalesce(auth.uid(), new.created_by);
  who text;
  where_text text;
begin
  if new.assignee is null or new.assignee = actor then return new; end if;
  if tg_op = 'UPDATE' and new.assignee is not distinct from old.assignee then return new; end if;
  -- Tasks that arrive with a brand-new project are covered by the project email
  if tg_op = 'INSERT' and exists (select 1 from public.projects p where p.id = new.project_id and p.created_at > now() - interval '2 minutes') then
    return new;
  end if;
  who := coalesce(public.tasklane_person(actor), 'A teammate');
  select coalesce(p.name, 'No project') into where_text from (select 1) x left join public.projects p on p.id = new.project_id;
  perform public.tasklane_send_email(
    new.assignee,
    who || ' assigned you: ' || new.title,
    '<p><b>' || tasklane_html(who) || '</b> assigned you a task in Tasklane.</p>'
      || '<h2 style="font-size:20px;margin:8px 0">' || tasklane_html(new.title) || '</h2>'
      || '<p style="color:#646E68">'
      || case when new.due is not null then 'Due ' || to_char(new.due, 'Dy, Mon FMDD') || ' · ' else '' end
      || initcap(new.priority) || ' priority · ' || tasklane_html(where_text) || '</p>'
      || case when coalesce(new.description, '') <> '' then '<p style="white-space:pre-wrap">' || tasklane_html(new.description) || '</p>' else '' end
  );
  return new;
end $$;

drop trigger if exists tasklane_task_alert on public.tasks;
create trigger tasklane_task_alert
  after insert or update of assignee on public.tasks
  for each row execute function public.tasklane_task_alert();

-- Projects: email the owner when someone else creates a project for them
create or replace function public.tasklane_project_alert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := coalesce(auth.uid(), new.created_by);
  who text;
begin
  if new.owner is null or new.owner = actor then return new; end if;
  if tg_op = 'UPDATE' and new.owner is not distinct from old.owner then return new; end if;
  who := coalesce(public.tasklane_person(actor), 'A teammate');
  perform public.tasklane_send_email(
    new.owner,
    who || ' gave you a project: ' || new.name,
    '<p><b>' || tasklane_html(who) || '</b> created a project for you in Tasklane.</p>'
      || '<h2 style="font-size:20px;margin:8px 0">' || tasklane_html(new.name) || '</h2>'
      || case when coalesce(new.description, '') <> '' then '<p style="color:#646E68">' || tasklane_html(new.description) || '</p>' else '' end
  );
  return new;
end $$;

drop trigger if exists tasklane_project_alert on public.projects;
create trigger tasklane_project_alert
  after insert or update of owner on public.projects
  for each row execute function public.tasklane_project_alert();
