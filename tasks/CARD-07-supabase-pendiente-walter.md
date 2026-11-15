# CARD-07: pendiente de Supabase para Walter

## Estado

La pantalla **Mi actividad** puede cargar cada origen por separado. El error actual de **Retiros** no debe ocultar **Entregas** ni **Canjes**. Las seis pruebas unitarias de `tests/activity-sources.test.mjs` cubren la clasificación y el aislamiento de esos errores.

Sigue pendiente confirmar por qué el proyecto de Supabase usado por la app devuelve `PGREST205` para `public.pickups` (y la relación con `public.pickup_items`). Ese código significa que PostgREST no encuentra la relación en su esquema expuesto/cacheado. Por sí solo no permite concluir si la tabla no existe físicamente, si falta aplicar la migración o si PostgREST tiene el esquema desactualizado. No es evidencia de que RLS haya rechazado la lectura; un problema de permisos suele producir otro error o cero filas.

## Verificaciones de solo lectura para el responsable de Supabase

Ejecutar en el proyecto y entorno que usa la app:

```sql
select version
from supabase_migrations.schema_migrations
where version = '20261101100000';
```

Comprobar si las relaciones existen:

```sql
select
  to_regclass('public.pickups') as pickups,
  to_regclass('public.pickup_items') as pickup_items;
```

Si ambas existen, revisar RLS, políticas y privilegios de lectura:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('pickups', 'pickup_items');

select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('pickups', 'pickup_items')
order by tablename, policyname;

select
  has_table_privilege('authenticated', 'public.pickups', 'SELECT') as pickups_select,
  has_table_privilege('authenticated', 'public.pickup_items', 'SELECT') as pickup_items_select;
```

La migración `supabase/migrations/20261101100000_pickups.sql` está en el repositorio/main, pero eso no demuestra que figure aplicada en el proyecto remoto. Define `public.pickups`, `public.pickup_items`, su FK, RLS y políticas de lectura. Comparar el historial y los objetos antes de decidir el siguiente paso. Si ya existen con RLS, políticas y privilegios correctos pero PostgREST aún devuelve `PGREST205`, seguir el procedimiento administrativo del proyecto para recargar su schema cache. No aplicar la migración a ciegas.

## Migración de historial de puntos

`supabase/migrations/20261115000000_my_points_history_pickups.sql` es independiente del error de Mi actividad: cambia la etiqueta del movimiento `PICKUP` en `my_points_history` a **Retiro confirmado**. No altera transacciones ni el cálculo del saldo. Su prueba `supabase/tests/points-history.test.sql` no se ejecutó en esta preparación; ninguna migración se aplicó.

## Límite de esta entrega

No se conectó a Supabase, no se modificaron datos, no se ejecutaron consultas remotas ni se aplicaron migraciones. Walter o la persona administradora debe confirmar el entorno, el historial de migraciones, la existencia de las dos tablas, las políticas RLS y los privilegios. Hasta entonces, Retiros sigue pendiente de validación contra el backend real.
