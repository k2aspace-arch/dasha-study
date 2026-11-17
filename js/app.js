// Дашины учебники: главная, учебники с просмотром PDF, доска, ИИ-учитель, статистика.
(function(){
const BOOKS = window.BOOKS, EMPTY = window.EMPTY, CAL = window.CAL;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pl = (n,a,b,c) => { const m=Math.abs(n)%100, d=m%10; return `${n} ${m>10&&m<20?c:d===1?a:d>=2&&d<=4?b:c}` };
const keysOf = b => b.groups.flatMap((g,gi)=>g.chapters.flatMap((c,ci)=>c.p.map((_,pi)=>`${b.id}.${gi}.${ci}.${pi}`)));
const PDFLIB_URL = "js/vendor/pdf-lib.min.js";
const NAV = [["home","Главная","⌂"],["board","Доска","✎"],["tutor","ИИ-учитель","?"],["stats","Статистика","▤"],["account","Личный кабинет","◉"]];
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
    `<div class="shelf-label">Учебники</div>` +
    BOOKS.map(b=>`<a href="#${b.id}" style="--c:${b.color}" ${cur===b.id?'aria-current="page"':''}><span class="spine"></span><span class="nm">${esc(b.subject)}</span><span class="pc" data-pc="${b.id}">${pct(b)}%</span></a>`).join("") +
    `<div class="shelf-label">Ждут фото учебника</div>` +
    EMPTY.map(b=>`<a class="empty" href="#${b.id}" style="--c:${b.color}" ${cur===b.id?'aria-current="page"':''}><span class="spine"></span><span class="nm">${esc(b.subject)}</span></a>`).join("");
}

/* ================= ГЛАВНАЯ ================= */
function gradeOpts(v){
  return ["","5","4","3","2","зач"].map(o=>`<option value="${o}" ${o===v?"selected":""}>${o||"—"}</option>`).join("");
}
function avg(g, t){ const n = GRADE_SUBJECTS.map(([id])=>Number(g.g[id]&&g.g[id][t])).filter(x=>x>=2); return n.length ? (n.reduce((a,b)=>a+b,0)/n.length) : null; }
function renderHome(){
  const g = S.grades();
  const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const cnt = [[schoolDaysLeft(), "учебных дней осталось", `до ${LONG_DATE.format(day(CAL.end))}, без выходных и каникул`]]
    .concat(CAL.oge.map(([d,t])=>[daysUntil(d), t.replace("ОГЭ по ","до ОГЭ: "), `${LONG_DATE.format(day(d))}, по проекту расписания`]));
  const notFive = GRADE_SUBJECTS.filter(([id])=>{ const r = g.g[id]||{}; const v = r.t2 || r.t1; return v && v!=="5" && v!=="зач"; });
  const rows = GRADE_SUBJECTS.map(([id,name])=>{ const r = g.g[id] || {};
    return `<tr><td>${esc(name)}</td>${["t1","t2","t3","y"].map(t=>`<td><select id="gr-${id}-${t}" data-g="${id}" data-t="${t}" class="g${esc(r[t]||"")}" aria-label="${esc(name)}, ${t==="y"?"год":t[1]+"-й триместр"}">${gradeOpts(r[t]||"")}</select></td>`).join("")}</tr>`; }).join("");
  const fa = t => { const a = avg(g,t); return a ? a.toFixed(2).replace(".",",") : "—"; };
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><div class="quoterow"><p class="quote" id="quote">${esc(q)}</p><button class="btn" id="nextq" type="button">Ещё фраза</button></div></section>
  <section class="panel"><h3>Сколько осталось</h3>
    <div class="counts">${cnt.map(([n,l,s])=>`<div class="count"><div class="big">${Math.max(0,n)}</div><div class="lbl">${esc(l)}</div><div class="sm">${esc(s)}</div></div>`).join("")}</div>
    <p class="nowline">${esc(nowLine())}</p>
    <p class="hint">Каникулы и конец года взяты по обычному графику триместров, сверь их со школой. Даты ОГЭ взяты из проекта расписания на 2027 год и могут измениться.</p>
  </section>
  <section class="panel"><h3>Оценки</h3>
    <div class="tablewrap"><table class="grades"><thead><tr><th>Предмет</th><th>1 трим.</th><th>2 трим.</th><th>3 трим.</th><th>Год</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td>Средний балл</td><td>${fa("t1")}</td><td>${fa("t2")}</td><td>${fa("t3")}</td><td>${fa("y")}</td></tr></tfoot></table></div>
    <div class="legend">${notFive.length ? `<span class="chip warn">Не пятёрка сейчас: ${esc(notFive.map(x=>x[1]).join(", "))}</span>` : `<span class="chip ok">Все текущие оценки отличные</span>`}</div>
    <p class="hint">Оценки можно менять прямо в таблице, они сохраняются сами.</p>
  </section>
  <section class="panel"><h3>Учебники</h3><div class="booklinks">${BOOKS.map(b=>`<a class="booklink" href="#${b.id}" style="--c:${b.color}"><b>${esc(b.subject)}</b><div class="bar"><i style="width:${pct(b)}%"></i></div><span class="sm">${pct(b)}% параграфов пройдено</span></a>`).join("")}</div></section>
  </div>`;
  $("nextq").addEventListener("click",()=>{ let n; do{ n = QUOTES[Math.floor(Math.random()*QUOTES.length)] }while(n===$("quote").textContent && QUOTES.length>1); $("quote").textContent = n; });
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
    ${b.note?`<p class="note"><b>Приблизительно.</b> ${esc(b.note)}</p>`:""}
    ${file?`<div class="btnrow"><button class="btn primary" id="openbook" type="button">Открыть учебник</button></div>`
      :`<p class="fileline">PDF учебника пока не загружен. Загрузить его и указать страницы можно в <a href="#account">личном кабинете</a>.</p>`}
  </div><div class="chapters">`;
  b.groups.forEach((g,gi)=>{
    if(g.grade) html += `<div class="grade">${g.now?'<span class="tag">сейчас</span>':''}${esc(g.grade)}</div>`;
    g.chapters.forEach((c,ci)=>{
      const open = (gi===0 && ci===0) ? " open" : "";
      html += `<details class="ch" data-ch="${gi}.${ci}"${open}><summary><span class="num">${esc(c.n)}</span><span class="ttl">${esc(c.t)}</span><span class="cnt" data-cnt="${gi}.${ci}"></span></summary><ol class="paras">` +
        c.p.map((p,pi)=>{
          const k=`${b.id}.${gi}.${ci}.${pi}`, id=k.replace(/\./g,'-'), pg = m.pages[k];
          const right = pg && file ? `<button class="pg" type="button" data-page="${pg}">стр. ${pg}</button>` : "";
          return `<li><label><input type="checkbox" id="cb-${id}" data-k="${k}" ${done[k]?"checked":""}><span class="box"></span><span class="pn">${ci+1}.${pi+1}</span><span class="pt">${esc(p)}</span></label>${right}</li>`;
        }).join("") + `</ol></details>`;
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
  if(same) main.querySelectorAll("details.ch").forEach(d=>{ if(d.dataset.ch in openState) d.open = openState[d.dataset.ch]; });
  main.querySelectorAll("input[data-k]").forEach(cb=>cb.addEventListener("change",()=>{
    if(cb.checked) done[cb.dataset.k] = Date.now(); else delete done[cb.dataset.k];
    saveDone(); updateCounts(b); }));
  main.querySelectorAll("button[data-page]").forEach(btn=>btn.addEventListener("click",()=>openViewer(b, Number(btn.dataset.page), btn.closest("li").querySelector(".pt").textContent)));
  const ob = $("openbook"); if(ob) ob.addEventListener("click",()=>openViewer(b, 0, ""));
}

/* ================= ЛИЧНЫЙ КАБИНЕТ ================= */
function renderAccount(openId){
  curBook = null;
  const who = Store.mode==="cloud" ? `Ты вошла как <b>${esc(Store.user.email)}</b>.` : "Сайт работает без облака: всё хранится только в этом браузере.";
  $("main").innerHTML = `<div class="stack">
  <section class="panel"><h2>Личный кабинет</h2><p class="hint" style="margin:6px 0 0">${who} Здесь загружаются PDF учебников и указываются страницы параграфов. После этого параграфы открываются на своей странице прямо из учебника.</p>
    ${Store.mode==="cloud"?`<div class="btnrow"><button class="btn" id="acclogout" type="button">Выйти из аккаунта</button></div>`:""}</section>
  ${BOOKS.map(b=>{ const m = S.book(b.id), file = hasFile(b), set = Object.keys(m.pages||{}).length, total = keysOf(b).length;
    return `<section class="panel acc-book" style="border-left:5px solid ${b.color}" data-book="${b.id}">
      <h2>${esc(b.subject)}</h2><p class="meta" style="margin:0">${esc(b.title)}</p>
      <p class="fileline">${file?`Файл: <b>${esc(m.fileName||"учебник.pdf")}</b>, ${pl(m.totalPages||0,"страница","страницы","страниц")}. Страницы указаны у ${set} из ${total} параграфов.`:"PDF ещё не загружен."}</p>
      <div class="btnrow">
        <button class="btn ${file?"":"primary"}" data-up="${b.id}" type="button">${file?"Заменить PDF":"Загрузить PDF"}</button>
        ${file?`<button class="btn" data-open="${b.id}" type="button">Открыть учебник</button>`:""}
        <input type="file" id="file-${b.id}" accept="application/pdf,.pdf" hidden>
      </div>
      <p class="status" id="status-${b.id}" aria-live="polite"></p>
      <details class="pages-ed" ${openId===b.id?"open":""}><summary class="btn" style="display:inline-block;margin-top:6px">Номера страниц параграфов</summary>
        <div class="editbar"><label for="offset-${b.id}">Страниц в файле до первой страницы учебника:</label><input type="number" id="offset-${b.id}" data-off="${b.id}" min="-50" max="300" value="${Number(m.offset)||0}"><span>Если в PDF есть обложка и титульные листы, впиши, сколько их. Тогда номера ниже совпадут с номерами в книге.</span></div>
        ${b.groups.map((g,gi)=>g.chapters.map((c,ci)=>`<div class="grade" style="padding-left:0">${esc(c.n)} ${esc(c.t)}</div><ol class="paras" style="padding:0 0 6px">${
          c.p.map((p,pi)=>{ const k=`${b.id}.${gi}.${ci}.${pi}`; return `<li><span class="pn">${ci+1}.${pi+1}</span><span class="pt" style="flex:1;min-width:0">${esc(p)}</span><input class="pgin" type="number" min="1" max="999" id="pg-${k.replace(/\./g,'-')}" data-pk="${k}" value="${m.pages[k]||""}" placeholder="стр." aria-label="Страница: ${esc(p)}"></li>`; }).join("")}</ol>`).join("")).join("")}
      </details></section>`; }).join("")}
  </div>`;
  const main = $("main");
  const lo = $("acclogout"); if(lo) lo.addEventListener("click", ()=>$("logout").click());
  main.querySelectorAll("[data-up]").forEach(btn=>{ const id = btn.dataset.up, b = BOOKS.find(x=>x.id===id), fi = $("file-"+id);
    btn.addEventListener("click",()=>fi.click());
    fi.addEventListener("change",()=>{ const f = fi.files && fi.files[0]; fi.value = ""; sayTarget = "status-"+id;
      handleFile(b, f).catch(e=>{ console.error(e); say("Не получилось загрузить файл. Проверь интернет и попробуй ещё раз.", true); }); });
  });
  main.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>openViewer(BOOKS.find(x=>x.id===btn.dataset.open), 0, "")));
  main.querySelectorAll("section[data-book]").forEach(sec=>{ const id = sec.dataset.book;
    const save = () => { const m = S.book(id); m.pages = Object.assign({}, m.pages);
      sec.querySelectorAll("input[data-pk]").forEach(i=>{ const v = parseInt(i.value,10); if(v>0) m.pages[i.dataset.pk] = v; else delete m.pages[i.dataset.pk]; });
      m.offset = parseInt(sec.querySelector("[data-off]").value,10)||0; S.setBook(id, m); };
    sec.querySelectorAll("input[data-pk],[data-off]").forEach(i=>i.addEventListener("input", save));
  });
}
let sayTarget = "status";
function say(t, err){ const st = $(sayTarget); if(st){ st.textContent = t; st.classList.toggle("err", !!err); } }
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("script "+src)); document.head.appendChild(s); }); }

