// Дашины учебники: главная, учебники с просмотром PDF, доска, ИИ-учитель, статистика.
(function(){
const BOOKS = window.BOOKS, EMPTY = window.EMPTY, CAL = window.CAL;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pl = (n,a,b,c) => { const m=Math.abs(n)%100, d=m%10; return `${n} ${m>10&&m<20?c:d===1?a:d>=2&&d<=4?b:c}` };
const keysOf = b => b.groups.flatMap((g,gi)=>g.chapters.flatMap((c,ci)=>c.p.map((_,pi)=>`${b.id}.${gi}.${ci}.${pi}`)));
const PDFLIB_URL = "js/vendor/pdf-lib.min.js";
const NAV = [["home","Главная","⌂"],["diary","Дневник","✓"],["calendar","Календарь","▦"],["memos","Памятки","⭐"],["rewards","Награды","♛"],["tutor","ИИ-учитель","?"],["stats","Статистика","▤"]];
const LONG_DATE = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});

/* ---------- данные ---------- */
const S = {
  progress(){ return Store.get("progress", {done:{}}) },
  book(id){ return Object.assign({pages:{}, offset:0, chunks:[]}, Store.get("book-"+id, {})) },
  setBook(id, v){ return Store.set("book-"+id, v) },
  grades(){
    let g = Store.get("grades", null);
    if(!g){ g = {g:{}}; GRADE_SUBJECTS.forEach(([id,,t1])=>{ g.g[id] = {t1, t2:"", t3:"", y:""}; }); Store.set("grades", g, 0); }
    return g;
  }
};
let done = {};
window.App = { uploadPdf(b, f, sid, after){ sayTarget = sid; return handleFile(b, f, after).then(()=>{ sayTarget = sid; }).catch(e=>{ console.error(e); say("Не получилось загрузить файл: " + upErr(e), true); }); }, $, esc, pl, S, keysOf, get done(){ return done }, setDone(k, on){ if(on) done[k] = Date.now(); else delete done[k]; saveDone(); } };
function loadDone(){ done = Object.assign({}, S.progress().done || {}); }
function saveDone(){ Store.set("progress", {done}); }
const pct = b => { const k=keysOf(b); return k.length ? Math.round(100*k.filter(x=>done[x]).length/k.length) : 0 };

/* ---------- календарь ---------- */
const day = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function vacationOf(d){ const s = iso(d); return CAL.vacations.find(([a,b])=>s>=a && s<=b); }
function isSchoolDay(d){ const w = d.getDay(); if(w===0||w===6) return false; if(CAL.holidays.includes(iso(d))) return false; return !vacationOf(d); }
function schoolDaysLeft(){
  const end = day(CAL.end); let n = 0;
  for(let d = today0(); d <= end; d.setDate(d.getDate()+1)) if(isSchoolDay(d)) n++;
  return n;
}
const daysUntil = s => Math.round((day(s) - today0()) / 864e5);
function nowLine(){
  const t = today0(), s = iso(t);
  const v = vacationOf(t);
  if(v) return `Сейчас ${v[2]}, до ${LONG_DATE.format(day(v[1]))}.`;
  const term = CAL.terms.find(([a,b])=>s>=a && s<=b);
  if(term){ const left = daysUntil(term[1]); return `Идёт ${term[2]}, до конца осталось ${pl(left,"день","дня","дней")}.`; }
  if(s > CAL.end) return "Учебный год закончился. Впереди экзамены.";
  return "";
}

/* ---------- полка ---------- */
function renderShelf(cur){
  $("shelf").innerHTML =
    NAV.map(([id,t,ic])=>`<a class="navitem" href="#${id}" ${cur===id?'aria-current="page"':''}><span class="ic" aria-hidden="true">${ic}</span><span class="nm">${t}</span></a>`).join("") +
    `<div class="shelf-label">ОГЭ</div>` +
    [["math","ОГЭ: математика","#2a4fd6"],["rus","ОГЭ: русский язык","#c2410c"]].concat(((window.Study && Study.OGE_BOOKS) || []).filter(b=>b.extra).map(b=>[b.exam, "ОГЭ: " + b.name.toLowerCase(), b.color])).map(([e,n,col])=>{ let p = 0; try{ if(e==="math"||e==="rus"){ const oc = Points.ogeCounts()[e]||{}, k = Object.keys(oc); p = k.length ? Math.round(100*k.reduce((a,x)=>a+Math.min(oc[x],30),0)/(30*k.length)) : 0; } else { const L = (Store.get("ogeTests",{list:[]}).list||[]).filter(t=>t.exam===e); p = L.length ? Math.round(100*Math.max(...L.map(t=>t.ptsMax ? t.pts/t.ptsMax : t.ok/t.n))) : 0; } }catch(_){}
      return `<a href="#oge/${e}" style="--c:${col}" ${cur==="oge-"+e?'aria-current="page"':''} title="Прогресс к цели 30 верных из 33 по каждому заданию"><span class="spine"></span><span class="nm">${n}</span><span class="pc">${p}%</span></a>`; }).join("") +
    `<div class="shelf-label">Учебники</div>` +
    BOOKS.map(b=>`<a href="#${b.id}" style="--c:${b.color}" ${cur===b.id?'aria-current="page"':''}><span class="spine"></span><span class="nm">${esc(b.subject)}${b.kind==="wb" ? " · р/т" : ""}</span><span class="pc" data-pc="${b.id}">${pct(b)}%</span></a>`).join("") +
    `<div class="shelf-label">Ждут фото учебника</div>` +
    EMPTY.map(b=>`<a class="empty" href="#${b.id}" style="--c:${b.color}" ${cur===b.id?'aria-current="page"':''}><span class="spine"></span><span class="nm">${esc(b.subject)}</span></a>`).join("");
}

/* ================= ГЛАВНАЯ ================= */
function gradeOpts(v){
  return ["","5","4","3","2","зач"].map(o=>`<option value="${o}" ${o===v?"selected":""}>${o||"—"}</option>`).join("");
}
function avg(g, t){ const n = GRADE_SUBJECTS.map(([id])=>Number(g.g[id]&&g.g[id][t])).filter(x=>x>=2); return n.length ? (n.reduce((a,b)=>a+b,0)/n.length) : null; }
/* оценки: настоящие из дневника и серые прогнозы. Прогноз по умолчанию 5, годовая — по триместрам,
   аттестат: у предметов с ОГЭ — среднее годовой и экзамена, математика в аттестате одна (алгебра + геометрия + вероятность) */
