// Страница темы: учебник открывается на нужной странице, рядом учитель Клод и тетрадь главы.
// Учитель объясняет строго по страницам учебника. Плюс итоговые вопросы по главе.
(function(){
const { $, esc, S } = window.App;

/* ---------- знания по темам ---------- */
const KNOW = ["Не понимаю","Плохо понимаю","Надо повторить","Знаю хорошо"];
const know = () => Object.assign({k:{}}, Store.get("know", {}));
function setKnow(key, v){ const d = know(); d.k = Object.assign({}, d.k); if(v===""||v===null||v===undefined) delete d.k[key]; else d.k[key] = Number(v); Store.set("know", d, 300); }

/* ---------- поиск темы и её страниц ---------- */
function find(bookId, idx){
  const b = BOOKS.find(x=>x.id===bookId); if(!b) return null;
  const [gi,ci,pi] = idx.split(".").map(Number), g = b.groups[gi], c = g && g.chapters[ci];
  if(!c || (pi!==undefined && !Number.isNaN(pi) && c.p[pi]===undefined)) return null;
  return { b, gi, ci, pi, c, key:`${b.id}.${gi}.${ci}.${pi}`, ckey:`${gi}.${ci}`, title: pi===undefined||Number.isNaN(pi) ? c.t : c.p[pi] };
}
function flat(b){ const out = []; b.groups.forEach((g,gi)=>g.chapters.forEach((c,ci)=>c.p.forEach((_,pi)=>out.push([gi,ci,pi])))); return out; }
function pageOf(b, gi, ci, pi){ const m = S.book(b.id); const p = m.pages[`${b.id}.${gi}.${ci}.${pi}`]; if(p) return Number(p); if(pi===0){ const cp = (m.chapterPages||{})[`${gi}.${ci}`]; if(cp) return Number(cp); } return null; }
function range(t){
  const start = pageOf(t.b, t.gi, t.ci, t.pi); if(!start) return null;
  const all = flat(t.b), i = all.findIndex(([g,c,p])=>g===t.gi && c===t.ci && p===t.pi);
  let next = null; for(let j=i+1;j<all.length && !next;j++){ const p = pageOf(t.b, ...all[j]); if(p) next = p; }
  const end = next && next > start ? Math.min(next - 1, start + 5) : start + 3;
  return [start, Math.max(start, end)];
}
const hasFile = b => { const m = S.book(b.id); return m.chunks && m.chunks.length; };
const ctxCache = {};
async function pagesFor(b, from, to, maxImg){
  const key = `${b.id}:${from}-${to}`; if(ctxCache[key]) return ctxCache[key];
  const out = [], texts = [];
  for(let p=from; p<=to; p++){ try{ texts.push([p, await Reader.pageText(b, Reader.toFile(b,p))]); }catch(e){ texts.push([p,""]); } }
  const avg = texts.reduce((a,[,t])=>a+t.length,0) / Math.max(1,texts.length);
  if(avg >= 200) texts.forEach(([n,text])=>{ if(text) out.push({n, text}); });
  else for(const [n] of texts.slice(0, maxImg||4)){ try{ out.push({ n, image: await Reader.pageImage(b, Reader.toFile(b,n), 900) }); }catch(e){} }
  return ctxCache[key] = out;
}

/* ---------- чат с учителем ---------- */
const LEVELS = ["", "Объясняю проще", "Пример из жизни", "Совсем простой пример"];
const lsGet = k => { try{ return JSON.parse(localStorage.getItem("dasha:"+k) || "null") }catch(e){ return null } };
const lsSet = (k,v) => { try{ localStorage.setItem("dasha:"+k, JSON.stringify(v)) }catch(e){} };

let cur = null; // { t, nb, av, chat, level, busy }
function leave(){ if(Study.Dock.kind()==="topic") Study.Dock.release(); if(cur){ if(cur.nb) cur.nb.destroy(); if(cur.av) cur.av.destroy(); window.removeEventListener("reader:change", cur.onReader); } cur = null; }

function render(arg){
  leave();
  const [path, q] = arg.split("?"), [bookId, idx] = path.split("/"), t = find(bookId, idx || "");
  if(!t || Number.isNaN(t.pi)){ $("main").innerHTML = `<section class="panel"><p>Такой темы нет. <a href="#home">На главную</a></p></section>`; return; }
  const b = t.b, rg = range(t), file = hasFile(b), ai = Store.aiAvailable();
  const all = flat(b), i = all.findIndex(([g,c,p])=>g===t.gi && c===t.ci && p===t.pi);
  const prev = all[i-1], next = all[i+1], link = x => `#t/${b.id}/${x.join(".")}`, k = know().k[t.key];
  const saved = lsGet("tchat:"+t.key) || { msgs:[], level:0 };
  cur = { t, rg, chat: saved.msgs || [], level: saved.level || 0, busy:false };
  const teacherHtml = `<div class="teacher topic" style="--c:${b.color}">
    <div class="tutorstage" id="tstage"></div>
    ${ai ? "" : `<p class="note"><b>Учитель пока не подключён.</b> Как только ИИ будет включён, здесь заработают объяснения по учебнику, подсказки и проверка решений. Тетрадь работает уже сейчас.</p>`}
    ${rg ? "" : `<p class="note">Без страницы темы учитель не знает, что написано в учебнике. Укажи страницу в личном кабинете.</p>`}
    <div class="levels" id="tlevels" aria-live="polite"></div>
    <div class="chat" id="tlog" aria-live="polite"></div>
    <div class="quick">
      <button class="btn" type="button" data-act="explain">Объясни тему</button>
      <button class="btn warnbtn" type="button" data-act="simpler">Непонятно</button>
      <button class="btn okbtn" type="button" data-act="got">Понятно!</button>
      <button class="btn" type="button" data-act="draw">✏️ Нарисуй</button>
      <details class="more"><summary class="btn">Ещё ▾</summary><div class="morebox">
        <button class="btn" type="button" data-act="brief">Кратко повторить</button>
        <button class="btn" type="button" data-act="selection" id="tselbtn">Спросить про выделенное</button>
        <button class="btn" type="button" data-act="hint">Подсказка к задаче</button>
        <button class="btn" type="button" data-act="check">Проверь моё решение</button>
        <button class="btn" type="button" data-act="drill">Задачи на дорешивание</button>
      </div></details>
    </div>
    <p class="hint" id="thint"></p>
    <form class="chatform" id="tform"><textarea id="tin" placeholder="Вопрос, ответ учителю или условие задачи… Enter — отправить, Shift+Enter — новая строка" aria-label="Сообщение учителю"></textarea>
      <div class="chatrow"><button class="ibtn" type="button" id="tphoto" title="Приложить фото" aria-label="Приложить фото">📷</button><span id="tphotoprev"></span><span class="sm" id="tselinfo"></span><span style="flex:1"></span><button class="ibtn" type="button" id="tnew" title="Начать заново" aria-label="Начать заново">↺</button><button class="btn primary" type="submit" id="tsend">Отправить</button></div></form>
    ${Study.exercisesHtml(b, t.key)}
  </div>`;
  $("main").innerHTML = `<div class="stack topic" style="--c:${b.color}">
  <section class="panel topic-head">
    <div class="crumbs"><a href="#${b.id}">${esc(b.subject)}</a> · ${esc(t.c.n)} ${esc(t.c.t)}</div>
    <h2>${t.ci+1}.${t.pi+1}. ${esc(t.title)}</h2>
    <div class="topic-row">
      ${rg && file ? `<button class="btn primary" type="button" id="topen">Открыть учебник на стр. ${rg[0]}</button>` : file ? `<button class="btn primary" type="button" id="tbook">Открыть учебник</button><span class="sm">Страница темы не указана, <a href="#account/books">указать</a></span>` : `<a class="btn" href="#account/books">Загрузить учебник</a>`}
      ${testHtml(t)}
      <span class="knchip kn${k===undefined?"":k}" id="tknow" title="Заполняется по твоим ответам учителю, итоговым вопросам и срезу знаний">${k===undefined?"Знание: пока не проверено":"Знание: "+KNOW[k].toLowerCase()}</span>
    </div>
    <div class="topic-nav">${prev?`<a class="btn" href="${link(prev)}">← Предыдущая тема</a>`:""}<span style="flex:1"></span>${next?`<a class="btn" href="${link(next)}">Следующая тема →</a>`:""}</div>
  </section>
  <section class="panel" id="tnb"></section>
  </div>`;
  Study.Dock.claim("topic", "Учитель Клод", `${t.ci+1}.${t.pi+1}. ${t.title}`, null).innerHTML = teacherHtml;
  const ruled = b.id === "rus";
  cur.nb = Notebook.mount($("tnb"), { bookId:b.id, key:t.ckey, ruled, title:`Тетрадь · ${b.subject}`, sub:`${t.c.n} ${t.c.t}. У каждой главы своя тетрадь: со следующей главой начнётся новая.` });
  cur.av = Avatar.create($("tstage"), {compact:true}); cur.av.start();
  cur.av.say(cur.chat.length ? "Продолжим?" : ai ? `Тема «${t.title}». С чего начнём?` : "Я скоро подключусь", 5000);
  draw();
  const pend = pendingAsk && pendingAsk.book.id===b.id ? pendingAsk : null; pendingAsk = null;
  if(rg && file && window.innerWidth >= 1000 && !pend) Reader.open(b, rg[0], `${t.ci+1}.${t.pi+1}. ${t.title}`);
  $("topen") && $("topen").addEventListener("click", ()=>Reader.open(b, rg[0], `${t.ci+1}.${t.pi+1}. ${t.title}`));
  $("tbook") && $("tbook").addEventListener("click", ()=>Reader.open(b, 0, ""));
  $("tphoto").addEventListener("click", async()=>{ const got = await Photo.pick(false); if(got[0]){ cur.photo = got[0]; drawPhoto(); say("Фото приложено. Нажми «Проверь моё решение», «Подсказка» или просто отправь вопрос."); } });
  $("tnew").addEventListener("click", ()=>{ cur.chat = []; cur.level = 0; persist(); draw(); });
  cur.onReader = () => selInfo(); window.addEventListener("reader:change", cur.onReader); selInfo();
  document.querySelectorAll("#dockbody [data-act]").forEach(btn=>btn.addEventListener("click", ()=>{ const d = btn.closest("details.more"); if(d) d.open = false; act(btn.dataset.act); }));
  $("tform").addEventListener("submit", e=>{ e.preventDefault(); const v = $("tin").value.trim(); if(!v) return; $("tin").value = ""; send(lastMode(), v); });
  $("tin").addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); $("tform").requestSubmit(); } });
  if(!ai) document.querySelectorAll("#dockbody [data-act],#tsend").forEach(x=>{ if(x.dataset.act!=="got") x.disabled = true; });
  if(pend){ askNow(pend); return; }
  if(ai && !cur.chat.length && q){ Study.Dock.open(); if(q.includes("scratch")) act("explain"); else if(q.includes("brief")) act("brief"); }
}
/* ---------- «❓ Непонятно» из учебника: учитель сразу берёт фрагмент в работу ---------- */
let pendingAsk = null;
function askNow(d){
  Study.Dock.open();
  send("selection", "Мне непонятно это место в учебнике. Объясни, пожалуйста.", { tag:`❓ Непонятно · стр. ${d.bookPage}`, selection: d.text || undefined, image: d.image, imageType:"jpeg" });
}
function topicAt(b, bookPage){ let best = null, bp = 0;
  flat(b).forEach(([gi,ci,pi])=>{ const p = pageOf(b, gi, ci, pi); if(p && p <= bookPage && p >= bp){ bp = p; best = [gi,ci,pi]; } }); return best; }