async function handleFile(b, file){
  if(!file) return;
  if(file.type && file.type !== "application/pdf"){ say("Нужен файл в формате PDF.", true); return; }
  say("Читаю файл…");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let n;
  try{ const d = await pdfjsLib.getDocument({data: bytes.slice()}).promise; n = d.numPages; d.destroy(); }
  catch(e){ say("Не получилось открыть этот PDF. Проверь, что файл не повреждён.", true); return; }
  const stamp = Date.now(), parts = [];
  if(file.size <= Store.maxPart){
    say(Store.mode==="cloud" ? "Загружаю учебник в облако…" : "Сохраняю учебник…");
    const path = `books/${b.id}/${stamp}-1.pdf`;
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
      const path = `books/${b.id}/${stamp}-${i++}.pdf`;
      await Store.putFile(path, new Blob([out], {type:"application/pdf"}));
      parts.push({from, to, path});
      from = to + 1;
    }
  }
  const m = S.book(b.id), old = m.chunks || [];
  m.chunks = parts; m.totalPages = n; m.fileName = file.name;
  await S.setBook(b.id, m);
  for(const c of old){ try{ await Store.removeFile(c.path) }catch(e){} }
  Object.keys(docCache).forEach(k=>delete docCache[k]);
  renderAccount();
  say(`Готово: ${pl(n,"страница","страницы","страниц")}. ${Store.mode==="cloud"?"Учебник откроется на любом устройстве после входа.":"Учебник сохранён в этом браузере."}`);
}

