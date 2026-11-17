// Очки, ударный режим, дневник (посещаемость, домашка, контрольные), награды и отчёт папе.
(function(){
const { $, esc, pl, S, keysOf } = window.App;
const CAL = window.CAL;

/* ---------- правила ---------- */
const RULES = {
  start: "2026-11-17",          // с этого дня считаются очки
  school: 3, absent: -5,        // был в школе / прогул (болезнь = 0, не ломает серию)
  hw: 2,                        // за каждый предмет с сделанной домашкой
  paragraph: 4,                 // пройденный параграф
  ogeOk: 2,                     // верно решённое задание ОГЭ
  ogeTest: 10,                  // законченный пробный вариант
  quiz: 15,                     // итоговые вопросы по главе (+5 если без ошибок)
  test:  {"5":20, "4":10, "3":0, "2":-15},               // контрольная
  term:  {"5":80, "4":30, "3":-30, "2":-60},             // итоговая за триместр (2-й и 3-й)
  year:  {"5":120, "4":40, "3":-40, "2":-80},            // годовая
  streakMax: 10,                // бонус за серию: +1 за каждый день серии, не больше 10 в день
  idlePenalty: -10,             // со 2-го дня простоя подряд
  goals: { twoWeeks:180, month:400, quarter:1100, final:2500, program:0.9, ogePart:30 }
};
const REWARDS = {
  twoWeeks: { title:"Вкусняшка с доставкой", hint:"Каждые 2 недели", choices:["Пицца","Суши или роллы","Торт или пирожные","Бабл-ти и десерт","Бургер","Своё"] },
  month:    { title:"Выход на выбор", hint:"Каждый месяц", choices:["Мастер-класс","Верховая езда","Урок вождения","Ресторан на выбор","Каток или скалодром","Своё"] },
  quarter:  { title:"Абонемент", hint:"Каждые 3 месяца", choices:["Танцы","Верховая езда","Бассейн","Йога или фитнес","Своё"] },
  trip:     { title:"Поездка с сопровождением", hint:"Аттестат со средним баллом выше 4,9" },
  laptop:   { title:"Ноутбук", hint:"Аттестат с отличием, 2500 очков, 90% программы и по 30 заданий ОГЭ в каждой части" }
};
const HW_SUBJECTS = GRADE_SUBJECTS.filter(([id])=>!["pe","trud","nat"].includes(id));

/* ---------- даты ---------- */
const day = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayIso = () => iso(new Date());
const addDays = (s, n) => { const d = day(s); d.setDate(d.getDate()+n); return iso(d); };
const isVacation = s => CAL.vacations.some(([a,b])=>s>=a && s<=b);
const isSchoolDay = s => { const w = day(s).getDay(); return w!==0 && w!==6 && !CAL.holidays.includes(s) && !isVacation(s) && s <= CAL.end; };
const DM = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});
const WD = new Intl.DateTimeFormat("ru-RU",{weekday:"long"});

/* ---------- данные ---------- */
const diary = () => Object.assign({days:{}}, Store.get("diary", {}));
const tests = () => Object.assign({list:[]}, Store.get("tests", {}));
const ogeLog = () => Object.assign({a:[]}, Store.get("oge", {}));   // a: [ts, exam, num, ok, part]
const claims = () => Object.assign({c:{}}, Store.get("rewards", {}));

