// «Решаю сама»: в учебнике или сборнике обводишь задачу рамкой («✍ Выделить и решить»),
// она встаёт над черновиком, рядом учитель. Задачу учитель видит только вместе с вопросом или проверкой.
// Решённые задачи записываются: книга, страница, номер задания, итог проверки.
(function(){
const { $, esc } = window.App;
let pending = null, teach = null, swTimer = null;
const LOG = () => Object.assign({ list:[] }, Store.get("selfSolved", {}) || {});
const guessNum = t => { const m = String(t||"").match(/(?:№\s*(\d{1,3}))|^\s*(\d{1,3})\s*[.)]/); return m ? (m[1] || m[2]) : ""; };
const mmss = sec => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`; };
function record(o){ const L = LOG(); L.list = L.list.filter(x=>x.id!==o.id).concat([o]).slice(-300); Store.set("selfSolved", L, 0); }

window.addEventListener("reader:solve", e=>{ const d = e.detail; if(!d || !d.book) return;
  pending = Object.assign({ id:"s"+Date.now(), num: guessNum(d.text), t0: Date.now() }, d);
  // страница до начала нумерации (обложка, оглавление): пишем номер листа файла
  if(!(pending.bookPage > 0)) pending.bookPage = pending.page;
  if(window.Reader) Reader.minimize();
  if(location.hash === "#solve") render(); else location.hash = "#solve"; });

function leave(){ clearInterval(swTimer); if(teach){ teach.destroy(); teach = null; } }

// последние решённые: в разделе ОГЭ у сборника и на пустой странице «Решаю сама»
function listHtml(bookId, n){
  const L = LOG().list.filter(x=>!bookId || x.book===bookId).slice(-(n||10)).reverse(); if(!L.length) return "";
  const D = new Intl.DateTimeFormat("ru-RU",{ day:"numeric", month:"short" });
  return `<details class="panel plain ogehelp selflist"><summary class="sm">Решено самой · ${LOG().list.filter(x=>!bookId || x.book===bookId).length}</summary><div class="tablewrap"><table class="grades"><thead><tr><th>Когда</th>${bookId?"":"<th>Книга</th>"}<th>Стр.</th><th>№</th><th>Время</th><th>Итог</th></tr></thead><tbody>
    ${L.map(x=>`<tr><td>${D.format(new Date(x.ts))}</td>${bookId?"":`<td>${esc(x.title||"")}</td>`}<td>${x.page||"—"}</td><td>${esc(x.num||"—")}</td><td>${x.sec ? mmss(x.sec) : "—"}</td><td>${x.score ? `<span class="chip ${x.ok?"ok":"warn"}">${esc(x.score)} б.</span>` : x.checked ? `<span class="chip">проверено</span>` : `<span class="chip">решила</span>`}</td></tr>`).join("")}</tbody></table></div></details>`;
}

function render(){
  leave();
  const d = pending;
  if(!d){ $("main").innerHTML = `<div class="stack"><section class="panel"><h2>Решаю сама</h2><p class="hint" style="margin:6px 0 0">Открой учебник или сборник, нажми в нём «✍ Выделить и решить» и обведи задачу рамкой. Она встанет здесь над черновиком.</p></section>${listHtml(null, 20)}</div>`; return; }
  const b = d.book, exam = b.exam && window.Oge && Oge.EXAMS[b.exam] ? b.exam : "", ruled = exam==="rus" || /рус|литер/i.test(b.subject||"");
  const target = () => exam && Oge.TARGET[exam] ? (Oge.TARGET[exam][Number(d.num)] || 0) * 60 : 0;
  $("main").innerHTML = `<section class="panel oge-run solve"><div class="oge-top"><button class="btn" type="button" id="solveback">← Назад</button><b>Решаю сама · ${esc(b.title)}, стр. ${d.bookPage}</b>
      <label class="sm solvenum">Задание № <input id="solvenum" value="${esc(d.num)}" inputmode="numeric" autocomplete="off"></label><span class="timer sw" id="solvesw" role="timer"></span></div>
    <figure class="solvefrag"><img alt="Выделенная задача" src="data:image/jpeg;base64,${d.image}"><figcaption class="sm">Выделено в книге, стр. ${d.bookPage}. Учитель увидит задачу, когда задашь вопрос или попросишь проверить.
      <span class="btnrow" style="margin:6px 0 0"><button class="btn" type="button" id="solvepage">📖 Открыть страницу</button><button class="btn" type="button" id="solvemore">✍ Выделить другую</button><button class="btn primary" type="button" id="solvedone">✓ Решила</button></span><span class="sm" id="solvest" aria-live="polite"></span></figcaption></figure>
    <section id="solvenb"></section></section>`;
  const num = () => $("solvenum") ? $("solvenum").value.trim() : d.num;
  const tick = () => { const el = $("solvesw"); if(!el){ clearInterval(swTimer); return; } const sec = (Date.now() - d.t0)/1000, T = target();
    el.textContent = `⏱ ${mmss(sec)}${T ? " / " + mmss(T) : ""}`; el.classList.toggle("over", !!T && sec > T); };
  tick(); swTimer = setInterval(tick, 1000);
  $("solvenum").addEventListener("input", ()=>{ d.num = num(); tick(); });
  $("solveback").addEventListener("click", ()=>{ history.length > 1 ? history.back() : (location.hash = "#home"); });
  $("solvepage").addEventListener("click", ()=>Reader.open(b, d.bookPage, `стр. ${d.bookPage}`));
  $("solvemore").addEventListener("click", ()=>{ Reader.open(b, d.bookPage, ""); Reader.tool("solve"); });
  const save = (sc, checked) => { const sec = Math.round((Date.now() - d.t0)/1000), ok = sc ? sc[0] >= sc[1] : null;
    record({ id:d.id, ts:Date.now(), book:b.id, title:b.title, page:d.bookPage, num:num(), sec, score: sc ? `${sc[0]}/${sc[1]}` : (LOG().list.find(x=>x.id===d.id)||{}).score || null, ok: sc ? ok : (LOG().list.find(x=>x.id===d.id)||{}).ok ?? null, checked: checked || !!sc });
    // задание ОГЭ из сборника: время и итог идут в статистику задания
    const n = Number(num()); if(sc && exam && Oge.CAT[exam] && Oge.CAT[exam][n]){ Points.logOge(exam, n, ok, "s"); Oge.logTime(exam, n, sec, ok); }
    const st = $("solvest"); if(st) st.textContent = `Записано: стр. ${d.bookPage}${num() ? `, №${num()}` : ""}${sc ? `, баллы ${sc[0]} из ${sc[1]}` : ""}.`; };
  $("solvedone").addEventListener("click", ()=>save(null, false));
  teach = Study.Teacher.mount($("solvenb"), { subject: exam ? `${Oge.EXAMS[exam].name}, ОГЭ` : (b.subject || ""), mode: exam ? "oge" : "chat", ruled,
    nbBook: "solve-" + b.id, nbKey: `p${d.bookPage}-${d.id}`, title: `Черновик · стр. ${d.bookPage}${d.num ? `, №${d.num}` : ""}`, sub: "Задача сверху, решение здесь",
    fragment: () => d.image,
    context: () => `Ученица сама решает задачу из книги «${b.title}», страница ${d.bookPage}${num() ? `, задание №${num()}` : ""}. Распознанный текст задачи: ${d.text || "нет, смотри картинку"}.\nК её сообщению приложена картинка: сверху задача, выделенная в книге, ниже (если есть) её лист тетради. Не решай за неё: подсказывай и проверяй.${exam ? " Проверяя, поставь баллы по критериям ОГЭ: [[баллы: N/M]]." : ""}`,
    onReply: (tag, sc) => { if(/Проверка/.test(tag) || sc) save(sc, true); } });
}

window.Solve = { render, leave, listHtml };
})();
