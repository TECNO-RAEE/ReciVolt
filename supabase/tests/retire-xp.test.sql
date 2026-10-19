-- Regression: points, quantities, permissions and retries survive XP retirement.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('22000000-0000-0000-0000-000000000001','delivery-citizen@example.test',now(),'{"full_name":"Ciudadano de prueba"}'),
 ('22000000-0000-0000-0000-000000000002','delivery-other@example.test',now(),'{"full_name":"Otro","role":"platform_admin"}'),
 ('22000000-0000-0000-0000-000000000003','delivery-worker@example.test',now(),'{"full_name":"Worker"}'),
 ('22000000-0000-0000-0000-000000000004','delivery-owner@example.test',now(),'{"full_name":"Owner"}'),
 ('22000000-0000-0000-0000-000000000005','delivery-worker-b@example.test',now(),'{"full_name":"Worker B"}'),
 ('22000000-0000-0000-0000-000000000006','delivery-unverified@example.test',null,'{"full_name":"Sin verificar"}'),
 ('22000000-0000-0000-0000-000000000007','delivery-admin@example.test',now(),'{"full_name":"Admin"}');
insert into platform_admins(user_id) values('22000000-0000-0000-0000-000000000007');
insert into companies(id,name) values('22000000-0000-0000-0000-000000000011','Delivery Company A'),('22000000-0000-0000-0000-000000000012','Delivery Company B');
insert into company_memberships(user_id,company_id,role,status) values
 ('22000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000011','company_worker','ACTIVE'),
 ('22000000-0000-0000-0000-000000000004','22000000-0000-0000-0000-000000000011','company_owner','ACTIVE'),
 ('22000000-0000-0000-0000-000000000005','22000000-0000-0000-0000-000000000012','company_worker','ACTIVE');
insert into green_points(id,company_id,name,address,latitude,longitude,active) values
 ('22000000-0000-0000-0000-000000000021','22000000-0000-0000-0000-000000000011','Test A','Calle 1',-34,-58,true),
 ('22000000-0000-0000-0000-000000000022','22000000-0000-0000-0000-000000000012','Test B','Calle 2',-34,-58,true),
 ('22000000-0000-0000-0000-000000000023','22000000-0000-0000-0000-000000000011','Draft A','Calle 3',-34,-58,false);
insert into green_point_device_categories(green_point_id,device_category_id)
 select p.id,c.id from green_points p cross join device_categories c where p.id::text like '22000000%' and c.slug in ('celulares','cables');
insert into company_device_points(company_id,device_category_id,points)
 select c.id,d.id,case when c.id='22000000-0000-0000-0000-000000000011' then 100 else 250 end from companies c cross join device_categories d
 where c.id::text like '22000000%' and d.slug in ('celulares','cables');
update device_categories set impact_xp=10 where slug='celulares';
insert into storage.objects(bucket_id,name) values('delivery-photos','22000000-0000-0000-0000-000000000001/test.jpg');

