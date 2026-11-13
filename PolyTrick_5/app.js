const cfg = window.APP_CONFIG || {};
const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
const sb = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const state = {
  page: "dashboard",
  user: null,
  events: [],
  guests: [],
  sponsors: [],
  tasks: [],
  eventPeople: [],
  editing: null
};

const demo = {
  events: [
    {id:"e1", name:"Festival XYZ", date:"2026-12-12", location:"Milano", start_time:"18:00", end_time:"01:00", status:"definitivo", room_status:"riservata", reserved_room:"Sala A", room_notes:"Accesso dalle 15:30", notes:"Evento principale di dicembre"},
    {id:"e2", name:"Talk di Apertura", date:"2026-12-19", location:"Torino", start_time:"19:00", end_time:"00:30", status:"definitivo", room_status:"richiesta", reserved_room:"Palco", room_notes:"Setup microfoni dalle 16:00", notes:""},
  ],
  guests: [
    {id:"g1", name:"Mario Rossi", contact:"mario@example.com", status:"confermato", contacted_by:"Luca", contacted_at:"2026-11-03", event_id:"e1", notes:"+1"},
    {id:"g2", name:"Anna Bianchi", contact:"anna@example.com", status:"in_attesa", contacted_by:"Sara", contacted_at:"2026-11-05", event_id:"e1", notes:"VIP"},
    {id:"g3", name:"Paolo Verdi", contact:"paolo@example.com", status:"da_contattare", contacted_by:"", contacted_at:"", event_id:"e2", notes:"Speaker principale"},
  ],
  sponsors: [
    {id:"s1", name:"Azienda A", contact:"commerciale@example.com", status:"trattativa", contacted_by:"Marco", contacted_at:"2026-11-02", offer:"€2.000", pickup_status:"da_fare", asks:"Logo + stand", event_ids:["e1","e2"], notes:"Da richiamare"},
    {id:"s2", name:"Azienda B", contact:"", status:"confermato", contacted_by:"Luca", contacted_at:"2026-11-04", offer:"Bevande", pickup_status:"ritirato_ticino", asks:"Visibilità", event_ids:["e1"], notes:""},
  ],
  tasks: [
    {id:"t1", title:"Confermare DJ", event_id:"e1", assignee:"Luca", due_date:"2026-11-20", status:"da_fare", priority:"alta", notes:""},
    {id:"t2", title:"Preparare slide presentazione", event_id:"e2", assignee:"Sara", due_date:"2026-12-08", status:"in_corso", priority:"alta", notes:"Per il talk"},
    {id:"t3", title:"Contratto location", event_id:"e1", assignee:"Marco", due_date:"2026-11-15", status:"fatto", priority:"media", notes:"Firmato"},
    {id:"t4", title:"Test microfoni", event_id:"e2", assignee:"Luca", due_date:"2026-12-19", status:"da_fare", priority:"alta", notes:"Prima dell'ingresso"},
  ],
  eventPeople: [
    {id:"p1", event_id:"e1", person:"Marco", arrival:"16:00", departure:"01:30", role:"Responsabile"},
    {id:"p2", event_id:"e1", person:"Luca", arrival:"17:00", departure:"00:30", role:"Ospiti"},
    {id:"p3", event_id:"e1", person:"Sara", arrival:"19:00", departure:"01:00", role:"Accrediti"},
  ]
};

function cloneDemo() {
  state.events = structuredClone(demo.events);
  state.guests = structuredClone(demo.guests);
  state.sponsors = structuredClone(demo.sponsors);
  state.tasks = structuredClone(demo.tasks);
  state.eventPeople = structuredClone(demo.eventPeople);
}

