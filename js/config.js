// Настройки подключения. Заполняются после создания проекта Supabase.
// Ключ anon/publishable публичный: его можно хранить в коде сайта.
// Секретный ключ service_role и ключ OpenRouter сюда НИКОГДА не вписывать: ключ живёт в секретах Supabase.
window.APP_CONFIG = {
  SUPABASE_URL: "https://gpfvnomozesbvynyamcc.supabase.co",       // например "https://abcd1234.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnZub21vemVzYnZ5bnlhbWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MzY1MzksImV4cCI6MjExMDUxMjUzOX0.uY0arihTcyK_9y_Xk83cG5cZcOUUDE4VkCJs2XO73oc",  // Project Settings → API → anon / publishable key
  AI_ENABLED: true,                         // ИИ-учитель включён
  TUTOR_FUNCTION: "tutor-for-dasha-study"   // имя функции в Supabase → Edge Functions
};
