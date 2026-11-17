// Дневник из электронного журнала: заполнялка (ИИ разбирает скрины и текст),
// журнал оценок и пропусков, домашка, расписание контрольных и напоминания.
(function(){
const { $, esc, pl, S } = window.App;

/* ---------- фото ---------- */
const Photo = {
  // выбрать фото (с телефона откроется камера или галерея); вернёт [{b64, url}]
  pick(multiple){
    return new Promise(res=>{
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; if(multiple) inp.multiple = true;
      inp.addEventListener("change", async()=>{ const out = []; for(const f of [...(inp.files||[])].slice(0, 8)){ try{ out.push(await Photo.shrink(f)); }catch(e){} } res(out); });
      inp.click();
    });
  },
  async shrink(file, max){
    max = max || 1600;
    const img = await createImageBitmap(file), k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height);
    const url = c.toDataURL("image/jpeg", 0.82); return { b64: url.split(",")[1], url };
  }
};
window.Photo = Photo;

/* ---------- данные ---------- */
const journal = () => { const j = Object.assign({grades:[], abs:[], hw:[], imports:[]}, Store.get("journal", {})); ["grades","abs","hw","imports"].forEach(k=>j[k] = (j[k]||[]).slice()); return j; };
const events = () => { const e = Object.assign({list:[]}, Store.get("events", {})); e.list = e.list.slice(); return e; };
const SUBJ = GRADE_SUBJECTS.map(([id,n])=>[id,n]).concat([["oge-math","ОГЭ: математика"],["oge-rus","ОГЭ: русский язык"]]);
const subjName = id => (SUBJ.find(x=>x[0]===id)||[,id||"—"])[1];
const TYPES = { test:"Контрольная", independent:"Самостоятельная", credit:"Зачёт", exam:"Экзамен", oge:"Пробный ОГЭ", other:"Другое" };
const KIND = { current:"текущая", test:"контрольная", t1:"итог 1 трим.", t2:"итог 2 трим.", t3:"итог 3 трим.", year:"годовая" };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const day = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const today = () => iso(new Date());
const daysTo = s => Math.round((day(s) - day(today())) / 864e5);
const DM = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});
const DMW = new Intl.DateTimeFormat("ru-RU",{weekday:"short",day:"numeric",month:"short"});
const when = s => { const n = daysTo(s); return n===0 ? "сегодня" : n===1 ? "завтра" : n===2 ? "послезавтра" : n>0 ? `через ${pl(n,"день","дня","дней")}` : DM.format(day(s)); };
const lastImport = () => { const j = journal(); return j.imports.length ? j.imports[j.imports.length-1].ts : 0; };
const importDue = () => { const t = lastImport(); return !t || Date.now() - t > 7*864e5; };
const bookOf = id => BOOKS.find(b=>b.id===id);

