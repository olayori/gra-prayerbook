-- Seeded catalog: templates, the four books, edition 0, starting shelves (catalog Phase 1, Task 5).
begin;
select plan(12);

select results_eq($$select slug, access from public.books order by slug$$,
  $$values ('covenant', 'members'), ('jcfp', 'free'), ('rooted', 'free'), ('weekly', 'free')$$, 'the four books and their access');
select is((select count(*) from public.books where status = 'published'), 4::bigint, 'all four are published');
select results_eq($$select key from public.book_templates order by key$$,
  $$values ('devotional'), ('prayer_manual'), ('watch_manual'), ('weekly_series')$$, 'the four templates');
select ok((select bool_and(public.catalog_config_valid(config)) from public.books), 'every book config is valid');
select ok((select bool_and(t.config = b.config) from public.book_templates t join public.books b on b.template = t.key), 'each template matches its book');

set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.get_edition('jcfp')->>'version', '0', 'JCFP bundled edition is readable');
select ok(jsonb_array_length(public.get_edition('jcfp')->'data') = 4, 'JCFP has its four parts');
select throws_ok($$select public.get_edition('covenant')$$, '42501', 'locked', 'Covenant is members-only');
select is((select count(*) from public.book_versions), 0::bigint, 'edition 0 stays out of the old views');
select is(jsonb_array_length(public.get_library('home')), 5, 'five home sections');
select is((select jsonb_agg(b->>'slug') from jsonb_array_elements(public.get_library('home')->3->'books') b), '["covenant","jcfp","weekly"]'::jsonb, 'My Prayer Library shelf');
select is(jsonb_array_length(public.get_library('store')), 2, 'two store shelves');

select * from finish();
rollback;
