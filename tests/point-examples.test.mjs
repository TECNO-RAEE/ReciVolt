import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDiscoveryPoints } from '../src/data/greenPointExamples.ts';
import {
  canRegisterDelivery,
  isExamplePointId,
  filterGreenPoints,
  openingStatus,
} from '../src/models/GreenPoint.ts';

const categories = Object.freeze([
  Object.freeze({ id: 'phones-a', name: 'Celulares', slug: 'phones' }),
  Object.freeze({ id: 'computers-b', name: 'Computadoras', slug: 'computers' }),
]);

test('catálogo vacío ofrece la universidad como ejemplo con todas las categorías cargadas', () => {
  const [point] = getDiscoveryPoints([], categories);
  assert.equal(point.name, 'Universidad de Pilar');
  assert.equal(point.demo, true);
  assert.ok(point.id.startsWith('example-'));
  assert.equal(
    point.address,
    'Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires'
  );
  assert.deepEqual(point.categories, categories);
  assert.equal(point.latitude, -34.4378787);
  assert.equal(point.longitude, -58.892156);
  assert.equal(point.phone, null);
  assert.equal(point.pickupEnabled, false);
  assert.deepEqual(getDiscoveryPoints([], [])[0].categories, []);
  const replacement = [{ id: 'new-category', name: 'Otra categoría', slug: 'other' }];
  assert.deepEqual(getDiscoveryPoints([], replacement)[0].categories, replacement);
});

test('los puntos reales tienen prioridad y la muestra no se reconstruye al filtrar', () => {
  const real = [{ ...getDiscoveryPoints([], categories)[0], id: 'real', demo: undefined }];
  assert.equal(getDiscoveryPoints(real, categories), real);
  assert.deepEqual(filterGreenPoints(real, { search: 'inexistente' }, null), []);
});

test('la muestra abre de lunes a sábado a las 10 y cierra a las 20 en la zona argentina', () => {
  const [point] = getDiscoveryPoints([], categories);
  for (const day of ['2026-10-12', '2026-10-17']) {
    assert.equal(openingStatus(point, new Date(day + 'T12:59:00Z')), 'closed');
    assert.equal(openingStatus(point, new Date(day + 'T13:00:00Z')), 'open');
    assert.equal(openingStatus(point, new Date(day + 'T22:59:00Z')), 'open');
    assert.equal(openingStatus(point, new Date(day + 'T23:00:00Z')), 'closed');
  }
  assert.equal(openingStatus(point, new Date('2026-10-18T15:00:00Z')), 'closed');
  assert.equal(point.schedules.length, 6);
});

test('la muestra participa en búsqueda y filtros sin requerir ubicación', () => {
  const points = getDiscoveryPoints([], categories);
  for (const search of ['universidad', 'pilar', 'pueyrredon', 'computadoras']) {
    assert.equal(filterGreenPoints(points, { search }, null).length, 1);
  }
  assert.equal(filterGreenPoints(points, { categoryId: 'computers-b' }, null).length, 1);
  assert.equal(filterGreenPoints(points, { categoryId: 'missing' }, null).length, 0);
  assert.equal(filterGreenPoints(points, { pickupOnly: true }, null).length, 0);
});

test('sólo puntos reales son elegibles para registrar entregas', () => {
  const [example] = getDiscoveryPoints([], categories);
  assert.equal(canRegisterDelivery(example), false);
  assert.equal(canRegisterDelivery({ ...example, demo: undefined }), false);
  assert.equal(canRegisterDelivery({ ...example, id: 'real', demo: true }), false);
  assert.equal(canRegisterDelivery({ ...example, id: 'real', demo: undefined }), true);
  assert.equal(isExamplePointId(example.id), true);
  assert.equal(isExamplePointId('example-unknown'), true);
  assert.equal(isExamplePointId(''), false);
  assert.equal(isExamplePointId('real'), false);
});