window.addEventListener("reader:ask", e=>{ const d = e.detail; if(!d || !d.book) return;
  if(!Store.aiAvailable()){ alertSay("Учитель пока не подключён."); return; }
  if(cur && !cur.quiz && cur.t.b.id===d.book.id){ if(cur.busy){ say("Учитель ещё отвечает. Дождись ответа и обведи место снова."); return; } return askNow(d); }
  const b = BOOKS.find(x=>x.id===d.book.id), at = b && topicAt(b, d.bookPage);
  if(at){ pendingAsk = d; const h = `#t/${b.id}/${at.join(".")}`; if(location.hash===h) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = h; return; }
  App.askGeneral && App.askGeneral(d);
});
function alertSay(t){ if(cur) say(t); }
function drawPhoto(){ const el = $("tphotoprev"); if(!el || !cur) return; el.innerHTML = cur.photo ? `<span class="photochip"><img src="${cur.photo.url}" alt="Приложенное фото"><button class="pg" type="button" id="tphotorm" aria-label="Убрать фото">✕</button></span>` : "";
  const rm = $("tphotorm"); if(rm) rm.addEventListener("click", ()=>{ cur.photo = null; drawPhoto(); }); }
function selInfo(){
  if(!cur) return; const st = Reader.state(), el = $("tselinfo"); if(!el) return;
  el.textContent = st.sel && st.book && st.book.id===cur.t.b.id ? `Выделено в учебнике: «${st.sel.text.slice(0,60)}${st.sel.text.length>60?"…":""}»` : st.open && st.book && st.book.id===cur.t.b.id ? "Не понятно место в учебнике? Нажми там «❓ Непонятно» и обведи его рамкой" : "";
}
const lastMode = () => { const m = [...cur.chat].reverse().find(x=>x.role==="user" && x.mode); return m && ["check","hint","selection"].includes(m.mode) ? m.mode : "chat"; };
function persist(){ lsSet("tchat:"+cur.t.key, { msgs: cur.chat.filter(m=>!m.pending).slice(-40), level: cur.level }); }
function say(text){ const h = $("thint"); if(h){ h.textContent = text; } }
function draw(){
  const log = $("tlog"); if(!log) return;
  log.innerHTML = cur.chat.length ? cur.chat.map(m=>`<div class="msg ${m.role==="user"?"me":"ai"} ${m.err?"err":""}">${m.tag?`<small class="tag">${esc(m.tag)}</small>`:""}${m.role==="user" ? esc(m.content) : Draw.html(m.content)}${m.know?`<div><span class="knchip kn${m.know}">${KNOW[m.know]}</span></div>`:""}</div>`).join("")
    : `<p class="emptychat">Нажми «Объясни тему», обведи непонятное место в учебнике кнопкой «❓ Непонятно» или реши задачу в тетради и попроси проверить.</p>`;
  Draw.decorate(log, cur.chat);
  log.scrollTop = log.scrollHeight;
  $("tlevels").innerHTML = cur.level ? `<span class="sm">Ступень объяснения:</span> ${[1,2,3].map(l=>`<span class="chip ${l===cur.level?"":"dim"}">${l}. ${LEVELS[l]}</span>`).join(" ")}` : "";
}
async function act(a){
  if(!cur) return;
  const t = cur.t, text = $("tin").value.trim(); say("");
  if(a==="got"){
    cur.level = 0;
    if(cur.busy){ cur.gotLater = true; cur.av.say("Отлично! Договорю и задам вопрос для проверки", 3000); say("Учитель закончит ответ и задаст проверочный вопрос."); return; }
    cur.av.setMood("smile"); cur.av.say("Ура! Сейчас проверим одним вопросом", 3000);
    return send("chat", "Понятно! Задай мне один проверочный вопрос по этой теме, чтобы убедиться.", {tag:"Понятно!"});
  }
  if(cur.busy) return;
  if(a==="draw"){ $("tin").value = ""; return send("draw", text ? `Нарисуй: ${text}` : "Нарисуй, пожалуйста, то, что сейчас объясняешь, схематично и просто.", {tag:"Нарисуй", image: !cur.photo && cur.nb.hasInk() ? cur.nb.image() : null, imageType:"jpeg"}); }
  if(a==="drill"){ return send("chat", "Дай мне 3 упражнения из учебника по этой теме на дорешивание: те, что ещё не решали в классе и дома, от простого к сложному. Укажи номера и страницы.", {tag:"Дорешивание"}); }
  if(a==="explain"){ cur.level = 0; return send("explain", `Объясни мне тему «${t.title}» с нуля.`, {tag:"Объяснение с нуля"}); }
  if(a==="brief"){ cur.level = 0; return send("brief", `Давай кратко повторим тему «${t.title}».`, {tag:"Краткое повторение"}); }
  if(a==="simpler"){
    if(!cur.chat.length) return send("explain", `Объясни мне тему «${t.title}» с нуля.`, {tag:"Объяснение с нуля"});
    cur.level = Math.min(3, cur.level + 1);
    const msg = ["", "Непонятно. Объясни, пожалуйста, проще.", "Всё ещё непонятно. Приведи пример из жизни.", "Всё равно не понимаю. Объясни совсем просто, как ребёнку."][cur.level];
    return send("simpler"+cur.level, msg, {tag:`Непонятно · ступень ${cur.level}`});
  }
  if(a==="selection"){
    const st = Reader.state();
    if(st.sel && st.book && st.book.id===t.b.id){ $("tin").value = ""; Reader.clearSel(); return send("selection", text || "Объясни этот фрагмент.", {tag:"Про выделенное", selection: st.sel.text}); }
    if(st.open && st.book && st.book.id===t.b.id){ let img = null; try{ img = await Reader.pageImage(t.b, st.n, 1000); }catch(e){}
      if(!img) return say("Не получилось взять страницу учебника.");
      $("tin").value = ""; return send("selection", text || `Объясни, что написано на странице ${Reader.toBook(t.b, st.n)}.`, {tag:`Про страницу ${Reader.toBook(t.b, st.n)}`, image:img, imageType:"jpeg"}); }
    return say("Открой учебник и выдели мышкой непонятное место. Если текст не выделяется (учебник отсканирован), просто открой нужную страницу и нажми кнопку ещё раз.");
  }
  if(a==="hint"){
    if(!text && !cur.nb.hasInk() && !cur.photo) return say("Напиши в поле номер или условие задачи (или начни решать в тетради) и нажми «Подсказка» ещё раз.");
    $("tin").value = "";
    return send("hint", text ? `Дай подсказку к задаче: ${text}` : "Дай подсказку к задаче, которую я решаю в тетради.", {tag:"Подсказка", image: !cur.photo && cur.nb.hasInk() ? cur.nb.image() : null, imageType:"jpeg"});
  }
  if(a==="check"){
    if(!cur.nb.hasInk() && !cur.photo) return say("Сначала реши задачу в тетради ниже или приложи фото решения, потом нажми «Проверь моё решение».");
    await cur.nb.save(); $("tin").value = "";
    return send("check", text ? `Проверь моё решение. Задача: ${text}` : "Проверь моё решение в тетради.", {tag: cur.photo ? "Проверка решения по фото" : "Проверка решения", image: cur.photo ? null : cur.nb.image(), imageType:"jpeg"});
  }
}
async function send(mode, content, opt){
  opt = opt || {};
  if(!Store.aiAvailable()){ say("Учитель пока не подключён."); return; }
  const t = cur.t, me = cur;
  if(!opt.image && me.photo){ opt.image = me.photo.b64; opt.imageType = "jpeg"; opt.tag = (opt.tag ? opt.tag + " · " : "") + "📷 фото"; me.photo = null; drawPhoto(); }
  if(window.Points) Points.logAct();
  me.chat.push({ role:"user", content, mode, tag:opt.tag }); const thinking = { role:"assistant", content:"Думаю…", pending:true }; me.chat.push(thinking); draw();
  me.busy = true; me.av.stop(); me.av.setMood("think"); me.av.say(mode==="check" ? "Смотрю твоё решение…" : "Открываю учебник…");
  try{
    const pages = me.rg && hasFile(t.b) ? await pagesFor(t.b, me.rg[0], me.rg[1]) : [];
    const msgs = me.chat.filter(m=>!m.pending && !m.err).slice(-20).map(m=>({ role:m.role, content:m.content }));
    const r = await Store.ask({ mode, subject:t.b.subject, topic:{ book:t.b.title, chapter:`${t.c.n} ${t.c.t}`, title:t.title }, pages, context: Study.cardText(t.b, t.key), messages:msgs, selection:opt.selection, image:opt.image||null, imageType:opt.imageType });
    const mk = Study.marks((r && r.text) || "Пустой ответ."); thinking.content = mk.text; delete thinking.pending; Study.Dock.ping();
    if(mk.know){ setKnow(t.key, mk.know); thinking.know = mk.know; const el = $("tknow"); if(el && cur===me){ el.className = "knchip kn"+mk.know; el.textContent = "Знание: " + KNOW[mk.know].toLowerCase(); } }
    if(me.av.el.isConnected){ me.av.setMood("smile"); me.av.say(mode.startsWith("simpler") ? "Так понятнее?" : mode==="check" ? "Посмотрела? Ответь на мой вопрос" : "Вот!", 3500); }
  }catch(err){ thinking.content = "Не получилось получить ответ: " + err.message; thinking.err = true; delete thinking.pending; if(me.av.el.isConnected){ me.av.setMood("squint"); me.av.say("Ой, связь пропала", 3000); } }
  me.busy = false; setTimeout(()=>{ if(cur===me){ me.av.setMood("idle"); me.av.start(); } }, 3500);
  if(cur===me){ persist(); draw(); if(me.gotLater){ me.gotLater = false; act("got"); } } else { lsSet("tchat:"+t.key, { msgs: me.chat.slice(-40), level: me.level }); }
}

