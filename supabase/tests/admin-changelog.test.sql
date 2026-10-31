begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
create temporary table changelog_results(result text);
grant all on changelog_results to anon,authenticated;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('21000000-0000-0000-0000-000000000001','changelog-admin@example.test',now(),'{"full_name":"Admin historial"}'),
 ('21000000-0000-0000-0000-000000000002','changelog-citizen@example.test',now(),'{"full_name":"Ciudadano"}');
insert into platform_admins(user_id) values('21000000-0000-0000-0000-000000000001');
insert into companies(id,name) values('21000000-0000-0000-0000-000000000003','Empresa historial');
insert into company_applications(id,applicant_id,business_name,legal_name,tax_id,corporate_email,phone,responsible,address,activity,document_path)
values('21000000-0000-0000-0000-000000000004','21000000-0000-0000-0000-000000000002','Solicitud historial','Historial SA','20987654321','changelog-citizen@example.test','123','Ciudadano','Calle 1','Reciclaje','21000000-0000-0000-0000-000000000002/proof.pdf');
insert into company_limit_requests(id,company_id,requested_by,requested_limit,reason) values('21000000-0000-0000-0000-000000000005','21000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000002',99,'Más trabajadores para la empresa.');

set local role anon;
insert into changelog_results select throws_ok($$select admin_changelog()$$,'42501',null,'guest cannot read changelog');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000002',true);
insert into changelog_results select throws_ok($$select admin_changelog()$$,'42501',null,'citizen cannot read changelog');
insert into changelog_results select throws_ok($$select admin_document_access('21000000-0000-0000-0000-000000000002/proof.pdf')$$,'42501',null,'citizen cannot forge admin document activity');
insert into changelog_results select throws_ok($$insert into audit_log(actor_id,action) values(auth.uid(),'save_level')$$,'42501',null,'client cannot forge changelog rows');
insert into changelog_results select throws_ok($$update audit_log set details='{}'$$,'42501',null,'client cannot rewrite history');
insert into changelog_results select throws_ok($$delete from audit_log$$,'42501',null,'client cannot erase history');
select set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);
insert into changelog_results select lives_ok($$select portal_command('set_company_status','{"id":"21000000-0000-0000-0000-000000000003","status":"SUSPENDED","note":"Pausa por revisión"}')$$,'company status audited');
insert into changelog_results select is((select details->'before'->0->>'status' from audit_log where actor_id=auth.uid() and action='set_company_status'),'ACTIVE','old company state retained');
insert into changelog_results select is((select details->'after'->0->>'status' from audit_log where actor_id=auth.uid() and action='set_company_status'),'SUSPENDED','new company state retained');
insert into changelog_results select lives_ok($$select portal_command('review_application','{"id":"21000000-0000-0000-0000-000000000004","status":"NEEDS_INFO","note":"Completar documentación"}')$$,'application review audited');
insert into changelog_results select is((select details->'after'->0->>'status' from audit_log where actor_id=auth.uid() and action='review_application'),'NEEDS_INFO','application decision retained');
insert into changelog_results select lives_ok($$select portal_command('review_limit','{"id":"21000000-0000-0000-0000-000000000005","status":"APPROVED","note":"Cupos aprobados"}')$$,'limit approval audited');
insert into changelog_results select is((select details->'after'->0->>'worker_limit' from audit_log where actor_id=auth.uid() and action='review_limit'),'99','updated worker cap retained');
insert into changelog_results select throws_ok($$select portal_command('save_global_xp','{}')$$,'22023','Esta configuración ya no está disponible.','retired configuration is rejected');
insert into changelog_results select is((select count(*) from audit_log where actor_id=auth.uid() and action='save_global_xp'),0::bigint,'rejected configuration creates no audit mutation');
insert into changelog_results select throws_ok($$select portal_command('save_level','{"name":"Nivel historial","minimumXp":987654}')$$,'22023','Esta configuración ya no está disponible.','retired level creation is rejected');
-- Historical records remain readable even though new level commands are retired.
reset role;
insert into audit_log(actor_id,action,details) values('21000000-0000-0000-0000-000000000001','save_level','{"actor":{"name":"Admin historial","email":"changelog-admin@example.test","role":"platform_admin"},"before":[],"after":[{"id":"legacy-level","name":"Nivel historial","minimum_xp":987654}]}');
set local role authenticated;
insert into changelog_results select is((select details->'before' from audit_log where actor_id=auth.uid() and action='save_level'),'[]'::jsonb,'historical level retains its original snapshot');
insert into changelog_results select is((select details->'after'->0->>'name' from audit_log where actor_id=auth.uid() and action='save_level'),'Nivel historial','historical level name retained');
insert into changelog_results select lives_ok($$select admin_document_access('21000000-0000-0000-0000-000000000002/proof.pdf')$$,'private document consultation audited');
insert into changelog_results select throws_ok($$select admin_document_access('missing.pdf')$$,'22023',null,'unknown document cannot fabricate access event');
insert into changelog_results select throws_ok($$select portal_command('save_level','{"name":"Invalid","minimumXp":-1}')$$,'22023',null,'retired command remains rejected');
insert into changelog_results select is((select count(*) from audit_log where actor_id=auth.uid() and action='save_level'),1::bigint,'failed command leaves no successful change record');
update profiles set full_name='Nombre cambiado' where id=auth.uid();
insert into changelog_results select is((select details->'actor'->>'name' from audit_log where actor_id=auth.uid() and action='save_level'),'Admin historial','historical author survives profile renaming');
insert into changelog_results select ok(jsonb_array_length(admin_changelog(0,'changelog-admin@example.test',true))>=5,'history searches captured email');
insert into changelog_results select throws_ok($$select admin_changelog(-1)$$,'22023',null,'negative pagination rejected');
reset role;
insert into audit_log(actor_id,action,details) select '21000000-0000-0000-0000-000000000001','save_level',jsonb_build_object('note','pagination-proof') from generate_series(1,30);
set local role authenticated;
insert into changelog_results select is(jsonb_array_length(admin_changelog(0,'pagination-proof',true)),26,'pagination fetches one extra to detect next page');
insert into changelog_results select is(jsonb_array_length(admin_changelog(25,'pagination-proof',true)),5,'next page retains remaining rows');
insert into changelog_results select ok(jsonb_array_length(admin_changelog(0,'',true,'21000000-0000-0000-0000-000000000003'::uuid))>=2,'institution filter returns that company history');
insert into changelog_results select is((select count(*) from jsonb_array_elements(admin_changelog(0,'',true,'21000000-0000-0000-0000-000000000003'::uuid)) e where (e->>'company_id') is distinct from '21000000-0000-0000-0000-000000000003'),0::bigint,'institution filter excludes other companies');
insert into changelog_results select is((select count(*) from jsonb_array_elements(admin_changelog(0,'',true,null,array['review_limit'])) e where e->>'action'<>'review_limit'),0::bigint,'action filter keeps only the requested types');
insert into changelog_results select ok(jsonb_array_length(admin_changelog(0,'',true,null,array['review_limit']))>=1,'action filter finds limit reviews');
insert into changelog_results select is(jsonb_array_length(admin_changelog(0,'pagination-proof',true,null,array['review_limit'])),0,'filters combine with the search text');
insert into changelog_results select throws_ok($$select admin_changelog(0,'',true,null,array_fill('x'::text,array[51]))$$,'22023',null,'oversized action filter rejected');
reset role;
do $$ begin
 if exists(select 1 from changelog_results where result like 'not ok%') then
  raise exception 'Changelog regression: %',(select string_agg(result,E'\n') from changelog_results where result like 'not ok%');
 end if;
end $$;
select result from changelog_results;
select * from finish();
rollback;
