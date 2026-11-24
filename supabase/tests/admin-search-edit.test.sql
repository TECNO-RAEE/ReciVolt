begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
create temporary table admin_test_results(message text);
grant select,insert on admin_test_results to anon,authenticated;
insert into admin_test_results select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('34000000-0000-0000-0000-000000000001','admin-search-citizen@example.test',now(),'{"full_name":"Prueba buscador ciudadano"}'),
 ('34000000-0000-0000-0000-000000000002','admin-search-owner@example.test',now(),'{"full_name":"Prueba buscador responsable"}'),
 ('34000000-0000-0000-0000-000000000003','admin-search-worker@example.test',now(),'{"full_name":"Prueba buscador trabajador"}'),
 ('34000000-0000-0000-0000-000000000004','admin-search-admin@example.test',now(),'{"full_name":"Prueba buscador admin"}');
insert into platform_admins values('34000000-0000-0000-0000-000000000004',now());
insert into companies(id,name) values
 ('34000000-0000-0000-0000-000000000011','Prueba buscador empresa'),
 ('34000000-0000-0000-0000-000000000012','Empresa sin detalles A'),
 ('34000000-0000-0000-0000-000000000013','Empresa sin detalles B');
insert into company_details(company_id,legal_name,tax_id,corporate_email,phone,responsible,address,activity)
 values('34000000-0000-0000-0000-000000000011','Institución de prueba','34999111999','empresa@example.test','123','Responsable','Calle de prueba','Reciclaje');
insert into company_memberships(user_id,company_id,role,status) values
 ('34000000-0000-0000-0000-000000000002','34000000-0000-0000-0000-000000000011','company_owner','ACTIVE'),
 ('34000000-0000-0000-0000-000000000002','34000000-0000-0000-0000-000000000012','company_owner','ACTIVE'),
 ('34000000-0000-0000-0000-000000000002','34000000-0000-0000-0000-000000000013','company_owner','ACTIVE'),
 ('34000000-0000-0000-0000-000000000003','34000000-0000-0000-0000-000000000011','company_worker','ACTIVE');
insert into rewards(id,company_id,title,category,points_cost,business_name,address,active)
 values('34000000-0000-0000-0000-000000000021','34000000-0000-0000-0000-000000000011','Prueba buscador premio','food',10,'Prueba empresa','Calle',false);
insert into audit_log(actor_id,action,target_id,company_id,details) values
 ('34000000-0000-0000-0000-000000000001','test_citizen_action',null,null,'{"note":"prueba-historial-admins-34"}'),
 ('34000000-0000-0000-0000-000000000004','test_admin_action',null,null,'{"note":"prueba-historial-admins-34"}');
