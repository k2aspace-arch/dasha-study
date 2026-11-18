// Всё «про знания» и настройки: оформление, учитель под заданием, срез знаний,
// карточки параграфов (индекс учебника), оглавления по фото, бонусы, рекомендации, сборники ОГЭ.
(function(){
const { $, esc, pl, S } = window.App;
const parseJson = s => { const a = s.indexOf("{"), z = s.lastIndexOf("}"); if(a<0||z<a) throw new Error("ответ не в том формате"); return JSON.parse(s.slice(a, z+1)); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const DM = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});

/* ================= ОФОРМЛЕНИЕ ================= */
const SKINS = [["pink","Розовый","#e0569b"],["lavender","Лавандовый","#8a5cf0"],["mint","Мятный","#14a37f"],["peach","Персиковый","#e8743a"],["blue","Голубой","#2a4fd6"]];
const PATTERNS = [["grid","Клетка"],["lines","Линейка"],["dots","Точки"],["hearts","Сердечки"],["plain","Без узора"]];
const MODES = [["auto","Как в системе"],["light","Светлая"],["dark","Тёмная"]];
const TSTYLES = [["prof","Профессор: шапочка, очки, бабочка"],["smart","Умник: только очки"],["cute","Милашка: бантик"],["simple","Просто квадратик"]];
const TCOLORS = [["#d97757","Оранжевый"],["#f08bb4","Розовый"],["#a07be0","Лавандовый"],["#5fb37e","Мятный"],["#6b8fe8","Голубой"],["#f5c542","Жёлтый"]];
const lsPrefs = () => { try{ return JSON.parse(localStorage.getItem("dasha:prefs")||"null") }catch(e){ return null } };
const prefs = () => Object.assign({ skin:"pink", pattern:"grid", mode:"auto", tstyle:"prof", tcolor:"#d97757" }, lsPrefs() || {}, Store.get("prefs", null) || {});
function applyTheme(p){ p = p || prefs(); const r = document.documentElement; r.dataset.skin = p.skin; r.dataset.pattern = p.pattern; if(p.mode==="auto") delete r.dataset.theme; else r.dataset.theme = p.mode; r.dataset.tstyle = p.tstyle; r.style.setProperty("--tc", p.tcolor); }
function setPref(k, v){ const p = prefs(); p[k] = v; Store.set("prefs", p, 0); try{ localStorage.setItem("dasha:prefs", JSON.stringify(p)) }catch(e){} applyTheme(p); }
function themePanel(){
  const p = prefs();
  return `<div class="stack" id="themep"><section class="panel"><h3>Тема</h3>
    <div class="themerow"><span class="sm">Цвет</span>${SKINS.map(([id,n,c])=>`<button class="skinbtn" type="button" data-skin="${id}" aria-pressed="${p.skin===id}" style="--sw:${c}"><i></i>${n}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Фон</span>${PATTERNS.map(([id,n])=>`<button class="vbtn" type="button" data-pat="${id}" aria-pressed="${p.pattern===id}">${n}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Тема</span>${MODES.map(([id,n])=>`<button class="vbtn" type="button" data-mode="${id}" aria-pressed="${p.mode===id}">${n}</button>`).join("")}</div>
    </section><section class="panel"><h3>Стиль учителя</h3>
    <div class="themerow" id="tprev"></div>
    <div class="themerow"><span class="sm">Вид</span>${TSTYLES.map(([id,n])=>`<button class="vbtn" type="button" data-tstyle="${id}" aria-pressed="${p.tstyle===id}">${n.split(":")[0]}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Цвет</span>${TCOLORS.map(([c,n])=>`<button class="tpick" type="button" data-tcolor="${c}" aria-pressed="${p.tcolor===c}" style="--sw:${c}" title="${n}"><i class="tsw"></i></button>`).join("")}</div>
    </section><p class="hint sm" style="margin:0 4px">Настройки сохраняются в аккаунте и применяются на всех устройствах.</p></div>`;
}
let themeAv = null;
function bindTheme(root){
  const re = () => { const el = $("themep"); if(el){ el.outerHTML = themePanel(); bindTheme(root); } };
  root.querySelectorAll("[data-skin]").forEach(b=>b.addEventListener("click",()=>{ setPref("skin", b.dataset.skin); re(); }));
  root.querySelectorAll("[data-pat]").forEach(b=>b.addEventListener("click",()=>{ setPref("pattern", b.dataset.pat); re(); }));
  root.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{ setPref("mode", b.dataset.mode); re(); }));
  root.querySelectorAll("[data-tstyle]").forEach(b=>b.addEventListener("click",()=>{ setPref("tstyle", b.dataset.tstyle); re(); }));
  root.querySelectorAll("[data-tcolor]").forEach(b=>b.addEventListener("click",()=>{ setPref("tcolor", b.dataset.tcolor); re(); }));
  const tp = $("tprev"); if(tp){ if(themeAv) themeAv.destroy(); themeAv = Avatar.create(tp, {compact:true}); themeAv.start(); }
}

/* ================= ВЫДВИЖНОЙ ЧАТ С УЧИТЕЛЕМ СПРАВА ================= */
const Dock = (()=>{
  let kind = null, cleanup = null, claimed = false, hidden = false, away = false, awayClean = null;
  // «в странице»: учитель встаёт блоком над содержимым страницы, как раньше; «сбоку»: выдвижная панель справа
  const isInline = () => { try{ return localStorage.getItem("dasha:dockinline")==="1" }catch(e){ return false } };
  const setInline = v => { try{ localStorage.setItem("dasha:dockinline", v ? "1" : "0") }catch(e){}
    const el = $("dock"), slot = $("dockslot"); if(!el || !slot) return;
    if(v && el.parentNode !== slot) slot.appendChild(el); if(!v && el.parentNode === slot) document.body.insertBefore(el, $("dockbtn"));
    el.classList.toggle("inline", v); document.body.classList.toggle("dock-inline", v);
    const b = $("dockwide"); if(b){ b.textContent = v ? "⇥" : "⤢"; b.title = v ? "Свернуть вбок" : "Встроить в страницу"; b.setAttribute("aria-label", b.title); }
    if(!el.hidden) apply(true); };
  const wide = () => window.innerWidth >= 1280;
  const want = () => { try{ const v = localStorage.getItem("dasha:dock"); return v===null ? wide() : v==="1"; }catch(e){ return wide(); } };
  const remember = v => { try{ localStorage.setItem("dasha:dock", v ? "1" : "0") }catch(e){} };
  function apply(open){
    const el = $("dock"), btn = $("dockbtn"); if(!el) return;
    el.hidden = hidden || !open; btn.hidden = hidden || open;
    const inl = isInline();
    document.body.classList.toggle("dock-open", !inl && !hidden && open && wide());
    document.body.classList.toggle("dock-over", !inl && !hidden && open && !wide());
  }
  function run(){ if(cleanup){ try{ cleanup() }catch(e){} } cleanup = null; }
  const D = {
    kind: () => kind,
    open(){ hidden = false; remember(true); apply(true); const b = $("dockbtn"); if(b) b.classList.remove("ping"); },
    close(){ remember(false); apply(false); },
    claim(k, title, sub, onRelease){ run(); kind = k; claimed = true; cleanup = onRelease || null; $("docktitle").textContent = title || "Учитель Клод"; $("docksub").textContent = sub || ""; const body = $("dockbody"); body.innerHTML = ""; return body; },
    release(){ run(); kind = null; const body = $("dockbody"); if(body) body.innerHTML = ""; },
    begin(){ claimed = false; away = false; if(awayClean){ try{ awayClean() }catch(e){} awayClean = null; } },
    // страница сама показывает учителя (раздел «ИИ-учитель»): панель справа прячется
    away(onLeave){ D.release(); away = true; claimed = true; awayClean = onLeave || null; },
    end(fallback){ if(away){ hidden = true; apply(false); return; } hidden = false; if(!claimed && kind!=="general") fallback(); apply(want()); },
    hide(){ hidden = true; apply(false); },
    ping(){ const el = $("dock"), b = $("dockbtn"); if(el && el.hidden && b) b.classList.add("ping"); }
  };
  document.addEventListener("click", e=>{ if(e.target.closest("#dockbtn")) D.open(); else if(e.target.closest("#dockclose")) D.close(); else if(e.target.closest("#dockwide")){ setInline(!isInline()); if(isInline()) $("dock").scrollIntoView({ behavior:"smooth", block:"start" }); } });
  setTimeout(()=>setInline(isInline()), 0);
  window.addEventListener("resize", ()=>{ const el = $("dock"); if(el && !hidden) apply(!el.hidden); });
  return D;
})();

/* ================= УЧИТЕЛЬ ПОД ЗАДАНИЕМ ================= */
// метки в ответах ИИ: [[знание:N]] и [[баллы:N/M]]
function marks(text){
  const out = { text: String(text||"") };
  const k = out.text.match(/\[\[\s*знание\s*:\s*([0-3])\s*\]\]/i); if(k) out.know = Number(k[1]);
  const b = out.text.match(/\[\[\s*баллы\s*:\s*(\d+)\s*\/\s*(\d+)\s*\]\]/i); if(b) out.score = [Number(b[1]), Number(b[2])];
  out.text = out.text.replace(/\[\[\s*(знание|баллы)\s*:[^\]]*\]\]/gi, "").trim();
  return out;
}
const Teacher = { mount(nbHost, o){
  const st = { chat:[], busy:false, photo:null, alive:true };
  const host = Dock.claim("oge", "Учитель Клод", o.title || "", null);
  host.innerHTML = `<div class="tch">
    <div class="tutorstage" data-av></div>
    <p class="sm" style="margin:0 0 6px">Подскажет, нарисует, проверит по критериям. Решай в тетради или приложи фото.</p>
    <div class="chat" data-log aria-live="polite"></div>
    <div class="tbar">
      <button class="btn" type="button" data-a="hint">💡 Подсказка</button>
      <button class="btn" type="button" data-a="explain">Объясни</button>
      <button class="btn" type="button" data-a="draw">✏️ Нарисуй</button>
      <button class="btn primary" type="button" data-a="check">Проверь решение</button>
    </div>
    <form class="chatform" data-form><textarea data-in placeholder="Вопрос или ответ учителю… Enter — отправить" aria-label="Сообщение учителю"></textarea>
      <div class="chatrow"><button class="ibtn" type="button" data-photo title="Приложить фото" aria-label="Приложить фото">📷</button><span data-prev></span><span class="sm" data-st></span><span style="flex:1"></span><button class="ibtn" type="button" data-new title="Начать разговор заново" aria-label="Начать заново">↺</button><button class="btn primary" type="submit">Отправить</button></div></form></div>`;
  const q = s => host.querySelector(s);
  const av = Avatar.create(q("[data-av]"), {compact:true}); av.start();
  const nb = Notebook.mount(nbHost, { bookId:o.nbBook, key:o.nbKey, ruled:o.ruled, title:o.title || "Тетрадь", sub:"Черновик для этого задания." });
  const ai = Store.aiAvailable();
  if(!ai) host.querySelectorAll("[data-a],[type=submit]").forEach(b=>b.disabled = true);
  const draw = () => { const log = q("[data-log]"); if(!log) return;
    log.innerHTML = st.chat.length ? st.chat.map(m=>`<div class="msg ${m.role==="user"?"me":"ai"} ${m.err?"err":""}">${m.tag?`<small class="tag">${esc(m.tag)}</small>`:""}${m.role==="user" ? esc(m.content) : Draw.html(m.content)}${m.score?`<div><span class="chip ${m.score[0]>=m.score[1]?"ok":"warn"}">${m.score[0]} из ${m.score[1]} б.</span></div>`:""}</div>`).join("")
      : `<p class="emptychat">${ai ? "Застряла? Нажми «Подсказка» или «Нарисуй». Решила? «Проверь решение»." : "Учитель заработает, когда подключится ИИ."}</p>`;
    Draw.decorate(log, st.chat);
    log.scrollTop = log.scrollHeight; };
  const drawPhoto = () => { const el = q("[data-prev]"); if(!el) return; el.innerHTML = st.photo ? `<span class="photochip"><img src="${st.photo.url}" alt="Фото"><button class="pg" type="button" data-rmph aria-label="Убрать фото">✕</button></span>` : "";
    const rm = q("[data-rmph]"); if(rm) rm.addEventListener("click", ()=>{ st.photo = null; drawPhoto(); }); };
  async function send(mode, content, tag, withWork){
    if(!ai || st.busy) return;
    let image = null;
    if(st.photo){ image = st.photo.b64; st.photo = null; drawPhoto(); tag = (tag ? tag+" · " : "") + "📷 фото"; }
    else if(withWork && nb.hasInk()){ await nb.save(); image = nb.image(); tag = (tag ? tag+" · " : "") + "лист тетради"; }
    if(window.Points) Points.logAct();
    st.chat.push({ role:"user", content, tag }); const th = { role:"assistant", content:"Думаю…", pending:true }; st.chat.push(th); draw();
    st.busy = true; av.stop(); av.setMood("think"); av.say(mode==="draw" ? "Рисую…" : "Хм…");
    try{
      const msgs = st.chat.filter(m=>!m.pending && !m.err).slice(-16).map(m=>({ role:m.role, content:m.content }));
      const r = await Store.ask({ mode, subject:o.subject, context:o.context ? o.context() : "", messages:msgs, image, imageType:"jpeg" });
      const m = marks(r && r.text || "Пустой ответ."); th.content = m.text; delete th.pending;
      if(m.score){ th.score = m.score; if(o.onScore) o.onScore(m.score[0], m.score[1]); }
      if(m.know && o.onKnow) o.onKnow(m.know);
      Dock.ping();
      if(st.alive){ av.setMood("smile"); av.say(m.score ? (m.score[0]>=m.score[1] ? "Максимум!" : "Почти, давай разберём") : "Вот!", 3000); }
    }catch(e){ th.content = "Не получилось получить ответ: " + e.message; th.err = true; delete th.pending; if(st.alive){ av.setMood("squint"); av.say("Ой, связь пропала", 3000); } }
    st.busy = false; setTimeout(()=>{ if(st.alive){ av.setMood("idle"); av.start(); } }, 3000);
    if(st.alive) draw();
  }
  const inp = q("[data-in]");
  const A = {
    hint: () => send(o.mode, inp.value.trim() ? `Дай подсказку: ${take()}` : "Дай одну подсказку к этому заданию, не решая его.", "Подсказка", true),
    explain: () => send(o.mode, "Объясни, как решаются такие задания: сначала на жизненном, немного смешном примере, потом коротко по шагам.", "Объяснение"),
    draw: () => send("draw", inp.value.trim() ? `Нарисуй: ${take()}` : "Нарисуй это задание схематично, чтобы было понятнее.", "Нарисуй", true),
    check: () => send(o.mode, inp.value.trim() ? `Проверь моё решение по критериям. ${take()}` : "Проверь моё решение по критериям и поставь баллы.", "Проверка", true)
  };
  const take = () => { const v = inp.value.trim(); inp.value = ""; return v; };
  host.querySelectorAll("[data-a]").forEach(b=>b.addEventListener("click", ()=>A[b.dataset.a]()));
  q("[data-form]").addEventListener("submit", e=>{ e.preventDefault(); const v = take(); if(v) send(o.mode, v); });
  inp.addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); q("[data-form]").requestSubmit(); } });
  q("[data-photo]").addEventListener("click", async()=>{ const got = await Photo.pick(false); if(got[0]){ st.photo = got[0]; drawPhoto(); } });
  q("[data-new]").addEventListener("click", ()=>{ st.chat = []; draw(); });
  draw();
  return {
    ask: text => { Dock.open(); return send(o.mode, text, "", true); },
    check: text => { Dock.open(); return send(o.mode, text, "Проверка", true); },
    setTask: t => nb.setTask(t),
    destroy(){ st.alive = false; av.destroy(); nb.destroy(); if(Dock.kind()==="oge") Dock.release(); }
  };
}};

/* ================= ГДЕ МЫ В КЛАССЕ ================= */
const classAt = () => Object.assign({}, Store.get("classAt", {}));
function topicsOf(b){ const out = []; b.groups.forEach((g,gi)=>g.chapters.forEach((c,ci)=>c.p.forEach((p,pi)=>out.push({ key:`${b.id}.${gi}.${ci}.${pi}`, idx:`${gi}.${ci}.${pi}`, gi, ci, pi, title:p, ch:c })))); return out; }
// номер текущей темы в классе: выбранной вручную или последней отмеченной «пройдено»
function classIdx(b){
  const all = topicsOf(b), k = classAt()[b.id];
  if(k){ const i = all.findIndex(t=>t.key===k); if(i>=0) return i; }
  let last = -1; all.forEach((t,i)=>{ if(App.done[t.key]) last = i; }); return last;
}

/* ================= РЕКОМЕНДАЦИИ НА ГЛАВНОЙ ================= */
function recoHome(){
  const kd = Topic.know().k, again = [], brief = []; let rated = 0;
  BOOKS.forEach(b=>{ const ci = classIdx(b); topicsOf(b).forEach((t,i)=>{ const v = kd[t.key]; if(v===undefined) return; rated++;
    if(ci >= 0 && i > ci) return; // темы дальше класса не рекомендуем повторять
    const item = mode => `<a class="reco-i" href="#t/${b.id}/${t.idx}?${mode}"><span class="dot" style="background:${b.color}"></span><span><b>${esc(b.subject)}</b> · ${esc(t.title)}</span></a>`;
    if(v<=1) again.push(item("scratch")); else if(v===2) brief.push(item("brief")); }); });
  // ОГЭ: ошибки последнего пробного и задания, где среди последних решений много красного
  const oge = [], seen = new Set();
  if(window.Oge && window.Points){ const T = (Object.assign({list:[]}, Store.get("ogeTests", {})).list||[]);
    const unsolved = new Set();
    ["math","rus"].forEach(e=>{ const t = T.filter(x=>x.exam===e && !x.pending).pop(); (t && t.wrong || []).forEach(n=>seen.add(e+":"+n)); (t && t.empty || []).forEach(n=>{ seen.add(e+":"+n); unsolved.add(e+":"+n); }); });
    const L = Points.ogeLast(); Object.entries(L).forEach(([e,o])=>Object.entries(o).forEach(([n,a])=>{ if(a.length>=4 && a.reduce((x,y)=>x+y,0)/a.length < .7) seen.add(e+":"+n); }));
    seen.forEach(k=>{ const [e,n] = k.split(":"); const c = Oge.CAT[e] && Oge.CAT[e][n]; if(c) oge.push(`<a class="reco-i" href="#oge/${e}/${n}"><span class="dot" style="background:${e==="math"?"#2a4fd6":"#8a6d1f"}"></span><span><b>ОГЭ ${e==="math"?"математика":"русский"}</b> · №${n} ${esc(c[0])}${unsolved.has(k) ? ` <span class="chip warn">не решено</span>` : ""}</span></a>`); }); }
  const col = (h, list) => `<div><h4>${h}${list.length?` · ${list.length}`:""}</h4>${list.length ? list.slice(0,8).join("") + (list.length>8?`<p class="sm">и ещё ${list.length-8}</p>`:"") : `<p class="hint">Таких тем нет.</p>`}</div>`;
  return `<section class="panel reco" id="reco"><h3>Рекомендации</h3>
    ${again.length || brief.length || oge.length ? `<div class="reco-cols">${col("Разобрать заново", again)}${col("Повторить", brief)}${oge.length?col("ОГЭ: потренировать", oge):""}</div><p class="hint">Это пройденные темы, где ответы на вопросы учителя, итоговые вопросы или срез знаний показали пробелы. Нажми на тему, и учитель начнёт сразу.</p>`
      : rated ? `<p class="hint">Слабых пройденных тем нет. Так держать!</p>`
      : `<p class="hint">Пока пусто: знание тем заполняется только по ответам на вопросы. Пройди <a href="#account/books">срез знаний</a> по учебнику или поотвечай учителю в темах, и здесь появятся темы, которые стоит повторить.</p>`}</section>`;
}

/* ================= КАРТОЧКИ ПАРАГРАФОВ (индекс учебника) ================= */
const idx = id => Object.assign({k:{}}, Store.get("idx-"+id, {}));
// «120–125, 127» -> ["120",…,"125","127"]
function nums(s){ const out = []; String(s||"").replace(/№/g,"").split(/[,;\s]+(?=\d)/).forEach(part=>{ const m = part.match(/(\d+)\s*[–—-]\s*(\d+)/); if(m){ const a = +m[1], z = +m[2]; if(z>=a && z-a<40) for(let i=a;i<=z;i++) out.push(String(i)); } else { const n = part.match(/\d+[а-яa-z]?/i); if(n) out.push(n[0]); } }); return out; }
function exMarks(bookId){
  const j = Journal.journal(), home = new Set(), cls = new Set();
  j.hw.filter(h=>h.subj===bookId).forEach(h=>nums(h.ex).forEach(n=>home.add(n)));
  (j.cls||[]).filter(c=>c.subj===bookId).forEach(c=>nums(c.ex).forEach(n=>cls.add(n)));
  return { home, cls };
}
function card(b, key){ return idx(b.id).k[key] || null; }
function cardText(b, key){
  const c = card(b, key); if(!c) return "";
  const m = exMarks(b.id), mk = n => m.cls.has(String(n)) ? "решали в классе" : m.home.has(String(n)) ? "задано домой" : "ещё не решали";
  return `Карточка параграфа: ${c.summary||""}
Правила: ${(c.rules||[]).map(r=>`${r.what} (стр. ${r.page})`).join("; ")}
Разобранные примеры: ${(c.examples||[]).map(e=>`${e.n} (стр. ${e.page}): ${e.what}`).join("; ")}
Упражнения: ${(c.exercises||[]).map(e=>`№${e.n} (стр. ${e.page}, уровень ${e.level}, ${e.what}) — ${mk(e.n)}`).join("; ")}`;
}
function exercisesHtml(b, key){
  const c = card(b, key); if(!c || !(c.exercises||[]).length) return "";
  const m = exMarks(b.id), L = ["","базовое","среднее","трудное"];
  return `<details class="plain exlist"><summary class="sm">Упражнения параграфа · ${c.exercises.length}</summary><div class="exgrid">${c.exercises.map(e=>{ const s = m.cls.has(String(e.n)) ? ["cls","в классе"] : m.home.has(String(e.n)) ? ["home","дома"] : ["free","не решали"];
    return `<span class="exi ex-${s[0]}" title="${esc(e.what||"")} · стр. ${esc(e.page)} · ${L[e.level]||""}"><b>№${esc(e.n)}</b><small>${"★".repeat(Math.max(1,Math.min(3,Number(e.level)||1)))} · ${s[1]}</small></span>`; }).join("")}</div></details>`;
}
let building = null;
async function buildIndex(b, status, onlyMissing){
  if(building){ building.stop = true; return; }
  const me = building = { stop:false }, all = topicsOf(b); let made = 0, skipped = 0;
  try{
    for(let i=0;i<all.length && !me.stop;i++){
      const tp = all[i]; if(onlyMissing && card(b, tp.key)){ continue; }
      const t = Topic.find(b.id, tp.idx), rg = t && Topic.range(t); if(!rg){ skipped++; continue; }
      status(`Составляю карточки: ${i+1} из ${all.length} · «${tp.title}»…`);
      const pages = await Topic.pagesFor(b, rg[0], rg[1], 3);
      if(!pages.length){ skipped++; continue; }
      try{ const r = await Store.ask({ mode:"index", topic:{ book:b.title, chapter:`${tp.ch.n} ${tp.ch.t}`, title:tp.title }, pages });
        const c = parseJson(r.text), d = idx(b.id); d.k = Object.assign({}, d.k, {[tp.key]: Object.assign(c, { ts:Date.now() })}); Store.set("idx-"+b.id, d, 0); made++;
      }catch(e){ skipped++; }
    }
    status(me.stop ? `Остановлено. Готово карточек: ${Object.keys(idx(b.id).k).length}.` : `Готово: ${made} новых карточек${skipped?`, пропущено ${skipped} (нет страницы темы или не прочиталось)`:""}.`);
  } finally { building = null; }
}

/* ================= ОГЛАВЛЕНИЕ ПО ФОТО ================= */
const ALLSUBJ = () => BOOKS.map(b=>[b.id,b.subject]).concat(EMPTY.map(e=>[e.id,e.subject]));
function applyToc(){
  ALLSUBJ().map(x=>x[0]).concat(OGE_BOOKS.map(b=>b.id)).forEach(id=>{
    const toc = Store.get("toc-"+id, null); if(!toc || !Array.isArray(toc.chapters) || !toc.chapters.length) return;
    const chapters = toc.chapters.map(c=>({ n:"", t:String(c.title||""), p:(c.topics||[]).map(t=>String(t.title||"")).filter(Boolean) })).filter(c=>c.p.length);
    if(!chapters.length) return;
    let b = BOOKS.find(x=>x.id===id) || OGE_BOOKS.find(x=>x.id===id);
    if(!b){ const e = EMPTY.find(x=>x.id===id); if(!e) return; EMPTY.splice(EMPTY.indexOf(e), 1);
      b = { id, subject:e.subject, color:e.color, title:`${e.subject}. 9 класс`, authors:"Оглавление по фото" }; BOOKS.push(b); }
    // оглавление из PDF учебника: заменяем только группу текущего класса, повторение прошлых лет остаётся
    const orig = b._orig || (b._orig = b.groups || []), gi = orig.findIndex(g=>g.now);
    if(toc.keep && orig.length > 1 && gi >= 0) b.groups = orig.map((g,i)=>i===gi ? { grade:g.grade, now:true, chapters } : g);
    else b.groups = [{ grade:"", now:true, chapters }];
    b.approx = false; b.fromToc = true;
  });
}
let tocState = { subj:"", imgs:[], result:null };
function tocPanel(){
  return `<section class="panel" id="tocp"><h3>Оглавление по фото</h3>
    <p class="hint">Сфотографируй страницы оглавления учебника. ИИ прочитает главы, параграфы и страницы, и учебник появится на полке с правильными темами (подходит и для русского, истории, географии, обществознания).</p>
    <div class="chatrow"><label class="sm" for="tocsubj">Учебник</label><select id="tocsubj">${ALLSUBJ().map(([id,n])=>`<option value="${id}" ${tocState.subj===id?"selected":""}>${esc(n)}</option>`).join("")}</select>
      <button class="btn" type="button" id="tocadd">📷 Фото оглавления</button><button class="btn primary" type="button" id="tocgo" ${Store.aiAvailable()?"":"disabled"}>Распознать</button><span class="sm" id="tocst" aria-live="polite"></span></div>
    <div class="fillimgs" id="tocimgs">${tocState.imgs.map((x,i)=>`<div class="fimg"><img src="${x.url}" alt="Страница ${i+1}"></div>`).join("")}</div>
    <div id="tocres">${tocState.result ? tocPreview() : ""}</div></section>`;
}
function tocPreview(){
  const r = tocState.result; const n = r.chapters.reduce((a,c)=>a+(c.topics||[]).length,0);
  return `<p><b>${pl(r.chapters.length,"глава","главы","глав")}, ${pl(n,"параграф","параграфа","параграфов")}</b></p><div class="tocprev">${r.chapters.map(c=>`<div><b>${esc(c.title)}</b><ol>${(c.topics||[]).map(t=>`<li>${esc(t.title)} <span class="sm">стр. ${esc(t.page??"")}</span></li>`).join("")}</ol></div>`).join("")}</div>
    <p class="note">После применения оглавление этого учебника заменится на распознанное. Отметки «пройдено» и знания по старым темам могут сбиться.</p>
    <div class="btnrow"><button class="btn primary" type="button" id="tocapply">Применить</button><button class="btn" type="button" id="tocdrop">Отменить</button></div>`;
}
function bindToc(root){
  const re = () => { const el = $("tocp"); if(el){ el.outerHTML = tocPanel(); bindToc(root); } };
  $("tocsubj").addEventListener("change", e=>{ tocState.subj = e.target.value; });
  $("tocadd").addEventListener("click", async()=>{ tocState.subj = $("tocsubj").value; const got = await Photo.pick(true); tocState.imgs = tocState.imgs.concat(got).slice(0,8); re(); });
  $("tocgo").addEventListener("click", async()=>{ tocState.subj = $("tocsubj").value; if(!tocState.imgs.length){ $("tocst").textContent = "Сначала добавь фото."; return; }
    $("tocgo").disabled = true; $("tocst").textContent = "ИИ читает оглавление…";
    try{ const r = await Store.ask({ mode:"toc", images: tocState.imgs.map(x=>x.b64), text:`Учебник: ${ALLSUBJ().find(x=>x[0]===tocState.subj)[1]}, 9 класс.` });
      const j = parseJson(r.text); if(!Array.isArray(j.chapters) || !j.chapters.length) throw new Error("оглавление не найдено"); tocState.result = j; re();
    }catch(e){ $("tocst").textContent = "Не получилось: " + e.message; $("tocgo").disabled = false; } });
  if($("tocdrop")) $("tocdrop").addEventListener("click", ()=>{ tocState.result = null; re(); });
  if($("tocapply")) $("tocapply").addEventListener("click", async()=>{
    const id = tocState.subj, r = tocState.result; await Store.set("toc-"+id, { chapters:r.chapters, ts:Date.now() }, 0);
    applyToc(); const m = S.book(id); m.pages = {}; m.chapterPages = {};
    r.chapters.forEach((c,ci)=>(c.topics||[]).forEach((t,pi)=>{ const pg = parseInt(t.page,10); if(pg>0){ m.pages[`${id}.0.${ci}.${pi}`] = pg; if(pi===0) m.chapterPages[`0.${ci}`] = pg; } }));
    S.setBook(id, m); tocState = { subj:id, imgs:[], result:null }; location.hash = "#"+id;
  });
}

/* ================= СБОРНИКИ ОГЭ ================= */
const OGE_BOOKS = [
  { id:"oge-math", exam:"math", subject:"Сборник ОГЭ: математика", title:"Сборник ОГЭ по математике", color:"#2a4fd6", groups:[] },
  { id:"oge-rus", exam:"rus", subject:"Сборник ОГЭ: русский язык", title:"Сборник ОГЭ по русскому языку", color:"#8a6d1f", groups:[] }
];
// сборники ОГЭ по другим предметам: список предметов в Store "ogeExtra"
const OGE_SKIP = ["rus","algebra","geometry","prob","pe","trud","nat"], OGE_COLORS = ["#0f766e","#7c3aed","#b45309","#be185d","#15803d","#1d4ed8","#9a3412","#4d7c0f","#6d28d9"];
const ogeSubjects = () => GRADE_SUBJECTS.filter(([id])=>!OGE_SKIP.includes(id));
// элемент списка: id предмета из GRADE_SUBJECTS или { id, name } для «другого» предмета
const ogeItems = () => (Store.get("ogeExtra", {list:[]}).list || []).map(x=>typeof x==="string" ? { id:x, name:(ogeSubjects().find(y=>y[0]===x)||[])[1] } : x).filter(x=>x && x.id && x.name);
function syncOge(){
  const items = ogeItems(), want = items.map(x=>x.id);
  for(let i = OGE_BOOKS.length-1; i >= 2; i--) if(!want.includes(OGE_BOOKS[i].exam)) OGE_BOOKS.splice(i, 1);
  want.forEach((id,i)=>{ if(OGE_BOOKS.some(b=>b.exam===id)) return; const n = items[i].name;
    OGE_BOOKS.push({ id:"oge-"+id, exam:id, extra:true, subject:`Сборник ОГЭ: ${n.toLowerCase()}`, name:n, title:`Сборник ОГЭ по предмету «${n}»`, color:OGE_COLORS[i % OGE_COLORS.length], groups:[] }); });
}
/* ---------- свои учебники и рабочие тетради: Store "myBooks" ---------- */
const KINDS = [["book","Учебник"],["wb","Рабочая тетрадь"],["oge","Сборник ОГЭ"]];
const EMPTY0 = (window.EMPTY || []).slice();
const myBooks = () => (Store.get("myBooks", {list:[]}).list || []).filter(x=>x && x.id);
function syncMyBooks(){
  const list = myBooks(), ids = list.map(x=>x.id);
  for(let i = BOOKS.length-1; i >= 0; i--) if(BOOKS[i].user && !ids.includes(BOOKS[i].id)){ const gone = BOOKS.splice(i, 1)[0], e = EMPTY0.find(x=>x.id===gone.id); if(e && !EMPTY.some(x=>x.id===e.id)) EMPTY.push(e); }
  list.forEach(x=>{ const ei = EMPTY.findIndex(e=>e.id===x.id); if(ei >= 0) EMPTY.splice(ei, 1);
    let b = BOOKS.find(y=>y.id===x.id);
    if(!b){ b = { id:x.id, groups:[], approx:false }; BOOKS.push(b); }
    Object.assign(b, { user:true, kind:x.kind, subject:x.subject, title:x.title || `${x.subject}. 9 класс`, authors:(KINDS.find(k=>k[0]===x.kind)||[,""])[1], color:x.color || b.color || "#5a5f73" }); });
}
// цвета учебников из настроек: Store "bookColors" { id: "#rrggbb" }
function applyColors(){
  const c = Store.get("bookColors", {}) || {};
  BOOKS.concat(OGE_BOOKS).concat(EMPTY).forEach(b=>{ if(b._color === undefined) b._color = b.color; b.color = c[b.id] || b._color; });
}
const BCOLORS = ["#2a4fd6","#1d7fa8","#0f766e","#1f8a5a","#4d7c0f","#8a6d1f","#b45309","#c2410c","#be185d","#d23c3c","#7c3aed","#5a5f73"];
function colorsPanel(){
  const rows = BOOKS.concat(OGE_BOOKS).concat(EMPTY);
  return `<section class="panel" id="colp"><h3>Цвета учебников</h3><p class="hint" style="margin-top:0">Цвет корешка на полке и полоски на страницах учебника.</p>
    ${rows.map(b=>`<div class="colrow" style="--c:${b.color}"><span class="colname"><i></i>${esc(b.subject)}${b.user || b.title && b.subject!==b.title ? ` <span class="sm muted">${esc(b.title)}</span>` : ""}</span>
      <span class="colsw">${BCOLORS.map(c=>`<button type="button" class="tpick" data-bcol="${b.id}" data-c="${c}" style="--sw:${c}" aria-pressed="${b.color===c}" title="${c}"><i class="tsw"></i></button>`).join("")}<input type="color" data-bcolin="${b.id}" value="${/^#[0-9a-f]{6}$/i.test(b.color)?b.color:"#5a5f73"}" aria-label="Свой цвет: ${esc(b.subject)}"></span></div>`).join("")}</section>`;
}
function bindColors(root, after){
  const set = (id, c) => { const d = Object.assign({}, Store.get("bookColors", {}) || {}); d[id] = c; Store.set("bookColors", d, 0); applyColors(); after && after(); };
  root.querySelectorAll("[data-bcol]").forEach(b=>b.addEventListener("click", ()=>set(b.dataset.bcol, b.dataset.c)));
  root.querySelectorAll("[data-bcolin]").forEach(i=>i.addEventListener("change", ()=>set(i.dataset.bcolin, i.value)));
}
function ogeAddHtml(){
  const have = OGE_BOOKS.map(b=>b.exam), free = ogeSubjects().filter(([id])=>!have.includes(id));
  return `<section class="panel" id="adddoc"><h3>Добавить документ</h3><p class="hint" style="margin-top:0">Учебник, рабочая тетрадь или сборник ОГЭ. По одному предмету можно добавить несколько учебников. Документ появится в списке выше и на полке слева, PDF загружается в его строке.</p>
    <div class="adddoc">
      <label class="sm">Что это<select id="addkind">${KINDS.map(([id,n])=>`<option value="${id}">${n}</option>`).join("")}</select></label>
      <label class="sm">Предмет<select id="addsubj"></select></label>
      <label class="sm" id="addotherl" hidden>Название предмета<input id="addother" maxlength="40" placeholder="например, Астрономия"></label>
      <label class="sm" id="addtitlel">Название (необязательно)<input id="addtitle" maxlength="80" placeholder="например, Русский язык. 9 класс, Бархударов"></label>
      <button class="btn primary" type="button" id="ogeadd">Добавить</button>
    </div><p class="status" id="addst" aria-live="polite"></p>
    <template id="addsubjs-book">${GRADE_SUBJECTS.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}<option value="other">Другое…</option></template>
    <template id="addsubjs-oge">${free.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("")}<option value="other">Другое…</option></template></section>`;
}
function bindOgeAdd(root, after){
  const kind = root.querySelector("#addkind"); if(kind){
    const subj = root.querySelector("#addsubj"), fill = () => { subj.innerHTML = root.querySelector(kind.value==="oge" ? "#addsubjs-oge" : "#addsubjs-book").innerHTML; root.querySelector("#addtitlel").hidden = kind.value==="oge"; other(); };
    const other = () => { root.querySelector("#addotherl").hidden = subj.value!=="other"; };
    kind.addEventListener("change", fill); subj.addEventListener("change", other); fill();
    root.querySelector("#ogeadd").addEventListener("click", async()=>{ const st = root.querySelector("#addst"), k = kind.value, sid = subj.value, oname = root.querySelector("#addother").value.trim();
      const name = sid==="other" ? oname : (GRADE_SUBJECTS.find(x=>x[0]===sid)||[])[1];
      if(!name){ st.textContent = "Впиши название предмета."; return; }
      if(k==="oge"){ const d = Object.assign({list:[]}, Store.get("ogeExtra", {})), id = sid==="other" ? "x" + Date.now().toString(36) : sid;
        if(!d.list.some(x=>(x.id||x)===id)) d.list = d.list.concat([sid==="other" ? { id, name } : id]); await Store.set("ogeExtra", d, 0); syncOge(); applyColors(); applyToc(); after && after("oge-"+id); return; }
      const title = root.querySelector("#addtitle").value.trim(), list = myBooks();
      const id = sid!=="other" && EMPTY.some(e=>e.id===sid) && !BOOKS.some(b=>b.id===sid) ? sid : "u" + Date.now().toString(36);
      const color = (EMPTY.find(e=>e.id===sid)||{}).color || BCOLORS[list.length % BCOLORS.length];
      const kn = k==="wb" ? "Рабочая тетрадь" : "";
      await Store.set("myBooks", { list: list.concat([{ id, kind:k, subj: sid==="other" ? "" : sid, subject:name, title: title || (kn ? `${name}. ${kn}` : `${name}. 9 класс`), color }]) }, 0);
      syncMyBooks(); applyColors(); applyToc(); after && after(id); });
  }
  root.querySelectorAll("[data-mydrop]").forEach(b=>b.addEventListener("click", async()=>{ if(b.dataset.armed!=="1"){ b.dataset.armed = "1"; b.textContent = "Точно убрать? Нажми ещё раз"; return; }
    const id = b.dataset.mydrop; await Store.set("myBooks", { list: myBooks().filter(x=>x.id!==id) }, 0); syncMyBooks(); applyColors(); after && after(); }));
  root.querySelectorAll("[data-ogedrop]").forEach(b=>b.addEventListener("click", async()=>{ const id = b.dataset.ogedrop, d = Object.assign({list:[]}, Store.get("ogeExtra", {}));
    d.list = d.list.filter(x=>(x.id||x)!==id); await Store.set("ogeExtra", d, 0); syncOge(); after && after(); }));
}
// где в сборнике ответы, инструкция и справочные материалы: по оглавлению (номера страниц как в книге)
function ogeSections(b){
  const m = S.book(b.id), ents = [];
  (b.groups||[]).forEach((g,gi)=>g.chapters.forEach((c,ci)=>{ const cp = (m.chapterPages||{})[`${gi}.${ci}`]; if(cp) ents.push({ t:c.t, p:cp });
    c.p.forEach((x,pi)=>{ const pg = (m.pages||{})[`${b.id}.${gi}.${ci}.${pi}`]; if(pg) ents.push({ t:x, p:pg }); }); }));
  ents.sort((a,c)=>a.p-c.p);
  const last = (m.totalPages||0) - (Number(m.offset)||0), find = re => { const i = ents.findIndex(e=>re.test(e.t)); if(i<0) return null;
    const from = ents[i].p, nx = ents.slice(i+1).find(e=>e.p > from && !re.test(e.t)); return [from, Math.max(from, nx ? nx.p - 1 : last || from)]; };
  // инструкция к работе = раздел «Инструкция…» и раздел «Система оценивания…» (оба, если есть)
  const ins = find(/инструкци/i), score = find(/систем\S* оценивани|критери\S* оценивани/i);
  return { key: find(/ответ/i), instr: ins || score, instr2: ins && score ? score : null, ref: find(/справочн/i) };
}
// инструкция по выполнению работы и справочные материалы сборника: ИИ переписывает их один раз в текст
const INFO_KINDS = { instr:"Инструкция по выполнению работы", ref:"Справочные материалы" };
const ogeInfo = b => Object.assign({}, Store.get("oinfo-"+b.id, {}) || {});
function ogeInfoRows(){ return ""; }
function bindOgeInfo(root, after){
  root.querySelectorAll("[data-oiread]").forEach(btn=>btn.addEventListener("click", async()=>{ const [id, k] = btn.dataset.oiread.split(":"), b = OGE_BOOKS.find(x=>x.id===id), st = $(`status-oi-${id}-${k}`), say = t => { if(st) st.textContent = t; };
    let from = parseInt(root.querySelector(`[data-oifrom="${id}:${k}"]`).value,10), to = parseInt(root.querySelector(`[data-oito="${id}:${k}"]`).value,10);
    btn.disabled = true;
    try{ await readInfo(b, k, from, to, say);
      after && after(b.id); }
    catch(e){ say("Не получилось: " + e.message); btn.disabled = false; } }));
}
async function readInfo(b, k, from, to, say, append){
  if(!(from > 0)) throw new Error("укажи страницы"); if(!(to >= from)) to = from; if(to - from > 11) to = from + 11;
  const m = S.book(b.id), total = m.totalPages || 999, off = Number(m.offset)||0, parts = [];
  for(let a = from; a <= to; a += 4){ const z = Math.min(to, a+3), images = [];
    say(`${INFO_KINDS[k]}: учитель читает страницы ${a}–${z}…`);
    for(let n = a; n <= z; n++) images.push(await Reader.pageImage(b, Math.max(1, Math.min(total, n + off)), 1400));
    const r = await Store.ask({ mode:"transcribe", images, text:`${INFO_KINDS[k]} из сборника «${b.title}». Страницы ${a}–${z}.` });
    parts.push(String(r.text||"").trim()); }
  const inf = ogeInfo(b), was = append && inf[k] && inf[k].text ? inf[k].text + "\n\n" : "";
  inf[k] = { text: was + parts.join("\n\n"), pages:[from, to], ts:Date.now() }; await Store.set("oinfo-"+b.id, inf, 0);
}
// после оглавления сборника: ответы, инструкция и справочные материалы читаются сами, если они есть в оглавлении
// если в оглавлении нет строк «Вариант N», ищем заголовки вариантов в тексте самого PDF
async function findVariantPages(b, say){
  const m = S.book(b.id), total = m.totalPages || 0, off = Number(m.offset)||0, found = {};
  for(let n = 1; n <= total; n++){ if(n % 20 === 1) say(`Ищу варианты в сборнике: страница ${n} из ${total}…`);
    let t = ""; try{ t = await Reader.pageText(b, n); }catch(e){}
    const head = t.split("\n").slice(0, 6).join(" "), mm = head.match(/вариант\s*№?\s*(\d{1,2})(?!\d)/i);
    if(mm && !found[mm[1]]) found[mm[1]] = n - off; }
  if(Object.keys(found).length){ m.varPages = found; await S.setBook(b.id, m); }
  return Object.keys(found).length;
}
async function ogeAutoPrep(b, say){
  const sec = ogeSections(b), done = [];
  if(!ogeVariants(b).some(x=>x.page)){ const n = await findVariantPages(b, say).catch(()=>0); if(n) done.push(`страницы ${pl(n,"варианта","вариантов","вариантов")} по тексту сборника`); }
  if(sec.key){ try{ const n = await readKey(b, sec.key[0], Math.min(sec.key[1], sec.key[0]+39), say); if(n) done.push(`ответы к ${pl(n,"варианту","вариантам","вариантам")}`); }catch(e){ console.warn(e); } }
  for(const k of ["instr","ref"]) if(sec[k]){ try{ await readInfo(b, k, sec[k][0], sec[k][1], say); if(k==="instr" && sec.instr2) await readInfo(b, k, sec.instr2[0], sec.instr2[1], say, true); done.push(k==="instr" && (sec.instr2 || /оценив/i.test(String(sec.instrT||""))) ? "инструкция и система оценивания" : INFO_KINDS[k].toLowerCase()); }catch(e){ console.warn(e); } }
  return done;
}
// для заданий: текст инструкции/справки по экзамену
function ogeInfoFor(exam){ const b = OGE_BOOKS.find(x=>x.exam===exam); if(!b) return {}; const inf = ogeInfo(b); return { b, instr: inf.instr, ref: inf.ref }; }
// ответы сборника: ИИ один раз читает страницы с ответами, по ним сверяется пробный вариант
const ogeKey = b => Object.assign({ v:{} }, Store.get("okey-"+b.id, {}) || {});
function ogeVariants(b){
  const key = ogeKey(b), m = S.book(b.id), out = {};
  (b.groups||[]).forEach((g,gi)=>g.chapters.forEach((c,ci)=>{ const mm = String(c.t).match(/вариант\s*№?\s*(\d+)/i);
    if(mm) out[mm[1]] = (m.chapterPages||{})[`${gi}.${ci}`] || (m.pages||{})[`${b.id}.${gi}.${ci}.0`] || 0;
    c.p.forEach((p,pi)=>{ const t = String(p).match(/вариант\s*№?\s*(\d+)/i); if(t && !out[t[1]]) out[t[1]] = (m.pages||{})[`${b.id}.${gi}.${ci}.${pi}`] || 0; }); }));
  Object.entries(m.varPages||{}).forEach(([v,pg])=>{ if(!out[v]) out[v] = pg; });
  // страницы варианта: от его начала до начала следующего раздела оглавления
  const starts = [];
  (b.groups||[]).forEach((g,gi)=>g.chapters.forEach((c,ci)=>{ const cp = (m.chapterPages||{})[`${gi}.${ci}`]; if(cp) starts.push(cp); c.p.forEach((x,pi)=>{ const pg = (m.pages||{})[`${b.id}.${gi}.${ci}.${pi}`]; if(pg) starts.push(pg); }); }));
  starts.sort((a,c)=>a-c);
  const last = (m.totalPages||0) - (Number(m.offset)||0);
  const ids = [...new Set(Object.keys(out).concat(Object.keys(key.v)))].sort((a,c)=>a-c);
  return ids.map(v=>{ const page = out[v] || 0, nx = page ? starts.find(x=>x > page) : 0;
    return { v, page, end: page ? Math.min(page + 15, Math.max(page, (nx || last || page+1) - 1)) : 0, n: key.v[v] ? Object.keys(key.v[v]).length : 0, hasKey: !!key.v[v] }; });
}
// строка-статус у сборника: что взято из оглавления (ответы, инструкция, справочные материалы читаются сами вместе с оглавлением)
function ogeKeyRow(b){
  if(!(S.book(b.id).chunks && S.book(b.id).chunks.length)) return b.extra ? `<div class="btnrow"><button class="btn" type="button" data-ogedrop="${b.exam}">Убрать сборник</button></div>` : "";
  const vs = Object.keys(ogeKey(b).v), inf = ogeInfo(b), chip = (ok, t) => `<span class="chip ${ok?"ok":""}">${ok?"✓ ":""}${t}</span>`;
  return `<div class="chatrow okeyrow"><span class="sm">Из оглавления:</span>${chip(vs.length, vs.length ? `ответы к ${pl(vs.length,"варианту","вариантам","вариантам")}` : "ответы")}${chip(inf.instr && inf.instr.text, "инструкция")}${inf.ref && inf.ref.text || ogeSections(b).ref ? chip(inf.ref && inf.ref.text, "справочные материалы") : ""}
    ${!vs.length ? `<span class="sm">Читаются сами, когда нажмёшь «Взять главы и страницы из оглавления».</span>` : ""}${b.extra ? `<button class="btn" type="button" data-ogedrop="${b.exam}">Убрать сборник</button>` : ""}</div>`;
}
async function readKey(b, from, to, say){
  const m = S.book(b.id), total = m.totalPages || 999, off = Number(m.offset)||0;
  if(!(from > 0)) throw new Error("укажи страницы с ответами");
  if(!(to >= from)) to = from; if(to - from > 39) throw new Error("не больше 40 страниц за раз");
  const key = ogeKey(b); key.v = Object.assign({}, key.v); key.pages = [from, to];
  for(let a = from; a <= to; a += 4){
    const z = Math.min(to, a + 3), images = [];
    say(`Учитель читает ответы: страницы ${a}–${z} из ${from}–${to}…`);
    for(let n = a; n <= z; n++) images.push(await Reader.pageImage(b, Math.max(1, Math.min(total, n + off)), 1400));
    const r = await Store.ask({ mode:"anskey", images, text:`Сборник: ${b.title}. Это страницы ${a}–${z} с ответами.` });
    const j = parseJson(String(r.text||""));
    Object.entries(j.variants||{}).forEach(([v, ans])=>{ const vv = String(v).replace(/\D/g,""); if(!vv) return; key.v[vv] = Object.assign({}, key.v[vv], ...Object.entries(ans||{}).map(([n,x])=>({ [String(n).replace(/\D/g,"")]: String(x ?? "").trim() }))); });
  }
  key.ts = Date.now(); await Store.set("okey-"+b.id, key, 0);
  if(window.Oge && Oge.recheck) Oge.recheck(b.exam);
  return Object.keys(key.v).length;
}
function bindOgeKey(root, after){
  root.querySelectorAll("[data-okread]").forEach(btn=>btn.addEventListener("click", async()=>{ const b = OGE_BOOKS.find(x=>x.id===btn.dataset.okread), st = $("status-ok-"+b.id), say = t => { if(st) st.textContent = t; };
    btn.disabled = true;
    try{ const n = await readKey(b, parseInt(root.querySelector(`[data-okfrom="${b.id}"]`).value,10), parseInt(root.querySelector(`[data-okto="${b.id}"]`).value,10), say);
      after && after(b.id); const s2 = $("status-ok-"+b.id); if(s2) s2.textContent = n ? `Готово: ответы к ${pl(n,"варианту","вариантам","вариантам")}.` : "Ответов не нашлось: проверь страницы."; }
    catch(e){ say("Не получилось: " + e.message); btn.disabled = false; } }));
}
// страница сборника для задания N: по оглавлению сборника (глава или раздел, где есть «задание N» или «№N»)
function ogePage(exam, num){
  const b = OGE_BOOKS.find(x=>x.exam===exam); if(!b) return 0; const m = S.book(b.id), re = new RegExp(`(задани[еяй]|№)\\s*${num}(?!\\d)`, "i");
  let pg = 0;
  (b.groups||[]).forEach((g,gi)=>g.chapters.forEach((c,ci)=>{ if(pg) return;
    if(re.test(c.t)) pg = (m.chapterPages||{})[`${gi}.${ci}`] || (m.pages||{})[`${b.id}.${gi}.${ci}.0`] || 0;
    c.p.forEach((p,pi)=>{ if(!pg && re.test(p)) pg = (m.pages||{})[`${b.id}.${gi}.${ci}.${pi}`] || 0; }); }));
  return pg;
}
const ogeBook = exam => { const b = OGE_BOOKS.find(x=>x.exam===exam); if(!b) return null; const m = S.book(b.id); return m.chunks && m.chunks.length ? b : null; };
function ogeBooksHtml(){
  return `<div class="ogebooks">${OGE_BOOKS.map(b=>{ const m = S.book(b.id), has = m.chunks && m.chunks.length;
    return `<div class="ogebook"><b>${esc(b.subject)}</b><span class="sm">${has ? `${esc(m.fileName||"сборник.pdf")}, ${pl(m.totalPages||0,"страница","страницы","страниц")}` : "сборник ФИПИ в PDF не загружен"}</span>
      <div class="chatrow">${has?`<button class="btn" type="button" data-ogeopen="${b.id}">Открыть</button>`:""}<button class="btn ${has?"":"primary"}" type="button" data-ogeup="${b.id}">${has?"Заменить":"Загрузить PDF"}</button><input type="file" accept="application/pdf,.pdf" hidden data-ogefile="${b.id}"></div>
      <p class="status" id="status-${b.id}" aria-live="polite"></p></div>`; }).join("")}</div>`;
}
function bindOgeBooks(root, after){
  root.querySelectorAll("[data-ogeopen]").forEach(btn=>btn.addEventListener("click", ()=>Reader.open(OGE_BOOKS.find(x=>x.id===btn.dataset.ogeopen), 0, "")));
  root.querySelectorAll("[data-ogeup]").forEach(btn=>{ const b = OGE_BOOKS.find(x=>x.id===btn.dataset.ogeup), fi = root.querySelector(`[data-ogefile="${b.id}"]`);
    btn.addEventListener("click", ()=>fi.click());
    fi.addEventListener("change", ()=>{ const f = fi.files && fi.files[0]; fi.value = ""; App.uploadPdf(b, f, "status-"+b.id, after || (()=>Oge.render())); }); });
}

/* ================= ЗНАНИЯ ПО УЧЕБНИКАМ (кабинет) ================= */
// знания по учебнику: в разделе самого учебника (выставляются учителем автоматически по ответам)
function bookKnowHtml(b){
  const kd = Topic.know().k, all = topicsOf(b), ci = classIdx(b), rated = all.filter(t=>kd[t.key]!==undefined).length, cards = Object.keys(idx(b.id).k).length, file = S.book(b.id).chunks && S.book(b.id).chunks.length;
  return `<div class="knowrow bookknow" style="--c:${b.color}"><div class="kh"><b>Знания</b><span class="sm">учитель оценил ${rated} из ${all.length} тем</span></div>
    <p class="sm" style="margin:0">Уровень знания каждой темы выставляет учитель сам: по ответам в теме, итоговым вопросам и срезу знаний.</p>
    <label class="sm">Сейчас в классе<select data-classat="${b.id}"><option value="">${ci>=0?"по отметкам «пройдено»":"— не выбрано —"}</option>${all.map(t=>`<option value="${t.key}" ${classAt()[b.id]===t.key?"selected":""}>${t.ci+1}.${t.pi+1}. ${esc(t.title.slice(0,60))}</option>`).join("")}</select></label>
    <div class="chatrow"><a class="btn primary" href="#cut/${b.id}">Срез знаний</a></div></div>`;
}
// кнопка «Составить карточки параграфов» — в личном кабинете, в строке учебника
function idxButton(b){
  const cards = Object.keys(idx(b.id).k).length, file = S.book(b.id).chunks && S.book(b.id).chunks.length;
  return `<button class="btn" type="button" data-idx="${b.id}" ${file && Store.aiAvailable()?"":"disabled"} title="${file?"Учитель один раз прочитает учебник: что объясняется, какие примеры и упражнения на каких страницах":"Сначала загрузи PDF"}">${cards?`Дополнить карточки параграфов (${cards})`:"Составить карточки параграфов"}</button>`;
}
function bindKnow(root){
  root.querySelectorAll("[data-classat]").forEach(s=>s.addEventListener("change", ()=>{ const d = classAt(); if(s.value) d[s.dataset.classat] = s.value; else delete d[s.dataset.classat]; Store.set("classAt", d, 0); }));
  root.querySelectorAll("[data-idx]").forEach(btn=>btn.addEventListener("click", ()=>{ const b = BOOKS.find(x=>x.id===btn.dataset.idx), st = $("status-"+b.id);
    if(building){ building.stop = true; return; }
    btn.textContent = "Остановить"; buildIndex(b, t=>{ if(st) st.textContent = t; }, true).finally(()=>{ if(btn.isConnected) btn.textContent = "Дополнить карточки параграфов"; }); }));
}

/* ================= СРЕЗ ЗНАНИЙ ================= */
const BATCH = 6;
let cut = null;
const nrm = s => String(s??"").toLowerCase().replace(/ё/g,"е").replace(/,/g,".").replace(/[\s«»"'!?]/g,"").replace(/\.$/,"").replace(/[−–—]/g,"-");
const okShort = (a, v) => { const x = nrm(a), y = nrm(v); if(!y) return false; if(x===y) return true; const nx = Number(x), ny = Number(y); return Number.isFinite(nx) && Number.isFinite(ny) && Math.abs(nx-ny) < 1e-6; };
function leaveCut(){ if(cut){ cut.alive = false; if(cut.av) cut.av.destroy(); } cut = null; }
function renderCut(bookId){
  leaveCut();
  const b = BOOKS.find(x=>x.id===bookId); if(!b){ $("main").innerHTML = `<section class="panel"><p>Такого учебника нет.</p></section>`; return; }
  const ci = classIdx(b), topics = topicsOf(b).map((t,i)=>Object.assign(t, { i, beyond: ci>=0 && i>ci }));
  const me = cut = { b, topics, qs:[], pos:0, ans:[], gen:0, pending:null, alive:true, ci };
  $("main").innerHTML = `<section class="panel cut" style="--c:${b.color}"><div class="crumbs"><a href="#account">Личный кабинет</a></div><h2>Срез знаний: ${esc(b.subject)}</h2>
    <div class="tutorstage" id="cutstage"></div>
    <div id="cutbody"><p class="hint">Быстрый тест по всем темам учебника: на каждую тему по 3 коротких вопроса разной сложности. Отвечай сразу, без тетради. Когда дойдёшь до тем, которых ещё не было, нажми «Стоп».</p>
      <p class="hint">${ci>=0 ? `Сейчас в классе: <b>${esc(topics[ci].title)}</b>. Темы после неё помечены «дальше программы» и не портят оценку.` : `Текущая тема в классе не выбрана: выбери её в личном кабинете, чтобы темы дальше программы были помечены.`}</p>
      <label class="sm">Начать с темы <select id="cutfrom">${topics.map(t=>`<option value="${t.i}">${t.ci+1}.${t.pi+1}. ${esc(t.title.slice(0,70))}</option>`).join("")}</select></label>
      <div class="btnrow"><button class="btn primary" type="button" id="cutgo" ${Store.aiAvailable()?"":"disabled"}>Начать срез</button></div>
      ${Store.aiAvailable()?"":`<p class="note">Срезу нужен ИИ-учитель: он составляет вопросы по учебнику.</p>`}</div></section>`;
  me.av = Avatar.create($("cutstage"), {compact:true}); me.av.start(); me.av.say("Проверим, что уже знаешь?", 4000);
  $("cutgo").addEventListener("click", ()=>{ me.gen = Number($("cutfrom").value)||0; me.start = me.gen; next(me); });
}
function genBatch(me){
  if(me.pending || me.gen >= me.topics.length) return me.pending;
  const part = me.topics.slice(me.gen, me.gen + BATCH); me.gen += part.length;
  const list = part.map(t=>{ const c = card(me.b, t.key); return { n:t.i, title:t.title, chapter:t.ch.t, summary: c ? c.summary : undefined }; });
  me.pending = Store.ask({ mode:"cut", topic:{ book:me.b.title, topics:list } }).then(r=>{
    const qs = (parseJson(r.text).questions||[]).filter(q=>q && q.q && me.topics[q.topic] && part.includes(me.topics[q.topic]));
    qs.sort((a,b)=>a.topic-b.topic || a.level-b.level); me.qs = me.qs.concat(qs);
  }).catch(e=>{ me.err = e.message; }).finally(()=>{ me.pending = null; });
  return me.pending;
}
async function next(me){
  if(!me.alive) return;
  if(me.qs.length - me.pos < 4) genBatch(me);
  if(me.pos >= me.qs.length){
    if(me.pending){ $("cutbody").innerHTML = `<p class="hint">Учитель готовит вопросы…</p><div class="btnrow"><button class="btn" type="button" id="cutstop">Стоп</button></div>`; $("cutstop").addEventListener("click", ()=>finishCut(me)); me.av.setMood("think"); await me.pending; me.av.setMood("idle"); return next(me); }
    if(me.gen < me.topics.length && !me.err){ genBatch(me); return next(me); }
    return finishCut(me);
  }
  const q = me.qs[me.pos], t = me.topics[q.topic], done = me.pos, total = Math.max(me.qs.length, (me.topics.length - me.start) * 3);
  $("cutbody").innerHTML = `<div class="cutq"><div class="cut-top"><span class="sm">Вопрос ${done+1} · тема ${t.ci+1}.${t.pi+1} «${esc(t.title)}»</span>${t.beyond?`<span class="chip warn">дальше пройденного в классе</span>`:""}<span class="chip">${"★".repeat(Math.max(1,Math.min(3,Number(q.level)||1)))}</span></div>
    <div class="bar"><i style="width:${Math.round(100*done/total)}%"></i></div>
    <p class="oge-text">${esc(q.q)}</p>
    ${q.type==="choice" ? `<div class="cutopts">${(q.options||[]).map((o,j)=>`<button class="btn" type="button" data-o="${j}">${esc(o)}</button>`).join("")}<button class="btn ghost" type="button" data-o="-1">Не знаю</button></div>`
      : `<form id="cutf" class="chatrow"><input type="text" id="cutin" autocomplete="off" aria-label="Ответ"><button class="btn primary" type="submit">Ответить</button><button class="btn ghost" type="button" id="cutskip">Не знаю</button></form>`}
    <div class="btnrow"><button class="btn" type="button" id="cutstop">Стоп, дальше не проходили</button></div></div>`;
  const answer = v => { const ok = q.type==="choice" ? Number(v)===Number(q.answer) : okShort(q.answer, v); me.ans[me.pos] = { ok, v }; me.pos++; next(me); };
  $("cutbody").querySelectorAll("[data-o]").forEach(b=>b.addEventListener("click", ()=>answer(b.dataset.o)));
  if($("cutf")){ $("cutin").focus(); $("cutf").addEventListener("submit", e=>{ e.preventDefault(); answer($("cutin").value); }); $("cutskip").addEventListener("click", ()=>answer("")); }
  $("cutstop").addEventListener("click", ()=>finishCut(me));
}
async function finishCut(me){
  if(!me.alive || me.finished) return; me.finished = true;
  const per = {}; me.qs.slice(0, me.pos).forEach((q,i)=>{ const p = per[q.topic] = per[q.topic] || { n:0, ok:0, w:0, wok:0 }; const lv = Math.max(1, Math.min(3, Number(q.level)||1)); p.n++; p.w += lv; if(me.ans[i].ok){ p.ok++; p.wok += lv; } });
  const ids = Object.keys(per).map(Number), covered = ids.filter(i=>!me.topics[i].beyond), base = covered.length ? covered : ids;
  const W = base.reduce((a,i)=>a+per[i].w,0), WO = base.reduce((a,i)=>a+per[i].wok,0), pct = W ? WO/W : 0, mark = pct>=.85?5:pct>=.65?4:pct>=.45?3:2;
  // знания по темам
  const kd = Topic.know(); kd.k = Object.assign({}, kd.k);
  ids.forEach(i=>{ const p = per[i], r = p.ok/p.n, t = me.topics[i]; const v = p.n>=2 && r===1 ? 3 : r>=.5 ? 2 : 1;
    if(t.beyond && v<3) return; kd.k[t.key] = v; });
  Store.set("know", kd, 0);
  const all = Object.assign({list:[]}, Store.get("cuts", {})), prev = all.list.filter(x=>x.book===me.b.id).pop();
  all.list = all.list.concat([{ ts:Date.now(), book:me.b.id, pct, mark, answered:me.pos, topics:ids.length }]); Store.set("cuts", all, 0);
  if(window.Points) Points.logAct();
  const row = i => { const p = per[i], t = me.topics[i], r = p.ok/p.n;
    return `<tr><td>${t.ci+1}.${t.pi+1}</td><td><a href="#t/${me.b.id}/${t.idx}?${r<.5?"scratch":"brief"}">${esc(t.title)}</a>${t.beyond?` <span class="chip warn">дальше программы</span>`:""}</td><td>${p.ok} из ${p.n}</td><td><span class="chip ${r===1?"ok":r>=.5?"":"warn"}">${r===1?"знаю":r>=.5?"повторить":"разобрать"}</span></td></tr>`; };
  $("cutbody").innerHTML = ids.length ? `<p><b>Понимание пройденного: ${Math.round(pct*100)}% · оценка ${mark}</b>${covered.length<ids.length?` <span class="sm">(темы дальше программы не учитываются в оценке)</span>`:""}</p>
    <div class="tablewrap"><table class="grades"><thead><tr><th>№</th><th>Тема</th><th>Верно</th><th></th></tr></thead><tbody>${ids.map(row).join("")}</tbody></table></div>
    <p class="hint">Слабые пройденные темы теперь в «Рекомендациях» на главной.</p><div class="btnrow"><a class="btn primary" href="#home">На главную</a><a class="btn" href="#account">В кабинет</a></div>`
    : `<p class="hint">Ни на один вопрос не ответили.</p><div class="btnrow"><a class="btn" href="#account">В кабинет</a></div>`;
  if(ids.length){ const verdict = pct===1 ? "perfect" : !prev ? (pct>=.5?"better":"worse") : pct>prev.pct ? "better" : pct<prev.pct ? "worse" : "same";
    me.av.stop(); await Avatar.grade({ mark, verdict, detail:`Срез знаний, ${me.b.subject}: понимание ${Math.round(pct*100)}%.` }); if(me.alive) me.av.start(); }
}

/* ================= ПАМЯТКИ ================= */
function renderMemos(){
  const d = Draw.memos(), FIGS = ["memo","task"];
  const memo = d.list.filter(x=>x.kind==="memo"), task = d.list.filter(x=>x.spec && x.kind!=="memo"),
    imgs = d.list.filter(x=>x.kind==="img"), msgs = d.list.filter(x=>x.kind==="msg"), chats = d.list.filter(x=>x.kind==="chat"), files = d.list.filter(x=>x.kind==="file");
  const fig = x => `<figure class="memo-card"><figcaption>${esc(x.title)}</figcaption>${Draw.svg(x.spec)}${x.note?`<div class="md memonote">${Draw.md(x.note)}</div>`:""}<div class="chatrow" data-said="${encodeURIComponent(x.note||"")}"><button class="ibtn" type="button" data-png="${encodeURIComponent(JSON.stringify(x.spec))}" title="Скачать картинкой" aria-label="Скачать">⬇</button><button class="ibtn" type="button" data-memodel="${x.id}" title="Удалить" aria-label="Удалить">✕</button></div></figure>`;
  const when = x => x.ts ? `<span class="sm">${new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(new Date(x.ts))}</span>` : "";
  const del = x => `<button class="ibtn" type="button" data-memodel="${x.id}" title="Удалить" aria-label="Удалить">🗑</button>`;
  const imgCard = x => `<figure class="memo-card"><figcaption>${esc(x.title||"Мой рисунок")}</figcaption><a data-mfile="${esc(x.path)}" data-mname="${esc((x.title||"рисунок").replace(/[\\/:*?"<>|]/g,""))}.jpg" href="#memos"><img class="memoimg" data-mimg="${esc(x.path)}" alt="${esc(x.title||"Мой рисунок")}"></a><div class="chatrow">${when(x)}<span style="flex:1"></span>${del(x)}</div></figure>`;
  const msgCard = x => `<figure class="memo-card memo-msg"><figcaption>${esc(x.title)}</figcaption><div class="memobody">${Draw.html(x.text||"")}</div><div class="chatrow">${when(x)}<span style="flex:1"></span>${del(x)}</div></figure>`;
  const chatCard = x => `<figure class="memo-card memo-chat"><figcaption>💬 ${esc(x.title)}</figcaption><details><summary class="sm">${pl((x.msgs||[]).length,"сообщение","сообщения","сообщений")}, открыть</summary><div class="chatlog memo-log">${(x.msgs||[]).map(m=>`<div class="msg ${m.role==="user"?"me":"ai"}">${m.role==="user" ? esc(m.content) : Draw.html(m.content)}</div>`).join("")}</div></details><div class="chatrow">${when(x)}<span style="flex:1"></span>${del(x)}</div></figure>`;
  const fileCard = x => `<figure class="memo-card"><figcaption>📎 ${esc(x.name||x.title)}</figcaption>${/^image\//.test(x.type||"") ? `<img class="memoimg" data-mimg="${esc(x.path)}" alt="${esc(x.name||"")}">` : ""}${x.note?`<div class="md memonote">${esc(x.note)}</div>`:""}<div class="chatrow"><button class="btn" type="button" data-mfile="${esc(x.path)}" data-mname="${esc(x.name||"файл")}">⬇ Открыть</button>${when(x)}<span style="flex:1"></span>${del(x)}</div></figure>`;
  const sec = (h, arr, f) => arr.length ? `<section class="panel"><h3>${h} · ${arr.length}</h3><div class="memogrid">${arr.map(f).join("")}</div></section>` : "";
  $("main").innerHTML = `<div class="stack"><section class="panel"><h2>Памятки</h2><p class="hint" style="margin:6px 0 0">Сюда попадает всё, что сохранено звёздочкой ⭐: рисунки и сообщения учителя, целые диалоги, листы из тетради. Можно добавить и свои файлы: конспекты, фото, PDF.</p>
    <div class="btnrow"><button class="btn primary" type="button" id="memoup">📎 Добавить свой файл</button><input type="file" id="memofile" multiple hidden><span class="sm" id="memost" aria-live="polite"></span></div></section>
    ${d.list.length ? sec("Памятки к правилам", memo, fig) + sec("Рисунки к задачам", task, fig) + sec("Сообщения учителя", msgs, msgCard) + sec("Диалоги с учителем", chats, chatCard) + sec("Мои рисунки", imgs, imgCard) + sec("Мои файлы", files, fileCard)
      : `<section class="panel"><p class="hint">Пока пусто. Нажми ⭐ на рисунке или сообщении учителя, «Сохранить весь диалог» под чатом или «⭐ В памятки» в тетради.</p></section>`}</div>`;
  const main = $("main");
  main.querySelectorAll("[data-memodel]").forEach(b=>b.addEventListener("click", ()=>{ const dd = Draw.memos(), x = dd.list.find(y=>y.id===b.dataset.memodel); dd.list = dd.list.filter(y=>y.id!==b.dataset.memodel); Store.set("memos", dd, 0); if(x && x.path) Store.removeFile(x.path).catch(()=>{}); renderMemos(); }));
  main.querySelectorAll("[data-mimg]").forEach(async im=>{ try{ const blob = await Store.getFile(im.dataset.mimg); if(blob) im.src = URL.createObjectURL(blob); }catch(e){ im.alt = "Не загрузилось"; } });
  main.querySelectorAll("[data-mfile]").forEach(a=>a.addEventListener("click", async e=>{ e.preventDefault();
    try{ const blob = await Store.getFile(a.dataset.mfile); if(!blob) return; const u = URL.createObjectURL(blob);
      if(/^(image\/|application\/pdf)/.test(blob.type)) window.open(u, "_blank", "noopener"); else { const l = document.createElement("a"); l.href = u; l.download = a.dataset.mname; document.body.appendChild(l); l.click(); l.remove(); }
    }catch(err){ $("memost").textContent = "Не получилось открыть файл"; } }));
  $("memoup").addEventListener("click", ()=>$("memofile").click());
  $("memofile").addEventListener("change", async()=>{ const fs = [...($("memofile").files||[])]; $("memofile").value = ""; if(!fs.length) return;
    for(const f of fs){
      if(f.size > 45*1024*1024){ $("memost").textContent = `«${f.name}» больше 45 МБ`; continue; }
      $("memost").textContent = `Загружаю «${f.name}»…`;
      try{ const path = `memos/files/${Date.now()}-${f.name.replace(/[^\wа-яё.\-]+/gi,"_").slice(-80)}`; await Store.putFile(path, f);
        Draw.addMemo({ kind:"file", title:f.name, name:f.name, type:f.type||"", size:f.size, path });
      }catch(e){ $("memost").textContent = `Не получилось загрузить «${f.name}»`; return; } }
    renderMemos(); $("memost").textContent = "Готово"; });
}

/* ================= ВСЁ ВМЕСТЕ ================= */
/* ================= ПРОФИЛЬ: фото, вход, сброс ================= */
const profile = () => Object.assign({ photo:"", name:"" }, Store.get("profile", {}));
// название сайта по имени: Даша → Dasha’s study, Дима → Dima’s study
const TR = {а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
function siteTitle(){
  const n = (profile().name || "").trim().split(/\s+/)[0] || "Даша";
  const lat = [...n.toLowerCase()].map(ch=>TR[ch] ?? ch).join("").replace(/[^a-z'-]/g,"");
  const nm = lat ? lat[0].toUpperCase() + lat.slice(1) : "Dasha";
  return `${nm}’s study`;
}
function drawMe(){
  const t = siteTitle(), h = $("sitetitle"); if(h && h.textContent !== t) h.textContent = t; if(document.title !== t) document.title = t;
  const a = $("mebtn"); if(!a) return;
  a.hidden = Store.mode==="cloud" && !Store.user;
  const p = profile(), img = $("meimg"), ini = $("meinit");
  img.hidden = !p.photo; if(p.photo) img.src = p.photo; else img.removeAttribute("src");
  ini.hidden = !!p.photo; ini.textContent = ((p.name || (Store.user && Store.user.email) || "Даша").trim()[0] || "Д").toUpperCase();
  a.classList.toggle("on", location.hash.startsWith("#account"));
}
// результаты учёбы: обнуляются кнопкой «Обнулить результаты»
const RESULT_KEYS = ["progress","grades","diary","tests","oge","ogeRes","ogeTests","quizzes","quizRes","act","bonuses","rewards","journal","know","cuts"];
const WORK_PREFIX = /^(notes-|ink-|nb-|memos$|boards$|events$|classAt$)/;
let isAdmin = null;
function profilePanel(){
  const p = profile(), cloud = Store.mode==="cloud";
  return `<div class="stack" id="profp">
  <section class="panel profcard"><h3>Фото и имя</h3>
    <div class="profrow">
      <button type="button" class="profpic" id="profpic" title="Загрузить фото">${p.photo?`<img src="${p.photo}" alt="Моё фото">`:`<span>${esc(((p.name||"Д")[0]||"Д").toUpperCase())}</span>`}<i>📷</i></button>
      <div class="profform">
        <label class="proflabel">Как тебя зовут<input id="profname" value="${esc(p.name)}" placeholder="Даша" maxlength="40"></label>
        <div class="btnrow"><button class="btn" type="button" id="profphoto">${p.photo?"Сменить фото":"Загрузить фото"}</button>${p.photo?`<button class="btn" type="button" id="profnophoto">Убрать фото</button>`:""}</div>
        <p class="sm muted" style="margin:0">Из имени складывается название сайта сверху.</p>
      </div>
    </div>
  </section>
  ${cloud ? `<section class="panel profcard"><h3>Почта и пароль</h3>
    <p class="sm" style="margin:0 0 12px">Сейчас вход по почте <b>${esc(Store.user.email)}</b></p>
    <form id="emailform" class="profline"><label class="proflabel">Новая почта<input type="email" id="newemail" placeholder="name@mail.ru" autocomplete="email" required></label><button class="btn" type="submit">Сменить почту</button></form>
    <form id="passform" class="profline"><label class="proflabel">Новый пароль<input type="password" id="newpass" placeholder="от 6 символов" autocomplete="new-password" minlength="6" required></label><label class="proflabel">Ещё раз<input type="password" id="newpass2" placeholder="повтори пароль" autocomplete="new-password" minlength="6" required></label><button class="btn" type="submit">Сменить пароль</button></form>
    <p class="status" id="authst" aria-live="polite"></p>
  </section>` : `<section class="panel profcard"><p class="sm" style="margin:0">Сайт работает без облака: всё хранится только в этом браузере.</p></section>`}
  <section class="panel profcard profdanger"><h3>Обнулить или очистить</h3>
    <p class="hint" style="margin-top:0">Перед очисткой сохраняется копия. ${cloud?"Администратор может вернуть всё в течение месяца.":"Копия хранится в этом браузере."}</p>
    <div class="btnrow"><button class="btn" type="button" data-reset="results">Обнулить результаты</button><button class="btn" type="button" data-reset="all">Очистить всё, кроме учебников и настроек</button></div>
    <p class="sm muted">Результаты: очки, оценки, дневник, ОГЭ, знания тем, бонусы. «Всё» — ещё и тетради, памятки, доски и расписание.</p>
    <div class="chatrow" id="resetask" hidden><span class="sm">Точно? Напиши <b>да</b>:</span><input id="resetyes" style="max-width:80px"><button class="btn primary" type="button" id="resetgo">Очистить</button></div>
    ${!cloud && Store.get("backup", null) ? `<button class="btn" type="button" id="resetundo">Вернуть копию от ${new Date(Store.get("backup").ts).toLocaleString("ru-RU")}</button>` : ""}
    <p class="status" id="resetst" aria-live="polite"></p>
  </section></div>`;
}
function bindProfile(root){
  const save = p => { Store.set("profile", p, 0); drawMe(); };
  const pick = async()=>{ const got = await Photo.pick(false); if(!got[0]) return;
    const f = await (await fetch(got[0].url)).blob(); const sm = await Photo.shrink(f, 256); save(Object.assign(profile(), { photo: sm.url })); rerender(); };
  const rerender = () => { const el = $("profp"); if(el){ el.outerHTML = profilePanel(); bindProfile(root); } };
  $("profpic").addEventListener("click", pick); $("profphoto").addEventListener("click", pick);
  const np = $("profnophoto"); if(np) np.addEventListener("click", ()=>{ save(Object.assign(profile(), { photo:"" })); rerender(); });
  $("profname").addEventListener("change", e=>{ save(Object.assign(profile(), { name: e.target.value.trim() })); });
  const lo = $("acclogout"); if(lo) lo.addEventListener("click", ()=>$("logout").click());
  const st = t => { const e = $("authst"); if(e) e.textContent = t; };
  const ef = $("emailform"); if(ef) ef.addEventListener("submit", async e=>{ e.preventDefault(); st("Меняю…");
    try{ await Store.updateUser({ email: $("newemail").value.trim() }); st("Готово. На новую почту придёт письмо: открой ссылку, и почта сменится."); }catch(err){ st("Не получилось: " + err.message); } });
  const pf = $("passform"); if(pf) pf.addEventListener("submit", async e=>{ e.preventDefault();
    if($("newpass").value !== $("newpass2").value){ st("Пароли не совпадают."); return; } st("Меняю…");
    try{ await Store.updateUser({ password: $("newpass").value }); pf.reset(); st("Пароль сменён."); }catch(err){ st("Не получилось: " + err.message); } });
  let what = null;
  root.querySelectorAll("[data-reset]").forEach(b=>b.addEventListener("click", ()=>{ what = b.dataset.reset; $("resetask").hidden = false; $("resetyes").value = ""; $("resetyes").focus(); }));
  $("resetgo").addEventListener("click", async()=>{
    if($("resetyes").value.trim().toLowerCase() !== "да") return;
    const rs = $("resetst"); rs.textContent = "Сохраняю копию и очищаю…";
    const keys = Store.keys().filter(k=>RESULT_KEYS.includes(k) || (what==="all" && WORK_PREFIX.test(k)));
    try{
      await Store.flush();
      if(Store.mode!=="cloud"){ const snap = {}; keys.forEach(k=>snap[k] = Store.get(k)); Store.set("backup", { ts:Date.now(), data:snap }, 0); }
      for(const k of keys) await Store.del(k);
      rs.textContent = "Готово."; setTimeout(()=>location.reload(), 600);
    }catch(err){ rs.textContent = "Не получилось: " + err.message; }
  });
  const ud = $("resetundo"); if(ud) ud.addEventListener("click", ()=>{ const b = Store.get("backup"); Object.entries(b.data||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null) Store.set(k, v, 0); }); location.reload(); });
  if(Store.mode==="cloud" && Store.aiAvailable()){
    const show = () => { const a = $("adminlink"); if(a) a.hidden = !isAdmin; };
    if(isAdmin===null) Store.admin({ action:"whoami" }).then(r=>{ isAdmin = !!(r && r.admin); show(); }).catch(()=>{ isAdmin = false; }); else show();
  }
}

/* ================= АДМИНКА ================= */
async function renderAdmin(){
  const main = $("main");
  main.innerHTML = `<section class="panel"><h2>Админка</h2><p class="hint">Все пользователи и их данные. Копии изменений хранятся 30 дней.</p><div id="admbody"><p class="sm">Загружаю…</p></div></section>`;
  const body = $("admbody");
  if(Store.mode!=="cloud" || !Store.user){ body.innerHTML = `<p class="note">Админка работает только с облаком, после входа.</p>`; return; }
  let users;
  try{ const r = await Store.admin({ action:"users" }); if(!r || !r.users) throw new Error((r && r.error) || "нет доступа"); users = r.users; }
  catch(e){ body.innerHTML = `<p class="note">Нет доступа: ${esc(e.message)}. Админ задаётся секретом ADMIN_EMAILS в Supabase.</p>`; return; }
  body.innerHTML = `<div class="admusers">${users.map(u=>`<button class="btn" type="button" data-u="${u.id}">${esc(u.email||u.id)}<span class="sm"> · ${u.last ? new Date(u.last).toLocaleDateString("ru-RU") : "не входил"}</span></button>`).join("")}</div><div id="admuser"></div>`;
  body.querySelectorAll("[data-u]").forEach(b=>b.addEventListener("click", ()=>openUser(users.find(u=>u.id===b.dataset.u))));
  async function openUser(u){
    const box = $("admuser"); box.innerHTML = `<p class="sm">Загружаю ${esc(u.email)}…</p>`;
    const [d, h] = await Promise.all([Store.admin({ action:"docs", user:u.id }), Store.admin({ action:"history", user:u.id })]);
    const docs = (d && d.docs) || [], hist = (h && h.history) || [];
    const local = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    box.innerHTML = `<h3>${esc(u.email)}</h3>
      <div class="morebox"><b class="sm">Вернуть данные на момент</b><div class="chatrow"><input type="datetime-local" id="admat" value="${local}"><button class="btn primary" type="button" id="admrest">Восстановить</button></div>
        <b class="sm">Восстановить доступ: новый пароль</b><div class="chatrow"><input id="admpass" placeholder="новый пароль" minlength="6"><button class="btn" type="button" id="admsetpass">Задать</button></div>
        <p class="status" id="admst" aria-live="polite"></p></div>
      ${activityReport(Object.fromEntries(docs.map(x=>[x.key, x.value])), hist)}
      <details class="plain"><summary class="btn">Технические данные и журнал изменений</summary>
      <h4>Данные сейчас (${docs.length})</h4>${docs.map(x=>`<details class="plain"><summary class="sm"><b>${esc(x.key)}</b> · ${new Date(x.updated_at).toLocaleString("ru-RU")}</summary><pre class="admjson">${esc(JSON.stringify(x.value, null, 1).slice(0, 20000))}</pre></details>`).join("")}
      <h4>История изменений (${hist.length})</h4><div class="sm admhist">${hist.slice(0,200).map(x=>`<div>${new Date(x.changed_at).toLocaleString("ru-RU")} · ${esc(x.op)} · ${esc(x.key)}</div>`).join("")}</div></details>`;
    const st = t => $("admst").textContent = t;
    $("admrest").addEventListener("click", async()=>{ const at = $("admat").value; if(!at) return; st("Восстанавливаю…");
      try{ const r = await Store.admin({ action:"restore", user:u.id, at:new Date(at).toISOString() }); st(r.error ? r.error : `Готово: восстановлено ${r.restored||0}, удалено ${r.removed||0}.`); }catch(e){ st(e.message); } });
    $("admsetpass").addEventListener("click", async()=>{ const pw = $("admpass").value; if(pw.length < 6){ st("Пароль от 6 символов."); return; }
      try{ const r = await Store.admin({ action:"password", user:u.id, password:pw }); st(r.error ? r.error : "Пароль задан. Передай его пользователю."); }catch(e){ st(e.message); } });
  }
}

/* ---------- админка: активность и польза занятий, по-человечески ---------- */
function activityReport(V, hist){
  const get = (k, d) => V[k] !== undefined && V[k] !== null ? V[k] : d;
  let P = { byDay:{}, total:0, streak:0, best:0 }; try{ P = Points.compute({ get }); }catch(e){ console.warn(e); }
  const iso = d => { const x = new Date(d); return new Date(x.getTime() - x.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  const today = iso(Date.now()), dayList = []; for(let i = 29; i >= 0; i--) dayList.push(iso(Date.now() - i*864e5));
  const O = (get("oge", {a:[]}).a || []), T = (get("ogeTests", {list:[]}).list || []).filter(t=>!t.pending), Q = get("quizzes", {list:[]}).list || [], TT = get("topicTests", {}) || {};
  const done = (get("progress", {}).done) || {}, know = (get("know", {k:{}}).k) || {}, J = Object.assign({hw:[], grades:[]}, get("journal", {})), A = (get("act", {d:{}}).d) || {};
  const edits = {}; (hist||[]).forEach(h=>{ const d = iso(h.changed_at); edits[d] = (edits[d]||0) + 1; });
  const ogeDay = {}; O.forEach(([ts,,,ok])=>{ const d = iso(ts), r = ogeDay[d] = ogeDay[d] || [0,0]; r[1]++; if(ok) r[0]++; });
  const DM = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",weekday:"short"});
  // что сделано за день: группируем начисления
  const what = d => { const r = P.byDay[d]; const g = {}; (r ? r.items : []).forEach(([w,p])=>{ const k = w.replace(/\d+ (день|дня|дней) подряд/,"серия").replace(/^ОГЭ: .*/,"ОГЭ"); (g[k] = g[k] || {n:0,p:0,w}).n++; g[k].p += p; });
    return Object.values(g).map(x=>`${esc(x.w)}${x.n>1?` ×${x.n}`:""} <span class="${x.p>=0?"pplus":"pminus"}">${x.p>0?"+":""}${x.p}</span>`).join(", "); };
  const active = d => (P.byDay[d] && P.byDay[d].active) || (A[d]||0) > 0 || ogeDay[d];
  const last14 = dayList.slice(-14), act14 = last14.filter(active).length, pts14 = last14.reduce((a,d)=>a+((P.byDay[d]||{}).pts||0),0);
  const o14 = last14.reduce((a,d)=>{ const r = ogeDay[d]; return r ? [a[0]+r[0], a[1]+r[1]] : a; }, [0,0]);
  // график: очки за день (столбики) и доля верных заданий ОГЭ (точки)
  const W = 600, H = 150, bw = W / dayList.length, vals = dayList.map(d=>(P.byDay[d]||{}).pts||0), mx = Math.max(10, ...vals.map(Math.abs)), zero = H*0.62, sc = (H*0.55)/mx;
  const chart = `<svg class="admchart" viewBox="0 0 ${W} ${H+18}" role="img" aria-label="Очки по дням за 30 дней">
    <line x1="0" x2="${W}" y1="${zero}" y2="${zero}" class="axis"/>
    ${dayList.map((d,i)=>{ const v = vals[i], h = Math.abs(v)*sc, y = v>=0 ? zero-h : zero; return `<rect x="${i*bw+2}" y="${y}" width="${bw-4}" height="${Math.max(h, v?1:0)}" class="${v>=0?"bp":"bm"}"><title>${d}: ${v>0?"+":""}${v} очков</title></rect>`; }).join("")}
    ${dayList.map((d,i)=>{ const r = ogeDay[d]; if(!r) return ""; const y = 6 + (1 - r[0]/r[1]) * (zero - 12); return `<circle cx="${i*bw+bw/2}" cy="${y}" r="4" class="od"><title>${d}: ОГЭ верно ${r[0]} из ${r[1]}</title></circle>`; }).join("")}
    ${dayList.map((d,i)=>i%5===0||i===dayList.length-1 ? `<text x="${i*bw+bw/2}" y="${H+14}" text-anchor="middle">${d.slice(8)}.${d.slice(5,7)}</text>` : "").join("")}
  </svg><p class="sm muted" style="margin:2px 0 0">Столбики — очки за день (зелёные плюс, красные минус). Точки — доля верных заданий ОГЭ в этот день: чем выше, тем лучше.</p>`;
  const dayRows = dayList.slice().reverse().filter(d=>active(d) || (P.byDay[d] && P.byDay[d].items.length) || edits[d]).map(d=>{ const r = P.byDay[d] || {pts:0}, og = ogeDay[d];
    return `<tr class="${active(d)?"":"am-idle"}"><td>${DM.format(new Date(d+"T12:00"))}</td><td><b class="${r.pts>=0?"pplus":"pminus"}">${r.pts>0?"+":""}${r.pts}</b></td><td>${og ? `${og[0]} из ${og[1]}` : "—"}</td><td>${A[d] ? A[d] : "—"}</td><td class="sm">${what(d) || (edits[d] ? `изменений в данных: ${edits[d]}` : "—")}</td></tr>`; }).join("");
  // ОГЭ по заданиям: последние 10 решений плюсом и минусом
  const CATS = (window.Oge && Oge.CAT) || {}, byTask = {};
  O.forEach(([ts, e, n, ok])=>{ const k = e+":"+n; (byTask[k] = byTask[k] || []).push(ok ? 1 : 0); });
  const taskRows = Object.entries(byTask).sort((a,b)=>a[0].localeCompare(b[0], "ru", {numeric:true})).map(([k, a])=>{ const [e, n] = k.split(":"), ok = a.reduce((x,y)=>x+y,0), l10 = a.slice(-10), p5 = a.slice(-5), b5 = a.slice(-10,-5);
    const tr = b5.length ? (p5.reduce((x,y)=>x+y,0)/p5.length) - (b5.reduce((x,y)=>x+y,0)/b5.length) : 0;
    return `<tr><td>${e==="math"?"Математика":e==="rus"?"Русский":esc(e)}</td><td>№${n} ${esc(((CATS[e]||{})[n]||[""])[0])}</td><td>${a.length}</td><td><b>${Math.round(100*ok/a.length)}%</b></td><td class="pm">${l10.map(x=>x?`<span class="pplus">+</span>`:`<span class="pminus">−</span>`).join("")}</td><td>${tr>0.05?`<span class="pplus">↑ лучше</span>`:tr<-0.05?`<span class="pminus">↓ хуже</span>`:"—"}</td></tr>`; }).join("");
  const trialRows = T.slice().reverse().slice(0, 20).map(t=>`<tr><td>${new Date(t.ts).toLocaleDateString("ru-RU")}</td><td>${esc(t.exam==="math"?"Математика":t.exam==="rus"?"Русский":t.exam)}${t.variant?`, вариант ${esc(t.variant)}`:""}</td><td><b>${t.pts ?? t.ok}/${t.ptsMax ?? t.n}</b></td><td>${(t.ptsMax||t.n) ? Math.round(100*(t.pts ?? t.ok)/(t.ptsMax||t.n)) + "%" : "—"}</td><td>${(t.empty||[]).length || "—"}</td><td>${t.spent!==undefined?`${t.spent} мин`:"—"}</td></tr>`).join("");
  // по предметам
  const books = BOOKS.concat(OGE_BOOKS.filter(b=>!b.exam)), subjRows = BOOKS.map(b=>{ const keys = []; (b.groups||[]).forEach((g,gi)=>g.chapters.forEach((c,ci)=>c.p.forEach((_,pi)=>keys.push(`${b.id}.${gi}.${ci}.${pi}`))));
    const d = keys.filter(k=>done[k]).length, tt = keys.filter(k=>TT[k]), tp = tt.filter(k=>TT[k].pass).length, kn = keys.map(k=>know[k]).filter(x=>x!==undefined), weak = kn.filter(x=>x<=1).length;
    const qz = Q.filter(q=>String(q.key).startsWith(b.id+".")), qa = qz.length ? Math.round(100*qz.reduce((a,q)=>a+q.ok/q.n,0)/qz.length) : null;
    const hw = (J.hw||[]).filter(h=>h.subj===b.id), hwd = hw.filter(h=>h.done).length, gr = (J.grades||[]).filter(x=>x.subj===b.id).map(x=>Number(x.mark)).filter(x=>x>=2), ga = gr.length ? (gr.reduce((a,x)=>a+x,0)/gr.length).toFixed(1).replace(".",",") : "—";
    if(!d && !tt.length && !kn.length && !qz.length && !hw.length && !gr.length) return "";
    return `<tr><td>${esc(b.subject)}</td><td>${d} из ${keys.length}</td><td>${tt.length ? `${tp} из ${tt.length}` : "—"}</td><td>${qa===null?"—":qa+"%"}</td><td>${kn.length ? `${kn.length} тем${weak?`, <span class="pminus">слабых ${weak}</span>`:""}` : "—"}</td><td>${hw.length ? `${hwd} из ${hw.length}` : "—"}</td><td>${ga}</td></tr>`; }).join("");
  void books;
  return `<section class="admrep"><h3>Активность и результаты</h3>
    <div class="admstats">
      <div><b>${act14}</b><span>активных дней из 14</span></div>
      <div><b class="${pts14>=0?"pplus":"pminus"}">${pts14>0?"+":""}${pts14}</b><span>очков за 14 дней</span></div>
      <div><b>${P.total}</b><span>очков всего</span></div>
      <div><b>${P.streak}</b><span>дней серии, рекорд ${P.best}</span></div>
      <div><b>${o14[1] ? Math.round(100*o14[0]/o14[1])+"%" : "—"}</b><span>ОГЭ верно за 14 дней (${o14[0]} из ${o14[1]})</span></div>
      <div><b>${T.length}</b><span>пробных ОГЭ</span></div>
      <div><b>${Object.values(TT).filter(x=>x.pass).length}</b><span>тем освоено по тесту</span></div>
      <div><b>${Object.values(done).filter(x=>Number(x)>1e12).length}</b><span>параграфов пройдено</span></div>
    </div>
    <h4>Динамика за 30 дней</h4>${chart}
    <h4>По дням</h4>${dayRows ? `<div class="tablewrap"><table class="grades admtbl"><thead><tr><th>День</th><th>Очки</th><th>ОГЭ верно</th><th>Учитель</th><th>Что сделано</th></tr></thead><tbody>${dayRows}</tbody></table></div>` : `<p class="hint">За 30 дней занятий нет.</p>`}
    <h4>По предметам</h4>${subjRows ? `<div class="tablewrap"><table class="grades admtbl"><thead><tr><th>Предмет</th><th>Параграфы</th><th>Тесты по темам</th><th>Итоговые по главам</th><th>Знание тем</th><th>Домашка</th><th>Ср. оценка</th></tr></thead><tbody>${subjRows}</tbody></table></div>` : `<p class="hint">Пока пусто.</p>`}
    <h4>ОГЭ по заданиям</h4>${taskRows ? `<div class="tablewrap"><table class="grades admtbl"><thead><tr><th>Экзамен</th><th>Задание</th><th>Решено</th><th>Верно</th><th>Последние 10</th><th>Динамика</th></tr></thead><tbody>${taskRows}</tbody></table></div>` : `<p class="hint">Заданий ОГЭ ещё не было.</p>`}
    <h4>Пробные ОГЭ</h4>${trialRows ? `<div class="tablewrap"><table class="grades admtbl"><thead><tr><th>Дата</th><th>Экзамен</th><th>Баллы</th><th>%</th><th>Не решено</th><th>Время</th></tr></thead><tbody>${trialRows}</tbody></table></div>` : `<p class="hint">Пробных ещё не было.</p>`}
  </section>`;
}
function accountPanels(){ return profilePanel() + themePanel(); }
function bindAccount(root){ bindProfile(root); bindTheme(root); }
function apply(){ applyTheme(); syncOge(); syncMyBooks(); applyToc(); applyColors(); drawMe(); }

window.Study = { activityReport, ogeReadKey: async (b, say) => { const sec = ogeSections(b); if(!sec.key) return 0; return readKey(b, sec.key[0], Math.min(sec.key[1], sec.key[0]+39), say); }, syncMyBooks, applyColors, colorsPanel, bindColors, profilePanel, bindProfile, themePanel, bindTheme, ogeAutoPrep, ogeSections, ogeInfoRows, bindOgeInfo, ogeInfoFor, ogePage, syncOge, ogeAddHtml, bindOgeAdd, ogeKey, ogeVariants, ogeKeyRow, bindOgeKey, ogeSubjects, tocPanel(id){ if(id) tocState.subj = id; return tocPanel(); }, bindToc, bookKnowHtml, bindKnow, idxButton, applyToc, drawMe, siteTitle, renderAdmin, Dock, renderMemos, apply, applyTheme, Teacher, marks, recoHome, classIdx, topicsOf, cardText, exercisesHtml, renderCut, leaveCut, accountPanels, bindAccount, ogeBooksHtml, bindOgeBooks, ogeBook, OGE_BOOKS, nums };
})();
