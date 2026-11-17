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