/* ---------- расчёт очков по дням ---------- */
function compute(){
  const D = diary().days, T = tests().list, O = ogeLog().a, done = App.done, g = S.grades().g;
  const today = todayIso(), byDay = {};
  const add = (d, pts, why) => { if(d < RULES.start) return; (byDay[d] = byDay[d] || {pts:0, items:[], active:false}).pts += pts; byDay[d].items.push([why, pts]); };
  const act = d => { (byDay[d] = byDay[d] || {pts:0, items:[], active:false}).active = true; };
  Object.entries(D).forEach(([d, r])=>{
    if(r.school==="present") add(d, RULES.school, "Был(а) в школе");
    if(r.school==="absent") add(d, RULES.absent, "Пропуск без причины");
    const hw = Object.values(r.hw||{}).filter(Boolean).length;
    if(hw){ add(d, hw*RULES.hw, `Домашка: ${pl(hw,"предмет","предмета","предметов")}`); act(d); }
  });
  Object.entries(done).forEach(([k,t])=>{ const ts = Number(t); if(ts > 1e12){ const d = iso(new Date(ts)); add(d, RULES.paragraph, "Параграф"); act(d); } });
  const ogeByDay = {};
  O.forEach(([ts,, , ok])=>{ const d = iso(new Date(ts)); if(ok){ ogeByDay[d] = (ogeByDay[d]||0)+1; } });
  Object.entries(ogeByDay).forEach(([d,n])=>{ add(d, n*RULES.ogeOk, `ОГЭ: ${pl(n,"задание","задания","заданий")}`); if(n>=3) act(d); });
  (Store.get("ogeTests",{list:[]}).list||[]).forEach(t=>{ add(iso(new Date(t.ts)), RULES.ogeTest, "Пробный вариант ОГЭ"); act(iso(new Date(t.ts))); });
  (Store.get("quizzes",{list:[]}).list||[]).forEach(q=>{ const d = iso(new Date(q.ts)); add(d, RULES.quiz + (q.ok===q.n ? 5 : 0), "Итоговые вопросы по главе"); act(d); });
  T.forEach(t=>{ const p = RULES.test[t.mark]; if(p!==undefined) add(t.date, p, `Контрольная (${t.subjName}): ${t.mark}`); });
  const termEnd = { t2: CAL.terms[1][1], t3: CAL.terms[2][1], y: CAL.end };
  GRADE_SUBJECTS.forEach(([id,name])=>{ const r = g[id]||{};
    ["t2","t3"].forEach(t=>{ const p = RULES.term[r[t]]; if(p!==undefined) add(termEnd[t] <= today ? termEnd[t] : today, p, `Итоговая за ${t[1]}-й триместр, ${name}: ${r[t]}`); });
    const p = RULES.year[r.y]; if(p!==undefined) add(termEnd.y <= today ? termEnd.y : today, p, `Годовая, ${name}: ${r.y}`);
  });
  // серия и простои: считаются только учебные дни; выходные, каникулы и болезнь не ломают серию
  let streak = 0, idle = 0, best = 0;
  for(let d = RULES.start; d <= today; d = addDays(d,1)){
    const rec = byDay[d], sick = (D[d]||{}).school === "sick";
    if(rec && rec.active){ streak++; idle = 0; best = Math.max(best, streak); const bonus = Math.min(streak, RULES.streakMax); add(d, bonus, `Серия: ${pl(streak,"день","дня","дней")} подряд`); continue; }
    if(d === today || !isSchoolDay(d) || sick) continue;
    idle++;
    if(idle >= 2){ streak = 0; add(d, RULES.idlePenalty, "Простой: ни одного занятия"); }
  }
  const total = Object.values(byDay).reduce((a,r)=>a+r.pts, 0);
  const todayActive = !!(byDay[today] && byDay[today].active);
  const state = todayActive ? "hot" : idle === 0 ? "wait" : idle === 1 ? "cool" : "out";
  return { byDay, total, streak, best, idle, state, todayActive };
}
const sumRange = (byDay, a, b) => Object.entries(byDay).filter(([d])=>d>=a && d<=b).reduce((s,[,r])=>s+r.pts, 0);

