begin;

-- A point's published device policy is independent from the organization's other points.
alter table public.device_categories
  add column if not exists group_key text not null default 'otros';

update public.device_categories
set group_key = case
  when slug ~* '(pila|bateria|mercurio|termometro|fluorescente|medic|dialisis|cardiologia)' then 'especiales'
  when slug ~* '(comput|notebook|tablet|celular|telefono|teléfono|impres|fax|parlante|audio|comunic|monitor|auricular)' then 'informatica'
  when slug ~* '(electro|heladera|freezer|lavar|cocina|microonda|radio|televisor|tv|aspiradora|ventilador)' then 'electrodomesticos'
  when slug ~* '(cable|enchufe|zapatilla|aplique|cargador|insumo)' then 'insumos'
  when slug ~* '(herramienta|soldar|cortar)' then 'herramientas'
  when slug ~* '(juguete|consola|videojuego|deportivo|tren)' then 'juguetes'
  else group_key
end;

alter table public.green_points
  add column if not exists intake_confirmed boolean not null default false;

comment on column public.green_points.intake_confirmed is
  'False by default, including for migrated points, until the responsible person confirms this point''s intake policy.';

create table if not exists public.green_point_device_policies (
  green_point_id uuid not null references public.green_points(id) on delete cascade,
  device_category_id uuid not null references public.device_categories(id) on delete cascade,
  mode text not null check (mode in ('onsite', 'pickup', 'not_accepted')),
  updated_at timestamptz not null default now(),
  primary key (green_point_id, device_category_id)
);

-- Preserve current reception rules. Old selections were for in-person deliveries.
insert into public.green_point_device_policies(green_point_id, device_category_id, mode)
select green_point_id, device_category_id, 'onsite'
from public.green_point_device_categories
on conflict (green_point_id, device_category_id) do nothing;

-- Keep the legacy QR/delivery association in sync for every existing point writer.
-- The trigger runs in the same transaction as portal_command or the policy RPC.
create or replace function private.sync_green_point_device_policy_from_categories()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  point_id uuid;
  category_id uuid;
begin
  if tg_op = 'DELETE' then
    point_id := old.green_point_id;
    category_id := old.device_category_id;
    delete from public.green_point_device_policies
    where green_point_id=point_id and device_category_id=category_id and mode='onsite';
  else
    point_id := new.green_point_id;
    category_id := new.device_category_id;
    insert into public.green_point_device_policies(green_point_id,device_category_id,mode)
    values(point_id,category_id,'onsite')
    on conflict (green_point_id,device_category_id) do nothing;
    if exists (
      select 1 from public.green_point_device_policies
      where green_point_id=point_id and device_category_id=category_id and mode<>'onsite'
    ) then
      update public.green_points set intake_confirmed=false where id=point_id;
      return null;
    end if;
  end if;
  update public.green_points set intake_confirmed=false where id=point_id;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.sync_green_point_device_policy_from_categories() from public, anon, authenticated;
drop trigger if exists sync_green_point_device_policy_from_categories on public.green_point_device_categories;
create trigger sync_green_point_device_policy_from_categories
before insert or delete on public.green_point_device_categories
for each row execute function private.sync_green_point_device_policy_from_categories();

alter table public.green_point_device_policies enable row level security;
revoke all on public.green_point_device_policies from public, anon, authenticated;
grant select on public.green_point_device_policies to anon, authenticated;
grant all on public.green_point_device_policies to service_role;

create policy green_point_device_policies_public_read
on public.green_point_device_policies for select to anon
using (exists (
  select 1 from public.green_points p join public.companies c on c.id=p.company_id
  where p.id=green_point_id and p.active and c.status='ACTIVE'
));
create policy green_point_device_policies_company_read
on public.green_point_device_policies for select to authenticated
using (exists (
  select 1 from public.green_points p join public.companies c on c.id=p.company_id
  where p.id=green_point_id and (
    (p.active and c.status='ACTIVE') or private.is_platform_admin() or private.has_company_role(p.company_id)
  )
));

create or replace function public.save_green_point_device_policy(point_id uuid, confirmed boolean, entries jsonb)
returns void
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  entry jsonb;
  category uuid;
  v_mode text;
  point_company uuid;
  entry_count integer;
begin
  if actor is null then raise exception 'Iniciá sesión para continuar.' using errcode='42501'; end if;
  if entries is null or jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) > 300 then
    raise exception 'La política de dispositivos no es válida.' using errcode='22023';
  end if;

  select company_id into point_company from public.green_points where id=point_id for update;
  if point_company is null then raise exception 'El punto verde no existe.' using errcode='22023'; end if;

  if not private.is_platform_admin() and not private.has_company_role(point_company, true) then
    raise exception 'Sólo una persona administradora o responsable puede editar esta política.' using errcode='42501';
  end if;

  -- Validate every object before duplicate checks or UUID casts so callers get a stable API error.
  for entry in select value from jsonb_array_elements(entries) loop
    if jsonb_typeof(entry) <> 'object'
      or coalesce(entry->>'deviceCategoryId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(entry->>'mode','') not in ('onsite','pickup','not_accepted') then
      raise exception 'Cada dispositivo debe incluir un identificador UUID válido y un estado permitido.' using errcode='22023';
    end if;
  end loop;

  if confirmed then
    select count(*) into entry_count from jsonb_array_elements(entries);
    if entry_count <> (select count(*) from public.device_categories where active) then
      raise exception 'Asigná un estado a cada dispositivo antes de confirmar la política.' using errcode='22023';
    end if;
  end if;
  if (select count(distinct value->>'deviceCategoryId') from jsonb_array_elements(entries)) <> jsonb_array_length(entries) then
    raise exception 'No repitas dispositivos en la política.' using errcode='22023';
  end if;

  delete from public.green_point_device_policies where green_point_id=point_id;
  for entry in select value from jsonb_array_elements(entries) loop
    category := (entry->>'deviceCategoryId')::uuid;
    v_mode := entry->>'mode';
    if v_mode is null or v_mode not in ('onsite','pickup','not_accepted') or not exists (
      select 1 from public.device_categories where id=category and active
    ) then
      raise exception 'Revisá los estados seleccionados para cada dispositivo.' using errcode='22023';
    end if;
    insert into public.green_point_device_policies(green_point_id,device_category_id,mode)
    values(point_id,category,v_mode);
  end loop;

  -- The existing QR delivery flow remains for categories physically received at this point.
  delete from public.green_point_device_categories where green_point_id=point_id;
  insert into public.green_point_device_categories(green_point_id,device_category_id)
  select point_id, policy.device_category_id from public.green_point_device_policies as policy
  where policy.green_point_id=point_id and policy.mode='onsite'
  on conflict do nothing;

  -- Category triggers invalidate confirmation; restore the requested state after sync.
  update public.green_points set intake_confirmed=confirmed where id=point_id;

  insert into public.audit_log(actor_id,action,target_id,company_id,details)
  values(actor,'point_device_policy_saved',point_id,point_company,
    jsonb_build_object('confirmed',confirmed,'entries',jsonb_array_length(entries)));
end;
$$;

revoke all on function public.save_green_point_device_policy(uuid,boolean,jsonb) from public,anon;
grant execute on function public.save_green_point_device_policy(uuid,boolean,jsonb) to authenticated;

commit;