function esc(v="") {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v + "T00:00:00");
  return d.toLocaleDateString("it-IT", {day:"2-digit", month:"2-digit", year:"numeric"});
}
function statusLabel(v) {
  return ({definitivo:"Definitivo", da_fare:"Da fare", in_corso:"In corso", fatto:"Fatto",
    da_contattare:"Da contattare", in_attesa:"In attesa", confermato:"Confermato",
    trattativa:"Trattativa", rifiutato:"Rifiutato",
    riservata:"Riservata", richiesta:"Richiesta", non_riservata:"Non riservata",
    ritirato_ticino:"Ritirato in Ticino", a_zurigo:"A Zurigo"})[v] || v || "—";
}
function badge(v) {
  const cls = ["fatto","confermato","definitivo","riservata","ritirato_ticino","a_zurigo"].includes(v) ? "success" :
              ["in_corso","in_attesa","trattativa","richiesta"].includes(v) ? "warning" :
              ["rifiutato"].includes(v) ? "danger" : "neutral";
  return `<span class="badge ${cls}">${esc(statusLabel(v))}</span>`;
}
function priorityBadge(p) {
  const cls = p==="alta" ? "danger" : p==="media" ? "warning" : "neutral";
  const lbl = p==="alta" ? "Alta" : p==="media" ? "Media" : "Bassa";
  return `<span class="badge ${cls}">${lbl}</span>`;
}
function eventName(id) { return state.events.find(e=>e.id===id)?.name || "—"; }

async function loadData() {
  if (!hasSupabase) {
    cloneDemo();
    return;
  }
  const tables = ["events","guests","sponsors","tasks","event_people"];
  const results = await Promise.all(tables.map(t => sb.from(t).select("*").order("created_at", {ascending:false})));
  results.forEach((r,i) => {
    if (r.error) throw r.error;
    const key = ["events","guests","sponsors","tasks","eventPeople"][i];
    state[key] = r.data || [];
  });
}

async function save(table, data, id) {
  if (!hasSupabase) {
    const map = {events:"events", guests:"guests", sponsors:"sponsors", tasks:"tasks", event_people:"eventPeople"};
    const arr = state[map[table]];
    const idx = arr.findIndex(x=>x.id===id);
    if (idx >= 0) arr[idx] = {...arr[idx], ...data};
    else arr.unshift({id: crypto.randomUUID(), ...data});
    render();
    return;
  }
  const payload = {...data};
  if (id) {
    const {error} = await sb.from(table).update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const {error} = await sb.from(table).insert(payload);
    if (error) throw error;
  }
  await loadData();
  render();
}

async function remove(table, id) {
  if (!confirm("Eliminare definitivamente questo elemento?")) return;
  if (!hasSupabase) {
    const map = {events:"events", guests:"guests", sponsors:"sponsors", tasks:"tasks", event_people:"eventPeople"};
    state[map[table]] = state[map[table]].filter(x=>x.id!==id);
    render();
    return;
  }
  const {error} = await sb.from(table).delete().eq("id", id);
  if (error) return alert(error.message);
  await loadData();
  render();
}

async function toggleTask(id, currentStatus) {
  const newStatus = currentStatus === 'fatto' ? 'da_fare' : 'fatto';
  try {
    await save('tasks', { status: newStatus }, id);
  } catch(e) {
    alert("Errore nell'aggiornamento del task.");
    render();
  }
}
window.toggleTask = toggleTask;

function shell(content) {
  const nav = [
    ["dashboard","Dashboard"],["events","Eventi e Talk"],["guests","Ospiti"],
    ["sponsors","Sponsor"],["tasks","Task"]
  ];
  document.getElementById("app").innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">PolyTrick</div>
      <nav class="nav">${nav.map(([id,label]) =>
        `<button class="${state.page===id?'active':''}" onclick="navigate('${id}')">${label}</button>`).join("")}</nav>
      <div class="userbox">
        <div>${esc(state.user?.email || "Modalità demo")}</div>
        ${hasSupabase ? `<button class="btn" onclick="signOut()">Esci</button>` : `<div class="small" style="margin-top:8px">Demo locale</div>`}
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}

function navigate(page) { state.page = page; render(); }