const MATH = ["algebra","geometry","prob"];
const rnd = x => x===null ? null : Math.floor(x + 0.5 + 1e-9);
const numAvg = a => { const n = a.map(Number).filter(x=>x>=2); return n.length ? n.reduce((x,y)=>x+y,0)/n.length : null; };
function gradeModel(g){
  const f = g.f || {}, out = {};
  // edit=false: оценка только вычисляется (годовая, математика, аттестат), выбрать невозможную цифру нельзя
  const pick = (id, t, def, edit=true) => { const r = (g.g[id]||{})[t]; if(r) return { v:r, real:true };
    const o = edit ? (f[id]||{})[t] : null; if(o) return { v:o, set:true }; return { v: def===null||def===undefined ? "" : String(def), auto:true, calc:!edit }; };
  GRADE_SUBJECTS.forEach(([id])=>{ const o = out[id] = {};
    ["t1","t2","t3"].forEach(t=>o[t] = pick(id, t, (g.g[id]||{}).t1==="зач" ? "зач" : 5));
    const ys = ["t1","t2","t3"].map(t=>o[t].v);
    o.y = pick(id, "y", ys.includes("зач") && !numAvg(ys) ? "зач" : rnd(numAvg(ys)), false);
    if(!MATH.includes(id)){ o.oge = pick(id, "oge", id==="rus" ? 5 : "");
      const y = Number(o.y.v), e = Number(o.oge.v);
      o.att = pick(id, "att", id==="nat" ? "" : o.y.v==="зач" ? "зач" : e>=2 && y>=2 ? rnd((y+e)/2) : o.y.v, false); }
  });
  const m = out.math = {};
  m.y = pick("math", "y", rnd(numAvg(MATH.map(id=>out[id].y.v))), false);
  m.oge = pick("math", "oge", 5);
  m.att = pick("math", "att", rnd(numAvg([m.y.v, m.oge.v])), false);
  return out;
}
function attAvg(M){ return numAvg(GRADE_SUBJECTS.filter(([id])=>!MATH.includes(id)).map(([id])=>M[id].att.v).concat([M.math.att.v])); }
function renderHome(){
  const g = S.grades();
  const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const cnt = [[schoolDaysLeft(), "учебных дней осталось", `до ${LONG_DATE.format(day(CAL.end))}, без выходных и каникул`]]
    .concat(CAL.oge.map(([d,t])=>[daysUntil(d), t.replace("ОГЭ по ","до ОГЭ: "), `${LONG_DATE.format(day(d))}, по проекту расписания`]));
  const notFive = GRADE_SUBJECTS.filter(([id])=>{ const r = g.g[id]||{}; const v = r.t2 || r.t1; return v && v!=="5" && v!=="зач"; });
  const M = gradeModel(g);
  const cell = (id, t, c, span) => { const sp = span ? ` rowspan="${span}" class="mathcell"` : "";
    if(c.real) return `<td${sp}><span class="gcell g${esc(c.v)}">${esc(c.v)}</span></td>`;
    if(c.calc) return `<td${sp}><span class="gcell gfc gcalc" title="Считается сама из других оценок">${esc(c.v||"—")}</span></td>`;
    const def = c.auto ? c.v : "";
    return `<td${sp}><select class="gcell gfc${c.set?" gset":""}" data-fc="${id}" data-t="${t}" title="Прогноз. Поменяй, и всё пересчитается" aria-label="Прогноз">
      <option value="">${esc(c.auto ? (c.v||"—") : "авто")}</option>${["5","4","3","2"].map(o=>`<option ${c.set&&c.v===o?"selected":""}>${o}</option>`).join("")}</select></td>`; };
  const rows = GRADE_SUBJECTS.map(([id,name])=>{ const o = M[id];
    const tail = MATH.includes(id) ? (id===MATH[0] ? cell("math","oge",M.math.oge,3) + cell("math","att",M.math.att,3) : "") : cell(id,"oge",o.oge) + cell(id,"att",o.att);
    return `<tr><td>${esc(name)}</td>${["t1","t2","t3","y"].map(t=>cell(id,t,o[t])).join("")}${tail}</tr>`; }).join("");
  const f2 = a => a ? a.toFixed(2).replace(".",",") : "—";
  const colAvg = t => f2(numAvg(GRADE_SUBJECTS.map(([id])=>M[id][t].v)));
  const ogeAvg = f2(numAvg(GRADE_SUBJECTS.filter(([id])=>!MATH.includes(id)).map(([id])=>M[id].oge.v).concat([M.math.oge.v])));
  $("main").innerHTML = `<div class="stack">
  ${Calendar.todayPanel()}
  <section class="panel"><div class="quoterow"><p class="quote" id="quote">${esc(q)}</p><button class="btn" id="nextq" type="button">Ещё фраза</button></div></section>
  ${Journal.soonPanel()}
  ${Study.recoHome()}
  <section class="panel dadrow"><div><h3>Похвастаться успехами</h3><p class="hint">Учитель Клод коротко напишет папе, что всё идёт хорошо: успехи, пробные ОГЭ и перспективы.</p></div><button class="btn primary" type="button" data-dad>Рассказать папе о моих успехах</button></section>
  <section class="panel"><h3>Сколько осталось</h3>
    <div class="counts">${cnt.map(([n,l,s])=>`<div class="count"><div class="big">${Math.max(0,n)}</div><div class="lbl">${esc(l)}</div><div class="sm">${esc(s)}</div></div>`).join("")}</div>
    <p class="nowline">${esc(nowLine())}</p>
    <p class="hint">Каникулы и конец года взяты по обычному графику триместров, сверь их со школой. Даты ОГЭ взяты из проекта расписания на 2027 год и могут измениться.</p>
  </section>
  <section class="panel"><h3>Оценки</h3>
    <div class="tablewrap"><table class="grades"><thead><tr><th>Предмет</th><th>1 трим.</th><th>2 трим.</th><th>3 трим.</th><th>Год</th><th>ОГЭ</th><th>Аттестат</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td>Средний балл</td><td>${colAvg("t1")}</td><td>${colAvg("t2")}</td><td>${colAvg("t3")}</td><td>${colAvg("y")}</td><td>${ogeAvg}</td><td><b>${f2(attAvg(M))}</b></td></tr></tfoot></table></div>
    <p class="hint">Серые цифры — прогноз: пока везде 5. Менять можно оценки за триместры и ОГЭ, а годовая, математика, аттестат и средний балл пересчитаются сами, поэтому невозможная цифра там не появится. Годовая считается по триместрам, в аттестат по русскому и математике идёт среднее годовой и ОГЭ. Математика в аттестате одна: годовая по алгебре, геометрии и вероятности вместе с ОГЭ.</p>
    <div class="legend">${notFive.length ? `<span class="chip warn">Не пятёрка сейчас: ${esc(notFive.map(x=>x[1]).join(", "))}</span>` : `<span class="chip ok">Все текущие оценки отличные</span>`}</div>
    <p class="hint">Итоговые оценки попадают сюда из электронного дневника через <a href="#diary">заполнялку</a>.</p>
  </section>
  <section class="panel"><h3>Учебники</h3><div class="booklinks">${BOOKS.map(b=>`<a class="booklink" href="#${b.id}" style="--c:${b.color}"><b>${esc(b.subject)}</b><div class="bar"><i style="width:${pct(b)}%"></i></div><span class="sm">${pct(b)}% параграфов пройдено</span></a>`).join("")}</div></section>
  </div>`;
  $("main").querySelector("[data-dad]").addEventListener("click", ()=>Points.openReport());
  Journal.bindEv($("main")); Calendar.bindToday($("main"));
  $("nextq").addEventListener("click",()=>{ let n; do{ n = QUOTES[Math.floor(Math.random()*QUOTES.length)] }while(n===$("quote").textContent && QUOTES.length>1); $("quote").textContent = n; });
  $("main").querySelectorAll("select[data-fc]").forEach(s=>s.addEventListener("change",()=>{
    const gg = S.grades(), f = Object.assign({}, gg.f||{}), id = s.dataset.fc;
    f[id] = Object.assign({}, f[id]||{}); if(s.value) f[id][s.dataset.t] = s.value; else delete f[id][s.dataset.t];
    Store.set("grades", Object.assign({}, gg, { f }), 0); renderHome();
    const again = $("main").querySelector(`select[data-fc="${id}"][data-t="${s.dataset.t}"]`); if(again) again.focus();
  }));
  $("main").querySelectorAll("select[data-g]").forEach(s=>s.addEventListener("change",()=>{
    const gg = S.grades(); gg.g[s.dataset.g] = Object.assign({}, gg.g[s.dataset.g]||{}, {[s.dataset.t]: s.value});
    Store.set("grades", gg); renderHome();
    const again = $(`gr-${s.dataset.g}-${s.dataset.t}`); if(again) again.focus();
  }));
}

/* ================= УЧЕБНИКИ ================= */
let curBook = null;
function hasFile(b){ const m = S.book(b.id); return m.chunks && m.chunks.length; }
function renderBook(b){
  const m = S.book(b.id), total = keysOf(b).length, file = hasFile(b);
  let html = `<article class="book" style="--c:${b.color}"><div class="book-head">
    <div class="subject">${esc(b.subject)}</div><h2>${esc(b.title)}</h2><p class="meta">${esc(b.authors)}</p>
    <div class="chips"><span class="chip">${pl(b.groups.reduce((a,g)=>a+g.chapters.length,0),"глава","главы","глав")} · ${pl(total,"параграф","параграфа","параграфов")}</span>
      ${b.approx?'<span class="chip warn">Оглавление приблизительно</span>':'<span class="chip ok">Оглавление по учебнику</span>'}</div>
    <div class="progress"><div class="bar"><i id="bar"></i></div><span id="pcnt"></span></div>
    ${Study.bookKnowHtml(b)}
    ${file?`<div class="btnrow"><button class="btn primary" id="openbook" type="button">Открыть учебник</button></div>`
      :`<p class="fileline">PDF учебника пока не загружен. Загрузить его и указать страницы можно в <a href="#account/books">личном кабинете</a>.</p>`}
  </div><div class="chapters">`;
  b.groups.forEach((g,gi)=>{
    if(g.grade) html += `<div class="grade">${g.now?'<span class="tag">сейчас</span>':''}${esc(g.grade)}</div>`;
    g.chapters.forEach((c,ci)=>{
      const open = (gi===0 && ci===0) ? " open" : "";
      const cpg = (m.chapterPages||{})[`${gi}.${ci}`];
      html += `<details class="ch" data-ch="${gi}.${ci}"${open}><summary><span class="num">${esc(c.n)}</span><span class="ttl">${esc(c.t)}</span><span class="cnt" data-cnt="${gi}.${ci}"></span>${Topic.chapterPassed(b.id, gi+"."+ci) ? `<span class="chpass" title="Итоговые вопросы по главе пройдены">✓ глава проверена</span>` : ""}${cpg && file ? `<button class="pg chpg" type="button" data-chpage="${cpg}" data-chtitle="${esc(c.n+" "+c.t)}">стр. ${cpg}</button>` : ""}</summary><ol class="paras">` +
        c.p.map((p,pi)=>{
          const k=`${b.id}.${gi}.${ci}.${pi}`, id=k.replace(/\./g,'-'), pg = m.pages[k];
          const right = pg && file ? `<button class="pg" type="button" data-page="${pg}">стр. ${pg}</button>` : "";
          return `<li><label><input type="checkbox" id="cb-${id}" data-k="${k}" ${done[k]?"checked":""}><span class="box"></span><span class="pn">${ci+1}.${pi+1}</span></label><a class="pt tlink" href="#t/${b.id}/${gi}.${ci}.${pi}">${esc(p)}</a>${(()=>{ const r = Topic.testOf(k); return r && r.pass ? `<span class="tchk" title="Тема освоена: тест пройден ${r.ok} из ${r.n}" aria-label="Тест пройден">✓</span>` : ""; })()}${(()=>{ const v = Topic.know().k[k]; return v===undefined ? "" : `<span class="knchip kn${v}" title="Знание темы, по ответам учителю">${esc(Topic.KNOW[v])}</span>`; })()}${right}</li>`;
        }).join("") + `</ol><div class="chacts"><a class="btn" href="#t/${b.id}/${gi}.${ci}.0">Начать главу с учителем</a><a class="btn" href="#q/${b.id}/${gi}.${ci}">Итоговые вопросы по главе</a></div></details>`;
    });
  });
  return html + `</div></article>`;
}
function updateCounts(b){
  const p = pct(b); const bar = $("bar"); if(bar) bar.style.width = p+"%";
  const k = keysOf(b), d = k.filter(x=>done[x]).length; const pc = $("pcnt"); if(pc) pc.textContent = `${d} из ${k.length} · ${p}%`;
  b.groups.forEach((g,gi)=>g.chapters.forEach((c,ci)=>{
    const n = c.p.filter((_,pi)=>done[`${b.id}.${gi}.${ci}.${pi}`]).length;
    const el = document.querySelector(`[data-cnt="${gi}.${ci}"]`); if(el) el.textContent = `${n}/${c.p.length}`;
    const det = document.querySelector(`[data-ch="${gi}.${ci}"]`); if(det) det.classList.toggle("complete", n===c.p.length);
  }));
  BOOKS.forEach(x=>{ const sp = document.querySelector(`[data-pc="${x.id}"]`); if(sp) sp.textContent = pct(x)+"%"; });
}
function mountBook(b){
  const main = $("main");
  const openState = {}; main.querySelectorAll("details.ch").forEach(d=>openState[d.dataset.ch]=d.open);
  const same = curBook === b.id; curBook = b.id;
  main.innerHTML = renderBook(b); updateCounts(b);
  if(!b.groups.length){ main.querySelector(".chapters").innerHTML = `<div class="placeholder"><p>Глав пока нет. Загрузи PDF в <a href="#account/books">личном кабинете</a> и нажми там «Взять главы и страницы из оглавления». Или сфотографируй оглавление ниже.</p></div>`;
    main.insertAdjacentHTML("beforeend", Study.tocPanel(b.id)); Study.bindToc(main); }
  if(same) main.querySelectorAll("details.ch").forEach(d=>{ if(d.dataset.ch in openState) d.open = openState[d.dataset.ch]; });
  main.querySelectorAll("input[data-k]").forEach(cb=>cb.addEventListener("change",()=>{
    if(cb.checked) done[cb.dataset.k] = Date.now(); else delete done[cb.dataset.k];
    saveDone(); updateCounts(b); }));
  main.querySelectorAll("button[data-page]").forEach(btn=>btn.addEventListener("click",()=>Reader.open(b, Number(btn.dataset.page), btn.closest("li").querySelector(".pt").textContent)));
  main.querySelectorAll("button[data-chpage]").forEach(btn=>btn.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); Reader.open(b, Number(btn.dataset.chpage), btn.dataset.chtitle); }));
  const ob = $("openbook"); if(ob) ob.addEventListener("click",()=>Reader.open(b, 0, ""));
  Study.bindKnow(main);
}