/* ---------- просмотр PDF ---------- */
const V = { book:null, n:1, zoom:1, token:0, label:"" };
const docCache = {};
async function pdfFor(path){
  if(!docCache[path]) docCache[path] = (async()=>{ const blob = await Store.getFile(path); if(!blob) throw new Error("no file"); return pdfjsLib.getDocument({data: new Uint8Array(await blob.arrayBuffer())}).promise; })();
  try{ return await docCache[path] }catch(e){ delete docCache[path]; throw e }
}
const toFile = (b,p) => p + (Number(S.book(b.id).offset)||0);
const toBook = (b,n) => n - (Number(S.book(b.id).offset)||0);
function openViewer(b, bookPage, label){
  V.book = b; V.label = label || "";
  $("viewer").hidden = false; document.body.style.overflow = "hidden";
  $("vtitle").textContent = b.title;
  let last = 1; try{ last = Number(localStorage.getItem("dasha:last-"+b.id)) || 1 }catch(e){}
  showPage(bookPage ? toFile(b, bookPage) : last);
  $("vclose").focus();
}
function closeViewer(){ $("viewer").hidden = true; document.body.style.overflow = ""; }
async function showPage(n){
  const b = V.book, m = S.book(b.id), tok = ++V.token, total = m.totalPages || 1;
  n = Math.max(1, Math.min(n, total)); V.n = n;
  try{ localStorage.setItem("dasha:last-"+b.id, n) }catch(e){}
  $("vpage").value = toBook(b, n); $("vinfo").textContent = `стр. файла ${n} из ${total}`; $("vsub").textContent = V.label;
  const cv = $("vcanvas"), msg = $("vmsg");
  if(!m.chunks || !m.chunks.length){ cv.hidden = true; msg.hidden = false; msg.textContent = "Файл учебника ещё не загружен."; return; }
  msg.hidden = false; msg.textContent = "Открываю страницу…";
  try{
    const ch = m.chunks.find(c=>n>=c.from && n<=c.to) || m.chunks[m.chunks.length-1];
    const doc = await pdfFor(ch.path); if(tok !== V.token) return;
    const page = await doc.getPage(Math.min(doc.numPages, n - ch.from + 1)); if(tok !== V.token) return;
    const box = $("vscroll"), base = page.getViewport({scale:1}), dpr = window.devicePixelRatio || 1;
    const scale = Math.max(0.3, Math.min((box.clientWidth - 32) / base.width, 2.5) * V.zoom);
    const vp = page.getViewport({scale: scale * dpr});
    cv.width = vp.width; cv.height = vp.height; cv.style.width = (vp.width/dpr)+"px"; cv.style.height = (vp.height/dpr)+"px";
    await page.render({canvasContext: cv.getContext("2d"), viewport: vp}).promise;
    if(tok !== V.token) return;
    msg.hidden = true; cv.hidden = false; box.scrollTop = 0;
  }catch(e){
    if(tok !== V.token) return; console.error(e);
    cv.hidden = true; msg.hidden = false; msg.textContent = "Не получилось открыть страницу. Проверь интернет или загрузи файл ещё раз.";
  }
}

