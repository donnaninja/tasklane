-- Tasklane update: email alerts when someone assigns you a task or a project
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.
-- Emails are sent through Resend (resend.com). Add your Resend key afterwards; see the README.

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
