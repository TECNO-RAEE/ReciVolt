-- Adds optional institution and action filters to the admin changelog.
-- The public wrapper keeps admins_only forced to true: citizen actions stay out of the admin history.
drop function if exists public.admin_changelog(integer, text, boolean);
drop function if exists private.admin_changelog(integer, text, boolean);

create or replace function private.admin_changelog(
  page_offset integer,
  search_text text,
  admins_only boolean,
  company_filter uuid,
  action_filter text[]
) returns jsonb
language plpgsql stable security definer
set search_path to ''
as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.is_platform_admin() then raise exception 'Sólo el administrador puede consultar el historial.' using errcode='42501'; end if;
 if page_offset<0 or page_offset>1000000 or length(coalesce(search_text,''))>200 or coalesce(cardinality(action_filter),0)>50 then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(rows) order by rows.created_at desc,rows.id desc),'[]'::jsonb) into result from (
  select a.*,coalesce(a.details->'actor'->>'name',p.full_name,'Cuenta eliminada') as actor_name,
   coalesce(a.details->'actor'->>'email',p.email,'') as actor_email, c.name as company_name
  from public.audit_log a left join public.profiles p on p.id=a.actor_id left join public.companies c on c.id=a.company_id
  where (not admins_only or a.details->'actor'->>'role'='platform_admin' or a.action in ('review_application','review_limit','set_company_status','save_global_xp','save_level','admin_document_opened'))
   and (company_filter is null or a.company_id=company_filter)
   and (coalesce(cardinality(action_filter),0)=0 or a.action=any(action_filter))
   and (coalesce(search_text,'')='' or strpos(lower(concat_ws(' ',a.action,a.details::text,p.full_name,p.email,c.name,a.target_id::text)),lower(search_text))>0)
  order by a.created_at desc,a.id desc offset page_offset limit 26
 ) rows;
 return result;
end; $$;

alter function private.admin_changelog(integer, text, boolean, uuid, text[]) owner to postgres;
revoke all on function private.admin_changelog(integer, text, boolean, uuid, text[]) from public;
grant all on function private.admin_changelog(integer, text, boolean, uuid, text[]) to authenticated;

create or replace function public.admin_changelog(
  page_offset integer default 0,
  search_text text default '',
  admins_only boolean default true,
  company_filter uuid default null,
  action_filter text[] default null
) returns jsonb
language sql
set search_path to ''
as $$
 select private.admin_changelog(page_offset,search_text,true,company_filter,action_filter);
$$;

alter function public.admin_changelog(integer, text, boolean, uuid, text[]) owner to postgres;
revoke all on function public.admin_changelog(integer, text, boolean, uuid, text[]) from public;
grant all on function public.admin_changelog(integer, text, boolean, uuid, text[]) to authenticated;
grant all on function public.admin_changelog(integer, text, boolean, uuid, text[]) to service_role;
