// Учебник сбоку: PDF в панели слева или справа, размер меняется перетаскиванием,
// пометки карандашом и маркером поверх страницы, текстовые заметки к страницам.
(function(){
const { $, esc, S } = window.App;
const INK_W = 1400;
const R = { book:null, n:1, zoom:1, token:0, label:"", tool:"view", color:"#d23c3c", undo:[], dirty:false, timer:null, inkH:1800, inkPage:null };
const docCache = {};
const lsGet = (k,d) => { try{ const v = localStorage.getItem("dasha:"+k); return v===null ? d : v }catch(e){ return d } };
const lsSet = (k,v) => { try{ localStorage.setItem("dasha:"+k, v) }catch(e){} };

const toFile = (b,p) => p + (Number(S.book(b.id).offset)||0);
const toBook = (b,n) => n - (Number(S.book(b.id).offset)||0);
const inkIndex = id => Object.assign({p:{}}, Store.get("ink-"+id, {}));
const notesOf  = id => Object.assign({p:{}}, Store.get("notes-"+id, {}));

async function pdfFor(path){
  if(!docCache[path]) docCache[path] = (async()=>{ const blob = await Store.getFile(path); if(!blob) throw new Error("no file"); return pdfjsLib.getDocument({data: new Uint8Array(await blob.arrayBuffer())}).promise; })();
  try{ return await docCache[path] }catch(e){ delete docCache[path]; throw e }
}

/* ---------- панель ---------- */
// «справа»: панель у правого края; «в странице»: блоком над содержимым, как учитель
function applyDock(){
  const side = lsGet("rside","right")==="inline" ? "inline" : "right", w = Number(lsGet("rwidth", 0)) || Math.min(Math.round(window.innerWidth*0.48), 820);
  const el = $("reader"), slot = $("rslot"), inl = side==="inline";
  if(inl && slot && el.parentNode !== slot) slot.appendChild(el);
  if(!inl && el.parentNode !== document.body) document.body.insertBefore(el, $("rtab"));
  el.classList.remove("left"); el.classList.toggle("inline", inl); el.classList.toggle("right", !inl);
  document.documentElement.style.setProperty("--rw", w+"px");
  document.body.classList.remove("reading-left");
  document.body.classList.toggle("reading-right", !el.hidden && !inl && !el.classList.contains("full"));
  $("rdock").setAttribute("aria-pressed", inl); $("rright").setAttribute("aria-pressed", !inl);
  const f = el.classList.contains("full"); $("rfull").textContent = f ? "🗗" : "⛶";
  $("rfull").title = f ? "Вернуть обычный размер" : "Раскрыть на весь экран"; $("rfull").setAttribute("aria-label", $("rfull").title);
}
function setSide(v){ lsSet("rside", v); $("reader").classList.remove("full"); applyDock(); show(R.n);
  if(v==="inline") $("reader").scrollIntoView({ behavior:"smooth", block:"start" }); }
function open(b, bookPage, label, side){
  if(R.dirty) saveInk(); if(side) lsSet("rside", side);
  R.book = b; R.label = label || ""; R.zoom = 1;
  $("reader").hidden = false; $("rtab").hidden = true; applyDock(); fire();
  $("rtitle").textContent = b.title; $("rtabname").textContent = b.subject;
  const last = Number(lsGet("last-"+b.id, 1)) || 1;
  show(bookPage ? toFile(b, bookPage) : last);
  renderNoteList();
}
function close(){ if(R.dirty) saveInk(); $("reader").hidden = true; $("reader").classList.remove("full"); $("rtab").hidden = true; R.sel = null; applyDock(); fire(); }
function minimize(){ if(R.dirty) saveInk(); $("reader").hidden = true; $("reader").classList.remove("full"); $("rtab").hidden = false; applyDock(); fire(); }
function restore(){ if(!R.book) return; $("rtab").hidden = true; $("reader").hidden = false; applyDock(); show(R.n); fire(); }
const fire = () => window.dispatchEvent(new CustomEvent("reader:change"));

async function pageObj(b, n){
  const m = S.book(b.id); if(!m.chunks || !m.chunks.length) throw new Error("Файл учебника не загружен");
  const ch = m.chunks.find(c=>n>=c.from && n<=c.to) || m.chunks[m.chunks.length-1];
  const doc = await pdfFor(ch.path);
  return doc.getPage(Math.max(1, Math.min(doc.numPages, n - ch.from + 1)));
}
// текст страницы (пусто, если учебник отсканирован без текстового слоя)
async function pageText(b, n){
  const page = await pageObj(b, n), tc = await page.getTextContent();
  return tc.items.map(i=>i.str + (i.hasEOL ? "\n" : "")).join("").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
// картинка страницы для учителя (JPEG base64 без префикса)
async function pageImage(b, n, width){
  const page = await pageObj(b, n), base = page.getViewport({scale:1}), vp = page.getViewport({scale:(width||1000)/base.width});
  const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:x, viewport:vp}).promise;
  return c.toDataURL("image/jpeg", 0.72).split(",")[1];
}
async function show(n){
  if(R.dirty) await saveInk();
  const b = R.book, m = S.book(b.id), tok = ++R.token, total = m.totalPages || 1;
  n = Math.max(1, Math.min(n, total)); R.n = n; R.undo = [];
  lsSet("last-"+b.id, n);
  $("rpagein").value = toBook(b, n); $("rinfo").textContent = `файл ${n}/${total}`; $("rsub").textContent = R.label;
  $("rnote").value = notesOf(b.id).p[n] || ""; $("rnotelabel").textContent = `Заметка к странице ${toBook(b,n)}`;
  const cv = $("rcanvas"), ink = $("rink"), msg = $("rmsg");
  if(!m.chunks || !m.chunks.length){ $("rpage").hidden = true; msg.hidden = false; msg.textContent = "Файл учебника ещё не загружен. Загрузить его можно в личном кабинете."; return; }
  msg.hidden = false; msg.textContent = "Открываю страницу…";
  try{
    const ch = m.chunks.find(c=>n>=c.from && n<=c.to) || m.chunks[m.chunks.length-1];
    const doc = await pdfFor(ch.path); if(tok !== R.token) return;
    const page = await doc.getPage(Math.min(doc.numPages, n - ch.from + 1)); if(tok !== R.token) return;
    const box = $("rscroll"), base = page.getViewport({scale:1}), dpr = window.devicePixelRatio || 1;
    const scale = Math.max(0.3, Math.min((box.clientWidth - 24) / base.width, 3) * R.zoom);
    const vp = page.getViewport({scale: scale * dpr});
    if(R.task){ try{ R.task.cancel(); }catch(e){} R.task = null; }
    cv.width = vp.width; cv.height = vp.height;
    const cssW = vp.width/dpr, cssH = vp.height/dpr;
    $("rpage").style.width = cssW+"px"; $("rpage").style.height = cssH+"px";
    const task = R.task = page.render({canvasContext: cv.getContext("2d"), viewport: vp});
    try{ await task.promise; }catch(e){ if(e && e.name==="RenderingCancelledException") return; throw e; }
    if(R.task===task) R.task = null;
    if(tok !== R.token) return;
    const tl = $("rtext"); tl.innerHTML = ""; tl.style.setProperty("--scale-factor", scale); R.sel = null;
    try{ const tc = await page.getTextContent(); if(tok !== R.token) return;
      if(tc.items.length){ await pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: page.getViewport({scale}), textDivs: [] }).promise; } }catch(e){ console.warn("text layer", e); }
    R.inkH = Math.round(INK_W * base.height / base.width);
    ink.width = INK_W; ink.height = R.inkH; R.inkPage = n;
    await loadInk(b.id, n); if(tok !== R.token) return;
    msg.hidden = true; $("rpage").hidden = false;
  }catch(e){
    if(tok !== R.token) return; console.error(e);
    $("rpage").hidden = true; msg.hidden = false; msg.textContent = "Не получилось открыть страницу. Проверь интернет или загрузи файл ещё раз.";
  }
}