function dashboard() {
  const next = [...state.events].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const openTasks = state.tasks.filter(t=>t.status!=="fatto").length;
  const toContact = state.guests.filter(g=>g.status==="da_contattare").length;
  const sponsorOpen = state.sponsors.filter(s=>["trattativa","in_attesa"].includes(s.status)).length;
  return `
  <div class="topbar"><div><h1>Dashboard</h1><div class="muted">Panoramica del lavoro del team.</div></div>
    <div class="actions"><button class="btn primary" onclick="openForm('event')">+ Nuovo evento</button></div></div>
  <div class="grid stats">
    <div class="card"><div class="stat-label">Eventi/Talk</div><div class="stat-number">${state.events.filter(e=>e.status==="definitivo").length}</div></div>
    <div class="card"><div class="stat-label">Task aperti</div><div class="stat-number">${openTasks}</div></div>
    <div class="card"><div class="stat-label">Ospiti da contattare</div><div class="stat-number">${toContact}</div></div>
    <div class="card"><div class="stat-label">Sponsor in trattativa</div><div class="stat-number">${sponsorOpen}</div></div>
  </div>
  <div class="grid two-col section">
    <div class="card"><div class="topbar" style="margin-bottom:8px"><h2>Prossimi appuntamenti</h2></div>
      ${next.length ? `<div class="list">${next.map(e=>`<div class="list-item"><div><b>${esc(e.name)}</b><div class="small muted">${fmtDate(e.date)} · ${esc(e.location||"")}</div></div><div>${badge(e.status)}</div></div>`).join("")}</div>` : `<div class="empty">Nessun evento.</div>`}
    </div>
    <div class="card"><div class="topbar" style="margin-bottom:8px"><h2>Task aperti</h2><button class="btn" onclick="openForm('task')">+ Task</button></div>
      ${state.tasks.filter(t=>t.status!=="fatto").sort((a,b)=>(a.due_date||"").localeCompare(b.due_date||"")).slice(0,6).map(t=>`
      <div class="list-item" style="align-items:center">
        <div style="display:flex;gap:12px;align-items:center">
          <input type="checkbox" style="width:18px;height:18px;cursor:pointer" onchange="toggleTask('${t.id}', '${t.status}')">
          <div><b>${esc(t.title)}</b><div class="small muted">${esc(t.assignee||"Non assegnato")} · ${fmtDate(t.due_date)}</div></div>
        </div>
        ${badge(t.status)}
      </div>`).join("") || `<div class="empty">Tutto completato. Un raro miracolo.</div>`}
    </div>
  </div>`;
}

function eventsPage() {
  return `
  <div class="topbar"><div><h1>Eventi e Talk</h1><div class="muted">Eventi, talk, sala riservata, persone e operatività.</div></div>
    <button class="btn primary" onclick="openForm('event')">+ Nuovo evento</button></div>
  <div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Evento/Talk</th><th>Data</th><th>Luogo</th><th>Orario</th><th>Sala riservata</th><th>Team</th><th>Task</th><th></th></tr></thead>
    <tbody>${state.events.map(e=>{
      const people = state.eventPeople.filter(p=>p.event_id===e.id).length;
      const tasks = state.tasks.filter(t=>t.event_id===e.id).length;
      return `<tr>
        <td><b>${esc(e.name)}</b><div class="small muted">${esc(e.notes||"")}</div></td>
        <td>${fmtDate(e.date)}</td><td>${esc(e.location||"—")}</td>
        <td>${esc(e.start_time||"")} – ${esc(e.end_time||"")}</td>
        <td><b>${esc(e.reserved_room||"—")}</b><div class="small muted" style="margin-top:4px;display:flex;gap:6px;align-items:center">${badge(e.room_status||"non_riservata")} <span>${esc(e.room_notes||"")}</span></div></td>
        <td>${people}</td><td>${tasks}</td>
        <td><div class="actions"><button class="btn" onclick="eventDetail('${e.id}')">Apri</button><button class="btn" onclick="openForm('event','${e.id}')">Modifica</button><button class="btn danger" onclick="remove('events','${e.id}')">Elimina</button></div></td>
      </tr>`;
    }).join("") || `<tr><td colspan="8" class="empty">Nessun evento.</td></tr>`}</tbody>
  </table></div></div>`;
}

