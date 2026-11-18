// Очки, ударный режим, дневник (посещаемость, домашка, контрольные), награды и отчёт папе.
(function(){
const { $, esc, pl, S, keysOf } = window.App;
const CAL = window.CAL;

/* ---------- правила ---------- */
const RULES = {
  start: "2026-11-17",          // с этого дня считаются очки
  journalStart: "2026-11-09",   // оценки и Н из заполнялки считаются с прошлой недели
  absent: -5,                   // день с Н без причины (из заполнялки; Б и УП не снимают)
  cur: {"5":5, "4":2, "3":-3, "2":-8},                   // текущие оценки из заполнялки
  weekly: 10,                   // прислала скрин оценок за неделю
  hw: 2,                        // сделанное задание из учебника
  hwOther: 4,                   // своё задание: доклад, проект, задача
  paragraph: 4,                 // пройденный параграф
  ogeOk: 2,                     // верно решённое задание ОГЭ
  ogeTest: 10,                  // законченный пробный вариант
  quiz: 15,                     // итоговые вопросы по главе (+5 если без ошибок)
  test:  {"5":20, "4":10, "3":0, "2":-15},               // контрольная
  term:  {"5":80, "4":30, "3":-30, "2":-60},             // итоговая за триместр (2-й и 3-й)
  year:  {"5":120, "4":40, "3":-40, "2":-80},            // годовая
  streakMax: 10,                // бонус за серию: +1 за каждый день серии, не больше 10 в день
  idlePenalty: -10,             // со 2-го дня простоя подряд
  goals: { twoWeeks:180, month:400, quarter:1100, final:2500, program:0.9, ogePart:30, ogeTask:30, termAvg:4.9 }
};
const REWARDS = {
  twoWeeks: { title:"Подписка на фильмы и сериалы", hint:"Каждые 2 недели", choices:["Кинопоиск","Okko","Иви","Wink","Start","Premier","Своё"] },
  month:    { title:"Выход на выбор", hint:"Каждый месяц", choices:["Мастер-класс","Верховая езда","Урок вождения","Ресторан на выбор","Каток или скалодром","Своё"] },
  quarter:  { title:"Абонемент", hint:"Каждый триместр, если средний балл выше 4,9", choices:["Танцы","Верховая езда","Бассейн","Йога или фитнес","Своё"] },
  dress:    { title:"Платье на выпускной", hint:"Средний балл аттестата выше 4,9" },
  laptop:   { title:"Ноутбук", hint:"Аттестат с отличием, 2500 очков, 90% программы и у каждого задания ОГЭ 30 верных из 33 последних" }
};
/* свои награды и требования: Store "rewardsCfg" поверх стандартных; дата последнего изменения в ts */
const DEF_CFG = {
  twoWeeks: { title:REWARDS.twoWeeks.title, choices:REWARDS.twoWeeks.choices, goal:RULES.goals.twoWeeks },
  month:    { title:REWARDS.month.title, choices:REWARDS.month.choices, goal:RULES.goals.month },
  quarter:  { title:REWARDS.quarter.title, choices:REWARDS.quarter.choices, goal:RULES.goals.termAvg },
  dress:    { title:REWARDS.dress.title, goal:4.9 },
  laptop:   { title:REWARDS.laptop.title, goal:RULES.goals.final, program:90, ogeTask:RULES.goals.ogeTask }
};
function rcfg(){ const s = Store.get("rewardsCfg", {}) || {}, out = { ts:s.ts||0 };
  Object.keys(DEF_CFG).forEach(k=>{ out[k] = Object.assign({}, DEF_CFG[k], s[k]||{}); }); return out; }
function applyCfg(){ const c = rcfg();
  ["twoWeeks","month","quarter","dress","laptop"].forEach(k=>{ REWARDS[k].title = c[k].title; if(c[k].choices) REWARDS[k].choices = c[k].choices; });
  RULES.goals.twoWeeks = +c.twoWeeks.goal || DEF_CFG.twoWeeks.goal; RULES.goals.month = +c.month.goal || DEF_CFG.month.goal;
  RULES.goals.termAvg = +c.quarter.goal || DEF_CFG.quarter.goal; RULES.goals.dressAvg = +c.dress.goal || 4.9;
  RULES.goals.final = +c.laptop.goal || DEF_CFG.laptop.goal; RULES.goals.program = (+c.laptop.program || 90)/100; RULES.goals.ogeTask = +c.laptop.ogeTask || 30;
  return c; }
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
// src (необязательно): данные другого пользователя для админки { get(key, def) }
function compute(src){
  const G = src ? src.get : (k, d) => Store.get(k, d);
  const O = Object.assign({a:[]}, G("oge", {})).a, done = src ? (G("progress", {}) || {}).done || {} : App.done, g = src ? (G("grades", null) || {g:{}}).g : S.grades().g;
  const J = Object.assign({grades:[], abs:[], imports:[], hw:[]}, G("journal", {})), A = Object.assign({d:{}}, G("act", {})).d;
  const today = todayIso(), byDay = {};
  const add = (d, pts, why, early) => { if(d < (early ? RULES.journalStart : RULES.start)) return; (byDay[d] = byDay[d] || {pts:0, items:[], active:false}).pts += pts; byDay[d].items.push([why, pts]); };
  const act = d => { (byDay[d] = byDay[d] || {pts:0, items:[], active:false}).active = true; };
  (J.hw||[]).forEach(h=>{ if(!h.done) return; const d = iso(new Date(h.done)); add(d, h.kind==="other" ? RULES.hwOther : RULES.hw, `Домашка: ${(GRADE_SUBJECTS.find(x=>x[0]===h.subj)||[,h.subj])[1]}`); act(d); });
  Object.entries(done).forEach(([k,t])=>{ const ts = Number(t); if(ts > 1e12){ const d = iso(new Date(ts)); add(d, RULES.paragraph, "Параграф"); act(d); } });
  const ogeByDay = {};
  O.forEach(([ts,, , ok])=>{ const d = iso(new Date(ts)); if(ok){ ogeByDay[d] = (ogeByDay[d]||0)+1; } });
  Object.entries(ogeByDay).forEach(([d,n])=>{ add(d, n*RULES.ogeOk, `ОГЭ: ${pl(n,"задание","задания","заданий")}`); if(n>=3) act(d); });
  (G("ogeTests",{list:[]}).list||[]).filter(t=>!t.pending).forEach(t=>{ add(iso(new Date(t.ts)), RULES.ogeTest, "Пробный вариант ОГЭ"); act(iso(new Date(t.ts))); });
  (G("quizzes",{list:[]}).list||[]).forEach(q=>{ const d = iso(new Date(q.ts)); add(d, RULES.quiz + (q.ok===q.n ? 5 : 0), "Итоговые вопросы по главе"); act(d); });
  const sn = id => (GRADE_SUBJECTS.find(x=>x[0]===id)||[,id])[1];
  (J.grades||[]).forEach(x=>{ const tbl = x.kind==="test" ? RULES.test : x.kind==="current" ? RULES.cur : null; if(!tbl) return; const p = tbl[x.mark]; if(p!==undefined) add(x.date, p, `${x.kind==="test"?"Контрольная":"Оценка"} (${sn(x.subj)}): ${x.mark}`, true); });
  [...new Set((J.abs||[]).filter(a=>a.reason==="absent").map(a=>a.date))].forEach(d=>add(d, RULES.absent, "Пропуск без причины (Н)", true));
  const weeks = new Set(); (J.imports||[]).forEach(im=>{ const d = new Date(im.ts), w = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay()+6)%7))); if(!weeks.has(w)){ weeks.add(w); add(iso(d), RULES.weekly, "Прислала оценки за неделю"); } });
  Object.entries(A).forEach(([d,n])=>{ if(n>=2) act(d); });
  const termEnd = { t2: CAL.terms[1][1], t3: CAL.terms[2][1], y: CAL.end };
  GRADE_SUBJECTS.forEach(([id,name])=>{ const r = g[id]||{};
    ["t2","t3"].forEach(t=>{ const p = RULES.term[r[t]]; if(p!==undefined) add(termEnd[t] <= today ? termEnd[t] : today, p, `Итоговая за ${t[1]}-й триместр, ${name}: ${r[t]}`); });
    const p = RULES.year[r.y]; if(p!==undefined) add(termEnd.y <= today ? termEnd.y : today, p, `Годовая, ${name}: ${r.y}`);
  });
  // серия и простои: считаются только учебные дни; выходные, каникулы и болезнь не ломают серию
  let streak = 0, idle = 0, best = 0;
  for(let d = RULES.start; d <= today; d = addDays(d,1)){
    const rec = byDay[d], sick = (J.abs||[]).some(a=>a.date===d && a.reason!=="absent" && !a.subj);
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
const fmtAvg = v => v===null||v===undefined ? "—" : v.toFixed(2).replace(".",",");
const sumRange = (byDay, a, b) => Object.entries(byDay).filter(([d])=>d>=a && d<=b).reduce((s,[,r])=>s+r.pts, 0);

/* периоды наград */
function periods(c, all){
  applyCfg();
  const today = todayIso(), out = [], lim = all ? CAL.end : today;
  // 2 недели от старта
  for(let a = RULES.start, i = 1; a <= lim; a = addDays(a,14), i++){ const b = addDays(a,13); out.push({kind:"twoWeeks", id:`2w-${i}`, a, b, label:`${DM.format(day(a))} – ${DM.format(day(b))}`, goal:RULES.goals.twoWeeks}); }
  // месяцы, начиная с декабря
  for(let y = 2026, m = 11; ; m++){ if(m===12){ m=0; y++; } const a = iso(new Date(y,m,1)); if(a > lim || a > "2027-06-30") break; const b = iso(new Date(y,m+1,0));
    out.push({kind:"month", id:`m-${a.slice(0,7)}`, a, b, label:new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(day(a)), goal:RULES.goals.month}); }
  // триместры: абонемент, если средний балл за триместр выше 4,9
  const g = S.grades().g;
  [[1,"t2"],[2,"t3"]].forEach(([i,t])=>{ const [a,b,l] = CAL.terms[i]; if(a<=lim){ const v = GRADE_SUBJECTS.map(([id])=>Number((g[id]||{})[t])).filter(x=>x>=2), av = v.length ? v.reduce((x,y)=>x+y,0)/v.length : null;
    out.push({kind:"quarter", id:`tr-${i+1}`, a, b, label:l, goal:RULES.goals.termAvg, avg:av, byAvg:true}); } });
  return out.map(p=>Object.assign(p, { pts: sumRange(c.byDay, p.a, p.b), over: p.b < today, future: p.a > today }, p.byAvg ? { ok: p.avg!==null && p.avg > p.goal, over: p.b < today && p.avg!==null } : { ok: sumRange(c.byDay, p.a, p.b) >= p.goal }));
}
function ogeParts(){
  const O = ogeLog().a, cnt = {"math1":0, "math2":0, "rus":0};
  O.forEach(([, exam, num, ok])=>{ if(!ok) return; if(exam==="math") cnt[num>=20?"math2":"math1"]++; else cnt.rus++; });
  return cnt;
}
// сколько раз верно решено каждое задание ОГЭ: { math:{1:n,…,25:n}, rus:{1:n,…,9:n} }
const OGE_N = { math:25, rus:13 };
// последние 33 решения каждого задания (1 — верно, 0 — ошибка), из тренировок, практики и пробных
const OGE_WIN = 33;
function ogeLast(){
  const out = { math:{}, rus:{} }; Object.entries(OGE_N).forEach(([e,n])=>{ for(let i=1;i<=n;i++) out[e][i] = []; });
  ogeLog().a.forEach(([, exam, num, ok])=>{ const l = out[exam] && out[exam][num]; if(l) l.push(ok ? 1 : 0); });
  Object.values(out).forEach(o=>Object.keys(o).forEach(k=>o[k] = o[k].slice(-OGE_WIN)));
  return out;
}
// верных среди последних 33: цель на ноутбук — не меньше 30 у каждого задания
function ogeCounts(){ const L = ogeLast(), out = { math:{}, rus:{} }; Object.keys(L).forEach(e=>Object.entries(L[e]).forEach(([k,a])=>out[e][k] = a.reduce((x,y)=>x+y,0))); return out; }
// заработанные бонусы: каждый выполненный период превращается в квадратик в кабинете
function squares(){
  const c = compute(), used = Object.assign({u:{}}, Store.get("bonuses", {})).u;
  return periods(c, true).map(p=>{ const ok = p.ok, u = used[p.id] || null;
    return { id:p.id, kind:p.kind, title:REWARDS[p.kind].title, choices:REWARDS[p.kind].choices||[], label:p.label, pts:p.pts, goal:p.goal, avg:p.avg, byAvg:p.byAvg, used:u, state: p.future ? "fut" : ok ? (u ? "used" : "avail") : p.over ? "miss" : "now" }; });
}
function bonuses(){
  const c = compute(), used = Object.assign({u:{}}, Store.get("bonuses", {})).u;
  return periods(c).filter(p=>p.ok).map(p=>({ id:p.id, kind:p.kind, title:REWARDS[p.kind].title, choices:REWARDS[p.kind].choices||[], label:p.label, used: used[p.id] || null }));
}
function programShare(){ const all = BOOKS.flatMap(keysOf); return all.length ? all.filter(k=>App.done[k]).length / all.length : 0; }
function yearAvg(){ const g = S.grades().g; const v = GRADE_SUBJECTS.map(([id])=>Number((g[id]||{}).y)).filter(x=>x>=2); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }

/* ---------- ударный режим: окошко из 7 дней (3 прошедших, сегодня, 3 следующих) ----------
   Номера на кружках — дни серии. Огонёк — день засчитан. Тусклый — серия не сломалась (выходной, каникулы, болезнь, первый день простоя).
   Пустой — день пропущен. Сегодня — с обводкой. Впереди — номера, до которых дорастёт серия. */
const FLAME = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4 2-5.8.9 1.6 1.6 2.3 2.6 2.8C11 7.6 10.9 5 12 2z" fill="currentColor"/><path d="M12 13c.6 1.6 2.4 2.3 2.4 4.3a2.4 2.4 0 0 1-4.8 0c0-1 .5-1.6.9-2.3.4.6.7.8 1.1 1-.1-1.1-.1-2 .4-3z" fill="#fff6c2"/></svg>`;
function streakDays(c){
  const J = Object.assign({abs:[]}, Store.get("journal", {})), today = todayIso(), map = {};
  let n = 0, idle = 0;
  for(let d = RULES.start; d <= today; d = addDays(d, 1)){
    const rec = c.byDay[d], sick = (J.abs||[]).some(a=>a.date===d && a.reason!=="absent" && !a.subj);
    if(rec && rec.active){ n++; idle = 0; map[d] = { st:"fire", n }; }
    else if(d === today) map[d] = { st:"today", n:n+1 };
    else if(!isSchoolDay(d) || sick) map[d] = { st:"rest" };
    else { idle++; if(idle === 1) map[d] = { st:"cool" }; else { map[d] = { st:"miss" }; n = 0; } }
  }
  return map;
}
function streakStrip(c){
  const today = todayIso(), map = streakDays(c), cur = c.state==="out" ? 0 : c.streak;
  const cells = []; let next = (map[today] && map[today].st==="fire") ? map[today].n : cur;
  for(let k=-3; k<=3; k++){
    const d = addDays(today, k), wd = new Intl.DateTimeFormat("ru-RU",{weekday:"short"}).format(day(d));
    let m = map[d];
    if(k > 0){ if(isSchoolDay(d)){ next++; m = { st:"future", n:next }; } else m = { st:"futrest" }; }
    if(!m) m = { st:"none" };
    const TT = { fire:`день ${m.n} серии`, today:"сегодня: позанимайся, чтобы зажечь огонёк", rest:"выходной: серия не ломается", cool:"пропуск: серия остыла", miss:"пропуск: серия погасла", future:`будет день ${m.n}`, futrest:"выходной", none:"" }[m.st];
    const inner = m.st==="fire" ? FLAME : m.st==="rest"||m.st==="futrest" ? "·" : m.st==="cool" ? FLAME : m.n ? m.n : "";
    cells.push(`<span class="sk sk-${m.st}${k===0?" sk-now":""}" title="${DM.format(day(d))}: ${TT}"><i>${inner}</i><span class="sk-d">${m.st==="fire" ? m.n : wd}</span></span>`);
  }
  const done = map[today] && map[today].st==="fire";
  return `<div class="skbox"><div class="skhead"><span class="skt"><span class="skf">${FLAME}</span>${cur} ${pl(cur,"день","дня","дней").split(" ").pop()} подряд</span>${c.best>1?`<span class="sm">рекорд ${c.best}</span>`:""}</div>
    <div class="skrow">${cells.join("")}</div>
    <p class="sm skmsg">${done ? "Сегодня огонёк горит! Так держать." : c.state==="cool" ? "Вчера без занятий, серия остывает. Позанимайся сегодня, чтобы её спасти." : c.state==="out" ? "Серия погасла. Позанимайся сегодня, и начнётся новая." : "Чтобы зажечь огонёк: домашка, параграф, вопросы по главе, учитель или 3 задания ОГЭ."}</p></div>`;
}

/* ---------- полоса сверху ---------- */
const STATE_TXT = { hot:"Серия горит", wait:"Позанимайся сегодня, чтобы серия не остыла", cool:"Серия остывает: вчера не было занятий", out:"Серия погасла. Со 2-го дня простоя снимаются очки" };
function renderBar(){
  const el = $("streakbar"); if(!el) return;
  if(Store.mode==="cloud" && !Store.user){ el.hidden = true; return; }
  const c = compute(), ps = periods(c), cur2w = ps.filter(p=>p.kind==="twoWeeks").pop();
  el.hidden = false;
  el.className = "streakbar st-" + c.state;
  el.innerHTML = `<a href="#rewards" class="sb-streak" aria-label="${STATE_TXT[c.state]}">${streakStrip(c)}</a>
    <div class="sb-side"><a href="#rewards" class="sb-pts"><b>${c.total}</b><span class="sm">очков</span></a>
    ${cur2w?`<a href="#rewards" class="sb-next"><span class="sm">${esc(REWARDS.twoWeeks.title)}: ещё ${Math.max(0, cur2w.goal - cur2w.pts)} очков до ${DM.format(day(cur2w.b))}</span><span class="bar"><i style="width:${Math.min(100, Math.round(100*cur2w.pts/cur2w.goal))}%"></i></span></a>`:""}
    ${(()=>{ if(!window.Journal) return ""; const up = Journal.upcoming(3)[0]; return up ? `<a href="#diary" class="chip warn sb-soon">${Journal.TYPES[up.type]||"Событие"} ${Journal.when(up.date)}: ${esc(Journal.subjName(up.subj))}</a>` : Journal.importDue() ? `<a href="#diary" class="chip sb-soon">Пришли скрин оценок за неделю</a>` : ""; })()}</div>`;
}

/* ---------- дневник ---------- */
const dayLine = rec => `За этот день: <b>${rec?rec.pts:0}</b> очков${rec&&rec.active?" · день засчитан в серию":" · чтобы день засчитался в серию, сделай домашку, параграф, итоговые вопросы, позанимайся с учителем или реши 3 задания ОГЭ"}.`;
/* ---------- награды ---------- */
function renderRewards(){
  const cfg = applyCfg(), G = RULES.goals, avgTxt = v => String(v).replace(".",",");
  const c = compute(), ps = periods(c, true), parts = ogeParts(), prog = programShare(), avg = yearAvg();
  const used = Object.assign({u:{}}, Store.get("bonuses", {})).u, oc = ogeCounts(), allTasks = [...Object.entries(oc.math), ...Object.entries(oc.rus)], doneTasks = allTasks.filter(([,n])=>n >= RULES.goals.ogeTask).length;
  const card = p => { const ok = p.ok, u = used[p.id];
    const st = p.future ? "fut" : ok ? (u ? "used" : "avail") : p.over ? "miss" : "now";
    const note = { fut:"впереди", used:`использован${u && u.date ? " "+DM.format(day(u.date)) : ""}${u && u.how ? ": "+esc(u.how) : ""}`, avail:"можно использовать", miss:p.byAvg?`средний балл ${fmtAvg(p.avg)}`:"не набрано", now:p.byAvg?(p.avg!==null?`средний балл ${fmtAvg(p.avg)}, нужно выше ${avgTxt(p.goal)}`:`нужен средний балл выше ${avgTxt(p.goal)}`):`${p.pts} из ${p.goal} очков` }[st];
    return `<div class="rsq rsq-${st}" title="${esc(p.label)}"><b>${esc(p.label)}</b>${st==="now"&&!p.byAvg?`<div class="bar"><i style="width:${Math.min(100,Math.round(100*p.pts/p.goal))}%"></i></div>`:""}<span class="sm">${note}</span>
      ${st==="avail" ? `<details class="more"><summary class="btn">Использовать</summary><form class="morebox bonusform" data-bonus="${p.id}">
        <label class="sm">Когда<input type="date" value="${iso(new Date())}" data-bdate></label>
        <label class="sm">Как${(REWARDS[p.kind].choices||[]).length?`<input list="bl-${p.id}" data-bhow placeholder="например: ${esc(REWARDS[p.kind].choices[0])}"><datalist id="bl-${p.id}">${REWARDS[p.kind].choices.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`:`<input data-bhow>`}</label>
        <button class="btn primary" type="submit">Закрыть бонус</button></form></details>` : ""}</div>`; };
  const goalRow = (label, cur, goal, fmt) => `<div class="subjrow" style="--c:var(--accent)"><span>${label}</span><div class="bar"><i style="width:${Math.min(100,Math.round(100*cur/goal))}%"></i></div><span>${fmt||cur+"/"+goal}</span></div>`;
  const by = k => ps.filter(p=>p.kind===k);
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Награды</h2>
    <div class="statnums" style="margin-top:12px">
      <div class="count"><div class="big">${c.total}</div><div class="lbl">очков всего</div><div class="sm">считаются с ${DM.format(day(RULES.start))}</div></div>
      <div class="count"><div class="big">${c.state==="out"?0:c.streak}</div><div class="lbl">дней серия</div><div class="sm">лучшая: ${c.best}</div></div>
    </div></section>
  <section class="panel goalp"><div class="goalart">${gArt("laptop", `<svg viewBox="0 0 160 120" aria-hidden="true"><rect x="28" y="14" width="104" height="70" rx="6" fill="var(--card)" stroke="currentColor" stroke-width="4"/><rect x="36" y="22" width="88" height="54" rx="2" fill="var(--accent-soft)"/><path d="M50 60 l14-14 10 10 18-20 14 14" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="36" r="5" fill="var(--accent)"/><path d="M12 88 h136 l-8 14 a6 6 0 0 1-5 3 H25 a6 6 0 0 1-5-3 Z" fill="var(--card)" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><rect x="66" y="92" width="28" height="5" rx="2.5" fill="currentColor"/></svg>`)}</div><div class="goaltxt"><h3>Главная цель: ${esc(REWARDS.laptop.title.toLowerCase())}</h3>
    <div class="subjrows">
      ${goalRow("Очки", c.total, RULES.goals.final)}
      ${goalRow("Пройдено программы", Math.round(prog*100), Math.round(G.program*100), Math.round(prog*100)+"% из "+Math.round(G.program*100)+"%")}
      ${goalRow(`Задания ОГЭ: ${G.ogeTask} верных из 33 последних`, doneTasks, allTasks.length)}
      ${goalRow("Годовые оценки", avg ? Math.round(avg*100) : 0, 500, avg ? avg.toFixed(2).replace(".",",") : "—")}
    </div>
    <details class="plain"><summary class="sm">Верных среди 33 последних по каждому заданию ОГЭ</summary>
      ${[["math","Математика"],["rus","Русский"]].map(([e,n])=>`<div class="ogecnt"><b class="sm">${n}</b>${Object.entries(oc[e]).map(([k,v])=>`<span class="ogec ${v>=RULES.goals.ogeTask?"ok":""}" title="Задание ${k}: верно ${v} из последних 33"><i>${k}</i>${v}</span>`).join("")}</div>`).join("")}
    </details>
    <p class="hint">${esc(REWARDS.laptop.title)}: аттестат с отличием (все пятёрки), ${G.final} очков, ${Math.round(G.program*100)}% программы и у КАЖДОГО задания ОГЭ не меньше ${RULES.goals.ogeTask} верных из 33 последних решений (тренировки и пробные считаются вместе).</p>
    ${gMedia("laptop")}
  </div></section>
  <section class="panel goalp"><div class="goalart">${gArt("dress", `<svg viewBox="0 0 160 140" aria-hidden="true"><path d="M80 8 v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M80 18 c-10 0-14 8-14 8 h28 s-4-8-14-8z" fill="currentColor"/><path d="M62 26 l-6 4 6 30 h36 l6-30 -6-4 c-4 8-12 12-18 12 s-14-4-18-12z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M60 60 h40" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/><circle cx="80" cy="60" r="5" fill="var(--accent)"/><path d="M62 64 C50 90 34 112 24 128 h112 C126 112 110 90 98 64 z" fill="var(--accent-soft)" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M70 70 C64 92 56 110 50 126 M90 70 C96 92 104 110 110 126 M80 68 v58" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" opacity=".7"/><path d="M118 30 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z M36 40 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" fill="var(--accent)"/></svg>`)}</div><div class="goaltxt"><h3>Цель: платье на выпускной</h3>
    <div class="subjrows">${goalRow("Средний балл аттестата", avg ? Math.round(avg*100) : 0, Math.round(G.dressAvg*100)+1, avg ? avg.toFixed(2).replace(".",",") + (avg>G.dressAvg?" · есть!":` нужно выше ${avgTxt(G.dressAvg)}`) : "—")}</div>
    <p class="hint">${esc(REWARDS.dress.title)}: средний балл аттестата выше ${avgTxt(G.dressAvg)}. Считается по годовым оценкам из таблицы на главной.</p>
    ${gMedia("dress")}
  </div></section>
  <section class="panel"><h3>Каждые 2 недели: ${esc(REWARDS.twoWeeks.title.toLowerCase())}</h3><p class="hint" style="margin-top:0">Нужно ${G.twoWeeks} очков за две недели.</p><div class="rwgrid">${by("twoWeeks").map(card).join("")}</div></section>
  <section class="panel"><h3>Каждый месяц: ${esc(REWARDS.month.title.toLowerCase())}</h3><p class="hint" style="margin-top:0">Нужно ${G.month} очков за месяц.</p><div class="rwgrid">${by("month").map(card).join("")}</div></section>
  <section class="panel"><h3>Каждый триместр: ${esc(REWARDS.quarter.title.toLowerCase())}</h3><p class="hint" style="margin-top:0">Если средний балл за триместр выше ${avgTxt(G.termAvg)}. Считается по итоговым оценкам за триместр из таблицы на главной.</p><div class="rwgrid">${by("quarter").map(card).join("")}</div></section>
  <p class="hint rsq-legend"><span class="rsq-dot rsq-avail"></span>доступен <span class="rsq-dot rsq-used"></span>использован <span class="rsq-dot rsq-now"></span>идёт сейчас <span class="rsq-dot rsq-fut"></span>впереди</p>
  <details class="panel plain ogehelp rulesbox"><summary class="sm"><span>Как начисляются очки</span><button type="button" class="gearbtn" id="rgear" aria-pressed="${cfgOpen}" title="Настроить награды и требования" aria-label="Настроить награды и требования"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20.5 5h7l1.2 5.2a15 15 0 0 1 4 2.3l5.1-1.6 3.5 6-3.9 3.7a15 15 0 0 1 0 4.8l3.9 3.7-3.5 6-5.1-1.6a15 15 0 0 1-4 2.3L27.5 43h-7l-1.2-5.2a15 15 0 0 1-4-2.3l-5.1 1.6-3.5-6 3.9-3.7a15 15 0 0 1 0-4.8l-3.9-3.7 3.5-6 5.1 1.6a15 15 0 0 1 4-2.3z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/></svg></button></summary><div class="rules">
    <p>Очки только копятся и никогда не тратятся. Когда за период набрано нужное число очков, здесь появляется бонус-квадратик. Бонусы тоже копятся: используй, когда захочешь, и запиши, когда и как.</p>
    <p>Оценки и пропуски приходят только из электронного дневника через заполнялку. Текущая оценка: 5 → +5, 4 → +2, 3 → −3, 2 → −8. День с Н без причины: ${RULES.absent}. Болезнь (Б) и уважительная причина не снимают очки и не ломают серию. Скрин оценок за неделю: +${RULES.weekly}.</p>
    <p>Домашка: +${RULES.hw} за задание из учебника, +${RULES.hwOther} за своё (доклад, проект, задача). Пройденный параграф: +${RULES.paragraph}. Верное задание ОГЭ: +${RULES.ogeOk}. Пробный вариант ОГЭ: +${RULES.ogeTest}. Итоговые вопросы по главе: +${RULES.quiz}, без ошибок ещё +5.</p>
    <p>Контрольная: 5 → +20, 4 → +10, 3 → 0, 2 → −15. Итоговая за триместр: 5 → +80, 4 → +30, 3 → −30. Годовая: 5 → +120, 4 → +40, 3 → −40.</p>
    <p>Серия: день засчитывается, если сделана домашка, параграф, итоговые вопросы по главе или 3 задания ОГЭ. Каждый день серии даёт бонус +1, +2 … до +${RULES.streakMax}. Выходные и каникулы серию не ломают.</p>
    <p>Если в учебный день не было занятий, серия <b>остывает</b>. На второй день простоя она <b>гаснет</b>, и начиная с этого дня за каждый пустой учебный день снимается ${-RULES.idlePenalty} очков.</p>
  </div></details>
  ${cfgPanel(cfg)}</div>`;
  bindRewards();
}
let cfgOpen = false;
/* фото и ссылка для главной цели и большой награды: Store "goalMedia" */
const gm = () => Object.assign({}, Store.get("goalMedia", {}) || {});
function gArt(k, svg){ const m = gm()[k] || {}; return m.photo ? `<img class="goalphoto" src="${m.photo}" alt="${esc(REWARDS[k].title)}">` : svg; }
function gMedia(k){ const m = gm()[k] || {}, safe = /^https?:\/\//i.test(m.link||"");
  return `<div class="goalmedia">${safe ? `<a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener noreferrer">🔗 Открыть ссылку</a>` : ""}
    <button class="btn" type="button" data-gphoto="${k}">📷 ${m.photo ? "Сменить фото" : "Добавить фото"}</button>${m.photo ? `<button class="btn" type="button" data-gnophoto="${k}">Убрать фото</button>` : ""}
    <form class="chatrow glink" data-glink="${k}"><input type="text" inputmode="url" placeholder="Ссылка на награду (магазин, фото, сайт)" value="${esc(m.link||"")}" aria-label="Ссылка: ${esc(REWARDS[k].title)}"><button class="btn" type="submit">${m.link ? "Сохранить ссылку" : "Добавить ссылку"}</button></form></div>`; }
function bindMedia(){
  const save = (k, patch) => { const d = gm(); d[k] = Object.assign({}, d[k]||{}, patch); Store.set("goalMedia", d, 0); renderRewards(); };
  document.querySelectorAll("[data-gphoto]").forEach(b=>b.addEventListener("click", async()=>{ const got = await Photo.pick(false); if(!got[0]) return;
    const f = await (await fetch(got[0].url)).blob(), sm = await Photo.shrink(f, 700); save(b.dataset.gphoto, { photo: sm.url }); }));
  document.querySelectorAll("[data-gnophoto]").forEach(b=>b.addEventListener("click", ()=>save(b.dataset.gnophoto, { photo:"" })));
  document.querySelectorAll("[data-glink]").forEach(f=>f.addEventListener("submit", e=>{ e.preventDefault(); let v = f.querySelector("input").value.trim(); if(v && !/^https?:\/\//i.test(v)) v = "https://" + v; save(f.dataset.glink, { link: v }); }));
}
function cfgPanel(cfg){
  const when = cfg.ts ? new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(cfg.ts)) : "";
  const row = (k, head, goalLbl, step, choices) => `<fieldset class="rcfg"><legend>${head}</legend>
    <label class="sm">Награда<input data-rk="${k}" data-rf="title" value="${esc(cfg[k].title)}"></label>
    <label class="sm">${goalLbl}<input type="number" step="${step}" min="0" data-rk="${k}" data-rf="goal" value="${cfg[k].goal}"></label>
    ${choices ? `<label class="sm rcfg-wide">Варианты (через запятую)<input data-rk="${k}" data-rf="choices" value="${esc((cfg[k].choices||[]).join(", "))}"></label>` : ""}
    ${k==="laptop" ? `<label class="sm">Пройдено программы, %<input type="number" min="0" max="100" data-rk="laptop" data-rf="program" value="${cfg.laptop.program}"></label><label class="sm">Верных из 33 по каждому заданию ОГЭ<input type="number" min="0" max="33" data-rk="laptop" data-rf="ogeTask" value="${cfg.laptop.ogeTask}"></label>` : ""}
  </fieldset>`;
  return `<section class="panel" id="rcfgsec" ${cfgOpen?"":"hidden"}><h3>Настроить награды и требования</h3><details class="pages-ed rcfgbox" id="rcfg" open><summary hidden>Настроить</summary>
    <p class="sm">${when ? `Последнее изменение: <b>${when}</b>.` : "Пока стандартные награды, их никто не менял."} Уже полученные бонусы остаются.</p>
    <form id="rcfgform">${row("twoWeeks","Каждые 2 недели","Очков за 2 недели",1,true)}${row("month","Каждый месяц","Очков за месяц",1,true)}${row("quarter","Каждый триместр","Средний балл за триместр выше",0.01,true)}${row("dress","Большая награда","Средний балл аттестата выше",0.01,false)}${row("laptop","Главная цель","Очков всего",1,false)}
    <div class="btnrow"><button class="btn primary" type="submit">Сохранить</button><button class="btn" type="button" id="rcfgreset">Вернуть стандартные</button><span class="sm" id="rcfgst" aria-live="polite"></span></div></form></details></section>`;
}
function bindRewards(){
  const main = $("main");
  main.querySelectorAll("[data-bonus]").forEach(f=>f.addEventListener("submit", e=>{ e.preventDefault();
    const d = Object.assign({u:{}}, Store.get("bonuses", {})); d.u = Object.assign({}, d.u, {[f.dataset.bonus]: { date: f.querySelector("[data-bdate]").value, how: f.querySelector("[data-bhow]").value.trim(), ts:Date.now() }});
    Store.set("bonuses", d, 0); renderRewards(); }));
  bindMedia();
  const gear = $("rgear"); if(gear) gear.addEventListener("click", e=>{ e.preventDefault(); e.stopPropagation(); cfgOpen = !cfgOpen; gear.setAttribute("aria-pressed", cfgOpen); const sec = $("rcfgsec"); if(sec){ sec.hidden = !cfgOpen; if(cfgOpen) sec.scrollIntoView({ behavior:"smooth", block:"start" }); } });
  const form = $("rcfgform"); if(!form) return;
  form.addEventListener("submit", async e=>{ e.preventDefault();
    const out = { ts: Date.now() };
    form.querySelectorAll("[data-rk]").forEach(i=>{ const k = i.dataset.rk, f = i.dataset.rf; out[k] = out[k] || {};
      if(f==="choices") out[k][f] = i.value.split(",").map(x=>x.trim()).filter(Boolean);
      else if(f==="title") out[k][f] = i.value.trim() || DEF_CFG[k].title;
      else { const v = parseFloat(String(i.value).replace(",", ".")); out[k][f] = v > 0 ? v : DEF_CFG[k][f]; } });
    await Store.set("rewardsCfg", out, 0); renderRewards(); renderBar(); const st = $("rcfgst"); if(st) st.textContent = "Сохранено"; const d = $("rcfg"); if(d) d.open = true; });
  $("rcfgreset").addEventListener("click", async()=>{ await Store.set("rewardsCfg", { ts: Date.now() }, 0); renderRewards(); renderBar(); const d = $("rcfg"); if(d) d.open = true; });
}



/* ---------- отчёт папе ---------- */
function reportData(){
  const c = compute(), g = S.grades().g, parts = ogeParts(), prog = programShare();
  const last = t => GRADE_SUBJECTS.map(([id,n])=>[n, (g[id]||{})[t]]).filter(x=>x[1]);
  const T = (Object.assign({grades:[]}, Store.get("journal", {})).grades||[]).filter(x=>x.kind==="test").slice(-10).map(x=>({ subjName:(GRADE_SUBJECTS.find(g=>g[0]===x.subj)||[,x.subj])[1], mark:x.mark, date:x.date }));
  const week = Object.entries(c.byDay).filter(([d])=>d >= addDays(todayIso(),-6)).reduce((a,[,r])=>a+r.pts,0);
  const books = BOOKS.map(b=>{ const k = keysOf(b); return [b.subject, Math.round(100*k.filter(x=>App.done[x]).length/k.length)]; });
  return { c, g, parts, prog, last, T, week, books };
}
function trials(){ return (Object.assign({list:[]}, Store.get("ogeTests", {})).list||[]).slice(-6).map(t=>({ exam: t.exam==="rus" ? "русский" : "математика", ok:t.ok, n:t.n, pct: t.n ? Math.round(100*t.ok/t.n) : 0, date: iso(new Date(t.ts)) })); }
function localReport(){
  const { c, parts, prog, last, T, week, books } = reportData();
  const t1 = last("t1"), t2 = last("t2"), cur = t2.length ? t2 : t1;
  const fives = cur.filter(x=>x[1]==="5").map(x=>x[0]), fours = cur.filter(x=>x[1]==="4").map(x=>x[0]);
  const lines = [];
  lines.push("Здравствуйте! Это учитель Клод, коротко о том, как дела у Даши. 🙂");
  if(fives.length) lines.push(`Пятёрки: ${fives.join(", ")}. Это настоящий результат её работы.`);
  if(fours.length) lines.push(`Уверенные четвёрки: ${fours.join(", ")}.`);
  const tGood = T.filter(t=>t.mark==="5");
  if(tGood.length) lines.push(`Недавние пятёрки за контрольные: ${[...new Set(tGood.map(t=>t.subjName))].join(", ")}.`);
  lines.push(`Даша занимается регулярно: за неделю ${week} очков, всего ${c.total}${c.streak>1?`, сейчас серия ${pl(c.streak,"день","дня","дней")} подряд`:""}.`);
  const goodBooks = books.filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]);
  if(goodBooks.length) lines.push(`По учебникам уже пройдено: ${goodBooks.map(b=>`${b[0]} ${b[1]}%`).join(", ")}.`);
  const tr = trials();
  if(tr.length){ const by = ex => tr.filter(t=>t.exam===ex).pop(); const m = by("математика"), r = by("русский");
    lines.push(`Пробные варианты ОГЭ: ${[m && `математика ${m.ok} из ${m.n} (${m.pct}%)`, r && `русский ${r.ok} из ${r.n} (${r.pct}%)`].filter(Boolean).join(", ")}.`); }
  else if(parts.math1+parts.math2+parts.rus) lines.push(`К ОГЭ готовится понемногу каждый день: верно решено ${parts.math1+parts.math2} заданий по математике и ${parts.rus} по русскому.`);
  if(fours.length) lines.push(`Что можно ещё улучшить: ${fours.slice(0,2).join(" и ")} до пятёрки, и над этим уже идёт работа.`);
  lines.push(`Если всё пойдёт так же, Даша спокойно выходит на ${fours.length<=1 ? "аттестат с отличием" : "сильный аттестат"} и хороший результат на ОГЭ в июне. Пройдено ${Math.round(prog*100)}% программы, и темп хороший.`);
  lines.push("Всё хорошо, Даша молодец!");
  return lines.join("\n\n");
}
// картинка отчёта как страница дневника, написанная от руки: текст нельзя поменять перед отправкой
async function reportCanvas(text){
  const HAND = `"Caveat", "Segoe Print", "Comic Sans MS", cursive`;
  try{ await Promise.all([document.fonts.load(`700 46px "Caveat"`, "Дашаабв"), document.fonts.load(`700 46px "Caveat"`, "Abc 0123456789 !?.,:—"), document.fonts.ready]); }catch(e){}
  const W = 1080, LH = 58, ML = 130, PR = 70, c = document.createElement("canvas"), x = c.getContext("2d");
  const ink = "#1d3fbf", red = "#d0021b";
  const clean = String(text||"").replace(/\*\*|__|==|!!|`/g,"").replace(/^#+\s*/gm,"").replace(/^\s*[-*•]\s+/gm,"— ").replace(/\[\[[^\]]*\]\]/g,"").replace(/\n{3,}/g,"\n\n").trim();
  const font = `700 44px ${HAND}`;
  const wrap = t => { x.font = font; const out = []; t.split("\n").forEach(par=>{ if(!par.trim()){ out.push(""); return; } let line = ""; par.split(/\s+/).forEach(w=>{ const t2 = line ? line+" "+w : w; if(x.measureText(t2).width > W - ML - PR && line){ out.push(line); line = w; } else line = t2; }); out.push(line); }); return out; };
  const lines = wrap(clean), top = 250, H = top + (lines.length + 4) * LH + 40;
  c.width = W; c.height = H;
  // бумага дневника
  x.fillStyle = "#fdfbf3"; x.fillRect(0,0,W,H);
  x.strokeStyle = "#b9cbe6"; x.lineWidth = 2;
  for(let y = top - LH + 14; y < H - 20; y += LH){ x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  x.strokeStyle = "#e7a3a3"; x.lineWidth = 3; x.beginPath(); x.moveTo(ML - 24, 0); x.lineTo(ML - 24, H); x.stroke();
  // шапка, как в дневнике
  x.fillStyle = "#6a6a7a"; x.font = `600 26px "Golos Text", sans-serif`; x.fillText("ДНЕВНИК  ·  " + (window.Study && Study.siteTitle ? Study.siteTitle() : "Dasha’s study"), ML, 60);
  x.fillStyle = ink; x.font = `700 40px ${HAND}`;
  const date = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(new Date());
  x.textAlign = "right"; x.fillText(date, W - PR, 120); x.textAlign = "left";
  x.font = `700 58px ${HAND}`; x.fillText("Для папы", ML, 150);
  x.strokeStyle = ink; x.lineWidth = 3; x.beginPath(); x.moveTo(ML, 164); x.quadraticCurveTo(ML + 120, 172, ML + 230, 160); x.stroke();
  // текст «ручкой», с лёгким дрожанием
  x.fillStyle = ink; x.font = font;
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  lines.forEach((l, k) => { const y = top + k * LH; x.save(); x.translate(ML + (rnd()-.5)*3, y + (rnd()-.5)*3); x.rotate((rnd()-.5)*0.006); x.fillText(l, 0, 0); x.restore(); });
  // пометка учителя красной ручкой
  const yb = top + (lines.length + 1.6) * LH;
  x.fillStyle = red; x.strokeStyle = red; x.font = `700 46px ${HAND}`; x.fillText("Молодец!", W - PR - 330, yb);
  x.lineWidth = 4; x.beginPath(); x.ellipse(W - PR - 60, yb - 22, 52, 46, -0.15, 0, Math.PI*2); x.stroke();
  x.font = `700 72px ${HAND}`; x.textAlign = "center"; x.fillText("5", W - PR - 60, yb + 2); x.textAlign = "left";
  x.font = `700 34px ${HAND}`; x.fillText("учитель Клод", W - PR - 330, yb + 44);
  return c;
}
function openReport(){
  const ov = document.createElement("div"); ov.className = "av-overlay";
  ov.innerHTML = `<div class="av-sheet report"><div class="av-sheet-lines"></div><h2 style="position:relative;margin:0">Для папы</h2>
    <div class="repimg" id="repimgbox"><p class="sm">Готовлю картинку…</p></div>
    <div class="chatrow" style="position:relative;flex-wrap:wrap"><button class="btn primary" type="button" id="repshare">Отправить картинку</button><button class="btn" type="button" id="reptg">Telegram</button><button class="btn" type="button" id="repwa">WhatsApp</button><button class="btn" type="button" id="repdl">Скачать</button><button class="btn" type="button" id="repclose">Закрыть</button></div>
    <p class="hint" id="repnote" style="position:relative">Отчёт отправляется картинкой, текст в нём поменять нельзя.</p></div><div class="av-host"></div>`;
  document.body.appendChild(ov);
  const a = Avatar.create(ov.querySelector(".av-host")); a.setMood("think"); a.say("Сейчас всё расскажу…");
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  let blob = null, ready = false;
  const note = t => { const n = $("repnote"); if(n) n.textContent = t; };
  // на экране сразу картинка — страница дневника, её и отправляем
  const draw = async txt => { const c = await reportCanvas(txt); blob = await new Promise(r=>c.toBlob(r, "image/png")); const box = $("repimgbox"); if(box){ box.innerHTML = ""; const im = new Image(); im.alt = "Отчёт для папы"; im.src = URL.createObjectURL(blob); box.appendChild(im); } };
  const file = () => new File([blob], "otchet-dlya-papy.png", { type:"image/png" });
  const canShareFile = () => { try{ return !!(navigator.canShare && blob && navigator.canShare({ files:[file()] })); }catch(e){ return false; } };
  const download = () => { const u = URL.createObjectURL(blob), l = document.createElement("a"); l.href = u; l.download = "otchet-dlya-papy.png"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u), 5000); };
  const copyImg = async () => { try{ await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); return true; }catch(e){ return false; } };
  const share = async () => { if(!blob) return; if(canShareFile()){ try{ await navigator.share({ files:[file()], title:"Отчёт для папы" }); note("Отправлено."); }catch(e){} return true; } return false; };
  // мессенджер: на телефоне — через «Поделиться» (там выбрать Telegram или WhatsApp), на компьютере картинка копируется и открывается веб-версия, остаётся вставить (Ctrl+V)
  const go = async web => { if(!blob) return; if(mobile && await share()) return;
    const ok = await copyImg(); if(!ok) download();
    note(ok ? "Картинка скопирована. В чате с папой нажми Ctrl+V (или «Вставить») и отправь." : "Картинка скачана. Прикрепи её в чате с папой.");
    const w = window.open(web, "_blank", "noopener"); if(!w) location.href = web; };
  $("repshare").addEventListener("click", async()=>{ if(!(await share())){ const ok = await copyImg(); if(!ok) download(); note(ok ? "Картинка скопирована, вставь её в любой мессенджер." : "Картинка скачана, прикрепи её в мессенджере."); } });
  $("reptg").addEventListener("click", ()=>go("https://web.telegram.org/"));
  $("repwa").addEventListener("click", ()=>go("https://web.whatsapp.com/"));
  $("repdl").addEventListener("click", ()=>{ if(blob){ download(); note("Картинка скачана."); } });
  const close = () => { a.destroy(); ov.remove(); };
  $("repclose").addEventListener("click", close);
  const finish = () => { if(ov.isConnected){ a.setMood("smile"); a.say("Готово! Можно отправлять", 4000); } };
  if(Store.aiAvailable()) (async()=>{
    note("Учитель пишет отчёт…");
    let txt = localReport();
    try{ const { c, parts, prog, T, week, books } = reportData();
      const r = await Store.ask({ mode:"report", subject:"", messages:[{role:"user", content: JSON.stringify({ grades: S.grades().g, tests: T, points: c.total, week, streak: c.streak, books, oge: parts, trials: trials(), program: Math.round(prog*100) })}] });
      if(r && r.text) txt = r.text; }catch(e){}
    if(ov.isConnected){ await draw(txt); note("Отчёт отправляется картинкой, текст в нём поменять нельзя."); finish(); }
  })(); else { draw(localReport()).then(finish); }
}

window.Points = { compute, bonuses, squares, ogeCounts, ogeLast, REWARDS, renderBar, renderRewards, logAct(){ const a = Object.assign({d:{}}, Store.get("act", {})); a.d = Object.assign({}, a.d); const t = todayIso(); a.d[t] = (a.d[t]||0)+1; Store.set("act", a, 2000); }, openReport, ogeLog, logOge(exam, num, ok){ const o = ogeLog(); o.a = o.a.concat([[Date.now(), exam, num, ok ? 1 : 0]]); Store.set("oge", o, 1500); renderBar(); } };
})();
