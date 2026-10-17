-- Editions, live-site compatibility views and content RPCs (catalog Phase 1, Task 3).
begin;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'member@test'),
  ('00000000-0000-0000-0000-0000000000b6', 'editor@test');
insert into public.members (user_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-0000000000b6', 'editor');

-- The seed (Task 5) may already have these; tolerate either.
insert into public.books (slug, template, config, title, access, status) values
  ('covenant', 'prayer_manual', '{"reader":"prayer","levels":[{"name":"Part","show_titles":true},{"name":"Section","show_titles":true}],"content":["prayer","foundation"],"check_on":"item","numbering":"nested","actions_on":"level-2","schedule":"fixed","features":{}}', 'Book of Covenant Prayers', 'members', 'published'),
  ('jcfp', 'watch_manual', '{"reader":"prayer","levels":[{"name":"Watch","show_titles":true},{"name":"Topic","show_titles":false}],"content":["prayer","names","embed"],"check_on":"item","numbering":"running","actions_on":"level-1","schedule":"fixed","features":{}}', 'Jesus Chosen Fast and Prayer', 'free', 'published'),
  ('weekly', 'weekly_series', '{"reader":"prayer","levels":[{"name":"Week","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"dated","features":{}}', 'GRA Weekly Kingdom Prayers', 'free', 'published')
on conflict do nothing;
insert into public.book_editions (book_slug, version, data, note) values
  ('covenant', 0, '[]', 'Bundled edition'), ('jcfp', 0, '[]', 'Bundled edition')
on conflict do nothing;
insert into public.weekly_prayers (week_of, prayers, publish_at) values
  ('2026-10-12', '[{"text":"Past week prayer","ref":"Psalm 1:1"}]', now() - interval '1 day'),
  ('2099-01-05', '[{"text":"Future week prayer"}]', now() + interval '1 day');

-- Review focus 5: the live site sees no editions until one is really published.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*) from public.book_versions), 0::bigint, 'edition 0 is hidden from the old book_versions view');
select throws_ok($$select public.publish_edition('jcfp', 'n', '[]', '[]', '{}')$$, null, 'not allowed', 'members cannot publish');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b6","role":"authenticated"}', true);
select is(public.publish_book('first', '[1]', '[]', '{}'), 1, 'first real Covenant publish is version 1');
select is(public.publish_lib('jcfp', 'first', '[2]', '[]', '{}'), 1, 'first real JCFP publish is version 1');
select is((select base_version from public.book_draft where id = 1), 1, 'Covenant draft follows the publish');
select is((select base_version from public.lib_draft where book = 'jcfp'), 1, 'JCFP draft follows the publish');
select is(public.publish_edition('jcfp', 'second', '[3]', '[]', '{}'), 2, 'publish_edition numbers per book');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select max(version) from public.book_versions), 1, 'member sees the published Covenant edition');

set local role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*) from public.book_versions), 0::bigint, 'signed out: Covenant editions are private');
select is((select max(version) from public.lib_versions where book = 'jcfp'), 2, 'signed out: free JCFP editions are readable');
select throws_ok($$select public.get_edition('covenant')$$, '42501', 'locked', 'get_edition refuses a locked book');
select is(public.get_edition('jcfp')->>'version', '2', 'get_edition returns the newest edition');
select is(public.get_edition('jcfp')->'data', '[3]'::jsonb, 'get_edition returns its content');
select is(jsonb_array_length(public.get_entries('weekly')), 1, 'only published weeks are returned');
select is(public.get_entries('weekly')->0->>'entry_date', '2026-10-12', 'weeks come back as entries');

select * from finish();
rollback;
