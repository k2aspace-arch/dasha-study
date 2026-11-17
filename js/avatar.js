// Учитель Клод: мультяшный персонаж. Ходит, думает, жмурится, улыбается,
// и ставит оценки красной ручкой.
(function(){
const SVG = `
<svg class="av-svg" viewBox="0 0 160 200" aria-hidden="true">
  <g class="av-body">
    <ellipse class="av-shadow" cx="80" cy="193" rx="50" ry="6"/>
    <g class="av-leg av-leg-l"><rect x="40" y="134" width="13" height="26" rx="2"/><rect x="92" y="134" width="13" height="26" rx="2"/></g>
    <g class="av-leg av-leg-r"><rect x="57" y="134" width="13" height="26" rx="2"/><rect x="109" y="134" width="13" height="26" rx="2"/></g>
    <g class="av-arm av-arm-l"><rect x="12" y="80" width="22" height="20" rx="2"/></g>
    <g class="av-torso">
      <rect class="av-blob" x="28" y="40" width="104" height="100" rx="8"/>
      <path class="av-pix" d="M30 60h100M30 80h100M30 100h100M30 120h100M48 42v96M68 42v96M88 42v96M108 42v96"/>
      <g class="av-spark"><path class="av-cap" d="M80 14l34 12-34 12-34-12z"/><path class="av-capb" d="M62 32v9q18 7 36 0v-9"/><path class="av-tassel" d="M114 26v14"/><circle class="av-tasselb" cx="114" cy="42" r="3"/></g>
      <g class="av-face">
        <g class="av-eyes">
          <g class="av-eye av-eye-l"><rect class="av-pupil" x="55" y="69" width="11" height="18" rx="2"/><rect class="av-glint" x="57" y="71" width="3" height="4"/></g>
          <g class="av-eye av-eye-r"><rect class="av-pupil" x="95" y="69" width="11" height="18" rx="2"/><rect class="av-glint" x="97" y="71" width="3" height="4"/></g>
          <path class="av-squint" d="M53 80q7-8 14 0M93 80q7-8 14 0"/>
        </g>
        <g class="av-glasses">
          <path class="av-temple" d="M44 74L28 69M117 74L132 69"/>
          <circle class="av-lens" cx="60.5" cy="78" r="16.5"/><circle class="av-lens" cx="100.5" cy="78.5" r="15"/>
          <path class="av-bridge" d="M76.8 75q4.2-7 8.8-.5"/>
          <rect class="av-tape" x="77" y="70" width="7" height="8" rx="1.5" transform="rotate(12 80.5 74)"/>
          <path class="av-shine" d="M50 71q4-7 11-8M91 72q3-5 9-6"/>
        </g>
        <path class="av-brows" d="M47 54q12-6 25 1M89 56q10-5 22 0"/>
        <rect class="av-cheek" x="42" y="98" width="10" height="6" rx="3"/><rect class="av-cheek" x="108" y="98" width="10" height="6" rx="3"/>
        <path class="av-mouth" d="M73 103q7 5 14 0"/>
        <path class="av-mouth-big" d="M70 99h20q-1 13-10 13t-10-13z"/>
        <rect class="av-mouth-o" x="76" y="101" width="8" height="8" rx="2"/>
      </g>
    </g>
    <g class="av-tie"><path d="M80 128l-13-7v14z M80 128l13-7v14z"/><circle cx="80" cy="128" r="3.5"/></g>
    <g class="av-arm av-arm-r"><rect x="126" y="80" width="22" height="20" rx="2"/>
      <g class="av-pen"><rect x="142" y="58" width="5" height="34" rx="2" transform="rotate(20 144 75)"/><path d="M148 88l-3 9-2-9z" transform="rotate(20 144 75)"/></g>
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
    let closed = false;
    const done = () => { if(closed) return; closed = true; window.removeEventListener("hashchange", done); a.destroy(); ov.remove(); resolve(); };
    ov.querySelector(".av-ok").addEventListener("click", done);
    window.addEventListener("hashchange", done);
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
