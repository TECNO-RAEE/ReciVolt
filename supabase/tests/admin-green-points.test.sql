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
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload('{"companyId":"","companyName":"Rollback invalid policy org","intakePolicies":[{"deviceCategoryId":"bad-uuid","mode":"onsite"}]}'))$$,'22023',null,'invalid intakePolicies fails atomic save');
insert into point_test_results select is((select count(*) from companies where name='Rollback invalid policy org'),0::bigint,'invalid intakePolicies rolls back new institution creation');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload(('{"companyId":"","companyName":"Rollback unaccepted org","categories":[],"intakePolicies":[{"deviceCategoryId":"' || (select id from public.device_categories where slug='celulares' and active) || '","mode":"not_accepted"}]}')::jsonb))$$,'22023',null,'all not_accepted intakePolicies fails atomic save');
insert into point_test_results select is((select count(*) from companies where name='Rollback unaccepted org'),0::bigint,'unaccepted-only intakePolicies rolls back new institution creation');
insert into point_test_results select throws_ok($$select portal_command('admin_save_point',pg_temp.point_payload(('{"companyId":"","companyName":"Rollback incomplete confirm org","intakeConfirmed":true,"intakePolicies":[{"deviceCategoryId":"' || (select id from public.device_categories where slug='celulares' and active) || '","mode":"onsite"}]}')::jsonb))$$,'22023',null,'incomplete intakeConfirmed fails atomic save');
insert into point_test_results select is((select count(*) from companies where name='Rollback incomplete confirm org'),0::bigint,'incomplete intakeConfirmed rolls back new institution creation');
insert into point_test_results select lives_ok($$select portal_command('admin_save_point',pg_temp.point_payload(jsonb_build_object('name','Punto solo retiro','categories','[]'::jsonb,'pickupEnabled',false,'intakeConfirmed',false,'intakePolicies',jsonb_build_array(jsonb_build_object('deviceCategoryId',(select id from public.device_categories where slug='celulares' and active),'mode','pickup')))))$$,'pickup-only point save succeeds atomically without onsite categories');
insert into point_test_results select is((select pickup_enabled from green_points where name='Punto solo retiro'),true,'pickup-only point forces pickup_enabled to true');
insert into point_test_results select is((select count(*) from green_point_device_categories where green_point_id=(select id from green_points where name='Punto solo retiro')),0::bigint,'pickup-only point has no QR onsite categories');
insert into point_test_results select is((select mode from green_point_device_policies where green_point_id=(select id from green_points where name='Punto solo retiro') and device_category_id=(select id from public.device_categories where slug='celulares' and active)),'pickup','pickup-only point saves pickup policy atomically');
insert into point_test_results select ok(exists(select 1 from audit_log where actor_id=auth.uid() and action='point_device_policy_saved' and target_id=(select id from green_points where name='Punto solo retiro')),'atomic point save records point_device_policy_saved audit entry');
insert into point_test_results select lives_ok($$select portal_command('admin_save_point',pg_temp.point_payload(jsonb_build_object('name','Punto confirmado','intakeConfirmed',true,'intakePolicies',(select jsonb_agg(jsonb_build_object('deviceCategoryId',id,'mode',case when slug='celulares' then 'onsite' else 'not_accepted' end)) from public.device_categories where active))))$$,'atomic save persists complete confirmed intake policy');
insert into point_test_results select is((select intake_confirmed from green_points where name='Punto confirmado'),true,'intake_confirmed persists as true after atomic save');
insert into point_test_results select is((select count(*) from green_point_device_categories where green_point_id=(select id from green_points where name='Punto confirmado')),1::bigint,'atomic save syncs onsite categories from intakePolicies');
insert into point_test_results select is((select count(*) from green_point_device_policies where green_point_id=(select id from green_points where name='Punto confirmado')),(select count(*) from public.device_categories where active),'atomic save stores all policy entries');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
insert into point_test_results select is((select count(*) from green_points where id=(select (result->>'id')::uuid from point_fixture)),1::bigint,'published points are visible on the public map');
insert into point_test_results select is((select count(*) from green_point_schedules where green_point_id=(select (result->>'id')::uuid from point_fixture)),1::bigint,'public can read published opening hours');
reset role;
insert into point_test_results select * from finish();
select message from point_test_results;
rollback;
