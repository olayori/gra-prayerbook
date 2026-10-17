-- Shelves, sections, banners, get_library and get_book (catalog Phase 1, Task 4).
begin;
select plan(11);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c6', 'editor@test');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-0000000000c6', 'editor');

insert into public.books (slug, template, config, title, access, status) values
  ('t-a', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Book A', 'free', 'published'),
  ('t-b', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Book B', 'free', 'draft');

-- A placement only these tests use, so seeded shelves don't interfere.
insert into public.sections (id, placement, kind, title, position, starts_at, ends_at, banner) values
  ('00000000-0000-0000-0000-00000000005a', 'store', 'shelf', 'S1', 2, null, null, '{}'),
  ('00000000-0000-0000-0000-00000000005b', 'store', 'banner', 'S2', 1, null, now() - interval '1 second', '{"title":"Ended"}'),
  ('00000000-0000-0000-0000-00000000005c', 'store', 'featured', 'S3', 3, now() + interval '1 day', null, '{}');
delete from public.sections where placement = 'store' and id not in
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-00000000005b', '00000000-0000-0000-0000-00000000005c');
insert into public.section_books (section_id, book_slug, position) values
  ('00000000-0000-0000-0000-00000000005a', 't-b', 1), ('00000000-0000-0000-0000-00000000005a', 't-a', 2);

-- Review focus 4: readers only get sections that are visible and in their date window.
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(jsonb_array_length(public.get_library('store')), 1, 'signed out: only the current, visible section');
select is(public.get_library('store')->0->>'title', 'S1', 'it is the shelf');
select is((select jsonb_agg(b->>'slug') from jsonb_array_elements(public.get_library('store')->0->'books') b), '["t-a"]'::jsonb, 'draft books are left off shelves');
select is(jsonb_array_length(public.get_library('store', true)), 1, 'readers cannot ask for hidden sections');
select ok(public.get_book('t-b') is null, 'signed out: a draft book is not found');
select is(public.get_book('t-a')->>'can_read', 'true', 'get_book says whether you can read it');
select is((select count(*) from public.sections where placement = 'store'), 1::bigint, 'sections table hides out-of-window rows too');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}', true);
select is(jsonb_array_length(public.get_library('store', true)), 3, 'editors preview hidden and dated sections');
select is((select jsonb_agg(s->>'title') from jsonb_array_elements(public.get_library('store', true)) s), '["S2","S1","S3"]'::jsonb, 'in position order');
select is((select jsonb_agg(s->'hidden') from jsonb_array_elements(public.get_library('store', true)) s), '[true,false,true]'::jsonb, 'hidden ones are marked');
select ok(public.get_book('t-b') is not null, 'editors see draft books');

select * from finish();
rollback;
