-- Book config validation (catalog Phase 1, Task 1).
begin;
select plan(15);

-- The four starting configs are valid.
select ok(public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Part","show_titles":true},{"name":"Section","show_titles":true}],"content":["prayer","foundation"],"check_on":"item","numbering":"nested","actions_on":"level-2","schedule":"fixed","features":{"focus":true,"listen":true,"plans":true,"scripture":true,"verse_popups":true,"notes":true,"pen":true,"search":true,"share":true,"journal":true}}'), 'covenant config is valid');
select ok(public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Watch","show_titles":true},{"name":"Topic","show_titles":false}],"content":["prayer","names","embed"],"check_on":"item","numbering":"running","actions_on":"level-1","schedule":"fixed","features":{"focus":true,"listen":true,"plans":true,"scripture":true,"verse_popups":true,"notes":true,"pen":true,"search":true,"share":true,"journal":true}}'), 'jcfp config is valid');
select ok(public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Week","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"dated","features":{"focus":true,"listen":true,"share":true,"plans":false}}'), 'weekly config is valid');
select ok(public.catalog_config_valid('{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{"listen":true,"verse_popups":true,"notes":true,"pen":true,"search":true,"focus":false}}'), 'rooted config is valid');

-- Combinations that would look broken are rejected.
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Part","show_titles":true},{"name":"Section","show_titles":true}],"content":["prayer"],"check_on":"level-3","numbering":"nested","actions_on":"level-1","schedule":"fixed","features":{}}'), 'check_on a level that does not exist');
select ok(not public.catalog_config_valid('{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["reading"],"check_on":"item","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}'), 'check_on item without prayers');
select ok(not public.catalog_config_valid('{"reader":"reading","levels":[{"name":"Chapter","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{}}'), 'reading reader without reading content');
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Week","show_titles":true},{"name":"Day","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"dated","features":{}}'), 'dated book with two levels');
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"A","show_titles":true},{"name":"B","show_titles":true},{"name":"C","show_titles":true},{"name":"D","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"fixed","features":{}}'), 'four levels');
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"fixed","features":{}}'), 'empty level name');
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Part","show_titles":true}],"content":["prayer"],"check_on":"item","numbering":"nested","actions_on":"level-1","schedule":"fixed","features":{"teleport":true}}'), 'unknown feature');
select ok(not public.catalog_config_valid('{"reader":"prayer","levels":[{"name":"Lists","show_titles":true}],"content":["names"],"check_on":"none","numbering":"none","actions_on":"level-1","schedule":"fixed","features":{"listen":true}}'), 'listen with only name lists');
select ok(not public.catalog_config_valid('"not an object"'), 'malformed config returns false, not an error');
select ok(not public.catalog_config_valid('{}'), 'empty config');

-- Slugs are lower-case words joined by dashes.
select throws_ok($$insert into public.books (slug, template, config, title, access) values ('Bad Slug', 'x', '{}', 't', 'free')$$);

select * from finish();
rollback;
