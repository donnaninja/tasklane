-- Tasklane update: tasks without a project, and who assigned each task
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

alter table public.tasks alter column project_id drop not null;
alter table public.tasks add column if not exists created_by uuid default auth.uid() references public.profiles (id) on delete set null;
