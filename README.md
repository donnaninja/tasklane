# Tasklane

A simple task manager for projects and client work, inspired by Asana.

- Projects and tasks with assignee, due date, status, priority, notes and subtasks
- List and Board views (drag cards between columns)
- "My tasks" view of everything assigned to you
- Reusable project templates
- A request form you can embed on a website, plus notifications and an API key (preview)

Each business (IO Web and Website Ninja) has its own workspace with separate projects, tasks and templates; switch between them at the top of the menu. Tasks are stored in Supabase and shared by everyone on the team, with live updates.

## Files

- `index.html`, `styles.css`, `app.js`: the app, served by GitHub Pages
- `supabase/setup.sql`: run once in the Supabase SQL Editor to create everything for a new setup
- `supabase/002-…`, `003-…`, `004-…`: updates for a database created by an earlier version (run each once, in order)

## Adding a teammate

In Supabase, go to Authentication, then Users, then Add user, then Create new user. Enter their email and a password, and tick "Auto Confirm User". Send them the link and their password.

Live site: https://donnaninja.github.io/tasklane/

## Email alerts

When someone assigns you a task, or creates a project with you as the owner, Tasklane emails you. Emails are sent by [Resend](https://resend.com) (free for up to 3,000 emails a month).

1. Create a Resend account, add and verify a sending domain, and create an API key.
2. In the Supabase SQL Editor, run `supabase/004-email-alerts.sql`, then run this with your own values:

```sql
select vault.create_secret('re_YOUR_KEY', 'resend_api_key');
select vault.create_secret('Tasklane <tasks@your-verified-domain.com>', 'tasklane_from');
```

To change a value later, use `vault.update_secret` with the secret's id from `vault.secrets`. Each person can turn their own alerts off under Edit my profile.
