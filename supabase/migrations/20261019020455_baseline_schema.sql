-- Baseline schema for local development and CI.
-- Squashes the history up to 20261019020455_retire_xp_and_levels so that
-- `supabase db reset` rebuilds the full schema from this repository alone.
-- Production already has these changes applied: never `db push` this file to it.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Supabase grants anon/authenticated/service_role on every new public object by
-- default; the dump only records the final per-object ACLs. Clear those defaults
-- so the objects below end with the same privileges as the source database.
-- The default privileges are restored at the end of the dump.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "private"."admin_change_snapshot"("operation" "text", "target" "uuid", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare result jsonb;
begin
 case operation
 when 'review_application' then
  select jsonb_build_array(jsonb_build_object('id',a.id,'name',a.business_name,'status',a.status,'review_note',a.review_note,'company_id',a.company_id)) into result
   from public.company_applications a where a.id=target;
 when 'review_limit' then
  select jsonb_build_array(jsonb_build_object('id',r.id,'name',c.name,'status',r.status,'review_note',r.review_note,'worker_limit',c.worker_limit,'requested_limit',r.requested_limit)) into result
   from public.company_limit_requests r join public.companies c on c.id=r.company_id where r.id=target;
 when 'set_company_status' then
  select jsonb_build_array(jsonb_build_object('id',c.id,'name',c.name,'status',c.status)) into result from public.companies c where c.id=target;
 when 'save_global_xp' then
  select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'impact_xp',d.impact_xp) order by d.id) into result
   from public.device_categories d where d.id in (select (value->>'id')::uuid from jsonb_array_elements(payload->'categories'));
 when 'save_level' then
  select jsonb_build_array(jsonb_build_object('id',l.id,'name',l.name,'minimum_xp',l.minimum_xp)) into result from public.impact_levels l where l.id=target;
 else return null;
 end case;
 return coalesce(result,'[]'::jsonb);
end; $$;


ALTER FUNCTION "private"."admin_change_snapshot"("operation" "text", "target" "uuid", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare result jsonb;
begin
 if auth.uid() is null or not private.is_platform_admin() then raise exception 'Sólo el administrador puede consultar el historial.' using errcode='42501'; end if;
 if page_offset<0 or page_offset>1000000 or length(coalesce(search_text,''))>200 then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(rows) order by rows.created_at desc,rows.id desc),'[]'::jsonb) into result from (
  select a.*,coalesce(a.details->'actor'->>'name',p.full_name,'Cuenta eliminada') as actor_name,
   coalesce(a.details->'actor'->>'email',p.email,'') as actor_email, c.name as company_name
  from public.audit_log a left join public.profiles p on p.id=a.actor_id left join public.companies c on c.id=a.company_id
  where (not admins_only or a.details->'actor'->>'role'='platform_admin' or a.action in ('review_application','review_limit','set_company_status','save_global_xp','save_level','admin_document_opened'))
   and (coalesce(search_text,'')='' or strpos(lower(concat_ws(' ',a.action,a.details::text,p.full_name,p.email,c.name,a.target_id::text)),lower(search_text))>0)
  order by a.created_at desc,a.id desc offset page_offset limit 26
 ) rows;
 return result;
end; $$;


ALTER FUNCTION "private"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."admin_document_access"("document_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare application public.company_applications%rowtype;
begin
 if auth.uid() is null or not private.is_platform_admin() then raise exception 'Sólo el administrador puede registrar esta consulta.' using errcode='42501'; end if;
 select * into application from public.company_applications a where a.document_path=admin_document_access.document_path;
 if application.id is null then raise exception 'Documento no encontrado.' using errcode='22023'; end if;
 insert into public.audit_log(actor_id,action,target_id,company_id,details) values(auth.uid(),'admin_document_opened',application.id,application.company_id,jsonb_build_object('name',application.business_name));
end; $$;


ALTER FUNCTION "private"."admin_document_access"("document_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare before_state jsonb; after_state jsonb; company uuid;
begin
 if not private.is_platform_admin() then raise exception 'Sólo los administradores pueden editar cuentas.' using errcode='42501'; end if;
 if length(payload::text)>10000 or coalesce(length(trim(payload->>'name')),0) not between 1 and 150 then
  raise exception 'Ingresá un nombre de hasta 150 caracteres.' using errcode='22023';
 end if;
 if entity_kind='users' then
  select jsonb_build_array(jsonb_build_object('id',id,'name',full_name)) into before_state from public.profiles where id=record_id for update;
  if before_state is null then raise exception 'Usuario no encontrado.' using errcode='22023'; end if;
  update public.profiles set full_name=trim(payload->>'name'),updated_at=now() where id=record_id;
  select jsonb_build_array(jsonb_build_object('id',id,'name',full_name)) into after_state from public.profiles where id=record_id;
 elsif entity_kind='companies' then
  company:=record_id;
  select jsonb_build_array(jsonb_build_object('id',id,'name',name)) into before_state from public.companies where id=record_id for update;
  if before_state is null then raise exception 'Empresa no encontrada.' using errcode='22023'; end if;
  if exists(select 1 from public.company_details where company_id=record_id) then
   before_state := before_state || (select jsonb_build_array(to_jsonb(d) || jsonb_build_object('id',company_id,'name',legal_name)) from public.company_details d where company_id=record_id);
   if coalesce(length(trim(payload->>'phone')),0) not between 1 and 100 or coalesce(length(trim(payload->>'address')),0) not between 1 and 500
     or length(coalesce(payload->>'website',''))>1000 or length(coalesce(payload->>'description',''))>2000 then
    raise exception 'Revisá los datos de contacto.' using errcode='22023';
   end if;
   update public.company_details set phone=trim(payload->>'phone'),address=trim(payload->>'address'),website=payload->>'website',description=payload->>'description' where company_id=record_id;
  end if;
  update public.companies set name=trim(payload->>'name'),updated_at=now() where id=record_id;
  select jsonb_build_array(jsonb_build_object('id',id,'name',name)) into after_state from public.companies where id=record_id;
  after_state := after_state || coalesce((select jsonb_build_array(to_jsonb(d) || jsonb_build_object('id',company_id,'name',legal_name)) from public.company_details d where company_id=record_id),'[]'::jsonb);
 else raise exception 'Tipo de edición inválido.' using errcode='22023';
 end if;
 insert into public.audit_log(actor_id,action,target_id,company_id,details)
  values(auth.uid(),'admin_edit_'||entity_kind,record_id,company,jsonb_build_object('before',before_state,'after',after_state));
end $$;


ALTER FUNCTION "private"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."admin_search_records"("search_text" "text", "entity_kind" "text" DEFAULT 'users'::"text", "page_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare query text := translate(lower(trim(search_text)),'áéíóúüñ','aeiouun'); result jsonb;
begin
 if not private.is_platform_admin() then raise exception 'Sólo los administradores pueden buscar cuentas.' using errcode='42501'; end if;
 if entity_kind not in ('users','companies','points','rewards') or page_offset < 0 or page_offset > 100000 or length(query)>150 then
  raise exception 'Búsqueda inválida.' using errcode='22023';
 end if;
 if query = '' then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(search_rows)), '[]'::jsonb) into result from (
  select * from (
   select 'users'::text as kind, p.id, p.full_name as name, p.email as description, null::uuid as company_id
    from public.profiles p where entity_kind='users'
   union all
   select 'companies', c.id,c.name,c.status,c.id from public.companies c where entity_kind='companies'
   union all
   select 'points',p.id,p.name,p.address,p.company_id from public.green_points p where entity_kind='points'
   union all
   select 'rewards',r.id,r.title,r.business_name,r.company_id from public.rewards r where entity_kind='rewards'
  ) candidates where strpos(translate(lower(coalesce(name,'')),'áéíóúüñ','aeiouun'),query)>0 or strpos(id::text,query)>0
  order by lower(name),id limit 26 offset page_offset
 ) search_rows;
 return result;
end $$;


ALTER FUNCTION "private"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."audit_actor_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare actor jsonb;
begin
 select jsonb_build_object('name',p.full_name,'email',p.email,'role',case
  when exists(select 1 from public.platform_admins a where a.user_id=p.id) then 'platform_admin'
  else 'account' end) into actor from public.profiles p where p.id=new.actor_id;
 new.details := new.details || jsonb_build_object('actor',actor);
 return new;
end; $$;


ALTER FUNCTION "private"."audit_actor_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_profile_for_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "private"."create_profile_for_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_verified_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null;
$$;


ALTER FUNCTION "private"."current_verified_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."delivery_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "private"."delivery_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."delivery_json"("target" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
 select (to_jsonb(d)-'request_payload'-'client_request_id') || jsonb_build_object('items',
  coalesce((select jsonb_agg(to_jsonb(i) order by i.category_name) from public.delivery_items i where i.delivery_id=d.id),'[]'::jsonb))
 from public.deliveries d where d.id=target;
$$;


ALTER FUNCTION "private"."delivery_json"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."global_points"("target" "uuid") RETURNS bigint
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
 select coalesce((select sum(amount) from public.points_transactions where user_id=target),0)
  - coalesce((select sum(points_cost) from public.reward_redemptions where user_id=target),0);
$$;


ALTER FUNCTION "private"."global_points"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_company_role"("target_company" "uuid", "owner_only" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select auth.uid() is not null and exists (
    select 1 from public.company_memberships m
    join public.companies c on c.id = m.company_id
    where m.user_id = auth.uid() and m.company_id = target_company
      and m.status = 'ACTIVE' and c.status = 'ACTIVE'
      and (not owner_only or m.role = 'company_owner')
  );