/* ---------- пометки ---------- */
async function loadInk(id, n){
  const ctx = $("rink").getContext("2d"); ctx.clearRect(0,0,INK_W,R.inkH);
  const path = inkIndex(id).p[n]; if(!path) return;
  try{ const blob = await Store.getFile(path); if(blob && R.inkPage===n){ const img = await createImageBitmap(blob); ctx.drawImage(img,0,0,INK_W,R.inkH); } }catch(e){}
}
function inkChanged(){ R.dirty = true; clearTimeout(R.timer); R.timer = setTimeout(saveInk, 1500); }
async function saveInk(){
  clearTimeout(R.timer); if(!R.dirty || !R.book) return; R.dirty = false;
  const id = R.book.id, n = R.inkPage, cv = $("rink");
  const empty = !cv.getContext("2d").getImageData(0,0,INK_W,R.inkH).data.some((v,i)=>i%4===3 && v);
  const idx = inkIndex(id), old = idx.p[n];
  try{
    if(empty){ delete idx.p[n]; }
    else { const blob = await new Promise(res=>cv.toBlob(res,"image/png")); const path = `notes/${id}/p${n}-${Date.now()}.png`; await Store.putFile(path, blob); idx.p[n] = path; }
    await Store.set("ink-"+id, idx, 0);
    if(old && old !== idx.p[n]) Store.removeFile(old).catch(()=>{});
  }catch(e){ R.dirty = true; console.warn("ink save", e); }
}
function setTool(t){
  R.tool = t;
  document.querySelectorAll("#reader [data-rtool]").forEach(x=>x.setAttribute("aria-pressed", x.dataset.rtool===t));
  $("rink").classList.toggle("drawing", t!=="view");
  $("rink").classList.toggle("asking", t==="ask" || t==="solve");
  $("raskhint").hidden = t!=="ask" && t!=="solve";
  $("raskhint").textContent = t==="solve" ? "Обведи рамкой задачу, которую хочешь решить: условие, рисунок и номер. Она встанет над черновиком, а учитель увидит её, только когда спросишь или попросишь проверить." : "Обведи рамкой непонятное место на странице: текст, формулу или рисунок. Учитель сразу возьмёт его в работу.";
}
// «❓ Непонятно»: рамка на странице → картинка фрагмента и текст из него уходят учителю
async function askRect(a, b){
  const page = $("rpage"), W = page.clientWidth, H = page.clientHeight, kind = R.tool==="solve" ? "solve" : "ask";
  const x0 = Math.max(0, Math.min(a.x, b.x)), y0 = Math.max(0, Math.min(a.y, b.y)), x1 = Math.min(W, Math.max(a.x, b.x)), y1 = Math.min(H, Math.max(a.y, b.y));
  setTool("view");
  if(x1 - x0 < 14 || y1 - y0 < 14) return;
  const cv = $("rcanvas"), k = cv.width / W, pad = 6;
  const sx = Math.max(0, (x0 - pad) * k), sy = Math.max(0, (y0 - pad) * k), sw = Math.min(cv.width - sx, (x1 - x0 + 2*pad) * k), sh = Math.min(cv.height - sy, (y1 - y0 + 2*pad) * k);
  const f = Math.min(1, 1400 / sw), out = document.createElement("canvas"); out.width = Math.round(sw * f); out.height = Math.round(sh * f);
  const c = out.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, out.width, out.height); c.drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const pr = page.getBoundingClientRect(), text = [...$("rtext").querySelectorAll("span")].filter(sp=>{ const r = sp.getBoundingClientRect(), cx = r.left - pr.left + r.width/2, cy = r.top - pr.top + r.height/2; return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1; }).map(sp=>sp.textContent).join(" ").replace(/\s+/g, " ").trim().slice(0, 2000);
  const detail = { book: R.book, page: R.n, bookPage: toBook(R.book, R.n), image: out.toDataURL("image/jpeg", 0.85).split(",")[1], text };
  window.dispatchEvent(new CustomEvent("reader:" + kind, { detail }));
}
function bindInk(){
  const cv = $("rink"); let drawing = false, last = null;
  const pos = ev => { const r = cv.getBoundingClientRect(); return { x:(ev.clientX-r.left)*INK_W/r.width, y:(ev.clientY-r.top)*R.inkH/r.height }; };
  const seg = (a,b) => { const c = cv.getContext("2d"); c.save(); c.lineCap = c.lineJoin = "round";
    if(R.tool==="eraser"){ c.globalCompositeOperation = "destination-out"; c.lineWidth = 28; c.strokeStyle = "#000"; }
    else if(R.tool==="marker"){ c.globalCompositeOperation = "multiply"; c.globalAlpha = .35; c.lineWidth = 22; c.strokeStyle = R.color==="#d23c3c" ? "#ffd400" : R.color; }
    else { c.lineWidth = 3.5; c.strokeStyle = R.color; }
    c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x+0.01,b.y); c.stroke(); c.restore(); };
  const rect = $("rrect"); let askFrom = null;
  const ppos = ev => { const r = $("rpage").getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const drawRect = (a, b) => { rect.hidden = false; Object.assign(rect.style, { left: Math.min(a.x,b.x)+"px", top: Math.min(a.y,b.y)+"px", width: Math.abs(b.x-a.x)+"px", height: Math.abs(b.y-a.y)+"px" }); };
  cv.addEventListener("pointerdown", ev=>{ if(R.tool!=="ask" && R.tool!=="solve") return; ev.preventDefault(); ev.stopImmediatePropagation(); askFrom = ppos(ev); cv.setPointerCapture(ev.pointerId); drawRect(askFrom, askFrom); });
  cv.addEventListener("pointermove", ev=>{ if((R.tool!=="ask" && R.tool!=="solve") || !askFrom) return; ev.stopImmediatePropagation(); drawRect(askFrom, ppos(ev)); });
  const askEnd = ev => { if((R.tool!=="ask" && R.tool!=="solve") || !askFrom) return; ev.stopImmediatePropagation(); const a = askFrom; askFrom = null; const b = ppos(ev);
    setTimeout(()=>{ rect.hidden = true; }, ev.type==="pointercancel" ? 0 : 1200); if(ev.type!=="pointercancel") askRect(a, b); };
  cv.addEventListener("pointerup", askEnd); cv.addEventListener("pointercancel", askEnd);
  cv.addEventListener("pointerdown", ev=>{ if(R.tool==="view") return; ev.preventDefault(); drawing = true; last = pos(ev);
    R.undo.push(cv.getContext("2d").getImageData(0,0,INK_W,R.inkH)); if(R.undo.length>20) R.undo.shift();
    cv.setPointerCapture(ev.pointerId); pts = [last]; if(R.tool==="marker") markerRedraw(); else seg(last,last); });
  let pts = [];
  const markerRedraw = () => { const c = cv.getContext("2d"); c.putImageData(R.undo[R.undo.length-1],0,0); c.save();
    c.globalCompositeOperation = "multiply"; c.globalAlpha = .35; c.lineWidth = 22; c.lineCap = c.lineJoin = "round"; c.strokeStyle = R.color==="#d23c3c" ? "#ffd400" : R.color;
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y); pts.forEach(p=>c.lineTo(p.x+0.01,p.y)); c.stroke(); c.restore(); };
  cv.addEventListener("pointermove", ev=>{ if(!drawing) return; (ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]).forEach(e=>{ const p = pos(e);
    if(R.tool==="marker") pts.push(p); else seg(last,p); last = p; }); if(R.tool==="marker") markerRedraw(); });
  const end = () => { if(drawing){ drawing = false; inkChanged(); } };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
}

