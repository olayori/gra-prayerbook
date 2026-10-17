-- save_draft protects one person's two sessions from each other and survives a retried
-- save; any other write to the draft (publish) ends the exemption (final review #3, #5).
begin;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'a@test');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-0000000000e1', 'editor');
delete from public.lib_draft where book = 'jcfp';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- laptop (c1) and phone (c2), same editor
select is(public.save_draft('jcfp', '[1]', '[]', 0, null, '00000000-0000-0000-0000-0000000000c1')->>'conflict', 'false', 'laptop saves first');
select is(public.save_draft('jcfp', '[2]', '[]', 0, null, '00000000-0000-0000-0000-0000000000c2')->>'conflict', 'true', 'phone with a stale view gets a conflict, same user or not');
select is(public.get_draft('jcfp')->'data', '[1]'::jsonb, 'and nothing is overwritten');

-- a save whose response was lost is retried with the old expected time: still accepted
select is(public.save_draft('jcfp', '[3]', '[]', 0, null, '00000000-0000-0000-0000-0000000000c1')->>'conflict', 'false', 'the laptop''s retry is not a conflict with itself');
select is(public.get_draft('jcfp')->'data', '[3]'::jsonb, 'retry stored');

-- any other write (e.g. publishing) ends the exemption
reset role;
update public.lib_draft set data = '[4]' where book = 'jcfp';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(public.save_draft('jcfp', '[5]', '[]', 0, null, '00000000-0000-0000-0000-0000000000c1')->>'conflict', 'true', 'after a publish the laptop must reload');
select is(public.get_draft('jcfp')->'data', '[4]'::jsonb, 'published draft kept');

select is((select count(*) from pg_proc where proname = 'save_draft' and pronamespace = 'public'::regnamespace), 1::bigint, 'only the session-aware save_draft remains');

select * from finish();
rollback;