$$;


ALTER FUNCTION "private"."has_company_role"("target_company" "uuid", "owner_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."invitation_recipient"("invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare inv public.company_invitations%rowtype;
begin
 select * into inv from public.company_invitations where id=invitation_id for update;
 if auth.uid() is null or inv.status is distinct from 'INVITED'
  or not (private.is_platform_admin() or (inv.role='company_worker' and private.has_company_role(inv.company_id,true)))
  or not exists(select 1 from public.companies where id=inv.company_id and status='ACTIVE') then
  raise exception 'No podés enviar esta invitación.' using errcode='42501'; end if;
 if inv.last_email_attempt_at > now()-interval '60 seconds' then
  raise exception 'Esperá un minuto antes de reenviar la invitación.' using errcode='22023'; end if;
 update public.company_invitations set last_email_attempt_at=now() where id=inv.id;
 insert into public.audit_log(actor_id,action,target_id,company_id) values(auth.uid(),'invitation_email_attempt',inv.id,inv.company_id);
 return jsonb_build_object('email',inv.email,'exists',exists(select 1 from auth.users where lower(email)=inv.email));
end; $$;


ALTER FUNCTION "private"."invitation_recipient"("invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select auth.uid() is not null and exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;


ALTER FUNCTION "private"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."my_delivery_balance"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."my_delivery_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."my_points_history"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
 if auth.uid() is null then raise exception 'Iniciá sesión.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id) from (
  select * from (
   select t.id,t.amount,'Entrega confirmada'::text as title,c.name as source,t.created_at
    from public.points_transactions t join public.companies c on c.id=t.company_id where t.user_id=auth.uid()
   union all
   select r.id,-r.points_cost::bigint,r.reward_snapshot->>'title',r.reward_snapshot->>'business_name',r.created_at
    from public.reward_redemptions r where r.user_id=auth.uid()
  ) movements order by created_at desc,id limit 50
 ) m),'[]'::jsonb);
end;
$$;


ALTER FUNCTION "private"."my_points_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."portal_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
#variable_conflict use_variable
<<portal_state>>
declare actor uuid := auth.uid(); admin boolean := private.is_platform_admin();
 target uuid; company uuid; invitation uuid; item jsonb; result jsonb := '{}'::jsonb;
 app public.company_applications%rowtype; inv public.company_invitations%rowtype;
 lim public.company_limit_requests%rowtype; member public.company_memberships%rowtype;
 before_state jsonb; after_state jsonb; email text; used integer; cap integer; status text; day integer;
