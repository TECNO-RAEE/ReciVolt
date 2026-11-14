import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activityDestination,
  activityErrorsForFilter,
  activityFilterFromParam,
  formatActivityError,
  settleActivitySources,
} from '../src/models/ActivitySources.ts';

test('una fuente fallida conserva los datos de las otras fuentes y expone su error', async () => {
  const pickupError = {
    code: 'PGRST205',
    message: 'Could not find the table public.pickups in the schema cache',
    details: 'Searched for the table in the public schema.',
    hint: 'Reload the schema cache.',
  };
  const result = await settleActivitySources({
    deliveries: Promise.resolve([{ id: 'delivery-1' }]),
    pickups: Promise.reject(pickupError),
    redemptions: Promise.resolve([{ id: 'redemption-1' }]),
  });

  assert.deepEqual(result.values.deliveries, [{ id: 'delivery-1' }]);
  assert.deepEqual(result.values.redemptions, [{ id: 'redemption-1' }]);
  assert.equal(result.values.pickups, undefined);
  assert.equal(
    result.errors.pickups,
    'Could not find the table public.pickups in the schema cache · Detalle: Searched for the table in the public schema. · Sugerencia: Reload the schema cache. · Código: PGRST205'
  );
  assert.equal(result.errors.deliveries, undefined);
  assert.equal(result.errors.redemptions, undefined);
});

test('los errores Error, texto y objeto sin mensaje se presentan de forma legible', () => {
  assert.equal(formatActivityError(new Error('Fallo de red')), 'Fallo de red');
  assert.equal(formatActivityError('Permiso denegado'), 'Permiso denegado');
  assert.equal(formatActivityError({ code: 'PGRST301' }), 'Código: PGRST301');
  assert.equal(formatActivityError({}), 'Ocurrió un error inesperado.');

  const postgrestError = Object.assign(new Error('RLS rejected the query'), {
    details: 'The current user has no matching row.',
    hint: 'Check the read policy.',
    code: '42501',
  });
  assert.equal(
    formatActivityError(postgrestError),
    'RLS rejected the query · Detalle: The current user has no matching row. · Sugerencia: Check the read policy. · Código: 42501'
  );
});

test('los errores de una fuente solo se muestran en los filtros que la incluyen', () => {
  const errors = { pickups: 'No se pudo cargar Retiros.', deliveries: 'No se pudo cargar Entregas.' };

  assert.deepEqual(activityErrorsForFilter(errors, 'Todos').map(({ source }) => source), [
    'deliveries',
    'pickups',
  ]);
  assert.deepEqual(activityErrorsForFilter(errors, 'Entregas').map(({ source }) => source), [
    'deliveries',
  ]);
  assert.deepEqual(activityErrorsForFilter(errors, 'Retiros').map(({ source }) => source), [
    'pickups',
  ]);
  assert.deepEqual(activityErrorsForFilter(errors, 'Canjes'), []);
});

test('una consulta vacía exitosa no se confunde con una consulta fallida', async () => {
  const result = await settleActivitySources({
    deliveries: Promise.resolve([]),
    pickups: Promise.resolve([]),
    redemptions: Promise.resolve([]),
  });

  assert.deepEqual(result.values, { deliveries: [], pickups: [], redemptions: [] });
  assert.deepEqual(result.errors, {});
});

test('cada tipo de movimiento enlaza al detalle correspondiente', () => {
  assert.deepEqual(activityDestination('DELIVERY', 'd1'), {
    pathname: '/delivery/[id]',
    params: { id: 'd1' },
  });
  assert.deepEqual(activityDestination('PICKUP', 'p1'), {
    pathname: '/pickup/[id]',
    params: { id: 'p1' },
  });
  assert.deepEqual(activityDestination('REDEMPTION', 'r1'), {
    pathname: '/redemption/[id]',
    params: { id: 'r1' },
  });
});

test('el filtro de entrada reconoce parámetros sin distinguir mayúsculas', () => {
  assert.equal(activityFilterFromParam('Entregas'), 'Entregas');
  assert.equal(activityFilterFromParam('retiros'), 'Retiros');
  assert.equal(activityFilterFromParam('CANJES'), 'Canjes');
  assert.equal(activityFilterFromParam('desconocido'), 'Todos');
  assert.equal(activityFilterFromParam(undefined), 'Todos');
});