/* ================= ЛИЧНЫЙ КАБИНЕТ ================= */
// общая или своя версия учебника
function shareLine(b){
  if(Store.mode!=="cloud" || !Store.getShared) return "";
  const k = "book-"+b.id, sh = Store.getShared(k), own = Store.hasOwn(k), mine = Store.sharedMine(k);
  if(!sh || !own || mine) return "";
  return `<p class="hint sm"><span class="chip warn">своя версия</span> У остальных общий учебник.
    <button class="btn" type="button" data-useshared="${b.id}">Вернуть общий</button> <button class="btn" type="button" data-pubshared="${b.id}">Сделать мою версию общей</button></p>`;
}
// учебники и сборники ОГЭ в одном списке кабинета
const ACCB = () => BOOKS.concat(window.Study && Study.OGE_BOOKS ? Study.OGE_BOOKS : []);
/* ---------- личный кабинет: профиль, «Учебники», «Настройки» ---------- */
const ICON_BOOK = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 9c5-2 11-2 16 2v29c-5-4-11-4-16-2z" fill="currentColor" opacity=".18"/><path d="M40 9c-5-2-11-2-16 2v29c5-4 11-4 16-2z" fill="currentColor" opacity=".32"/><path d="M8 9c5-2 11-2 16 2 5-4 11-4 16-2v29c-5-2-11-2-16 2-5-4-11-4-16-2zM24 11v29" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 16c3-1 6-1 8 .5M12 22c3-1 6-1 8 .5M28 16.5c2-1.5 5-1.5 8-.5M28 22.5c2-1.5 5-1.5 8-.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
const ICON_GEAR = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20.5 5h7l1.2 5.2a15 15 0 0 1 4 2.3l5.1-1.6 3.5 6-3.9 3.7a15 15 0 0 1 0 4.8l3.9 3.7-3.5 6-5.1-1.6a15 15 0 0 1-4 2.3L27.5 43h-7l-1.2-5.2a15 15 0 0 1-4-2.3l-5.1 1.6-3.5-6 3.9-3.7a15 15 0 0 1 0-4.8l-3.9-3.7 3.5-6 5.1 1.6a15 15 0 0 1 4-2.3z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="24" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`;
const accBack = t => `<div class="accback"><a class="btn" href="#account">← Личный кабинет</a><h2>${esc(t)}</h2></div>`;
function renderAccountHome(){
  curBook = null;
  const p = Store.get("profile", {}) || {}, cloud = Store.mode==="cloud";
  $("main").innerHTML = `<div class="stack">
  <section class="panel acchome"><div class="prof">
    <a class="profpic" href="#account/profile" title="Настроить профиль">${p.photo?`<img src="${p.photo}" alt="Моё фото">`:`<span>${esc(((p.name||"Д")[0]||"Д").toUpperCase())}</span>`}</a>
    <div class="profinfo"><h2 style="margin:0">${esc(p.name || "Личный кабинет")}</h2>
      <p class="sm" style="margin:4px 0 0">${cloud ? esc(Store.user.email) : "Сайт работает без облака: всё хранится только в этом браузере."}</p>
      <div class="accbtns"><a class="btn" href="#account/profile">Настроить профиль</a>${cloud?`<button class="btn" id="acclogout" type="button">Выйти</button>`:""}<a class="btn" href="#admin" id="adminlink" hidden>Админка</a></div>
    </div></div></section>
  <div class="acctiles">
    <a class="acctile" href="#account/books" style="--c:#2a4fd6">${ICON_BOOK}<b>Учебники</b><span class="sm">PDF, оглавления, страницы, сборники ОГЭ, добавить документ</span></a>
    <a class="acctile" href="#account/settings" style="--c:#5a5f73">${ICON_GEAR}<b>Настройки</b><span class="sm">Оформление, учитель, цвета учебников</span></a>
  </div></div>`;
  const lo = $("acclogout"); if(lo) lo.addEventListener("click", ()=>$("logout").click());
  Study.drawMe();
}
function renderAccountProfile(){
  curBook = null;
  $("main").innerHTML = `<div class="stack">${accBack("Профиль")}${Study.profilePanel()}</div>`;
  Study.bindProfile($("main")); Study.drawMe();
}
function renderAccountSettings(){
  curBook = null;
  $("main").innerHTML = `<div class="stack">${accBack("Настройки")}${Study.themePanel()}${Study.colorsPanel()}</div>`;
  Study.bindTheme($("main"));
  const again = () => { const y = window.scrollY; renderShelf("account"); const el = $("colp"); if(el){ el.outerHTML = Study.colorsPanel(); Study.bindColors($("main"), again); } window.scrollTo(0, y); };
  Study.bindColors($("main"), again);
}
function renderAccount(openId){
  curBook = null;
  if(!/^#account\/books/.test(location.hash)) history.replaceState(null, "", "#account/books");
  $("main").innerHTML = `<div class="stack">
  ${accBack("Учебники")}
  <section class="panel"><h3>Учебники: PDF и страницы</h3><p class="hint" style="margin:0">Загрузи PDF каждого учебника и сборников ОГЭ и проверь страницы параграфов.</p></section>
  ${ACCB().map(b=>{ const m = S.book(b.id), file = hasFile(b), set = Object.keys(m.pages||{}).length, total = keysOf(b).length;
    return `<section class="panel acc-book" style="border-left:5px solid ${b.color}" data-book="${b.id}">
      <h2>${esc(b.subject)}</h2><p class="meta" style="margin:0">${esc(b.title)}</p>
      ${b.note && b.approx ? `<p class="note"><b>Приблизительно.</b> ${esc(b.note)}</p>` : ""}
      <p class="fileline">${file?`Файл: <b>${esc(m.fileName||"учебник.pdf")}</b>, ${pl(m.totalPages||0,"страница","страницы","страниц")}. Страницы указаны у ${set} из ${total} параграфов и у ${Object.keys(m.chapterPages||{}).length} глав.`:"PDF ещё не загружен."}</p>
      <div class="btnrow">
        <button class="btn ${file?"":"primary"}" data-up="${b.id}" type="button">${file?"Заменить PDF":"Загрузить PDF"}</button>
        ${file?`<button class="btn" data-open="${b.id}" type="button">Открыть учебник</button>${b.exam?"":Study.idxButton(b)}`:""}
        <input type="file" id="file-${b.id}" accept="application/pdf,.pdf" hidden>
      </div>
      ${shareLine(b)}${b.user ? `<div class="btnrow"><button class="btn" type="button" data-mydrop="${b.id}">Убрать ${b.kind==="wb"?"рабочую тетрадь":"учебник"}</button></div>` : ""}
      ${b.exam ? Study.ogeKeyRow(b) + (hasFile(b) ? Study.ogeInfoRows(b) : "") : ""}
      <p class="status" id="status-${b.id}" aria-live="polite"></p>
      <details class="pages-ed" ${openId===b.id?"open":""}><summary class="btn ${file && total && keysOf(b).every(k=>(m.pages||{})[k]) ? "pgok" : ""}" style="display:inline-block;margin-top:6px" title="${file && total && keysOf(b).every(k=>(m.pages||{})[k]) ? "Страницы указаны у всех параграфов" : `Страницы указаны у ${set} из ${total}`}">${file && total && keysOf(b).every(k=>(m.pages||{})[k]) ? "✓ " : ""}Номера страниц параграфов</summary>
        ${file && Store.aiAvailable() ? `<div class="editbar tocai"><span>Оглавление на страницах учебника</span><input type="number" min="1" max="999" data-tocfrom="${b.id}" value="${(m.tocPdf||[])[0]||""}" placeholder="с" aria-label="Первая страница оглавления"><span>по</span><input type="number" min="1" max="999" data-tocto="${b.id}" value="${(m.tocPdf||[])[1]||""}" placeholder="по" aria-label="Последняя страница оглавления"><button class="btn primary" type="button" data-tocai="${b.id}">Взять главы и страницы из оглавления</button><span class="sm">Номера как «стр.» в учебнике на сайте. ИИ прочитает оглавление: главы и параграфы станут точно как в книге, страницы впишутся сами. Отметки «пройдено» по старым темам могут сбиться.</span></div>` : ""}
        <div class="editbar"><label for="offset-${b.id}">Страниц в файле до первой страницы учебника:</label><input type="number" id="offset-${b.id}" data-off="${b.id}" min="-50" max="300" value="${Number(m.offset)||0}">${file?`<button class="btn" type="button" data-detoff="${b.id}">Определить сам</button>`:""}<span>Если в PDF есть обложка и титульные листы, впиши, сколько их. Тогда номера ниже совпадут с номерами в книге.</span></div>
        ${b.groups.map((g,gi)=>g.chapters.map((c,ci)=>`<div class="grade chrow" style="padding-left:0"><span style="flex:1;min-width:0">${esc(c.n)} ${esc(c.t)}</span><input class="pgin" type="number" min="1" max="999" data-cpk="${gi}.${ci}" value="${(m.chapterPages||{})[gi+"."+ci]||""}" placeholder="стр." aria-label="Страница главы: ${esc(c.t)}"></div><ol class="paras" style="padding:0 0 6px">${
          c.p.map((p,pi)=>{ const k=`${b.id}.${gi}.${ci}.${pi}`; return `<li><span class="pn">${ci+1}.${pi+1}</span><span class="pt" style="flex:1;min-width:0">${esc(p)}</span><input class="pgin" type="number" min="1" max="999" id="pg-${k.replace(/\./g,'-')}" data-pk="${k}" value="${m.pages[k]||""}" placeholder="стр." aria-label="Страница: ${esc(p)}"></li>`; }).join("")}</ol>`).join("")).join("")}
      </details>
</section>`; }).join("")}
  ${Study.ogeAddHtml()}
  ${Store.mode==="cloud" ? `<p class="hint sm accfoot">Общие учебники: первый загруженный PDF учебника становится общим, им пользуются все. Можно загрузить свой PDF, тогда у тебя будет своя версия, а у остальных останется общий.</p>` : ""}
  </div>`;
  const main = $("main");
  main.querySelectorAll("[data-useshared]").forEach(btn=>btn.addEventListener("click", async()=>{ const id = btn.dataset.useshared;
    for(const k of ["book-","toc-","idx-"]) if(Store.getShared(k+id)) await Store.del(k+id).catch(()=>{});
    if(window.Reader) Reader.clearCache(); Study.apply(); renderAccount(id); }));
  main.querySelectorAll("[data-pubshared]").forEach(btn=>btn.addEventListener("click", async()=>{ const id = btn.dataset.pubshared;
    for(const k of ["book-","toc-","idx-"]) if(Store.hasOwn(k+id)) await Store.setShared(k+id, Store.get(k+id));
    renderAccount(id); }));
  main.querySelectorAll("[data-up]").forEach(btn=>{ const id = btn.dataset.up, b = ACCB().find(x=>x.id===id), fi = $("file-"+id);
    btn.addEventListener("click",()=>fi.click());
    fi.addEventListener("change",()=>{ const f = fi.files && fi.files[0]; fi.value = ""; sayTarget = "status-"+id;
      handleFile(b, f).catch(e=>{ console.error(e); say("Не получилось загрузить файл: " + upErr(e), true); }); });
  });
  Study.bindOgeAdd(main, id=>{ renderShelf("account"); renderAccount(id); if(id){ const el = main.querySelector(`[data-book="${id}"]`); if(el) el.scrollIntoView({ block:"center" }); } });
  Study.bindOgeKey(main, id=>renderAccount(id));
  Study.bindOgeInfo(main, id=>renderAccount(id));
  main.querySelectorAll("[data-detoff]").forEach(btn=>btn.addEventListener("click", async()=>{ const b = ACCB().find(x=>x.id===btn.dataset.detoff); sayTarget = "status-"+b.id; btn.disabled = true; say("Сравниваю номера страниц в середине файла…");
    const off = await detectOffset(b).catch(()=>null); btn.disabled = false;
    if(off === null){ say("Не получилось определить: на страницах не видно номеров. Впиши сдвиг вручную.", true); return; }
    const m = S.book(b.id); m.offset = off; await S.setBook(b.id, m); renderAccount(b.id); sayTarget = "status-"+b.id; say(`Сдвиг страниц: ${off}. Номера «стр.» теперь совпадают с книгой.`); }));
  Study.bindKnow(main);
  main.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>Reader.open(ACCB().find(x=>x.id===btn.dataset.open), 0, "")));
  main.querySelectorAll("[data-tocai]").forEach(btn=>btn.addEventListener("click",()=>{ const b = ACCB().find(x=>x.id===btn.dataset.tocai); sayTarget = "status-"+b.id; btn.disabled = true;
    tocPagesAi(b, parseInt(main.querySelector(`[data-tocfrom="${b.id}"]`).value,10), parseInt(main.querySelector(`[data-tocto="${b.id}"]`).value,10))
      .catch(e=>{ console.error(e); say("Не получилось: "+e.message, true); }).finally(()=>{ btn.disabled = false; }); }));
  main.querySelectorAll("section[data-book]").forEach(sec=>{ const id = sec.dataset.book;
    const save = () => { const m = S.book(id); m.pages = Object.assign({}, m.pages);
      sec.querySelectorAll("input[data-pk]").forEach(i=>{ const v = parseInt(i.value,10); if(v>0) m.pages[i.dataset.pk] = v; else delete m.pages[i.dataset.pk]; });
      m.chapterPages = {}; sec.querySelectorAll("input[data-cpk]").forEach(i=>{ const v = parseInt(i.value,10); if(v>0) m.chapterPages[i.dataset.cpk] = v; });
      m.offset = parseInt(sec.querySelector("[data-off]").value,10)||0; S.setBook(id, m); };
    sec.querySelectorAll("input[data-pk],input[data-cpk],[data-off]").forEach(i=>i.addEventListener("input", save));
  });
}
let sayTarget = "status";
// Поиск страниц тем по тексту PDF: ищем заголовок каждой темы по порядку, пропуская оглавление.
// главы, параграфы и страницы строго по оглавлению учебника: картинки страниц оглавления из PDF -> ИИ читает их
async function tocPagesAi(b, from, to){
  const m0 = S.book(b.id), total = m0.totalPages || 999, off0 = Number(m0.offset)||0;
  if(!(from > 0)) throw new Error("укажи, на какой странице начинается оглавление");
  if(!(to >= from)) to = from;
  if(to - from > 7) throw new Error("оглавление больше 8 страниц: укажи часть, например первые 8");
  const bookFrom = from, bookTo = to;
  // номера как «стр.» в учебнике -> номера страниц в файле (со сдвигом); если вышли за файл, прижимаем к краю
  // на страницу шире с каждой стороны: если сдвиг страниц указан неточно, начало и конец оглавления не потеряются
  from = Math.max(1, Math.min(total, from + off0 - 1)); to = Math.max(from, Math.min(total, to + off0 + 1));
  say(`Готовлю страницы оглавления ${bookFrom}–${bookTo}…`);
  const images = []; for(let n=from; n<=to; n++) images.push(await Reader.pageImage(b, n, 1300));
  say("Учитель читает оглавление…");
  const r = await Store.ask({ mode:"toc", images, text:`Учебник: ${b.subject}, ${b.title}, 9 класс.` });
  const t = String(r.text||""), a = t.indexOf("{"), z = t.lastIndexOf("}"); if(a<0 || z<a) throw new Error("учитель ответил не в том формате");
  // строка оглавления без подпунктов («Ответы … 239») становится главой с одной темой того же названия
  const chapters = (JSON.parse(t.slice(a, z+1)).chapters||[]).map(c=>{ const title = String(c.title||"").trim(), topics = (c.topics||[]).filter(x=>x && String(x.title||"").trim()).map(x=>({ title:String(x.title).trim(), page:x.page }));
    return { title, topics: topics.length ? topics : parseInt(c.page,10) > 0 ? [{ title, page:c.page }] : [] }; }).filter(c=>c.title && c.topics.length);
  if(!chapters.length) throw new Error("на этих страницах не нашлось оглавления. Проверь номера страниц");
  // главы строго как в книге: вся структура учебника заменяется оглавлением
  const gi = 0;
  await Store.set("toc-"+b.id, { chapters, ts:Date.now(), src:"pdf" }, 0);
  Study.applyToc();
  const m = S.book(b.id); m.pages = {}; m.chapterPages = {}; m.tocPdf = [bookFrom, bookTo];
  let n = 0;
  chapters.forEach((c,ci)=>c.topics.forEach((x,pi)=>{ const pg = parseInt(x.page,10); if(pg>0){ m.pages[`${b.id}.${gi}.${ci}.${pi}`] = pg; n++; if(pi===0) m.chapterPages[`${gi}.${ci}`] = pg; } }));
  await S.setBook(b.id, m);
  const all = chapters.reduce((s,c)=>s+c.topics.length,0);
  let extra = "";
  if(b.exam){ say("Оглавление готово. Ищу в нём ответы, инструкцию и справочные материалы…"); const done = await Study.ogeAutoPrep(b, say); if(done.length) extra = ` Ещё прочитано: ${done.join(", ")}.`; }
  renderAccount(b.id); sayTarget = "status-"+b.id;
  say(`Готово: ${pl(chapters.length,"глава","главы","глав")} и ${pl(all,"параграф","параграфа","параграфов")} как в учебнике, страницы у ${n}.${extra} Проверь их ниже.`);
}
// сдвиг «страниц в файле до первой страницы книги»: берём страницы из середины файла и сравниваем номер в файле с напечатанным
async function detectOffset(b){
  const m = S.book(b.id), total = m.totalPages || 0; if(total < 6) return null;
  const mid = Math.max(2, Math.floor(total/2)), pages = [mid, mid+1, mid+2, mid+5].filter(n=>n<=total), votes = {};
  // 1) по тексту страницы: номер стоит отдельной строкой в начале или в конце
  for(const n of pages){ let t = ""; try{ t = await Reader.pageText(b, n); }catch(e){}
    const lines = t.split("\n").map(x=>x.trim()).filter(Boolean), edge = lines.slice(0,3).concat(lines.slice(-3));
    new Set(edge.filter(x=>/^\d{1,3}$/.test(x)).map(Number)).forEach(c=>{ const off = n - c; if(off > -30 && off < 200) votes[off] = (votes[off]||0) + 1; }); }
  let best = Object.entries(votes).sort((a,c)=>c[1]-a[1])[0];
  if(best && best[1] >= 2) return Number(best[0]);
  // 2) если текста нет (скан): ИИ смотрит на картинки двух страниц и читает напечатанный номер
  if(!Store.aiAvailable()) return null;
  try{ const two = pages.slice(0,2), images = [];
    for(const n of two) images.push(await Reader.pageImage(b, n, 900));
    const r = await Store.ask({ mode:"pagenum", images, text:`Картинок: ${images.length}.` });
    const t = String(r.text||""), a = t.indexOf("{"), z = t.lastIndexOf("}"), j = JSON.parse(t.slice(a, z+1)), offs = (j.pages||[]).map((p,i)=>parseInt(p,10) > 0 ? two[i] - parseInt(p,10) : null).filter(x=>x!==null);
    if(offs.length && offs.every(x=>x===offs[0]) && offs[0] > -30 && offs[0] < 200) return offs[0];
  }catch(e){ console.warn("offset", e); }
  return null;
}
function upErr(e){ const m = String((e && (e.message || e.error)) || e || "");
  if(/row-level security|policy|403|Unauthorized/i.test(m)) return "облако не разрешило сохранить файл (нужно заново запустить SQL из файла all-sql)";
  if(/too large|exceeded|413|maximum allowed size/i.test(m)) return "файл слишком большой для облака";
  if(/Failed to fetch|NetworkError|network|timeout/i.test(m)) return "оборвалось соединение, попробуй ещё раз";
  return m.slice(0, 200) || "неизвестная ошибка"; }
function say(t, err){ const st = $(sayTarget); if(st){ st.textContent = t; st.classList.toggle("err", !!err); } }
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("script "+src)); document.head.appendChild(s); }); }

async function handleFile(b, file, after){
  if(!file) return;
  if(file.type && file.type !== "application/pdf"){ say("Нужен файл в формате PDF.", true); return; }
  say("Читаю файл…");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let n;
  try{ const d = await pdfjsLib.getDocument({data: bytes.slice()}).promise; n = d.numPages; d.destroy(); }
  catch(e){ say("Не получилось открыть этот PDF. Проверь, что файл не повреждён.", true); return; }
  const stamp = Date.now(), parts = [];
  if(file.size <= Store.maxPart){
    say(Store.mode==="cloud" ? `Загружаю в облако ${Math.round(file.size/1048576)} МБ, это может занять несколько минут, не закрывай страницу…` : "Сохраняю учебник…");
    const path = `${Store.mode==="cloud"?"shared/":""}books/${b.id}/${stamp}-1.pdf`;
    await Store.putFile(path, new Blob([bytes], {type:"application/pdf"}));
    parts.push({from:1, to:n, path});
  } else {
    if(!window.PDFLib) await loadScript(PDFLIB_URL);
    const src = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true});
    const per0 = Math.max(1, Math.floor(n * Store.maxPart * 0.85 / file.size));
    let from = 1, i = 1;
    while(from <= n){
      let to = Math.min(n, from + per0 - 1), out;
      for(;;){
        const part = await PDFLib.PDFDocument.create();
        const idx = []; for(let k=from-1;k<to;k++) idx.push(k);
        (await part.copyPages(src, idx)).forEach(p=>part.addPage(p));
        out = await part.save();
        if(out.byteLength <= Store.maxPart || to === from) break;
        to = from + Math.max(0, Math.floor((to-from+1)/2) - 1);
      }
      say(`Загружаю в облако: страницы ${from}–${to} из ${n}…`);
      const path = `${Store.mode==="cloud"?"shared/":""}books/${b.id}/${stamp}-${i++}.pdf`;
      await Store.putFile(path, new Blob([out], {type:"application/pdf"}));
      parts.push({from, to, path});
      from = to + 1;
    }
  }
  const m = S.book(b.id), old = m.chunks || [];
  m.chunks = parts; m.totalPages = n; m.fileName = file.name;
  await S.setBook(b.id, m);
  const inShared = ((Store.getShared && Store.getShared("book-"+b.id)) || {}).chunks || [];
  for(const c of old){ if(inShared.some(x=>x.path===c.path)) continue; try{ await Store.removeFile(c.path) }catch(e){} }
  if(window.Reader) Reader.clearCache();
  say("Определяю, с какой страницы файла начинается нумерация книги…");
  let offNote = "";
  try{ const off = await detectOffset(b); if(off !== null){ const m2 = S.book(b.id); m2.offset = off; await S.setBook(b.id, m2); offNote = ` Сдвиг страниц определён сам: ${off}.`; } else offNote = " Сдвиг страниц определить не вышло, проверь его в «Номерах страниц параграфов»."; }catch(e){}
  if(after) after(); else renderAccount();
  say(`Готово: ${pl(n,"страница","страницы","страниц")}.${offNote} ${Store.mode==="cloud"?"Учебник откроется на любом устройстве после входа.":"Учебник сохранён в этом браузере."}`);
}

/* ================= ДОСКА ================= */
const B = { W:1600, H:1000, tool:"pen", color:"#1b2333", size:4, undo:[], cur:null, list:[], dirty:false, timer:null, ctx:null };
const COLORS = ["#1b2333","#2a4fd6","#d23c3c","#1f8a5a","#e08a00"];
function boardsIndex(){ const v = Store.get("boards", null); return v && v.list ? v.list : []; }
async function renderBoard(host){
  host = host || B.host; B.host = host;
  B.list = boardsIndex();
  if(!B.list.length){ B.list = [{id:"b"+Date.now(), title:"Лист 1", updated:Date.now()}]; Store.set("boards", {list:B.list}, 0); }
  let cur = null; try{ cur = localStorage.getItem("dasha:board") }catch(e){}
  if(!B.list.find(x=>x.id===cur)) cur = B.list[0].id;
  B.cur = cur;
  host.innerHTML = `<section class="panel"><div class="boardhead"><h3 style="margin:0">Доска</h3>
      <select id="bsel" aria-label="Лист">${B.list.map(x=>`<option value="${x.id}" ${x.id===cur?"selected":""}>${esc(x.title)}</option>`).join("")}</select>
      <button class="ibtn" id="bnew" type="button" title="Новый лист" aria-label="Новый лист">＋</button></div>
    <div class="boardtools" role="toolbar" aria-label="Инструменты">
      <button class="ibtn" data-tool="pen" type="button" aria-pressed="true" title="Ручка" aria-label="Ручка">✏️</button>
      <button class="ibtn" data-tool="marker" type="button" aria-pressed="false" title="Маркер" aria-label="Маркер">🖍️</button>
      <button class="ibtn" data-tool="text" type="button" aria-pressed="false" title="Текст" aria-label="Текст">T</button>
      <button class="ibtn" data-tool="eraser" type="button" aria-pressed="false" title="Ластик" aria-label="Ластик">⌫</button>
      ${COLORS.slice(0,4).map((c,i)=>`<button class="swatch sm-sw" data-color="${c}" style="background:${c}" type="button" aria-label="Цвет ${i+1}" aria-pressed="${i===0}"></button>`).join("")}
      <button class="ibtn" id="bundo" type="button" title="Отменить" aria-label="Отменить">↶</button>
      <details class="more"><summary class="ibtn" title="Ещё" aria-label="Ещё">⋯</summary><div class="morebox">
        <label class="sm">Название листа<input id="btitle" value="${esc((B.list.find(x=>x.id===cur)||{}).title||"")}" maxlength="60"></label>
        <label class="sm">Толщина<input type="range" id="bsize" min="2" max="24" value="4"></label>
        <button class="btn" id="bclear" type="button">Очистить</button><button class="btn" id="bdel" type="button">Удалить лист</button></div></details>
      <span style="flex:1"></span>
      <button class="btn primary" id="bask" type="button">Учителю</button>
    </div>
    <div class="boardbox" id="bbox"><canvas id="bcanvas" width="${B.W}" height="${B.H}"></canvas><input id="boardtext" hidden aria-label="Текст на доске"></div>
    <p class="status" id="bstatus" aria-live="polite"></p></section>`;
  const cv = $("bcanvas"); B.ctx = cv.getContext("2d"); B.undo = [];
  await loadBoard(cur);
  // инструменты
  $("main").querySelectorAll("[data-tool]").forEach(t=>t.addEventListener("click",()=>{ B.tool = t.dataset.tool; $("main").querySelectorAll("[data-tool]").forEach(x=>x.setAttribute("aria-pressed", x===t)); }));
  $("main").querySelectorAll("[data-color]").forEach(t=>t.addEventListener("click",()=>{ B.color = t.dataset.color; $("main").querySelectorAll("[data-color]").forEach(x=>x.setAttribute("aria-pressed", x===t)); if(B.tool==="eraser"){ B.tool="pen"; $("main").querySelectorAll("[data-tool]").forEach(x=>x.setAttribute("aria-pressed", x.dataset.tool==="pen")); } }));
  $("bsize").addEventListener("input",e=>B.size = Number(e.target.value));
  $("bundo").addEventListener("click",()=>{ const s = B.undo.pop(); if(s){ B.ctx.putImageData(s,0,0); changed(); } });
  let clearArm = 0;
  $("bclear").addEventListener("click",e=>{ if(Date.now()-clearArm < 3000){ pushUndo(); B.ctx.clearRect(0,0,B.W,B.H); changed(); e.target.textContent = "Очистить"; clearArm = 0; } else { clearArm = Date.now(); e.target.textContent = "Точно очистить?"; setTimeout(()=>{ if(e.target.isConnected) e.target.textContent = "Очистить"; }, 3000); } });
  $("bsel").addEventListener("change",async e=>{ await flushBoard(); B.cur = e.target.value; try{ localStorage.setItem("dasha:board", B.cur) }catch(_){} renderBoard(); });
  $("btitle").addEventListener("input",e=>{ const it = B.list.find(x=>x.id===B.cur); if(it){ it.title = e.target.value || "Без названия"; Store.set("boards", {list:B.list}, 800); const o = $("bsel").querySelector(`option[value="${B.cur}"]`); if(o) o.textContent = it.title; } });
  $("bnew").addEventListener("click",async()=>{ await flushBoard(); const id = "b"+Date.now(); B.list.unshift({id, title:`Лист ${B.list.length+1}`, updated:Date.now()}); Store.set("boards", {list:B.list}, 0); try{ localStorage.setItem("dasha:board", id) }catch(_){} renderBoard(); });
  let delArm = 0;
  $("bdel").addEventListener("click",async e=>{
    if(Date.now()-delArm >= 3000){ delArm = Date.now(); e.target.textContent = "Точно удалить?"; setTimeout(()=>{ if(e.target.isConnected) e.target.textContent = "Удалить лист"; }, 3000); return; }
    clearTimeout(B.timer); B.dirty = false;
    B.list = B.list.filter(x=>x.id!==B.cur); Store.set("boards", {list:B.list}, 0);
    try{ await Store.removeFile(`boards/${B.cur}.png`) }catch(_){}
    renderBoard();
  });
  $("bask").addEventListener("click",async()=>{ await flushBoard(); pendingBoard = B.cur; if(!$("tutorchat")){ if(Study.Dock.kind()!=="general") renderGeneralChat(); Study.Dock.open(); } const cb = $("chatboard"); if(cb){ cb.checked = true; const ci = $("chatin"); if(!ci.value.trim()) ci.value = "Проверь моё решение на доске. Найди ошибки, но не решай за меня."; ci.focus(); ci.scrollIntoView({block:"center", behavior:"smooth"}); } });
  // рисование
  let drawing = false, last = null;
  const pos = ev => { const r = cv.getBoundingClientRect(); return { x:(ev.clientX-r.left)*B.W/r.width, y:(ev.clientY-r.top)*B.H/r.height, cx: ev.clientX-r.left, cy: ev.clientY-r.top }; };
  cv.addEventListener("pointerdown",ev=>{
    const p = pos(ev);
    if(B.tool==="text"){ ev.preventDefault(); setTimeout(()=>placeText(p), 0); return; }
    drawing = true; last = p; pushUndo(); cv.setPointerCapture(ev.pointerId); stroke(p, p);
  });
  cv.addEventListener("pointermove",ev=>{ if(!drawing) return; const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; evs.forEach(e=>{ const p = pos(e); stroke(last, p); last = p; }); });
  const end = () => { if(drawing){ drawing = false; changed(); } };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
}
function stroke(a, b){
  const c = B.ctx; c.save(); c.lineCap = "round"; c.lineJoin = "round";
  if(B.tool==="eraser"){ c.globalCompositeOperation = "destination-out"; c.lineWidth = B.size*4; c.strokeStyle = "#000"; }
  else if(B.tool==="marker"){ c.globalAlpha = .35; c.lineWidth = B.size*4; c.strokeStyle = B.color; }
  else { c.lineWidth = B.size; c.strokeStyle = B.color; }
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x+0.01, b.y); c.stroke(); c.restore();
}
function pushUndo(){ B.undo.push(B.ctx.getImageData(0,0,B.W,B.H)); if(B.undo.length > 25) B.undo.shift(); }
function placeText(p){
  const inp = $("boardtext"), cv = $("bcanvas"), k = cv.getBoundingClientRect().width / B.W, fs = Math.max(30, B.size*8);
  inp.hidden = false; inp.value = ""; inp.style.left = p.cx+"px"; inp.style.top = (p.cy - fs*k*0.8)+"px"; inp.style.fontSize = (fs*k)+"px"; inp.style.color = B.color; inp.focus();
  const finish = commit => { inp.onkeydown = null; inp.onblur = null; inp.hidden = true;
    if(commit && inp.value.trim()){ pushUndo(); const c = B.ctx; c.save(); c.fillStyle = B.color; c.font = `${fs}px "Golos Text", system-ui, sans-serif`; c.textBaseline = "alphabetic"; c.fillText(inp.value, p.x, p.y); c.restore(); changed(); } };
  inp.onkeydown = e => { if(e.key==="Enter"){ e.preventDefault(); finish(true); } else if(e.key==="Escape") finish(false); };
  inp.onblur = () => finish(true);
}
function changed(){ B.dirty = true; clearTimeout(B.timer); const st = $("bstatus"); if(st) st.textContent = "Есть несохранённые изменения…"; B.timer = setTimeout(flushBoard, 2500); }
function boardBlob(withWhite){
  const c = document.createElement("canvas"); c.width = B.W; c.height = B.H; const x = c.getContext("2d");
  if(withWhite){ x.fillStyle = "#fff"; x.fillRect(0,0,B.W,B.H); }
  x.drawImage($("bcanvas"), 0, 0);
  return new Promise(res=>c.toBlob(res, "image/png"));
}
async function flushBoard(){
  clearTimeout(B.timer);
  if(!B.dirty || !$("bcanvas")) return;
  B.dirty = false; const id = B.cur;
  try{
    const blob = await boardBlob(false);
    await Store.putFile(`boards/${id}.png`, blob);
    const it = B.list.find(x=>x.id===id); if(it){ it.updated = Date.now(); Store.set("boards", {list:B.list}, 300); }
    const st = $("bstatus"); if(st && B.cur===id) st.textContent = "Сохранено.";
  }catch(e){ B.dirty = true; const st = $("bstatus"); if(st) st.textContent = "Не получилось сохранить в облако. Попробую ещё раз при следующем изменении."; }
}
async function loadBoard(id){
  B.ctx.clearRect(0,0,B.W,B.H);
  try{ const blob = await Store.getFile(`boards/${id}.png`); if(blob){ const img = await createImageBitmap(blob); B.ctx.drawImage(img,0,0); } }catch(e){}
}
window.addEventListener("beforeunload", ()=>{ if(B.dirty) flushBoard(); });

/* ================= ИИ-УЧИТЕЛЬ ================= */
let pendingBoard = null;
let chat = []; try{ chat = JSON.parse(localStorage.getItem("dasha:chat")||"[]") }catch(e){ chat = [] }
const saveChat = () => { try{ localStorage.setItem("dasha:chat", JSON.stringify(chat.slice(-40).map(m=>({role:m.role, content:m.content, board:!!m.board})))) }catch(e){} };
const SUBJ_ALL = GRADE_SUBJECTS.map(([id,n])=>[id,n]);
let tutorAv = null, tutorPhoto = null;
let drawMode = false;
function renderTutor(){
  $("main").innerHTML = `<section class="panel tutormain"><h2>ИИ-учитель</h2><div id="tutorchat"></div></section>
    <div id="tutorboard"></div>`;
  Study.Dock.away(()=>{ if(tutorAv){ tutorAv.destroy(); tutorAv = null; } });
  renderGeneralChat($("tutorchat"));
  renderBoard($("tutorboard"));
}
// общий чат с учителем: живёт в выдвижной панели справа, когда страница не дала свой (тема, ОГЭ)
function renderGeneralChat(host){
  const ok = Store.aiAvailable();
  let subj = "algebra"; try{ subj = localStorage.getItem("dasha:subj") || "algebra" }catch(e){}
  const body = host || Study.Dock.claim("general", "Учитель Клод", "Спрашивай что угодно по учёбе", ()=>{ if(tutorAv){ tutorAv.destroy(); tutorAv = null; } });
  body.innerHTML = `
    ${ok ? "" : `<p class="note"><b>Пока не подключён.</b> ${Store.mode==="cloud" ? "Для ИИ-учителя нужен ключ на сервере. Остальные разделы работают." : "Сайт ещё не подключён к облаку, поэтому ИИ-учитель недоступен."}</p>`}
    <div class="tutorstage" id="tutorstage"></div>
    <div class="chat" id="chatlog" aria-live="polite"></div>
    <form class="chatform" id="chatform">
      <div class="quick">
        <button class="btn" type="button" data-q="Объясни тему на жизненном примере: ">Объясни тему</button>
        <button class="btn" type="button" data-q="Проверь моё решение. Найди ошибки, но не решай за меня." data-photo="1">Проверь решение</button>
        <button class="btn" type="button" data-draw="1">✏️ Нарисуй</button>
        <button class="btn" type="button" data-q="Дай мне одну задачу как в ОГЭ по этой теме и не говори ответ: ">Задача как в ОГЭ</button>
      </div>
      <textarea id="chatin" placeholder="Спроси что угодно по учёбе… Enter — отправить" aria-label="Вопрос"></textarea>
      <div class="chatrow">
        <select id="chatsubj" aria-label="Предмет">${SUBJ_ALL.map(([id,n])=>`<option value="${id}" ${id===subj?"selected":""}>${esc(n)}</option>`).join("")}</select>
        <button class="ibtn" type="button" id="chatphoto" title="Приложить фото" aria-label="Приложить фото">📷</button>
        <label class="ibtn ck" title="Приложить лист с доски"><input type="checkbox" id="chatboard" ${pendingBoard?"checked":""}> 📋</label><span id="chatphotoprev"></span>
        <span style="flex:1"></span>
        <button class="ibtn" type="button" id="chatnew" title="Новый разговор" aria-label="Новый разговор">↺</button>
        <button class="btn primary" type="submit" id="chatsend" ${ok?"":"disabled"}>Отправить</button>
      </div>
    </form>`;
  drawChat();
  if(tutorAv) tutorAv.destroy();
  tutorAv = Avatar.create($("tutorstage"), {compact:true}); tutorAv.start();
  tutorAv.say(ok ? "Привет, Даша! Спрашивай, разберёмся вместе" : "Я пока не подключён, но скоро буду помогать", 5000);
  if(pendingBoard){ $("chatin").value = "Проверь моё решение на доске. Найди ошибки, но не решай за меня."; }
  try{ const q = sessionStorage.getItem("dasha:tutorq"); if(q){ sessionStorage.removeItem("dasha:tutorq"); $("chatin").value = q; const sj = sessionStorage.getItem("dasha:tutorsubj"); if(sj && $("chatsubj").querySelector(`option[value="${sj}"]`)) $("chatsubj").value = sj; $("chatin").focus(); } }catch(e){}
  const drawTP = () => { const el = $("chatphotoprev"); if(!el) return; el.innerHTML = tutorPhoto ? `<span class="photochip"><img src="${tutorPhoto.url}" alt="Приложенное фото"><button class="pg" type="button" id="chatphotorm" aria-label="Убрать фото">✕</button></span>` : ""; const rm = $("chatphotorm"); if(rm) rm.addEventListener("click", ()=>{ tutorPhoto = null; drawTP(); }); };
  const pickTP = async () => { const got = await Photo.pick(false); if(got[0]){ tutorPhoto = got[0]; drawTP(); } };
  $("chatphoto").addEventListener("click", pickTP); drawTP();
  body.querySelector("[data-draw]").addEventListener("click",()=>{ const v = $("chatin").value.trim(); drawMode = true; $("chatin").value = v ? "Нарисуй: " + v : "Нарисуй это схематично, чтобы было понятнее."; if(!v && !chat.length){ $("chatin").value = "Нарисуй: "; $("chatin").focus(); drawMode = false; return; } $("chatform").requestSubmit(); });
  body.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>{ if(b.dataset.photo && !tutorPhoto) pickTP(); $("chatin").value = b.dataset.q; if(b.dataset.q.includes("доске")) $("chatboard").checked = true; $("chatin").focus(); }));
  $("chatsubj").addEventListener("change",e=>{ try{ localStorage.setItem("dasha:subj", e.target.value) }catch(_){} });
  $("chatnew").addEventListener("click",()=>{ chat = []; saveChat(); drawChat(); });
  $("chatin").addEventListener("keydown",e=>{ if(e.key==="Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); $("chatform").requestSubmit(); } });
  $("chatform").addEventListener("submit", async e=>{
    e.preventDefault();
    const text = $("chatin").value.trim(); if(!text || !Store.aiAvailable()) return;
    let image = null, boardUrl = null;
    if($("chatboard").checked){
      const bid = pendingBoard || (()=>{ try{ return localStorage.getItem("dasha:board") }catch(_){ return null } })();
      try{ const blob = bid && await Store.getFile(`boards/${bid}.png`);
        if(blob){ image = await toWhitePngBase64(blob); boardUrl = "data:image/png;base64,"+image; } }catch(_){}
    }
    pendingBoard = null;
    let imageType = "png", photo = false;
    if(tutorPhoto){ image = tutorPhoto.b64; imageType = "jpeg"; photo = true; boardUrl = null; tutorPhoto = null; const el = $("chatphotoprev"); if(el) el.innerHTML = ""; }
    if(window.Points) Points.logAct();
    chat.push({role:"user", content:text, board:!!image && !photo, photo, img:boardUrl}); $("chatin").value = ""; $("chatboard").checked = false;
    const thinking = {role:"assistant", content:"Думаю…", pending:true}; chat.push(thinking); drawChat();
    if(tutorAv){ tutorAv.stop(); tutorAv.setMood("think"); tutorAv.say("Хм, сейчас подумаю…"); }
    $("chatsend").disabled = true;
    try{
      const msgs = chat.filter(m=>!m.pending && !m.err).slice(-16).map(m=>({role:m.role, content:m.content}));
      const subjName = (SUBJ_ALL.find(s=>s[0]===$("chatsubj").value)||[])[1] || "";
      const r = await Store.ask({ mode: text.startsWith("Нарисуй") ? "draw" : text.startsWith("Мне непонятно это место") ? "selection" : image ? "check" : "chat", subject: subjName, messages: msgs, image, imageType });
      thinking.content = Study.marks(r.text || "Пустой ответ.").text; delete thinking.pending;
    }catch(err){ thinking.content = "Не получилось получить ответ: " + err.message; thinking.err = true; delete thinking.pending; }
    Study.Dock.ping();
    if(tutorAv && tutorAv.el.isConnected){ tutorAv.setMood(thinking.err ? "squint" : "smile"); tutorAv.say(thinking.err ? "Ой, что-то пошло не так" : "Вот что я думаю!", 3000); setTimeout(()=>{ if(tutorAv){ tutorAv.setMood("idle"); tutorAv.start(); } }, 3000); }
    $("chatsend").disabled = false; saveChat(); drawChat();
  });
  if(askAuto){ const d = askAuto; askAuto = null; fireAsk(d); }
}
// «❓ Непонятно» из учебника без темы (сборник ОГЭ, страница без параграфа): в общий чат учителя
let askAuto = null;
function fireAsk(d){
  tutorPhoto = { b64:d.image, url:"data:image/jpeg;base64,"+d.image };
  const sj = d.book.exam==="rus" ? "rus" : d.book.exam ? "algebra" : d.book.id;
  if($("chatsubj") && $("chatsubj").querySelector(`option[value="${sj}"]`)) $("chatsubj").value = sj;
  $("chatin").value = `Мне непонятно это место в «${d.book.title}», стр. ${d.bookPage} (на фото).${d.text ? ` Текст: «${d.text}».` : ""} Объясни, пожалуйста.`;
  Study.Dock.open(); $("chatform").requestSubmit();
}
window.App.askGeneral = d => { if($("chatform")) fireAsk(d); else { askAuto = d; location.hash = "#tutor"; } };
function drawChat(){
  const log = $("chatlog"); if(!log) return;
  log.innerHTML = chat.length ? chat.map(m=>`<div class="msg ${m.role==="user"?"me":"ai"} ${m.err?"err":""}">${m.role==="user" ? esc(m.content) : Draw.html(m.content)}${m.img?`<img src="${m.img}" alt="Лист с доски">`:(m.board?`<br><small>📎 лист с доски</small>`:m.photo?`<br><small>📷 фото</small>`:"")}</div>`).join("")
    : `<p class="emptychat">Здесь появится разговор. Например: «Объясни, как решать квадратные неравенства методом интервалов».</p>`;
  Draw.decorate(log, chat);
  log.scrollTop = log.scrollHeight;
}
async function toWhitePngBase64(blob){
  const img = await createImageBitmap(blob); const s = Math.min(1, 1200/img.width);
  const c = document.createElement("canvas"); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
  const x = c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL("image/png").split(",")[1];
}

/* ================= СТАТИСТИКА ================= */
function renderStats(){
  const all = BOOKS.flatMap(keysOf), doneKeys = all.filter(k=>done[k]);
  const weekMs = 7*864e5, now = Date.now();
  const startOfWeek = (() => { const t = today0(); const w = (t.getDay()+6)%7; t.setDate(t.getDate()-w); return t.getTime(); })();
  const weeks = []; for(let i=7;i>=0;i--){ const a = startOfWeek - i*weekMs; weeks.push({a, b:a+weekMs, n:0}); }
  doneKeys.forEach(k=>{ const t = Number(done[k]); if(t>1e12){ const w = weeks.find(x=>t>=x.a && t<x.b); if(w) w.n++; } });
  const thisWeek = weeks[weeks.length-1].n;
  const g = S.grades();
  const dist = {5:0,4:0,3:0,2:0}; GRADE_SUBJECTS.forEach(([id])=>{ const r = g.g[id]||{}; const v = r.t3||r.t2||r.t1; if(dist[v]!==undefined) dist[v]++; });
  const max = Math.max(4, ...weeks.map(w=>w.n));
  const W = 640, H = 220, L = 34, R = 10, T = 14, Bt = 34, cw = (W-L-R)/weeks.length;
  const y = v => T + (H-T-Bt) * (1 - v/max);
  const ticks = [0, Math.round(max/2), max];
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Параграфы по неделям">
    ${ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${t}</text>`).join("")}
    ${weeks.map((w,i)=>{ const x = L + i*cw + cw*0.18, bw = cw*0.64, d = new Date(w.a);
      return `<rect x="${x}" y="${y(w.n)}" width="${bw}" height="${Math.max(0, y(0)-y(w.n))}" rx="3" fill="${i===weeks.length-1?"var(--accent)":"var(--done)"}"/>`+
        (w.n?`<text x="${x+bw/2}" y="${y(w.n)-4}" text-anchor="middle" font-size="11" fill="var(--ink)">${w.n}</text>`:"")+
        `<text x="${x+bw/2}" y="${H-12}" text-anchor="middle" font-size="11" fill="var(--muted)">${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}</text>`; }).join("")}
  </svg>`;
  const a1 = avg(g,"t1"), aLast = avg(g,"t3") || avg(g,"t2") || a1;
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><div class="dadrow"><h2>Статистика</h2><button class="btn primary" type="button" data-dad>Рассказать папе о моих успехах</button></div>
    <div class="statnums" style="margin-top:14px">
      <div class="count"><div class="big">${doneKeys.length}</div><div class="lbl">параграфов пройдено</div><div class="sm">из ${all.length} во всех учебниках</div></div>
      <div class="count"><div class="big">${thisWeek}</div><div class="lbl">на этой неделе</div><div class="sm">отмечено галочкой</div></div>
      <div class="count"><div class="big">${aLast ? aLast.toFixed(2).replace(".",",") : "—"}</div><div class="lbl">средний балл</div><div class="sm">${a1 && aLast!==a1 ? `в 1-м триместре ${a1.toFixed(2).replace(".",",")}` : "по последнему триместру"}</div></div>
      <div class="count"><div class="big">${dist[5]}</div><div class="lbl">пятёрок сейчас</div><div class="sm">четвёрок ${dist[4]}, троек ${dist[3]}</div></div>
    </div></section>
  <section class="panel"><h3>Параграфы по неделям</h3><div class="chartbox">${svg}</div><p class="hint">Синий столбик показывает текущую неделю. Считаются галочки, поставленные на этом сайте.</p></section>
  <section class="panel"><h3>Прогресс по учебникам</h3><div class="subjrows">${BOOKS.map(b=>`<div class="subjrow" style="--c:${b.color}"><span>${esc(b.subject)}</span><div class="bar"><i style="width:${pct(b)}%"></i></div><span>${pct(b)}%</span></div>`).join("")}</div></section>
  </div>`;
  $("main").querySelector("[data-dad]").addEventListener("click", ()=>Points.openReport());
}