begin
 if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;
 if operation in ('save_global_xp','save_level') then
  if not admin then raise exception 'Sólo el administrador puede configurar la plataforma.' using errcode='42501'; end if;
  raise exception 'Esta configuración ya no está disponible.' using errcode='22023';
 end if;
 if operation in ('save_global_xp','save_level') then
  if not admin then raise exception 'Sólo el administrador puede configurar la plataforma.' using errcode='42501'; end if;
  raise exception 'Esta configuración ya no está disponible.' using errcode='22023';
 end if;
 if length(payload::text)>50000 then raise exception 'Datos demasiado extensos.' using errcode='22023'; end if;
 target := nullif(payload->>'id','')::uuid;
 company := nullif(payload->>'companyId','')::uuid;
 if admin and operation in ('review_application','review_limit','set_company_status','save_global_xp','save_level') then
  -- Stable lock order prevents overlapping configuration saves from observing stale values.
  case operation
   when 'review_application' then perform 1 from public.company_applications where id=target for update;
   when 'review_limit' then
    perform 1 from public.company_limit_requests where id=target for update;
    perform 1 from public.companies where id=(select company_id from public.company_limit_requests where id=target) for update;
   when 'set_company_status' then perform 1 from public.companies where id=target for update;
   when 'save_global_xp' then perform 1 from public.device_categories where id in (select (value->>'id')::uuid from jsonb_array_elements(payload->'categories')) order by id for update;
   when 'save_level' then perform 1 from public.impact_levels where id=target for update;
  end case;
  before_state := private.admin_change_snapshot(operation,target,payload);
 end if;
 case operation
 when 'submit_application','resubmit_application' then
  if private.current_verified_email() is null then raise exception 'Confirmá tu email antes de solicitar el alta.' using errcode='42501'; end if;
  foreach email in array array['businessName','legalName','corporateEmail','phone','responsible','address','activity','documentPath'] loop
   if coalesce(length(trim(payload->>email)),0) not between 1 and 1000 then raise exception 'Completá los campos obligatorios.' using errcode='22023'; end if;
  end loop;
  if coalesce(payload->>'taxId','') !~ '^[0-9]{11}$' or coalesce(payload->>'corporateEmail','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
   raise exception 'Revisá el CUIT y el email corporativo.' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects where bucket_id='company-documents' and name=payload->>'documentPath'
   and (storage.foldername(name))[1]=actor::text) then raise exception 'Adjuntá la documentación de tu organización.' using errcode='22023'; end if;
  if operation='resubmit_application' then
   select * into app from public.company_applications where id=target for update;
   if app.applicant_id is distinct from actor or app.status <> 'NEEDS_INFO' then raise exception 'No podés modificar esta solicitud.' using errcode='42501'; end if;
   update public.company_applications set business_name=trim(payload->>'businessName'),legal_name=trim(payload->>'legalName'),
    tax_id=payload->>'taxId',corporate_email=lower(trim(payload->>'corporateEmail')),phone=trim(payload->>'phone'),responsible=trim(payload->>'responsible'),
    address=trim(payload->>'address'),activity=trim(payload->>'activity'),website=payload->>'website',description=payload->>'description',
    document_path=payload->>'documentPath',status='SUBMITTED',updated_at=now() where id=target;
  else
   insert into public.company_applications(applicant_id,business_name,legal_name,tax_id,corporate_email,phone,responsible,address,activity,website,description,document_path)
   values(actor,trim(payload->>'businessName'),trim(payload->>'legalName'),payload->>'taxId',lower(trim(payload->>'corporateEmail')),
    trim(payload->>'phone'),trim(payload->>'responsible'),trim(payload->>'address'),trim(payload->>'activity'),payload->>'website',payload->>'description',payload->>'documentPath') returning id into target;
  end if;
 when 'review_application' then
  if not admin then raise exception 'Sólo el administrador puede revisar solicitudes.' using errcode='42501'; end if;
  select * into app from public.company_applications where id=target for update;
  if app.id is null then raise exception 'Solicitud no encontrada.' using errcode='22023'; end if;
  status:=payload->>'status';
  if app.status='APPROVED' and status='APPROVED' then return jsonb_build_object('id',target,'companyId',app.company_id); end if;
  if app.status not in ('SUBMITTED','UNDER_REVIEW') or status not in ('UNDER_REVIEW','NEEDS_INFO','APPROVED','REJECTED') then raise exception 'La solicitud ya cambió de estado. Actualizá la pantalla.' using errcode='22023'; end if;
  if status in ('NEEDS_INFO','REJECTED') and coalesce(length(trim(payload->>'note')),0)<5 then raise exception 'Indicá el motivo de la revisión.' using errcode='22023'; end if;
  if status='APPROVED' then
   insert into public.companies(name) values(app.business_name) returning id into company;
   insert into public.company_details values(company,app.legal_name,app.tax_id,app.corporate_email,app.phone,app.responsible,app.address,app.activity,app.website,app.description);
   select lower(u.email) into email from auth.users u where u.id=app.applicant_id and u.email_confirmed_at is not null;
   if email is null then raise exception 'El responsable debe confirmar su email.' using errcode='22023'; end if;
   insert into public.company_invitations(company_id,email,role,invited_by) values(company,email,'company_owner',actor) returning id into invitation;
   result:=jsonb_build_object('invitationId',invitation,'companyId',company);
  end if;
  update public.company_applications set status=portal_state.status,review_note=payload->>'note',reviewed_by=actor,
   company_id=company,updated_at=now() where id=target;
 when 'accept_invitation' then
  select company_id into company from public.company_invitations where id=target;
  perform 1 from public.companies where id=company and public.companies.status='ACTIVE' for update;
  if not found then raise exception 'La empresa no está activa.' using errcode='42501'; end if;
  select * into inv from public.company_invitations where id=target for update;
  if inv.email is distinct from private.current_verified_email() then raise exception 'Esta invitación corresponde a otra cuenta.' using errcode='42501'; end if;
  if inv.status='ACCEPTED' and inv.accepted_by=actor then return jsonb_build_object('companyId',company); end if;
  if inv.status<>'INVITED' then raise exception 'La invitación ya no está disponible.' using errcode='22023'; end if;
  insert into public.company_memberships(user_id,company_id,role,status) values(actor,company,inv.role,'ACTIVE')
   on conflict(user_id,company_id) do update set status='ACTIVE',role=excluded.role;
  update public.company_invitations set status='ACCEPTED',accepted_by=actor where id=target;
 when 'save_company' then
  if not private.has_company_role(company,true) then raise exception 'Sólo el responsable puede editar la empresa.' using errcode='42501'; end if;
  if coalesce(length(trim(payload->>'name')),0) not between 1 and 150 or coalesce(length(trim(payload->>'phone')),0)=0
   or coalesce(length(trim(payload->>'address')),0)=0 then raise exception 'Completá nombre, teléfono y dirección.' using errcode='22023'; end if;
  update public.companies set name=trim(payload->>'name') where id=company;
  update public.company_details set phone=trim(payload->>'phone'),address=trim(payload->>'address'),website=payload->>'website',description=payload->>'description' where company_id=company;
 when 'admin_save_point' then
  if not admin then raise exception 'Sólo los administradores pueden dar de alta puntos verdes.' using errcode='42501'; end if;
  if company is null then
   if target is not null then raise exception 'Elegí la institución del punto.' using errcode='22023'; end if;
   if coalesce(length(trim(payload->>'companyName')),0) not between 1 and 150 then
    raise exception 'Ingresá el nombre de la institución responsable.' using errcode='22023';
   end if;
   insert into public.companies(name) values(trim(payload->>'companyName')) returning id into company;
   insert into public.audit_log(actor_id,action,target_id,company_id,details)
    values(actor,'create_point_organization',company,company,jsonb_build_object('name',trim(payload->>'companyName')));
  end if;
  return private.portal_command('save_point',payload || jsonb_build_object('companyId',company));
 when 'save_point' then
  if not admin and not private.has_company_role(company,true) then raise exception 'Sólo el responsable o un administrador puede editar puntos verdes.' using errcode='42501'; end if;
  if target is null and not admin then raise exception 'Sólo los administradores pueden dar de alta puntos verdes.' using errcode='42501'; end if;
  perform 1 from public.companies where id=company for update;
  if not found then raise exception 'Institución no encontrada.' using errcode='22023'; end if;
  if target is not null and not exists(select 1 from public.green_points where id=target and company_id=company) then raise exception 'Punto no encontrado en tu empresa.' using errcode='42501'; end if;
  if coalesce(length(trim(payload->>'name')),0) not between 1 and 150 or coalesce(length(trim(payload->>'address')),0)=0
   or jsonb_array_length(coalesce(payload->'categories','[]'))=0 then raise exception 'Completá nombre, dirección y categorías.' using errcode='22023'; end if;
  if coalesce((payload->>'active')::boolean,false) and jsonb_array_length(coalesce(payload->'schedules','[]'))=0 then raise exception 'Agregá horarios antes de publicar.' using errcode='22023'; end if;
  if target is null then
   insert into public.green_points(company_id,name,address,latitude,longitude,phone,description,time_zone,active,pickup_enabled)
   values(company,trim(payload->>'name'),trim(payload->>'address'),(payload->>'latitude')::float8,(payload->>'longitude')::float8,
    payload->>'phone',payload->>'description',payload->>'timeZone',(payload->>'active')::boolean,(payload->>'pickupEnabled')::boolean) returning id into target;
  else
   update public.green_points set name=trim(payload->>'name'),address=trim(payload->>'address'),latitude=(payload->>'latitude')::float8,
    longitude=(payload->>'longitude')::float8,phone=payload->>'phone',description=payload->>'description',time_zone=payload->>'timeZone',
    active=(payload->>'active')::boolean,pickup_enabled=(payload->>'pickupEnabled')::boolean where id=target;
  end if;
  delete from public.green_point_schedules where green_point_id=target;
  for item in select value from jsonb_array_elements(payload->'schedules') loop
   insert into public.green_point_schedules(green_point_id,weekday,opens_minute,closes_minute)
    values(target,(item->>'weekday')::int,(item->>'opensMinute')::int,(item->>'closesMinute')::int);
  end loop;
  delete from public.green_point_device_categories where green_point_id=target;
  for item in select value from jsonb_array_elements(payload->'categories') loop
   if not exists(select 1 from public.device_categories where id=(item#>>'{}')::uuid and active) then raise exception 'Categoría no disponible.' using errcode='22023'; end if;
   insert into public.green_point_device_categories values(target,(item#>>'{}')::uuid);
  end loop;
 when 'save_points' then
  if not private.has_company_role(company,true) then raise exception 'Sólo el responsable puede configurar puntos.' using errcode='42501'; end if;
  for item in select value from jsonb_array_elements(payload->'categories') loop
   if not exists(select 1 from public.device_categories where id=(item->>'id')::uuid and active) then raise exception 'Categoría no disponible.' using errcode='22023'; end if;
   insert into public.company_device_points values(company,(item->>'id')::uuid,(item->>'points')::int)
    on conflict(company_id,device_category_id) do update set points=excluded.points;
  end loop;
 when 'invite_worker' then
  if not private.has_company_role(company,true) then raise exception 'Sólo el responsable puede invitar trabajadores.' using errcode='42501'; end if;
  select worker_limit into cap from public.companies where id=company for update;
  email:=lower(trim(payload->>'email'));
  if email is null or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Ingresá un email válido.' using errcode='22023'; end if;
  if exists(select 1 from public.company_memberships m join auth.users u on u.id=m.user_id where m.company_id=company and lower(u.email)=email and m.status<>'DISABLED') then raise exception 'La persona ya pertenece al equipo.' using errcode='22023'; end if;
  if exists(select 1 from public.company_memberships m join auth.users u on u.id=m.user_id where m.company_id=company and lower(u.email)=email and m.role='company_owner') then raise exception 'No podés cambiar el rol de un responsable.' using errcode='42501'; end if;
  select (select count(*) from public.company_memberships where company_id=company and role='company_worker' and public.company_memberships.status in ('ACTIVE','INVITED'))+
   (select count(*) from public.company_invitations where company_id=company and role='company_worker' and public.company_invitations.status='INVITED') into used;
  if used>=cap then raise exception 'Alcanzaste el límite de trabajadores. Solicitá una ampliación.' using errcode='22023'; end if;
  insert into public.company_invitations(company_id,email,role,invited_by) values(company,email,'company_worker',actor) returning id into invitation;
  result:=jsonb_build_object('invitationId',invitation);
 when 'cancel_invitation' then
  select * into inv from public.company_invitations where id=target;
  company:=inv.company_id;
  if not private.has_company_role(company,true) or inv.role<>'company_worker' then raise exception 'No podés cancelar esta invitación.' using errcode='42501'; end if;
  perform 1 from public.companies where id=company for update;
  update public.company_invitations set status='CANCELLED' where id=target and public.company_invitations.status='INVITED';
 when 'set_member_status' then
  select * into member from public.company_memberships where id=target;
  company:=member.company_id;
  if not private.has_company_role(company,true) or member.role<>'company_worker' then raise exception 'No podés cambiar este acceso.' using errcode='42501'; end if;
  select worker_limit into cap from public.companies where id=company for update;
  status:=payload->>'status';
  if status not in ('ACTIVE','DISABLED') then raise exception 'Estado inválido.' using errcode='22023'; end if;
  if status='ACTIVE' and member.status='DISABLED' then
   select (select count(*) from public.company_memberships where company_id=company and role='company_worker' and public.company_memberships.status in ('ACTIVE','INVITED'))+
    (select count(*) from public.company_invitations where company_id=company and role='company_worker' and public.company_invitations.status='INVITED') into used;
   if used>=cap then raise exception 'Alcanzaste el límite de trabajadores.' using errcode='22023'; end if;
  end if;
  update public.company_memberships set status=portal_state.status where id=target;
 when 'request_limit' then
  if not private.has_company_role(company,true) then raise exception 'Sólo el responsable puede solicitar una ampliación.' using errcode='42501'; end if;
  select worker_limit into cap from public.companies where id=company for update;
  if (payload->>'limit')::int<=cap or coalesce(length(trim(payload->>'reason')),0)<10 then raise exception 'Indicá un límite mayor y el motivo de la ampliación.' using errcode='22023'; end if;
  insert into public.company_limit_requests(company_id,requested_by,requested_limit,reason) values(company,actor,(payload->>'limit')::int,trim(payload->>'reason')) returning id into target;
 when 'review_limit' then
  if not admin then raise exception 'Sólo el administrador puede revisar límites.' using errcode='42501'; end if;
  select * into lim from public.company_limit_requests where id=target for update;
  if lim.id is null or lim.status<>'SUBMITTED' or payload->>'status' not in ('APPROVED','REJECTED') then raise exception 'La solicitud ya cambió de estado.' using errcode='22023'; end if;
  company:=lim.company_id;
  if payload->>'status'='APPROVED' then update public.companies set worker_limit=greatest(worker_limit,lim.requested_limit) where id=company; end if;
  update public.company_limit_requests set status=payload->>'status',review_note=payload->>'note' where id=target;
 when 'set_company_status' then
  if not admin then raise exception 'Sólo el administrador puede suspender o reactivar empresas.' using errcode='42501'; end if;
  if payload->>'status' not in ('ACTIVE','SUSPENDED') or coalesce(length(trim(payload->>'note')),0)<5 then raise exception 'Indicá el estado y el motivo del cambio.' using errcode='22023'; end if;
  company:=target;
  update public.companies set status=payload->>'status' where id=target;
  if not found then raise exception 'Empresa no encontrada.' using errcode='22023'; end if;
 when 'save_global_xp' then
  if not admin then raise exception 'Sólo el administrador puede configurar XP.' using errcode='42501'; end if;
  for item in select value from jsonb_array_elements(payload->'categories') loop
   update public.device_categories set impact_xp=(item->>'xp')::int where id=(item->>'id')::uuid;
  end loop;
 when 'save_level' then
  if not admin then raise exception 'Sólo el administrador puede configurar niveles.' using errcode='42501'; end if;
  if target is null then insert into public.impact_levels(name,minimum_xp) values(trim(payload->>'name'),(payload->>'minimumXp')::int) returning id into target;
  else update public.impact_levels set name=trim(payload->>'name'),minimum_xp=(payload->>'minimumXp')::int where id=target; end if;
 else raise exception 'Operación no disponible.' using errcode='22023';
 end case;
 if before_state is not null then after_state := private.admin_change_snapshot(operation,target,payload); end if;
 insert into public.audit_log(actor_id,action,target_id,company_id,details)
 values(actor,operation,target,company,jsonb_build_object('status',payload->>'status','note',payload->>'note','before',before_state,'after',after_state));
 return result || jsonb_build_object('id',target,'companyId',company);
end;
$_$;


ALTER FUNCTION "private"."portal_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."redemption_json"("target" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
 select to_jsonb(r)-'client_request_id'-'request_payload' from public.reward_redemptions r where id=target;
$$;


ALTER FUNCTION "private"."redemption_json"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."reward_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
 actor uuid:=auth.uid(); company uuid; target uuid; request_id uuid;
 r public.rewards%rowtype; redemption public.reward_redemptions%rowtype;
 random_token text; code text;
begin
 if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or length(payload::text)>15000 then
  raise exception 'Datos inválidos.' using errcode='22023'; end if;

 if operation='save' then
  if not private.is_platform_admin() then
   raise exception 'Sólo los administradores pueden publicar premios.' using errcode='42501'; end if;
  company:=(payload->>'companyId')::uuid;
  perform 1 from public.companies where id=company and status='ACTIVE' for share;
  if not found then raise exception 'Seleccioná un comercio activo.' using errcode='22023'; end if;
  target:=nullif(payload->>'id','')::uuid;
  if target is not null then
   select * into r from public.rewards where id=target and company_id=company for update;
   if not found then raise exception 'Premio ajeno a esta empresa.' using errcode='42501'; end if;
  end if;
  if target is null then
   insert into public.rewards(company_id,title,description,category,points_cost,image_url,business_name,address,hours,latitude,longitude,stock,active,starts_at,ends_at)
   values(company,trim(payload->>'title'),coalesce(payload->>'description',''),payload->>'category',(payload->>'pointsCost')::integer,
    nullif(payload->>'imageUrl',''),trim(payload->>'businessName'),trim(payload->>'address'),coalesce(payload->>'hours',''),
    (payload->>'latitude')::double precision,(payload->>'longitude')::double precision,(payload->>'stock')::integer,
    coalesce((payload->>'active')::boolean,false),nullif(payload->>'startsAt','')::timestamptz,nullif(payload->>'endsAt','')::timestamptz)
   returning * into r;
  else
   update public.rewards set title=trim(payload->>'title'),description=coalesce(payload->>'description',''),category=payload->>'category',
    points_cost=(payload->>'pointsCost')::integer,image_url=nullif(payload->>'imageUrl',''),business_name=trim(payload->>'businessName'),
    address=trim(payload->>'address'),hours=coalesce(payload->>'hours',''),latitude=(payload->>'latitude')::double precision,
    longitude=(payload->>'longitude')::double precision,stock=(payload->>'stock')::integer,active=coalesce((payload->>'active')::boolean,false),
    starts_at=nullif(payload->>'startsAt','')::timestamptz,ends_at=nullif(payload->>'endsAt','')::timestamptz
    where id=target returning * into r;
  end if;
  insert into public.audit_log(actor_id,action,target_id,company_id) values(actor,'reward_saved',r.id,company);
  return to_jsonb(r);
 end if;

 if operation='reserve' then
  if private.current_verified_email() is null then raise exception 'Confirmá tu email antes de canjear.' using errcode='42501'; end if;
  request_id:=(payload->>'requestId')::uuid;
  if request_id is null then raise exception 'Identificador de solicitud requerido.' using errcode='22023'; end if;
  -- All debits for the user serialize, including requests for different rewards/companies.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('wallet:'||actor::text,0));
  select * into redemption from public.reward_redemptions where user_id=actor and client_request_id=request_id;
  if found then
   if redemption.request_payload is distinct from payload then raise exception 'No reutilices la solicitud con otros datos.' using errcode='22023'; end if;
   return private.redemption_json(redemption.id);
  end if;
  select company_id into company from public.rewards where id=(payload->>'rewardId')::uuid;
  perform 1 from public.companies where id=company and status='ACTIVE' for share;
  if not found then raise exception 'El comercio no está disponible.' using errcode='22023'; end if;
  select * into r from public.rewards where id=(payload->>'rewardId')::uuid for update;
  if not found or not r.active or (r.starts_at is not null and r.starts_at>now()) or (r.ends_at is not null and r.ends_at<=now()) then
   raise exception 'Este premio ya no está disponible.' using errcode='22023'; end if;
  if r.stock=0 then raise exception 'Este premio está agotado.' using errcode='22023'; end if;
  if private.global_points(actor)<r.points_cost then raise exception 'Todavía no tenés puntos suficientes.' using errcode='22023'; end if;
  random_token:=upper(replace(pg_catalog.gen_random_uuid()::text,'-',''));
  code:='TRR-'||substring(random_token,1,8)||'-'||substring(random_token,9,8)||'-'||substring(random_token,17,8)||'-'||substring(random_token,25,8);
  insert into public.reward_redemptions(user_id,reward_id,company_id,citizen_name,points_cost,reward_snapshot,verification_token,client_request_id,request_payload)
   select actor,r.id,r.company_id,p.full_name,r.points_cost,to_jsonb(r),code,request_id,payload from public.profiles p where p.id=actor
   returning id into target;
  if r.stock is not null then update public.rewards set stock=stock-1 where id=r.id; end if;
  insert into public.audit_log(actor_id,action,target_id,company_id,details)
   values(actor,'reward_reserved',target,r.company_id,jsonb_build_object('points',r.points_cost));
  return private.redemption_json(target);
 end if;

 if operation in ('lookup','confirm') then
  company:=(payload->>'companyId')::uuid;
  perform 1 from public.companies where id=company and status='ACTIVE' for share;
  if not found or not private.has_company_role(company) then raise exception 'No tenés acceso operativo a esta empresa.' using errcode='42501'; end if;
  perform 1 from public.company_memberships where user_id=actor and company_id=company and status='ACTIVE' for share;
  code:=upper(trim(payload->>'code'));
  select * into redemption from public.reward_redemptions where verification_token=code and company_id=company for update;
  if not found then raise exception 'Código no encontrado para esta empresa.' using errcode='22023'; end if;
 elsif operation='get' then
  select * into redemption from public.reward_redemptions where id=(payload->>'id')::uuid and user_id=actor;
  if not found then raise exception 'No podés acceder a este canje.' using errcode='42501'; end if;
 else raise exception 'Operación no disponible.' using errcode='22023';
 end if;
 if operation='confirm' and redemption.status='RESERVED' then
  if redemption.user_id=actor then raise exception 'Otra persona del equipo debe entregar tu premio.' using errcode='42501'; end if;
  update public.reward_redemptions set status='REDEEMED',redeemed_at=now(),redeemed_by=actor where id=redemption.id;
  insert into public.audit_log(actor_id,action,target_id,company_id) values(actor,'reward_redeemed',redemption.id,company);
 end if;
 return private.redemption_json(redemption.id);
end;
$$;


ALTER FUNCTION "private"."reward_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_initial_level"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
 if old.minimum_xp=0 and new.minimum_xp<>0 then raise exception 'El nivel inicial debe comenzar en 0 XP.' using errcode='22023'; end if;
 return new;
end; $$;


ALTER FUNCTION "private"."validate_initial_level"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_point_time_zone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Invalid point time zone' using errcode = '22023';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."validate_point_time_zone"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_changelog"("page_offset" integer DEFAULT 0, "search_text" "text" DEFAULT ''::"text", "admins_only" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 select private.admin_changelog(page_offset,search_text,true);
$$;


ALTER FUNCTION "public"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_document_access"("document_path" "text") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$ select private.admin_document_access(document_path); $$;


ALTER FUNCTION "public"."admin_document_access"("document_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
select private.admin_edit_record(entity_kind,record_id,payload);
$$;


ALTER FUNCTION "public"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_search_records"("search_text" "text", "entity_kind" "text" DEFAULT 'users'::"text", "page_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
select private.admin_search_records(search_text,entity_kind,page_offset);
$$;


ALTER FUNCTION "public"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delivery_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$ select private.delivery_command(operation,payload); $$;


ALTER FUNCTION "public"."delivery_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invitation_recipient"("invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$ select private.invitation_recipient(invitation_id); $$;


ALTER FUNCTION "public"."invitation_recipient"("invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_delivery_balance"() RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 select private.my_delivery_balance();
$$;


ALTER FUNCTION "public"."my_delivery_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_points_history"() RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 select private.my_points_history();
$$;


ALTER FUNCTION "public"."my_points_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$ select private.portal_command(operation,payload); $$;


ALTER FUNCTION "public"."portal_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reward_command"("operation" "text", "payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
 select private.reward_command(operation,payload);
$$;


ALTER FUNCTION "public"."reward_command"("operation" "text", "payload" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_id" "uuid",
    "company_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "worker_limit" integer DEFAULT 20 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "companies_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "companies_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'SUSPENDED'::"text"]))),
    CONSTRAINT "companies_worker_limit_check" CHECK (("worker_limit" > 0))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "business_name" "text" NOT NULL,
    "legal_name" "text" NOT NULL,
    "tax_id" "text" NOT NULL,
    "corporate_email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "responsible" "text" NOT NULL,
    "address" "text" NOT NULL,
    "activity" "text" NOT NULL,
    "website" "text",
    "description" "text",
    "document_path" "text" NOT NULL,
    "status" "text" DEFAULT 'SUBMITTED'::"text" NOT NULL,
    "review_note" "text",
    "reviewed_by" "uuid",
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_applications_status_check" CHECK (("status" = ANY (ARRAY['SUBMITTED'::"text", 'UNDER_REVIEW'::"text", 'NEEDS_INFO'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."company_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_details" (
    "company_id" "uuid" NOT NULL,
    "legal_name" "text" NOT NULL,
    "tax_id" "text" NOT NULL,
    "corporate_email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "responsible" "text" NOT NULL,
    "address" "text" NOT NULL,
    "activity" "text" NOT NULL,
    "website" "text",
    "description" "text"
);


ALTER TABLE "public"."company_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_device_points" (
    "company_id" "uuid" NOT NULL,
    "device_category_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    CONSTRAINT "company_device_points_points_check" CHECK ((("points" >= 0) AND ("points" <= 1000000)))
);


ALTER TABLE "public"."company_device_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'INVITED'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_email_attempt_at" timestamp with time zone,
    CONSTRAINT "company_invitations_email_check" CHECK (("email" = "lower"(TRIM(BOTH FROM "email")))),
    CONSTRAINT "company_invitations_role_check" CHECK (("role" = ANY (ARRAY['company_owner'::"text", 'company_worker'::"text"]))),
    CONSTRAINT "company_invitations_status_check" CHECK (("status" = ANY (ARRAY['INVITED'::"text", 'ACCEPTED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."company_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_limit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "requested_limit" integer NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'SUBMITTED'::"text" NOT NULL,
    "review_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_limit_requests_requested_limit_check" CHECK ((("requested_limit" >= 1) AND ("requested_limit" <= 10000))),
    CONSTRAINT "company_limit_requests_status_check" CHECK (("status" = ANY (ARRAY['SUBMITTED'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."company_limit_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'INVITED'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_memberships_role_check" CHECK (("role" = ANY (ARRAY['company_owner'::"text", 'company_worker'::"text"]))),
    CONSTRAINT "company_memberships_status_check" CHECK (("status" = ANY (ARRAY['INVITED'::"text", 'ACTIVE'::"text", 'DISABLED'::"text"])))
);


ALTER TABLE "public"."company_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "green_point_id" "uuid" NOT NULL,
    "citizen_name" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "point_name" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING_RECEPTION'::"text" NOT NULL,
    "verification_token" "text" NOT NULL,
    "client_request_id" "uuid" NOT NULL,
    "request_payload" "jsonb" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "photo_path" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "confirmed_by" "uuid",
    "token_used_at" timestamp with time zone,
    "confirmed_points" bigint DEFAULT 0 NOT NULL,
    "confirmed_xp" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "deliveries_check" CHECK ((("status" = 'CONFIRMED'::"text") = (("confirmed_at" IS NOT NULL) AND ("confirmed_by" IS NOT NULL) AND ("token_used_at" IS NOT NULL)))),
    CONSTRAINT "deliveries_confirmed_points_check" CHECK (("confirmed_points" >= 0)),
    CONSTRAINT "deliveries_confirmed_xp_check" CHECK (("confirmed_xp" >= 0)),
    CONSTRAINT "deliveries_notes_check" CHECK (("length"("notes") <= 2000)),
    CONSTRAINT "deliveries_status_check" CHECK (("status" = ANY (ARRAY['PENDING_RECEPTION'::"text", 'CONFIRMED'::"text", 'CANCELLED'::"text", 'EXPIRED'::"text"])))
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_items" (
    "delivery_id" "uuid" NOT NULL,
    "device_category_id" "uuid" NOT NULL,
    "category_name" "text" NOT NULL,
    "declared_quantity" integer NOT NULL,
    "confirmed_quantity" integer,
    "points_snapshot" integer NOT NULL,
    "impact_xp_snapshot" integer NOT NULL,
    CONSTRAINT "delivery_items_confirmed_quantity_check" CHECK ((("confirmed_quantity" >= 0) AND ("confirmed_quantity" <= 999))),
    CONSTRAINT "delivery_items_declared_quantity_check" CHECK ((("declared_quantity" >= 1) AND ("declared_quantity" <= 999))),
    CONSTRAINT "delivery_items_impact_xp_snapshot_check" CHECK ((("impact_xp_snapshot" >= 0) AND ("impact_xp_snapshot" <= 1000000))),
    CONSTRAINT "delivery_items_points_snapshot_check" CHECK ((("points_snapshot" >= 0) AND ("points_snapshot" <= 1000000)))
);


ALTER TABLE "public"."delivery_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "impact_xp" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "device_categories_impact_xp_check" CHECK ((("impact_xp" >= 0) AND ("impact_xp" <= 1000000))),
    CONSTRAINT "device_categories_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "device_categories_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."device_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."green_point_device_categories" (
    "green_point_id" "uuid" NOT NULL,
    "device_category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."green_point_device_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."green_point_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "green_point_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "opens_minute" smallint NOT NULL,
    "closes_minute" smallint NOT NULL,
    CONSTRAINT "green_point_schedules_check" CHECK ((("closes_minute" > "opens_minute") AND ("closes_minute" <= ("opens_minute" + 1440)))),
    CONSTRAINT "green_point_schedules_opens_minute_check" CHECK ((("opens_minute" >= 0) AND ("opens_minute" <= 1439))),
    CONSTRAINT "green_point_schedules_weekday_check" CHECK ((("weekday" >= 1) AND ("weekday" <= 7)))
);


ALTER TABLE "public"."green_point_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."green_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "phone" "text",
    "description" "text",
    "time_zone" "text" DEFAULT 'America/Argentina/Buenos_Aires'::"text" NOT NULL,
    "active" boolean DEFAULT false NOT NULL,
    "pickup_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "green_points_address_check" CHECK (("length"(TRIM(BOTH FROM "address")) > 0)),
    CONSTRAINT "green_points_latitude_check" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "green_points_longitude_check" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision))),
    CONSTRAINT "green_points_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."green_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impact_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "minimum_xp" integer NOT NULL,
    CONSTRAINT "impact_levels_minimum_xp_check" CHECK (("minimum_xp" >= 0)),
    CONSTRAINT "impact_levels_name_check" CHECK ((("length"(TRIM(BOTH FROM "name")) >= 1) AND ("length"(TRIM(BOTH FROM "name")) <= 80)))
);


ALTER TABLE "public"."impact_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impact_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" bigint NOT NULL,
    "type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "impact_transactions_amount_check" CHECK (("amount" > 0)),
    CONSTRAINT "impact_transactions_type_check" CHECK (("type" = 'DELIVERY'::"text"))
);


ALTER TABLE "public"."impact_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "amount" bigint NOT NULL,
    "type" "text" NOT NULL,
    "reference_type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "points_transactions_amount_check" CHECK (("amount" > 0)),
    CONSTRAINT "points_transactions_reference_type_check" CHECK (("reference_type" = 'DELIVERY'::"text")),
    CONSTRAINT "points_transactions_type_check" CHECK (("type" = 'DELIVERY'::"text"))
);


ALTER TABLE "public"."points_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "citizen_name" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "reward_snapshot" "jsonb" NOT NULL,
    "verification_token" "text" NOT NULL,
    "client_request_id" "uuid" NOT NULL,
    "request_payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'RESERVED'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "redeemed_at" timestamp with time zone,
    "redeemed_by" "uuid",
    CONSTRAINT "reward_redemptions_check" CHECK ((("status" = 'REDEEMED'::"text") = (("redeemed_at" IS NOT NULL) AND ("redeemed_by" IS NOT NULL)))),
    CONSTRAINT "reward_redemptions_points_cost_check" CHECK (("points_cost" > 0)),
    CONSTRAINT "reward_redemptions_status_check" CHECK (("status" = ANY (ARRAY['RESERVED'::"text", 'REDEEMED'::"text"])))
);


ALTER TABLE "public"."reward_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "image_url" "text",
    "business_name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "hours" "text" DEFAULT ''::"text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "stock" integer,
    "active" boolean DEFAULT false NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rewards_address_check" CHECK ((("length"(TRIM(BOTH FROM "address")) >= 1) AND ("length"(TRIM(BOTH FROM "address")) <= 300))),
    CONSTRAINT "rewards_business_name_check" CHECK ((("length"(TRIM(BOTH FROM "business_name")) >= 1) AND ("length"(TRIM(BOTH FROM "business_name")) <= 120))),
    CONSTRAINT "rewards_category_check" CHECK (("category" = ANY (ARRAY['food'::"text", 'wellness'::"text", 'education'::"text", 'shopping'::"text", 'other'::"text"]))),
    CONSTRAINT "rewards_check" CHECK ((("latitude" IS NULL) = ("longitude" IS NULL))),
    CONSTRAINT "rewards_check1" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("starts_at" < "ends_at"))),
    CONSTRAINT "rewards_description_check" CHECK (("length"("description") <= 2000)),
    CONSTRAINT "rewards_hours_check" CHECK (("length"("hours") <= 500)),
    CONSTRAINT "rewards_image_url_check" CHECK ((("image_url" IS NULL) OR (("length"("image_url") <= 2000) AND ("image_url" ~ '^https://'::"text")))),
    CONSTRAINT "rewards_latitude_check" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "rewards_longitude_check" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision))),
    CONSTRAINT "rewards_points_cost_check" CHECK ((("points_cost" >= 1) AND ("points_cost" <= 1000000))),
    CONSTRAINT "rewards_stock_check" CHECK ((("stock" >= 0) AND ("stock" <= 1000000))),
    CONSTRAINT "rewards_title_check" CHECK ((("length"(TRIM(BOTH FROM "title")) >= 1) AND ("length"(TRIM(BOTH FROM "title")) <= 120)))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_applications"
    ADD CONSTRAINT "company_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_details"
    ADD CONSTRAINT "company_details_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."company_details"
    ADD CONSTRAINT "company_details_tax_id_key" UNIQUE ("tax_id");