/* периоды наград */
function periods(c){
  const today = todayIso(), out = [];
  // 2 недели от старта
  for(let a = RULES.start, i = 1; a <= today; a = addDays(a,14), i++){ const b = addDays(a,13); out.push({kind:"twoWeeks", id:`2w-${i}`, a, b, label:`${DM.format(day(a))} – ${DM.format(day(b))}`, goal:RULES.goals.twoWeeks}); }
  // месяцы, начиная с декабря
  for(let y = 2026, m = 11; ; m++){ if(m===12){ m=0; y++; } const a = iso(new Date(y,m,1)); if(a > today || a > "2027-06-30") break; const b = iso(new Date(y,m+1,0));
    out.push({kind:"month", id:`m-${a.slice(0,7)}`, a, b, label:new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(day(a)), goal:RULES.goals.month}); }
  [["2026-12-01","2027-02-28","декабрь – февраль"],["2027-03-01","2027-05-31","март – май"]].forEach(([a,b,l],i)=>{ if(a<=today) out.push({kind:"quarter", id:`q-${i+1}`, a, b, label:l, goal:RULES.goals.quarter}); });
  return out.map(p=>Object.assign(p, { pts: sumRange(c.byDay, p.a, p.b), over: p.b < today }));
}
function ogeParts(){
  const O = ogeLog().a, cnt = {"math1":0, "math2":0, "rus":0};
  O.forEach(([, exam, num, ok])=>{ if(!ok) return; if(exam==="math") cnt[num>=20?"math2":"math1"]++; else cnt.rus++; });
  return cnt;
}
function programShare(){ const all = BOOKS.flatMap(keysOf); return all.length ? all.filter(k=>App.done[k]).length / all.length : 0; }
function yearAvg(){ const g = S.grades().g; const v = GRADE_SUBJECTS.map(([id])=>Number((g[id]||{}).y)).filter(x=>x>=2); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }

/* ---------- полоса сверху ---------- */
const STATE_TXT = { hot:"Серия горит", wait:"Позанимайся сегодня, чтобы серия не остыла", cool:"Серия остывает: вчера не было занятий", out:"Серия погасла. Со 2-го дня простоя снимаются очки" };
function renderBar(){
  const el = $("streakbar"); if(!el) return;
  if(Store.mode==="cloud" && !Store.user){ el.hidden = true; return; }
  const c = compute(), ps = periods(c), cur2w = ps.filter(p=>p.kind==="twoWeeks").pop();
  el.hidden = false;
  el.className = "streakbar st-" + c.state;
  el.innerHTML = `<a href="#rewards" class="sb-fire" aria-label="${STATE_TXT[c.state]}"><span class="flame" aria-hidden="true"></span><b>${c.state==="out"?0:c.streak}</b><span class="sm">${c.state==="out"?"серия погасла":pl(c.streak,"день","дня","дней")+" подряд"}</span></a>
    <a href="#rewards" class="sb-pts"><b>${c.total}</b><span class="sm">очков</span></a>
    ${cur2w?`<a href="#rewards" class="sb-next"><span class="sm">До вкусняшки: ${Math.max(0, cur2w.goal - cur2w.pts)} очков до ${DM.format(day(cur2w.b))}</span><span class="bar"><i style="width:${Math.min(100, Math.round(100*cur2w.pts/cur2w.goal))}%"></i></span></a>`:""}
    <span class="sb-state sm">${STATE_TXT[c.state]}</span>
    <a href="#diary" class="btn sb-diary">Дневник за сегодня</a>`;
}