-- Immutable payload fixture; functions execute through the same public RPC as the app.
create function pg_temp.create_test_delivery(request_id text,point_id text default '22000000-0000-0000-0000-000000000021') returns jsonb language sql as $$
 select public.delivery_command('create',jsonb_build_object('requestId',request_id,'pointId',point_id,'photoPath',auth.uid()::text||'/test.jpg',
  'notes','Verificar dos teléfonos','items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='celulares'),'quantity',3))));
$$;
create function pg_temp.confirm_test_delivery(company_id text default '22000000-0000-0000-0000-000000000011',quantity integer default 2) returns jsonb language sql as $$
 select public.delivery_command('confirm',jsonb_build_object('companyId',company_id,'code',
  (select verification_token from deliveries where client_request_id='22000000-0000-0000-0000-000000000031'),
  'items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='celulares'),'quantity',quantity))));
$$;
set local role anon;
select throws_ok($$select delivery_command('create','{}')$$,'42501',null,'guest cannot create');
select throws_ok($$select * from deliveries$$,'42501',null,'guest cannot read deliveries or tokens');
select throws_ok($$select my_delivery_balance()$$,'42501',null,'guest cannot query balance');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000006',true);
select throws_ok($$select delivery_command('create','{}')$$,'42501',null,'unverified email cannot create');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000031')$$,'citizen creates a pending delivery');
select set_config('qa.delivery_id',(select id::text from deliveries where user_id=auth.uid()),true);
select set_config('qa.delivery_code',(select verification_token from deliveries where user_id=auth.uid()),true);
select is((select status from deliveries where user_id=auth.uid()),'PENDING_RECEPTION','creating does not confirm reception');
select is((select count(*) from points_transactions),0::bigint,'no points before physical reception');
select is((select count(*) from impact_transactions),0::bigint,'no XP before physical reception');
select ok(not (my_delivery_balance() ?| array['xp','level','nextLevel']),'balance exposes only redeemable points');
select is((select points_snapshot from delivery_items),100,'company rate captured');
select is((select impact_xp_snapshot from delivery_items),0,'new deliveries do not capture XP');
select matches((select verification_token from deliveries),'^TR-[A-F0-9]{8}(-[A-F0-9]{8}){3}$','random nonincremental readable token');
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000031')$$,'network retry is idempotent');
select is((select count(*) from deliveries),1::bigint,'retry did not create duplicate');
select throws_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000031','22000000-0000-0000-0000-000000000022')$$,'22023',null,'idempotency key cannot change payload');
select throws_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000032','22000000-0000-0000-0000-000000000023')$$,'22023',null,'draft point cannot accept registration');
select throws_ok($$select delivery_command('create',jsonb_build_object('requestId',gen_random_uuid(),'pointId','22000000-0000-0000-0000-000000000021','items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='notebooks'),'quantity',1))))$$,'22023',null,'reject unsupported category');
select throws_ok($$select delivery_command('create',jsonb_build_object('requestId',gen_random_uuid(),'pointId','22000000-0000-0000-0000-000000000021','items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='celulares'),'quantity',1.5))))$$,'22023',null,'reject fractional quantity');
select throws_ok($$insert into deliveries(user_id) values(auth.uid())$$,'42501',null,'direct insert blocked');
select throws_ok($$update deliveries set status='CONFIRMED'$$,'42501',null,'citizen cannot forge confirmation');
select throws_ok($$insert into points_transactions(user_id,amount) values(auth.uid(),999)$$,'42501',null,'ledger cannot be forged');
select throws_ok($$select pg_temp.confirm_test_delivery()$$,'42501',null,'citizen cannot self confirm through worker RPC');
select is((select count(*) from storage.objects where bucket_id='delivery-photos'),1::bigint,'own photo readable');

select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000002',true);
select is((select count(*) from deliveries),0::bigint,'other citizen cannot see delivery/token');
select is((select count(*) from delivery_items),0::bigint,'other citizen cannot see items');
select is((select count(*) from storage.objects where bucket_id='delivery-photos'),0::bigint,'other citizen cannot see photo');
select throws_ok($$select delivery_command('get',jsonb_build_object('id',current_setting('qa.delivery_id')))$$,'42501',null,'metadata role cannot grant access to an existing delivery');
select throws_ok($$select delivery_command('cancel',jsonb_build_object('id',current_setting('qa.delivery_id')))$$,'42501',null,'other citizen cannot cancel a known delivery');

select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000005',true);
select is((select count(*) from deliveries),0::bigint,'other company cannot see delivery');
select throws_ok($$select delivery_command('lookup','{"companyId":"22000000-0000-0000-0000-000000000011","code":"TR-12345678-12345678-12345678-12345678"}')$$,'42501',null,'foreign company cannot scan');
select throws_ok($$select delivery_command('lookup',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000012','code',current_setting('qa.delivery_code')))$$,'22023',null,'known token cannot be used under another company');

reset role;
update company_device_points set points=999 where company_id='22000000-0000-0000-0000-000000000011';
update device_categories set impact_xp=99 where slug='celulares';
-- Emulate a pending delivery registered before the XP retirement.
update delivery_items set impact_xp_snapshot=10 where delivery_id in (select id from deliveries where client_request_id='22000000-0000-0000-0000-000000000031');
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000003',true);
select is((select count(*) from deliveries),1::bigint,'worker sees own company delivery');
select is((select count(*) from storage.objects where bucket_id='delivery-photos'),1::bigint,'own company worker sees attached photo');
select lives_ok($$select delivery_command('lookup',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000011','code',(select verification_token from deliveries)))$$,'worker scans valid company token');
select throws_ok($$select delivery_command('confirm',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000011','code',(select verification_token from deliveries),'items','[]'::jsonb))$$,'22023',null,'must review every category');
select throws_ok($$select pg_temp.confirm_test_delivery('22000000-0000-0000-0000-000000000011',0)$$,'22023',null,'zero devices cannot be confirmed');
select is((select confirmed_quantity from delivery_items),null::integer,'failed confirmation rolls quantities back');
select lives_ok($$select pg_temp.confirm_test_delivery()$$,'worker adjusts and confirms physical receipt');
select is((select confirmed_quantity from delivery_items),2,'actual quantity stored');
select is((select confirmed_points from deliveries),200::bigint,'points use snapshot, not new rate');
select is((select confirmed_xp from deliveries),0::bigint,'confirmation does not award XP even for old pending snapshots');
select ok((select status='CONFIRMED' and token_used_at is not null and confirmed_by=auth.uid() from deliveries),'confirmation consumes token and stores actor');
select lives_ok($$select pg_temp.confirm_test_delivery()$$,'duplicate confirmation returns original result');
select is((select count(*) from points_transactions),1::bigint,'replay never duplicates points');
select is((select sum(amount) from points_transactions),200::numeric,'one immutable company credit');
select throws_ok($$update delivery_items set confirmed_quantity=999$$,'42501',null,'worker cannot edit historical quantities');
select throws_ok($$update points_transactions set amount=999$$,'42501',null,'worker cannot edit ledger');
select is((select count(*) from impact_transactions),0::bigint,'worker cannot read another citizen global ledger');

select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select is((select count(*) from impact_transactions),0::bigint,'confirmation and retries create no XP transactions');
select ok(not (my_delivery_balance() ?| array['xp','level','nextLevel']),'confirmed balance does not expose XP or levels');
select is((my_delivery_balance()->'companies'->0->>'points')::int,200,'server balance scoped by company');
select throws_ok($$select delivery_command('cancel',jsonb_build_object('id',(select id from deliveries)))$$,'22023',null,'confirmed delivery cannot be cancelled');
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000032')$$,'create another delivery for cancellation');
select lives_ok($$select delivery_command('cancel',jsonb_build_object('id',(select id from deliveries where client_request_id='22000000-0000-0000-0000-000000000032')))$$,'citizen cancels own pending');
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000033')$$,'create delivery for expiry test');
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000034')$$,'create delivery for permission test');
select lives_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000035','22000000-0000-0000-0000-000000000022')$$,'same citizen can deliver to another company');
reset role;
update deliveries set expires_at=now()-interval '1 second' where client_request_id='22000000-0000-0000-0000-000000000033';
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000003',true);
select throws_ok($$select delivery_command('confirm',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000011','code',(select verification_token from deliveries where client_request_id='22000000-0000-0000-0000-000000000032'),'items','[]'::jsonb))$$,'22023',null,'cancelled token cannot be used');
select is((delivery_command('confirm',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000011','code',(select verification_token from deliveries where client_request_id='22000000-0000-0000-0000-000000000033'),'items','[]'::jsonb))->>'status'),'EXPIRED','expired token rejected with persisted expiry');
select is((select count(*) from points_transactions),1::bigint,'cancelled and expired tokens earn no credits');
reset role;
update company_memberships set status='DISABLED' where user_id='22000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000003',true);
select is((select count(*) from deliveries),0::bigint,'disabled worker loses access immediately');
select throws_ok($$select delivery_command('lookup','{"companyId":"22000000-0000-0000-0000-000000000011","code":"TR-12345678-12345678-12345678-12345678"}')$$,'42501',null,'disabled worker cannot operate');
reset role;
update companies set status='SUSPENDED' where id='22000000-0000-0000-0000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000004',true);
select throws_ok($$select delivery_command('lookup','{"companyId":"22000000-0000-0000-0000-000000000011","code":"TR-12345678-12345678-12345678-12345678"}')$$,'42501',null,'suspended company owner cannot receive');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select is((my_delivery_balance()->'companies'->0->>'points')::int,200,'suspension preserves citizen earned balance');
select lives_ok($$select delivery_command('get',jsonb_build_object('id',(select id from deliveries where client_request_id='22000000-0000-0000-0000-000000000031')))$$,'citizen retains history after suspension');
select throws_ok($$select pg_temp.create_test_delivery('22000000-0000-0000-0000-000000000036')$$,'22023',null,'suspended company cannot accept new delivery');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000005',true);
select lives_ok($$select delivery_command('confirm',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000012','code',(select verification_token from deliveries where client_request_id='22000000-0000-0000-0000-000000000035'),'items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='celulares'),'quantity',1))))$$,'second company credits its own rate');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select is(jsonb_array_length(my_delivery_balance()->'companies'),2,'balances stay separate across companies');
select ok(not (my_delivery_balance() ?| array['xp','level','nextLevel']),'multiple companies do not restore XP or levels');
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000007',true);
select is((select count(*) from deliveries where user_id='22000000-0000-0000-0000-000000000001'),5::bigint,'admin can inspect operations');
select is((select count(*) from audit_log where action='delivery_confirmed' and company_id::text like '22000000%'),2::bigint,'confirmation audit occurs once per delivery');
reset role;
update companies set status='ACTIVE' where id='22000000-0000-0000-0000-000000000011';
insert into company_memberships(user_id,company_id,role,status) values('22000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000011','company_worker','ACTIVE');
set local role authenticated;
select set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
select throws_ok($$select delivery_command('confirm',jsonb_build_object('companyId','22000000-0000-0000-0000-000000000011','code',(select verification_token from deliveries where client_request_id='22000000-0000-0000-0000-000000000034'),'items',jsonb_build_array(jsonb_build_object('categoryId',(select id from device_categories where slug='celulares'),'quantity',1))))$$,'42501',null,'even active worker cannot receive their own delivery');
-- Simulate Storage API's transaction flag; this test creates metadata only and rolls back.
select set_config('storage.allow_delete_query','true',true);
delete from storage.objects where bucket_id='delivery-photos' and name='22000000-0000-0000-0000-000000000001/test.jpg';
select set_config('storage.allow_delete_query','false',true);
select is((select count(*) from storage.objects where bucket_id='delivery-photos'),1::bigint,'submitted photo cannot be deleted by its owner');
select lives_ok($$do $quota$ begin for i in 1..19 loop perform pg_temp.create_test_delivery(gen_random_uuid()::text,'22000000-0000-0000-0000-000000000022'); end loop; end $quota$;$$,'twenty pending deliveries allowed across companies');
select throws_ok($$select pg_temp.create_test_delivery(gen_random_uuid()::text,'22000000-0000-0000-0000-000000000022')$$,'22023',null,'pending quota is enforced server-side');
select * from finish();
rollback;