/* ================= ВХОД ================= */
function renderLogin(){
  $("shelf").innerHTML = ""; document.body.classList.add("is-login");
  $("main").innerHTML = `<section class="panel" style="max-width:440px"><h2>Вход</h2>
    <p class="hint" style="margin:0 0 14px">Войди, чтобы прогресс, оценки, учебники и доска синхронизировались на всех устройствах.</p>
    <form id="loginform" class="chatform" style="margin:0">
      <label for="lemail" class="sm">Почта</label><input id="lemail" type="email" autocomplete="email" required class="pgin" style="width:100%;font-family:var(--f-body);padding:10px">
      <label for="lpass" class="sm">Пароль (не меньше 6 символов)</label><input id="lpass" type="password" autocomplete="current-password" minlength="6" required class="pgin" style="width:100%;font-family:var(--f-body);padding:10px">
      <div class="chatrow"><button class="btn primary" type="submit">Войти</button><button class="btn" type="button" id="lsignup">Создать аккаунт</button></div>
      <p class="status" id="lstatus" aria-live="polite"></p>
    </form></section>`;
  const st = (t,err) => { $("lstatus").textContent = t; $("lstatus").classList.toggle("err", !!err); };
  $("loginform").addEventListener("submit", async e=>{ e.preventDefault(); st("Вхожу…");
    try{ await Store.signIn($("lemail").value.trim(), $("lpass").value); }
    catch(err){ st(/confirm/i.test(err.message) ? "Сначала подтверди почту по ссылке из письма." : "Неверная почта или пароль.", true); } });
  $("lsignup").addEventListener("click", async()=>{ if(!$("loginform").reportValidity()) return; st("Создаю аккаунт…");
    try{ const ready = await Store.signUp($("lemail").value.trim(), $("lpass").value); st(ready ? "Аккаунт создан." : "Аккаунт создан. Открой письмо и подтверди почту, потом войди.", false); }
    catch(err){ st("Не получилось создать аккаунт: " + err.message, true); } });
}