ALTER TABLE ONLY "public"."company_device_points"
    ADD CONSTRAINT "company_device_points_pkey" PRIMARY KEY ("company_id", "device_category_id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_limit_requests"
    ADD CONSTRAINT "company_limit_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_user_id_client_request_id_key" UNIQUE ("user_id", "client_request_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_verification_token_key" UNIQUE ("verification_token");



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("delivery_id", "device_category_id");



ALTER TABLE ONLY "public"."device_categories"
    ADD CONSTRAINT "device_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_categories"
    ADD CONSTRAINT "device_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."green_point_device_categories"
    ADD CONSTRAINT "green_point_device_categories_pkey" PRIMARY KEY ("green_point_id", "device_category_id");



ALTER TABLE ONLY "public"."green_point_schedules"
    ADD CONSTRAINT "green_point_schedules_green_point_id_weekday_opens_minute_key" UNIQUE ("green_point_id", "weekday", "opens_minute");



ALTER TABLE ONLY "public"."green_point_schedules"
    ADD CONSTRAINT "green_point_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."green_points"
    ADD CONSTRAINT "green_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_levels"
    ADD CONSTRAINT "impact_levels_minimum_xp_key" UNIQUE ("minimum_xp");



ALTER TABLE ONLY "public"."impact_levels"
    ADD CONSTRAINT "impact_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_transactions"
    ADD CONSTRAINT "impact_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_transactions"
    ADD CONSTRAINT "impact_transactions_reference_id_key" UNIQUE ("reference_id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_reference_id_key" UNIQUE ("reference_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_user_id_client_request_id_key" UNIQUE ("user_id", "client_request_id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_verification_token_key" UNIQUE ("verification_token");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "applications_one_open_per_user" ON "public"."company_applications" USING "btree" ("applicant_id") WHERE ("status" = ANY (ARRAY['SUBMITTED'::"text", 'UNDER_REVIEW'::"text", 'NEEDS_INFO'::"text"]));



CREATE INDEX "applications_status_idx" ON "public"."company_applications" USING "btree" ("status", "created_at");



CREATE UNIQUE INDEX "applications_tax_id" ON "public"."company_applications" USING "btree" ("tax_id") WHERE ("status" <> 'REJECTED'::"text");



CREATE INDEX "audit_log_created_idx" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "company_memberships_company_idx" ON "public"."company_memberships" USING "btree" ("company_id");



CREATE INDEX "deliveries_company_date_idx" ON "public"."deliveries" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "deliveries_confirmed_by_idx" ON "public"."deliveries" USING "btree" ("confirmed_by") WHERE ("confirmed_by" IS NOT NULL);



CREATE INDEX "deliveries_point_idx" ON "public"."deliveries" USING "btree" ("green_point_id");



CREATE INDEX "deliveries_user_date_idx" ON "public"."deliveries" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "delivery_items_category_idx" ON "public"."delivery_items" USING "btree" ("device_category_id");



CREATE INDEX "green_point_categories_category_idx" ON "public"."green_point_device_categories" USING "btree" ("device_category_id");



CREATE INDEX "green_points_active_idx" ON "public"."green_points" USING "btree" ("name", "id") WHERE "active";



CREATE INDEX "green_points_company_idx" ON "public"."green_points" USING "btree" ("company_id");



CREATE INDEX "impact_transactions_user_idx" ON "public"."impact_transactions" USING "btree" ("user_id");



CREATE INDEX "invitations_email_idx" ON "public"."company_invitations" USING "btree" ("email");



CREATE UNIQUE INDEX "invitations_open_email" ON "public"."company_invitations" USING "btree" ("company_id", "email") WHERE ("status" = 'INVITED'::"text");



CREATE UNIQUE INDEX "limits_one_open" ON "public"."company_limit_requests" USING "btree" ("company_id") WHERE ("status" = 'SUBMITTED'::"text");



CREATE INDEX "points_transactions_company_idx" ON "public"."points_transactions" USING "btree" ("company_id");



CREATE INDEX "points_transactions_user_company_idx" ON "public"."points_transactions" USING "btree" ("user_id", "company_id");



CREATE INDEX "redemptions_actor_idx" ON "public"."reward_redemptions" USING "btree" ("redeemed_by") WHERE ("redeemed_by" IS NOT NULL);



CREATE INDEX "redemptions_company_idx" ON "public"."reward_redemptions" USING "btree" ("company_id");



CREATE INDEX "redemptions_reward_idx" ON "public"."reward_redemptions" USING "btree" ("reward_id");



CREATE INDEX "redemptions_user_date_idx" ON "public"."reward_redemptions" USING "btree" ("user_id", "created_at" DESC, "id");



CREATE INDEX "rewards_catalog_idx" ON "public"."rewards" USING "btree" ("created_at" DESC, "id") WHERE "active";



CREATE INDEX "rewards_company_idx" ON "public"."rewards" USING "btree" ("company_id");



CREATE OR REPLACE TRIGGER "audit_actor_snapshot" BEFORE INSERT ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "private"."audit_actor_snapshot"();



CREATE OR REPLACE TRIGGER "green_point_time_zone" BEFORE INSERT OR UPDATE OF "time_zone" ON "public"."green_points" FOR EACH ROW EXECUTE FUNCTION "private"."validate_point_time_zone"();



CREATE OR REPLACE TRIGGER "green_point_updated" BEFORE UPDATE ON "public"."green_points" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "keep_initial_impact_level" BEFORE UPDATE ON "public"."impact_levels" FOR EACH ROW EXECUTE FUNCTION "private"."validate_initial_level"();



CREATE OR REPLACE TRIGGER "reward_updated" BEFORE UPDATE ON "public"."rewards" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tecnoraee_company_updated" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tecnoraee_membership_updated" BEFORE UPDATE ON "public"."company_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tecnoraee_profile_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_applications"
    ADD CONSTRAINT "company_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_applications"
    ADD CONSTRAINT "company_applications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_applications"
    ADD CONSTRAINT "company_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_details"
    ADD CONSTRAINT "company_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_device_points"
    ADD CONSTRAINT "company_device_points_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_device_points"
    ADD CONSTRAINT "company_device_points_device_category_id_fkey" FOREIGN KEY ("device_category_id") REFERENCES "public"."device_categories"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_limit_requests"
    ADD CONSTRAINT "company_limit_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_limit_requests"
    ADD CONSTRAINT "company_limit_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_memberships"
    ADD CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_green_point_id_fkey" FOREIGN KEY ("green_point_id") REFERENCES "public"."green_points"("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id");



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_device_category_id_fkey" FOREIGN KEY ("device_category_id") REFERENCES "public"."device_categories"("id");



ALTER TABLE ONLY "public"."green_point_device_categories"
    ADD CONSTRAINT "green_point_device_categories_device_category_id_fkey" FOREIGN KEY ("device_category_id") REFERENCES "public"."device_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."green_point_device_categories"
    ADD CONSTRAINT "green_point_device_categories_green_point_id_fkey" FOREIGN KEY ("green_point_id") REFERENCES "public"."green_points"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."green_point_schedules"
    ADD CONSTRAINT "green_point_schedules_green_point_id_fkey" FOREIGN KEY ("green_point_id") REFERENCES "public"."green_points"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."green_points"
    ADD CONSTRAINT "green_points_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impact_transactions"
    ADD CONSTRAINT "impact_transactions_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "public"."deliveries"("id");



ALTER TABLE ONLY "public"."impact_transactions"
    ADD CONSTRAINT "impact_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "public"."deliveries"("id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



CREATE POLICY "accepted_categories_point_read" ON "public"."green_point_device_categories" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."green_points" "p"
  WHERE ("p"."id" = "green_point_device_categories"."green_point_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."device_categories" "c"
  WHERE (("c"."id" = "green_point_device_categories"."device_category_id") AND "c"."active")))));



CREATE POLICY "applications_read" ON "public"."company_applications" FOR SELECT TO "authenticated" USING ((("applicant_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "audit_admin_read" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_platform_admin"() AS "is_platform_admin"));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_admin_read" ON "public"."device_categories" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_platform_admin"() AS "is_platform_admin"));



CREATE POLICY "categories_public_active" ON "public"."device_categories" FOR SELECT TO "authenticated", "anon" USING ("active");



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_member_read" ON "public"."companies" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."company_memberships" "m"
  WHERE (("m"."company_id" = "companies"."id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "companies_owner_update" ON "public"."companies" FOR UPDATE TO "authenticated" USING ("private"."has_company_role"("id", true)) WITH CHECK ("private"."has_company_role"("id", true));



CREATE POLICY "companies_public_active" ON "public"."companies" FOR SELECT TO "authenticated", "anon" USING (("status" = 'ACTIVE'::"text"));



ALTER TABLE "public"."company_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_device_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_limit_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_points_citizen_read" ON "public"."company_device_points" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "company_device_points"."company_id") AND ("c"."status" = 'ACTIVE'::"text")))));



ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deliveries_read" ON "public"."deliveries" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



