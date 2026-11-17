# Дашины учебники

Личный учебный сайт: учебники по главам с открытием PDF на нужной странице, главная с днями до конца года и ОГЭ, оценки, доска для решений, ИИ-учитель и статистика.

Обычный статический сайт (HTML, CSS, JS без сборки). Хостинг: GitHub Pages. Вход, данные и файлы: Supabase. Пока Supabase не подключён, сайт работает и хранит всё в браузере.

## Настройка (один раз)

1. **Supabase.** Создать проект на supabase.com (регион Europe). В SQL Editor выполнить `supabase/schema.sql`.
2. В `js/config.js` вписать `SUPABASE_URL` и `SUPABASE_ANON_KEY` (Project Settings → API). Этот ключ публичный. Ключ `service_role` в код не вписывать.
3. Authentication → Sign In / Providers → Email: можно выключить «Confirm email», тогда вход сразу после регистрации.
4. **GitHub Pages.** Settings → Pages → Deploy from a branch → `main` / `(root)`.

## ИИ-учитель (по желанию)

Нужен ключ Anthropic API (console.anthropic.com). Ключ хранится только в секретах Supabase:

```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy tutor
```

Потом в `js/config.js` поставить `AI_ENABLED: true`. Модель по умолчанию `claude-opus-5-5`. Чтобы тратить меньше, задать секрет `TUTOR_MODEL=claude-haiku-5-5`.

## Где что

- `js/data.js`: учебники и главы, предметы для оценок, календарь (каникулы, ОГЭ), фразы.
- `js/store.js`: хранение (Supabase или браузер).
- `js/app.js`: все разделы сайта.
- `js/vendor/`: pdf.js, pdf-lib, supabase-js, лежат в репозитории, чтобы сайт не зависел от CDN.
