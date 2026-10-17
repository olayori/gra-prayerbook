-- Draft RPCs with server-side conflict check (admin Phase 2A, Task 1).
begin;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'a@test'),
  ('00000000-0000-0000-0000-0000000000d2', 'b@test'),
  ('00000000-0000-0000-0000-0000000000d3', 'reader@test');
insert into public.admins (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'editor'), ('00000000-0000-0000-0000-0000000000d2', 'editor');
delete from public.lib_draft where book = 'jcfp';
delete from public.book_draft;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select throws_ok($$select public.get_draft('jcfp')$$, null, 'not allowed', 'readers cannot read drafts');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select ok(public.get_draft('jcfp') is null, 'no draft yet');
select is(public.save_draft('jcfp', '[1]', '[]', 0, null)->>'conflict', 'false', 'A saves');
select is(public.get_draft('jcfp')->'data', '[1]'::jsonb, 'A''s draft is stored');
create temp table a_at as select (public.get_draft('jcfp')->>'updated_at')::timestamptz as at;
grant select on a_at to authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select is(public.save_draft('jcfp', '[2]', '[]', 0, null)->>'conflict', 'true', 'B with a stale view gets a conflict');
select is(public.get_draft('jcfp')->'data', '[1]'::jsonb, 'and nothing is overwritten');
select is(public.save_draft('jcfp', '[2]', '[]', 0, (select at from a_at))->>'conflict', 'false', 'B with the current view saves');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select is(public.save_draft('jcfp', '[3]', '[]', 0, '2000-01-01')->>'conflict', 'true', 'A is behind B now');
select is(public.save_draft('covenant', '[9]', (select jsonb_agg(jsonb_build_object('t', g)) from generate_series(1, 600) g), 0, null)->>'conflict', 'false', 'covenant draft saves');
select is(jsonb_array_length(public.get_draft('covenant')->'log'), 500, 'log trimmed to the last 500');
select is((select count(*) from public.book_draft where id = 1), 1::bigint, 'covenant draft row');

select * from finish();
rollback;
