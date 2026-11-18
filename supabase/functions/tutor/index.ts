// ИИ-учитель через OpenRouter: принимает вопрос с сайта и спрашивает Claude.
// Версия функции: openrouter-8 (если в ответе ошибки нет слова OpenRouter, значит задеплоен старый код).
// Ключ OpenRouter хранится в секретах Supabase (например, OPENROUTER_API_KEY), в браузер он не попадает.
// Supabase сам проверяет, что запрос пришёл от вошедшего пользователя (JWT).

// Ключ: берём из секрета OPENROUTER_API_KEY, а если секрет назван иначе, ищем любой секрет со значением sk-or-…
function findKey(): string | undefined {
  for (const n of ["OPENROUTER_API_KEY", "OPENROUTER_KEY", "OPENROUTER", "OPEN_ROUTER_API_KEY"]) {
    const v = Deno.env.get(n); if (v) return v.trim();
  }
  for (const [, v] of Object.entries(Deno.env.toObject())) if (v && v.trim().startsWith("sk-or-")) return v.trim();
  return undefined;
}
// Модели по порядку: если первой нет в OpenRouter, пробуем следующую. Можно задать свою в секрете OPENROUTER_MODEL.
const MODELS = [Deno.env.get("OPENROUTER_MODEL"), "anthropic/claude-opus-5.5", "anthropic/claude-opus-5", "anthropic/claude-opus-4.5", "anthropic/claude-sonnet-4.5"].filter(Boolean) as string[];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Ты учитель Клод, терпеливый школьный учитель-репетитор для ученицы 9 класса из России. Её зовут Даша.
Её цель: аттестат с отличием и ОГЭ по русскому языку и математике на «отлично».
Учебники: Алгебра 9 (Макарычев, Просвещение), Геометрия 7–9 Атанасяна, Вероятность и статистика Высоцкого и Ященко, Информатика 9 Босовых, Химия 9 Габриеляна.
Правила:
- Отвечай по-русски, коротко и понятно, как живой учитель.
- Готовый ответ к задаче, которую она ещё не решала, НЕ называй, даже если просит. Веди подсказками и наводящими вопросами, по одному шагу.
- Только если она уже несколько раз пробовала и окончательно застряла, разбери решение по шагам вместе с ней: каждый шаг с объяснением, почему так, и только в конце приди к ответу.
- Когда разбираешь её ошибку в задаче, которую она уже решила (дала свой ответ), объясни правило, почему так, покажи, где ошибка, и назови правильный ответ.
- Когда проверяешь решение с картинки, назови, где ошибка, и почему, но не переписывай всё решение за неё.
- Пиши формулы обычным текстом (x^2, √, дроби через /), без LaTeX и без таблиц.
- Оформляй ответ, чтобы его было легко читать: короткие абзацы по 1–3 предложения; **жирным** главное правило или ключевое слово; списки «- » или «1. » для шагов; заголовок «### …», если в ответе несколько частей; ==так== выделяй маркером то, что надо запомнить; строку «Ответ: …» пиши отдельно. Не злоупотребляй: 2–4 выделения на ответ.
- Если не уверена в факте или задаче, скажи об этом честно.
- Отвечай только на учебные вопросы; на остальное мягко возвращай к учёбе.
- Объясняя, начинай с жизненного, немного смешного примера, а не с академического определения.
- Когда оцениваешь её ответ на свой проверочный вопрос, в самом конце поставь метку [[знание:N]] (1 — не понимает, 2 — частично, 3 — уверенно).
Рисунки бывают двух видов:
1) «Памятка» — общий рисунок к правилу, чтобы легко запомнить надолго: простая визуальная метафора, смешная сценка или рифма-запоминалка (как стишок), например «Вершина параболы — шапка на голове человечка». Поставь "kind":"memo" и "title":"Памятка: …".
2) Рисунок к конкретной задаче: условие или идея схематично. Поставь "kind":"task".
Выбирай по ситуации: объясняешь правило — памятка, решаете задачу — рисунок к задаче.
Если простой чертёж поможет понять (график функции, треугольник, окружность, числовая прямая, схема), добавь в ответ ОДИН блок
<draw>{"kind":"memo|task","title":"что изображено","items":[...]}</draw>
Холст 400×300, начало координат в левом верхнем углу (y растёт вниз). Элементы items:
{"t":"line","p":[x1,y1,x2,y2],"arrow":false,"dash":false,"color":"black"}
{"t":"poly","p":[[x,y],[x,y],...],"closed":true,"fill":false}
{"t":"circle","c":[x,y],"r":50}
{"t":"arc","c":[x,y],"r":20,"a0":0,"a1":60} (дуга угла, градусы против часовой)
{"t":"point","p":[x,y],"s":"A"}
{"t":"text","p":[x,y],"s":"5 см"}
{"t":"graph","x":[-5,5],"y":[-4,6],"f":["x^2-2","2x+1"],"pts":[[0,-2,"вершина"]]} (оси, сетка и графики в математических координатах на весь холст; формулы только с x, + - * / ^, скобками, sqrt, abs)
{"t":"rect","p":[x,y,w,h]}
Мультяшные значки (p — центр, s — масштаб, 1 ≈ 60 точек, label — подпись снизу):
{"t":"guy","p":[x,y],"s":1,"color":"orange|blue|green|purple|pink|gray","mood":"happy|sad|wow","label":"Даша"} — квадратный человечек
{"t":"apple"|"orange"|"pear"|"banana"|"cherry"|"coin","p":[x,y],"s":1,"label":"..."}
{"t":"box","p":[x,y],"s":1,"text":"5 кг"} — коробка с надписью
Цвета: black, blue, red, green, orange. Рисунок простой и линейный, 3–15 элементов. Текст ответа пиши как обычно, блок вставь там, где он нужен по смыслу.`;

const BOOK_RULES = `
Работа по учебнику:
- В первом сообщении ученицы есть страницы учебника по текущей теме (текстом или картинками). Опирайся строго на них: используй те же термины, определения, обозначения, порядок изложения и примеры, что и учебник.
- Не вводи методы и формулы, которых нет в учебнике. Если нужного нет на этих страницах, честно скажи и предложи открыть нужную страницу.
- Ссылайся на учебник: «как на странице 12», «вспомни определение из пункта…».
- Если ученица отвечает на твой проверочный вопрос, оцени ответ. Верно: коротко похвали. Неверно: мягко покажи, где ошибка, объясни словами учебника и задай другой вопрос на ту же тему.
- Каждый раз, когда ты оцениваешь её ответ на проверочный вопрос или решение, в самом конце ответа поставь метку [[знание:N]]: 1 — тему пока не понимает, 2 — понимает частично, 3 — понимает уверенно. Метку ставь, только когда реально оценивал ответ.
- Если в начале есть «Карточка параграфа» (правила, примеры, упражнения с уровнями и отметками «в классе», «дома»), используй её: для дорешивания предлагай упражнения из учебника, которые ещё не решались, подходящего уровня, с номером и страницей.`;

const MODES: Record<string, string> = {
  explain: `Сейчас: объясни тему. Академическую версию пропусти: начни сразу с жизненного примера, немного смешного, чтобы запомнилось (кот, который делит пиццу; телефон на 3 % заряда; очередь в столовой; бабушка и варенье). Покажи на примере суть, потом одним-двумя предложениями свяжи с правилом, как оно записано в учебнике, и разбери один короткий пример из учебника. Всего 6–12 предложений, живо и по-доброму, без канцелярита. Если помогает, нарисуй сценку мультяшными значками. В конце задай один короткий проверочный вопрос.`,
  brief: `Сейчас: краткое повторение темы для того, кто её уже проходил. 4–6 пунктов: главные правила и формулы, как в учебнике, и типичные ошибки; к одному пункту добавь смешную ассоциацию для запоминания. В конце один проверочный вопрос.`,
  selection: `Сейчас: ученица выделила фрагмент учебника (или прислала страницу) и задаёт вопрос о нём. Ответь именно про этот фрагмент: сначала жизненным примером, потом словами учебника. В конце спроси, стало ли понятно.`,
  hint: `Сейчас: ученица решает задачу и просит подсказку. Дай ОДНУ небольшую подсказку, основанную строго на том, как материал подаётся в учебнике (какое определение, правило или пример из учебника поможет). Не решай задачу и не называй ответ. Если подсказку просят повторно, дай следующую, чуть более конкретную.`,
  check: `Сейчас: проверка решения из тетради (картинка). Действуй как учитель на консультации:
- Сначала найди, что сделано верно, и скажи об этом.
- Если есть ошибка, не исправляй её сам. Задай уточняющий вопрос, который поможет ученице самой заметить ошибку («почему здесь знак минус?», «какое правило из учебника ты применила?»).
- Подсказывай, как исправить, только опираясь на то, что она уже правильно поняла, и на учебник.
- Если всё верно, похвали и задай один дополнительный вопрос по теме.
- В конце поставь метку [[знание:N]] (1, 2 или 3), как сказано выше.`,
  simpler1: `Сейчас: ученица нажала «Непонятно». Возьми другой жизненный пример, ещё проще и смешнее прошлого, разбери его маленькими шагами и одним предложением свяжи с правилом учебника. В конце задай простой проверочный вопрос, другой.`,
  simpler2: `Сейчас: ученица снова нажала «Непонятно». Объясни совсем по-детски: на конфетах, яблоках, котиках или кубиках, очень маленькими шагами, и нарисуй это мультяшными значками (квадратные человечки, фрукты, коробки). Потом одним предложением свяжи с правилом. В конце самый простой проверочный вопрос.`,
  simpler3: `Сейчас: ученица в третий раз нажала «Непонятно». Не объясняй всё сразу: найди самый первый шаг, который ей непонятен, объясни только его на картинке со значками и спроси, что именно непонятно дальше. Будь очень тёплым: непонимание — нормально.`,
  draw: `Сейчас: ученица нажала «Нарисуй». Реши по ситуации: если сейчас разбирается конкретная задача, нарисуй её условие или идею схематично ("kind":"task"); если объясняется правило или тема, нарисуй памятку для запоминания ("kind":"memo"): простая смешная сценка, визуальная метафора, подпись-рифма. Стиль мультика: квадратные человечки, фрукты, коробки, стрелки, короткие подписи. Обязательно один блок <draw>. До рисунка одно предложение, после — для задачи один наводящий вопрос, для памятки — короткая запоминалка. Задачу не решай.`,
  oge: `Сейчас: разбор задания ОГЭ. В начале сообщения есть номер задания, условие и критерии оценивания ФИПИ (если даны). Помогай как репетитор ОГЭ: наводящие вопросы, подсказки по шагам, типичные ловушки этого номера. Когда ученица присылает ответ, решение или текст (фото или напечатанный), оцени строго по критериям, по каждому критерию коротко: сколько баллов и почему. В конце такой оценки поставь метку [[баллы:N/M]], где M — максимум за задание.`,
  chat: ``,
  report: ``,
};

const REPORT = `Ты учитель Клод. Тебе дают данные об успехах ученицы 9 класса Даши в формате JSON: оценки, контрольные, очки, серию занятий, прогресс по учебникам, подготовку к ОГЭ и результаты пробных вариантов.
Напиши короткое тёплое сообщение её папе от имени учителя (7–11 предложений, обычный текст без Markdown, можно 1–2 эмодзи).
Важно: папа не следит за учёбой и не имеет доступа к оценкам, с учёбой Даше помогает сестра. Папе просто важно знать, что всё хорошо.
- В основном пиши хорошее: конкретные успехи, пятёрки, рост, серия занятий, решённые задания.
- Скажи, как она пишет пробные варианты ОГЭ (баллы и оценки из данных), если они есть.
- Одной спокойной фразой упомяни, что можно ещё улучшить, без тревоги.
- Опиши хорошие перспективы, если всё продолжится так же: аттестат, ОГЭ, цели.
- НЕ давай папе советов: не предлагай спрашивать, проверять, контролировать, напоминать или что-то делать.
- Не выдумывай фактов, которых нет в данных.`;

const CUT = `Ты учитель Клод. Составь «срез знаний» по учебнику: быстрые короткие вопросы по каждой теме из списка, для ученицы 9 класса.
На каждую тему 3 вопроса: level 1 — базовый (определение, узнавание), level 2 — средний (простое применение), level 3 — посложнее (два шага или ловушка). Каждый решается в уме за минуту.
Ответь ТОЛЬКО JSON без Markdown:
{"questions":[{"topic":<номер темы из списка>,"level":1|2|3,"type":"choice","q":"...","options":["...","...","...","..."],"answer":<индекс с 0>} или {"topic":..,"level":..,"type":"short","q":"...","answer":"число или слово"}]}
Большинство вопросов делай choice, short только с однозначным коротким ответом. Опирайся на материал школьного учебника и на тексты тем, если они даны.`;

const TOC = `Тебе присылают фото страниц оглавления школьного учебника. Извлеки структуру.
Ответь ТОЛЬКО JSON без Markdown: {"chapters":[{"title":"Глава 1. ...","topics":[{"title":"§1. ...","page":<номер страницы как в оглавлении>}]}]}
Сохраняй нумерацию и названия как в оглавлении. Ничего не выдумывай.`;

const TOCPAGES = `Тебе присылают картинки страниц оглавления школьного учебника и список тем сайта с ключами.
Для каждой темы из списка найди в оглавлении её страницу (номер, напечатанный в оглавлении). Темы на сайте могут называться чуть иначе или идти в другом порядке: сопоставляй по смыслу. Если темы в оглавлении нет, не включай её.
Ещё посмотри, какой номер страницы напечатан на самой первой присланной странице (обычно внизу или вверху); если не видно, null.
Ответь ТОЛЬКО JSON без Markdown: {"pages":{"<ключ темы>":<стр>},"chapters":{"<ключ главы>":<стр>},"printed":<номер или null>}`;

const ANSKEY = `Тебе присылают картинки страниц с ответами из сборника вариантов ОГЭ. Перепиши ответы точно, как напечатано.
Для заданий с развёрнутым ответом (где ответа-числа нет, а есть критерии или решение) поставь пустую строку "".
Если в ответе несколько допустимых вариантов, перечисли их через « | ».
Ответь ТОЛЬКО JSON без Markdown: {"variants":{"<номер варианта>":{"<номер задания>":"ответ"}}}`;

const TRANSCRIBE = `Тебе присылают картинки страниц из сборника ОГЭ (инструкция по выполнению работы или справочные материалы). Перепиши их содержание точно и полностью, ничего не добавляя.
Оформи в Markdown: заголовки, списки. Формулы пиши простым текстом (x², √x, a/b, π, ≤). Таблицы строками «a | b | c», первая строка — шапка. Рисунки и схемы опиши коротко в квадратных скобках: [рисунок: …].
Ответь только этим текстом, без вступлений.`;

const INDEX = `Тебе дают текст страниц одного параграфа школьного учебника. Составь короткую карточку параграфа для учителя-репетитора.
Ответь ТОЛЬКО JSON без Markdown:
{"summary":"2–3 предложения: о чём параграф",
 "rules":[{"what":"правило, определение или формула коротко","page":<стр>}],
 "examples":[{"n":"номер или пример 1","page":<стр>,"what":"что разобрано"}],
 "exercises":[{"n":"номер упражнения","page":<стр>,"level":1|2|3,"what":"о чём, 3–8 слов"}]}