/* ---------- заполнялка ---------- */
let fill = { imgs:[], text:"", result:null };
function renderFill(){
  const ai = Store.aiAvailable(), last = lastImport();
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Заполнялка</h2>
    <p class="hint" style="margin:6px 0 12px">Пришли скриншоты из электронного дневника или вставь текст: оценки, Н, расписание контрольных, домашку. ИИ сам разберёт и разнесёт всё по местам: оценки и пропуски в журнал, контрольные и экзамены в расписание, итоговые оценки в таблицу на главной.</p>
    <p class="note ${importDue()?"warn":""}">${last ? `Последний раз присылали ${DM.format(new Date(last))}.` : "Ещё ничего не присылали."} Раз в неделю присылай скрин оценок за прошлую неделю: за это +10 очков, а все оценки и Н превращаются в очки автоматически.</p>
    ${ai ? "" : `<p class="note"><b>Заполнялке нужен ИИ.</b> Она заработает, когда будет задеплоена новая версия функции.</p>`}
    <div class="fillimgs" id="fimgs"></div>
    <div class="btnrow"><button class="btn" type="button" id="faddimg">📷 Добавить скриншоты</button></div>
    <textarea id="ftext" class="filltext" placeholder="Или вставь сюда текст: например «Алгебра 12.11 — 5 за контрольную, 19.11 зачёт по геометрии, на завтра по русскому упр. 145»" aria-label="Текст для заполнялки">${esc(fill.text)}</textarea>
    <div class="btnrow"><button class="btn primary" type="button" id="fgo" ${ai?"":"disabled"}>Разобрать</button><span class="sm" id="fstat" aria-live="polite"></span></div>
  </section>
  <section class="panel" id="fres" ${fill.result?"":"hidden"}></section></div>`;
  drawImgs(); if(fill.result) drawResult();
  $("faddimg").addEventListener("click", async()=>{ const got = await Photo.pick(true); fill.imgs = fill.imgs.concat(got).slice(0,8); drawImgs(); });
  $("ftext").addEventListener("input", e=>fill.text = e.target.value);
  $("fgo").addEventListener("click", async()=>{
    if(!fill.imgs.length && !fill.text.trim()){ $("fstat").textContent = "Добавь скриншот или текст."; return; }
    $("fgo").disabled = true; $("fstat").textContent = "ИИ читает…";
    try{
      const r = await Store.ask({ mode:"fill", today: today(), subjects: SUBJ, text: fill.text, images: fill.imgs.map(x=>x.b64) });
      const t = r.text || "", a = t.indexOf("{"), z = t.lastIndexOf("}");
      fill.result = JSON.parse(t.slice(a, z+1)); $("fstat").textContent = ""; drawResult();
    }catch(e){ $("fstat").textContent = "Не получилось разобрать: " + e.message; }
    $("fgo").disabled = false;
  });
}
function drawImgs(){
  const el = $("fimgs"); if(!el) return;
  el.innerHTML = fill.imgs.map((x,i)=>`<div class="fimg"><img src="${x.url}" alt="Скриншот ${i+1}"><button class="pg" type="button" data-rmimg="${i}" aria-label="Убрать скриншот">✕</button></div>`).join("");
  el.querySelectorAll("[data-rmimg]").forEach(b=>b.addEventListener("click",()=>{ fill.imgs.splice(Number(b.dataset.rmimg),1); drawImgs(); }));
}
const validSubj = id => SUBJ.some(x=>x[0]===id);
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d||"");
function drawResult(){
  const r = fill.result || {}, j = journal(), ev = events();
  const G = (r.grades||[]).filter(g=>validSubj(g.subject) && /^[2-5]$/.test(String(g.mark)) && validDate(g.date)).map(g=>({ ...g, mark:String(g.mark), kind: KIND[g.kind] ? g.kind : "current", dup: j.grades.some(x=>x.date===g.date && x.subj===g.subject && x.mark===String(g.mark) && x.kind===(KIND[g.kind]?g.kind:"current")) }));
  const A = (r.absences||[]).filter(a=>validDate(a.date)).map(a=>({ ...a, reason: ["absent","sick","excused"].includes(a.reason) ? a.reason : "absent", dup: j.abs.some(x=>x.date===a.date && (x.subj||"")===(a.subject||"")) }));
  const E = (r.events||[]).filter(e=>validDate(e.date) && validSubj(e.subject)).map(e=>({ ...e, type: TYPES[e.type] ? e.type : "other", dup: ev.list.some(x=>x.date===e.date && x.subj===e.subject && x.type===(TYPES[e.type]?e.type:"other")) }));
  const H = (r.homework||[]).filter(h=>validDate(h.date) && validSubj(h.subject) && (h.text||h.page||h.paragraph||h.exercise)).map(h=>({ ...h, text:h.text||"", dup: j.hw.some(x=>x.date===h.date && x.subj===h.subject && hwLabel(x)===hwLabel({page:h.page, par:h.paragraph, ex:h.exercise, text:h.text||""})) }));
  fill.parsed = { G, A, E, H };
  const row = (sec, i, it, html) => `<label class="frow ${it.dup?"dup":""}"><input type="checkbox" data-pick="${sec}:${i}" ${it.dup?"":"checked"}> ${html}${it.dup?` <span class="chip">уже есть</span>`:""}</label>`;
  const R = { absent:"Н, без причины", sick:"болела", excused:"по уважительной" };
  $("fres").hidden = false;
  $("fres").innerHTML = `<h3>Что нашёл ИИ</h3><p class="hint">Проверь и сними галочки там, где ИИ ошибся. Потом нажми «Разнести».</p>
    ${G.length?`<h4>Оценки · ${G.length}</h4>${G.map((g,i)=>row("G",i,g,`<span>${DMW.format(day(g.date))}</span><span>${esc(subjName(g.subject))}</span><b class="mk m${g.mark}">${g.mark}</b><span class="sm">${KIND[g.kind]}${g.note?` · ${esc(g.note)}`:""}</span>`)).join("")}`:""}
    ${A.length?`<h4>Пропуски · ${A.length}</h4>${A.map((a,i)=>row("A",i,a,`<span>${DMW.format(day(a.date))}</span><span>${esc(a.subject?subjName(a.subject):"весь день")}</span><span class="sm">${R[a.reason]}</span>`)).join("")}`:""}
    ${E.length?`<h4>В расписание · ${E.length}</h4>${E.map((e,i)=>row("E",i,e,`<span>${DMW.format(day(e.date))}${e.time?` ${esc(e.time)}`:""}</span><span>${esc(subjName(e.subject))}</span><b>${TYPES[e.type]}</b><span class="sm">${esc(e.note||"")}</span>`)).join("")}`:""}
    ${H.length?`<h4>Домашка · ${H.length}</h4>${H.map((h,i)=>row("H",i,h,`<span>${DMW.format(day(h.date))}</span><span>${esc(subjName(h.subject))}</span><span class="sm">${esc(hwLabel({page:h.page, par:h.paragraph, ex:h.exercise, text:h.text}))}</span>`)).join("")}`:""}
    ${!G.length&&!A.length&&!E.length&&!H.length ? `<p>Ничего не нашёл. Попробуй скриншот почётче или вставь текст.</p>` : ""}
    ${r.unclear ? `<p class="note">Не разобрал: ${esc(r.unclear)}</p>` : ""}
    <div class="btnrow"><button class="btn primary" type="button" id="fapply">Разнести отмеченное</button><button class="btn" type="button" id="fdrop">Отменить</button></div>`;
  $("fdrop").addEventListener("click", ()=>{ fill.result = null; $("fres").hidden = true; });
  $("fapply").addEventListener("click", applyFill);
}
function applyFill(){
  const P = fill.parsed, picked = sec => P[sec].filter((_,i)=>{ const c = $("fres").querySelector(`[data-pick="${sec}:${i}"]`); return c && c.checked; });
  const j = journal(), ev = events(), now = Date.now(), gg = S.grades();
  const G = picked("G"), A = picked("A"), E = picked("E"), H = picked("H");
  let finals = 0;
  G.forEach(g=>{ j.grades.push({ id:"g"+now+Math.random().toString(36).slice(2,6), date:g.date, subj:g.subject, mark:g.mark, kind:g.kind, note:g.note||"", ts:now });
    if(["t1","t2","t3","year"].includes(g.kind) && GRADE_SUBJECTS.some(x=>x[0]===g.subject)){ const t = g.kind==="year" ? "y" : g.kind; gg.g[g.subject] = Object.assign({}, gg.g[g.subject], {[t]: g.mark}); finals++; } });
  A.forEach(a=>j.abs.push({ date:a.date, subj:a.subject||"", reason:a.reason, ts:now }));
  H.forEach(h=>j.hw.push({ id:"h"+now+Math.random().toString(36).slice(2,6), date:h.date, subj:h.subject, page:String(h.page||""), par:String(h.paragraph||""), ex:String(h.exercise||""), text:h.text||"", kind: h.kind==="other" ? "other" : "book", src:"fill", ts:now }));
  E.forEach(e=>ev.list.push({ id:"e"+now+Math.random().toString(36).slice(2,6), date:e.date, time:e.time||"", subj:e.subject, type:e.type, note:e.note||"", src:"fill" }));
  j.imports.push({ ts:now, grades:G.length, abs:A.length, hw:H.length, events:E.length });
  Store.set("journal", j, 0); Store.set("events", ev, 0); if(finals) Store.set("grades", gg, 0);
  fill = { imgs:[], text:"", result:null };
  if(window.Points) Points.renderBar();
  $("main").querySelector("#fres").innerHTML = `<h3>Готово</h3><p>Разнесено: ${pl(G.length,"оценка","оценки","оценок")}, ${pl(A.length,"пропуск","пропуска","пропусков")}, ${pl(E.length,"событие","события","событий")} в расписание, ${pl(H.length,"домашка","домашки","домашек")}${finals?`, итоговых оценок в таблицу: ${finals}`:""}.</p><div class="btnrow"><a class="btn" href="#diary">Открыть дневник</a><a class="btn" href="#schedule">Расписание</a></div>`;
  $("ftext").value = ""; drawImgs();
}

/* ---------- домашка ---------- */
function hwLabel(h){
  const parts = []; if(h.par) parts.push(`§ ${h.par}`); if(h.page) parts.push(`стр. ${h.page}`); if(h.ex) parts.push(`упр. ${h.ex}`);
  return parts.concat(h.text ? [h.text] : []).join(", ");
}
const tomorrow = () => iso(new Date(Date.now() + 864e5));
function renderHw(host){
  const j = journal(), t = today(), weekAgo = iso(new Date(Date.now() - 7*864e5));
  const todo = j.hw.filter(h=>!h.done).sort((a,b)=>a.date.localeCompare(b.date));
  const done = j.hw.filter(h=>h.done && iso(new Date(h.done)) >= weekAgo).sort((a,b)=>b.done-a.done);
  const row = h => { const b = bookOf(h.subj), late = !h.done && h.date < t;
    return `<div class="hwi ${h.done?"done":""} ${late?"late":""}"><label class="hwchk"><input type="checkbox" data-hwdone="${h.id}" ${h.done?"checked":""}><span>Сделала</span></label>
      <div class="hwmain"><div><b>${esc(subjName(h.subj))}</b> <span class="sm">${h.done ? "сделано "+DM.format(new Date(h.done)) : late ? "просрочено, было на "+DM.format(day(h.date)) : "на "+DMW.format(day(h.date))}${h.kind==="other"?" · своё задание":""}</span></div><div>${esc(hwLabel(h))||"—"}</div></div>
      <div class="evb">${b && h.page && Number(h.page) ? `<button class="pg" type="button" data-hwpage="${h.id}">стр. ${esc(h.page)}</button>` : ""}<button class="pg" type="button" data-hwdel="${h.id}" aria-label="Удалить задание">✕</button></div></div>`; };
  host.innerHTML = `<h3>Домашка</h3>
    ${todo.length ? todo.map(row).join("") : `<p class="hint">Всё сделано или ничего не задано.</p>`}
    ${done.length ? `<details class="hwdone plain"><summary class="sm">Сделано за неделю · ${done.length}</summary>${done.map(row).join("")}</details>` : ""}
    <details class="hwadd" ${todo.length?"":"open"}><summary class="btn">+ Добавить задание</summary>
    <form id="hwform" class="evform">
      <label>Предмет<select id="hwsubj">${GRADE_SUBJECTS.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}</select></label>
      <label>На какое число<input type="date" id="hwdate" value="${tomorrow()}"></label>
      <label>Что задано<select id="hwkind"><option value="book">Из учебника</option><option value="other">Своё: задача, доклад, проект…</option></select></label>
      <label data-bookf>Параграф<input type="text" id="hwpar" placeholder="например 5"></label>
      <label data-bookf>Страница<input type="text" id="hwpage" inputmode="numeric" placeholder="например 34"></label>
      <label data-bookf>Упражнения или номера<input type="text" id="hwex" placeholder="например 120–125"></label>
      <label class="wide">Описание<input type="text" id="hwtext" placeholder="например: выучить правило; доклад про Петра I"></label>
      <button class="btn primary" type="submit">Добавить</button>
    </form></details>
    <p class="hint">За каждое сделанное задание из учебника +2 очка, за своё задание (доклад, проект, задача) +4, и день засчитывается в серию.</p>`;
  const sync = () => host.querySelectorAll("[data-bookf]").forEach(l=>l.hidden = $("hwkind").value!=="book");
  $("hwkind").addEventListener("change", sync); sync();
  $("hwform").addEventListener("submit", e=>{ e.preventDefault(); const book = $("hwkind").value==="book";
    const h = { id:"h"+Date.now(), subj:$("hwsubj").value, date:$("hwdate").value||tomorrow(), kind:book?"book":"other", par:book?$("hwpar").value.trim():"", page:book?$("hwpage").value.trim():"", ex:book?$("hwex").value.trim():"", text:$("hwtext").value.trim(), src:"manual", ts:Date.now() };
    if(!hwLabel(h)){ $("hwtext").focus(); return; }
    const jj = journal(); jj.hw.push(h); Store.set("journal", jj, 0); renderHw(host); });
  const upd = (id, fn) => { const jj = journal(); jj.hw = jj.hw.map(x=>x.id===id ? fn(Object.assign({}, x)) : x).filter(Boolean); Store.set("journal", jj, 0); if(window.Points) Points.renderBar(); renderHw(host); };
  host.querySelectorAll("[data-hwdone]").forEach(c=>c.addEventListener("change",()=>upd(c.dataset.hwdone, x=>{ if(c.checked) x.done = Date.now(); else delete x.done; return x; })));
  host.querySelectorAll("[data-hwdel]").forEach(b=>b.addEventListener("click",()=>upd(b.dataset.hwdel, ()=>null)));
  host.querySelectorAll("[data-hwpage]").forEach(b=>b.addEventListener("click",()=>{ const h = journal().hw.find(x=>x.id===b.dataset.hwpage); const bk = h && bookOf(h.subj); if(bk) Reader.open(bk, Number(h.page), `Домашка: ${hwLabel(h)}`); }));
}

/* ---------- дневник (только чтение) ---------- */
function renderDiary(){
  const j = journal(), up = upcoming(14);
  const dates = [...new Set(j.grades.map(g=>g.date).concat(j.abs.map(a=>a.date)))].sort().reverse().slice(0, 40);

  const R = { absent:"Н", sick:"Б", excused:"УП" };
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><div class="dadrow"><h2>Дневник</h2><a class="btn primary" href="#fill">Прислать скрин в заполнялку</a></div>
    <p class="hint" style="margin:6px 0 0">Оценки и пропуски попадают сюда только из электронного дневника через заполнялку, вручную их не вносят. Очки за них считаются сами. Домашку можно добавлять и отмечать самой.</p>
    ${importDue() ? `<p class="note warn"><b>Пора прислать скрин оценок за прошлую неделю.</b> За это +10 очков.</p>` : ""}
  </section>
  ${up.length ? `<section class="panel"><h3>Скоро</h3>${up.map(evRow).join("")}</section>` : ""}
  <section class="panel" id="hwbox"></section>
  <section class="panel"><h3>Оценки и пропуски</h3>${dates.length ? dates.map(d=>`<div class="jday"><div class="jdate">${DMW.format(day(d))}</div><div class="jitems">${
      j.grades.filter(g=>g.date===d).map(g=>`<span class="jg" title="${esc(KIND[g.kind]||"")}${g.note?": "+esc(g.note):""}"><span>${esc(subjName(g.subj))}</span><b class="mk m${g.mark}">${g.mark}</b>${g.kind!=="current"?`<small>${esc(KIND[g.kind])}</small>`:""}</span>`).join("") +
      j.abs.filter(a=>a.date===d).map(a=>`<span class="jg ja"><span>${esc(a.subj?subjName(a.subj):"весь день")}</span><b>${R[a.reason]||"Н"}</b></span>`).join("")}</div></div>`).join("")
    : `<p class="hint">Пока пусто. Пришли скрин оценок из электронного дневника в заполнялку.</p>`}</section></div>`;
  renderHw($("hwbox"));
  bindEv($("main"));
}

