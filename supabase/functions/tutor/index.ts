// ИИ-учитель: принимает вопрос с сайта и спрашивает Claude.
// Ключ хранится в секретах Supabase (ANTHROPIC_API_KEY), в браузер он не попадает.
// Supabase сам проверяет, что запрос пришёл от вошедшего пользователя (JWT).
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const MODEL = Deno.env.get("TUTOR_MODEL") ?? "claude-opus-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Ты терпеливый школьный учитель-репетитор для ученицы 9 класса из России.
Её цель: аттестат с отличием и ОГЭ по русскому языку и математике на «отлично».
Учебники: Алгебра 9 (Просвещение), Геометрия 7–9 Атанасяна, Вероятность и статистика Высоцкого и Ященко, Информатика 9 Босовых, Химия 9 Габриеляна.
Правила:
- Отвечай по-русски, коротко и понятно, как живой учитель.
- Когда она решает задачу, сначала задай наводящий вопрос или дай подсказку. Полное решение давай, только если она прямо попросит.
- Когда проверяешь решение с картинки доски, назови, где ошибка, и почему, но не переписывай всё решение за неё.
- Пиши формулы обычным текстом (x^2, √, дроби через /), без LaTeX и без Markdown-таблиц.
- Если не уверена в факте или задаче, скажи об этом честно.
- Отвечай только на учебные вопросы; на остальное мягко возвращай к учёбе.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Нужен POST" }, 405);
  try {
    const { subject, messages, image } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return json({ error: "Пустой вопрос" }, 400);
    const history: Anthropic.MessageParam[] = messages.slice(-16).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 8000),
    }));
    if (history[0].role !== "user") history.shift();
    const last = history[history.length - 1];
    if (image && last && last.role === "user") {
      last.content = [
        { type: "image", source: { type: "base64", media_type: "image/png", data: String(image) } },
        { type: "text", text: `(Это фото её листа с доски.) ${last.content}` },
      ];
    }
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM + (subject ? `\nСейчас она спрашивает по предмету: ${subject}.` : ""),
      messages: history,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (response.stop_reason === "refusal") return json({ text: "На этот вопрос я ответить не могу. Давай вернёмся к учёбе." });
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    return json({ text });
  } catch (e) {
    console.error(e);
    const status = e instanceof Anthropic.RateLimitError ? 429 : 500;
    return json({ error: status === 429 ? "Слишком много вопросов подряд, подожди минуту." : "Сервер ИИ сейчас не отвечает." }, status);
  }
});