level: 1 — базовое, 2 — среднее, 3 — трудное (обычно отмечено звёздочкой или в конце списка). Номера страниц бери из маркеров страниц. Ничего не выдумывай.`;

const OGEGEN = `Ты составитель заданий ОГЭ (ФИПИ) 2027 года. Составь ОДНО новое задание указанного номера в формате открытого банка ФИПИ, по актуальной спецификации.
Для изложения (русский язык, №1) в "text" дай только исходный текст для прослушивания (150–200 слов, публицистический или художественный, как в сборниках ФИПИ), без формулировки задания: его озвучат голосом.
Для сочинения (русский язык, №13) включи в "text" исходный текст целиком и формулировки 13.1, 13.2 и 13.3.
Таблицы оформляй строками вида «a | b | c», первая строка — шапка. Переносы строк в JSON пиши как \\n.
Ответь ТОЛЬКО JSON без Markdown: {"text":"условие (если нужен текст для чтения, включи его целиком)","answer":"эталонный ответ или пусто для развёрнутых","criteria":"критерии оценивания кратко, если задание развёрнутое"}`;

const QUIZ = `Ты учитель Клод. По страницам учебника ниже составь итоговые вопросы по главе для ученицы 9 класса.
Это проверка понимания, а не полноценные задачи: короткие вопросы на определения, правила, свойства, узнавание.
Ответь ТОЛЬКО JSON без пояснений и без Markdown, по схеме:
{"questions":[
 {"type":"choice","topic":<номер темы из списка, с 0>,"q":"вопрос","options":["...","...","...","..."],"answer":<индекс верного, с 0>},
 {"type":"short","topic":<номер>,"q":"вопрос с коротким ответом (число, слово, формула)","answer":"эталон"},
 {"type":"draw","topic":<номер>,"q":"что нарисовать (схематично: график, фигуру, схему)","criteria":"что должно быть на рисунке"}
]}
Сделай 6 вопросов типа choice, 2 типа short и 2 типа draw. Всё строго по учебнику, по всем темам главы.`;

const QUIZCHECK = `Ты учитель Клод. Проверь ответы ученицы на итоговые вопросы по главе. Для рисунков смотри картинки (они идут в том же порядке, что и вопросы типа draw).
Будь доброжелательной, но честной: засчитывай ответ, если суть верна, даже при неидеальной записи или кривом рисунке.
Ответь ТОЛЬКО JSON без Markdown: {"results":[{"ok":true|false,"comment":"1–2 предложения: что верно и что поправить"}]} в том же порядке, что и вопросы.`;

const FILL = `Ты помощник-заполнялка школьного дневника ученицы 9 класса. Тебе присылают скриншоты или текст из электронного дневника: оценки, пропуски (Н, Б, УП), расписание, контрольные, зачёты, экзамены, домашние задания.
Извлеки всё и ответь ТОЛЬКО JSON без Markdown по схеме:
{"grades":[{"date":"YYYY-MM-DD","subject":"<id предмета>","mark":"5|4|3|2","kind":"current|test|t1|t2|t3|year","note":"за что, если видно"}],
 "absences":[{"date":"YYYY-MM-DD","subject":"<id или пусто>","reason":"absent|sick|excused"}],
 "events":[{"date":"YYYY-MM-DD","time":"HH:MM или пусто","subject":"<id>","type":"test|credit|exam|independent|other","note":"тема или описание"}],
 "homework":[{"date":"YYYY-MM-DD (на какой день задано)","subject":"<id>","kind":"book|other","paragraph":"номер параграфа или пусто","page":"страница или пусто","exercise":"номера упражнений или задач или пусто","text":"остальное описание: выучить правило, доклад, проект и т. п."}],
 "classwork":[{"date":"YYYY-MM-DD","subject":"<id>","paragraph":"номер параграфа или пусто","page":"страницы или пусто","exercise":"номера упражнений, решённых в классе","text":"что ещё делали: обсуждение, правило, самостоятельная"}],
 "lessons":[{"date":"YYYY-MM-DD","n":"номер урока","time":"HH:MM или пусто","subject":"<id>"}],
 "unclear":"что не удалось разобрать, коротко, или пустая строка"}