/* ================= МАРШРУТЫ ================= */
let eNb = null;
function emptyNb(e){ if(eNb) eNb.destroy(); eNb = Notebook.mount($("enb"), { bookId:e.id, key:"all", ruled: e.id==="rus", title:`Тетрадь · ${e.subject}`, sub: e.id==="rus" ? "В линейку, как школьная тетрадь по русскому." : "В клетку." }); }
async function route(){ document.body.classList.remove("is-login");
  Study.Dock.begin();
  await routeInner();
  if(Store.mode==="cloud" && !Store.user) Study.Dock.hide(); else Study.Dock.end(renderGeneralChat);
}
async function routeInner(){
  if(Store.mode==="cloud" && !Store.user){ $("authbar").hidden = true; $("streakbar").hidden = true; $("mebtn").hidden = true; renderLogin(); return; }
  $("authbar").hidden = true; Study.drawMe();
  $("logout").hidden = Store.mode!=="cloud";
  const id = (location.hash||"").slice(1) || "home";
  if(id !== "tutor") await flushBoard();
  if(window.Oge) Oge.leave();
  if(window.Topic) Topic.leave();
  if(window.Solve) Solve.leave();
  if(window.Study) Study.leaveCut();
  if(eNb){ eNb.destroy(); eNb = null; }
  if(id.startsWith("t/")){ renderShelf(id.split("/")[1]); return Topic.render(id.slice(2)); }
  if(id.startsWith("oge/")){ const [, e, n] = id.split("/"); renderShelf("oge-"+e); return n && n[0]==="r" ? Oge.review(e, n.slice(1)) : n ? Oge.openTask(e, Number(n)) : Oge.render(e); }
  if(id.startsWith("account/")){ renderShelf("account"); const sub = id.slice(8); if(window.Points) Points.renderBar();
    return sub==="books" ? renderAccount() : sub==="settings" ? renderAccountSettings() : sub==="profile" ? renderAccountProfile() : renderAccountHome(); }
  if(id.startsWith("cut/")){ renderShelf("account"); return Study.renderCut(id.slice(4)); }
  if(id.startsWith("q/")){ renderShelf(id.split("/")[1]); return Topic.renderQuiz(id.slice(2)); }
  if(window.Points) Points.renderBar();
  if(window.Journal) Journal.notify();
  renderShelf(id);
  const b = BOOKS.find(x=>x.id===id), e = EMPTY.find(x=>x.id===id);
  if(b) return mountBook(b);
  curBook = null;
  if(e){ $("main").innerHTML = `<article class="book" style="--c:${e.color}"><div class="book-head"><div class="subject">${esc(e.subject)}</div><h2>${esc(e.subject)}. 9 класс</h2><p class="meta">Учебник ещё не добавлен</p></div><div class="placeholder"><p>Здесь появятся главы, как только будет фото обложки и оглавления.</p><ul><li>фото обложки (видны авторы)</li><li>фото страниц с оглавлением</li></ul></div></article><section class="panel" id="enb" style="margin-top:16px"></section>`, emptyNb(e); $("main").insertAdjacentHTML("beforeend", Study.tocPanel(e.id)); Study.bindToc($("main")); return; }
  if(id==="board"){ location.replace("#tutor"); return; }
  if(id==="tutor") return renderTutor();
  if(id==="stats") return renderStats();
  if(id==="memos") return Study.renderMemos();
  if(id==="account") return renderAccountHome();
  if(id==="admin") return Study.renderAdmin();
  if(id==="diary") return Journal.renderDiary();
  if(id==="calendar") return Calendar.render();
  if(id==="fill"){ location.replace("#diary"); return; }
  if(id==="schedule"){ location.replace("#diary"); return; }
  if(id==="rewards") return Points.renderRewards();
  if(id==="oge") return Oge.render();
  if(id==="solve") return Solve.render();
  return renderHome();
}

$("logout").addEventListener("click", async()=>{ await flushBoard(); await Store.signOut(); route(); });
window.addEventListener("hashchange", route);

/* старт: после загрузки всех скриптов (reader, avatar, points, oge) */
const boot = async()=>{
  try{ await Store.init(); }catch(e){ console.error(e); }
  Store.onAuth = async u => { if(u){ try{ await Store.loadAll() }catch(e){} } loadDone(); if(window.Study) Study.apply(); route(); };
  Store.onSaveError = () => { const n = $("savewarn"); if(n){ n.hidden = false; setTimeout(()=>n.hidden = true, 6000); } };
  loadDone(); if(window.Study) Study.apply(); route();
};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