set local role anon;
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','users')$$,'42501',null,'guests cannot search user records');
insert into admin_test_results select throws_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000001','{"name":"Intruso"}')$$,'42501',null,'guests cannot edit');
reset role;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000001',true);
set local role authenticated;
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','users')$$,'42501',null,'citizens cannot search');
insert into admin_test_results select throws_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000001','{"name":"Intruso"}')$$,'42501',null,'citizens cannot use privileged editing even on themselves');
reset role;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000002',true);
set local role authenticated;
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','companies')$$,'42501',null,'company owner cannot search other companies');
insert into admin_test_results select throws_ok($$select admin_edit_record('companies','34000000-0000-0000-0000-000000000011','{"name":"Intruso"}')$$,'42501',null,'company owner cannot call admin edits');
reset role;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000003',true);
set local role authenticated;
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','rewards')$$,'42501',null,'worker cannot use admin search');
insert into admin_test_results select throws_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000001','{"name":"Intruso"}')$$,'42501',null,'worker cannot edit users');
reset role;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000004',true);
set local role authenticated;
insert into admin_test_results select is(jsonb_array_length(admin_search_records('PRUEBA BUSCADOR CIUDADANO','users')),1,'admin searches by name ignoring case');
insert into admin_test_results select is(admin_search_records('34000000-0000-0000-0000-000000000001','users')->0->>'name','Prueba buscador ciudadano','admin searches by full user ID');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('34000000','users')),4,'admin searches by partial ID');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('prueba buscador','companies')),1,'company search');
insert into admin_test_results select is(admin_search_records('34000000-0000-0000-0000-000000000021','rewards')->0->>'name','Prueba buscador premio','search includes draft prizes');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('','users')),0,'empty input does not dump accounts');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('%','users')),0,'wildcards are literal');
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','auth')$$,'22023',null,'unknown entity kinds rejected');
insert into admin_test_results select throws_ok($$select admin_search_records('prueba','users',-1)$$,'22023',null,'invalid pagination rejected');
insert into admin_test_results select lives_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000001','{"name":"Ciudadano actualizado","email":"wrong@example.test","role":"platform_admin"}')$$,'admin edits display name');
insert into admin_test_results select is(admin_search_records('34000000-0000-0000-0000-000000000001','users')->0->>'name','Ciudadano actualizado','saved user name is searchable');
insert into admin_test_results select is(admin_search_records('34000000-0000-0000-0000-000000000001','users')->0->>'description','admin-search-citizen@example.test','unapproved email field ignored');
insert into admin_test_results select throws_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000001','{"name":""}')$$,'22023',null,'empty user name rejected');
insert into admin_test_results select throws_ok($$select admin_edit_record('users','34000000-0000-0000-0000-000000000099','{"name":"Nombre"}')$$,'22023',null,'missing user rejected');
insert into admin_test_results select lives_ok($$select admin_edit_record('companies','34000000-0000-0000-0000-000000000011','{"name":"Empresa actualizada","phone":"456","address":"Otra calle","website":"","description":"Datos actualizados","worker_limit":999,"status":"SUSPENDED"}')$$,'admin edits company and contact details');
insert into admin_test_results select is((select phone from company_details where company_id='34000000-0000-0000-0000-000000000011'),'456','contact edits persist');
insert into admin_test_results select lives_ok($$select portal_command('admin_save_point',jsonb_build_object('companyId','34000000-0000-0000-0000-000000000011','name','Prueba buscador punto','address','Calle 123 · Entre calles: Primera y Segunda','latitude',-34.459,'longitude',-58.914,'phone','123','description','Entrada principal','timeZone','America/Argentina/Buenos_Aires','active',true,'pickupEnabled',false,'categories',jsonb_build_array((select id from device_categories where active limit 1)),'schedules','[{"weekday":1,"opensMinute":540,"closesMinute":1080}]'::jsonb))$$,'admin publishes a point with chosen coordinates and cross streets');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('prueba buscador punto','points')),1,'published point searchable by name');
insert into admin_test_results select is(admin_search_records('admin-search-citizen@example.test','users')->0->>'id','34000000-0000-0000-0000-000000000001','admin searches users by email');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('primera y segunda','points')),1,'admin searches points by address');
insert into admin_test_results select is(admin_search_records('prueba empresa','rewards')->0->>'id','34000000-0000-0000-0000-000000000021','admin searches rewards by business name');
insert into admin_test_results select is(jsonb_array_length(admin_search_records('ACTIVE','companies')),0,'company search ignores status enum');
insert into admin_test_results select is(jsonb_array_length(admin_changelog(0,'prueba-historial-admins-34',false)),1,'old clients cannot include citizen actions in admin history');
reset role;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000002',true);
set local role authenticated;
insert into admin_test_results select lives_ok($$select portal_command('save_company','{"companyId":"34000000-0000-0000-0000-000000000012","name":"Empresa A actualizada","phone":"1111-2222","address":"Av. Uno 100","website":"https://uno.example.test","description":"Sin CUIT"}')$$,'save_company inserts missing company_details');
insert into admin_test_results select lives_ok($$select portal_command('save_company','{"companyId":"34000000-0000-0000-0000-000000000013","name":"Empresa B actualizada","phone":"3333-4444","address":"Av. Dos 200"}')$$,'save_company inserts missing company_details for a second company without tax_id collision');
insert into admin_test_results select is((select phone from company_details where company_id='34000000-0000-0000-0000-000000000012'),'1111-2222','upserted company_details phone persists');
insert into admin_test_results select lives_ok($$select portal_command('save_company','{"companyId":"34000000-0000-0000-0000-000000000012","name":"Empresa A actualizada","phone":"9999-0000","address":"Av. Uno 100"}')$$,'save_company updates previously upserted company_details');
insert into admin_test_results select is((select phone from company_details where company_id='34000000-0000-0000-0000-000000000012'),'9999-0000','updated upserted company_details persists');
reset role;
insert into admin_test_results select is((select count(*) from platform_admins where user_id='34000000-0000-0000-0000-000000000001'),0::bigint,'profile editing cannot grant admin access');
insert into admin_test_results select is((select worker_limit from companies where id='34000000-0000-0000-0000-000000000011'),20,'unapproved limit field ignored');
insert into admin_test_results select is((select status from companies where id='34000000-0000-0000-0000-000000000011'),'ACTIVE','status changes require existing audited operation');
insert into admin_test_results select is((select count(*) from audit_log where actor_id='34000000-0000-0000-0000-000000000004' and action in ('admin_edit_users','admin_edit_companies')),2::bigint,'new edits audited');
set local role anon;
insert into admin_test_results select is((select count(*) from green_points where name='Prueba buscador punto'),1::bigint,'published point visible to guests');
insert into admin_test_results select is((select address from green_points where name='Prueba buscador punto'),'Calle 123 · Entre calles: Primera y Segunda','cross streets visible publicly');
insert into admin_test_results select is((select latitude from green_points where name='Prueba buscador punto'),-34.459::float8,'public marker receives exact saved latitude');
insert into admin_test_results select is((select longitude from green_points where name='Prueba buscador punto'),-58.914::float8,'public marker receives exact saved longitude');
reset role;
insert into admin_test_results select * from finish();
select message from admin_test_results;
rollback;
