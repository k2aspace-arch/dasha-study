// ИИ-учитель через OpenRouter: принимает вопрос с сайта и спрашивает Claude.
// Версия функции: openrouter-2 (если в ответе ошибки нет слова OpenRouter, значит задеплоен старый код).
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
- Когда она решает задачу, сначала задай наводящий вопрос или дай подсказку. Полное решение давай, только если она прямо попросит.
- Когда проверяешь решение с картинки, назови, где ошибка, и почему, но не переписывай всё решение за неё.
- Пиши формулы обычным текстом (x^2, √, дроби через /), без LaTeX и без Markdown-таблиц.
- Если не уверена в факте или задаче, скажи об этом честно.
- Отвечай только на учебные вопросы; на остальное мягко возвращай к учёбе.`;

const BOOK_RULES = `
Работа по учебнику:
- В первом сообщении ученицы есть страницы учебника по текущей теме (текстом или картинками). Опирайся строго на них: используй те же термины, определения, обозначения, порядок изложения и примеры, что и учебник.
- Не вводи методы и формулы, которых нет в учебнике. Если нужного нет на этих страницах, честно скажи и предложи открыть нужную страницу.
- Ссылайся на учебник: «как на странице 12», «вспомни определение из пункта…».
- Если ученица отвечает на твой проверочный вопрос, оцени ответ. Верно: коротко похвали. Неверно: мягко покажи, где ошибка, объясни словами учебника и задай другой вопрос на ту же тему.`;

const MODES: Record<string, string> = {
  explain: `Сейчас: объясни тему с нуля своими словами, но строго по учебнику. Шаг за шагом: что это, зачем, главное определение или правило, один разобранный пример из учебника. 8–15 предложений. В конце задай один короткий проверочный вопрос.`,
  brief: `Сейчас: краткое повторение темы для того, кто её уже проходил. 4–6 пунктов: главные определения, формулы и типичные ошибки, как в учебнике. В конце один проверочный вопрос.`,
  selection: `Сейчас: ученица выделила фрагмент учебника (или прислала страницу) и задаёт вопрос о нём. Ответь именно про этот фрагмент, опираясь на учебник. В конце спроси, стало ли понятно.`,
  hint: `Сейчас: ученица решает задачу и просит подсказку. Дай ОДНУ небольшую подсказку, основанную строго на том, как материал подаётся в учебнике (какое определение, правило или пример из учебника поможет). Не решай задачу и не называй ответ. Если подсказку просят повторно, дай следующую, чуть более конкретную.`,
  check: `Сейчас: проверка решения из тетради (картинка). Действуй как учитель на консультации:
- Сначала найди, что сделано верно, и скажи об этом.
- Если есть ошибка, не исправляй её сам. Задай уточняющий вопрос, который поможет ученице самой заметить ошибку («почему здесь знак минус?», «какое правило из учебника ты применила?»).
- Подсказывай, как исправить, только опираясь на то, что она уже правильно поняла, и на учебник.
- Можешь задать 1–2 дополнительных вопроса по материалу, чтобы убедиться в понимании.
- Если всё верно, похвали и задай один дополнительный вопрос по теме.`,
  simpler1: `Сейчас: ученица нажала «Непонятно». Объясни то же самое заново, но проще: короткие предложения, без лишних терминов (термины учебника поясни простыми словами). В конце задай простой проверочный вопрос на ту же тему, но другой.`,
  simpler2: `Сейчас: ученица снова нажала «Непонятно». Объясни через пример из реальной жизни (деньги, покупки, спорт, дорога, кухня, телефон), а потом свяжи пример с правилом из учебника. В конце задай другой проверочный вопрос на ту же тему.`,
  simpler3: `Сейчас: ученица в третий раз нажала «Непонятно». Объясни совсем просто, как ребёнку: на конфетах, яблоках, игрушках или кубиках, очень маленькими шагами. Потом одним предложением свяжи с правилом из учебника. В конце задай самый простой проверочный вопрос на ту же тему.`,
  chat: ``,
  report: ``,
};

const REPORT = `Ты учитель Клод. Тебе дают данные об успехах ученицы 9 класса Даши (оценки по триместрам, контрольные, очки, серию занятий, прогресс по учебникам и подготовку к ОГЭ) в формате JSON.
Напиши короткое тёплое сообщение её папе от имени учителя (6–10 предложений, обычный текст без Markdown).
- Сначала искренне и конкретно похвали все достижения: пятёрки, рост оценок, серию занятий, решённые задания ОГЭ.
- Потом очень деликатно назови 1–2 вещи, которые можно улучшить, и предложи, как папа может мягко поддержать. Никакой критики и давления.
- Не выдумывай фактов, которых нет в данных. Если данных мало, так и скажи по-доброму.
- Закончи благодарностью за поддержку.`;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Нужен POST" }, 405);
  const key = findKey();
  if (!key) return json({ error: "На сервере нет ключа OpenRouter. Добавь секрет OPENROUTER_API_KEY в Supabase." }, 500);
  try {
    const body = await req.json();
    const { subject, messages, image, imageType, mode = "chat", pages, topic, selection, items, images } = body;
    let system = SYSTEM, maxTokens = 4000;
    let history: Msg[] = [];

    if (mode === "report") system = REPORT;
    else if (mode === "quiz") system = QUIZ;
    else if (mode === "quizcheck") system = QUIZCHECK;
    else {
      if (Array.isArray(pages) && pages.length) system += BOOK_RULES;
      if (MODES[mode]) system += "\n" + MODES[mode];
      if (subject) system += `\nПредмет: ${subject}.`;
    }

    if (mode === "quiz") {
      history = [{ role: "user", content: [...bookParts(pages ?? [], topic), { type: "text", text: `Темы главы (номера с 0): ${JSON.stringify(topic?.topics ?? [])}. Составь вопросы.` }] }];
      maxTokens = 6000;
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