/* ---------- расписание ---------- */
function upcoming(n){ return events().list.filter(e=>{ const d = daysTo(e.date); return d>=0 && d<=n; }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)); }
function chapterOpts(subj, sel){ const b = bookOf(subj); if(!b) return ""; return `<option value="">— глава —</option>` + b.groups.flatMap((g,gi)=>g.chapters.map((c,ci)=>`<option value="${gi}.${ci}" ${sel===gi+"."+ci?"selected":""}>${esc(c.n+" "+c.t)}</option>`)).join(""); }
function evRow(e){
  const n = daysTo(e.date), b = bookOf(e.subj), ch = b && e.ch ? b.groups[e.ch.split(".")[0]].chapters[e.ch.split(".")[1]] : null;
  return `<div class="evrow ${n<=2&&n>=0?"soon":""} ${n<0?"past":""}"><div class="evd"><b>${DM.format(day(e.date))}</b><span class="sm">${e.time?esc(e.time)+" · ":""}${n>=0?when(e.date):"прошло"}</span></div>
    <div class="evt"><b>${TYPES[e.type]||"Событие"}</b> · ${esc(subjName(e.subj))}${ch?` · ${esc(ch.n+" "+ch.t)}`:""}${e.note?`<div class="sm">${esc(e.note)}</div>`:""}</div>
    <div class="evb">${n>=0?`<button class="btn primary" type="button" data-prep="${e.id}">Подготовиться</button><button class="btn" type="button" data-ics="${e.id}">В календарь</button>`:""}<button class="pg" type="button" data-evdel="${e.id}" aria-label="Удалить">✕</button></div>
    <div class="evprep" id="prep-${e.id}" hidden></div></div>`;
}
function renderSchedule(){
  const all = events().list.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)), fut = all.filter(e=>daysTo(e.date)>=0), past = all.filter(e=>daysTo(e.date)<0).reverse();
  const notif = "Notification" in window ? Notification.permission : "unsupported";
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Расписание</h2><p class="hint" style="margin:6px 0 12px">Контрольные, зачёты и экзамены. За несколько дней до события сайт напомнит и предложит подготовиться. Кнопка «В календарь» добавит событие в календарь телефона с напоминаниями за 3 дня и за 1 день.</p>
    <form id="evform" class="evform">
      <label>Дата<input type="date" id="evdate" required min="${today()}"></label>
      <label>Время<input type="time" id="evtime"></label>
      <label>Предмет<select id="evsubj">${SUBJ.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}</select></label>
      <label>Что будет<select id="evtype">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></label>
      <label id="evchwrap">Глава<select id="evch"></select></label>
      <label class="wide">Тема или заметка<input type="text" id="evnote" placeholder="например: квадратные неравенства, № 1–20"></label>
      <button class="btn primary" type="submit">Добавить</button>
    </form>
    <p class="sm" style="margin-top:10px">${notif==="granted" ? "Уведомления в браузере включены." : notif==="unsupported" ? "" : `<button class="btn" type="button" id="evnotif">Включить уведомления в браузере</button> Сайт напомнит, когда он открыт.`}</p>
  </section>
  <section class="panel"><h3>Впереди</h3>${fut.length ? fut.map(evRow).join("") : `<p class="hint">Пока ничего. Добавь сама или пришли скрин расписания в <a href="#fill">заполнялку</a>.</p>`}</section>
  ${past.length ? `<section class="panel"><details class="plain"><summary><b>Прошедшие · ${past.length}</b></summary>${past.slice(0,30).map(evRow).join("")}</details></section>` : ""}</div>`;
  const syncCh = () => { const o = chapterOpts($("evsubj").value); $("evch").innerHTML = o; $("evchwrap").hidden = !o; };
  $("evsubj").addEventListener("change", syncCh); syncCh();
  $("evform").addEventListener("submit", e=>{ e.preventDefault(); const ev = events();
    ev.list.push({ id:"e"+Date.now(), date:$("evdate").value, time:$("evtime").value, subj:$("evsubj").value, type:$("evtype").value, ch:$("evch").value||"", note:$("evnote").value.trim() });
    Store.set("events", ev, 0); if(window.Points) Points.renderBar(); renderSchedule(); });
  const nb = $("evnotif"); if(nb) nb.addEventListener("click", async()=>{ try{ await Notification.requestPermission(); }catch(e){} renderSchedule(); notify(); });
  bindEv($("main"));
}
function bindEv(root){
  root.querySelectorAll("[data-evdel]").forEach(b=>b.addEventListener("click",()=>{ const ev = events(); ev.list = ev.list.filter(x=>x.id!==b.dataset.evdel); Store.set("events", ev, 0); if(window.Points) Points.renderBar(); b.closest(".evrow").remove(); }));
  root.querySelectorAll("[data-ics]").forEach(b=>b.addEventListener("click",()=>ics(events().list.find(x=>x.id===b.dataset.ics))));
  root.querySelectorAll("[data-prep]").forEach(b=>b.addEventListener("click",()=>{ const box = root.querySelector("#prep-"+b.dataset.prep); box.hidden = !box.hidden; if(!box.hidden) box.innerHTML = prepHtml(events().list.find(x=>x.id===b.dataset.prep)); bindPrep(box); }));
}
function prepHtml(e){
  const b = bookOf(e.subj), n = daysTo(e.date), kd = window.Topic ? Topic.know().k : {};
  const what = `${(TYPES[e.type]||"событие").toLowerCase()} по предмету «${subjName(e.subj)}»${e.note?` (${e.note})`:""}`;
  const ask = `Через ${pl(Math.max(n,0),"день","дня","дней")} у меня ${what}. Составь короткий план подготовки по дням и начни с первого шага.`;
  let html = `<p class="sm">До события ${n===0?"меньше дня":pl(n,"день","дня","дней")}. Вот что можно сделать:</p><div class="btnrow">`;
  if(e.subj==="oge-math" || e.subj==="oge-rus") html += `<a class="btn" href="#oge">Пробный вариант ОГЭ на время</a>`;
  if(b && e.ch){ const [gi,ci] = e.ch.split(".").map(Number), c = b.groups[gi].chapters[ci];
    html += `<a class="btn" href="#q/${b.id}/${e.ch}">Итоговые вопросы по главе</a></div><p class="sm" style="margin:8px 0 4px">Повторить темы главы (сначала слабые):</p><div class="prep-topics">` +
      c.p.map((p,pi)=>[p,pi,kd[`${b.id}.${gi}.${ci}.${pi}`]]).sort((x,y)=>(x[2]??1.5)-(y[2]??1.5)).map(([p,pi,v])=>`<a class="reco-i" href="#t/${b.id}/${gi}.${ci}.${pi}?${v===0||v===1?"scratch":"brief"}"><span class="dot" style="background:${b.color}"></span>${esc(p)}${v!==undefined&&window.Topic?` <span class="sm">· ${esc(Topic.KNOW[v])}</span>`:""}</a>`).join("") + `</div><div class="btnrow">`; }
  else if(b) html += `<a class="btn" href="#${b.id}">Открыть учебник</a>`;
  html += `<button class="btn" type="button" data-askplan="${esc(ask)}" data-subj="${esc(e.subj)}">План подготовки от учителя</button></div>`;
  return html;
}
function bindPrep(box){ box.querySelectorAll("[data-askplan]").forEach(b=>b.addEventListener("click",()=>{ try{ sessionStorage.setItem("dasha:tutorq", b.dataset.askplan); const s = b.dataset.subj.replace("oge-math","algebra").replace("oge-rus","rus"); sessionStorage.setItem("dasha:tutorsubj", s); }catch(e){} location.hash = "#tutor"; })); }
function ics(e){
  if(!e) return;
  const d = e.date.replace(/-/g,""), t = e.time ? e.time.replace(":","")+"00" : "";
  const nd = iso(new Date(day(e.date).getTime() + 864e5)).replace(/-/g,"");
  const title = `${TYPES[e.type]||"Событие"}: ${subjName(e.subj)}`.replace(/[,;]/g," ");
  const body = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//study//RU","BEGIN:VEVENT",`UID:${e.id}@study`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").slice(0,15)}Z`,
    t ? `DTSTART:${d}T${t}` : `DTSTART;VALUE=DATE:${d}`, t ? `DURATION:PT1H` : `DTEND;VALUE=DATE:${nd}`, `SUMMARY:${title}`, `DESCRIPTION:${(e.note||"Подготовься заранее").replace(/[,;\n]/g," ")}`,
    "BEGIN:VALARM","TRIGGER:-P3D","ACTION:DISPLAY",`DESCRIPTION:Через 3 дня: ${title}`,"END:VALARM","BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY",`DESCRIPTION:Завтра: ${title}`,"END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], {type:"text/calendar"})); a.download = `${e.date}-${e.subj}.ics`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
// уведомление браузера: раз в день о событиях на ближайшие 2 дня
function notify(){
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  upcoming(2).forEach(e=>{ const k = "dasha:ntf:"+e.id+":"+today(); try{ if(localStorage.getItem(k)) return; localStorage.setItem(k,"1"); }catch(_){ return; }
    try{ new Notification(`${TYPES[e.type]||"Событие"} ${when(e.date)}: ${subjName(e.subj)}`, { body: "Открой расписание и нажми «Подготовиться»." }); }catch(_){} });
}
// плашка «Скоро» для главной
function soonPanel(){
  const up = upcoming(7);
  if(!up.length && !importDue()) return "";
  return `<section class="panel soon">${up.length ? `<h3>Скоро</h3>${up.slice(0,4).map(evRow).join("")}` : ""}
    ${importDue() ? `<p class="note warn" style="margin-top:${up.length?12:0}px"><b>Пора прислать скрин оценок за прошлую неделю.</b> <a href="#fill">Открыть заполнялку</a> (+10 очков)</p>` : ""}</section>`;
}

window.Journal = { renderFill, renderDiary, renderSchedule, soonPanel, bindEv, upcoming, importDue, journal, events, notify, when, subjName, TYPES };
})();
