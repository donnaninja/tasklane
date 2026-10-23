/* Supabase connection. Both values are public by design: the database only lets signed-in team members in. */
const SUPABASE_URL = 'PASTE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY';

const I = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  home: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M5.5 8.2l1.8 1.8 3.3-3.6"/></svg>',
  tpl: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1" stroke-dasharray="2 1.5"/></svg>',
  plug: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.5" cy="4" r=".6" fill="currentColor"/><circle cx="2.5" cy="8" r=".6" fill="currentColor"/><circle cx="2.5" cy="12" r=".6" fill="currentColor"/></svg>',
  board: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="2.5" width="3.4" height="11" rx="1"/><rect x="6.3" y="2.5" width="3.4" height="7" rx="1"/><rect x="10.6" y="2.5" width="3.4" height="9" rx="1"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  menu: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>',
  sub: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v6a2 2 0 002 2h6M10 9l2 2-2 2"/></svg>',
  save: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M5 2.5v4h6v-4"/></svg>',
  info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v4M8 4.9v.1"/></svg>',
  logo: '<svg viewBox="0 0 16 16" fill="none" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round"><path d="M3 5h7M3 8h10M3 11h5"/></svg>'
};
const STATUSES = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
const STATUS_NAME = Object.fromEntries(STATUSES);
const COLORS = ['#2E6A4E', '#35689E', '#A85E14', '#8A4F9E', '#B23838', '#2F8A8A'];
const LOCAL_KEY = 'tasklane-local-v2';

const uid = () => crypto.randomUUID();
const pad = n => String(n).padStart(2, '0');
function dayStr(offset) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dayDiff(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); const t = new Date(); t.setHours(12, 0, 0, 0); return Math.round((new Date(y, m - 1, d, 12) - t) / 864e5); }
function dueLabel(s) {
  const n = dayDiff(s); if (n === null) return '';
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Data ---------- */
const configured = /^https:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 40;
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let ME = null;
let S = { people: [], projects: [], tasks: [], templates: [] };
// Website and developer settings stay in this browser until they are wired to the server.
let L;
try { L = JSON.parse(localStorage.getItem(LOCAL_KEY)) || null; } catch (e) { L = null; }
if (!L) L = { webhooks: [], apiKey: 'tl_live_' + Math.random().toString(36).slice(2, 14), widget: { projectId: '', title: 'Request a website change', color: '#2E6A4E' } };
const ui = { view: 'home', projectId: null, mode: 'list', openTask: null, armDelete: false, sideOpen: false, log: [], syncError: '' };
try { Object.assign(ui, JSON.parse(localStorage.getItem(LOCAL_KEY + '-ui')) || {}); } catch (e) {}

const fromProject = r => ({ id: r.id, name: r.name, color: r.color, desc: r.description || '' });
const toProject = p => ({ id: p.id, name: p.name, color: p.color, description: p.desc || '' });
const fromTask = r => ({ id: r.id, projectId: r.project_id, title: r.title, status: r.status, priority: r.priority, assignee: r.assignee || '', due: r.due || '', desc: r.description || '', subtasks: r.subtasks || [], created: r.created_at });
const toTask = t => ({ id: t.id, project_id: t.projectId, title: t.title, status: t.status, priority: t.priority, assignee: t.assignee || null, due: t.due || null, description: t.desc || '', subtasks: t.subtasks });
const fromTemplate = r => ({ id: r.id, name: r.name, desc: r.description || '', tasks: r.tasks || [] });
const toTemplate = t => ({ id: t.id, name: t.name, description: t.desc || '', tasks: t.tasks });
const fromPerson = r => ({ id: r.id, name: r.name || r.email || 'Teammate', color: r.color, email: r.email });

async function loadAll() {
  const [pe, pr, ta, te] = await Promise.all([
    db.from('profiles').select('*').order('name'),
    db.from('projects').select('*').order('created_at'),
    db.from('tasks').select('*').order('created_at'),
    db.from('templates').select('*').order('created_at')
  ]);
  const err = pe.error || pr.error || ta.error || te.error;
  if (err) throw err;
  S = { people: pe.data.map(fromPerson), projects: pr.data.map(fromProject), tasks: ta.data.map(fromTask), templates: te.data.map(fromTemplate) };
}
function syncFailed(error) {
  console.error(error);
  ui.syncError = 'Last change was not saved. Check your connection and refresh.';
  toast("That change wasn't saved. Check your internet connection, then refresh the page.");
  render();
}
async function run(q) { const { error } = await q; if (error) syncFailed(error); else if (ui.syncError) { ui.syncError = ''; renderSide(); } }
const saveTask = t => run(db.from('tasks').upsert(toTask(t)));
const removeTask = id => run(db.from('tasks').delete().eq('id', id));
const saveTemplate = t => run(db.from('templates').upsert(toTemplate(t)));
const removeTemplate = id => run(db.from('templates').delete().eq('id', id));

// Other people's changes arrive live; refresh quietly, but never while someone is typing.
let reloadTimer, renderWhenIdle = false;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    try { await loadAll(); } catch (e) { return; }
    if (isTyping()) renderWhenIdle = true; else render();
  }, 400);
}
function isTyping() { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(a.type))); }
document.addEventListener('focusout', () => setTimeout(() => { if (renderWhenIdle && !isTyping()) { renderWhenIdle = false; render(); } }, 0));