function eventDetail(id) {
  state.page = "event-detail";
  state.detailId = id;
  render();
}
function eventDetailPage() {
  const e = state.events.find(x=>x.id===state.detailId);
  if (!e) return navigate("events");
  const people = state.eventPeople.filter(p=>p.event_id===e.id);
  const tasks = state.tasks.filter(t=>t.event_id===e.id);
  const guests = state.guests.filter(g=>g.event_id===e.id);
  const sponsors = state.sponsors.filter(s=>s.event_ids && s.event_ids.includes(e.id));
  return `
  <div class="topbar">
    <div><button class="btn" onclick="navigate('events')">← Eventi</button><div style="height:10px"></div>
      <h1>${esc(e.name)}</h1><div class="muted">${fmtDate(e.date)} · ${esc(e.location||"")} · ${esc(e.start_time||"")}–${esc(e.end_time||"")}</div>
    </div>
    <div class="actions"><button class="btn" onclick="openForm('event','${e.id}')">Modifica evento</button></div>
  </div>
  <div class="grid three-col">
    <div class="card"><div class="stat-label">Sala riservata</div><div class="stat-number" style="font-size:22px">${esc(e.reserved_room||"Non assegnata")}</div><div class="muted small" style="margin-top:8px;display:flex;gap:6px;align-items:center">${badge(e.room_status||"non_riservata")} <span>${esc(e.room_notes||"")}</span></div></div>
    <div class="card"><div class="stat-label">Team</div><div class="stat-number">${people.length}</div></div>
    <div class="card"><div class="stat-label">Task completati</div><div class="stat-number">${tasks.filter(t=>t.status==="fatto").length}/${tasks.length}</div></div>
  </div>
  <div class="grid two-col section">
    <div class="card"><div class="topbar"><h2>Persone presenti</h2><button class="btn" onclick="openForm('person',null,'${e.id}')">+ Persona</button></div>
      <div class="table-wrap"><table><thead><tr><th>Persona</th><th>Ruolo</th><th>Arrivo</th><th>Partenza</th><th></th></tr></thead><tbody>
      ${people.map(p=>`<tr><td>${esc(p.person)}</td><td>${esc(p.role||"")}</td><td>${esc(p.arrival||"")}</td><td>${esc(p.departure||"")}</td><td><button class="btn danger" onclick="remove('event_people','${p.id}')">Elimina</button></td></tr>`).join("") || `<tr><td colspan="5" class="empty">Nessuna persona assegnata.</td></tr>`}
      </tbody></table></div>
    </div>
    <div class="card"><div class="topbar"><h2>Task dell'evento</h2><button class="btn" onclick="openForm('task',null,'${e.id}')">+ Task</button></div>
      ${tasks.map(t=>`
      <div class="list-item" style="align-items:center">
        <div style="display:flex;gap:12px;align-items:center">
          <input type="checkbox" style="width:18px;height:18px;cursor:pointer" ${t.status==='fatto'?'checked':''} onchange="toggleTask('${t.id}', '${t.status}')">
          <div style="${t.status==='fatto'?'text-decoration:line-through;color:var(--muted)':''}"><b>${esc(t.title)}</b><div class="small muted">${esc(t.assignee||"Non assegnato")} · scadenza ${fmtDate(t.due_date)}</div></div>
        </div>
        <div>${badge(t.status)}</div>
      </div>`).join("") || `<div class="empty">Nessun task.</div>`}
    </div>
  </div>
  <div class="grid two-col section">
    <div class="card"><h2>Ospiti dell'evento</h2>${guests.map(g=>`<div class="list-item"><div><b>${esc(g.name)}</b><div class="small muted">${esc(g.contact||"")} · ${esc(g.contacted_by||"")} ${fmtDate(g.contacted_at)}</div></div>${badge(g.status)}</div>`).join("") || `<div class="empty">Nessun ospite.</div>`}</div>
    <div class="card"><h2>Sponsor dell'evento</h2>${sponsors.map(s=>`<div class="list-item"><div><b>${esc(s.name)}</b><div class="small muted">${esc(s.offer||"")} · richiede: ${esc(s.asks||"")}</div></div>${badge(s.status)}</div>`).join("") || `<div class="empty">Nessuno sponsor.</div>`}</div>
  </div>`;
}

function guestsPage() {
  return `<div class="topbar"><div><h1>Ospiti</h1><div class="muted">Contatti, responsabili e storico del contatto.</div></div><button class="btn primary" onclick="openForm('guest')">+ Ospite</button></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Ospite</th><th>Evento/Talk</th><th>Stato</th><th>Contattato da</th><th>Data</th><th>Note</th><th></th></tr></thead><tbody>
  ${state.guests.map(g=>`<tr><td><b>${esc(g.name)}</b><div class="small muted">${esc(g.contact||"")}</div></td><td>${esc(eventName(g.event_id))}</td><td>${badge(g.status)}</td><td>${esc(g.contacted_by||"—")}</td><td>${fmtDate(g.contacted_at)}</td><td>${esc(g.notes||"")}</td><td><div class="actions"><button class="btn" onclick="openForm('guest','${g.id}')">Modifica</button><button class="btn danger" onclick="remove('guests','${g.id}')">Elimina</button></div></td></tr>`).join("") || `<tr><td colspan="7" class="empty">Nessun ospite.</td></tr>`}
  </tbody></table></div></div>`;
}