/* ---------- заметки ---------- */
function renderNoteList(){
  const b = R.book; if(!b) return;
  const p = notesOf(b.id).p, pages = Object.keys(p).filter(k=>p[k] && p[k].trim()).map(Number).sort((a,c)=>a-c);
  $("rnotelist").innerHTML = pages.length ? `<span class="sm">Все заметки:</span> ` + pages.map(n=>`<button class="pg" type="button" data-rjump="${n}" title="${esc(p[n].slice(0,80))}">стр. ${toBook(b,n)}</button>`).join(" ") : `<span class="sm">Заметок в этом учебнике пока нет.</span>`;
  $("rnotelist").querySelectorAll("[data-rjump]").forEach(x=>x.addEventListener("click",()=>show(Number(x.dataset.rjump))));
  $("rnotebtn").textContent = pages.length ? `Заметки (${pages.length})` : "Заметки";
}

/* ---------- размер панели ---------- */
function bindResize(){
  const h = $("rhandle"); let drag = false;
  const setW = w => { w = Math.max(320, Math.min(window.innerWidth - 300, Math.round(w))); lsSet("rwidth", w); document.documentElement.style.setProperty("--rw", w+"px"); };
  h.addEventListener("pointerdown", e=>{ drag = true; h.setPointerCapture(e.pointerId); document.body.classList.add("resizing"); });
  h.addEventListener("pointermove", e=>{ if(!drag) return; setW(window.innerWidth - e.clientX); });
  const end = () => { if(drag){ drag = false; document.body.classList.remove("resizing"); show(R.n); } };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
  h.addEventListener("keydown", e=>{ const cur = Number(lsGet("rwidth",0)) || $("reader").offsetWidth; const left = false;
    if(e.key==="ArrowLeft"){ setW(cur + (left?-40:40)); show(R.n); } else if(e.key==="ArrowRight"){ setW(cur + (left?40:-40)); show(R.n); } });
}

