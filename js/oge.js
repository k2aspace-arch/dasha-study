// Тренажёр ОГЭ: задания в формате ОГЭ-2025 по математике и русскому.
// Математика: задания генерируются заново каждый раз, ответ считается автоматически.
// Русский: подобранные банки заданий тестовой части с ответами.
(function(){
const { $, esc, pl } = window.App;

/* ---------- помощники ---------- */
const R = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const nz = (a,b) => { let x; do x = R(a,b); while(x===0); return x; };
const f = x => String(Math.round(x*1e6)/1e6).replace(".",",").replace("-","−");
const neg = x => x < 0 ? `(${f(x)})` : f(x);
const fr = (p,q) => `<span class="fr"><i>${p}</i><i>${q}</i></span>`;
const sup = (a,n) => `${a}<sup>${n}</sup>`;
// многочлен: [[коэф, "x²"], ...]
function poly(terms){
  let s = "";
  terms.forEach(([c,v])=>{ if(!c) return; const a = Math.abs(c), body = (a===1 && v ? "" : a) + v;
    s += s ? (c<0 ? " − " : " + ") + body : (c<0 ? "−" : "") + body; });
  return s || "0";
}
const TRIPLES = [[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[12,16,20],[20,21,29],[15,20,25]];

/* ---------- математика ---------- */
const MATH = {
6: { t:"Вычисления", part:1, gen(){
  const k = R(0,2);
  if(k===0){ const a = nz(-49,49)/10, b = nz(-49,49)/10, c = nz(-49,49)/10; return { q:`Найдите значение выражения ${f(a)} · ${neg(b)} + ${neg(c)}.`, a:a*b+c }; }
  if(k===1){ const a = nz(-29,29)/10, b = nz(-29,29)/10, c = nz(2,9)*(Math.random()<.5?1:-1)/10; return { q:`Найдите значение выражения (${f(a)} + ${neg(b)}) · ${neg(c)}.`, a:(a+b)*c }; }
  const Q = [2,4,5,8,10,20,25], q = pick(Q), s = pick(Q), p = R(1,q-1), r = R(1,s-1), t = pick([2,4,5,8,10,12,15,16,20,25]);
  return { q:`Найдите значение выражения (${fr(p,q)} + ${fr(r,s)}) · ${t}.`, a:(p/q + r/s)*t };
}},
8: { t:"Степени и корни", part:1, gen(){
  const k = R(0,2);
  if(k===0){ const a = pick([2,3,5]), top = a===2 ? 5 : a===3 ? 3 : 2, e = R(1,top), m = R(3,9), n = R(2,8), d = m+n-e;
    return { q:`Найдите значение выражения ${fr(sup(a,m)+" · "+sup(a,n), sup(a,d))}.`, a:Math.pow(a,e) }; }
  if(k===1){ const c = pick([2,3,5,6,7]), u = R(1,4), v = R(2,5);
    return { q:`Найдите значение выражения √${c*u*u} · √${c*v*v}.`, a:c*u*v }; }
  const NS = [2,3,5,6,7,10,11,13,15,17,19], a = pick(NS); let b; do b = pick(NS); while(b===a);
  return { q:`Найдите значение выражения (√${a} − √${b})(√${a} + √${b}).`, a:a-b };
}},
9: { t:"Уравнения", part:1, gen(){
  if(Math.random()<.5){ const x = nz(-9,9), a = nz(-9,9); let c; do c = nz(-9,9); while(c===a); const b = R(-15,15), d = a*x + b - c*x;
    return { q:`Найдите корень уравнения ${poly([[a,"x"],[b,""]])} = ${poly([[c,"x"],[d,""]])}.`, a:x }; }
  const r1 = R(-9,9); let r2; do r2 = R(-9,9); while(r2===r1); const big = Math.random()<.5;
  return { q:`Решите уравнение ${poly([[1,"x²"],[-(r1+r2),"x"],[r1*r2,""]])} = 0. Если уравнение имеет более одного корня, в ответ запишите ${big?"больший":"меньший"} из корней.`, a: big ? Math.max(r1,r2) : Math.min(r1,r2) };
}},
10: { t:"Вероятность", part:1, gen(){
  const k = R(0,2);
  if(k===0){ const N = pick([20,25,40,50]), a = R(2, Math.floor(N/3)), b = R(2, Math.floor(N/3)), c = N-a-b;
    return { q:`В фирме такси в наличии ${N} легковых автомобилей: ${a} из них чёрного цвета, ${b} жёлтого, остальные зелёные. На вызов выехала одна из машин, случайно оказавшаяся ближе всего к заказчику. Найдите вероятность того, что к нему приедет зелёное такси.`, a:c/N }; }
  if(k===1){ const N = pick([100,200,250,500,1000]), m = R(1,9);
    return { q:`В среднем из ${N} садовых насосов, поступивших в продажу, ${m} подтекают. Найдите вероятность того, что один случайно выбранный для контроля насос не подтекает.`, a:(N-m)/N }; }
  const N = pick([20,25,40,50]), m = R(2, N-3), subj = pick(["биологии","географии","истории","физике"]), topic = { "биологии":"грибы", "географии":"реки", "истории":"войны", "физике":"оптику" }[subj];
  return { q:`В сборнике билетов по ${subj} всего ${N} билетов, в ${m} из них встречается вопрос про ${topic}. Найдите вероятность того, что в случайно выбранном на экзамене билете школьнику ${Math.random()<.5?"достанется":"не достанется"} вопрос про ${topic}.`, a:null, m, N,
    fix(o){ o.a = o.q.includes("не достанется") ? (N-m)/N : m/N; } };
}},
12: { t:"Расчёты по формулам", part:1, gen(){
  const k = R(0,2);
  if(k===0){ const a = R(4,20), h = R(2,15), S = a*h/2;
    return { q:`Площадь треугольника можно вычислить по формуле S = ${fr("a·h","2")}, где a — сторона треугольника, h — высота, проведённая к этой стороне. Пользуясь этой формулой, найдите высоту h, если сторона a = ${a}, а площадь S = ${f(S)}.`, a:h }; }
  if(k===1){ const c = 5*R(-6,8); return { q:`Чтобы перевести значение температуры по шкале Цельсия в шкалу Фаренгейта, пользуются формулой t<sub>F</sub> = 1,8t<sub>C</sub> + 32, где t<sub>C</sub> — температура в градусах Цельсия, t<sub>F</sub> — температура в градусах Фаренгейта. Скольким градусам по шкале Фаренгейта соответствует ${f(c)} градусов по шкале Цельсия?`, a:1.8*c+32 }; }
  const I = R(2,9), Rr = R(2,15);
  return { q:`Мощность постоянного тока (в ваттах) вычисляется по формуле P = I²R, где I — сила тока (в амперах), R — сопротивление (в омах). Пользуясь этой формулой, найдите сопротивление R, если мощность составляет ${I*I*Rr} Вт, а сила тока равна ${I} А. Ответ дайте в омах.`, a:Rr };
}},
13: { t:"Неравенства", part:1, gen(){
  const x0 = nz(-9,9), a = nz(-9,9); let c; do c = nz(-9,9); while(c===a); const b = R(-12,12), d = b + (a-c)*x0, rel = pick(["≥",">","≤","<"]);
  const flip = { "≥":"≤", ">":"<", "≤":"≥", "<":">" }, sol = (a-c) > 0 ? rel : flip[rel];
  const iv = (r, v) => r===">" ? `(${f(v)}; +∞)` : r==="≥" ? `[${f(v)}; +∞)` : r==="<" ? `(−∞; ${f(v)})` : `(−∞; ${f(v)}]`;
  const right = iv(sol, x0), opts = shuffle([right, iv(flip[sol], x0), iv(sol, -x0), iv(flip[sol], -x0)]);
  return { q:`Укажите решение неравенства ${poly([[a,"x"],[b,""]])} ${rel} ${poly([[c,"x"],[d,""]])}.`, opts, a:String(opts.indexOf(right)+1), kind:"digits" };
}},
14: { t:"Прогрессии", part:1, gen(){
  const k = R(0,2);
  if(k===0){ const a1 = R(15,30), d = R(1,3), n = R(8,20);
    return { q:`В первом ряду кинозала ${a1} мест, а в каждом следующем ряду на ${d} ${pl(d,"место","места","мест").split(" ")[1]} больше, чем в предыдущем. Сколько мест в ряду с номером ${n}?`, a:a1+(n-1)*d }; }
  if(k===1){ const a1 = R(2,6), d = R(1,3), n = R(6,12);
    return { q:`Ученик решал задачи. В первый день он решил ${a1} ${pl(a1,"задачу","задачи","задач").split(" ")[1]}, а в каждый следующий день — на ${d} больше, чем в предыдущий. Сколько всего задач он решил за ${n} дней?`, a:n*(2*a1+(n-1)*d)/2 }; }
  const b = R(2,9)*10, s = R(3,6);
  return { q:`Колония бактерий каждые 20 минут увеличивается вдвое. Сначала в ней было ${b} бактерий. Сколько бактерий будет в колонии через ${s*20} минут?`, a:b*Math.pow(2,s) };
}},
15: { t:"Треугольники", part:1, gen(){
  const k = R(0,3);
  if(k===0){ const A = R(20,80), B = R(20, 150-A); return { q:`В треугольнике ABC угол A равен ${A}°, угол B равен ${B}°. Найдите угол C. Ответ дайте в градусах.`, a:180-A-B }; }
  if(k===1){ const [x,y,z] = pick(TRIPLES), m = R(1,3); return Math.random()<.5
    ? { q:`Катеты прямоугольного треугольника равны ${x*m} и ${y*m}. Найдите гипотенузу.`, a:z*m }
    : { q:`В прямоугольном треугольнике гипотенуза равна ${z*m}, а один из катетов равен ${x*m}. Найдите другой катет.`, a:y*m }; }
  if(k===2){ const c = 2*R(3,20); return { q:`В прямоугольном треугольнике гипотенуза равна ${c}. Найдите длину медианы, проведённой к гипотенузе.`, a:c/2 }; }
  const B = 2*R(15,70); return { q:`В равнобедренном треугольнике ABC с основанием AC угол B равен ${B}°. Найдите угол A. Ответ дайте в градусах.`, a:(180-B)/2 };
}},
16: { t:"Окружность", part:1, gen(){
  const k = R(0,3);
  if(k===0){ const a = 2*R(20,85); return { q:`Точка O — центр окружности, на которой лежат точки A, B и C. Центральный угол AOB равен ${a}°. Найдите вписанный угол ACB, опирающийся на дугу AB. Ответ дайте в градусах.`, a:a/2 }; }
  if(k===1){ const b = R(15,85); return { q:`Вписанный угол ACB окружности с центром O равен ${b}°. Найдите центральный угол AOB, опирающийся на ту же дугу. Ответ дайте в градусах.`, a:2*b }; }
  if(k===2){ const [x,y,z] = pick(TRIPLES), m = R(1,2); return { q:`К окружности с центром O проведена касательная AB (B — точка касания). Найдите длину отрезка AB, если радиус окружности равен ${x*m}, а AO = ${z*m}.`, a:y*m }; }
  const [x,y,z] = pick(TRIPLES); return { q:`Катеты прямоугольного треугольника равны ${x} и ${y}. Найдите радиус окружности, описанной около этого треугольника.`, a:z/2 };
}},
17: { t:"Четырёхугольники", part:1, gen(){
  const k = R(0,4);
  if(k===0){ let a; do a = R(30,150); while(a===90); return { q:`Один из углов параллелограмма равен ${a}°. Найдите больший угол этого параллелограмма. Ответ дайте в градусах.`, a:Math.max(a,180-a) }; }
  if(k===1){ const [x,y,z] = pick(TRIPLES); return { q:`Стороны прямоугольника равны ${x} и ${y}. Найдите его диагональ.`, a:z }; }
  if(k===2){ const a = R(3,12), b = a + R(2,10), h = R(2,10); return { q:`Основания трапеции равны ${a} и ${b}, а высота равна ${h}. Найдите площадь трапеции.`, a:(a+b)/2*h }; }
  if(k===3){ const d1 = R(4,20), d2 = R(4,20); return { q:`Диагонали ромба равны ${d1} и ${d2}. Найдите площадь ромба.`, a:d1*d2/2 }; }
  const d = R(2,12); return { q:`Диагональ квадрата равна ${d}. Найдите площадь квадрата.`, a:d*d/2 };
}},
18: { t:"Фигуры на клетчатой бумаге", part:1, gen(){
  const W = 10, H = 8, c = 24, b = R(3,8), h = R(2,6), x0 = R(0, W-b), y0 = R(h, H), tri = Math.random()<.6;
  let pts, area;
  if(tri){ const ax = R(0, W); pts = [[x0,y0],[x0+b,y0],[ax,y0-h]]; area = b*h/2; }
  else { const s = R(-2,2), sx = Math.min(Math.max(x0+s,0), W-b); pts = [[x0,y0],[x0+b,y0],[sx+b,y0-h],[sx,y0-h]]; area = b*h; }
  let grid = ""; for(let i=0;i<=W;i++) grid += `<line x1="${i*c}" y1="0" x2="${i*c}" y2="${H*c}"/>`; for(let j=0;j<=H;j++) grid += `<line x1="0" y1="${j*c}" x2="${W*c}" y2="${j*c}"/>`;
  const svg = `<svg class="ogegrid" viewBox="-2 -2 ${W*c+4} ${H*c+4}" role="img" aria-label="${tri?"Треугольник":"Параллелограмм"} на клетчатой бумаге"><g class="g">${grid}</g><polygon class="fig" points="${pts.map(([x,y])=>`${x*c},${y*c}`).join(" ")}"/></svg>`;
  return { q:`На клетчатой бумаге с размером клетки 1×1 изображён ${tri?"треугольник":"параллелограмм"}. Найдите его площадь.${svg}`, a:area };
}},
19: { t:"Верные утверждения", part:1, gen(){
  let s; do s = shuffle(STATEMENTS).slice(0,3); while(!s.some(x=>x[1]));
  return { q:`Какие из следующих утверждений верны?`, opts:s.map(x=>x[0]), a:s.map((x,i)=>x[1]?i+1:"").join(""), kind:"digits", note:"Запиши номера верных утверждений без пробелов и запятых." };
}},
20: { t:"Уравнения повышенной сложности", part:2, gen(){
  if(Math.random()<.5){ let b, k; do { b = nz(-7,7); k = R(2,5); } while(Math.abs(b)===k);
    return { q:`Решите уравнение ${poly([[1,"x³"],[b,"x²"],[-k*k,"x"],[-b*k*k,""]])} = 0. В ответ запишите сумму всех его корней.`, a:-b, note:"На экзамене здесь нужно полное решение. В тренажёре проверяется только ответ." }; }
  const u = R(1,4); let v; do v = R(2,6); while(v<=u);
  return { q:`Решите уравнение ${poly([[1,"x⁴"],[-(u*u+v*v),"x²"],[u*u*v*v,""]])} = 0. В ответ запишите наибольший корень.`, a:v, note:"На экзамене здесь нужно полное решение. В тренажёре проверяется только ответ." };
}},
21: { t:"Текстовые задачи", part:2, gen(){
  const k = R(0,2), note = "На экзамене здесь нужно полное решение. В тренажёре проверяется только ответ.";
  if(k===0){ const v = R(10,30), t1 = R(8,40), dt = R(10,60), L = v*dt;
    return { q:`Поезд, двигаясь равномерно, проезжает мимо придорожного столба за ${t1} секунд, а мимо лесополосы длиной ${L} метров — за ${t1+dt} секунд. Найдите длину поезда в метрах.`, a:v*t1, note }; }
  if(k===1){ const ok = []; for(let y=4;y<=40;y++) for(let a=2;a<=20;a++){ const x = y+a; if((x*y)%(x+y)===0) ok.push([y,a,x*y/(x+y)]); }
    const [y,a,T] = pick(ok);
    return { q:`Первая труба наполняет резервуар на ${a} минут дольше, чем вторая. Обе трубы, работая одновременно, наполняют этот резервуар за ${T} минут. За сколько минут наполняет этот резервуар одна вторая труба?`, a:y, note }; }
  const ok = []; for(let v=6;v<=25;v++) for(let c=1;c<=4;c++) for(let t=1;t<=4;t++){ const S = t*(v*v-c*c)/(2*c); if(v>c+2 && Number.isInteger(S) && S>=20 && S<=300) ok.push([v,c,t,S]); }
  const [v,c,t,S] = pick(ok);
  return { q:`Моторная лодка прошла против течения реки ${S} км и вернулась в пункт отправления, затратив на обратный путь на ${t} ${pl(t,"час","часа","часов").split(" ")[1]} меньше. Найдите скорость лодки в неподвижной воде, если скорость течения равна ${c} км/ч. Ответ дайте в км/ч.`, a:v, note };
}}
};
const STATEMENTS = [
  ["Вертикальные углы равны.",1],["Сумма углов любого треугольника равна 180 градусам.",1],["Диагонали прямоугольника равны.",1],
  ["Диагонали ромба перпендикулярны.",1],["Площадь квадрата равна квадрату его стороны.",1],
  ["Через любые три точки, не лежащие на одной прямой, проходит единственная окружность.",1],
  ["Касательная к окружности перпендикулярна радиусу, проведённому в точку касания.",1],
  ["Медиана равнобедренного треугольника, проведённая к основанию, является его высотой.",1],
  ["Средняя линия трапеции равна полусумме её оснований.",1],["Сумма острых углов прямоугольного треугольника равна 90 градусам.",1],
  ["Если два угла одного треугольника соответственно равны двум углам другого треугольника, то такие треугольники подобны.",1],
  ["Центр окружности, описанной около прямоугольного треугольника, лежит на середине гипотенузы.",1],
  ["В любой прямоугольник можно вписать окружность.",0],["Любой параллелограмм можно вписать в окружность.",0],
  ["Диагонали любого параллелограмма равны.",0],["Все углы ромба равны.",0],["Треугольник со сторонами 1, 2, 4 существует.",0],
  ["Смежные углы равны.",0],["Вписанный угол равен центральному углу, опирающемуся на ту же дугу.",0],
  ["Каждая из биссектрис равнобедренного треугольника является его медианой.",0],["Тангенс любого острого угла меньше единицы.",0],
  ["Площадь прямоугольного треугольника равна произведению длин его катетов.",0],
  ["Если диагонали параллелограмма равны, то этот параллелограмм является ромбом.",0]
];

/* ---------- русский язык ---------- */
const COMMA_Q = "Расставьте знаки препинания. Укажите цифры, на месте которых в предложении должны стоять запятые.";
const R3 = [
  ["Солнце скрылось за лесом (1) и (2) над рекой (3) медленно поднимался туман (4) похожий на дым.","14"],
  ["Когда мы вышли из дома (1) на улице уже (2) было темно (3) и холодно.","1"],
  ["Мальчик (1) не отрываясь (2) смотрел на море (3) которое (4) сверкало под солнцем.","123"],
  ["Конечно (1) мы (2) успеем на поезд (3) если выйдем (4) прямо сейчас.","13"],
  ["По дороге домой мы встретили (1) старого знакомого (2) который рассказал нам (3) что (4) в городе открылся новый музей.","23"],
  ["Дождь шёл всю ночь (1) но к утру (2) небо (3) наконец (4) прояснилось.","1"],
  ["Ребята (1) уставшие после долгого похода (2) сидели у костра (3) и (4) молча смотрели на огонь.","12"],
  ["Я знал (1) что (2) если не поторопиться (3) то можно опоздать (4) на последний автобус.","13"],
  ["Над озером (1) кружили чайки (2) и (3) их крики (4) разносились далеко вокруг.","2"],
  ["Бабушка (1) улыбаясь (2) поставила на стол пирог (3) и пригласила всех (4) к чаю.","12"],
  ["Лес (1) освещённый утренним солнцем (2) казался сказочным (3) и (4) таинственным.","12"],
  ["В саду росли яблони (1) груши (2) и вишни (3) а у забора (4) цвела сирень.","13"]
];
const R4 = [
  ["стеклянная ваза","согласование","управление",["ваза из стекла"]],
  ["деревянный стол","согласование","управление",["стол из дерева"]],
  ["морской воздух","согласование","управление",["воздух моря"]],
  ["весенний день","согласование","управление",["день весны"]],
  ["дом отца","управление","согласование",["отцовский дом"]],
  ["голос мамы","управление","согласование",["мамин голос"]],
  ["лапы медведя","управление","согласование",["медвежьи лапы"]],
  ["смотреть с удивлением","управление","примыкание",["смотреть удивлённо","удивлённо смотреть"]],
  ["работать с усердием","управление","примыкание",["работать усердно","усердно работать"]],
  ["отвечать уверенно","примыкание","управление",["отвечать с уверенностью","с уверенностью отвечать"]],
  ["радостно улыбнуться","примыкание","управление",["улыбнуться с радостью","с радостью улыбнуться"]],
  ["говорить спокойно","примыкание","управление",["говорить со спокойствием","со спокойствием говорить"]]
];
const R5 = [
  ["РАССТИЛАТЬ — в корне с чередованием пишется И, так как после корня стоит суффикс -А-.",1],
  ["ПРИЕХАТЬ — разделительный Ъ не пишется, потому что приставка оканчивается на гласную.",1],
  ["БЕСПОЛЕЗНЫЙ — на конце приставки пишется С, так как за ней следует глухой согласный.",1],
  ["ДЕРЕВЯННЫЙ — в суффиксе прилагательного пишется НН, так как это слово-исключение.",1],
  ["(ОНИ) БОРЮТСЯ — в окончании глагола I спряжения пишется буква Ю.",1],
  ["НЕДРУГ — НЕ пишется слитно, так как слово можно заменить синонимом без НЕ (враг).",1],
  ["ДЕВЧОНКА — в суффиксе существительного под ударением после шипящего пишется О.",1],
  ["ЗАГОРЕЛЫЙ — в корне с чередованием без ударения пишется О.",1],
  ["РАЗДАТЬ — на конце приставки пишется З, так как за ней следует звонкий согласный.",1],
  ["ЦЫПЛЁНОК — после Ц в корне пишется Ы, так как это слово-исключение.",1],
  ["ПРИБЕЖАТЬ — приставка ПРИ- имеет значение «очень».",0],
  ["КАМЫШОВЫЙ — в суффиксе прилагательного под ударением после шипящего пишется Ё.",0],
  ["ОТЫГРАТЬ — после приставки на согласный пишется Ы, так как это слово-исключение.",0],
  ["БЕСШУМНЫЙ — на конце приставки пишется С, так как за ней следует звонкий согласный.",0],
  ["ПОДЪЕЗД — Ъ пишется после приставки, оканчивающейся на гласную.",0],
  ["(ОНИ) ДЫШАТ — в окончании глагола I спряжения пишется А.",0],
  ["ТРАВЯНОЙ — в суффиксе прилагательного пишется одна Н, так как это слово-исключение.",0],
  ["ЗАГОРЕЛЫЙ — в корне с чередованием без ударения пишется А.",0]
];
const R7 = {
  "сравнение":["Листья, словно золотые монеты, падали на дорожку.","Озеро блестело, как зеркало.","Облака плыли по небу, будто белые корабли."],
  "метафора":["Над городом разлилось золото заката.","В саду горели костры рябины.","Её слова стали для всех ледяным душем."],
  "олицетворение":["Ветер шептал что-то старым деревьям.","Река дремала под луной.","Утро улыбнулось нам сквозь туман."],
  "гипербола":["Я тысячу раз говорил тебе об этом!","Я звонил тебе сто раз!","В тот вечер мы съели гору блинов."],
  "фразеологизм":["Он работал спустя рукава.","Мы бежали сломя голову.","Брат опять весь день бил баклуши."]
};
const R8 = [
  ["Мальчишка <b>выклянчил</b> у брата велосипед.","выклянчил",["выпросил"]],
  ["Он вечно <b>торчал</b> у окна.","торчал",["стоял","находился"]],
  ["Ребята <b>галдели</b> во дворе.","галдели",["шумели","кричали"]],
  ["Кот <b>дрыхнет</b> на диване.","дрыхнет",["спит"]],
  ["Девочка весь вечер <b>зубрила</b> стихотворение.","зубрила",["учила","заучивала"]],
  ["Она <b>напялила</b> старую куртку.","напялила",["надела"]],
  ["Малыш с аппетитом <b>уплетал</b> пирожки.","уплетал",["ел","съедал"]],
  ["Малыш тихо <b>хныкал</b> в углу.","хныкал",["плакал"]],
  ["Друзья <b>горланили</b> песни у костра.","горланили",["пели"]],
  ["Он <b>здорово</b> играет в шахматы.","здорово",["хорошо","отлично","прекрасно"]],
  ["Не <b>ври</b> мне, пожалуйста.","ври",["лги","обманывай"]],
  ["Мы <b>притащили</b> домой огромную ёлку.","притащили",["принесли"]]
];
const used = {};
const fromBank = (key, bank) => { const u = used[key] = used[key] || []; if(u.length >= bank.length) u.length = 0; let i; do i = R(0, bank.length-1); while(u.includes(i)); u.push(i); return bank[i]; };
const RUS = {
3: { t:"Пунктуационный анализ", part:1, gen(){ const [s,a] = fromBank("r3", R3); return { q:`${COMMA_Q}<blockquote>${s}</blockquote>`, a, kind:"digits", note:"Запиши цифры без пробелов и запятых." }; }},
4: { t:"Словосочетания", part:1, gen(){ const [w, from, to, acc] = fromBank("r4", R4);
  return { q:`Замените словосочетание «${w}», построенное на основе ${from==="согласование"?"согласования":from==="управление"?"управления":"примыкания"}, синонимичным словосочетанием со связью ${to}. Напишите получившееся словосочетание.`, a:acc[0], acc, kind:"text" }; }},
5: { t:"Орфографический анализ", part:1, gen(){ let s; do s = shuffle(R5).slice(0,5); while(!s.some(x=>x[1]) || new Set(s.map(x=>x[0].split(" ")[0])).size < 5);
  return { q:"Укажите варианты ответов, в которых дано верное объяснение написания выделенного слова.", opts:s.map(x=>x[0]), a:s.map((x,i)=>x[1]?i+1:"").join(""), kind:"digits", note:"Запиши номера верных вариантов без пробелов и запятых." }; }},
7: { t:"Средства выразительности", part:1, gen(){ const kinds = Object.keys(R7), want = pick(kinds), others = shuffle(kinds.filter(k=>k!==want)).slice(0,3);
  const right = pick(R7[want]), opts = shuffle([right].concat(others.map(k=>pick(R7[k]))));
  return { q:`В каком варианте ответа средством выразительности речи является <b>${want}</b>?`, opts, a:String(opts.indexOf(right)+1), kind:"digits", note:"Запиши номер ответа." }; }},
8: { t:"Лексический анализ", part:1, gen(){ const [s, w, acc] = fromBank("r8", R8);
  return { q:`Замените разговорное слово «${w}» в предложении стилистически нейтральным синонимом. Напишите этот синоним.<blockquote>${s}</blockquote>`, a:acc[0], acc, kind:"text" }; }}
};
const EXAMS = {
  math: { name:"Математика", tasks:MATH, test:{ min:80, title:"Пробный вариант: по одному заданию каждого типа" },
    missing:"Задания 1–5 (практические задачи с планом участка, шинами, тарифами), 7 (числовая прямая), 11 (графики) и 22–25 (график функции и геометрия с доказательством) пока не добавлены: их удобнее решать по сборнику ФИПИ и проверять у ИИ-учителя с доски." },
  rus:  { name:"Русский язык", tasks:RUS, test:{ min:25, title:"Пробный вариант тестовой части: по два задания каждого типа" },
    missing:"Изложение (задание 1), задания по тексту (2 и 6) и сочинение (9) пишутся развёрнуто: их можно написать на доске и отправить ИИ-учителю на проверку." }
};
const partOf = (exam, num) => exam==="rus" ? "rus" : (MATH[num].part===2 ? "math2" : "math1");

/* ---------- проверка ответа ---------- */
const norm = s => String(s).toLowerCase().replace(/ё/g,"е").replace(/[«»"'.!?]/g,"").replace(/\s+/g," ").trim();
function check(task, input){
  const v = String(input||"").trim(); if(!v) return false;
  if(task.kind==="digits") return v.replace(/\D/g,"").split("").sort().join("") === String(task.a).split("").sort().join("");
  if(task.kind==="text"){ const n = norm(v), sw = x => norm(x).split(" ").sort().join(" "); return task.acc.some(a => norm(a)===n || sw(a)===sw(v)); }
  const x = Number(v.replace(/\s/g,"").replace(",",".").replace(/[−–—]/g,"-"));
  return Number.isFinite(x) && Math.abs(x - task.a) < 1e-6;
}
const shown = t => t.kind ? String(t.a) : f(t.a);
function make(exam, num){ const t = EXAMS[exam].tasks[num].gen(); if(t.fix) t.fix(t); t.exam = exam; t.num = Number(num); return t; }

/* ---------- история результатов и оценка ---------- */
const markOf = p => p >= .9 ? 5 : p >= .7 ? 4 : p >= .5 ? 3 : 2;
function finish(key, ok, total, label){
  const res = Object.assign({}, Store.get("ogeRes", {})), prev = res[key] ? res[key][res[key].length-1] : null, pct = total ? ok/total : 0;
  res[key] = (res[key]||[]).concat([pct]).slice(-20); Store.set("ogeRes", res, 0);
  const verdict = pct===1 ? "perfect" : prev===null ? (pct>=.5 ? "better" : "worse") : pct > prev ? "better" : pct < prev ? "worse" : "same";
  const detail = `${esc(label)}: верно ${ok} из ${total}` + (prev!==null ? `. В прошлый раз было ${Math.round(prev*100)}%, сейчас ${Math.round(pct*100)}%.` : ".");
  return Avatar.grade({ mark: markOf(pct), verdict, detail });
}

/* ---------- экраны ---------- */
let session = null, timer = null;
function stats(){
  const O = Points.ogeLog().a, by = {};
  O.forEach(([, exam, num, ok])=>{ const k = exam+num; by[k] = by[k] || {n:0, ok:0}; by[k].n++; if(ok) by[k].ok++; });
  return by;
}
function renderMenu(){
  clearInterval(timer); session = null;
  const by = stats(), parts = { math1:0, math2:0, rus:0 };
  Points.ogeLog().a.forEach(([, exam, num, ok])=>{ if(ok && (exam==="rus" || MATH[num])) parts[partOf(exam, num)]++; });
  const block = (id) => { const E = EXAMS[id];
    return `<section class="panel oge-ex"><h3>${E.name}</h3>
      <button class="btn primary" type="button" data-test="${id}">${E.test.title}, ${E.test.min} минут</button>
      <div class="oge-types">${Object.entries(E.tasks).map(([n,t])=>{ const s = by[id+n] || {n:0,ok:0};
        return `<div class="ogetype"><span class="num">${n}</span><span class="nm">${esc(t.t)}${t.part===2?` <span class="chip">часть 2</span>`:""}</span><span class="sm">${s.ok} верно из ${s.n}</span><button class="btn" type="button" data-train="${id}:${n}">Тренировать</button></div>`; }).join("")}</div>
      <p class="hint">${E.missing}</p></section>`; };
  $("main").innerHTML = `<div class="stack">
    <section class="panel"><h2>ОГЭ</h2><p class="hint" style="margin:6px 0 12px">Пробный вариант идёт на время, ответы проверяются в конце. Тренировка даёт 10 заданий одного типа подряд и сразу показывает правильный ответ.</p>
      <div class="subjrows">
        ${[["Математика, часть 1","math1"],["Математика, часть 2","math2"],["Русский, тестовая часть","rus"]].map(([l,k])=>`<div class="subjrow" style="--c:var(--accent)"><span>${l}</span><div class="bar"><i style="width:${Math.min(100,Math.round(100*parts[k]/30))}%"></i></div><span>${parts[k]}/30</span></div>`).join("")}
      </div>
      <p class="hint">Цель на ноутбук: больше 30 верно решённых заданий в каждой части.</p>
      <p class="hint">Задания по математике составляются заново каждый раз по образцу заданий ОГЭ-2025, поэтому не повторяются. Задания по русскому собраны вручную в формате тестовой части ОГЭ-2025. Это не официальный банк ФИПИ: его не получилось загрузить, а ответы ФИПИ не публикует.</p>
    </section>
    ${block("math")}${block("rus")}</div>`;
  $("main").querySelectorAll("[data-train]").forEach(b=>b.addEventListener("click",()=>{ const [e,n] = b.dataset.train.split(":"); startTrain(e, Number(n)); }));
  $("main").querySelectorAll("[data-test]").forEach(b=>b.addEventListener("click",()=>startTest(b.dataset.test)));
}
function taskHtml(t, i, val){
  return `<div class="ogeq"><div class="oge-num">Задание ${t.num}${i!==undefined?` · №${i+1}`:""}</div><div class="oge-text">${t.q}</div>
    ${t.opts ? `<ol class="oge-opts">${t.opts.map(o=>`<li>${o}</li>`).join("")}</ol>` : ""}
    ${t.note ? `<p class="hint">${t.note}</p>` : ""}
    <label class="oge-ans"><span class="sm">Ответ</span><input type="text" inputmode="${t.kind==="text"?"text":"decimal"}" autocomplete="off" data-ans="${i===undefined?0:i}" value="${esc(val||"")}"></label></div>`;
}
function startTrain(exam, num){
  clearInterval(timer);
  session = { mode:"train", exam, num, n:0, ok:0, total:10, task: make(exam, num), answered:false };
  drawTrain();
}
function drawTrain(){
  const s = session, t = s.task, T = EXAMS[s.exam].tasks[s.num];
  $("main").innerHTML = `<section class="panel oge-run"><div class="oge-top"><a href="#oge" class="btn" id="ogeback">← Все задания</a><b>${EXAMS[s.exam].name}: ${esc(T.t)}</b><span class="sm">Задание ${s.n+1} из ${s.total} · верно ${s.ok}</span></div>
    <form id="ogeform">${taskHtml(t)}<div id="ogefb" aria-live="polite"></div>
    <div class="btnrow"><button class="btn primary" type="submit" id="ogego">Проверить</button><button class="btn" type="button" id="ogeend">Закончить серию</button></div></form></section>`;
  const inp = $("main").querySelector("[data-ans]"); inp.focus();
  $("ogeend").addEventListener("click", ()=>endTrain());
  $("ogeform").addEventListener("submit", e=>{ e.preventDefault();
    if(!s.answered){ if(!inp.value.trim()){ inp.focus(); return; }
      const ok = check(t, inp.value); s.answered = true; s.n++; if(ok) s.ok++; Points.logOge(s.exam, s.num, ok);
      $("ogefb").innerHTML = (ok ? `<p class="fb ok">Верно!</p>` : `<p class="fb bad">Неверно. Правильный ответ: <b>${esc(shown(t))}</b></p>`) + `<button class="btn" type="button" id="ogeteach">Разобрать с учителем</button>`;
      $("ogeteach").addEventListener("click", ()=>askTeacher(t, inp.value, ok));
      inp.readOnly = true; $("ogego").textContent = s.n >= s.total ? "Получить оценку" : "Следующее задание"; $("ogego").focus();
    } else if(s.n >= s.total) endTrain();
    else { s.task = make(s.exam, s.num); s.answered = false; drawTrain(); }
  });
}
async function endTrain(){
  const s = session; if(!s || !s.n){ renderMenu(); return; }
  session = null;
  await finish(`train:${s.exam}:${s.num}`, s.ok, s.n, `Тренировка, задание ${s.num}`);
  renderMenu();
}
function startTest(exam){
  clearInterval(timer);
  const E = EXAMS[exam], nums = Object.keys(E.tasks).map(Number), list = [];
  nums.forEach(n=>{ list.push(make(exam,n)); if(exam==="rus") list.push(make(exam,n)); });
  session = { mode:"test", exam, list, ans:list.map(()=>""), end: Date.now() + E.test.min*60e3 };
  $("main").innerHTML = `<section class="panel oge-run"><div class="oge-top"><b>${E.name}: пробный вариант</b><span class="timer" id="ogetimer" role="timer"></span><button class="btn" type="button" id="ogequit">Выйти без оценки</button></div>
    <form id="ogeform">${list.map((t,i)=>taskHtml(t,i)).join("")}<div class="btnrow"><button class="btn primary" type="submit">Завершить и проверить</button></div></form></section>`;
  const tick = () => { const left = Math.max(0, session.end - Date.now()), m = Math.floor(left/60e3), sec = Math.floor(left/1e3)%60;
    const el = $("ogetimer"); if(!el){ clearInterval(timer); return; }
    el.textContent = `Осталось ${m}:${String(sec).padStart(2,"0")}`; el.classList.toggle("low", left < 5*60e3);
    if(left <= 0){ clearInterval(timer); submitTest(true); } };
  tick(); timer = setInterval(tick, 1000);
  $("main").querySelectorAll("[data-ans]").forEach(inp=>inp.addEventListener("input",()=>session.ans[Number(inp.dataset.ans)] = inp.value));
  $("ogequit").addEventListener("click", ()=>{ clearInterval(timer); session = null; renderMenu(); });
  $("ogeform").addEventListener("submit", e=>{ e.preventDefault(); const empty = session.ans.filter(a=>!a.trim()).length;
    if(empty && !confirmInline(empty)) return; submitTest(false); });
}
let confirmArmed = false;
function confirmInline(empty){
  if(confirmArmed) return true;
  confirmArmed = true; const btn = $("ogeform").querySelector("[type=submit]");
  btn.textContent = `Без ответа ${pl(empty,"задание","задания","заданий")}. Нажми ещё раз, чтобы сдать`;
  setTimeout(()=>{ confirmArmed = false; if(btn.isConnected) btn.textContent = "Завершить и проверить"; }, 5000);
  return false;
}
async function submitTest(timeout){
  clearInterval(timer); confirmArmed = false;
  const s = session; if(!s) return; session = null;
  const res = s.list.map((t,i)=>({ t, v:s.ans[i], ok: check(t, s.ans[i]) }));
  res.forEach(r=>{ if(r.v.trim()) Points.logOge(s.exam, r.t.num, r.ok); });
  const ok = res.filter(r=>r.ok).length;
  const tl = Object.assign({list:[]}, Store.get("ogeTests", {})); tl.list = tl.list.concat([{ ts:Date.now(), exam:s.exam, ok, n:res.length }]); Store.set("ogeTests", tl, 0);
  $("main").innerHTML = `<section class="panel oge-run"><div class="oge-top"><a href="#oge" class="btn" id="ogeback">← К заданиям</a><b>${EXAMS[s.exam].name}: верно ${ok} из ${res.length}${timeout?" · время вышло":""}</b></div>
    <div class="tablewrap"><table class="grades ogeres"><thead><tr><th>№</th><th>Задание</th><th>Твой ответ</th><th>Правильный</th><th></th></tr></thead><tbody>
    ${res.map((r,i)=>`<tr><td>${i+1}</td><td>${r.t.num}. ${esc(EXAMS[s.exam].tasks[r.t.num].t)}</td><td>${esc(r.v||"—")}</td><td>${esc(shown(r.t))}</td><td>${r.ok?`<span class="chip ok">верно</span>`:`<span class="chip warn">ошибка</span>`}</td></tr>`).join("")}
    </tbody></table></div>
    <details class="pages-ed"><summary>Посмотреть задания с ошибками</summary>${res.filter(r=>!r.ok).map(r=>taskHtml(r.t, undefined, r.v)).join("") || "<p>Ошибок нет!</p>"}</details></section>`;
  $("main").querySelectorAll("details [data-ans]").forEach(i=>i.readOnly = true);
  await finish(`test:${s.exam}`, ok, res.length, `Пробный вариант, ${EXAMS[s.exam].name.toLowerCase()}`);
}

function askTeacher(t, given, ok){
  const plain = h => { const d = document.createElement("div"); d.innerHTML = h.replace(/<span class="fr"><i>(.*?)<\/i><i>(.*?)<\/i><\/span>/g,"($1)/($2)").replace(/<sup>(.*?)<\/sup>/g,"^$1").replace(/<svg[\s\S]*?<\/svg>/g," [рисунок на клетчатой бумаге] "); return d.textContent.replace(/\s+/g," ").trim(); };
  const txt = `Задание ${t.num} ОГЭ (${t.exam==="math"?"математика":"русский язык"}): ${plain(t.q)}${t.opts?" Варианты: "+t.opts.map((o,i)=>`${i+1}) ${plain(o)}`).join(" "):""}\nМой ответ: ${given||"—"}. ${ok?"Ответ верный, но я хочу понять, как решать такие задания.":"Ответ неверный. Помоги понять, где ошибка, но не решай за меня: сначала задай наводящий вопрос."}`;
  try{ sessionStorage.setItem("dasha:tutorq", txt); sessionStorage.setItem("dasha:tutorsubj", t.exam==="math" ? "algebra" : "rus"); }catch(e){}
  location.hash = "#tutor";
}
window.Oge = { render: renderMenu, make, check, EXAMS, leave(){ clearInterval(timer); session = null; } };
})();