function sponsorsPage() {
  return `<div class="topbar"><div><h1>Sponsor</h1><div class="muted">Trattative, contributi e contropartite.</div></div><button class="btn primary" onclick="openForm('sponsor')">+ Sponsor</button></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Sponsor</th><th>Evento/Talk</th><th>Stato</th><th>Contattato da</th><th>Data</th><th>Cosa danno</th><th>Status</th><th>Cosa vogliono</th><th></th></tr></thead><tbody>
  ${state.sponsors.map(s=>`<tr><td><b>${esc(s.name)}</b><div class="small muted">${esc(s.contact||"")}</div></td><td>${esc((s.event_ids||[]).map(id=>eventName(id)).filter(n=>n!=="—").join(", ") || "—")}</td><td>${badge(s.status)}</td><td>${esc(s.contacted_by||"—")}</td><td>${fmtDate(s.contacted_at)}</td><td>${esc(s.offer||"—")}</td><td>${badge(s.pickup_status||"da_fare")}</td><td>${esc(s.asks||"—")}</td><td><div class="actions"><button class="btn" onclick="openForm('sponsor','${s.id}')">Modifica</button><button class="btn danger" onclick="remove('sponsors','${s.id}')">Elimina</button></div></td></tr>`).join("") || `<tr><td colspan="9" class="empty">Nessuno sponsor.</td></tr>`}
  </tbody></table></div></div>`;
}

function tasksPage() {
  // Ordina i task: prima quelli da fare (per data), poi quelli completati
  const sorted = [...state.tasks].sort((a,b) => {
    if (a.status === 'fatto' && b.status !== 'fatto') return 1;
    if (a.status !== 'fatto' && b.status === 'fatto') return -1;
    return (a.due_date||"").localeCompare(b.due_date||"");
  });

  return `<div class="topbar"><div><h1>Task e Cose da fare</h1><div class="muted">Tutte le assegnazioni del team (inclusi talk ed eventi).</div></div><button class="btn primary" onclick="openForm('task')">+ Nuovo Task</button></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th style="width:40px">✔</th><th>Task</th><th>Assegnato a</th><th>Evento/Talk</th><th>Scadenza</th><th>Priorità</th><th>Stato</th><th></th></tr></thead><tbody>
  ${sorted.map(t=>`<tr>
    <td style="vertical-align:middle"><input type="checkbox" style="width:18px;height:18px;cursor:pointer" ${t.status==='fatto'?'checked':''} onchange="toggleTask('${t.id}', '${t.status}')"></td>
    <td><b style="${t.status==='fatto'?'text-decoration:line-through;color:var(--muted)':''}">${esc(t.title)}</b><div class="small muted">${esc(t.notes||"")}</div></td>
    <td><b>${esc(t.assignee||"Non assegnato")}</b></td>
    <td>${esc(eventName(t.event_id))}</td>
    <td>${fmtDate(t.due_date)}</td>
    <td>${priorityBadge(t.priority)}</td>
    <td>${badge(t.status)}</td>
    <td><div class="actions"><button class="btn" onclick="openForm('task','${t.id}')">Modifica</button><button class="btn danger" onclick="remove('tasks','${t.id}')">Elimina</button></div></td>
  </tr>`).join("") || `<tr><td colspan="8" class="empty">Nessun task.</td></tr>`}
  </tbody></table></div></div>`;
}

function render() {
  const app = document.getElementById("app");
  if (!state.user && hasSupabase) return renderAuth();
  if (!state.user && !hasSupabase) state.user = {email:"demo"};
  let content = state.page==="dashboard" ? dashboard() :
    state.page==="events" ? eventsPage() :
    state.page==="event-detail" ? eventDetailPage() :
    state.page==="guests" ? guestsPage() :
    state.page==="sponsors" ? sponsorsPage() : tasksPage();
  shell(content);
}

