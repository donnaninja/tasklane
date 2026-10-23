# Tasklane

A simple task manager for projects and client work, inspired by Asana.

- Projects and tasks with assignee, due date, status, priority, notes and subtasks
- List and Board views (drag cards between columns)
- "My tasks" view of everything assigned to you
- Reusable project templates
- A request form you can embed on a website, plus notifications and an API key (preview)

Tasks are stored in Supabase and shared by everyone on the team, with live updates.

## Files

- `index.html`, `styles.css`, `app.js`: the app, served by GitHub Pages
- `supabase/setup.sql`: run once in the Supabase SQL Editor to create the tables, security rules and starter templates

## Adding a teammate

In Supabase, go to Authentication, then Users, then Add user, then Create new user. Enter their email and a password, and tick "Auto Confirm User". Send them the link and their password.

Live site: https://donnaninja.github.io/tasklane/
