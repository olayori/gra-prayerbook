-- Access: entitlements, can_read, free-book sync (catalog Phase 1, Task 2).
begin;
select plan(18);

-- Test accounts.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'member@test'),
  ('00000000-0000-0000-0000-0000000000a2', 'stranger@test'),
  ('00000000-0000-0000-0000-0000000000a3', 'buyer@test'),
  ('00000000-0000-0000-0000-0000000000a4', 'expired@test'),
  ('00000000-0000-0000-0000-0000000000a5', 'revoked@test'),
  ('00000000-0000-0000-0000-0000000000a6', 'editor@test');
insert into public.members (user_id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-0000000000a6', 'editor');

insert into public.books (slug, template, config, title, access, status) values
  ('t-free', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Free', 'free', 'published'),
  ('t-mem', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Members', 'members', 'published'),
  ('t-paid', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Paid', 'paid', 'published'),
  ('t-draft', 'devotional', '{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}', 'Draft', 'free', 'draft');

insert into public.entitlements (user_id, scope, source, expires_at, revoked_at) values
  ('00000000-0000-0000-0000-0000000000a3', 'book:t-paid', 'grant', null, null),
  ('00000000-0000-0000-0000-0000000000a4', 'book:t-paid', 'apple', now() - interval '1 second', null),
  ('00000000-0000-0000-0000-0000000000a5', 'all', 'stripe', null, now());

-- Signed out.
set local role anon;
select set_config('request.jwt.claims', '', true);
select ok(public.can_read('t-free'), 'anyone can read a free book');
select ok(not public.can_read('t-mem'), 'signed out: no members book');
select ok(not public.can_read('t-paid'), 'signed out: no paid book');
select ok(not public.can_read('t-draft'), 'signed out: no draft book');
select ok(not public.can_read('nope'), 'unknown book');

-- Member.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select ok(public.can_read('t-mem'), 'member reads a members book');
select ok(not public.can_read('t-paid'), 'member does not read a paid book');

-- Stranger (signed in, not a member).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select ok(not public.can_read('t-mem'), 'non-member: no members book');
select lives_ok($$insert into public.library_state (user_id, book, data) values (auth.uid(), 'jcfp', '{}')$$, 'non-member can sync a free book');
select throws_ok($$insert into public.book_state (user_id, data) values (auth.uid(), '{}')$$, '42501', null, 'non-member cannot sync Covenant');
select is((select count(*) from public.entitlements), 0::bigint, 'users only see their own entitlements');

-- Buyer, expired, revoked.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select ok(public.can_read('t-paid'), 'active entitlement reads the paid book');
select ok(not public.can_read('t-mem'), 'a book entitlement does not grant members books');
select is((select count(*) from public.entitlements), 1::bigint, 'buyer sees their entitlement');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select ok(not public.can_read('t-paid'), 'expired entitlement gives no access');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select ok(not public.can_read('t-paid'), 'revoked entitlement gives no access');

-- Editor.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select ok(public.can_read('t-draft'), 'editors read drafts');
select throws_ok($$insert into public.entitlements (user_id, scope, source) values (auth.uid(), 'all', 'grant')$$, '42501', null, 'no one grants entitlements from the client');

select * from finish();
rollback;