/* ---------- тест по теме: пройден на 80% и выше → «тема освоена, тест пройден» ---------- */
const PASS = 0.8;
const tests = () => Object.assign({}, Store.get("topicTests", {}));
function testOf(key){ return tests()[key] || null; }
function chapterPassed(bookId, ck){ const r = (Store.get("quizRes", {})[`${bookId}.${ck}`]) || []; return r.length ? r[r.length-1] >= PASS : null; }
function testHtml(t){
  const r = testOf(t.key), href = `#q/${t.b.id}/${t.gi}.${t.ci}.${t.pi}`;
  if(r && r.pass) return `<span class="tpassed" title="Тест пройден ${new Date(r.ts).toLocaleDateString("ru-RU")}">✓ Тема освоена · тест пройден, ${r.ok} из ${r.n}</span><a class="btn sm" href="${href}">Пройти ещё раз</a>`;
  return `<a class="btn" href="${href}">${r ? "Пройти тест ещё раз" : "Пройти тест по теме"}</a>${r ? `<span class="sm">последний раз ${r.ok} из ${r.n}, нужно ${Math.ceil(PASS*r.n)}</span>` : ""}`;
}

/* ---------- итоговые вопросы по главе и тест по теме ---------- */
const parseJson = s => { const a = s.indexOf("{"), z = s.lastIndexOf("}"); if(a<0||z<a) throw new Error("Учитель ответил не в том формате"); return JSON.parse(s.slice(a, z+1)); };
async function renderQuiz(arg){
  leave();
  const [bookId, ck] = arg.split("/"), one = ck.split(".").length === 3, t = find(bookId, one ? ck : ck + ".0");
  if(!t){ $("main").innerHTML = `<section class="panel"><p>Такой ${one?"темы":"главы"} нет.</p></section>`; return; }
  const b = t.b, ai = Store.aiAvailable(), me = cur = { t, quiz:true, one, tp: one ? [t.pi] : t.c.p.map((_,i)=>i) };
  $("main").innerHTML = `<section class="panel quiz" style="--c:${b.color}"><div class="crumbs"><a href="#${b.id}">${esc(b.subject)}</a>${one?` · <a href="#t/${b.id}/${ck}">${t.ci+1}.${t.pi+1}. ${esc(t.title)}</a>`:""}</div><h2>${one ? `Тест по теме: ${esc(t.title)}` : `Итоговые вопросы: ${esc(t.c.n)} ${esc(t.c.t)}`}</h2>
    ${one ? `<p class="hint">Ответь хотя бы на ${Math.round(PASS*100)}% вопросов верно, и тема будет отмечена как освоенная и проверенная.</p>` : ""}
    <div class="tutorstage" id="qstage"></div><div id="qbody">${ai ? `<p class="hint">Учитель читает главу и составляет вопросы…</p>` : `<p class="note"><b>Учитель пока не подключён.</b> Итоговые вопросы составляет ИИ по страницам учебника, поэтому они заработают после подключения.</p>`}</div></section>`;
  me.av = Avatar.create($("qstage"), {compact:true});
  if(!ai){ me.av.start(); return; }
  me.av.setMood("think"); me.av.say(one ? "Составляю тест по теме…" : "Составляю вопросы по главе…");
  try{
    const topics = me.tp.map(pi=>t.c.p[pi]), pages = [], rg = one ? range(t) : null;
    if(hasFile(b)){ if(one){ if(rg) (await pagesFor(b, rg[0], rg[1], 4)).forEach(p=>pages.push(p)); }
      else for(let pi=0; pi<topics.length; pi++){ const st = pageOf(b, t.gi, t.ci, pi); if(st){ const got = await pagesFor(b, st, st+1, 2); got.forEach(p=>{ if(!pages.some(x=>x.n===p.n)) pages.push(p); }); } } }
    if(!pages.length){ $("qbody").innerHTML = `<p class="note">Чтобы вопросы были строго по учебнику, укажи страницы ${one?"этой темы":"тем этой главы"} в <a href="#account/books">личном кабинете</a>.</p>`; me.av.setMood("squint"); me.av.say("Мне нужен учебник", 4000); return; }
    const r = await Store.ask({ mode:"quiz", subject:b.subject, topic:{ book:b.title, chapter:`${t.c.n} ${t.c.t}`, title: one ? t.title : t.c.t, topics }, pages: pages.slice(0, 10) });
    if(cur!==me) return;
    const qs = (parseJson(r.text).questions || []).filter(q=>q && q.q);
    if(!qs.length) throw new Error("Вопросы не получились");
    drawQuiz(me, qs);
  }catch(e){ if(cur!==me) return; $("qbody").innerHTML = `<p class="note">Не получилось составить вопросы: ${esc(e.message)}. Попробуй ещё раз чуть позже.</p>`; me.av.setMood("squint"); me.av.say("Что-то пошло не так", 4000); }
}
function drawQuiz(me, qs){
  me.av.setMood("smile"); me.av.say("Готово! Отвечай спокойно, без спешки", 4000); setTimeout(()=>{ if(cur===me){ me.av.setMood("idle"); me.av.start(); } }, 4000);
  const sk = [];
  $("qbody").innerHTML = `<form id="qform">${qs.map((q,i)=>`<div class="ogeq"><div class="oge-num">Вопрос ${i+1}${q.type==="draw"?" · нарисуй":""}</div><div class="oge-text">${esc(q.q)}</div>
    ${q.type==="choice" ? `<div class="qopts">${(q.options||[]).map((o,j)=>`<label class="qopt"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join("")}</div>`
    : q.type==="draw" ? `<div data-sketch="${i}"></div>` : `<label class="oge-ans"><span class="sm">Ответ</span><input type="text" data-short="${i}" autocomplete="off"></label>`}</div>`).join("")}
    <div class="btnrow"><button class="btn primary" type="submit">Сдать учителю</button></div></form>`;
  $("qbody").querySelectorAll("[data-sketch]").forEach(h=>sk[Number(h.dataset.sketch)] = Notebook.sketch(h));
  $("qform").addEventListener("submit", async e=>{
    e.preventDefault(); const btn = $("qform").querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Учитель проверяет…"; App.busy.start("Учитель проверяет тест");
    me.av.stop(); me.av.setMood("think"); me.av.say("Проверяю…");
    const given = qs.map((q,i)=> q.type==="choice" ? (($("qform").querySelector(`[name=q${i}]:checked`)||{}).value ?? "") : q.type==="draw" ? (sk[i] && !sk[i].empty() ? "рисунок" : "") : ($("qform").querySelector(`[data-short="${i}"]`).value.trim()));
    const res = qs.map((q,i)=> q.type==="choice" ? { ok: given[i]!=="" && Number(given[i])===Number(q.answer), comment: given[i]==="" ? "Нет ответа." : Number(given[i])===Number(q.answer) ? "Верно." : `Правильный ответ: ${(q.options||[])[q.answer]}` } : null);
    const open = qs.map((q,i)=>({q,i})).filter(x=>x.q.type!=="choice");
    try{
      if(open.length){
        const items = open.map(({q,i})=>({ type:q.type, q:q.q, expected: q.type==="draw" ? q.criteria : q.answer, given: given[i] || "(нет ответа)" }));
        const images = open.filter(x=>x.q.type==="draw" && given[x.i]).map(x=>sk[x.i].image());
        const r = await Store.ask({ mode:"quizcheck", items, images });
        const out = parseJson(r.text).results || [];
        open.forEach(({i},j)=>{ const o = out[j] || {}; res[i] = given[i] ? { ok:!!o.ok, comment:o.comment || "" } : { ok:false, comment:"Нет ответа." }; });
      }
    }catch(err){ open.forEach(({q,i})=>{ if(!res[i]) res[i] = q.type==="short" && given[i] && given[i].toLowerCase().replace(/\s/g,"")===String(q.answer).toLowerCase().replace(/\s/g,"") ? {ok:true, comment:"Верно."} : {ok:false, comment:"Учитель не смог проверить этот ответ: " + err.message}; }); }
    App.busy.end();
    if(cur!==me) return;
    const ok = res.filter(r=>r.ok).length, pct = ok/qs.length;
    // слабые темы: понижаем «знаю хорошо» до «надо повторить»
    const piOf = q => me.one ? me.t.pi : Number.isInteger(q.topic) && me.tp[q.topic]!==undefined ? me.tp[q.topic] : null;
    const weak = new Set(); qs.forEach((q,i)=>{ const pi = piOf(q); if(!res[i].ok && pi!==null) weak.add(pi); });
    const per = {}; qs.forEach((q,i)=>{ const pi = piOf(q); if(pi!==null){ const p = per[pi] = per[pi] || [0,0]; p[1]++; if(res[i].ok) p[0]++; } });
    const kd = know(); kd.k = Object.assign({}, kd.k); Object.entries(per).forEach(([pi,[ok,n]])=>{ const k = `${me.t.b.id}.${me.t.gi}.${me.t.ci}.${pi}`, r = ok/n; kd.k[k] = r===1 && n>=2 ? 3 : r>=.5 ? 2 : 1; }); Store.set("know", kd, 0);
    let prev = null; const passed = pct >= PASS;
    if(me.one){ const all = tests(), was = all[me.t.key]; prev = was ? was.ok/was.n : null;
      all[me.t.key] = { ts:Date.now(), ok, n:qs.length, pass: passed || !!(was && was.pass), last: pct }; Store.set("topicTests", all, 0);
      if(passed && !App.done[me.t.key]) App.setDone(me.t.key, true);
      if(window.Points && Points.logAct) Points.logAct(); }
    else { const qr = Object.assign({}, Store.get("quizRes", {})), key = `${me.t.b.id}.${me.t.ckey}`; prev = qr[key] ? qr[key][qr[key].length-1] : null;
      qr[key] = (qr[key]||[]).concat([pct]).slice(-10); Store.set("quizRes", qr, 0);
      const ql = Object.assign({list:[]}, Store.get("quizzes", {})); ql.list = ql.list.concat([{ ts:Date.now(), key, ok, n:qs.length }]); Store.set("quizzes", ql, 0); }
    if(window.Points) Points.renderBar();
    const back = me.one ? `#t/${me.t.b.id}/${me.t.ckey}.${me.t.pi}` : `#${me.t.b.id}`;
    $("qbody").innerHTML = `${passed ? `<p class="tpassed big">✓ ${me.one ? "Тема освоена, тест пройден" : "Глава проверена, тест пройден"}</p>` : `<p class="note">Пока не засчитано: нужно не меньше ${Math.ceil(PASS*qs.length)} верных из ${qs.length}. Повтори и попробуй ещё раз.</p>`}
      <p><b>Верно ${ok} из ${qs.length}.</b>${weak.size ? ` Стоит повторить: ${[...weak].map(pi=>`<a href="#t/${me.t.b.id}/${me.t.ckey}.${pi}?brief">${esc(me.t.c.p[pi])}</a>`).join(", ")}.` : ""}</p>
      ${qs.map((q,i)=>`<div class="ogeq"><div class="oge-num">Вопрос ${i+1} ${res[i].ok?`<span class="chip ok">верно</span>`:`<span class="chip warn">ошибка</span>`}</div><div class="oge-text">${esc(q.q)}</div><p class="hint">${esc(res[i].comment||"")}</p></div>`).join("")}
      <div class="btnrow"><a class="btn" href="#" id="qagain">Новые вопросы</a><a class="btn" href="${back}">${me.one ? "Вернуться к теме" : "К оглавлению"}</a></div>`;
    $("qagain").addEventListener("click", e=>{ e.preventDefault(); renderQuiz(me.one ? `${me.t.b.id}/${me.t.ckey}.${me.t.pi}` : `${me.t.b.id}/${me.t.ckey}`); });
    me.av.setMood("idle");
    const verdict = pct===1 ? "perfect" : prev===null ? (pct>=.5 ? "better" : "worse") : pct > prev ? "better" : pct < prev ? "worse" : "same";
    await Avatar.grade({ mark: pct>=.9?5:pct>=.7?4:pct>=.5?3:2, verdict, detail:`${me.one ? "Тест по теме" : "Итоговые вопросы по главе"}: верно ${ok} из ${qs.length}.` });
    if(cur===me) me.av.start();
  });
}

window.Topic = { render, renderQuiz, leave, testOf, chapterPassed, find, pageOf, range, know, setKnow, KNOW, flat, pagesFor };
})();
