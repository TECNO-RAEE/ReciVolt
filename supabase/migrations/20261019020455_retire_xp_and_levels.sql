begin;
-- Retire XP and levels without deleting past deliveries or changing redeemable points.

-- Serialize all new registrations for a citizen, including the pending-delivery quota.
create or replace function private.delivery_command(operation text,payload jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); d public.deliveries%rowtype; p public.green_points%rowtype;
 company uuid; target uuid; request_id uuid; item jsonb; category uuid; quantity integer;
 category_name text; point_rate integer; random_token text; code text;
 point_total bigint; requested_items jsonb; photo text;
begin
 if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or length(payload::text)>20000 then
  raise exception 'Datos inválidos.' using errcode='22023'; end if;
 if operation='create' then
  if private.current_verified_email() is null then raise exception 'Confirmá tu email antes de registrar una entrega.' using errcode='42501'; end if;
  request_id:=(payload->>'requestId')::uuid;
  if request_id is null then raise exception 'Identificador de solicitud requerido.' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
  select * into d from public.deliveries where user_id=actor and client_request_id=request_id;
  if found then
   if d.request_payload is distinct from payload then raise exception 'No reutilices la solicitud con otros datos.' using errcode='22023'; end if;
   return private.delivery_json(d.id);
  end if;
  if (select count(*) from public.deliveries where user_id=actor and status='PENDING_RECEPTION' and expires_at>now())>=20 then
   raise exception 'Ya tenés 20 entregas pendientes. Cancelá las que no vas a realizar.' using errcode='22023'; end if;
  select company_id into company from public.green_points where id=(payload->>'pointId')::uuid;
  perform 1 from public.companies where id=company and status='ACTIVE' for share;
  if not found then raise exception 'El punto ya no está disponible.' using errcode='22023'; end if;
  select * into p from public.green_points where id=(payload->>'pointId')::uuid and active for share;
  if not found then raise exception 'El punto ya no está publicado.' using errcode='22023'; end if;
  requested_items:=payload->'items';
  if jsonb_typeof(requested_items) is distinct from 'array' then raise exception 'Seleccioná dispositivos.' using errcode='22023'; end if;
  if jsonb_array_length(requested_items) not between 1 and 50 then raise exception 'Seleccioná de 1 a 50 categorías.' using errcode='22023'; end if;
  if length(coalesce(payload->>'notes',''))>2000 then raise exception 'Las notas admiten hasta 2000 caracteres.' using errcode='22023'; end if;
  photo:=nullif(payload->>'photoPath','');
  if photo is not null and not exists(select 1 from storage.objects where bucket_id='delivery-photos' and name=photo
   and (storage.foldername(name))[1]=actor::text) then raise exception 'La foto no pertenece a tu cuenta.' using errcode='42501'; end if;
  random_token:=upper(replace(pg_catalog.gen_random_uuid()::text,'-',''));
  code:='TR-'||substring(random_token,1,8)||'-'||substring(random_token,9,8)||'-'||substring(random_token,17,8)||'-'||substring(random_token,25,8);
  insert into public.deliveries(user_id,company_id,green_point_id,citizen_name,company_name,point_name,
   verification_token,client_request_id,request_payload,notes,photo_path)
   select actor,company,p.id,pr.full_name,c.name,p.name,code,request_id,payload,coalesce(payload->>'notes',''),photo
   from public.profiles pr cross join public.companies c where pr.id=actor and c.id=company returning id into target;
  for item in select value from jsonb_array_elements(requested_items) loop
   if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^[1-9][0-9]{0,2}$' then
    raise exception 'Las cantidades deben ser enteras entre 1 y 999.' using errcode='22023'; end if;
   category:=(item->>'categoryId')::uuid; quantity:=(item->>'quantity')::integer;
   select dc.name into category_name from public.device_categories dc
    join public.green_point_device_categories pc on pc.device_category_id=dc.id
    where pc.green_point_id=p.id and dc.id=category and dc.active for share of dc,pc;
   if not found then raise exception 'El punto no recibe alguna de las categorías seleccionadas.' using errcode='22023'; end if;
   select points into point_rate from public.company_device_points where company_id=company and device_category_id=category for share;
   insert into public.delivery_items values(target,category,category_name,quantity,null,coalesce(point_rate,0),0);
  end loop;
  insert into public.audit_log(actor_id,action,target_id,company_id) values(actor,'delivery_created',target,company);
  return private.delivery_json(target);
 end if;

 if operation in ('lookup','confirm') then
  company:=(payload->>'companyId')::uuid;
  perform 1 from public.companies where id=company and status='ACTIVE' for share;
  if not found or not private.has_company_role(company) then raise exception 'No tenés acceso operativo a esta empresa.' using errcode='42501'; end if;
  -- Also lock membership to serialize disable/reception operations.
  perform 1 from public.company_memberships where user_id=actor and company_id=company and status='ACTIVE' for share;
  code:=upper(trim(payload->>'code'));
  select * into d from public.deliveries where verification_token=code and company_id=company for update;
  if not found then raise exception 'Código no encontrado para esta empresa.' using errcode='22023'; end if;
 else
  select * into d from public.deliveries where id=(payload->>'id')::uuid for update;
  if not found or d.user_id<>actor then raise exception 'No podés acceder a esta entrega.' using errcode='42501'; end if;
 end if;
 if d.status='PENDING_RECEPTION' and d.expires_at<=now() then
  update public.deliveries set status='EXPIRED' where id=d.id;
  d.status:='EXPIRED';
 end if;
 case operation
 when 'get','lookup' then return private.delivery_json(d.id);
 when 'cancel' then
  if d.status='CANCELLED' then return private.delivery_json(d.id); end if;
  if d.status<>'PENDING_RECEPTION' then raise exception 'Sólo podés cancelar una entrega pendiente.' using errcode='22023'; end if;
  update public.deliveries set status='CANCELLED' where id=d.id;
  insert into public.audit_log(actor_id,action,target_id,company_id) values(actor,'delivery_cancelled',d.id,d.company_id);
  return private.delivery_json(d.id);
 when 'confirm' then
  if d.user_id=actor then raise exception 'Otra persona del equipo debe recibir tu entrega.' using errcode='42501'; end if;
  if d.status='CONFIRMED' then return private.delivery_json(d.id); end if;
  if d.status='EXPIRED' then return private.delivery_json(d.id); end if;
  if d.status<>'PENDING_RECEPTION' then raise exception 'La entrega ya no está pendiente.' using errcode='22023'; end if;
  requested_items:=payload->'items';
  if jsonb_typeof(requested_items) is distinct from 'array' then raise exception 'Indicá las cantidades recibidas.' using errcode='22023'; end if;
  if jsonb_array_length(requested_items)<>(select count(*) from public.delivery_items where delivery_id=d.id) then
   raise exception 'Revisá todas las categorías de la entrega.' using errcode='22023'; end if;
  if (select count(distinct value->>'categoryId') from jsonb_array_elements(requested_items))<>jsonb_array_length(requested_items) then
   raise exception 'No repitas categorías.' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(requested_items) loop
   if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^(0|[1-9][0-9]{0,2})$' then
    raise exception 'Las cantidades recibidas deben ser enteras entre 0 y 999.' using errcode='22023'; end if;
   update public.delivery_items set confirmed_quantity=(item->>'quantity')::integer
    where delivery_id=d.id and device_category_id=(item->>'categoryId')::uuid;
   if not found then raise exception 'Categoría ajena a esta entrega.' using errcode='22023'; end if;
  end loop;
  if not exists(select 1 from public.delivery_items where delivery_id=d.id and confirmed_quantity>0) then
   raise exception 'Recibí al menos un dispositivo para confirmar.' using errcode='22023'; end if;
  select sum(confirmed_quantity::bigint*points_snapshot)
   into point_total from public.delivery_items where delivery_id=d.id;
  update public.deliveries set status='CONFIRMED',confirmed_at=now(),confirmed_by=actor,token_used_at=now(),
   confirmed_points=point_total,confirmed_xp=0 where id=d.id;
  if point_total>0 then
   insert into public.points_transactions(user_id,company_id,amount,type,reference_type,reference_id)
    values(d.user_id,d.company_id,point_total,'DELIVERY','DELIVERY',d.id);
  end if;
  insert into public.audit_log(actor_id,action,target_id,company_id,details)
   values(actor,'delivery_confirmed',d.id,d.company_id,jsonb_build_object('points',point_total));
  return private.delivery_json(d.id);
 else raise exception 'Operación no disponible.' using errcode='22023';
 end case;
