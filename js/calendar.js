// Календарь: уроки (вручную по неделе или из заполнялки на конкретные даты), события, домашка и свои задачи.
// «Сегодня» на главной: уроки, задачи и события дня всегда наверху.
(function(){
const { $, esc, pl } = window.App;
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const day = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = day(s); d.setDate(d.getDate()+n); return iso(d); };
const DMW = new Intl.DateTimeFormat("ru-RU",{weekday:"long",day:"numeric",month:"long"});
const MON = new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"});
const WD = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const SUBJ = () => GRADE_SUBJECTS.map(([id,n])=>[id,n]).concat([["oge-math","ОГЭ: математика"],["oge-rus","ОГЭ: русский язык"]]);
const sname = id => window.Journal ? Journal.subjName(id) : id;

/* данные */
const lessons = () => { const l = Object.assign({ week:{}, days:{} }, Store.get("lessons", {})); l.week = Object.assign({}, l.week); l.days = Object.assign({}, l.days); return l; };
const tasks = () => { const t = Object.assign({ list:[] }, Store.get("tasks", {})); t.list = t.list.slice(); return t; };
const wdOf = s => (day(s).getDay() + 6) % 7;   // 0 = понедельник
const isOff = s => { const C = window.CAL; return wdOf(s) > 5 || (C && (C.holidays.includes(s) || C.vacations.some(([a,b])=>s>=a && s<=b))); };
// уроки на дату: из заполнялки на эту дату, иначе по неделе
function lessonsOn(s){
  const L = lessons();
  if(L.days[s] && L.days[s].length) return { list: L.days[s].slice().sort((a,b)=>(a.n||0)-(b.n||0)), src:"fill" };
  if(isOff(s)) return { list:[], src:"off" };
  return { list: (L.week[wdOf(s)] || []).map((subj,i)=>({ n:i+1, subj })).filter(x=>x.subj), src:"week" };
}
const eventsOn = s => window.Journal ? Journal.events().list.filter(e=>e.date===s).sort((a,b)=>(a.time||"").localeCompare(b.time||"")) : [];
const hwOn = s => window.Journal ? Journal.journal().hw.filter(h=>h.date===s) : [];
const tasksOn = s => tasks().list.filter(t=>t.date===s);
const hwLabel = h => { const p = []; if(h.par) p.push(`§ ${h.par}`); if(h.page) p.push(`стр. ${h.page}`); if(h.ex) p.push(`упр. ${h.ex}`); return p.concat(h.text ? [h.text] : []).join(", "); };

/* разметка дня */
function dayHtml(s, compact){
  const L = lessonsOn(s), E = eventsOn(s), H = hwOn(s), T = tasksOn(s);
  const overdue = compact && s===today() ? tasks().list.filter(t=>!t.done && t.date < s) : [];
  const TY = window.Journal ? Journal.TYPES : {};
  const lessonsH = L.list.length ? `<ol class="lessons">${L.list.map(x=>{ const ev = E.find(e=>e.subj===x.subj);
      return `<li><span class="ln">${x.n||""}</span>${x.time?`<span class="sm lt">${esc(x.time)}</span>`:""}<b>${esc(sname(x.subj))}</b>${ev?` <span class="chip warn">${esc(TY[ev.type]||"событие")}</span>`:""}</li>`; }).join("")}</ol>`
    : `<p class="sm muted">${L.src==="off" ? "Выходной, уроков нет." : "Уроки на этот день не заданы. Заполни неделю в календаре или пришли расписание в заполнялку."}</p>`;
  const taskRow = t => `<label class="ctask ${t.done?"done":""}"><input type="checkbox" data-tdone="${t.id}" ${t.done?"checked":""}><span>${esc(t.text)}${t.time?` <span class="sm">${esc(t.time)}</span>`:""}${t.date!==s?` <span class="chip warn">с ${esc(new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short"}).format(day(t.date)))}</span>`:""}</span><button class="pg" type="button" data-tdel="${t.id}" aria-label="Удалить">✕</button></label>`;
  return `<div class="cday">
    <div class="ccol"><h4>Уроки</h4>${lessonsH}</div>
    <div class="ccol"><h4>Мои задачи</h4>${overdue.concat(T).map(taskRow).join("") || `<p class="sm muted">Задач нет.</p>`}
      <form class="chatrow ctaskform" data-tadd="${s}"><input placeholder="Добавить задачу${compact?" на сегодня":""}" aria-label="Новая задача" required maxlength="200"><input type="time" aria-label="Время" class="ctime"><button class="btn" type="submit">+</button></form></div>
    ${E.length || H.length ? `<div class="ccol"><h4>События и домашка</h4>
      ${E.map(e=>`<div class="sm"><b>${esc(TY[e.type]||"Событие")}</b> · ${esc(sname(e.subj))}${e.time?` · ${esc(e.time)}`:""}${e.note?` · ${esc(e.note)}`:""}</div>`).join("")}
      ${H.map(h=>`<div class="sm ${h.done?"muted":""}">${h.done?"✓":"📘"} ${esc(sname(h.subj))}: ${esc(hwLabel(h))}</div>`).join("")}</div>` : ""}
  </div>`;
}
function bindDay(root, redraw){
  root.querySelectorAll("[data-tdone]").forEach(c=>c.addEventListener("change", ()=>{ const t = tasks(); t.list = t.list.map(x=>x.id===c.dataset.tdone ? Object.assign({}, x, { done: c.checked ? Date.now() : 0 }) : x); Store.set("tasks", t, 0); redraw(); }));
  root.querySelectorAll("[data-tdel]").forEach(b=>b.addEventListener("click", e=>{ e.preventDefault(); const t = tasks(); t.list = t.list.filter(x=>x.id!==b.dataset.tdel); Store.set("tasks", t, 0); redraw(); }));
  root.querySelectorAll("[data-tadd]").forEach(f=>f.addEventListener("submit", e=>{ e.preventDefault(); const [txt, tm] = f.querySelectorAll("input"); if(!txt.value.trim()) return;
    const t = tasks(); t.list.push({ id:"k"+Date.now()+Math.random().toString(36).slice(2,5), date:f.dataset.tadd, time:tm.value, text:txt.value.trim(), done:0, ts:Date.now() }); Store.set("tasks", t, 0); redraw(); }));
}

/* «Сегодня» на главной */
function todayPanel(){
  const s = today();
  return `<section class="panel todayp" id="todayp"><div class="todayh"><h2>Сегодня, ${esc(DMW.format(day(s)))}</h2><a class="btn" href="#calendar">Календарь</a></div>${dayHtml(s, true)}</section>`;
}
function bindToday(root){ const re = () => { const el = $("todayp"); if(el){ el.outerHTML = todayPanel(); bindToday(root); } }; const el = $("todayp"); if(el) bindDay(el, re); }

/* раздел «Календарь» */
let cur = null, sel = null;
function render(){
  const t = today(); if(!sel) sel = t; if(!cur) cur = sel.slice(0,7);
  const [y, m] = cur.split("-").map(Number), first = new Date(y, m-1, 1), start = addDays(iso(first), -((first.getDay()+6)%7));
  const L = lessons(), T = tasks().list, EV = window.Journal ? Journal.events().list : [], HW = window.Journal ? Journal.journal().hw : [];
  const cells = []; for(let i=0;i<42;i++){ const s = addDays(start, i); if(i>=35 && s.slice(0,7)!==cur) break; cells.push(s); }
  const dots = s => { const out = []; const ev = EV.filter(e=>e.date===s), tk = T.filter(x=>x.date===s), hw = HW.filter(h=>h.date===s);
    if(ev.length) out.push(`<i class="d-ev" title="события"></i>`); if(hw.length) out.push(`<i class="d-hw" title="домашка"></i>`); if(tk.length) out.push(`<i class="d-tk ${tk.every(x=>x.done)?"ok":""}" title="задачи"></i>`); if(L.days[s]) out.push(`<i class="d-ls" title="уроки из заполнялки"></i>`); return out.join(""); };
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><div class="calhead"><button class="btn" type="button" data-mon="-1" aria-label="Предыдущий месяц">‹</button><h2>${esc(MON.format(first))}</h2><button class="btn" type="button" data-mon="1" aria-label="Следующий месяц">›</button><button class="btn" type="button" data-mon="0">Сегодня</button></div>
    <div class="calgrid">${WD.map(w=>`<div class="cwd">${w}</div>`).join("")}${cells.map(s=>`<button type="button" class="cc ${s.slice(0,7)!==cur?"other":""} ${s===t?"today":""} ${s===sel?"sel":""} ${isOff(s)?"off":""}" data-day="${s}"><span>${Number(s.slice(8))}</span><span class="cdots">${dots(s)}</span></button>`).join("")}</div>
    <p class="sm muted cleg"><i class="d-ev"></i> событие <i class="d-hw"></i> домашка <i class="d-tk"></i> задача <i class="d-ls"></i> уроки из заполнялки</p></section>
  <section class="panel" id="calday"><h3>${esc(DMW.format(day(sel)))}</h3>${dayHtml(sel)}</section>
  <section class="panel"><details class="plain" ${Object.keys(L.week).length?"":"open"}><summary><b>Расписание уроков на неделю</b></summary>
    <p class="hint">Заполни один раз: по нему календарь покажет уроки на каждый учебный день. Если пришлёшь расписание в заполнялку, на те даты будет оно.</p>
    <div class="weekgrid">${WD.slice(0,6).map((w,wi)=>`<div class="wcol"><b>${w}</b>${Array.from({length:8},(_,i)=>`<select data-wk="${wi}:${i}" aria-label="${w}, урок ${i+1}"><option value="">${i+1}. —</option>${SUBJ().filter(x=>!x[0].startsWith("oge")).map(([id,n])=>`<option value="${id}" ${(L.week[wi]||[])[i]===id?"selected":""}>${i+1}. ${esc(n)}</option>`).join("")}</select>`).join("")}</div>`).join("")}</div>
  </details></section></div>`;
  const main = $("main");
  main.querySelectorAll("[data-mon]").forEach(b=>b.addEventListener("click", ()=>{ const k = Number(b.dataset.mon); if(!k){ sel = today(); cur = sel.slice(0,7); } else { const d = new Date(y, m-1+k, 1); cur = iso(d).slice(0,7); } render(); }));
  main.querySelectorAll("[data-day]").forEach(b=>b.addEventListener("click", ()=>{ sel = b.dataset.day; if(sel.slice(0,7)!==cur) cur = sel.slice(0,7); render(); const d = $("calday"); if(d && innerWidth < 800) d.scrollIntoView({ behavior:"smooth" }); }));
  main.querySelectorAll("[data-wk]").forEach(s=>s.addEventListener("change", ()=>{ const [wi, i] = s.dataset.wk.split(":").map(Number), l = lessons(); const w = (l.week[wi]||[]).slice(); w[i] = s.value; while(w.length && !w[w.length-1]) w.pop(); l.week[wi] = w; Store.set("lessons", l); }));
  bindDay($("calday"), render);
}
// из заполнялки: уроки на даты
function addLessons(list){
  const l = lessons(); let n = 0;
  list.forEach(x=>{ const d = l.days[x.date] = (l.days[x.date]||[]).slice(); const k = Number(x.n)||d.length+1; const i = d.findIndex(y=>y.n===k); const v = { n:k, subj:x.subject, time:x.time||"" }; if(i>=0) d[i] = v; else d.push(v); n++; });
  Store.set("lessons", l, 0); return n;
}
window.Calendar = { render, todayPanel, bindToday, lessonsOn, addLessons };
})();
