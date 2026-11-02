-- Coordinar retiro: validar la fecha en la zona horaria local de la app
-- (America/Argentina/Buenos_Aires). El chequeo anterior usaba current_date del
-- servidor (UTC), que ya es "mañana" después de las 21:00 hora local y
-- rechazaba coordinar para el mismo día.

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

    if not exists (select 1 from public.profiles where id = actor) then
      raise exception 'Tu perfil no está registrado.' using errcode = '22023';
    end if;

    random_token := upper(replace(pg_catalog.gen_random_uuid()::text, '-', ''));
    code := 'TR-' || substring(random_token, 1, 8) || '-' || substring(random_token, 9, 8) || '-' || substring(random_token, 17, 8) || '-' || substring(random_token, 25, 8);

    phone_val := trim(coalesce(payload->>'citizenPhone', payload->>'phone', ''));
    if length(phone_val) > 50 then
      raise exception 'El teléfono de contacto no puede superar los 50 caracteres.' using errcode = '22023';
    end if;

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
    if date_val < (now() at time zone 'America/Argentina/Buenos_Aires')::date then
      raise exception 'La fecha coordinada no puede ser anterior a hoy.' using errcode = '22023';
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
    if p_rec.status = 'IN_TRANSIT' then
      return private.pickup_json(p_rec.id);
    end if;
    if p_rec.status <> 'COORDINATED' then
      raise exception 'El retiro debe estar coordinado para pasar a en camino.' using errcode = '22023';
    end if;
    update public.pickups set status = 'IN_TRANSIT', in_transit_at = coalesce(in_transit_at, now()) where id = p_rec.id;
    insert into public.audit_log(actor_id, action, target_id, company_id) values (actor, 'pickup_in_transit', p_rec.id, p_rec.company_id);
    return private.pickup_json(p_rec.id);

  when 'complete' then
    if not private.has_company_role(p_rec.company_id) and not private.is_platform_admin() then
      raise exception 'No tenés permisos para confirmar la recepción.' using errcode = '42501';
    end if;
    if p_rec.status = 'COMPLETED' then
      return private.pickup_json(p_rec.id);
    end if;
    if p_rec.status not in ('COORDINATED', 'IN_TRANSIT') then
      raise exception 'El retiro debe estar coordinado o en camino para completarse.' using errcode = '22023';
    end if;

    requested_items := payload->'items';
    if requested_items is not null then
      if jsonb_typeof(requested_items) is distinct from 'array' then
        raise exception 'Indicá las cantidades recibidas.' using errcode = '22023';
      end if;
      for item in select value from jsonb_array_elements(requested_items) loop
        if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity', '') !~ '^(0|[1-9][0-9]{0,2})$' then
          raise exception 'Las cantidades recibidas deben ser enteras entre 0 y 999.' using errcode = '22023';
        end if;
        update public.pickup_items set confirmed_quantity = (item->>'quantity')::integer
        where pickup_id = p_rec.id and device_category_id = (item->>'categoryId')::uuid;
        if not found then
          raise exception 'Categoría ajena a este retiro.' using errcode = '22023';
        end if;
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
      values (p_rec.user_id, p_rec.company_id, point_total, 'PICKUP', 'PICKUP', p_rec.id);
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
