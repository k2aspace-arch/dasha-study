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
const WDF = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
const SUBJ = () => GRADE_SUBJECTS.map(([id,n])=>[id,n]).concat([["oge-math","ОГЭ: математика"],["oge-rus","ОГЭ: русский язык"]]);
const sname = id => window.Journal ? Journal.subjName(id) : id;

/* данные */
const lessons = () => { const l = Object.assign({ week:{}, terms:{}, days:{} }, Store.get("lessons", {})); l.week = Object.assign({}, l.week); l.terms = Object.assign({}, l.terms); l.days = Object.assign({}, l.days); return l; };
// триместр даты (0, 1, 2); на каникулах — ближайший следующий
const termOf = s => { const T = (window.CAL && CAL.terms) || []; for(let i=0;i<T.length;i++) if(s <= T[i][1]) return i; return Math.max(0, T.length-1); };
// расписание недели на триместр: своё, а если не задано — от предыдущего триместра
function weekFor(L, ti){ for(let i=ti; i>=0; i--){ const w = L.terms[i]; if(w && Object.keys(w).length) return { w, own: i===ti, from:i }; } return { w: L.week || {}, own:false, from:-1 }; }
const tasks = () => { const t = Object.assign({ list:[] }, Store.get("tasks", {})); t.list = t.list.slice(); return t; };
const wdOf = s => (day(s).getDay() + 6) % 7;   // 0 = понедельник
const isOff = s => { const C = window.CAL; return wdOf(s) > 5 || (C && (C.holidays.includes(s) || C.vacations.some(([a,b])=>s>=a && s<=b))); };
// уроки на дату: из заполнялки на эту дату, иначе по неделе
function lessonsOn(s){
  const L = lessons();
  if(L.days[s]) return { list: L.days[s].slice().sort((a,b)=>(a.n||0)-(b.n||0)), src: L.days[s].some(x=>x.manual) || !L.days[s].length ? "manual" : "fill" };
  if(isOff(s)) return { list:[], src:"off" };
  return { list: (weekFor(L, termOf(s)).w[wdOf(s)] || []).map((subj,i)=>({ n:i+1, subj })).filter(x=>x.subj), src:"week" };
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
  const SUB = SUBJ().filter(x=>!x[0].startsWith("oge"));
  const editH = compact ? "" : `<details class="plain dayed"><summary class="sm">${L.src==="fill"||L.src==="manual" ? "Уроки на этот день изменены · поправить" : "Изменить уроки только на этот день"}</summary>
      <div class="dwday" style="margin-top:6px">${Array.from({length:8},(_,i)=>{ const v = (L.list.find(x=>x.n===i+1)||{}).subj||""; return `<div class="dwrow"><span class="dwn">${i+1}</span><select data-dl="${s}:${i+1}" aria-label="Урок ${i+1}"><option value="">—</option>${SUB.map(([id,n])=>`<option value="${id}" ${v===id?"selected":""}>${esc(n)}</option>`).join("")}</select></div>`; }).join("")}</div>
      ${L.src==="fill"||L.src==="manual" ? `<button class="btn" type="button" data-dlreset="${s}" style="margin-top:6px">Вернуть по расписанию</button>` : ""}</details>`;
  const taskRow = t => `<label class="ctask ${t.done?"done":""}"><input type="checkbox" data-tdone="${t.id}" ${t.done?"checked":""}><span>${esc(t.text)}${t.time?` <span class="sm">${esc(t.time)}</span>`:""}${t.date!==s?` <span class="chip warn">с ${esc(new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short"}).format(day(t.date)))}</span>`:""}</span><button class="pg" type="button" data-tdel="${t.id}" aria-label="Удалить">✕</button></label>`;
  return `<div class="cday">
    <div class="ccol"><h4>Уроки</h4>${lessonsH}${editH}</div>
    <div class="ccol"><h4>Мои задачи</h4>${overdue.concat(T).map(taskRow).join("") || `<p class="sm muted">Задач нет.</p>`}
      <form class="chatrow ctaskform" data-tadd="${s}"><input placeholder="Добавить задачу${compact?" на сегодня":""}" aria-label="Новая задача" required maxlength="200"><input type="time" aria-label="Время" class="ctime"><button class="btn" type="submit">+</button></form></div>
    ${E.length || H.length || !compact ? `<div class="ccol"><h4>События и домашка</h4>
      ${E.map(e=>`<div class="sm"><b>${esc(TY[e.type]||"Событие")}</b> · ${esc(sname(e.subj))}${e.time?` · ${esc(e.time)}`:""}${e.note?` · ${esc(e.note)}`:""}</div>`).join("")}
      ${H.map(h=>`<div class="sm ${h.done?"muted":""}">${h.done?"✓":"📘"} ${esc(sname(h.subj))}: ${esc(hwLabel(h))}</div>`).join("")}
      ${!E.length && !H.length ? `<p class="sm muted">Событий нет.</p>` : ""}
      ${compact ? "" : `<details class="plain evaddd"><summary class="btn">+ Контрольная, зачёт, экзамен</summary><form class="evform" data-evadd="${s}" style="margin-top:8px">
        <label>Предмет<select name="subj">${SUBJ().map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}</select></label>
        <label>Что будет<select name="type">${Object.entries(TY).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
        <label>Время<input type="time" name="time"></label>
        <label class="wide">Тема или заметка<input name="note" placeholder="например: квадратные неравенства"></label>
        <button class="btn primary" type="submit">Добавить</button></form></details>`}</div>` : ""}
  </div>`;
}
function bindDay(root, redraw){
  root.querySelectorAll("[data-evadd]").forEach(f=>f.addEventListener("submit", e=>{ e.preventDefault(); if(!window.Journal) return; const ev = Journal.events(), fd = new FormData(f);
    ev.list.push({ id:"e"+Date.now(), date:f.dataset.evadd, time:fd.get("time")||"", subj:fd.get("subj"), type:fd.get("type"), ch:"", note:String(fd.get("note")||"").trim() });
    Store.set("events", ev, 0); if(window.Points) Points.renderBar(); redraw(); }));
  root.querySelectorAll("[data-dl]").forEach(sl=>sl.addEventListener("change", ()=>{ const [d, n] = sl.dataset.dl.split(":"), l = lessons();
    // день целиком становится «своим»: берём текущие уроки дня и меняем один
    let list = (l.days[d] || lessonsOn(d).list).map(x=>({ n:x.n, subj:x.subj, time:x.time||"" })).filter(x=>x.n!==Number(n));
    if(sl.value) list.push({ n:Number(n), subj:sl.value, time:"" });
    l.days[d] = list.map(x=>Object.assign(x, { manual:true })); Store.set("lessons", l, 0); redraw(); }));
  root.querySelectorAll("[data-dlreset]").forEach(b=>b.addEventListener("click", ()=>{ const l = lessons(); delete l.days[b.dataset.dlreset]; Store.set("lessons", l, 0); redraw(); }));
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
  const ti = termOf(sel), WK = weekFor(L, ti), TT = (window.CAL && CAL.terms) || [];
  const wkDay = wi => `<div class="dwday"><div class="dwh">${WDF[wi]}</div>${Array.from({length:8},(_,i)=>`<div class="dwrow"><span class="dwn">${i+1}</span><select data-wk="${wi}:${i}" aria-label="${WDF[wi]}, урок ${i+1}"><option value="">—</option>${SUBJ().filter(x=>!x[0].startsWith("oge")).map(([id,n])=>`<option value="${id}" ${(WK.w[wi]||[])[i]===id?"selected":""}>${esc(n)}</option>`).join("")}</select></div>`).join("")}</div>`;
  $("main").innerHTML = `<div class="stack">
  <section class="panel" id="calday"><h3>${esc(DMW.format(day(sel)))}</h3>${dayHtml(sel)}</section>
  <section class="panel"><details class="plain" open><summary><b>Расписание уроков: ${esc(TT[ti] ? TT[ti][2] : "")}</b></summary>
    <p class="hint">Расписание повторяется на все недели этого триместра${TT[ti] ? ` (${esc(new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(day(TT[ti][0])))} – ${esc(new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(day(TT[ti][1])))})` : ""}. Если в какой-то день уроки другие, поменяй их у этого дня выше или пришли расписание в заполнялку.${!WK.own && WK.from>=0 ? ` Сейчас показано расписание ${esc(TT[WK.from][2])}а, поменяй, если в этом триместре оно другое.` : ""}</p>
    <div class="dweek"><div class="dwcol">${[0,1,2].map(wkDay).join("")}</div><div class="dwcol">${[3,4,5].map(wkDay).join("")}</div></div>
  </details></section>
  <section class="panel"><div class="calhead"><button class="btn" type="button" data-mon="-1" aria-label="Предыдущий месяц">‹</button><h2>${esc(MON.format(first))}</h2><button class="btn" type="button" data-mon="1" aria-label="Следующий месяц">›</button><button class="btn" type="button" data-mon="0">Сегодня</button></div>
    <div class="calgrid">${WD.map(w=>`<div class="cwd">${w}</div>`).join("")}${cells.map(s=>`<button type="button" class="cc ${s.slice(0,7)!==cur?"other":""} ${s===t?"today":""} ${s===sel?"sel":""} ${isOff(s)?"off":""}" data-day="${s}"><span>${Number(s.slice(8))}</span><span class="cdots">${dots(s)}</span></button>`).join("")}</div>
    <p class="sm muted cleg"><i class="d-ev"></i> событие <i class="d-hw"></i> домашка <i class="d-tk"></i> задача <i class="d-ls"></i> уроки из заполнялки</p></section></div>`;
  const main = $("main");
  main.querySelectorAll("[data-mon]").forEach(b=>b.addEventListener("click", ()=>{ const k = Number(b.dataset.mon); if(!k){ sel = today(); cur = sel.slice(0,7); } else { const d = new Date(y, m-1+k, 1); cur = iso(d).slice(0,7); } render(); }));
  main.querySelectorAll("[data-day]").forEach(b=>b.addEventListener("click", ()=>{ sel = b.dataset.day; if(sel.slice(0,7)!==cur) cur = sel.slice(0,7); render(); const d = $("calday"); if(d) d.scrollIntoView({ behavior:"smooth" }); }));
  main.querySelectorAll("[data-wk]").forEach(s=>s.addEventListener("change", ()=>{ const [wi, i] = s.dataset.wk.split(":").map(Number), l = lessons(); const base = weekFor(l, ti).w, t = {}; Object.keys(base).forEach(k=>t[k] = (base[k]||[]).slice());
    const w = (t[wi]||[]).slice(); w[i] = s.value; while(w.length && !w[w.length-1]) w.pop(); t[wi] = w; l.terms[ti] = t; Store.set("lessons", l, 0); if(!WK.own) render(); }));
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
