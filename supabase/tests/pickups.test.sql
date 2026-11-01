begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create temporary table pickup_test_results (message text);
grant select, insert on pickup_test_results to anon, authenticated;
insert into pickup_test_results select no_plan();

-- Setup users
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
 ('34000000-0000-0000-0000-000000000001', 'pickup-citizen@example.test', now(), '{"full_name":"Ciudadano Retiro"}'),
 ('34000000-0000-0000-0000-000000000002', 'pickup-other@example.test', now(), '{"full_name":"Otro Ciudadano"}'),
 ('34000000-0000-0000-0000-000000000003', 'pickup-owner@example.test', now(), '{"full_name":"Responsable Retiro"}'),
 ('34000000-0000-0000-0000-000000000004', 'pickup-worker@example.test', now(), '{"full_name":"Operador Retiro"}'),
 ('34000000-0000-0000-0000-000000000005', 'pickup-admin@example.test', now(), '{"full_name":"Admin Retiro"}');

insert into platform_admins values ('34000000-0000-0000-0000-000000000005', now());

insert into companies (id, name, status) values
 ('34000000-0000-0000-0000-000000000011', 'Empresa Logística Verde', 'ACTIVE');

insert into company_memberships (user_id, company_id, role, status) values
 ('34000000-0000-0000-0000-000000000003', '34000000-0000-0000-0000-000000000011', 'company_owner', 'ACTIVE'),
 ('34000000-0000-0000-0000-000000000004', '34000000-0000-0000-0000-000000000011', 'company_worker', 'ACTIVE');

-- Green point with pickup_enabled = true
insert into green_points (id, company_id, name, address, latitude, longitude, active, pickup_enabled) values
 ('34000000-0000-0000-0000-000000000021', '34000000-0000-0000-0000-000000000011', 'Punto Pilar Centro', 'San Martín 123', -34.45, -58.91, true, true);

-- Green point with pickup_enabled = false
insert into green_points (id, company_id, name, address, latitude, longitude, active, pickup_enabled) values
 ('34000000-0000-0000-0000-000000000022', '34000000-0000-0000-0000-000000000011', 'Punto Sin Retiro', 'Belgrano 456', -34.46, -58.92, true, false);

-- Set point rates
insert into company_device_points (company_id, device_category_id, points)
 select '34000000-0000-0000-0000-000000000011', id, 250 from device_categories where slug = 'computadoras' limit 1;

-- 1. Anonymous cannot create or access
set local role anon;
insert into pickup_test_results select throws_ok(
  $$select pickup_command('create', '{"requestId":"34000000-0000-0000-0000-000000000031"}')$$,
  '42501', null, 'anon cannot create pickups'
);
reset role;

-- 2. Citizen creates pickup on point without pickup_enabled fails
select set_config('request.jwt.claim.sub', '34000000-0000-0000-0000-000000000001', true);
set local role authenticated;

insert into pickup_test_results select throws_ok(
  $$select pickup_command('create', jsonb_build_object(
    'requestId', '34000000-0000-0000-0000-000000000030',
    'pointId', '34000000-0000-0000-0000-000000000022',
    'addressStreet', 'Av. Tratado del Pilar 100',
    'addressLocality', 'Pilar',
    'items', jsonb_build_array(jsonb_build_object(
      'categoryId', (select id from device_categories where slug = 'computadoras' limit 1),
      'quantity', 1
    ))
  ))$$,
  '22023', 'Este punto verde no ofrece servicio de retiros a domicilio.',
  'cannot create pickup on point without pickup_enabled'
);

-- 3. Citizen successfully creates pickup on enabled point
select pickup_command('create', jsonb_build_object(
  'requestId', '34000000-0000-0000-0000-000000000031',
  'pointId', '34000000-0000-0000-0000-000000000021',
  'addressStreet', 'Av. Tratado del Pilar 100',
  'addressLocality', 'Pilar',
  'addressReference', 'Portón negro, timbre 2B',
  'notes', 'Lavarropas en planta baja',
  'items', jsonb_build_array(jsonb_build_object(
    'categoryId', (select id from device_categories where slug = 'computadoras' limit 1),
    'quantity', 2
  ))
)) as created_result \gset

insert into pickup_test_results select is(
  (select status from pickups where client_request_id = '34000000-0000-0000-0000-000000000031'),
  'REQUESTED',
  'new pickup is in REQUESTED status'
);

insert into pickup_test_results select is(
  (select count(*) from pickup_items where pickup_id = (select id from pickups where client_request_id = '34000000-0000-0000-0000-000000000031')),
  1::bigint,
  'pickup_items inserted correctly'
);

-- 4. Idempotency check with same requestId returns same result
insert into pickup_test_results select is(
  (select (pickup_command('create', jsonb_build_object(
    'requestId', '34000000-0000-0000-0000-000000000031',
    'pointId', '34000000-0000-0000-0000-000000000021',
    'addressStreet', 'Av. Tratado del Pilar 100',
    'addressLocality', 'Pilar',
    'addressReference', 'Portón negro, timbre 2B',
    'notes', 'Lavarropas en planta baja',
    'items', jsonb_build_array(jsonb_build_object(
      'categoryId', (select id from device_categories where slug = 'computadoras' limit 1),
      'quantity', 2
    ))
  ))->>'id')),
  (select id::text from pickups where client_request_id = '34000000-0000-0000-0000-000000000031'),
  'idempotent create returns existing pickup'
);

-- 5. Other citizen cannot access the pickup
reset role;
create temporary table pickup_fixture as select id from pickups where client_request_id = '34000000-0000-0000-0000-000000000031';
grant select on pickup_fixture to authenticated;

select set_config('request.jwt.claim.sub', '34000000-0000-0000-0000-000000000002', true);
set local role authenticated;

insert into pickup_test_results select throws_ok(
  format($$select pickup_command('get', jsonb_build_object('id', '%s'))$$, (select id from pickup_fixture)),
  '42501', 'No podés acceder a este retiro.',
  'other citizen cannot get pickup'
);

-- 6. Company worker can coordinate the pickup
reset role;
select set_config('request.jwt.claim.sub', '34000000-0000-0000-0000-000000000004', true);
set local role authenticated;

insert into pickup_test_results select lives_ok(
  format($$select pickup_command('coordinate', jsonb_build_object('id', '%s', 'scheduledDate', '2026-11-05', 'scheduledTimeSlot', '09:00 - 13:00', 'driverName', 'Carlos Chofer'))$$,
    (select id from pickup_fixture)),
  'company worker can coordinate pickup'
);

insert into pickup_test_results select is(
  (select status from pickups where id = (select id from pickup_fixture)),
  'COORDINATED',
  'pickup transitioned to COORDINATED status'
);

-- 7. Citizen can cancel coordinated pickup
reset role;
select set_config('request.jwt.claim.sub', '34000000-0000-0000-0000-000000000001', true);
set local role authenticated;

insert into pickup_test_results select lives_ok(
  format($$select pickup_command('cancel', jsonb_build_object('id', '%s'))$$,
    (select id from pickup_fixture)),
  'citizen can cancel coordinated pickup'
);

insert into pickup_test_results select is(
  (select status from pickups where id = (select id from pickup_fixture)),
  'CANCELLED',
  'pickup status is now CANCELLED'
);

reset role;
insert into pickup_test_results select * from finish();
select * from pickup_test_results;
rollback;