function renderAuth() {
  document.getElementById("app").innerHTML = `
  <div class="auth"><div class="auth-card">
    <div class="logo">PolyTrick</div>
    <div class="subtitle">Area privata del team. Accesso con account del progetto.</div>
    <form id="login-form" class="grid">
      <div class="field"><label>Email</label><input id="login-email" type="email" required placeholder="nome@team.it"></div>
      <div class="field"><label>Password</label><input id="login-password" type="password" required></div>
      <button class="btn primary" type="submit">Accedi</button>
      <div id="login-msg" class="small muted"></div>
    </form>
  </div></div>`;
  document.getElementById("login-form").onsubmit = async e => {
    e.preventDefault();
    const msg = document.getElementById("login-msg");
    const {error} = await sb.auth.signInWithPassword({
      email: document.getElementById("login-email").value,
      password: document.getElementById("login-password").value
    });
    msg.textContent = error ? error.message : "Accesso effettuato.";
    if (!error) await boot();
  };
}

function field(label, name, value="", type="text", extra="") {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}

function checkboxesField(label, name, selectedValues, options) {
  const vals = Array.isArray(selectedValues) ? selectedValues : (selectedValues ? [selectedValues] : []);
  return `<div class="field full"><label>${label}</label><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:4px;padding:10px 12px;border:1px solid #d7dce5;border-radius:9px;background:#fcfcfd">
    ${options.map(o => `<label style="display:flex;align-items:center;gap:6px;font-weight:normal;cursor:pointer;font-size:14px;color:var(--text)"><input type="checkbox" style="width:16px;height:16px;margin:0" name="${name}" value="${esc(o[0])}" ${vals.includes(o[0])?'checked':''}> ${esc(o[1])}</label>`).join("")}
    ${options.length===0 ? '<span class="muted small">Nessun evento disponibile</span>' : ''}
  </div></div>`;
}

