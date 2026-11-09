-- Tasklane update: separate workspaces for IO Web and Website Ninja
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

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