/* ---------- кнопки ---------- */
function init(){
  $("rclose").addEventListener("click", close);
  $("rmin").addEventListener("click", minimize);
  $("rtab").addEventListener("click", restore);
  document.addEventListener("selectionchange", ()=>{ const s = document.getSelection(); if(!s || s.isCollapsed){ return; }
    const node = s.anchorNode && (s.anchorNode.nodeType===1 ? s.anchorNode : s.anchorNode.parentElement);
    if(node && node.closest && node.closest("#rtext")){ const t = s.toString().replace(/\s+/g," ").trim(); if(t){ R.sel = { text:t.slice(0,2000), page:R.n }; fire(); } } });
  $("rprev").addEventListener("click", ()=>show(R.n-1));
  $("rnext").addEventListener("click", ()=>show(R.n+1));
  $("rzin").addEventListener("click", ()=>{ R.zoom = Math.min(3, R.zoom*1.25); show(R.n); });
  $("rzout").addEventListener("click", ()=>{ R.zoom = Math.max(0.4, R.zoom/1.25); show(R.n); });
  $("rpagein").addEventListener("change", ()=>{ const p = parseInt($("rpagein").value,10); if(!isNaN(p)) show(toFile(R.book, p)); });
  $("rdock").addEventListener("click", ()=>setSide("inline"));
  $("rright").addEventListener("click", ()=>setSide("right"));
  $("rfull").addEventListener("click", ()=>{ $("reader").classList.toggle("full"); applyDock(); show(R.n); });
  $("rundo").addEventListener("click", ()=>{ const s = R.undo.pop(); if(s){ $("rink").getContext("2d").putImageData(s,0,0); inkChanged(); } });
  document.querySelectorAll("#reader [data-rtool]").forEach(x=>x.addEventListener("click", ()=>setTool(x.dataset.rtool)));
  document.querySelectorAll("#reader [data-rcolor]").forEach(x=>x.addEventListener("click", ()=>{ R.color = x.dataset.rcolor;
    document.querySelectorAll("#reader [data-rcolor]").forEach(y=>y.setAttribute("aria-pressed", y===x)); if(R.tool==="view"||R.tool==="eraser") setTool("pen"); }));
  $("rnotebtn").addEventListener("click", ()=>{ const n = $("rnotes"); n.hidden = !n.hidden; $("rnotebtn").setAttribute("aria-pressed", !n.hidden); if(!n.hidden) $("rnote").focus(); });
  $("rnote").addEventListener("input", ()=>{ const id = R.book.id, all = notesOf(id); all.p = Object.assign({}, all.p);
    if($("rnote").value.trim()) all.p[R.n] = $("rnote").value; else delete all.p[R.n];
    Store.set("notes-"+id, all, 800); renderNoteList(); });
  document.addEventListener("keydown", e=>{
    if($("reader").hidden || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if(e.key==="ArrowRight") show(R.n+1); else if(e.key==="ArrowLeft") show(R.n-1); else if(e.key==="Escape") close();
  });
  window.addEventListener("beforeunload", ()=>{ if(R.dirty) saveInk(); });
  let rt; window.addEventListener("resize", ()=>{ if($("reader").hidden) return; clearTimeout(rt); rt = setTimeout(()=>show(R.n), 250); });
  bindInk(); bindResize(); setTool("view");
}
init();
window.Reader = { open, close, minimize, restore, pageText, pageImage, toFile, toBook, tool: setTool,
  state(){ return { book:R.book, n:R.n, open:!$("reader").hidden, min:!$("rtab").hidden, sel:R.sel } },
  clearSel(){ R.sel = null; fire(); },
  clearCache(){ Object.keys(docCache).forEach(k=>delete docCache[k]); } };
})();
