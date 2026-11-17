// Учитель Клод: мультяшный персонаж. Ходит, думает, жмурится, улыбается,
// и ставит оценки красной ручкой.
(function(){
const SVG = `
<svg class="av-svg" viewBox="0 0 160 200" aria-hidden="true">
  <g class="av-body">
    <ellipse class="av-shadow" cx="80" cy="192" rx="38" ry="6"/>
    <g class="av-leg av-leg-l"><rect x="58" y="150" width="12" height="34" rx="6"/><ellipse cx="62" cy="186" rx="12" ry="6"/></g>
    <g class="av-leg av-leg-r"><rect x="90" y="150" width="12" height="34" rx="6"/><ellipse cx="98" cy="186" rx="12" ry="6"/></g>
    <g class="av-arm av-arm-l"><rect x="20" y="96" width="30" height="12" rx="6"/></g>
    <g class="av-torso">
      <path class="av-blob" d="M80 26c30 0 52 22 54 54 2 34-6 62-22 72-10 7-22 8-32 8s-22-1-32-8C32 142 24 114 26 80 28 48 50 26 80 26z"/>
      <g class="av-spark"><path d="M80 4l4 12 12-4-8 10 10 8-13-1-1 13-4-12-4 12-1-13-13 1 10-8-8-10 12 4z"/></g>
      <g class="av-face">
        <g class="av-eyes">
          <g class="av-eye av-eye-l"><ellipse class="av-white" cx="64" cy="78" rx="11" ry="13"/><circle class="av-pupil" cx="66" cy="80" r="5.5"/><circle class="av-glint" cx="68" cy="77" r="1.8"/></g>
          <g class="av-eye av-eye-r"><ellipse class="av-white" cx="98" cy="78" rx="11" ry="13"/><circle class="av-pupil" cx="100" cy="80" r="5.5"/><circle class="av-glint" cx="102" cy="77" r="1.8"/></g>
          <path class="av-squint" d="M54 80q10-9 20 0M88 80q10-9 20 0"/>
        </g>
        <g class="av-glasses">
          <path class="av-temple" d="M46 74L30 68M116 75L132 69"/>
          <circle class="av-lens" cx="63" cy="79" r="17.5"/><circle class="av-lens" cx="100" cy="80" r="15.5"/>
          <path class="av-bridge" d="M80.5 76q2-6 4.5-.5"/>
          <rect class="av-tape" x="79" y="71" width="7" height="8" rx="1.5" transform="rotate(12 82.5 75)"/>
          <path class="av-shine" d="M52 72q4-7 11-8M91 73q3-5 9-6"/>
        </g>
        <path class="av-brows" d="M50 54q12-6 24 1M88 56q10-5 21 0"/>
        <circle class="av-cheek" cx="52" cy="98" r="6"/><circle class="av-cheek" cx="110" cy="98" r="6"/>
        <path class="av-mouth" d="M70 102q11 10 22 0"/>
        <path class="av-mouth-big" d="M66 100q15 20 30 0z"/>
        <path class="av-mouth-o" d="M77 104a4 5 0 1 0 8 0a4 5 0 1 0-8 0"/>
      </g>
    </g>
    <g class="av-tie"><path d="M80 128l-13-7v14z M80 128l13-7v14z"/><circle cx="80" cy="128" r="3.5"/></g>
    <g class="av-arm av-arm-r"><rect x="110" y="96" width="30" height="12" rx="6"/>
      <g class="av-pen"><rect x="134" y="70" width="5" height="34" rx="2" transform="rotate(20 136 87)"/><path d="M140 100l-3 9-2-9z" transform="rotate(20 136 87)"/></g>
    </g>
  </g>
  <g class="av-think"><circle cx="128" cy="40" r="4"/><circle cx="138" cy="28" r="6"/><ellipse cx="146" cy="12" rx="12" ry="9"/><text x="146" y="16" text-anchor="middle">…</text></g>
</svg>`;

function create(host, opts){
  opts = opts || {};
  const stage = document.createElement("div");
  stage.className = "av-stage" + (opts.compact ? " compact" : "");
  stage.innerHTML = `<div class="av-walker"><div class="av-say" hidden></div>${SVG}</div>`;
  host.appendChild(stage);
  const walker = stage.querySelector(".av-walker"), svg = stage.querySelector(".av-svg"), bubble = stage.querySelector(".av-say");
  let mood = "idle", x = 0.5, roam = null, sayT = null, blinkT = null;
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setMood(m){ mood = m; svg.setAttribute("data-mood", m); }
  function moveTo(nx, ms){
    return new Promise(res=>{
      const w = stage.clientWidth - walker.offsetWidth; if(w <= 0){ res(); return; }
      svg.classList.toggle("flip", nx < x); x = nx;
      const dur = reduced ? 0 : (ms ?? 1600);
      walker.style.transition = `transform ${dur}ms ease-in-out`; svg.classList.toggle("walking", dur > 0);
      walker.style.transform = `translateX(${Math.round(nx*w)}px)`;
      setTimeout(()=>{ svg.classList.remove("walking"); res(); }, dur);
    });
  }
  function say(text, ms){ clearTimeout(sayT); bubble.textContent = text; bubble.hidden = !text; if(text && ms) sayT = setTimeout(()=>bubble.hidden = true, ms); }
  function blink(){ svg.classList.add("blink"); setTimeout(()=>svg.classList.remove("blink"), 160); blinkT = setTimeout(blink, 2500 + Math.random()*3000); }
  async function roamLoop(){
    if(roam === null) return;
    if(mood === "idle"){
      const r = Math.random();
      if(r < 0.55) await moveTo(0.1 + Math.random()*0.8);
      else if(r < 0.7){ setMood("smile"); await wait(1400); if(mood==="smile") setMood("idle"); }
      else if(r < 0.85){ setMood("squint"); await wait(900); if(mood==="squint") setMood("idle"); }
      else { setMood("think"); await wait(1600); if(mood==="think") setMood("idle"); }
    }
    roam = setTimeout(roamLoop, 900 + Math.random()*1600);
  }
  const wait = ms => new Promise(r=>setTimeout(r, ms));
  setMood("idle"); blink();
  requestAnimationFrame(()=>moveTo(0.5, 0));
  return {
    el: stage, setMood, moveTo, say,
    start(){ if(roam === null){ roam = 0; roamLoop(); } },
    stop(){ clearTimeout(roam); roam = null; },
    destroy(){ clearTimeout(roam); roam = null; clearTimeout(blinkT); clearTimeout(sayT); stage.remove(); }
  };
}

/* Оценка красной ручкой поверх экрана.
   verdict: "perfect" | "better" | "worse" | "same" */
function grade({ mark, verdict, detail }){
  const phrase = verdict==="perfect" ? "Молодец!" : verdict==="better" ? "Ты на верном пути! Так держать" : verdict==="worse" ? "Ты можешь лучше" : "Хорошая работа, продолжай";
  return new Promise(resolve=>{
    const ov = document.createElement("div");
    ov.className = "av-overlay"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-label", `Оценка ${mark}. ${phrase}`);
    ov.innerHTML = `<div class="av-sheet">
      <div class="av-sheet-lines"></div>
      ${detail ? `<p class="av-detail">${detail}</p>` : ""}
      <svg class="av-ink" viewBox="0 0 400 260" aria-hidden="true">
        <ellipse class="av-ring" cx="110" cy="110" rx="78" ry="70"/>
        <text class="av-mark" x="110" y="150" text-anchor="middle">${mark}</text>
        <text class="av-phrase" x="210" y="${phrase.length > 18 ? 205 : 215}" text-anchor="middle">${phrase.length > 18 ? phrase.replace(/!\s*/, "!\n").split("\n").map((l,i)=>`<tspan x="230" dy="${i?34:0}">${l}</tspan>`).join("") : phrase}</text>
      </svg>
      <button class="btn primary av-ok" type="button">Спасибо!</button>
    </div><div class="av-host"></div>`;
    document.body.appendChild(ov);
    const a = create(ov.querySelector(".av-host"), {compact:false});
    a.setMood("idle");
    const done = () => { a.destroy(); ov.remove(); resolve(); };
    ov.querySelector(".av-ok").addEventListener("click", done);
    ov.addEventListener("keydown", e=>{ if(e.key==="Escape") done(); });
    (async()=>{
      await new Promise(r=>setTimeout(r, 50));
      a.moveTo(1, 0); await new Promise(r=>setTimeout(r, 30));
      await a.moveTo(0.55, 1400);
      a.setMood("think"); await new Promise(r=>setTimeout(r, 900));
      a.setMood("write"); ov.classList.add("writing");
      await new Promise(r=>setTimeout(r, 2200));
      a.setMood(verdict==="worse" ? "squint" : "smile");
      a.say(verdict==="perfect" ? "Отлично!" : verdict==="worse" ? "В следующий раз получится!" : "Хорошо!", 0);
      ov.querySelector(".av-ok").focus();
    })();
  });
}

window.Avatar = { create, grade };
})();