end;
$$;
create or replace function private.my_delivery_balance() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); balances jsonb;
begin
 if actor is null then raise exception 'Iniciá sesión.' using errcode='42501'; end if;
 -- Retained for old client compatibility: these are historical credits, not spendable wallets.
 select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) into balances from (
  select t.company_id,c.name as company_name,sum(t.amount) as points from public.points_transactions t
   join public.companies c on c.id=t.company_id where t.user_id=actor group by t.company_id,c.name order by c.name
 ) b;
 return jsonb_build_object('points',private.global_points(actor),'companies',balances);
end;
$$;


-- Preserve historical XP columns and audit records; disable the retired commands.
-- Guard the replacement so an unexpected dispatcher cannot be changed silently.
do $migration$
declare
 source text := pg_get_functiondef('private.portal_command(text,jsonb)'::regprocedure);
 previous text := $old$if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;$old$;
 replacement text := $new$if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;
 if operation in ('save_global_xp','save_level') then
  if not admin then raise exception 'Sólo el administrador puede configurar la plataforma.' using errcode='42501'; end if;
  raise exception 'Esta configuración ya no está disponible.' using errcode='22023';
 end if;$new$;
begin
 if (length(source)-length(replace(source,previous,'')))/length(previous) <> 1 then
  raise exception 'The portal dispatcher changed; review the migration before applying it.';
 end if;
 execute replace(source,previous,replacement);
end;
$migration$;

commit;