/* ---------- дневник ---------- */
const dayLine = rec => `За этот день: <b>${rec?rec.pts:0}</b> очков${rec&&rec.active?" · день засчитан в серию":" · чтобы день засчитался в серию, сделай домашку, параграф или 3 задания ОГЭ"}.`;
function renderDiary(){
  const today = todayIso();
  let sel = sessionStorage.getItem("dasha:diaryday") || today; if(sel > today) sel = today;
  const D = diary(), r = D.days[sel] || {school:"", hw:{}};
  const days7 = []; for(let i=6;i>=0;i--) days7.push(addDays(today,-i));
  const T = tests().list.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const c = compute(), rec = c.byDay[sel];
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Дневник</h2><p class="hint" style="margin:6px 0 12px">Отмечай каждый день: была ли в школе и какие домашки сделаны. Так копятся очки и не гаснет серия.</p>
    <div class="daypick">${days7.map(d=>`<button type="button" class="vbtn ${d===sel?"on":""}" data-day="${d}" aria-pressed="${d===sel}">${d===today?"Сегодня":new Intl.DateTimeFormat("ru-RU",{weekday:"short",day:"numeric"}).format(day(d))}</button>`).join("")}</div>
    <h3 style="margin-top:16px">${WD.format(day(sel))}, ${DM.format(day(sel))}${isSchoolDay(sel)?"":" · выходной или каникулы"}</h3>
    <div class="seg" role="radiogroup" aria-label="Посещаемость">
      ${[["present","Была в школе"],["sick","Болела / по уважительной"],["absent","Пропуск"],["","Не отмечено"]].map(([v,t])=>`<button type="button" role="radio" class="vbtn" data-school="${v}" aria-checked="${(r.school||"")===v}" aria-pressed="${(r.school||"")===v}">${t}</button>`).join("")}
    </div>
    <h3 style="margin-top:18px">Домашка сделана</h3>
    <div class="hwgrid">${HW_SUBJECTS.map(([id,n])=>`<label class="hw"><input type="checkbox" data-hw="${id}" ${r.hw && r.hw[id]?"checked":""}> ${esc(n)}</label>`).join("")}</div>
    <p class="hint" id="daypts">${dayLine(rec)}</p>
  </section>
  <section class="panel"><h3>Контрольные и самостоятельные</h3>
    <form id="testform" class="chatrow">
      <select id="tsubj" aria-label="Предмет">${GRADE_SUBJECTS.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}</select>
      <select id="tmark" aria-label="Оценка"><option>5</option><option>4</option><option>3</option><option>2</option></select>
      <input type="date" id="tdate" value="${today}" max="${today}" aria-label="Дата" class="pgin" style="width:auto">
      <button class="btn primary" type="submit">Добавить оценку</button>
    </form>
    <p class="hint">Пятёрка за контрольную даёт +20 очков, четвёрка +10, тройка 0, двойка −15. Итоговые оценки за триместр весят больше всего: их можно поставить на главной.</p>
    <div class="tlist">${T.length ? T.slice(0,30).map((t,i)=>`<div class="trow"><span>${DM.format(day(t.date))}</span><span>${esc(t.subjName)}</span><b class="mk m${t.mark}">${t.mark}</b><button class="pg" type="button" data-tdel="${t.id}" aria-label="Удалить">✕</button></div>`).join("") : `<p class="hint">Пока нет оценок за контрольные.</p>`}</div>
  </section></div>`;
  const main = $("main");
  main.querySelectorAll("[data-day]").forEach(b=>b.addEventListener("click",()=>{ sessionStorage.setItem("dasha:diaryday", b.dataset.day); renderDiary(); }));
  const upd = fn => { const d = diary(); d.days = Object.assign({}, d.days); const cur = Object.assign({school:"", hw:{}}, d.days[sel]); cur.hw = Object.assign({}, cur.hw); fn(cur); d.days[sel] = cur; Store.set("diary", d); renderBar(); };
  main.querySelectorAll("[data-school]").forEach(b=>b.addEventListener("click",()=>{ upd(cur=>cur.school = b.dataset.school); renderDiary(); }));
  main.querySelectorAll("[data-hw]").forEach(cb=>cb.addEventListener("change",()=>{ upd(cur=>{ if(cb.checked) cur.hw[cb.dataset.hw] = true; else delete cur.hw[cb.dataset.hw]; }); $("daypts").innerHTML = dayLine(compute().byDay[sel]); }));
  $("testform").addEventListener("submit", e=>{ e.preventDefault(); const t = tests(); t.list = t.list.slice();
    const id = $("tsubj").value; t.list.push({ id:"t"+Date.now(), subj:id, subjName:(GRADE_SUBJECTS.find(x=>x[0]===id)||[])[1], mark:$("tmark").value, date:$("tdate").value||today });
    Store.set("tests", t, 0); renderBar(); renderDiary(); });
  main.querySelectorAll("[data-tdel]").forEach(b=>b.addEventListener("click",()=>{ const t = tests(); t.list = t.list.filter(x=>x.id!==b.dataset.tdel); Store.set("tests", t, 0); renderBar(); renderDiary(); }));
}

/* ---------- награды ---------- */
function renderRewards(){
  const c = compute(), ps = periods(c), cl = claims().c, parts = ogeParts(), prog = programShare(), avg = yearAvg();
  const card = p => { const ok = p.pts >= p.goal, r = REWARDS[p.kind], got = cl[p.id];
    return `<div class="rw ${ok?"ok":""} ${p.over&&!ok?"miss":""}">
      <div class="rw-top"><b>${esc(r.title)}</b><span class="sm">${esc(p.label)}</span></div>
      <div class="bar"><i style="width:${Math.min(100,Math.round(100*p.pts/p.goal))}%"></i></div>
      <span class="sm">${p.pts} из ${p.goal} очков${ok?" · получено!":p.over?" · период закончился":""}</span>
      ${ok ? (got ? `<span class="chip ok">Выбрано: ${esc(got)}</span>` : `<div class="chatrow"><select data-choice="${p.id}" aria-label="Что выбрать">${r.choices.map(x=>`<option>${esc(x)}</option>`).join("")}</select><button class="btn primary" type="button" data-claim="${p.id}">Выбрать награду</button></div>`) : ""}
    </div>`; };
  const goalRow = (label, cur, goal, fmt) => `<div class="subjrow" style="--c:var(--accent)"><span>${label}</span><div class="bar"><i style="width:${Math.min(100,Math.round(100*cur/goal))}%"></i></div><span>${fmt||cur+"/"+goal}</span></div>`;
  const by = k => ps.filter(p=>p.kind===k).reverse();
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Награды</h2>
    <div class="statnums" style="margin-top:12px">
      <div class="count"><div class="big">${c.total}</div><div class="lbl">очков всего</div><div class="sm">считаются с ${DM.format(day(RULES.start))}</div></div>
      <div class="count"><div class="big">${c.state==="out"?0:c.streak}</div><div class="lbl">дней серия</div><div class="sm">лучшая: ${c.best}</div></div>
    </div></section>
  <section class="panel"><h3>Главная цель: ноутбук</h3>
    <div class="subjrows">
      ${goalRow("Очки", c.total, RULES.goals.final)}
      ${goalRow("Пройдено программы", Math.round(prog*100), 90, Math.round(prog*100)+"%")}
      ${goalRow("ОГЭ математика, часть 1", parts.math1, RULES.goals.ogePart)}
      ${goalRow("ОГЭ математика, часть 2", parts.math2, RULES.goals.ogePart)}
      ${goalRow("ОГЭ русский, тестовая часть", parts.rus, RULES.goals.ogePart)}
      ${goalRow("Годовые оценки", avg ? Math.round(avg*100) : 0, 500, avg ? avg.toFixed(2).replace(".",",") : "—")}
    </div>
    <p class="hint">Ноутбук: аттестат с отличием (все пятёрки), ${RULES.goals.final} очков, 90% программы и по ${RULES.goals.ogePart} верных заданий ОГЭ в каждой части. Поездка с сопровождением: средний балл аттестата выше 4,9.</p>
  </section>
  <section class="panel"><h3>Каждые 2 недели: вкусняшка с доставкой</h3><div class="rwgrid">${by("twoWeeks").map(card).join("")}</div></section>
  <section class="panel"><h3>Каждый месяц: выход на выбор</h3><div class="rwgrid">${by("month").length ? by("month").map(card).join("") : `<p class="hint">Первый месяц начнётся 1 декабря.</p>`}</div></section>
  <section class="panel"><h3>Каждые 3 месяца: абонемент</h3><div class="rwgrid">${by("quarter").length ? by("quarter").map(card).join("") : `<p class="hint">Первый период: декабрь – февраль.</p>`}</div></section>
  <section class="panel"><h3>Как начисляются очки</h3><div class="rules">
    <p>Была в школе: +${RULES.school}. Пропуск без причины: ${RULES.absent}. Болезнь не снимает очки и не ломает серию.</p>
    <p>Домашка: +${RULES.hw} за каждый предмет. Пройденный параграф: +${RULES.paragraph}. Верное задание ОГЭ: +${RULES.ogeOk}. Пробный вариант ОГЭ: +${RULES.ogeTest}. Итоговые вопросы по главе: +${RULES.quiz}, без ошибок ещё +5.</p>
    <p>Контрольная: 5 → +20, 4 → +10, 3 → 0, 2 → −15. Итоговая за триместр: 5 → +80, 4 → +30, 3 → −30. Годовая: 5 → +120, 4 → +40, 3 → −40.</p>
    <p>Серия: день засчитывается, если сделана домашка, параграф, итоговые вопросы по главе или 3 задания ОГЭ. Каждый день серии даёт бонус +1, +2 … до +${RULES.streakMax}. Выходные и каникулы серию не ломают.</p>
    <p>Если в учебный день не было занятий, серия <b>остывает</b>. На второй день простоя она <b>гаснет</b>, и начиная с этого дня за каждый пустой учебный день снимается ${-RULES.idlePenalty} очков.</p>
  </div></section></div>`;
  $("main").querySelectorAll("[data-claim]").forEach(b=>b.addEventListener("click",()=>{ const id = b.dataset.claim, v = $("main").querySelector(`[data-choice="${id}"]`).value;
    const r = claims(); r.c = Object.assign({}, r.c, {[id]: v}); Store.set("rewards", r, 0); renderRewards(); }));
}

