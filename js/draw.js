// Рисунки учителя: в ответе ИИ может быть блок <draw>{...}</draw> с простыми линиями,
// фигурами и графиками функций. Здесь он превращается в SVG, который «рисуется» на глазах.
(function(){
const esc = s => String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const W = 400, H = 300;
const COLORS = { red:"#d23c3c", blue:"#2a4fd6", green:"#1f8a5a", black:"#1b2333", orange:"#e08a00", purple:"#7b3fc4", gray:"#8a94a6" };
const col = c => COLORS[c] || "#1b2333";
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* безопасный разбор формулы: числа, x, + - * / ^, скобки, sqrt abs sin cos tan ln log, pi */
function compile(src){
  let s = String(src).toLowerCase().replace(/\s+/g,"").replace(/,/g,".").replace(/·|×/g,"*").replace(/−/g,"-").replace(/√/g,"sqrt").replace(/²/g,"^2").replace(/³/g,"^3");
  s = s.replace(/^y=/, "");
  const toks = []; let i = 0;
  while(i < s.length){
    const c = s[i];
    if(/[0-9.]/.test(c)){ let j = i; while(j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({n:Number(s.slice(i,j))}); i = j; continue; }
    if(/[a-z]/.test(c)){ let j = i; while(j < s.length && /[a-z]/.test(s[j])) j++; const w = s.slice(i,j);
      if(w==="x") toks.push({v:"x"}); else if(w==="pi") toks.push({n:Math.PI}); else if(w==="e") toks.push({n:Math.E});
      else if(["sqrt","abs","sin","cos","tan","ln","log"].includes(w)) toks.push({f:w});
      else if(/^x+$/.test(w)) { for(let k=0;k<w.length;k++) toks.push({v:"x"}); }
      else throw new Error("bad"); i = j; continue; }
    if("+-*/^()".includes(c)){ toks.push({o:c}); i++; continue; }
    throw new Error("bad");
  }
  // неявное умножение: 2x, x(…), )(, )x, 2sqrt
  const t2 = []; toks.forEach((t,k)=>{ const p = toks[k-1];
    if(p && (p.n!==undefined || p.v || p.o===")") && (t.n!==undefined || t.v || t.f || t.o==="(")) t2.push({o:"*"}); t2.push(t); });
  let pos = 0;
  const peek = () => t2[pos], eat = () => t2[pos++];
  function expr(){ let a = term(); while(peek() && (peek().o==="+"||peek().o==="-")){ const o = eat().o, b = term(), l = a; a = o==="+" ? x=>l(x)+b(x) : x=>l(x)-b(x); } return a; }
  function term(){ let a = unary(); while(peek() && (peek().o==="*"||peek().o==="/")){ const o = eat().o, b = unary(), l = a; a = o==="*" ? x=>l(x)*b(x) : x=>l(x)/b(x); } return a; }
  function unary(){ if(peek() && peek().o==="-"){ eat(); const a = unary(); return x=>-a(x); } if(peek() && peek().o==="+"){ eat(); return unary(); } return power(); }
  function power(){ const a = atom(); if(peek() && peek().o==="^"){ eat(); const b = unary(); return x=>Math.pow(a(x), b(x)); } return a; }
  function atom(){ const t = eat(); if(!t) throw new Error("bad");
    if(t.n!==undefined) return ()=>t.n; if(t.v) return x=>x;
    if(t.f){ const a = atom(), F = { sqrt:Math.sqrt, abs:Math.abs, sin:Math.sin, cos:Math.cos, tan:Math.tan, ln:Math.log, log:Math.log10 }[t.f]; return x=>F(a(x)); }
    if(t.o==="("){ const a = expr(); const c = eat(); if(!c || c.o!==")") throw new Error("bad"); return a; }
    throw new Error("bad"); }
  const f = expr(); if(pos !== t2.length) throw new Error("bad"); return f;
}

/* мультяшные значки в стиле квадратных человечков: точка привязки по центру, размер около 60 */
const OL = 'stroke="#2b1a12" stroke-width="3" stroke-linejoin="round"';
const CARTOON = {
  guy: it => { const f = { orange:"#d97757", blue:"#6b8fe8", green:"#5fb37e", purple:"#a07be0", pink:"#f08bb4", gray:"#9aa3b2" }[it.color] || "#d97757";
    const m = it.mood==="sad" ? '<path d="M-7 10 Q0 4 7 10" fill="none" stroke="#2b1a12" stroke-width="2.5" stroke-linecap="round"/>' : it.mood==="wow" ? '<rect x="-3" y="5" width="6" height="7" rx="2" fill="#2b1a12"/>' : '<path d="M-7 6 Q0 13 7 6" fill="none" stroke="#2b1a12" stroke-width="2.5" stroke-linecap="round"/>';
    return `<rect x="-14" y="18" width="9" height="14" rx="2" fill="${f}" ${OL}/><rect x="5" y="18" width="9" height="14" rx="2" fill="${f}" ${OL}/>
      <rect x="-30" y="-6" width="10" height="10" rx="2" fill="${f}" ${OL}/><rect x="20" y="-6" width="10" height="10" rx="2" fill="${f}" ${OL}/>
      <rect x="-22" y="-24" width="44" height="44" rx="5" fill="${f}" ${OL}/>
      <rect x="-11" y="-11" width="5" height="9" rx="1" fill="#2b1a12"/><rect x="6" y="-11" width="5" height="9" rx="1" fill="#2b1a12"/>${m}`; },
  apple: () => `<path d="M0 -14 C-22 -24 -30 2 -18 18 C-10 28 -4 24 0 22 C4 24 10 28 18 18 C30 2 22 -24 0 -14Z" fill="#e8584f" ${OL}/><path d="M0 -14 Q2 -24 6 -28" fill="none" stroke="#2b1a12" stroke-width="3" stroke-linecap="round"/><path d="M4 -22 Q14 -30 20 -22 Q12 -16 4 -22Z" fill="#5fb37e" ${OL}/><path d="M-14 -6 Q-16 2 -12 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  orange: () => `<circle r="22" fill="#f5a524" ${OL}/><circle cx="-6" cy="-4" r="1.6" fill="#c9780c"/><circle cx="7" cy="5" r="1.6" fill="#c9780c"/><circle cx="-2" cy="10" r="1.6" fill="#c9780c"/><path d="M0 -22 Q6 -30 14 -26 Q8 -20 0 -22Z" fill="#5fb37e" ${OL}/>`,
  pear: () => `<path d="M0 -24 C-10 -24 -8 -8 -16 4 C-24 18 -12 28 0 28 C12 28 24 18 16 4 C8 -8 10 -24 0 -24Z" fill="#b9d65a" ${OL}/><path d="M0 -24 Q1 -30 4 -33" fill="none" stroke="#2b1a12" stroke-width="3" stroke-linecap="round"/>`,
  banana: () => `<path d="M-26 -10 Q-24 22 6 22 Q24 20 30 6 Q14 14 0 10 Q-16 4 -18 -14Z" fill="#f7d34a" ${OL}/><rect x="-22" y="-20" width="5" height="8" rx="1" fill="#6b4a2b" transform="rotate(-15 -19 -16)"/>`,
  cherry: () => `<path d="M-8 6 Q-4 -18 8 -26 Q10 -10 10 8" fill="none" stroke="#5a8a3a" stroke-width="3"/><circle cx="-9" cy="14" r="11" fill="#d23c3c" ${OL}/><circle cx="11" cy="16" r="11" fill="#d23c3c" ${OL}/>`,
  box: it => `<rect x="-22" y="-18" width="44" height="36" rx="3" fill="#e9c89a" ${OL}/><path d="M-22 -8 H22" stroke="#2b1a12" stroke-width="2"/>${it.text?`<text y="10" text-anchor="middle" class="lbl">${esc(String(it.text).slice(0,6))}</text>`:""}`,
  coin: () => `<circle r="16" fill="#f5c542" ${OL}/><text y="6" text-anchor="middle" class="lbl" fill="#7a5a00">₽</text>`
};

function svg(spec){
  const items = Array.isArray(spec.items) ? spec.items.slice(0, 60) : [];
  let out = "", len = 0;
  const line = (x1,y1,x2,y2,c,dash,cls) => { len++; return `<line class="d ${cls||""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" ${dash?'stroke-dasharray="6 5"':""} style="--i:${len}"/>`; };
  const arrowHead = (x1,y1,x2,y2,c) => { const a = Math.atan2(y2-y1, x2-x1), L = 10; return `<path class="d" d="M${x2-L*Math.cos(a-0.4)} ${y2-L*Math.sin(a-0.4)} L${x2} ${y2} L${x2-L*Math.cos(a+0.4)} ${y2-L*Math.sin(a+0.4)}" stroke="${c}" fill="none" style="--i:${len}"/>`; };
  items.forEach(it=>{
    const c = col(it.color), dash = !!it.dash;
    try{
      if(it.t==="graph"){
        const [x0,x1] = (it.x||[-5,5]).map(num), [y0,y1] = (it.y||[-5,5]).map(num); if(x1<=x0 || y1<=y0) return;
        const X = v => 20 + (v-x0)/(x1-x0)*(W-40), Y = v => H-20 - (v-y0)/(y1-y0)*(H-40);
        const step = Math.pow(10, Math.floor(Math.log10((x1-x0)/2))) || 1;
        for(let v=Math.ceil(x0/step)*step; v<=x1; v+=step) out += `<line class="grid" x1="${X(v)}" y1="20" x2="${X(v)}" y2="${H-20}"/>`;
        const ys = Math.pow(10, Math.floor(Math.log10((y1-y0)/2))) || 1;
        for(let v=Math.ceil(y0/ys)*ys; v<=y1; v+=ys) out += `<line class="grid" x1="20" y1="${Y(v)}" x2="${W-20}" y2="${Y(v)}"/>`;
        if(y0<=0 && y1>=0){ out += line(14, Y(0), W-10, Y(0), "#1b2333"); out += arrowHead(14,Y(0),W-10,Y(0),"#1b2333"); out += `<text x="${W-14}" y="${Y(0)-6}" class="lbl">x</text>`; }
        if(x0<=0 && x1>=0){ out += line(X(0), H-14, X(0), 10, "#1b2333"); out += arrowHead(X(0),H-14,X(0),10,"#1b2333"); out += `<text x="${X(0)+6}" y="16" class="lbl">y</text>`; out += `<text x="${X(0)-12}" y="${Y(0)+14}" class="lbl sm">0</text>`; }
        if(x0<=1 && x1>=1 && y0<=0 && y1>=0) out += `<text x="${X(1)-3}" y="${Y(0)+14}" class="lbl sm">1</text>`;
        if(y0<=1 && y1>=1 && x0<=0 && x1>=0) out += `<text x="${X(0)-12}" y="${Y(1)+4}" class="lbl sm">1</text>`;
        (it.f||[]).slice(0,4).forEach((src,k)=>{ let f; try{ f = compile(src); }catch(e){ return; }
          const cc = col((it.colors||[])[k] || ["blue","red","green","orange"][k]); let d = "", pen = false;
          for(let i=0;i<=240;i++){ const xv = x0 + (x1-x0)*i/240, yv = f(xv);
            if(!Number.isFinite(yv) || yv < y0-(y1-y0) || yv > y1+(y1-y0)){ pen = false; continue; }
            const py = Math.max(-50, Math.min(H+50, Y(yv))); d += (pen ? "L" : "M") + X(xv).toFixed(1) + " " + py.toFixed(1) + " "; pen = true; }
          len++; out += `<path class="d curve" d="${d}" stroke="${cc}" fill="none" style="--i:${len}"/>`; });
        (it.pts||[]).slice(0,12).forEach(p=>{ out += `<circle class="pt" cx="${X(num(p[0]))}" cy="${Y(num(p[1]))}" r="4" fill="${c}"/>` + (p[2] ? `<text x="${X(num(p[0]))+6}" y="${Y(num(p[1]))-6}" class="lbl">${esc(p[2])}</text>` : ""); });
        return;
      }
      if(it.t==="line"){ const [x1,y1,x2,y2] = (it.p||[]).map(num); out += line(x1,y1,x2,y2,c,dash); if(it.arrow) out += arrowHead(x1,y1,x2,y2,c); return; }
      if(it.t==="poly"){ const pts = (it.p||[]).slice(0,40).map(p=>[num(p[0]),num(p[1])]); if(pts.length<2) return; len++;
        out += `<path class="d" d="M${pts.map(p=>p.join(" ")).join(" L")}${it.closed?" Z":""}" stroke="${c}" fill="${it.fill?c:"none"}" ${it.fill?'fill-opacity=".12"':""} ${dash?'stroke-dasharray="6 5"':""} style="--i:${len}"/>`; return; }
      if(it.t==="circle"){ const [cx,cy] = (it.c||[]).map(num), r = num(it.r); len++; out += `<circle class="d" cx="${cx}" cy="${cy}" r="${r}" stroke="${c}" fill="none" ${dash?'stroke-dasharray="6 5"':""} style="--i:${len}"/>`; return; }
      if(it.t==="arc"){ const [cx,cy] = (it.c||[]).map(num), r = num(it.r), a0 = num(it.a0)*Math.PI/180, a1 = num(it.a1)*Math.PI/180; len++;
        out += `<path class="d" d="M${cx+r*Math.cos(a0)} ${cy-r*Math.sin(a0)} A${r} ${r} 0 ${Math.abs(a1-a0)>Math.PI?1:0} 0 ${cx+r*Math.cos(a1)} ${cy-r*Math.sin(a1)}" stroke="${c}" fill="none" style="--i:${len}"/>`; return; }
      if(it.t==="point"){ const [x,y] = (it.p||[]).map(num); out += `<circle class="pt" cx="${x}" cy="${y}" r="4" fill="${c}"/>` + (it.s ? `<text x="${x+6}" y="${y-6}" class="lbl">${esc(it.s)}</text>` : ""); return; }
      if(it.t==="rect"){ const [x,y,w,h] = (it.p||[]).map(num); len++; out += `<rect class="d" x="${x}" y="${y}" width="${w}" height="${h}" rx="${num(it.r)}" stroke="${c}" fill="${it.fill?c:"none"}" ${it.fill?'fill-opacity=".15"':""} ${dash?'stroke-dasharray="6 5"':""} style="--i:${len}"/>`; return; }
      if(CARTOON[it.t]){ const [x,y] = (it.p||[]).map(num), k = Math.max(0.3, Math.min(3, num(it.s)||1)); len++;
        out += `<g class="cart" transform="translate(${x} ${y}) scale(${k})" style="--i:${len}">${CARTOON[it.t](it)}</g>` + (it.label ? `<text x="${x}" y="${y + 42*k}" class="lbl" text-anchor="middle">${esc(String(it.label).slice(0,30))}</text>` : ""); return; }
      if(it.t==="text"){ const [x,y] = (it.p||[]).map(num); out += `<text x="${x}" y="${y}" class="lbl" fill="${c}">${esc(String(it.s||"").slice(0,60))}</text>`; return; }
    }catch(e){}
  });
  return `<svg class="tdraw" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title || "Рисунок учителя")}">${out}</svg>`;
}

/* лёгкий Markdown для ответов учителя: заголовки, списки, жирный, маркер, «Ответ:» */
function inline(t){
  return t.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
    .replace(/==([^=\n]+?)==/g, '<mark>$1</mark>')
    .replace(/!!([^!\n]+?)!!/g, '<span class="md-red">$1</span>')
    .replace(/(^|[\s(«])\*(\S(?:[^*\n]*?\S)?)\*(?=[\s).,!?:;»]|$)/g, '$1<em>$2</em>');
}
function md(src){
  const lines = esc(src).split("\n"), out = []; let list = null, para = [], tbl = [];
  const flushP = () => { if(para.length){ out.push(`<p>${inline(para.join("<br>"))}</p>`); para = []; } };
  // таблицы: строки «a | b | c» (с крайними | или без), строка из дефисов между шапкой и телом не обязательна
  const cells = l => l.replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim());
  const isRow = l => /\S\s*\|\s*\S|^\|.*\|$/.test(l) && cells(l).length >= 2;
  const isSep = l => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(l);
  const flushT = () => { if(!tbl.length) return;
    const rows = tbl.filter(r=>!isSep(r)).map(cells); tbl = [];
    if(rows.length < 2){ rows.forEach(r=>para.push(r.join(" | "))); return; }
    const n = Math.max(...rows.map(r=>r.length)), pad = r => r.concat(Array(n - r.length).fill(""));
    out.push(`<div class="tablewrap"><table class="md-table"><thead><tr>${pad(rows[0]).map(c=>`<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${pad(r).map(c=>`<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); };
  const flushL = () => { if(list){ out.push(`<${list.t}>${list.items.map(x=>`<li>${inline(x)}</li>`).join("")}</${list.t}>`); list = null; } };
  lines.forEach((raw, k)=>{ const l = raw.trim(); let m;
    const nx = (lines[k+1]||"").trim(), pv = (lines[k-1]||"").trim();
    if(isSep(l) && tbl.length){ tbl.push(l); return; }
    const absv = /\|[^|\s][^|]*\|\s*[=<>≤≥+\-−·:]/.test(l), head = tbl.find(x=>!isSep(x));
    if(isRow(l) && !absv && (head ? cells(head).length === cells(l).length : (isRow(nx) || isSep(nx)))){ flushP(); flushL(); tbl.push(l); return; }
    flushT();
    if(!l){ flushP(); flushL(); return; }
    if((m = l.match(/^#{1,4}\s+(.*)$/))){ flushP(); flushL(); out.push(`<h4 class="md-h">${inline(m[1].replace(/\*\*/g,""))}</h4>`); return; }
    if((m = l.match(/^(?:[-•–]|\*(?!\*))\s+(.*)$/))){ flushP(); if(!list || list.t!=="ul"){ flushL(); list = {t:"ul", items:[]}; } list.items.push(m[1]); return; }
    if((m = l.match(/^(\d+)[.)]\s+(.*)$/))){ flushP(); if(!list || list.t!=="ol"){ flushL(); list = {t:"ol", items:[]}; } list.items.push(m[2]); return; }
    if(/^(?:\*\*)?Ответ\s*:/i.test(l)){ flushP(); flushL(); out.push(`<p class="md-ans">${inline(l)}</p>`); return; }
    flushL(); para.push(l);
  });
  flushT(); flushP(); flushL(); return out.join("");
}
// текст ответа -> HTML: текст в лёгком Markdown, блоки <draw> становятся рисунками с кнопками «сохранить»
function html(text){
  const parts = String(text||"").split(/<draw>([\s\S]*?)<\/draw>/i);
  // текст учителя из этого ответа: его можно сохранить вместе с рисунком
  const said = encodeURIComponent(parts.filter((_,i)=>i%2===0).join("\n").replace(/\[\[[^\]]*\]\]/g,"").replace(/\n{3,}/g,"\n\n").trim().slice(0, 1500));
  return `<div class="md">${parts.map((p,i)=>{
    if(i%2===0) return md(p);
    try{ const spec = JSON.parse(p.trim().replace(/^```(json)?|```$/g,""));
      const memo = spec.kind==="memo", data = encodeURIComponent(JSON.stringify(spec));
      return `<figure class="tfig ${memo?"memo":""}">${memo||spec.title?`<figcaption>${memo?"📌 ":""}${esc(spec.title||"Памятка")}</figcaption>`:""}${svg(spec)}<div class="tfig-acts" data-said="${said}"><button class="ibtn" type="button" data-memo="${data}" title="Сохранить в памятки" aria-label="Сохранить в памятки">⭐</button><button class="ibtn" type="button" data-png="${data}" title="Скачать картинкой" aria-label="Скачать картинкой">⬇</button></div></figure>`; }catch(e){ return ""; }
  }).join("")}</div>`;
}

/* сохранение рисунков: в памятки (Store "memos") и картинкой; отдельно, с текстом учителя или со своим */
function memos(){ const d = Object.assign({list:[]}, Store.get("memos", {})); d.list = d.list.slice(); return d; }
function saveMemo(spec, note){ const d = memos(); const same = d.list.find(x=>JSON.stringify(x.spec)===JSON.stringify(spec));
  if(same){ if(note && same.note !== note){ d.list = d.list.map(x=>x===same ? Object.assign({}, x, { note }) : x); Store.set("memos", d, 0); return true; } return false; }
  d.list.unshift({ id:"m"+Date.now(), spec, title: spec.title || "Рисунок учителя", kind: spec.kind || "task", note: note || "", ts: Date.now() }); Store.set("memos", d, 0); return true; }
const plainNote = t => String(t||"").replace(/\*\*|__|==|!!|`/g,"").replace(/^#+\s*/gm,"").replace(/^\s*[-*]\s+/gm,"• ").trim();
async function png(spec, note){
  const raw = svg(spec).replace('<svg class="tdraw"', `<svg xmlns="http://www.w3.org/2000/svg" width="${W*2}" height="${H*2}" style="background:#fffefa;font-family:sans-serif"`)
    .replace(/class="d[^"]*"/g, 'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"').replace(/class="lbl sm"/g,'font-size="11" fill="#5d6a80"').replace(/class="lbl"/g,'font-size="14" font-weight="600"').replace(/class="grid"/g,'stroke="#e2e8f2"');
  const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw); await img.decode();
  // текст под рисунком, если выбран
  const c = document.createElement("canvas"), x = c.getContext("2d"), fs = 24, LH = 34, pad = 28;
  const lines = []; if(note){ x.font = `${fs}px "Golos Text", sans-serif`; plainNote(note).split("\n").forEach(par=>{ if(!par.trim()){ lines.push(""); return; } let l = ""; par.split(/\s+/).forEach(w=>{ const t = l ? l+" "+w : w; if(x.measureText(t).width > W*2 - 2*pad && l){ lines.push(l); l = w; } else l = t; }); lines.push(l); }); }
  c.width = W*2; c.height = H*2 + (lines.length ? lines.length*LH + 2*pad : 0);
  x.fillStyle = "#fffefa"; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,W*2,H*2);
  if(lines.length){ x.strokeStyle = "#e5e1d6"; x.beginPath(); x.moveTo(pad, H*2+8); x.lineTo(W*2-pad, H*2+8); x.stroke(); x.fillStyle = "#1b2333"; x.font = `${fs}px "Golos Text", sans-serif`; lines.forEach((l,n)=>x.fillText(l, pad, H*2 + pad + 18 + n*LH)); }
  const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = (spec.title || "рисунок учителя").replace(/[\\/:*?"<>|]/g,"") + ".png"; a.click();
}
// выбор, что сохранить: появляется под рисунком
function chooser(btn, act){
  const box = btn.closest(".tfig-acts, .chatrow"), fig = btn.closest("figure");
  const old = fig && fig.querySelector(".savebox"); if(old){ old.remove(); if(old.dataset.act===act) return; }
  const said = decodeURIComponent((box && box.dataset.said) || ""), spec = JSON.parse(decodeURIComponent(btn.dataset.memo || btn.dataset.png));
  const el = document.createElement("div"); el.className = "savebox"; el.dataset.act = act;
  el.innerHTML = `<label><input type="radio" name="sv" value="none" checked> Только рисунок</label>
    ${said ? `<label><input type="radio" name="sv" value="said"> С текстом учителя</label>` : ""}
    <label><input type="radio" name="sv" value="own"> Со своим текстом</label>
    <textarea rows="3" placeholder="Своя подпись: как запомнить, что важно" hidden></textarea>
    <div class="chatrow"><button class="btn primary" type="button">${act==="memo" ? "⭐ В памятки" : "⬇ Скачать"}</button></div>`;
  (fig || box.parentNode).appendChild(el);
  const ta = el.querySelector("textarea");
  el.querySelectorAll("[name=sv]").forEach(r=>r.addEventListener("change", ()=>{ ta.hidden = el.querySelector("[name=sv]:checked").value !== "own"; if(!ta.hidden) ta.focus(); }));
  el.querySelector(".btn").addEventListener("click", ()=>{ const v = el.querySelector("[name=sv]:checked").value, note = v==="said" ? said : v==="own" ? ta.value.trim() : "";
    if(act==="memo"){ const ok = saveMemo(spec, note); btn.textContent = "✓"; btn.title = ok ? "Сохранено в памятки" : "Уже в памятках"; }
    else png(spec, note);
    el.remove(); });
}
document.addEventListener("click", e=>{
  const m = e.target.closest("[data-memo]"), p = e.target.closest("[data-png]");
  try{ if(m) chooser(m, "memo"); if(p) chooser(p, "png"); }catch(err){ console.error(err); }
});

/* памятки другого вида: сообщение учителя, весь диалог, свой рисунок (лист тетради), свой файл */
function addMemo(item){ const d = memos(); d.list.unshift(Object.assign({ id:"m"+Date.now()+Math.random().toString(36).slice(2,6), ts:Date.now() }, item)); Store.set("memos", d, 0); }
const firstLine = t => plainNote(t).replace(/<draw>[\s\S]*?<\/draw>/gi,"").split("\n").map(x=>x.trim()).filter(Boolean)[0] || "";
const short = (t, n) => t.length > n ? t.slice(0, n-1).trim() + "…" : t;
// кнопки под сообщениями учителя и «сохранить весь диалог» в конце чата
function decorate(log, chat){
  if(!log || !Array.isArray(chat)) return;
  const els = log.querySelectorAll(":scope > .msg");
  if(els.length !== chat.length) return;
  chat.forEach((m,i)=>{ if(m.role==="user" || m.pending || m.err || !m.content) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "ibtn msgsave"; b.textContent = "⭐"; b.title = "Сохранить сообщение в памятки"; b.setAttribute("aria-label", b.title);
    b.addEventListener("click", ()=>{ addMemo({ kind:"msg", title: short(firstLine(m.content) || "Сообщение учителя", 70), text: m.content }); b.textContent = "✓"; b.disabled = true; b.title = "Сохранено в памятки"; });
    els[i].appendChild(b); });
  const real = chat.filter(m=>!m.pending && !m.err && m.content);
  if(real.length >= 2){
    const row = document.createElement("div"); row.className = "dlgsave";
    row.innerHTML = `<button class="btn" type="button">⭐ Сохранить весь диалог в памятки</button>`;
    row.querySelector("button").addEventListener("click", e=>{ const firstQ = real.find(m=>m.role==="user");
      addMemo({ kind:"chat", title: short(firstQ ? plainNote(firstQ.content).split("\n")[0] : "Разговор с учителем", 70), msgs: real.map(m=>({ role: m.role==="user" ? "user" : "assistant", content: String(m.content) })) });
      e.target.textContent = "✓ Диалог сохранён в памятки"; e.target.disabled = true; });
    log.appendChild(row);
  }
}

window.Draw = { html, svg, compile, md, memos, addMemo, decorate };
})();