ALTER TABLE "public"."delivery_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delivery_items_read" ON "public"."delivery_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."deliveries" "d"
  WHERE ("d"."id" = "delivery_items"."delivery_id"))));



CREATE POLICY "details_read" ON "public"."company_details" FOR SELECT TO "authenticated" USING (("private"."has_company_role"("company_id", true) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



ALTER TABLE "public"."device_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."green_point_device_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."green_point_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."green_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impact_ledger_read" ON "public"."impact_transactions" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



ALTER TABLE "public"."impact_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impact_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_read" ON "public"."company_invitations" FOR SELECT TO "authenticated" USING ((("email" = ( SELECT "private"."current_verified_email"() AS "current_verified_email")) OR "private"."has_company_role"("company_id", true) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "levels_read" ON "public"."impact_levels" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "limits_read" ON "public"."company_limit_requests" FOR SELECT TO "authenticated" USING (("private"."has_company_role"("company_id", true) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "memberships_read" ON "public"."company_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."has_company_role"("company_id", true) OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_read_self" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "points_company_read" ON "public"."green_points" FOR SELECT TO "authenticated" USING (("private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "points_configuration_read" ON "public"."company_device_points" FOR SELECT TO "authenticated" USING (("private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "points_ledger_read" ON "public"."points_transactions" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "points_public_active" ON "public"."green_points" FOR SELECT TO "authenticated", "anon" USING (("active" AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "green_points"."company_id") AND ("c"."status" = 'ACTIVE'::"text"))))));



ALTER TABLE "public"."points_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "redemptions_read" ON "public"."reward_redemptions" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



ALTER TABLE "public"."reward_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rewards_catalog_read" ON "public"."rewards" FOR SELECT TO "authenticated", "anon" USING (("active" AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" > "now"())) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "rewards"."company_id") AND ("c"."status" = 'ACTIVE'::"text"))))));



CREATE POLICY "rewards_team_read" ON "public"."rewards" FOR SELECT TO "authenticated" USING (("private"."has_company_role"("company_id") OR ( SELECT "private"."is_platform_admin"() AS "is_platform_admin")));



CREATE POLICY "schedules_point_read" ON "public"."green_point_schedules" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."green_points" "p"
  WHERE ("p"."id" = "green_point_schedules"."green_point_id"))));



GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."admin_change_snapshot"("operation" "text", "target" "uuid", "payload" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "private"."admin_document_access"("document_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."admin_document_access"("document_path" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "private"."audit_actor_snapshot"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."create_profile_for_auth_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."current_verified_email"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_verified_email"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."delivery_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."delivery_command"("operation" "text", "payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."delivery_json"("target" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."global_points"("target" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."has_company_role"("target_company" "uuid", "owner_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_company_role"("target_company" "uuid", "owner_only" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "private"."invitation_recipient"("invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."invitation_recipient"("invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_platform_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."my_delivery_balance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."my_delivery_balance"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."my_points_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."my_points_history"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."portal_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."portal_command"("operation" "text", "payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."redemption_json"("target" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."reward_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."reward_command"("operation" "text", "payload" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."touch_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_initial_level"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_point_time_zone"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_changelog"("page_offset" integer, "search_text" "text", "admins_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_document_access"("document_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_document_access"("document_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_document_access"("document_path" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_edit_record"("entity_kind" "text", "record_id" "uuid", "payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_search_records"("search_text" "text", "entity_kind" "text", "page_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delivery_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delivery_command"("operation" "text", "payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delivery_command"("operation" "text", "payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."invitation_recipient"("invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invitation_recipient"("invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invitation_recipient"("invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_delivery_balance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_delivery_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_delivery_balance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_points_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_points_history"() TO "service_role";
GRANT ALL ON FUNCTION "public"."my_points_history"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."portal_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."portal_command"("operation" "text", "payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."portal_command"("operation" "text", "payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reward_command"("operation" "text", "payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reward_command"("operation" "text", "payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."reward_command"("operation" "text", "payload" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."audit_log" TO "service_role";
GRANT SELECT ON TABLE "public"."audit_log" TO "authenticated";



GRANT ALL ON TABLE "public"."companies" TO "service_role";
GRANT SELECT ON TABLE "public"."companies" TO "anon";
GRANT SELECT ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("name") ON TABLE "public"."companies" TO "authenticated";



GRANT ALL ON TABLE "public"."company_applications" TO "service_role";
GRANT SELECT ON TABLE "public"."company_applications" TO "authenticated";



GRANT ALL ON TABLE "public"."company_details" TO "service_role";
GRANT SELECT ON TABLE "public"."company_details" TO "authenticated";



GRANT ALL ON TABLE "public"."company_device_points" TO "service_role";
GRANT SELECT ON TABLE "public"."company_device_points" TO "authenticated";



GRANT ALL ON TABLE "public"."company_invitations" TO "service_role";
GRANT SELECT ON TABLE "public"."company_invitations" TO "authenticated";



GRANT ALL ON TABLE "public"."company_limit_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."company_limit_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."company_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."company_memberships" TO "authenticated";



GRANT ALL ON TABLE "public"."deliveries" TO "service_role";
GRANT SELECT ON TABLE "public"."deliveries" TO "authenticated";



GRANT ALL ON TABLE "public"."delivery_items" TO "service_role";
GRANT SELECT ON TABLE "public"."delivery_items" TO "authenticated";



GRANT ALL ON TABLE "public"."device_categories" TO "service_role";
GRANT SELECT ON TABLE "public"."device_categories" TO "anon";
GRANT SELECT ON TABLE "public"."device_categories" TO "authenticated";



GRANT ALL ON TABLE "public"."green_point_device_categories" TO "service_role";
GRANT SELECT ON TABLE "public"."green_point_device_categories" TO "anon";
GRANT SELECT ON TABLE "public"."green_point_device_categories" TO "authenticated";



GRANT ALL ON TABLE "public"."green_point_schedules" TO "service_role";
GRANT SELECT ON TABLE "public"."green_point_schedules" TO "anon";
GRANT SELECT ON TABLE "public"."green_point_schedules" TO "authenticated";



GRANT ALL ON TABLE "public"."green_points" TO "service_role";
GRANT SELECT ON TABLE "public"."green_points" TO "anon";
GRANT SELECT ON TABLE "public"."green_points" TO "authenticated";



GRANT ALL ON TABLE "public"."impact_levels" TO "service_role";
GRANT SELECT ON TABLE "public"."impact_levels" TO "anon";
GRANT SELECT ON TABLE "public"."impact_levels" TO "authenticated";



GRANT ALL ON TABLE "public"."impact_transactions" TO "service_role";
GRANT SELECT ON TABLE "public"."impact_transactions" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_admins" TO "authenticated";



GRANT ALL ON TABLE "public"."points_transactions" TO "service_role";
GRANT SELECT ON TABLE "public"."points_transactions" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."reward_redemptions" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("user_id") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("reward_id") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("company_id") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("citizen_name") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("points_cost") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("reward_snapshot") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("verification_token") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("redeemed_at") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT SELECT("redeemed_by") ON TABLE "public"."reward_redemptions" TO "authenticated";



GRANT ALL ON TABLE "public"."rewards" TO "service_role";
GRANT SELECT ON TABLE "public"."rewards" TO "anon";
GRANT SELECT ON TABLE "public"."rewards" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- Profile creation trigger on auth.users (outside the public/private dump).
CREATE TRIGGER tecnoraee_create_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.create_profile_for_auth_user();

-- Storage buckets and object policies.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('company-documents','company-documents','f','8388608','{application/pdf,image/png,image/jpeg}') on conflict (id) do nothing;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('delivery-photos','delivery-photos','f','5242880','{image/jpeg,image/png}') on conflict (id) do nothing;
create policy company_documents_cleanup on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'company-documents'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (NOT (EXISTS ( SELECT 1
   FROM public.company_applications a
  WHERE (a.document_path = objects.name)))))) ;
create policy company_documents_read on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'company-documents'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR ( SELECT private.is_platform_admin() AS is_platform_admin)))) ;
create policy company_documents_upload on storage.objects as PERMISSIVE for INSERT to authenticated  with check (((bucket_id = 'company-documents'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy delivery_photo_delete_unsubmitted on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'delivery-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (NOT (EXISTS ( SELECT 1
   FROM public.deliveries d
  WHERE (d.photo_path = objects.name)))))) ;
create policy delivery_photo_read on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'delivery-photos'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR (EXISTS ( SELECT 1
   FROM public.deliveries d
  WHERE (d.photo_path = objects.name)))))) ;
create policy delivery_photo_upload on storage.objects as PERMISSIVE for INSERT to authenticated  with check (((bucket_id = 'delivery-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

-- Reference catalog: device categories (stable IDs shared with production).
INSERT INTO public.device_categories (id, slug, name, active, sort_order, impact_xp) VALUES
  ('fd65966b-aaba-4eb5-9805-51a7551a7858', 'celulares', 'Celulares', true, 1, 10),
  ('fbbfec89-ca00-4691-9c8d-07f8fa26dd46', 'tablets', 'Tablets', true, 2, 15),
  ('47de3381-5b5f-4a19-a3c3-be4082a752ad', 'notebooks', 'Notebooks', true, 3, 25),
  ('82e6b04b-194f-4886-87e4-c36dfc10ba56', 'computadoras', 'Computadoras', true, 4, 35),
  ('11a89672-a233-49df-bc2e-6d5c3994d56e', 'monitores', 'Monitores', true, 5, 30),
  ('52829d40-f001-45b3-9246-b2b4a2d7733e', 'televisores', 'Televisores', true, 6, 40),
  ('adbc0d31-fa3f-4453-afb7-662a25c87b38', 'impresoras', 'Impresoras', true, 7, 35),
  ('05199eac-a95d-44c5-bd4c-9554a7f9fb6e', 'consolas', 'Consolas', true, 8, 5),
  ('c9edb3a8-313c-4245-a450-ac1c1d49cc23', 'auriculares', 'Auriculares', true, 9, 5),
  ('220d7b83-97c9-41a2-8d05-12853495832f', 'cargadores', 'Cargadores', true, 10, 5),
  ('905dc5ee-273f-455f-a928-9daab8e1b57b', 'cables', 'Cables', true, 11, 2),
  ('4459c44f-982b-4663-aa18-59845ce4a59d', 'electrodomesticos-pequenos', 'Electrodomésticos pequeños', true, 12, 5),
  ('6b93d7ad-a4fd-4b3a-8a0a-f732d3574d13', 'otros', 'Otros', true, 13, 5)
ON CONFLICT (id) DO NOTHING;