/* ================= ДОСКА ================= */
const B = { W:1600, H:1000, tool:"pen", color:"#1b2333", size:4, undo:[], cur:null, list:[], dirty:false, timer:null, ctx:null };
const COLORS = ["#1b2333","#2a4fd6","#d23c3c","#1f8a5a","#e08a00"];
function boardsIndex(){ const v = Store.get("boards", null); return v && v.list ? v.list : []; }
async function renderBoard(){
  B.list = boardsIndex();
  if(!B.list.length){ B.list = [{id:"b"+Date.now(), title:"Лист 1", updated:Date.now()}]; Store.set("boards", {list:B.list}, 0); }
  let cur = null; try{ cur = localStorage.getItem("dasha:board") }catch(e){}
  if(!B.list.find(x=>x.id===cur)) cur = B.list[0].id;
  B.cur = cur;
  $("main").innerHTML = `<section class="panel"><h2>Доска</h2><p class="hint" style="margin:0 0 14px">Рисуй решение пальцем, стилусом или мышью. Лист сохраняется сам. Готовое решение можно отправить ИИ-учителю на проверку.</p>
    <div class="boardsel">
      <label for="bsel" class="sm">Лист</label><select id="bsel">${B.list.map(x=>`<option value="${x.id}" ${x.id===cur?"selected":""}>${esc(x.title)}</option>`).join("")}</select>
      <input id="btitle" value="${esc((B.list.find(x=>x.id===cur)||{}).title||"")}" aria-label="Название листа" maxlength="60">
      <button class="btn" id="bnew" type="button">Новый лист</button>
      <button class="btn" id="bdel" type="button">Удалить лист</button>
    </div>
    <div class="boardtools" role="toolbar" aria-label="Инструменты">
      <button class="tool" data-tool="pen" type="button" aria-pressed="true">Ручка</button>
      <button class="tool" data-tool="marker" type="button" aria-pressed="false">Маркер</button>
      <button class="tool" data-tool="text" type="button" aria-pressed="false">Текст</button>
      <button class="tool" data-tool="eraser" type="button" aria-pressed="false">Ластик</button>
      <span class="sep"></span>
      ${COLORS.map((c,i)=>`<button class="swatch" data-color="${c}" style="background:${c}" type="button" aria-label="Цвет ${i+1}" aria-pressed="${i===0}"></button>`).join("")}
      <span class="sep"></span>
      <label class="sm" for="bsize">Толщина</label><input type="range" id="bsize" min="2" max="24" value="4">
      <span class="sep"></span>
      <button class="tool" id="bundo" type="button">Отменить</button>
      <button class="tool" id="bclear" type="button">Очистить</button>
      <button class="btn primary" id="bask" type="button">Проверить у ИИ</button>
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
  $("bask").addEventListener("click",async()=>{ await flushBoard(); pendingBoard = B.cur; location.hash = "tutor"; });
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
function renderTutor(){
  const ok = Store.aiAvailable();
  let subj = "algebra"; try{ subj = localStorage.getItem("dasha:subj") || "algebra" }catch(e){}
  $("main").innerHTML = `<section class="panel"><h2>ИИ-учитель</h2>
    <p class="hint" style="margin:0 0 14px">Объясняет темы, проверяет решения с доски и даёт задачи как в ОГЭ. Сначала подсказывает, а готовый ответ даёт, только если попросить.</p>
    ${ok ? "" : `<p class="note"><b>Пока не подключён.</b> ${Store.mode==="cloud" ? "Для ИИ-учителя нужен ключ Anthropic API на сервере. Остальные разделы работают." : "Сайт ещё не подключён к облаку, поэтому ИИ-учитель недоступен."}</p>`}
    <div class="chat" id="chatlog" aria-live="polite"></div>
    <form class="chatform" id="chatform">
      <div class="quick">
        <button class="btn" type="button" data-q="Объясни тему простыми словами и дай один пример: ">Объясни тему</button>
        <button class="btn" type="button" data-q="Проверь моё решение на доске. Найди ошибки, но не решай за меня.">Проверь решение</button>
        <button class="btn" type="button" data-q="Дай мне одну задачу как в ОГЭ по этой теме и не говори ответ: ">Задача как в ОГЭ</button>
      </div>
      <textarea id="chatin" placeholder="Спроси что угодно по учёбе…" aria-label="Вопрос"></textarea>
      <div class="chatrow">
        <label for="chatsubj" class="sm">Предмет</label>
        <select id="chatsubj">${SUBJ_ALL.map(([id,n])=>`<option value="${id}" ${id===subj?"selected":""}>${esc(n)}</option>`).join("")}</select>
        <label class="ck"><input type="checkbox" id="chatboard" ${pendingBoard?"checked":""}> Приложить лист с доски</label>
        <span style="flex:1"></span>
        <button class="btn" type="button" id="chatnew">Новый разговор</button>
        <button class="btn primary" type="submit" id="chatsend" ${ok?"":"disabled"}>Отправить</button>
      </div>
    </form></section>`;
  drawChat();
  if(pendingBoard){ $("chatin").value = "Проверь моё решение на доске. Найди ошибки, но не решай за меня."; }
  $("main").querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>{ $("chatin").value = b.dataset.q; if(b.dataset.q.includes("доске")) $("chatboard").checked = true; $("chatin").focus(); }));
  $("chatsubj").addEventListener("change",e=>{ try{ localStorage.setItem("dasha:subj", e.target.value) }catch(_){} });
  $("chatnew").addEventListener("click",()=>{ chat = []; saveChat(); drawChat(); });
  $("chatin").addEventListener("keydown",e=>{ if(e.key==="Enter" && (e.ctrlKey||e.metaKey)) $("chatform").requestSubmit(); });
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
    chat.push({role:"user", content:text, board:!!image, img:boardUrl}); $("chatin").value = ""; $("chatboard").checked = false;
    const thinking = {role:"assistant", content:"Думаю…", pending:true}; chat.push(thinking); drawChat();
    $("chatsend").disabled = true;
    try{
      const msgs = chat.filter(m=>!m.pending && !m.err).slice(-16).map(m=>({role:m.role, content:m.content}));
      const subjName = (SUBJ_ALL.find(s=>s[0]===$("chatsubj").value)||[])[1] || "";
      const r = await Store.ask({ subject: subjName, messages: msgs, image });
      thinking.content = r.text || "Пустой ответ."; delete thinking.pending;
    }catch(err){ thinking.content = "Не получилось получить ответ: " + err.message; thinking.err = true; delete thinking.pending; }
    $("chatsend").disabled = false; saveChat(); drawChat();
  });
}
function drawChat(){
  const log = $("chatlog"); if(!log) return;
  log.innerHTML = chat.length ? chat.map(m=>`<div class="msg ${m.role==="user"?"me":"ai"} ${m.err?"err":""}">${esc(m.content)}${m.img?`<img src="${m.img}" alt="Лист с доски">`:(m.board?`<br><small>📎 лист с доски</small>`:"")}</div>`).join("")
    : `<p class="emptychat">Здесь появится разговор. Например: «Объясни, как решать квадратные неравенства методом интервалов».</p>`;
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
  <section class="panel"><h2>Статистика</h2>
    <div class="statnums" style="margin-top:14px">
      <div class="count"><div class="big">${doneKeys.length}</div><div class="lbl">параграфов пройдено</div><div class="sm">из ${all.length} во всех учебниках</div></div>
      <div class="count"><div class="big">${thisWeek}</div><div class="lbl">на этой неделе</div><div class="sm">отмечено галочкой</div></div>
      <div class="count"><div class="big">${aLast ? aLast.toFixed(2).replace(".",",") : "—"}</div><div class="lbl">средний балл</div><div class="sm">${a1 && aLast!==a1 ? `в 1-м триместре ${a1.toFixed(2).replace(".",",")}` : "по последнему триместру"}</div></div>
      <div class="count"><div class="big">${dist[5]}</div><div class="lbl">пятёрок сейчас</div><div class="sm">четвёрок ${dist[4]}, троек ${dist[3]}</div></div>
    </div></section>
  <section class="panel"><h3>Параграфы по неделям</h3><div class="chartbox">${svg}</div><p class="hint">Синий столбик показывает текущую неделю. Считаются галочки, поставленные на этом сайте.</p></section>
  <section class="panel"><h3>Прогресс по учебникам</h3><div class="subjrows">${BOOKS.map(b=>`<div class="subjrow" style="--c:${b.color}"><span>${esc(b.subject)}</span><div class="bar"><i style="width:${pct(b)}%"></i></div><span>${pct(b)}%</span></div>`).join("")}</div></section>
  </div>`;
}

