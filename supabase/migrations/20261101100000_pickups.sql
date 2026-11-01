-- Migration: Create pickups and pickup_items tables with RLS and command RPC.

CREATE TABLE IF NOT EXISTS public.pickups (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    company_id uuid NOT NULL REFERENCES public.companies(id),
    green_point_id uuid REFERENCES public.green_points(id),
    citizen_name text NOT NULL,
    citizen_phone text,
    company_name text NOT NULL,
    point_name text,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    address_street text NOT NULL,
    address_locality text NOT NULL,
    address_reference text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    photo_path text,
    verification_token text NOT NULL,
    client_request_id uuid NOT NULL,
    request_payload jsonb NOT NULL,
    scheduled_date date,
    scheduled_time_slot text,
    driver_name text,
    driver_user_id uuid REFERENCES public.profiles(id),
    confirmed_points bigint DEFAULT 0 NOT NULL,
    confirmed_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    coordinated_at timestamp with time zone,
    in_transit_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT pickups_status_check CHECK (status = ANY (ARRAY['REQUESTED'::text, 'COORDINATED'::text, 'IN_TRANSIT'::text, 'COMPLETED'::text, 'CANCELLED'::text])),
    CONSTRAINT pickups_address_street_check CHECK (length(trim(both from address_street)) > 0),
    CONSTRAINT pickups_address_locality_check CHECK (length(trim(both from address_locality)) > 0)
);

ALTER TABLE public.pickups OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.pickup_items (
    pickup_id uuid NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
    device_category_id uuid NOT NULL REFERENCES public.device_categories(id),
    category_name text NOT NULL,
    declared_quantity integer NOT NULL,
    confirmed_quantity integer,
    points_snapshot integer DEFAULT 0 NOT NULL,
    PRIMARY KEY (pickup_id, device_category_id),
    CONSTRAINT pickup_items_declared_quantity_check CHECK (declared_quantity >= 1 AND declared_quantity <= 999),
    CONSTRAINT pickup_items_confirmed_quantity_check CHECK (confirmed_quantity IS NULL OR (confirmed_quantity >= 0 AND confirmed_quantity <= 999))
);

ALTER TABLE public.pickup_items OWNER TO postgres;

CREATE INDEX IF NOT EXISTS pickups_user_id_idx ON public.pickups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pickups_company_id_idx ON public.pickups(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pickups_status_idx ON public.pickups(status);
CREATE UNIQUE INDEX IF NOT EXISTS pickups_user_client_request_idx ON public.pickups(user_id, client_request_id);
CREATE INDEX IF NOT EXISTS pickups_verification_token_idx ON public.pickups(verification_token);

ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickups_user_read" ON public.pickups
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "pickups_team_read" ON public.pickups
    FOR SELECT TO authenticated
    USING (private.has_company_role(company_id) OR (SELECT private.is_platform_admin()));

CREATE POLICY "pickup_items_read" ON public.pickup_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.pickups p
        WHERE p.id = pickup_items.pickup_id
          AND (p.user_id = auth.uid() OR private.has_company_role(p.company_id) OR (SELECT private.is_platform_admin()))
    ));

CREATE OR REPLACE FUNCTION private.pickup_json(target uuid) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
 select (to_jsonb(p) - 'request_payload' - 'client_request_id') || jsonb_build_object('items',
  coalesce((select jsonb_agg(to_jsonb(i) order by i.category_name) from public.pickup_items i where i.pickup_id = p.id), '[]'::jsonb))
 from public.pickups p where p.id = target;
$$;