/* ---------- отчёт папе ---------- */
function reportData(){
  const c = compute(), g = S.grades().g, parts = ogeParts(), prog = programShare();
  const last = t => GRADE_SUBJECTS.map(([id,n])=>[n, (g[id]||{})[t]]).filter(x=>x[1]);
  const T = tests().list.slice(-10);
  const week = Object.entries(c.byDay).filter(([d])=>d >= addDays(todayIso(),-6)).reduce((a,[,r])=>a+r.pts,0);
  const books = BOOKS.map(b=>{ const k = keysOf(b); return [b.subject, Math.round(100*k.filter(x=>App.done[x]).length/k.length)]; });
  return { c, g, parts, prog, last, T, week, books };
}
function localReport(){
  const { c, parts, prog, last, T, week, books } = reportData();
  const t1 = last("t1"), t2 = last("t2"), cur = t2.length ? t2 : t1;
  const fives = cur.filter(x=>x[1]==="5").map(x=>x[0]), fours = cur.filter(x=>x[1]==="4").map(x=>x[0]), low = cur.filter(x=>x[1]==="3"||x[1]==="2").map(x=>x[0]);
  const lines = [];
  lines.push("Здравствуйте! Это учитель Клод с коротким отчётом о Дашиных успехах.");
  if(fives.length) lines.push(`Отличные результаты по предметам: ${fives.join(", ")}. Это настоящая заслуга, Даша молодец.`);
  if(fours.length) lines.push(`Уверенные четвёрки: ${fours.join(", ")}. До пятёрки здесь совсем немного.`);
  const tGood = T.filter(t=>t.mark==="5");
  if(tGood.length) lines.push(`Недавние пятёрки за контрольные: ${tGood.map(t=>t.subjName).join(", ")}.`);
  lines.push(`За последнюю неделю набрано ${week} очков, всего ${c.total}. ${c.streak>1?`Сейчас идёт серия ${pl(c.streak,"день","дня","дней")} подряд без пропусков.`:""}`);
  const goodBooks = books.filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]);
  if(goodBooks.length) lines.push(`По учебникам: ${goodBooks.map(b=>`${b[0]} ${b[1]}%`).join(", ")}.`);
  if(parts.math1+parts.math2+parts.rus) lines.push(`Подготовка к ОГЭ: решено верно ${parts.math1+parts.math2} заданий по математике и ${parts.rus} по русскому.`);
  if(low.length) lines.push(`Где можно бережно помочь: ${low.join(", ")}. Здесь хорошо бы чуть больше практики и, может быть, спокойно разобрать вместе одну-две темы. Ругать точно не нужно: Даша старается, и поддержка сейчас сработает лучше всего.`);
  else if(fours.length) lines.push(`Чтобы выйти на аттестат с отличием, стоит чуть подтянуть: ${fours.join(", ")}. Хватит регулярных коротких занятий.`);
  if(c.state==="cool"||c.state==="out") lines.push("В последние дни занятий было меньше, чем обычно. Мягкое напоминание и интерес к её делам помогут вернуться в ритм.");
  lines.push(`Пройдено ${Math.round(prog*100)}% программы. Спасибо, что поддерживаете Дашу!`);
  return lines.join("\n\n");
}
function openReport(){
  const ov = document.createElement("div"); ov.className = "av-overlay";
  ov.innerHTML = `<div class="av-sheet report"><div class="av-sheet-lines"></div><h2 style="position:relative;margin:0">Отчёт для папы</h2><textarea id="reptext" class="reptext" aria-label="Текст отчёта">Пишу отчёт…</textarea>
    <div class="chatrow" style="position:relative"><button class="btn primary" type="button" id="repcopy">Скопировать</button><a class="btn" id="reptg" target="_blank" rel="noopener">Отправить в Telegram</a><a class="btn" id="repwa" target="_blank" rel="noopener">WhatsApp</a><button class="btn" type="button" id="repclose">Закрыть</button></div>
    <p class="hint" id="repnote" style="position:relative"></p></div><div class="av-host"></div>`;
  document.body.appendChild(ov);
  const a = Avatar.create(ov.querySelector(".av-host")); a.setMood("think"); a.say("Сейчас всё расскажу…");
  const set = txt => { $("reptext").value = txt; const u = encodeURIComponent(txt); $("reptg").href = `https://t.me/share/url?url=%20&text=${u}`; $("repwa").href = `https://wa.me/?text=${u}`; };
  const close = () => { a.destroy(); ov.remove(); };
  $("repclose").addEventListener("click", close);
  $("repcopy").addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText($("reptext").value); $("repnote").textContent = "Скопировано."; }catch(e){ $("reptext").select(); $("repnote").textContent = "Выдели текст и скопируй вручную."; } });
  $("reptext").addEventListener("input", ()=>set($("reptext").value));
  (async()=>{
    let txt = localReport();
    if(Store.aiAvailable()){
      try{ const { c, parts, prog, T, week, books } = reportData();
        const r = await Store.ask({ mode:"report", subject:"", messages:[{role:"user", content: JSON.stringify({ grades: S.grades().g, tests: T, points: c.total, week, streak: c.streak, streakState: c.state, books, oge: parts, program: Math.round(prog*100) })}] });
        if(r && r.text) txt = r.text; }catch(e){ $("repnote").textContent = "ИИ-учитель сейчас недоступен, поэтому отчёт составлен автоматически."; }
    }
    set(txt); a.setMood("smile"); a.say("Готово! Можно отправлять", 4000);
  })();
}

window.Points = { compute, renderBar, renderDiary, renderRewards, openReport, ogeLog, logOge(exam, num, ok){ const o = ogeLog(); o.a = o.a.concat([[Date.now(), exam, num, ok ? 1 : 0]]); Store.set("oge", o, 1500); renderBar(); } };
})();
