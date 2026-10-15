begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
create temporary table point_test_results(message text);
create temporary table point_fixture(result jsonb);
grant select,insert on point_test_results,point_fixture to authenticated,anon;
insert into point_test_results select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('24000000-0000-0000-0000-000000000001','point-admin@example.test',now(),'{"full_name":"Admin"}'),
 ('24000000-0000-0000-0000-000000000002','point-owner@example.test',now(),'{"full_name":"Responsable"}'),
 ('24000000-0000-0000-0000-000000000003','point-worker@example.test',now(),'{"full_name":"Trabajador"}'),
 ('24000000-0000-0000-0000-000000000004','point-citizen@example.test',now(),'{"full_name":"Ciudadano"}');
insert into platform_admins values('24000000-0000-0000-0000-000000000001',now());
insert into companies(id,name) values('24000000-0000-0000-0000-000000000011','Institución existente de prueba');
insert into company_memberships(user_id,company_id,role,status) values
 ('24000000-0000-0000-0000-000000000002','24000000-0000-0000-0000-000000000011','company_owner','ACTIVE'),
 ('24000000-0000-0000-0000-000000000003','24000000-0000-0000-0000-000000000011','company_worker','ACTIVE');
insert into green_points(id,company_id,name,address,latitude,longitude,active)
 values('24000000-0000-0000-0000-000000000021','24000000-0000-0000-0000-000000000011','Punto existente de prueba','Calle 1',-34,-58,false);
create function pg_temp.point_payload(overrides jsonb default '{}') returns jsonb language sql as $$
 select jsonb_build_object('companyId','24000000-0000-0000-0000-000000000011','name','Punto de prueba',
  'address','Calle 1','latitude',-34,'longitude',-58,'timeZone','America/Argentina/Buenos_Aires',
  'active',false,'pickupEnabled',false,'categories',jsonb_build_array((select id from public.device_categories where slug='celulares' and active)),
  'schedules','[]'::jsonb) || overrides;
$$;
set local role anon;
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload())$$,'42501',null,'guests cannot create points');
reset role;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000004',true);
set local role authenticated;
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload())$$,'42501',null,'citizens cannot use admin creation');
insert into point_test_results select throws_ok($$select portal_command('save_point',pg_temp.point_payload())$$,'42501',null,'citizens cannot use legacy creation');
reset role;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000002',true);
set local role authenticated;
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload())$$,'42501',null,'owners cannot use admin creation');
insert into point_test_results select throws_ok($$select portal_command('save_point',pg_temp.point_payload())$$,'42501',null,'owners cannot create via the legacy command');
insert into point_test_results select lives_ok($$select portal_command('save_point',pg_temp.point_payload('{"id":"24000000-0000-0000-0000-000000000021","name":"Punto editado"}'))$$,'owners can maintain their existing points');
reset role;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000003',true);
set local role authenticated;
insert into point_test_results select throws_ok($$select portal_command('save_point',pg_temp.point_payload('{"id":"24000000-0000-0000-0000-000000000021"}'))$$,'42501',null,'workers cannot edit points');
reset role;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000001',true);
set local role authenticated;
insert into point_fixture select portal_command('admin_save_point',pg_temp.point_payload('{"companyId":"","companyName":"Nueva institución de prueba"}'));
insert into point_test_results select is((select count(*) from green_points where id=(select (result->>'id')::uuid from point_fixture)),1::bigint,'admin creates a point without an owner account');
insert into point_test_results select is((select name from companies where id=(select (result->>'companyId')::uuid from point_fixture)),'Nueva institución de prueba','admin creates the responsible institution');
insert into point_test_results select is((select count(*) from company_memberships where company_id=(select (result->>'companyId')::uuid from point_fixture)),0::bigint,'creation grants no account access');
insert into point_test_results select is((select count(*) from company_invitations where company_id=(select (result->>'companyId')::uuid from point_fixture)),0::bigint,'creation sends no invitations');
insert into point_test_results select lives_ok($$select portal_command('admin_save_point',pg_temp.point_payload())$$,'admin creates points for an existing institution');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload('{"companyId":"","companyName":"Invalid institution of test","categories":[]}'))$$,'22023',null,'invalid point creation fails');
insert into point_test_results select is((select count(*) from companies where name='Invalid institution of test'),0::bigint,'failed creation rolls back the institution');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload('{"companyId":"","companyName":""}'))$$,'22023',null,'institution name is required');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload('{"active":true}'))$$,'22023',null,'publication requires opening hours');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload(jsonb_build_object('id',(select result->>'id' from point_fixture))))$$,'42501',null,'point IDs must belong to the selected institution');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload('{"companyId":"24000000-0000-0000-0000-000000000099"}'))$$,'22023',null,'unknown institutions are rejected');
insert into point_test_results select throws_ok($$insert into green_points(company_id,name,address,latitude,longitude) values('24000000-0000-0000-0000-000000000011','Direct write','Calle 1',-34,-58)$$,'42501',null,'client roles cannot bypass the command');
insert into point_test_results select ok(exists(select 1 from audit_log where actor_id=auth.uid() and action='save_point' and target_id=(select (result->>'id')::uuid from point_fixture)),'point creation records the admin actor');
insert into point_test_results select ok(exists(select 1 from audit_log where actor_id=auth.uid() and action='create_point_organization' and company_id=(select (result->>'companyId')::uuid from point_fixture)),'institution creation is audited');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
insert into point_test_results select is((select count(*) from green_points where id=(select (result->>'id')::uuid from point_fixture)),0::bigint,'draft points stay off the public map');
reset role;
select set_config('request.jwt.claim.sub','24000000-0000-0000-0000-000000000001',true);
set local role authenticated;
insert into point_test_results select lives_ok($$select portal_command('admin_save_point',pg_temp.point_payload((select result from point_fixture)||'{"active":true,"schedules":[{"weekday":1,"opensMinute":540,"closesMinute":1080}]}'))$$,'admin can publish the new point');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
insert into point_test_results select is((select count(*) from green_points where id=(select (result->>'id')::uuid from point_fixture)),1::bigint,'published points are visible on the public map');
insert into point_test_results select is((select count(*) from green_point_schedules where green_point_id=(select (result->>'id')::uuid from point_fixture)),1::bigint,'public can read published opening hours');
reset role;
insert into point_test_results select * from finish();
select message from point_test_results;
rollback;