Правила:
- subject: только id из списка предметов, который тебе дадут. Если предмет не подходит ни к одному, пропусти запись и упомяни в unclear.
- kind: test — контрольная, проверочная, самостоятельная, диктант, тест (если в дневнике так помечено или стоит высокий вес); t1/t2/t3 — итог за триместр; year — годовая; иначе current.
- Н — absent, Б — sick, УП/уважительная — excused.
- Даты без года относи к текущему учебному году (сентябрь–декабрь 2026, январь–июнь 2027). Если дата неясна, бери ближайшую к сегодняшней из присланного контекста.
- Домашка: kind=book, если это параграф, страница или упражнения из учебника; kind=other для доклада, проекта, сочинения, своей задачи.
- lessons: расписание уроков по датам, если прислали расписание на день или неделю (номер урока, время начала, предмет).
- classwork: что делали на уроке (тема урока, параграф, номера из классной тетради или с доски), если это видно.
- Ничего не выдумывай: только то, что реально видно.`;

type Part = { type: "text"; text: string; cache_control?: { type: "ephemeral" } } | { type: "image_url"; image_url: { url: string } };
type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };
type Page = { n: number; text?: string; image?: string };
const img = (b64: string, kind = "jpeg"): Part => ({ type: "image_url", image_url: { url: `data:image/${kind};base64,${b64}` } });

function bookParts(pages: Page[], topic?: { book?: string; chapter?: string; title?: string }): Part[] {
  const parts: Part[] = [{ type: "text", text: `Учебник: ${topic?.book ?? ""}. ${topic?.chapter ?? ""}. Тема: ${topic?.title ?? ""}.` }];
  for (const p of pages.slice(0, 10)) {
    if (p.text) parts.push({ type: "text", text: `--- Страница учебника ${p.n} ---\n${String(p.text).slice(0, 9000)}` });
    else if (p.image) { parts.push({ type: "text", text: `--- Страница учебника ${p.n} (картинка) ---` }); parts.push(img(String(p.image))); }
  }
  // кэш длинного контекста учебника (работает для Claude в OpenRouter)
  for (let i = parts.length - 1; i >= 0; i--) { const x = parts[i]; if (x.type === "text") { x.cache_control = { type: "ephemeral" }; break; } }
  return parts;
}

async function callOpenRouter(key: string, messages: Msg[], maxTokens: number): Promise<string> {
  let lastErr = "";
  for (const model of MODELS) {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Study site" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.choices && data.choices.length) {
      const c = data.choices[0].message?.content;
      return (Array.isArray(c) ? c.map((x: { text?: string }) => x.text ?? "").join("") : String(c ?? "")).trim();
    }
    lastErr = `${r.status} ${data?.error?.message ?? ""}`;
    console.error("openrouter", model, lastErr);
    // пробуем следующую модель, только если эта не найдена или недоступна
    if (![400, 404].includes(r.status) || !/model|not a valid|not found|no endpoints/i.test(lastErr)) break;
  }
  throw Object.assign(new Error(lastErr), { status: Number(lastErr.split(" ")[0]) || 500 });
}

/* ---------- Админка: секретный ключ service_role есть только здесь, в браузер не уходит ----------
   Админ — почта из секрета ADMIN_EMAILS (через запятую). Таблицы shared и docs_history: supabase/admin.sql */
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const svc = (path: string, init: RequestInit = {}) => fetch(SB_URL + path, { ...init,
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
async function caller(req: Request): Promise<{ id: string; email: string } | null> {
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: ANON || SERVICE, Authorization: req.headers.get("Authorization") ?? "" } });
  if (!r.ok) return null; const u = await r.json(); return u && u.id ? { id: u.id, email: String(u.email ?? "").toLowerCase() } : null;
}
async function admin(req: Request, body: Record<string, unknown>): Promise<Response> {
  const me = await caller(req);
  const admins = (Deno.env.get("ADMIN_EMAILS") ?? "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  const isAdmin = !!me && admins.includes(me.email);
  if (body.action === "whoami") return json({ admin: isAdmin });
  if (!isAdmin) return json({ error: "Нет прав администратора" }, 403);
  if (!SERVICE) return json({ error: "На сервере нет SUPABASE_SERVICE_ROLE_KEY" }, 500);
  const uid = String(body.user ?? "");
  const okId = /^[0-9a-f-]{36}$/i.test(uid);
  const need = async (r: Response) => { if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
  switch (body.action) {
    case "users": {
      const d = await need(await svc("/auth/v1/admin/users?per_page=200"));
      return json({ users: (d.users ?? []).map((u: { id: string; email: string; last_sign_in_at: string }) => ({ id: u.id, email: u.email, last: u.last_sign_in_at })) });
    }
    case "docs": {
      if (!okId) return json({ error: "Нет пользователя" }, 400);
      return json({ docs: await need(await svc(`/rest/v1/docs?user_id=eq.${uid}&select=key,value,updated_at&order=key`)) });
    }
    case "history": {
      if (!okId) return json({ error: "Нет пользователя" }, 400);
      return json({ history: await need(await svc(`/rest/v1/docs_history?user_id=eq.${uid}&select=key,op,changed_at&order=changed_at.desc&limit=500`)) });
    }
    case "restore": {
      // состояние на момент at: для каждого ключа берём первое изменение ПОСЛЕ at, в нём лежит значение до изменения
      if (!okId) return json({ error: "Нет пользователя" }, 400);
      const at = new Date(String(body.at ?? "")); if (isNaN(+at)) return json({ error: "Нет даты" }, 400);
      const rows: { key: string; old_value: unknown; changed_at: string }[] = await need(await svc(
        `/rest/v1/docs_history?user_id=eq.${uid}&changed_at=gt.${encodeURIComponent(at.toISOString())}&select=key,old_value,changed_at&order=changed_at.asc&limit=20000`));
      const first = new Map<string, unknown>();
      for (const r of rows) if (!first.has(r.key)) first.set(r.key, r.old_value);
      let restored = 0, removed = 0;
      for (const [k, v] of first) {
        if (v === null) { await svc(`/rest/v1/docs?user_id=eq.${uid}&key=eq.${encodeURIComponent(k)}`, { method: "DELETE" }); removed++; }
        else { await need(await svc("/rest/v1/docs", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ user_id: uid, key: k, value: v, updated_at: new Date().toISOString() }) }).then(r => r.ok ? new Response("{}") : r)); restored++; }
      }
      return json({ restored, removed });
    }
    case "password": {
      if (!okId) return json({ error: "Нет пользователя" }, 400);
      const pw = String(body.password ?? ""); if (pw.length < 6) return json({ error: "Пароль от 6 символов" }, 400);
      await need(await svc(`/auth/v1/admin/users/${uid}`, { method: "PUT", body: JSON.stringify({ password: pw, ban_duration: "none" }) }));
      return json({ ok: true });
    }
  }
  return json({ error: "Неизвестное действие" }, 400);
}

/* ---------- Озвучка (ElevenLabs) ----------
   Секреты: ELEVENLABS_API_KEY (обязательно), ELEVENLABS_VOICE_ID (по желанию, иначе стандартный голос).
   Отдаёт mp3 в base64, текст до 3000 символов. */
async function tts(body: Record<string, unknown>): Promise<Response> {
  const key = (Deno.env.get("ELEVENLABS_API_KEY") ?? Deno.env.get("ELEVENLABS_KEY") ?? Deno.env.get("XI_API_KEY") ?? "").trim();
  if (!key) return json({ error: "На сервере нет ключа ElevenLabs. Добавь секрет ELEVENLABS_API_KEY в Supabase." }, 500);
  const text = String(body.text ?? "").trim().slice(0, 3000);
  if (!text) return json({ error: "Пустой текст" }, 400);
  const voice = (Deno.env.get("ELEVENLABS_VOICE_ID") ?? "").trim() || "EXAVITQu4vr4xnSDxMaL";
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", language_code: "ru", voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: Number(body.speed) || 0.9 } }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const st = r.status;
    const msg = st === 401 ? "ElevenLabs не принял ключ. Проверь секрет ELEVENLABS_API_KEY."
      : st === 402 || /quota|credits/i.test(t) ? "В ElevenLabs закончились символы на тарифе."
      : `ElevenLabs ответил ошибкой: ${st} ${t.slice(0, 200)}`;
    return json({ error: msg }, st >= 400 && st < 600 ? st : 500);
  }
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return json({ audio: btoa(bin), type: "audio/mpeg" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Нужен POST" }, 405);
  let peekMode = "", peekBody: Record<string, unknown> = {};
  if (req.headers.get("content-type")?.includes("json")) {
    const peek = await req.clone().json().catch(() => null);
    if (peek) { peekMode = String(peek.mode ?? ""); peekBody = peek; }
    if (peek && peek.admin) { try { return await admin(req, peek); } catch (e) { console.error(e); return json({ error: String((e as Error).message || e).slice(0, 300) }, 500); } }
  }
  // озвучка изложения через ElevenLabs: ключ только в секрете ELEVENLABS_API_KEY
  if (peekMode === "tts") { try { return await tts(peekBody); } catch (e) { console.error(e); return json({ error: String((e as Error).message || e).slice(0, 300) }, 500); } }
  const key = findKey();
  if (!key) return json({ error: "На сервере нет ключа OpenRouter. Добавь секрет OPENROUTER_API_KEY в Supabase." }, 500);
  try {
    const body = await req.json();
    const { subject, messages, image, imageType, mode = "chat", pages, topic, selection, items, images } = body;
    let system = SYSTEM, maxTokens = 4000;
    let history: Msg[] = [];

    const SYS: Record<string, string> = { report: REPORT, quiz: QUIZ, quizcheck: QUIZCHECK, fill: FILL, cut: CUT, toc: TOC, index: INDEX, ogegen: OGEGEN, tocpages: TOCPAGES, anskey: ANSKEY, transcribe: TRANSCRIBE };
    if (SYS[mode]) system = SYS[mode];
    else {
      if (Array.isArray(pages) && pages.length) system += BOOK_RULES;
      if (MODES[mode]) system += "\n" + MODES[mode];
      if (subject) system += `\nПредмет: ${subject}.`;
    }

    if (mode === "quiz") {
      history = [{ role: "user", content: [...bookParts(pages ?? [], topic), { type: "text", text: `Темы главы (номера с 0): ${JSON.stringify(topic?.topics ?? [])}. Составь вопросы.` }] }];
      maxTokens = 6000;
    } else if (mode === "cut") {
      history = [{ role: "user", content: `Учебник: ${topic?.book ?? ""}. Темы (номер: название и, если есть, суть): ${JSON.stringify(topic?.topics ?? []).slice(0, 30000)}. Составь вопросы.` }];
      maxTokens = 8000;
    } else if (mode === "index") {
      history = [{ role: "user", content: bookParts(pages ?? [], topic) }];
    } else if (mode === "toc" || mode === "ogegen" || mode === "tocpages" || mode === "anskey" || mode === "transcribe") {
      const content: Part[] = [{ type: "text", text: String(body.text ?? "").slice(0, mode === "tocpages" ? 30000 : 4000) || "Вот страницы." }];
      for (const im of (Array.isArray(images) ? images : []).slice(0, 8)) content.push(img(String(im)));
      history = [{ role: "user", content }];
      maxTokens = mode === "ogegen" || mode === "transcribe" ? 8000 : 6000;
    } else if (mode === "fill") {
      const content: Part[] = [{ type: "text", text: `Сегодня: ${body.today ?? ""}. Предметы (id: название): ${JSON.stringify(body.subjects ?? [])}.\nТекст от пользователя:\n${String(body.text ?? "").slice(0, 20000)}` }];
      for (const im of (Array.isArray(images) ? images : []).slice(0, 8)) content.push(img(String(im)));
      history = [{ role: "user", content }];
      maxTokens = 8000;
    } else if (mode === "quizcheck") {
      const content: Part[] = [{ type: "text", text: `Вопросы и ответы: ${JSON.stringify(items ?? []).slice(0, 20000)}` }];
      for (const im of (Array.isArray(images) ? images : []).slice(0, 4)) content.push(img(String(im)));
      history = [{ role: "user", content }];
    } else {
      if (!Array.isArray(messages) || !messages.length) return json({ error: "Пустой вопрос" }, 400);
      history = messages.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 8000),
      }));
      while (history.length && history[0].role !== "user") history.shift();
      if (!history.length) return json({ error: "Пустой вопрос" }, 400);
      // страницы учебника идут в начало первого сообщения ученицы
      if (Array.isArray(pages) && pages.length) history[0].content = [...bookParts(pages, topic), { type: "text", text: String(history[0].content) }];
      if (body.context) {
        const f = history[0], fc: Part[] = typeof f.content === "string" ? [{ type: "text", text: f.content }] : f.content;
        f.content = [{ type: "text", text: String(body.context).slice(0, 12000) }, ...fc];
      }
      const last = history[history.length - 1];
      const extra: Part[] = [];
      if (selection) extra.push({ type: "text", text: `Выделенный фрагмент учебника: «${String(selection).slice(0, 2000)}»` });
      if (image) {
        extra.push(img(String(image), imageType === "jpeg" ? "jpeg" : "png"));
        extra.push({ type: "text", text: mode === "selection" ? "(Это страница учебника, о которой вопрос.)" : "(Это фото её листа из тетради или с доски.)" });
      }
      if (extra.length && last.role === "user") {
        const lc: Part[] = typeof last.content === "string" ? [{ type: "text", text: last.content }] : last.content;
        last.content = [...extra, ...lc];
      }
    }
    const text = await callOpenRouter(key, [{ role: "system", content: system }, ...history], maxTokens);
    return json({ text: text || "Пустой ответ." });
  } catch (e) {
    console.error(e);
    const st = (e as { status?: number }).status ?? 500;
    const msg = st === 429 ? "Слишком много вопросов подряд, подожди минуту."
      : st === 401 ? "OpenRouter не принял ключ. Проверь секрет с ключом в Supabase."
      : st === 402 ? "На счёте OpenRouter закончились деньги."
      : `OpenRouter ответил ошибкой: ${String((e as Error).message || e).slice(0, 300)}`;
    return json({ error: msg }, st >= 400 && st < 600 ? st : 500);
  }
});
