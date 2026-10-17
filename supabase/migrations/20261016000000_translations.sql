-- Languages: French and Spanish.
-- Never applied to production as of 2026-10-16 (the table was missing there).

-- Languages: French and Spanish (run this section once)
-- Translations are made by the "translate" Edge Function (DeepL) the first
-- time any text is shown in French or Spanish, then reused for everyone.
-- Admins and editors can correct any translation from the Admin Console.
-- =====================================================================
create table if not exists public.translations (
  src_hash text not null,
  lang text not null check (lang in ('fr', 'es')),
  src text not null,
  out text not null,
  edited boolean not null default false,
  edited_by_email text,
  updated_at timestamptz not null default now(),
  primary key (src_hash, lang)
);
create index if not exists translations_updated_idx on public.translations (updated_at desc);
alter table public.translations enable row level security;
drop policy if exists "anyone reads translations" on public.translations;
drop policy if exists "editors update translations" on public.translations;
create policy "anyone reads translations" on public.translations for select using (true);
create policy "editors update translations" on public.translations for update using (public.is_editor()) with check (public.is_editor());
grant select on public.translations to anon, authenticated;
grant update on public.translations to authenticated;
drop trigger if exists translations_touch on public.translations;
create trigger translations_touch before update on public.translations for each row execute function public.touch_updated_at();