/* ================= ВХОД ================= */
function renderLogin(){
  $("shelf").innerHTML = "";
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
async function route(){
  if(Store.mode==="cloud" && !Store.user){ $("authbar").hidden = true; renderLogin(); return; }
  $("authbar").hidden = false;
  $("whoami").textContent = Store.mode==="cloud" ? Store.user.email : "Данные хранятся только в этом браузере";
  $("logout").hidden = Store.mode!=="cloud";
  const id = (location.hash||"").slice(1) || "home";
  if(id !== "board") await flushBoard();
  renderShelf(id);
  const b = BOOKS.find(x=>x.id===id), e = EMPTY.find(x=>x.id===id);
  if(b) return mountBook(b);
  curBook = null;
  if(e) return $("main").innerHTML = `<article class="book" style="--c:${e.color}"><div class="book-head"><div class="subject">${esc(e.subject)}</div><h2>${esc(e.subject)}. 9 класс</h2><p class="meta">Учебник ещё не добавлен</p></div><div class="placeholder"><p>Здесь появятся главы, как только будет фото обложки и оглавления.</p><ul><li>фото обложки (видны авторы)</li><li>фото страниц с оглавлением</li></ul></div></article>`;
  if(id==="board") return renderBoard();
  if(id==="tutor") return renderTutor();
  if(id==="stats") return renderStats();
  if(id==="account") return renderAccount();
  return renderHome();
}

/* просмотрщик */
$("vclose").addEventListener("click", closeViewer);
$("vprev").addEventListener("click", ()=>showPage(V.n-1));
$("vnext").addEventListener("click", ()=>showPage(V.n+1));
$("vzin").addEventListener("click", ()=>{ V.zoom = Math.min(3, V.zoom*1.25); showPage(V.n); });
$("vzout").addEventListener("click", ()=>{ V.zoom = Math.max(0.4, V.zoom/1.25); showPage(V.n); });
$("vpage").addEventListener("change", ()=>{ const p = parseInt($("vpage").value,10); if(!isNaN(p)) showPage(toFile(V.book, p)); });
document.addEventListener("keydown", e=>{
  if($("viewer").hidden || e.target.tagName === "INPUT") return;
  if(e.key === "ArrowRight") showPage(V.n+1); else if(e.key === "ArrowLeft") showPage(V.n-1); else if(e.key === "Escape") closeViewer();
});
$("logout").addEventListener("click", async()=>{ await flushBoard(); await Store.signOut(); route(); });
window.addEventListener("hashchange", route);

/* старт */
(async()=>{
  try{ await Store.init(); }catch(e){ console.error(e); }
  Store.onAuth = async u => { if(u){ try{ await Store.loadAll() }catch(e){} } loadDone(); route(); };
  Store.onSaveError = () => { const n = $("savewarn"); if(n){ n.hidden = false; setTimeout(()=>n.hidden = true, 6000); } };
  loadDone(); route();
})();
})();