ALTER FUNCTION private.pickup_json(target uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION private.pickup_command(operation text, payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  actor uuid := auth.uid();
  p_rec public.pickups%rowtype;
  gp_rec public.green_points%rowtype;
  company_rec public.companies%rowtype;
  company uuid;
  target uuid;
  request_id uuid;
  item jsonb;
  category uuid;
  quantity integer;
  category_name text;
  point_rate integer;
  random_token text;
  code text;
  point_total bigint;
  requested_items jsonb;
  photo text;
  street text;
  locality text;
  reference text;
  date_val date;
  slot_val text;
  driver_val text;
  phone_val text;
begin
  if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode = '42501'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or length(payload::text) > 20000 then
    raise exception 'Datos inválidos.' using errcode = '22023';
  end if;

  if operation = 'create' then
    if private.current_verified_email() is null then
      raise exception 'Confirmá tu email antes de solicitar un retiro.' using errcode = '42501';
    end if;
    request_id := (payload->>'requestId')::uuid;
    if request_id is null then
      raise exception 'Identificador de solicitud requerido.' using errcode = '22023';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));

    select * into p_rec from public.pickups where user_id = actor and client_request_id = request_id;
    if found then
      if p_rec.request_payload is distinct from payload then
        raise exception 'No reutilices la solicitud con otros datos.' using errcode = '22023';
      end if;
      return private.pickup_json(p_rec.id);
    end if;

    if (select count(*) from public.pickups where user_id = actor and status in ('REQUESTED', 'COORDINATED')) >= 10 then
      raise exception 'Ya tenés 10 solicitudes activas. Aguardá o cancelá las pendientes.' using errcode = '22023';
    end if;

    -- Resolve green point and company
    select * into gp_rec from public.green_points where id = (payload->>'pointId')::uuid and active for share;
    if not found then
      raise exception 'El punto verde ya no está disponible.' using errcode = '22023';
    end if;
    if not gp_rec.pickup_enabled then
      raise exception 'Este punto verde no ofrece servicio de retiros a domicilio.' using errcode = '22023';
    end if;

    company := gp_rec.company_id;
    select * into company_rec from public.companies where id = company and status = 'ACTIVE' for share;
    if not found then
      raise exception 'La organización ya no está activa.' using errcode = '22023';
    end if;

    -- Validate address
    street := trim(coalesce(payload->>'addressStreet', ''));
    locality := trim(coalesce(payload->>'addressLocality', ''));
    reference := trim(coalesce(payload->>'addressReference', ''));
    if length(street) = 0 or length(street) > 200 then
      raise exception 'Ingresá la calle y altura del retiro (hasta 200 caracteres).' using errcode = '22023';
    end if;
    if length(locality) = 0 or length(locality) > 100 then
      raise exception 'Ingresá la localidad del retiro.' using errcode = '22023';
    end if;
    if length(reference) > 300 then
      raise exception 'Las referencias de domicilio admiten hasta 300 caracteres.' using errcode = '22023';
    end if;

    requested_items := payload->'items';
    if jsonb_typeof(requested_items) is distinct from 'array' then
      raise exception 'Seleccioná dispositivos.' using errcode = '22023';
    end if;
    if jsonb_array_length(requested_items) not between 1 and 50 then
      raise exception 'Seleccioná de 1 a 50 categorías.' using errcode = '22023';
    end if;
    if length(coalesce(payload->>'notes', '')) > 2000 then
      raise exception 'Las notas admiten hasta 2000 caracteres.' using errcode = '22023';
    end if;

    photo := nullif(payload->>'photoPath', '');
    if photo is not null and not exists (
      select 1 from storage.objects
      where bucket_id = 'delivery-photos' and name = photo
        and (storage.foldername(name))[1] = actor::text
    ) then
      raise exception 'La foto no pertenece a tu cuenta.' using errcode = '42501';
    end if;

    random_token := upper(replace(pg_catalog.gen_random_uuid()::text, '-', ''));
    code := 'TR-' || substring(random_token, 1, 8) || '-' || substring(random_token, 9, 8) || '-' || substring(random_token, 17, 8) || '-' || substring(random_token, 25, 8);

    phone_val := trim(coalesce(payload->>'citizenPhone', payload->>'phone', ''));

    insert into public.pickups (
      user_id, company_id, green_point_id, citizen_name, citizen_phone,
      company_name, point_name, status, address_street, address_locality, address_reference,
      notes, photo_path, verification_token, client_request_id, request_payload
    )
    select
      actor, company, gp_rec.id, pr.full_name, nullif(phone_val, ''),
      company_rec.name, gp_rec.name, 'REQUESTED', street, locality, reference,
      coalesce(payload->>'notes', ''), photo, code, request_id, payload
    from public.profiles pr
    where pr.id = actor
    returning id into target;

    for item in select value from jsonb_array_elements(requested_items) loop
      if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]{0,2}$' then
        raise exception 'Las cantidades deben ser enteras entre 1 y 999.' using errcode = '22023';
      end if;
      category := (item->>'categoryId')::uuid;
      quantity := (item->>'quantity')::integer;
      select dc.name into category_name from public.device_categories dc
        where dc.id = category and dc.active for share of dc;
      if not found then
        raise exception 'Alguna de las categorías seleccionadas no está activa.' using errcode = '22023';
      end if;
      select points into point_rate from public.company_device_points where company_id = company and device_category_id = category for share;
      insert into public.pickup_items values (target, category, category_name, quantity, null, coalesce(point_rate, 0));
    end loop;

    insert into public.audit_log(actor_id, action, target_id, company_id) values (actor, 'pickup_created', target, company);
    return private.pickup_json(target);
  end if;

  -- Operations requiring target pickup
  select * into p_rec from public.pickups where id = (payload->>'id')::uuid for update;
  if not found then
    raise exception 'Solicitud de retiro no encontrada.' using errcode = '22023';
  end if;

  case operation
  when 'get' then
    if p_rec.user_id <> actor and not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No podés acceder a este retiro.' using errcode = '42501';
    end if;
    return private.pickup_json(p_rec.id);

  when 'cancel' then
    if p_rec.user_id <> actor and not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No podés cancelar este retiro.' using errcode = '42501';
    end if;
    if p_rec.status = 'CANCELLED' then
      return private.pickup_json(p_rec.id);
    end if;
    if p_rec.status not in ('REQUESTED', 'COORDINATED') then
      raise exception 'Sólo podés cancelar un retiro solicitado o coordinado.' using errcode = '22023';
    end if;
    update public.pickups set status = 'CANCELLED', cancelled_at = now() where id = p_rec.id;
    insert into public.audit_log(actor_id, action, target_id, company_id) values (actor, 'pickup_cancelled', p_rec.id, p_rec.company_id);
    return private.pickup_json(p_rec.id);

  when 'coordinate' then
    if not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No tenés permisos para coordinar este retiro.' using errcode = '42501';
    end if;
    if p_rec.status <> 'REQUESTED' and p_rec.status <> 'COORDINATED' then
      raise exception 'El retiro no está en estado para coordinar.' using errcode = '22023';
    end if;
    date_val := (payload->>'scheduledDate')::date;
    slot_val := trim(coalesce(payload->>'scheduledTimeSlot', ''));
    driver_val := trim(coalesce(payload->>'driverName', ''));
    if date_val is null then
      raise exception 'Indicá la fecha coordinada para el retiro.' using errcode = '22023';
    end if;
    update public.pickups
    set status = 'COORDINATED',
        scheduled_date = date_val,
        scheduled_time_slot = nullif(slot_val, ''),
        driver_name = nullif(driver_val, ''),
        coordinated_at = coalesce(coordinated_at, now())
    where id = p_rec.id;
    insert into public.audit_log(actor_id, action, target_id, company_id) values (actor, 'pickup_coordinated', p_rec.id, p_rec.company_id);
    return private.pickup_json(p_rec.id);

  when 'in_transit' then
    if not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No tenés permisos para actualizar el estado del retiro.' using errcode = '42501';
    end if;
    if p_rec.status not in ('COORDINATED', 'REQUESTED') then
      raise exception 'El retiro no está coordinado.' using errcode = '22023';
    end if;
    update public.pickups set status = 'IN_TRANSIT', in_transit_at = now() where id = p_rec.id;
    insert into public.audit_log(actor_id, action, target_id, company_id) values (actor, 'pickup_in_transit', p_rec.id, p_rec.company_id);
    return private.pickup_json(p_rec.id);

  when 'complete' then
    if not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No tenés permisos para confirmar la recepción.' using errcode = '42501';
    end if;
    if p_rec.status = 'COMPLETED' then
      return private.pickup_json(p_rec.id);
    end if;
    if p_rec.status not in ('COORDINATED', 'IN_TRANSIT', 'REQUESTED') then
      raise exception 'El retiro ya no está activo.' using errcode = '22023';
    end if;
    requested_items := payload->'items';
    if requested_items is not null and jsonb_typeof(requested_items) = 'array' then
      for item in select value from jsonb_array_elements(requested_items) loop
        update public.pickup_items set confirmed_quantity = (item->>'quantity')::integer
        where pickup_id = p_rec.id and device_category_id = (item->>'categoryId')::uuid;
      end loop;
    else
      update public.pickup_items set confirmed_quantity = declared_quantity
      where pickup_id = p_rec.id;
    end if;

    select sum(coalesce(confirmed_quantity, declared_quantity)::bigint * points_snapshot)
    into point_total from public.pickup_items where pickup_id = p_rec.id;

    update public.pickups
    set status = 'COMPLETED',
        completed_at = now(),
        confirmed_by = actor,
        confirmed_points = coalesce(point_total, 0)
    where id = p_rec.id;

    if coalesce(point_total, 0) > 0 then
      insert into public.points_transactions(user_id, company_id, amount, type, reference_type, reference_id)
      values (p_rec.user_id, p_rec.company_id, point_total, 'DELIVERY', 'PICKUP', p_rec.id);
    end if;

    insert into public.audit_log(actor_id, action, target_id, company_id, details)
    values (actor, 'pickup_completed', p_rec.id, p_rec.company_id, jsonb_build_object('points', coalesce(point_total, 0)));
    return private.pickup_json(p_rec.id);

  else
    raise exception 'Operación no disponible.' using errcode = '22023';
  end case;
end;
$_$;

ALTER FUNCTION private.pickup_command(operation text, payload jsonb) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.pickup_command(operation text, payload jsonb) RETURNS jsonb
    LANGUAGE sql
    SET search_path TO ''
    AS $$ select private.pickup_command(operation, payload); $$;

ALTER FUNCTION public.pickup_command(operation text, payload jsonb) OWNER TO postgres;

GRANT ALL ON TABLE public.pickups TO service_role;
GRANT SELECT ON TABLE public.pickups TO authenticated;

GRANT ALL ON TABLE public.pickup_items TO service_role;
GRANT SELECT ON TABLE public.pickup_items TO authenticated;

REVOKE ALL ON FUNCTION public.pickup_command(text, jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.pickup_command(text, jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.pickup_command(text, jsonb) TO service_role;