function saveLocal() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(L)); localStorage.setItem(LOCAL_KEY + '-ui', JSON.stringify({ view: ui.view, projectId: ui.projectId, mode: ui.mode })); } catch (e) {}
}
const person = id => S.people.find(p => p.id === id);
const project = id => S.projects.find(p => p.id === id);
const task = id => S.tasks.find(t => t.id === id);
const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
function avatar(id) { const p = person(id); return p ? `<span class="avatar" style="background:${esc(p.color)}" title="${esc(p.name)}">${esc(initials(p.name))}</span>` : '<span class="avatar none" title="Unassigned">?</span>'; }
function dueHtml(t) {
  if (!t.due) return '<span class="due"></span>';
  const n = dayDiff(t.due); const cls = t.status !== 'done' && n < 0 ? 'overdue' : t.status !== 'done' && n <= 1 ? 'soon' : '';
  return `<span class="due ${cls}">${dueLabel(t.due)}</span>`;
}
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3200); }
function notify(event, t) {
  L.webhooks.filter(w => w.event === event || w.event === 'all').forEach(w => {
    ui.log.unshift(`${new Date().toLocaleTimeString()}  POST ${w.url}\n${JSON.stringify({ event, task: { id: t.id, title: t.title, status: t.status, project: project(t.projectId)?.name } })}`);
  });
}

/* ---------- Sign in ---------- */
function gate(html) {
  document.getElementById('app').hidden = true;
  const g = document.getElementById('gate'); g.hidden = false; g.innerHTML = `<div class="gate-card"><div class="brand"><span class="brand-mark">${I.logo}</span>Tasklane</div>${html}</div>`;
}
function showSignIn(error = '') {
  gate(`<h1>Sign in</h1><p>Use the email and password your Tasklane admin gave you.</p>
    ${error ? `<div class="gate-error" role="alert">${esc(error)}</div>` : ''}
    <form class="form-grid" data-form="signin" style="gap:12px">
      <div class="form-grid"><label for="si-email">Email</label><input class="field" id="si-email" name="email" type="email" autocomplete="username" required></div>
      <div class="form-grid"><label for="si-pass">Password</label><input class="field" id="si-pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn primary" id="si-btn">Sign in</button>
    </form>
    <p class="hint">Forgot your password? Ask your Tasklane admin to reset it.</p>`);
  document.getElementById('si-email').focus();
}
async function start(session) {
  ME = session.user.id;
  gate('<p>Loading your team’s tasks…</p>');
  try { await loadAll(); } catch (e) { console.error(e); gate(`<h1>Can’t load tasks</h1><div class="gate-error">${esc(e.message || e)}</div><p>If this is a new setup, run the database setup in Supabase first. Otherwise refresh the page.</p><button class="btn" data-act="sign-out">Sign out</button>`); return; }
  if (!person(ME)) S.people.push({ id: ME, name: session.user.email, color: COLORS[0], email: session.user.email });
  if (ui.view === 'project' && !project(ui.projectId)) ui.view = 'home';
  if (!project(L.widget.projectId)) L.widget.projectId = S.projects[0]?.id || '';
  document.getElementById('gate').hidden = true; document.getElementById('app').hidden = false;
  render();
  db.channel('tasklane').on('postgres_changes', { event: '*', schema: 'public' }, scheduleReload).subscribe();
}

/* ---------- Sidebar ---------- */
function renderSide() {
  const open = S.tasks.filter(t => t.assignee === ME && t.status !== 'done').length;
  const me = person(ME);
  const nav = (view, icon, label, extra = '') => `<button class="nav-item ${ui.view === view ? 'active' : ''}" data-act="go" data-view="${view}">${icon}<span>${label}</span>${extra}</button>`;
  document.getElementById('side').className = 'side' + (ui.sideOpen ? ' open' : '');
  document.getElementById('side').innerHTML = `
    <div class="brand"><span class="brand-mark">${I.logo}</span>Tasklane</div>
    <nav class="nav">
      ${nav('home', I.home, 'My tasks', `<span class="count">${open}</span>`)}
      ${nav('templates', I.tpl, 'Templates')}
      ${nav('connect', I.plug, 'Connect website')}
    </nav>
    <nav class="nav">
      <div class="nav-label">Projects <button class="icon-btn" data-act="new-project" title="New project" aria-label="New project">${I.plus}</button></div>
      ${S.projects.map(p => `<button class="nav-item ${ui.view === 'project' && ui.projectId === p.id ? 'active' : ''}" data-act="open-project" data-id="${p.id}">
        <span class="dot" style="background:${esc(p.color)}"></span><span>${esc(p.name)}</span><span class="count">${S.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length}</span></button>`).join('')}
      ${S.projects.length ? '' : '<p class="hint" style="padding:0 8px">No projects yet.</p>'}
    </nav>
    <div class="side-foot">
      ${ui.syncError ? `<span class="sync err">${esc(ui.syncError)}</span>` : '<span class="sync">Saved for your whole team</span>'}
      <div class="me-row">${avatar(ME)}<b>${esc(me?.name || '')}</b></div>
      <div class="links"><button class="link-btn" data-act="edit-me">Edit my name</button><button class="link-btn" data-act="sign-out">Sign out</button></div>
    </div>`;
}

