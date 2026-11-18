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
  return `<section class="panel" id="themep"><h3>Оформление</h3>
    <div class="themerow"><span class="sm">Цвет</span>${SKINS.map(([id,n,c])=>`<button class="skinbtn" type="button" data-skin="${id}" aria-pressed="${p.skin===id}" style="--sw:${c}"><i></i>${n}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Фон</span>${PATTERNS.map(([id,n])=>`<button class="vbtn" type="button" data-pat="${id}" aria-pressed="${p.pattern===id}">${n}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Тема</span>${MODES.map(([id,n])=>`<button class="vbtn" type="button" data-mode="${id}" aria-pressed="${p.mode===id}">${n}</button>`).join("")}</div>
    <h4 class="sm" style="margin:14px 0 4px">Учитель</h4>
    <div class="themerow" id="tprev"></div>
    <div class="themerow"><span class="sm">Вид</span>${TSTYLES.map(([id,n])=>`<button class="vbtn" type="button" data-tstyle="${id}" aria-pressed="${p.tstyle===id}">${n.split(":")[0]}</button>`).join("")}</div>
    <div class="themerow"><span class="sm">Цвет</span>${TCOLORS.map(([c,n])=>`<button class="tpick" type="button" data-tcolor="${c}" aria-pressed="${p.tcolor===c}" style="--sw:${c}" title="${n}"><i class="tsw"></i></button>`).join("")}</div>
    <p class="hint">Настройки сохраняются в аккаунте и применяются на всех устройствах.</p></section>`;
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
    ["math","rus"].forEach(e=>{ const t = T.filter(x=>x.exam===e).pop(); (t && t.wrong || []).forEach(n=>seen.add(e+":"+n)); });
    const L = Points.ogeLast(); Object.entries(L).forEach(([e,o])=>Object.entries(o).forEach(([n,a])=>{ if(a.length>=4 && a.reduce((x,y)=>x+y,0)/a.length < .7) seen.add(e+":"+n); }));
    seen.forEach(k=>{ const [e,n] = k.split(":"); const c = Oge.CAT[e] && Oge.CAT[e][n]; if(c) oge.push(`<a class="reco-i" href="#oge/${e}/${n}"><span class="dot" style="background:${e==="math"?"#2a4fd6":"#8a6d1f"}"></span><span><b>ОГЭ ${e==="math"?"математика":"русский"}</b> · №${n} ${esc(c[0])}</span></a>`); }); }
  const col = (h, list) => `<div><h4>${h}${list.length?` · ${list.length}`:""}</h4>${list.length ? list.slice(0,8).join("") + (list.length>8?`<p class="sm">и ещё ${list.length-8}</p>`:"") : `<p class="hint">Таких тем нет.</p>`}</div>`;
  return `<section class="panel reco" id="reco"><h3>Рекомендации</h3>
    ${again.length || brief.length || oge.length ? `<div class="reco-cols">${col("Разобрать заново", again)}${col("Повторить", brief)}${oge.length?col("ОГЭ: потренировать", oge):""}</div><p class="hint">Это пройденные темы, где ответы на вопросы учителя, итоговые вопросы или срез знаний показали пробелы. Нажми на тему, и учитель начнёт сразу.</p>`
      : rated ? `<p class="hint">Слабых пройденных тем нет. Так держать!</p>`
      : `<p class="hint">Пока пусто: знание тем заполняется только по ответам на вопросы. Пройди <a href="#account">срез знаний</a> по учебнику или поотвечай учителю в темах, и здесь появятся темы, которые стоит повторить.</p>`}</section>`;
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
  ALLSUBJ().forEach(([id])=>{
    const toc = Store.get("toc-"+id, null); if(!toc || !Array.isArray(toc.chapters) || !toc.chapters.length) return;
    const chapters = toc.chapters.map(c=>({ n:"", t:String(c.title||""), p:(c.topics||[]).map(t=>String(t.title||"")).filter(Boolean) })).filter(c=>c.p.length);
    if(!chapters.length) return;
    let b = BOOKS.find(x=>x.id===id);
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
const ogeBook = exam => { const b = OGE_BOOKS.find(x=>x.exam===exam), m = S.book(b.id); return m.chunks && m.chunks.length ? b : null; };
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
  return `<div class="knowrow bookknow" style="--c:${b.color}"><div class="kh"><b>Знания</b><span class="sm">учитель оценил ${rated} из ${all.length} тем · карточек параграфов ${cards}</span></div>
    <p class="sm" style="margin:0">Уровень знания каждой темы выставляет учитель сам: по ответам в теме, итоговым вопросам и срезу знаний.</p>
    <label class="sm">Сейчас в классе<select data-classat="${b.id}"><option value="">${ci>=0?"по отметкам «пройдено»":"— не выбрано —"}</option>${all.map(t=>`<option value="${t.key}" ${classAt()[b.id]===t.key?"selected":""}>${t.ci+1}.${t.pi+1}. ${esc(t.title.slice(0,60))}</option>`).join("")}</select></label>
    <div class="chatrow"><a class="btn primary" href="#cut/${b.id}">Срез знаний</a><button class="btn" type="button" data-idx="${b.id}" ${file && Store.aiAvailable()?"":"disabled"} title="${file?"Учитель один раз прочитает учебник: что объясняется, какие примеры и упражнения на каких страницах":"Сначала загрузи PDF"}">${cards?"Дополнить карточки параграфов":"Составить карточки параграфов"}</button></div>
    <p class="status" id="status-idx-${b.id}" aria-live="polite"></p></div>`;
}
function bindKnow(root){
  root.querySelectorAll("[data-classat]").forEach(s=>s.addEventListener("change", ()=>{ const d = classAt(); if(s.value) d[s.dataset.classat] = s.value; else delete d[s.dataset.classat]; Store.set("classAt", d, 0); }));
  root.querySelectorAll("[data-idx]").forEach(btn=>btn.addEventListener("click", ()=>{ const b = BOOKS.find(x=>x.id===btn.dataset.idx), st = $("status-idx-"+b.id);
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
  a.classList.toggle("on", location.hash === "#account");
}
// результаты учёбы: обнуляются кнопкой «Обнулить результаты»
const RESULT_KEYS = ["progress","grades","diary","tests","oge","ogeRes","ogeTests","quizzes","quizRes","act","bonuses","rewards","journal","know","cuts"];
const WORK_PREFIX = /^(notes-|ink-|nb-|memos$|boards$|events$|classAt$)/;
let isAdmin = null;
function profilePanel(){
  const p = profile(), cloud = Store.mode==="cloud";
  return `<section class="panel" id="profp"><h2>Личный кабинет</h2>
    <div class="prof">
      <button type="button" class="profpic" id="profpic" title="Загрузить фото">${p.photo?`<img src="${p.photo}" alt="Моё фото">`:`<span>${esc(((p.name||"Д")[0]||"Д").toUpperCase())}</span>`}<i>📷</i></button>
      <div class="profinfo">
        <label class="sm">Как тебя зовут<input id="profname" value="${esc(p.name)}" placeholder="Даша" maxlength="40"></label>
        <p class="sm" style="margin:6px 0 0">${cloud ? `Вход: <b>${esc(Store.user.email)}</b>` : "Сайт работает без облака: всё хранится только в этом браузере."}</p>
        <div class="btnrow"><button class="btn" type="button" id="profphoto">${p.photo?"Сменить фото":"Загрузить фото"}</button>${p.photo?`<button class="btn" type="button" id="profnophoto">Убрать фото</button>`:""}
          ${cloud?`<button class="btn" id="acclogout" type="button">Выйти</button>`:""}<a class="btn" href="#admin" id="adminlink" hidden>Админка</a></div>
      </div>
    </div>
    ${cloud ? `<details class="more"><summary class="btn">Сменить почту или пароль</summary><div class="morebox">
      <form id="emailform" class="chatrow"><input type="email" id="newemail" placeholder="новая почта" autocomplete="email" required><button class="btn" type="submit">Сменить почту</button></form>
      <form id="passform" class="chatrow"><input type="password" id="newpass" placeholder="новый пароль, от 6 символов" autocomplete="new-password" minlength="6" required><input type="password" id="newpass2" placeholder="ещё раз" autocomplete="new-password" minlength="6" required><button class="btn" type="submit">Сменить пароль</button></form>
      <p class="status" id="authst" aria-live="polite"></p></div></details>` : ""}
    <details class="more"><summary class="btn">Обнулить или очистить</summary><div class="morebox">
      <p class="hint" style="margin-top:0">Перед очисткой сохраняется копия. ${cloud?"Администратор может вернуть всё в течение месяца.":"Копия хранится в этом браузере."}</p>
      <div class="btnrow"><button class="btn" type="button" data-reset="results">Обнулить результаты</button><button class="btn" type="button" data-reset="all">Очистить всё, кроме учебников и настроек</button></div>
      <p class="sm muted">Результаты: очки, оценки, дневник, ОГЭ, знания тем, бонусы. «Всё» — ещё и тетради, памятки, доски и расписание.</p>
      <div class="chatrow" id="resetask" hidden><span class="sm">Точно? Напиши <b>да</b>:</span><input id="resetyes" style="max-width:80px"><button class="btn primary" type="button" id="resetgo">Очистить</button></div>
      ${!cloud && Store.get("backup", null) ? `<button class="btn" type="button" id="resetundo">Вернуть копию от ${new Date(Store.get("backup").ts).toLocaleString("ru-RU")}</button>` : ""}
      <p class="status" id="resetst" aria-live="polite"></p></div></details>
  </section>`;
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
      <h4>Данные сейчас (${docs.length})</h4>${docs.map(x=>`<details class="plain"><summary class="sm"><b>${esc(x.key)}</b> · ${new Date(x.updated_at).toLocaleString("ru-RU")}</summary><pre class="admjson">${esc(JSON.stringify(x.value, null, 1).slice(0, 20000))}</pre></details>`).join("")}
      <h4>История изменений (${hist.length})</h4><div class="sm admhist">${hist.slice(0,200).map(x=>`<div>${new Date(x.changed_at).toLocaleString("ru-RU")} · ${esc(x.op)} · ${esc(x.key)}</div>`).join("")}</div>`;
    const st = t => $("admst").textContent = t;
    $("admrest").addEventListener("click", async()=>{ const at = $("admat").value; if(!at) return; st("Восстанавливаю…");
      try{ const r = await Store.admin({ action:"restore", user:u.id, at:new Date(at).toISOString() }); st(r.error ? r.error : `Готово: восстановлено ${r.restored||0}, удалено ${r.removed||0}.`); }catch(e){ st(e.message); } });
    $("admsetpass").addEventListener("click", async()=>{ const pw = $("admpass").value; if(pw.length < 6){ st("Пароль от 6 символов."); return; }
      try{ const r = await Store.admin({ action:"password", user:u.id, password:pw }); st(r.error ? r.error : "Пароль задан. Передай его пользователю."); }catch(e){ st(e.message); } });
  }
}

function accountPanels(){ return profilePanel() + tocPanel() + `<section class="panel"><h3>Сборники ОГЭ</h3><p class="hint">Загрузи сборник ФИПИ в PDF, и его можно открыть рядом с любым заданием ОГЭ, а учитель проверит решение по критериям.</p>${ogeBooksHtml()}</section>` + themePanel(); }
function bindAccount(root){ bindProfile(root); bindToc(root); bindOgeBooks(root, ()=>{ location.hash = "#account"; window.dispatchEvent(new HashChangeEvent("hashchange")); }); bindTheme(root); }
function apply(){ applyTheme(); applyToc(); drawMe(); }

window.Study = { bookKnowHtml, bindKnow, applyToc, drawMe, siteTitle, renderAdmin, Dock, renderMemos, apply, applyTheme, Teacher, marks, recoHome, classIdx, topicsOf, cardText, exercisesHtml, renderCut, leaveCut, accountPanels, bindAccount, ogeBooksHtml, bindOgeBooks, ogeBook, OGE_BOOKS, nums };
})();
