// Тетрадь по предмету: листы в клетку (в линейку для русского языка).
// У каждой главы своя тетрадь: новая глава, новая тетрадь.
(function(){
const { $, esc } = window.App;
const W = 1200, H = 1700;
const COLORS = [["#1d3fbf","Синяя ручка"],["#1b2333","Чёрная"],["#1f8a5a","Зелёная"],["#d23c3c","Красная"]];

function drawPaper(ctx, ruled){
  ctx.fillStyle = "#fffefa"; ctx.fillRect(0,0,W,H);
  ctx.lineWidth = 1.5;
  if(ruled){
    ctx.strokeStyle = "#b9c9e6"; for(let y=150; y<H-40; y+=56){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else {
    ctx.strokeStyle = "#cddaf0"; for(let x=0; x<=W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<=H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }
  ctx.strokeStyle = "#e46a6a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W-100,0); ctx.lineTo(W-100,H); ctx.stroke();
}

function mount(host, opts){
  const bookId = opts.bookId, key = opts.key, ruled = !!opts.ruled, docKey = "nb-"+bookId;
  const idx = () => { const d = Object.assign({c:{}}, Store.get(docKey, {})); d.c = Object.assign({}, d.c); d.c[key] = Object.assign({sheets:[]}, d.c[key]); d.c[key].sheets = d.c[key].sheets.slice(); return d; };
  const st = { i:0, tool:"pen", color:COLORS[0][0], undo:[], dirty:false, timer:null, token:0 };
  { const d = idx(); st.i = Math.max(0, d.c[key].sheets.length - 1); }
  host.innerHTML = `<div class="nb">
    <div class="nb-head"><div><b>${esc(opts.title)}</b><div class="sm">${esc(opts.sub || "")}</div></div>
      <div class="nb-pager"><button class="vbtn" type="button" data-nb="prev" aria-label="Предыдущий лист">‹</button><span class="sm" data-nb-info></span><button class="vbtn" type="button" data-nb="next" aria-label="Следующий лист">›</button><button class="vbtn" type="button" data-nb="add">+ Лист</button></div></div>
    <div class="nb-tools" role="toolbar" aria-label="Инструменты тетради">
      ${[["pen","Ручка"],["marker","Маркер"],["text","Текст"],["eraser","Ластик"]].map(([t,n])=>`<button class="vbtn" type="button" data-nbtool="${t}" aria-pressed="${t==="pen"}">${n}</button>`).join("")}
      ${COLORS.map(([c,n],i)=>`<button class="swatch sm-sw" type="button" data-nbcolor="${c}" style="background:${c}" aria-label="${n}" aria-pressed="${i===0}"></button>`).join("")}
      <button class="vbtn" type="button" data-nb="undo">Отменить</button>
      <button class="vbtn" type="button" data-nb="clear">Очистить лист</button>
    </div>
    <div class="nb-sheet"><canvas class="nb-bg" width="${W}" height="${H}"></canvas><canvas class="nb-ink" width="${W}" height="${H}"></canvas></div>
  </div>`;
  const bg = host.querySelector(".nb-bg"), cv = host.querySelector(".nb-ink"), ctx = cv.getContext("2d"), sheetEl = host.querySelector(".nb-sheet");
  drawPaper(bg.getContext("2d"), ruled);
  const info = host.querySelector("[data-nb-info]");

  async function load(){
    const tok = ++st.token, d = idx(), sh = d.c[key].sheets[st.i];
    ctx.clearRect(0,0,W,H); st.undo = [];
    const n = Math.max(1, d.c[key].sheets.length);
    info.textContent = `Лист ${Math.min(st.i+1, n)} из ${n}`;
    if(sh && sh.path){ try{ const blob = await Store.getFile(sh.path); if(blob && tok===st.token){ const img = await createImageBitmap(blob); ctx.drawImage(img,0,0,W,H); } }catch(e){} }
  }
  function changed(){ st.dirty = true; clearTimeout(st.timer); st.timer = setTimeout(save, 1500); }
  async function save(){
    clearTimeout(st.timer); if(!st.dirty) return; st.dirty = false;
    const d = idx(), list = d.c[key].sheets, i = st.i;
    while(list.length <= i) list.push({ id:"s"+Date.now()+list.length });
    const old = list[i].path;
    try{
      const blob = await new Promise(r=>cv.toBlob(r,"image/png")), path = `nb/${bookId}/${key}/${list[i].id}-${Date.now()}.png`;
      await Store.putFile(path, blob); list[i] = Object.assign({}, list[i], { path, t:Date.now() });
      await Store.set(docKey, d, 0);
      if(old && old!==path) Store.removeFile(old).catch(()=>{});
    }catch(e){ st.dirty = true; console.warn("notebook save", e); }
  }
  const pos = ev => { const r = cv.getBoundingClientRect(); return { x:(ev.clientX-r.left)*W/r.width, y:(ev.clientY-r.top)*H/r.height }; };
  const style = c => { c.lineCap = c.lineJoin = "round";
    if(st.tool==="eraser"){ c.globalCompositeOperation = "destination-out"; c.lineWidth = 34; c.strokeStyle = "#000"; }
    else if(st.tool==="marker"){ c.globalCompositeOperation = "multiply"; c.globalAlpha = .35; c.lineWidth = 26; c.strokeStyle = st.color==="#1d3fbf" ? "#ffd400" : st.color; }
    else { c.lineWidth = 3.2; c.strokeStyle = st.color; } };
  let drawing = false, pts = [];
  const redraw = () => { ctx.putImageData(st.undo[st.undo.length-1],0,0); ctx.save(); style(ctx); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.forEach(p=>ctx.lineTo(p.x+0.01,p.y)); ctx.stroke(); ctx.restore(); };
  function snap(){ st.undo.push(ctx.getImageData(0,0,W,H)); if(st.undo.length>25) st.undo.shift(); }
  function placeText(p){
    const r = cv.getBoundingClientRect(), k = r.width / W;
    const ta = document.createElement("textarea"); ta.className = "nb-text"; ta.style.left = (p.x*k)+"px"; ta.style.top = (p.y*k - 22*k)+"px"; ta.style.fontSize = Math.max(14, 44*k)+"px"; ta.style.color = st.color;
    ta.setAttribute("aria-label","Текст в тетради"); sheetEl.appendChild(ta); setTimeout(()=>ta.focus(), 0);
    const commit = () => { const t = ta.value; ta.remove(); if(!t.trim()) return; snap();
      ctx.save(); ctx.fillStyle = st.color; ctx.font = `44px "Caveat", "Golos Text", cursive`; ctx.textBaseline = "middle";
      t.split("\n").forEach((line,i)=>ctx.fillText(line, p.x, p.y + i*(ruled?56:48))); ctx.restore(); changed(); };
    ta.addEventListener("blur", commit); ta.addEventListener("keydown", e=>{ if(e.key==="Escape"){ ta.value = ""; ta.blur(); } if(e.key==="Enter" && (e.ctrlKey||e.metaKey)) ta.blur(); });
  }
  cv.addEventListener("pointerdown", ev=>{
    if(st.tool==="text"){ ev.preventDefault(); const p = pos(ev); setTimeout(()=>placeText(p), 0); return; }
    ev.preventDefault(); drawing = true; snap(); cv.setPointerCapture(ev.pointerId); pts = [pos(ev)]; redraw(); });
  cv.addEventListener("pointermove", ev=>{ if(!drawing) return; (ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]).forEach(e=>pts.push(pos(e))); redraw(); });
  const end = () => { if(drawing){ drawing = false; changed(); } };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

  host.querySelectorAll("[data-nbtool]").forEach(b=>b.addEventListener("click",()=>{ st.tool = b.dataset.nbtool; host.querySelectorAll("[data-nbtool]").forEach(x=>x.setAttribute("aria-pressed", x===b)); cv.classList.toggle("texting", st.tool==="text"); }));
  host.querySelectorAll("[data-nbcolor]").forEach(b=>b.addEventListener("click",()=>{ st.color = b.dataset.nbcolor; host.querySelectorAll("[data-nbcolor]").forEach(x=>x.setAttribute("aria-pressed", x===b)); if(st.tool==="eraser") host.querySelector('[data-nbtool="pen"]').click(); }));
  host.querySelector('[data-nb="undo"]').addEventListener("click",()=>{ const s = st.undo.pop(); if(s){ ctx.putImageData(s,0,0); changed(); } });
  host.querySelector('[data-nb="clear"]').addEventListener("click",()=>{ snap(); ctx.clearRect(0,0,W,H); changed(); });
  const go = async i => { await save(); st.i = i; load(); };
  host.querySelector('[data-nb="prev"]').addEventListener("click",()=>{ if(st.i>0) go(st.i-1); });
  host.querySelector('[data-nb="next"]').addEventListener("click",()=>{ const n = idx().c[key].sheets.length; if(st.i < n-1) go(st.i+1); });
  host.querySelector('[data-nb="add"]').addEventListener("click", async()=>{ await save(); const d = idx(); const n = d.c[key].sheets.length;
    if(n === 0){ info.textContent = "Этот лист ещё пустой"; return; }
    d.c[key].sheets.push({ id:"s"+Date.now() });
    await Store.set(docKey, d, 0); st.i = d.c[key].sheets.length - 1; load(); });
  window.addEventListener("beforeunload", save);
  load();
  return {
    save,
    hasInk(){ return ctx.getImageData(0,0,W,H).data.some((v,i)=>i%4===3 && v); },
    // лист вместе с клеткой или линейкой, для проверки учителем (JPEG base64)
    image(){ const c = document.createElement("canvas"), s = 0.7; c.width = W*s; c.height = H*s; const x = c.getContext("2d");
      x.drawImage(bg,0,0,c.width,c.height); x.drawImage(cv,0,0,c.width,c.height); return c.toDataURL("image/jpeg",0.8).split(",")[1]; },
    destroy(){ save(); window.removeEventListener("beforeunload", save); host.innerHTML = ""; }
  };
}

// небольшой холст в клетку для рисунка в итоговых вопросах
function sketch(host){
  const w = 800, h = 500;
  host.innerHTML = `<div class="nb-sketch"><canvas width="${w}" height="${h}" class="nb-bg"></canvas><canvas width="${w}" height="${h}" class="nb-ink"></canvas></div><div class="btnrow"><button class="btn" type="button" data-sk="undo">Отменить</button><button class="btn" type="button" data-sk="clear">Очистить</button></div>`;
  const [bg, cv] = host.querySelectorAll("canvas"), b = bg.getContext("2d"), ctx = cv.getContext("2d"), undo = [];
  b.fillStyle = "#fffefa"; b.fillRect(0,0,w,h); b.strokeStyle = "#cddaf0"; b.lineWidth = 1;
  for(let x=0;x<=w;x+=25){ b.beginPath(); b.moveTo(x,0); b.lineTo(x,h); b.stroke(); } for(let y=0;y<=h;y+=25){ b.beginPath(); b.moveTo(0,y); b.lineTo(w,y); b.stroke(); }
  let on = false, last = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x:(e.clientX-r.left)*w/r.width, y:(e.clientY-r.top)*h/r.height }; };
  cv.addEventListener("pointerdown", e=>{ e.preventDefault(); on = true; last = pos(e); undo.push(ctx.getImageData(0,0,w,h)); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e=>{ if(!on) return; const p = pos(e); ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#1d3fbf"; ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last = p; });
  const end = () => on = false; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  host.querySelector('[data-sk="undo"]').addEventListener("click",()=>{ const s = undo.pop(); if(s) ctx.putImageData(s,0,0); });
  host.querySelector('[data-sk="clear"]').addEventListener("click",()=>{ undo.push(ctx.getImageData(0,0,w,h)); ctx.clearRect(0,0,w,h); });
  return {
    empty(){ return !ctx.getImageData(0,0,w,h).data.some((v,i)=>i%4===3 && v); },
    image(){ const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(bg,0,0); x.drawImage(cv,0,0); return c.toDataURL("image/jpeg",0.85).split(",")[1]; }
  };
}

window.Notebook = { mount, sketch };
})();