/* ---------- Main ---------- */
function header(title, sub, actions = '', tabs = '') {
  return `<div class="top ${tabs ? '' : 'no-tabs'}"><div class="top-row">
    <button class="icon-btn menu-btn" data-act="menu" aria-label="Open menu">${I.menu}</button>
    <div style="min-width:0"><h1>${title}</h1>${sub ? `<p class="top-sub">${sub}</p>` : ''}</div>
    <div class="top-actions">${actions}</div></div>${tabs}</div>`;
}
function rowHtml(t, showProject) {
  const done = t.subtasks.filter(s => s.done).length; const p = project(t.projectId);
  return `<div class="row ${t.status === 'done' ? 'is-done' : ''} ${ui.openTask === t.id ? 'selected' : ''}" data-act="open-task" data-id="${t.id}">
    <button class="check ${t.status === 'done' ? 'on' : ''}" data-act="toggle" data-id="${t.id}" aria-label="Mark complete">${I.check}</button>
    <div class="row-title"><span class="t">${esc(t.title)}</span>
      ${t.subtasks.length ? `<span class="meta-sub">${I.sub}${done}/${t.subtasks.length}</span>` : ''}
      ${showProject && p ? `<span class="proj-chip"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</span>` : ''}</div>
    <div class="row-meta">${t.priority !== 'low' && t.status !== 'done' ? `<span class="chip ${t.priority}">${t.priority === 'high' ? 'High' : 'Medium'}</span>` : ''}
      ${showProject ? `<span class="chip ${t.status}">${STATUS_NAME[t.status]}</span>` : ''}${avatar(t.assignee)}${dueHtml(t)}</div>
  </div>`;
}
const byDue = (a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0;

function renderHome() {
  const mine = S.tasks.filter(t => t.assignee === ME && t.status !== 'done').sort(byDue);
  const groups = [
    ['Overdue', mine.filter(t => t.due && dayDiff(t.due) < 0)],
    ['Today and tomorrow', mine.filter(t => t.due && dayDiff(t.due) >= 0 && dayDiff(t.due) <= 1)],
    ['Next 7 days', mine.filter(t => t.due && dayDiff(t.due) > 1 && dayDiff(t.due) <= 7)],
    ['Later', mine.filter(t => t.due && dayDiff(t.due) > 7)],
    ['No due date', mine.filter(t => !t.due)]
  ].filter(g => g[1].length);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const empty = S.projects.length
    ? '<div class="empty"><b>All clear</b>Nothing is assigned to you right now.</div>'
    : `<div class="empty"><b>Welcome to Tasklane</b><p style="margin:0 0 14px">Start your first project. Pick a template to fill it with tasks automatically.</p><button class="btn primary" data-act="new-project">${I.plus}Create your first project</button></div>`;
  return header('My tasks', `${today} · ${mine.length} open task${mine.length === 1 ? '' : 's'} assigned to you`, `<button class="btn primary" data-act="new-project">${I.plus}New project</button>`) +
    `<div class="content">${groups.length ? groups.map(([name, list]) => `<div class="section"><div class="section-head">${name}<span class="n">${list.length}</span></div>
      <div class="rows">${list.map(t => rowHtml(t, true)).join('')}</div></div>`).join('') : empty}</div>`;
}

function renderProject() {
  const p = project(ui.projectId); const tasks = S.tasks.filter(t => t.projectId === p.id);
  const doneN = tasks.filter(t => t.status === 'done').length;
  const tabs = `<div class="tabs" role="tablist">
    <button class="tab ${ui.mode === 'list' ? 'active' : ''}" data-act="mode" data-mode="list">${I.list}List</button>
    <button class="tab ${ui.mode === 'board' ? 'active' : ''}" data-act="mode" data-mode="board">${I.board}Board</button></div>`;
  const actions = `<button class="btn sm danger ${ui.armDelete === p.id ? 'armed' : ''}" data-act="del-project" data-id="${p.id}">${ui.armDelete === p.id ? 'Click again to delete project' : 'Delete project'}</button><button class="btn" data-act="save-template">${I.save}Save as template</button><button class="btn primary" data-act="quick-add" data-status="todo">${I.plus}Add task</button>`;
  let body;
  if (ui.mode === 'list') {
    body = STATUSES.map(([key, name]) => {
      const list = tasks.filter(t => t.status === key).sort(byDue);
      return `<div class="section"><div class="section-head"><span class="chip ${key}">${name}</span><span class="n">${list.length}</span></div>
        <div class="rows">${list.map(t => rowHtml(t, false)).join('')}
        <form class="add-row" data-form="add" data-status="${key}">${I.plus}<input id="add-${key}" name="title" placeholder="Add a task to ${name.toLowerCase()}…" autocomplete="off"></form></div></div>`;
    }).join('');
  } else {
    body = `<div class="board-wrap"><div class="board">${STATUSES.map(([key, name]) => {
      const list = tasks.filter(t => t.status === key).sort(byDue);
      return `<div class="col" data-col="${key}"><div class="col-head"><span class="chip ${key}">${name}</span><span class="n">${list.length}</span></div>
        ${list.map(t => { const d = t.subtasks.filter(s => s.done).length; return `<div class="card ${t.status === 'done' ? 'is-done' : ''}" draggable="true" data-act="open-task" data-id="${t.id}">
          <div class="card-title">${esc(t.title)}</div>
          ${t.subtasks.length ? `<div class="progress" title="${d} of ${t.subtasks.length} subtasks done"><i style="width:${d / t.subtasks.length * 100}%"></i></div>` : ''}
          <div class="card-foot">${avatar(t.assignee)}${t.priority !== 'low' && t.status !== 'done' ? `<span class="chip ${t.priority}">${t.priority === 'high' ? 'High' : 'Medium'}</span>` : ''}${t.subtasks.length ? `<span class="meta-sub">${I.sub}${d}/${t.subtasks.length}</span>` : ''}${dueHtml(t)}</div></div>`; }).join('')}
        <button class="col-add" data-act="quick-add" data-status="${key}">${I.plus}Add task</button></div>`;
    }).join('')}</div></div>`;
  }
  return header(`<span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}`, `${esc(p.desc || '')}${p.desc ? ' · ' : ''}${doneN} of ${tasks.length} done`, actions, tabs) + `<div class="content">${body}</div>`;
}

function renderTemplates() {
  return header('Templates', 'Start a project with its tasks, subtasks and due dates already filled in.', `<button class="btn primary" data-act="new-template">${I.plus}New template</button>`) +
    `<div class="content">${S.templates.length ? `<div class="grid-cards">${S.templates.map(tp => `<div class="panel">
      <span class="tag">${tp.tasks.length} tasks</span><h3>${esc(tp.name)}</h3><p>${esc(tp.desc || '')}</p>
      <ul class="tpl-tasks">${tp.tasks.slice(0, 4).map(t => `<li>${esc(t.title)}</li>`).join('')}${tp.tasks.length > 4 ? `<li class="more">and ${tp.tasks.length - 4} more</li>` : ''}</ul>
      <div class="panel-actions"><button class="btn primary sm" data-act="use-template" data-id="${tp.id}">Use template</button>
      <button class="btn sm danger ${ui.armDelete === tp.id ? 'armed' : ''}" data-act="del-template" data-id="${tp.id}">${ui.armDelete === tp.id ? 'Click again to delete' : 'Delete'}</button></div></div>`).join('')}</div>`
      : '<div class="empty"><b>No templates yet</b>Create one here, or open a project and choose Save as template.</div>'}</div>`;
}

function renderConnect() {
  const w = L.widget; const wp = project(w.projectId) || S.projects[0];
  const snippet = `<script src="https://app.your-tasklane.com/widget.js"\n  data-project="${wp ? wp.id : ''}"\n  data-title="${esc(w.title)}"\n  data-color="${w.color}" async><\/script>`;
  const curl = `curl https://app.your-tasklane.com/api/v1/tasks \\\n  -H "Authorization: Bearer ${L.apiKey}" \\\n  -d project=${wp ? wp.id : 'PROJECT_ID'} \\\n  -d title="Update pricing page" \\\n  -d due=${dayStr(7)}`;
  return header('Connect website', 'Let your website send requests in as tasks, and tell other tools when work changes.') + `<div class="content">
    <div class="notice">${I.info}<div>The example form below adds real tasks to your project, so you can see how requests will arrive. Placing it on an outside website, notifications and the API are the next things to switch on.</div></div>

    <section class="conn-section"><h2>Request form for your website</h2>
      <p class="hint">Paste one line of code on any page (WordPress, Webflow, Shopify, plain HTML). Visitors or clients fill in the form, and each request appears as a task in the project you pick.</p>
      ${wp ? `<div class="two">
        <div class="panel">
          <div class="form-grid"><label for="w-project">Send requests to</label>
            <select class="field" id="w-project" data-widget="projectId">${S.projects.map(p => `<option value="${p.id}" ${p.id === wp.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
          <div class="form-grid"><label for="w-title">Form heading</label><input class="field" id="w-title" data-widget="title" value="${esc(w.title)}"></div>
          <div class="form-grid"><label>Button color</label><div class="swatches">${COLORS.map(c => `<button class="swatch ${c === w.color ? 'on' : ''}" style="background:${c}" data-act="w-color" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
          <div class="form-grid"><label>Embed code</label><div class="code-wrap"><pre class="code" id="snippet">${esc(snippet)}</pre><button class="btn sm" data-act="copy" data-target="snippet">Copy</button></div></div>
        </div>
        <div class="site"><div class="site-bar"><i></i><i></i><i></i><span>yourclient.com/contact</span></div>
          <div class="site-body"><div class="fake-h"></div><div class="fake-p"></div><div class="fake-p" style="width:70%"></div>
            <form class="widget" data-form="widget">
              <h4>${esc(w.title)}</h4>
              <input class="field" id="wf-name" name="name" placeholder="Your name" required>
              <input class="field" id="wf-email" name="email" type="email" placeholder="Email">
              <textarea class="field" id="wf-msg" name="msg" placeholder="What would you like changed?" required style="min-height:70px"></textarea>
              <button type="submit" style="background:${w.color}">Send request</button>
            </form></div></div>
      </div>` : '<div class="empty"><b>Create a project first</b>Requests need a project to land in.</div>'}
    </section>

    <section class="conn-section"><h2>Notify other tools</h2>
      <p class="hint">When a task is created or completed, Tasklane sends the details to a web address you choose. Use it with Zapier, Make, Slack or your own site.</p>
      <div class="panel">
        <div class="wh-list">${L.webhooks.map(h => `<div class="wh"><span class="chip doing">${h.event === 'all' ? 'Any change' : h.event === 'task.created' ? 'Task created' : 'Task completed'}</span><code>${esc(h.url)}</code><button class="icon-btn" data-act="del-hook" data-id="${h.id}" aria-label="Remove">${I.x}</button></div>`).join('') || '<p class="hint">No notifications set up yet.</p>'}</div>
        <form class="inline-form" data-form="hook"><input class="field" id="hook-url" name="url" type="url" placeholder="https://hooks.example.com/…" required>
          <select class="field" id="hook-event" name="event" style="flex:0 1 180px"><option value="task.created">Task created</option><option value="task.completed">Task completed</option><option value="all">Any change</option></select>
          <button class="btn primary">Add</button></form>
        <div><div class="block-label">Recent deliveries <span>preview only</span></div><pre class="log">${ui.log.length ? esc(ui.log.slice(0, 12).join('\n\n')) : 'Complete a task or send a website request to see what would be sent.'}</pre></div>
      </div>
    </section>

    <section class="conn-section"><h2>API access</h2>
      <p class="hint">For developers: create and update tasks from your own code. Keep this key private.</p>
      <div class="panel">
        <div class="form-grid"><label>API key</label><div class="inline-form"><input class="field" id="api-key" value="${L.apiKey}" readonly style="font-family:var(--f-mono)"><button class="btn" data-act="copy" data-target="api-key">Copy</button><button class="btn" data-act="new-key">New key</button></div></div>
        <div class="form-grid"><label>Example: create a task</label><div class="code-wrap"><pre class="code" id="curl">${esc(curl)}</pre><button class="btn sm" data-act="copy" data-target="curl">Copy</button></div></div>
      </div>
    </section></div>`;
}

/* ---------- Drawer & modals ---------- */
function renderLayer() {
  const layer = document.getElementById('layer');
  let html = '';
  if (ui.sideOpen) html += '<div class="scrim" data-act="close-side"></div>';
  const t = ui.openTask && task(ui.openTask);
  if (ui.openTask && !t) ui.openTask = null; // deleted by someone else
  if (t) {
    const p = project(t.projectId);
    html += `<div class="scrim" data-act="close-task"></div><aside class="drawer" role="dialog" aria-label="Task details">
      <div class="drawer-head"><button class="btn sm ${t.status === 'done' ? 'primary' : ''}" data-act="toggle" data-id="${t.id}">${I.check}${t.status === 'done' ? 'Completed' : 'Mark complete'}</button>
        <span class="proj-chip" style="margin-left:6px"><span class="dot" style="background:${esc(p?.color)}"></span>${esc(p?.name)}</span>
        <button class="icon-btn" style="margin-left:auto" data-act="close-task" aria-label="Close">${I.x}</button></div>
      <div class="drawer-body">
        <textarea class="title-input" id="d-title" rows="1" data-field="title">${esc(t.title)}</textarea>
        <div class="fields">
          <label for="d-assignee">Assignee</label><select class="field" id="d-assignee" data-field="assignee"><option value="">Unassigned</option>${S.people.map(x => `<option value="${x.id}" ${x.id === t.assignee ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          <label for="d-due">Due date</label><input class="field" type="date" id="d-due" data-field="due" value="${t.due}">
          <label for="d-status">Status</label><select class="field" id="d-status" data-field="status">${STATUSES.map(([k, n]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <label for="d-priority">Priority</label><select class="field" id="d-priority" data-field="priority">${['low', 'medium', 'high'].map(k => `<option value="${k}" ${k === t.priority ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select>
          <label for="d-project">Project</label><select class="field" id="d-project" data-field="projectId">${S.projects.map(x => `<option value="${x.id}" ${x.id === t.projectId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        </div>
        <div><div class="block-label"><label for="d-desc">Description</label></div><textarea class="field" id="d-desc" data-field="desc" placeholder="Add details, links or notes…">${esc(t.desc)}</textarea></div>
        <div><div class="block-label">Subtasks <span>${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</span></div>
          <div class="subs">${t.subtasks.map(s => `<div class="sub ${s.done ? 'done' : ''}"><button class="check ${s.done ? 'on' : ''}" data-act="toggle-sub" data-id="${s.id}" aria-label="Toggle subtask">${I.check}</button><span>${esc(s.title)}</span><button class="icon-btn" data-act="del-sub" data-id="${s.id}" aria-label="Remove subtask">${I.x}</button></div>`).join('')}
          <form class="add-row" data-form="sub">${I.plus}<input id="d-newsub" name="title" placeholder="Add a subtask…" autocomplete="off"></form></div></div>
        <div><button class="btn danger ${ui.armDelete === t.id ? 'armed' : ''}" data-act="del-task" data-id="${t.id}">${ui.armDelete === t.id ? 'Click again to delete' : 'Delete task'}</button></div>
      </div></aside>`;
  }
  if (ui.modal === 'project') {
    html += `<div class="modal-wrap" data-act="close-modal-bg"><form class="modal" data-form="project">
      <h2>New project</h2>
      <div class="form-grid"><label for="np-name">Project name</label><input class="field" id="np-name" name="name" required placeholder="e.g. Smith & Co website" value="${esc(ui.modalName || '')}"></div>
      <div class="form-grid"><label>Color</label><div class="swatches">${COLORS.map((c, i) => `<button type="button" class="swatch ${c === (ui.modalColor || COLORS[0]) ? 'on' : ''}" style="background:${c}" data-act="np-color" data-color="${c}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <div class="form-grid"><label>Start from</label><div class="choice-list">
        <label class="choice"><input type="radio" name="tpl" value="" ${!ui.modalTpl ? 'checked' : ''}><span><b>Blank project</b><small>Add your own tasks</small></span></label>
        ${S.templates.map(tp => `<label class="choice"><input type="radio" name="tpl" value="${tp.id}" ${ui.modalTpl === tp.id ? 'checked' : ''}><span><b>${esc(tp.name)}</b><small>${tp.tasks.length} tasks · ${esc(tp.desc || '')}</small></span></label>`).join('')}
      </div></div>
      <div class="modal-actions"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary">Create project</button></div></form></div>`;
  }
  if (ui.modal === 'template') {
    html += `<div class="modal-wrap" data-act="close-modal-bg"><form class="modal" data-form="template">
      <h2>New template</h2>
      <div class="form-grid"><label for="nt-name">Template name</label><input class="field" id="nt-name" name="name" required placeholder="e.g. Monthly website care"></div>
      <div class="form-grid"><label for="nt-desc">Short description</label><input class="field" id="nt-desc" name="desc" placeholder="What is it for?"></div>
      <div class="form-grid"><label for="nt-tasks">Tasks</label><textarea class="field" id="nt-tasks" name="tasks" required style="min-height:150px;font-family:var(--f-mono);font-size:13px" placeholder="Update plugins\n- Back up first\n- Check site after\nReview analytics\nSend report to client"></textarea>
        <p class="hint">One task per line. Start a line with a dash to make it a subtask of the task above it.</p></div>
      <div class="modal-actions"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary">Save template</button></div></form></div>`;
  }
  if (ui.modal === 'me') {
    const me = person(ME);
    html += `<div class="modal-wrap" data-act="close-modal-bg"><form class="modal" data-form="me">
      <h2>Your name</h2><p class="hint">This is how teammates see you on tasks.</p>
      <div class="form-grid"><label for="me-name">Name</label><input class="field" id="me-name" name="name" required value="${esc(me?.name || '')}"></div>
      <div class="form-grid"><label>Color</label><div class="swatches">${COLORS.map((c, i) => `<button type="button" class="swatch ${c === (ui.modalColor || me?.color) ? 'on' : ''}" style="background:${c}" data-act="me-color" data-color="${c}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <div class="modal-actions"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary">Save</button></div></form></div>`;
  }
  layer.innerHTML = html;
}

function render(keepLayer = false) {
  renderSide();
  const main = document.getElementById('main');
  const scroll = main.scrollTop;
  if (ui.view === 'project' && !project(ui.projectId)) ui.view = 'home';
  main.innerHTML = ui.view === 'project' ? renderProject() : ui.view === 'templates' ? renderTemplates() : ui.view === 'connect' ? renderConnect() : renderHome();
  main.scrollTop = scroll;
  if (!keepLayer) renderLayer();
  saveLocal();
}

/* ---------- Actions ---------- */
function addTask(projectId, title, status, extra = {}) {
  const t = { id: uid(), projectId, title, status, assignee: ME, due: '', priority: 'medium', desc: '', subtasks: [], created: new Date().toISOString(), ...extra };
  S.tasks.push(t); notify('task.created', t); saveTask(t); return t;
}
function setStatus(t, status) {
  const was = t.status; t.status = status;
  if (status === 'done' && was !== 'done') { notify('task.completed', t); toast(`Completed: ${t.title}`); }
}
async function createProject(name, color, tp) {
  const p = { id: uid(), name, color, desc: tp ? `Started from the "${tp.name}" template.` : '' };
  const tasks = tp ? tp.tasks.map(x => ({ id: uid(), projectId: p.id, title: x.title, status: 'todo', assignee: '', due: x.offset == null ? '' : dayStr(x.offset),
    priority: x.priority || 'medium', desc: '', subtasks: (x.subtasks || []).map(s => ({ id: uid(), title: s, done: false })), created: new Date().toISOString() })) : [];
  S.projects.push(p); S.tasks.push(...tasks);
  const { error } = await db.from('projects').insert(toProject(p));
  if (error) return syncFailed(error);
  if (tasks.length) await run(db.from('tasks').insert(tasks.map(toTask)));
}
function openModal(kind, extra = {}) { Object.assign(ui, { modal: kind, modalTpl: '', modalName: '', modalColor: COLORS[S.projects.length % COLORS.length], sideOpen: false }, extra); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (!['del-task', 'del-template', 'del-project'].includes(act)) ui.armDelete = false;
  switch (act) {
    case 'go': ui.view = el.dataset.view; ui.sideOpen = false; ui.openTask = null; break;
    case 'open-project': ui.view = 'project'; ui.projectId = id; ui.sideOpen = false; ui.openTask = null; break;
    case 'menu': ui.sideOpen = true; break;
    case 'close-side': ui.sideOpen = false; break;
    case 'mode': ui.mode = el.dataset.mode; break;
    case 'open-task': ui.openTask = id; break;
    case 'close-task': ui.openTask = null; break;
    case 'toggle': { const t = task(id); setStatus(t, t.status === 'done' ? 'todo' : 'done'); saveTask(t); break; }
    case 'toggle-sub': { const t = task(ui.openTask); const s = t.subtasks.find(s => s.id === id); s.done = !s.done; saveTask(t); break; }
    case 'del-sub': { const t = task(ui.openTask); t.subtasks = t.subtasks.filter(s => s.id !== id); saveTask(t); break; }
    case 'del-task': if (ui.armDelete === id) { const t = task(id); S.tasks = S.tasks.filter(x => x.id !== id); ui.openTask = null; ui.armDelete = false; removeTask(id); toast(`Deleted: ${t.title}`); } else ui.armDelete = id; break;
    case 'del-project': if (ui.armDelete === id) { const p = project(id); S.projects = S.projects.filter(x => x.id !== id); S.tasks = S.tasks.filter(t => t.projectId !== id); ui.view = 'home'; ui.armDelete = false; run(db.from('projects').delete().eq('id', id)); toast(`Deleted project: ${p.name}`); } else ui.armDelete = id; break;
    case 'quick-add': { const t = addTask(ui.projectId, 'New task', el.dataset.status); ui.openTask = t.id; render(); const ti = document.getElementById('d-title'); ti.focus(); ti.select(); return; }
    case 'new-project': openModal('project'); render(); document.getElementById('np-name').focus(); return;
    case 'np-color': { const f = el.closest('form'); ui.modalName = f.elements.name.value; ui.modalTpl = f.elements.tpl.value; ui.modalColor = el.dataset.color; break; }
    case 'use-template': openModal('project', { modalTpl: id }); render(); document.getElementById('np-name').focus(); return;
    case 'new-template': openModal('template'); render(); document.getElementById('nt-name').focus(); return;
    case 'edit-me': openModal('me', { modalColor: person(ME)?.color }); render(); document.getElementById('me-name').focus(); return;
    case 'me-color': { const f = el.closest('form'); const n = f.elements.name.value; ui.modalColor = el.dataset.color; render(); document.getElementById('me-name').value = n; return; }
    case 'close-modal': ui.modal = null; break;
    case 'close-modal-bg': if (e.target !== el) return; ui.modal = null; break;
    case 'del-template': if (ui.armDelete === id) { S.templates = S.templates.filter(x => x.id !== id); ui.armDelete = false; removeTemplate(id); toast('Template deleted'); } else ui.armDelete = id; break;
    case 'save-template': {
      const p = project(ui.projectId); const list = S.tasks.filter(t => t.projectId === p.id);
      const tp = { id: uid(), name: p.name, desc: `Saved from the ${p.name} project.`, tasks: list.map(t => ({ title: t.title, priority: t.priority, offset: t.due ? Math.max(0, dayDiff(t.due)) : null, subtasks: t.subtasks.map(s => s.title) })) };
      S.templates.push(tp); saveTemplate(tp);
      toast(`Saved "${p.name}" as a template with ${list.length} tasks`); break;
    }
    case 'w-color': L.widget.color = el.dataset.color; break;
    case 'del-hook': L.webhooks = L.webhooks.filter(h => h.id !== id); break;
    case 'new-key': L.apiKey = 'tl_live_' + Math.random().toString(36).slice(2, 14); toast('New API key created. The old one stops working.'); break;
    case 'copy': {
      const target = document.getElementById(el.dataset.target); const text = target.value ?? target.textContent;
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(target); if (target.select) target.select(); else { const s = getSelection(); s.removeAllRanges(); s.addRange(r); } toast('Selected. Press Ctrl+C or ⌘C to copy.'); };
      try { navigator.clipboard.writeText(text).then(() => toast('Copied'), fallback); } catch (err) { fallback(); }
      return;
    }
    case 'sign-out': db.auth.signOut(); return;
    default: return;
  }
  render();
});

document.addEventListener('submit', async e => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  const v = name => (f.elements[name]?.value || '').trim();
  if (kind === 'signin') {
    const btn = document.getElementById('si-btn'); btn.disabled = true; btn.textContent = 'Signing in…';
    const { error } = await db.auth.signInWithPassword({ email: v('email'), password: f.elements.password.value });
    if (error) showSignIn(/invalid/i.test(error.message) ? 'That email and password don’t match. Check them and try again.' : error.message);
    return;
  }
  if (kind === 'add') { if (!v('title')) return; addTask(ui.projectId, v('title'), f.dataset.status); render(); document.getElementById('add-' + f.dataset.status)?.focus(); return; }
  if (kind === 'sub') { if (!v('title')) return; const t = task(ui.openTask); t.subtasks.push({ id: uid(), title: v('title'), done: false }); saveTask(t); render(); document.getElementById('d-newsub').focus(); return; }
  if (kind === 'project') {
    const name = v('name'); if (!name) return; const tpl = S.templates.find(x => x.id === f.elements.tpl.value);
    const p = createProject(name, ui.modalColor || COLORS[0], tpl);
    ui.modal = null; ui.view = 'project'; ui.projectId = S.projects[S.projects.length - 1].id; ui.mode = 'list';
    if (!project(L.widget.projectId)) L.widget.projectId = ui.projectId;
    toast(tpl ? `Created ${name} with ${tpl.tasks.length} tasks` : `Created ${name}`);
    render(); await p; return;
  }
  if (kind === 'template') {
    const tasks = [];
    f.elements.tasks.value.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      if (/^[-*•]\s*/.test(l) && tasks.length) tasks[tasks.length - 1].subtasks.push(l.replace(/^[-*•]\s*/, ''));
      else tasks.push({ title: l.replace(/^[-*•]\s*/, ''), priority: 'medium', offset: null, subtasks: [] });
    });
    const tp = { id: uid(), name: v('name'), desc: v('desc'), tasks };
    S.templates.push(tp); saveTemplate(tp);
    ui.modal = null; toast(`Template saved with ${tasks.length} tasks`);
  }
  if (kind === 'me') {
    const me = person(ME); me.name = v('name'); me.color = ui.modalColor || me.color;
    run(db.from('profiles').update({ name: me.name, color: me.color }).eq('id', ME));
    ui.modal = null; toast('Name saved');
  }
  if (kind === 'hook') { L.webhooks.push({ id: uid(), url: v('url'), event: f.elements.event.value }); toast('Notification added'); }
  if (kind === 'widget') {
    const pid = project(L.widget.projectId) ? L.widget.projectId : S.projects[0].id;
    addTask(pid, v('msg').split('\n')[0].slice(0, 80), 'todo',
      { assignee: '', priority: 'medium', desc: `Website request from ${v('name')}${v('email') ? ` (${v('email')})` : ''}:\n\n${v('msg')}` });
    f.reset(); toast(`Request added to ${project(pid).name}`);
  }
  render();
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.field) {
    const t = task(ui.openTask); if (!t) return; const k = el.dataset.field;
    if (k === 'status') setStatus(t, el.value); else if (k === 'title') t.title = el.value.trim() || 'Untitled task'; else t[k] = el.value;
    // Typed fields keep the drawer as it is, so a click that caused the blur still lands.
    saveTask(t); render(k === 'title' || k === 'desc'); return;
  }
  if (el.dataset.widget) { L.widget[el.dataset.widget] = el.value; render(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (ui.modal) ui.modal = null; else if (ui.openTask) ui.openTask = null; else if (ui.sideOpen) ui.sideOpen = false; else return; render(); }
  if (e.key === 'Enter' && e.target.id === 'd-title') { e.preventDefault(); e.target.blur(); }
});

/* Board drag and drop */
document.addEventListener('dragstart', e => { const c = e.target.closest?.('.card'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); });
document.addEventListener('dragend', e => { e.target.closest?.('.card')?.classList.remove('dragging'); document.querySelectorAll('.col.drop').forEach(c => c.classList.remove('drop')); });
document.addEventListener('dragover', e => { const col = e.target.closest?.('.col'); if (!col) return; e.preventDefault(); document.querySelectorAll('.col.drop').forEach(c => c !== col && c.classList.remove('drop')); col.classList.add('drop'); });
document.addEventListener('drop', e => { const col = e.target.closest?.('.col'); if (!col) return; e.preventDefault(); const t = task(e.dataTransfer.getData('text/plain')); if (t && t.status !== col.dataset.col) { setStatus(t, col.dataset.col); saveTask(t); render(); } });

/* ---------- Boot ---------- */
if (!db) {
  gate(`<h1>Almost ready</h1><p>${window.supabase || !configured ? 'Tasklane isn’t connected to its database yet. Add the Supabase Project URL and public key at the top of the app code.' : 'Couldn’t load the sign-in library. Check your internet connection and refresh.'}</p>`);
} else {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) { ME = null; db.removeAllChannels(); showSignIn(); }
    else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') { if (ME !== session.user.id) setTimeout(() => start(session), 0); }
  });
}
