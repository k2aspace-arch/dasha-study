-- Выполнить один раз: Supabase → SQL Editor → New query → вставить → Run.

-- Документы пользователя: прогресс, оценки, страницы учебников, список листов доски.
create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.docs enable row level security;

-- Доступ к таблице через Data API только вошедшим пользователям (работает при любых настройках проекта).
revoke all on table public.docs from anon;
grant select, insert, update, delete on table public.docs to authenticated;

drop policy if exists "docs: own rows" on public.docs;
create policy "docs: own rows" on public.docs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Файлы: PDF учебников и картинки доски. Приватный бакет, лимит 50 МБ на файл.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "files: read own"   on storage.objects;
drop policy if exists "files: insert own" on storage.objects;
drop policy if exists "files: update own" on storage.objects;
drop policy if exists "files: delete own" on storage.objects;

create policy "files: read own" on storage.objects for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: update own" on storage.objects for update to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