function selectField(label,name,value,options) {
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o=>`<option value="${esc(o[0])}" ${value===o[0]?"selected":""}>${esc(o[1])}</option>`).join("")}</select></div>`;
}

function openForm(type,id=null,eventId=null) {
  const existing = id ? ({event:state.events,guest:state.guests,sponsor:state.sponsors,task:state.tasks,person:state.eventPeople}[type]||[]).find(x=>x.id===id) : {};
  const e = existing || {};
  let title = "", body = "";
  if (type==="event") {
    title = id ? "Modifica evento / Talk" : "Nuovo evento / Talk";
    body = `<form id="modal-form" class="form-grid">
      ${field("Nome evento / Talk","name",e.name||"")}
      ${field("Data","date",e.date||"", "date")}
      ${field("Luogo / Area","location",e.location||"")}
      ${field("Inizio","start_time",e.start_time||"", "time")}
      ${field("Fine","end_time",e.end_time||"", "time")}
      ${selectField("Stato Sala","room_status",e.room_status||"non_riservata",[["non_riservata","Non riservata"],["richiesta","Richiesta"],["riservata","Riservata"]])}
      ${field("Nome Sala / Palco","reserved_room",e.reserved_room||"")}
      ${field("Dettagli sala","room_notes",e.room_notes||"")}
      ${selectField("Stato","status",e.status||"definitivo",[["definitivo","Definitivo"]])}
      <div class="field full">${field("Note","notes",e.notes||"")}</div>
      <div class="field full actions"><button class="btn primary" type="submit">Salva</button></div>
    </form>`;
  } else if (type==="guest") {
    title = id ? "Modifica ospite" : "Nuovo ospite";
    body = `<form id="modal-form" class="form-grid">
      ${field("Nome","name",e.name||"")}${field("Contatto","contact",e.contact||"")}
      ${checkboxesField("Eventi / Talk sponsorizzati", "event_ids", e.event_ids||(eventId?[eventId]:[]), state.events.map(x=>[x.id,x.name]))}
      ${selectField("Stato","status",e.status||"da_contattare",[["da_contattare","Da contattare"],["in_attesa","In attesa"],["confermato","Confermato"],["rifiutato","Rifiutato"]])}
      ${field("Contattato da","contacted_by",e.contacted_by||"")}${field("Data contatto","contacted_at",e.contacted_at||"","date")}
      <div class="field full">${field("Note","notes",e.notes||"")}</div>
      <div class="field full actions"><button class="btn primary" type="submit">Salva</button></div>
    </form>`;
  } else if (type==="sponsor") {
    title = id ? "Modifica sponsor" : "Nuovo sponsor";
    body = `<form id="modal-form" class="form-grid">
      ${field("Sponsor","name",e.name||"")}${field("Contatto","contact",e.contact||"")}
      ${checkboxesField("Eventi / Talk sponsorizzati", "event_ids", e.event_ids||(eventId?[eventId]:[]), state.events.map(x=>[x.id,x.name]))}
      ${selectField("Stato","status",e.status||"trattativa",[["trattativa","Trattativa"],["in_attesa","In attesa"],["confermato","Confermato"],["rifiutato","Rifiutato"]])}
      ${field("Contattato da","contacted_by",e.contacted_by||"")}${field("Data contatto","contacted_at",e.contacted_at||"","date")}
      ${field("Cosa danno","offer",e.offer||"")}
      ${selectField("Status logistica","pickup_status",e.pickup_status||"da_fare",[["da_fare","Da fare"],["ritirato_ticino","Ritirato in Ticino"],["a_zurigo","A Zurigo"]])}
      <div class="field full">${field("Cosa vogliono in cambio","asks",e.asks||"")}</div>
      <div class="field full">${field("Note","notes",e.notes||"")}</div>
      <div class="field full actions"><button class="btn primary" type="submit">Salva</button></div>
    </form>`;
  } else if (type==="task") {
    title = id ? "Modifica task" : "Nuovo task";
    body = `<form id="modal-form" class="form-grid">
      ${field("Task (cosa da fare)","title",e.title||"")}
      ${selectField("Evento / Talk","event_id",e.event_id||eventId||"",[["","Nessuno (Generico)"],...state.events.map(x=>[x.id,x.name])])}
      ${field("Assegnato a (Responsabile)","assignee",e.assignee||"")}
      ${field("Scadenza","due_date",e.due_date||"","date")}
      ${selectField("Priorità","priority",e.priority||"media",[["bassa","Bassa"],["media","Media"],["alta","Alta"]])}
      ${selectField("Stato","status",e.status||"da_fare",[["da_fare","Da fare"],["in_corso","In corso"],["fatto","Fatto"]])}
      <div class="field full">${field("Note","notes",e.notes||"")}</div>
      <div class="field full actions"><button class="btn primary" type="submit">Salva</button></div>
    </form>`;
  } else {
    title = "Persona presente";
    body = `<form id="modal-form" class="form-grid">
      ${field("Persona","person",e.person||"")}${field("Ruolo","role",e.role||"")}
      ${field("Ora arrivo","arrival",e.arrival||"","time")}${field("Ora partenza","departure",e.departure||"","time")}
      <div class="field full actions"><button class="btn primary" type="submit">Salva</button></div>
    </form>`;
  }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "modal";
  modal.innerHTML = `<div class="modal-card"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}</div>`;
  document.body.appendChild(modal);

  document.getElementById("modal-form").onsubmit = async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const data = {};
    for (let [k,v] of fd.entries()) {
      if (data[k] !== undefined) {
        if (!Array.isArray(data[k])) data[k] = [data[k]];
        data[k].push(v);
      } else {
        data[k] = v;
      }
    }
    if (type === 'sponsor') {
      if (!data.event_ids) data.event_ids = [];
      else if (!Array.isArray(data.event_ids)) data.event_ids = [data.event_ids];
    }
    if (type==="person") data.event_id = eventId || e.event_id;
    const table = {event:"events",guest:"guests",sponsor:"sponsors",task:"tasks",person:"event_people"}[type];
    try {
      await save(table, data, id);
      closeModal();
      if (type==="person") { state.page="event-detail"; state.detailId=data.event_id; render(); }
    } catch(err) {
      alert(err.message || "Errore durante il salvataggio.");
    }
  };
}
function closeModal(){ document.getElementById("modal")?.remove(); }

async function signOut() {
  if (sb) await sb.auth.signOut();
  state.user = null;
  render();
}

async function boot() {
  if (hasSupabase) {
    const {data} = await sb.auth.getSession();
    state.user = data.session?.user || null;
    sb.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      if (state.user) { loadData().then(render); } else render();
    });
  } else {
    state.user = {email:"demo"};
  }
  if (state.user) {
    try { await loadData(); } catch (e) { alert("Errore caricando i dati: " + e.message); }
  }
  render();
}
boot();
