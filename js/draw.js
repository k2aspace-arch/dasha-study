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

// текст ответа -> HTML: обычный текст экранируется, блоки <draw> становятся рисунками
function html(text){
  const parts = String(text||"").split(/<draw>([\s\S]*?)<\/draw>/i);
  return parts.map((p,i)=>{
    if(i%2===0) return esc(p.replace(/^\n+|\n+$/g, i ? "" : "$&"));
    try{ const spec = JSON.parse(p.trim().replace(/^```(json)?|```$/g,"")); return svg(spec); }catch(e){ return ""; }
  }).join("");
}

window.Draw = { html, svg, compile };
})();
