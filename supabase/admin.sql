-- Выполнить один раз (после schema.sql): Supabase → SQL Editor → New query → вставить → Run.
-- 1) Общие учебники для всех пользователей. 2) История изменений на 30 дней для восстановления.

-- ---------- 1. Общие учебники ----------
create table if not exists public.shared (
  key        text primary key,
  value      jsonb not null,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.shared enable row level security;
revoke all on table public.shared from anon;
grant select, insert, update, delete on table public.shared to authenticated;
drop policy if exists "shared: read"   on public.shared;
drop policy if exists "shared: insert" on public.shared;
drop policy if exists "shared: update" on public.shared;
drop policy if exists "shared: delete" on public.shared;
create policy "shared: read"   on public.shared for select to authenticated using (true);
create policy "shared: insert" on public.shared for insert to authenticated with check (owner = auth.uid() and key ~ '^(book|toc|idx)-');
create policy "shared: update" on public.shared for update to authenticated using (true) with check (owner = auth.uid() and key ~ '^(book|toc|idx)-');
create policy "shared: delete" on public.shared for delete to authenticated using (owner = auth.uid());

-- PDF общих учебников лежат в бакете files, в папке shared/. Читать могут все вошедшие, удалять — только загрузивший.
drop policy if exists "files: read shared"   on storage.objects;
drop policy if exists "files: insert shared" on storage.objects;
drop policy if exists "files: delete shared" on storage.objects;
create policy "files: read shared" on storage.objects for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'shared');
create policy "files: insert shared" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = 'shared');
create policy "files: delete shared" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'shared' and owner_id = auth.uid()::text);

-- ---------- 2. История изменений (резервная копия на 30 дней) ----------
create table if not exists public.docs_history (
  id         bigserial primary key,
  user_id    uuid not null,
  key        text not null,
  old_value  jsonb,              -- значение ДО изменения (null — ключа не было)
  op         text not null,      -- INSERT / UPDATE / DELETE
  changed_at timestamptz not null default now()
);
create index if not exists docs_history_user_time on public.docs_history (user_id, changed_at);
create index if not exists docs_history_user_key  on public.docs_history (user_id, key, changed_at);
alter table public.docs_history enable row level security;
revoke all on table public.docs_history from anon, authenticated;   -- читает только сервер (админка)

create or replace function public.docs_keep_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(new.user_id, old.user_id); k text := coalesce(new.key, old.key);
begin
  -- частые сохранения одного ключа пишутся не чаще раза в 10 минут; удаление и создание пишутся всегда
  if tg_op <> 'UPDATE' or not exists (
       select 1 from docs_history h where h.user_id = uid and h.key = k and h.changed_at > now() - interval '10 minutes') then
    insert into docs_history (user_id, key, old_value, op)
    values (uid, k, case when tg_op = 'INSERT' then null else old.value end, tg_op);
  end if;
  -- хранить 30 дней
  if random() < 0.02 then delete from docs_history where changed_at < now() - interval '30 days'; end if;
  return coalesce(new, old);
end $$;

drop trigger if exists docs_history_trg on public.docs;
create trigger docs_history_trg after insert or update or delete on public.docs
  for each row execute function public.docs_keep_history();
