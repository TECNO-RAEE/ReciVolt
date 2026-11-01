import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  distanceKm,
  filterGreenPoints,
  formatDistance,
  formatScheduleMinute,
  openingStatus,
} from '../src/models/GreenPoint.ts';

const point = {
  id: 'p1',
  companyId: 'c1',
  companyName: 'Organización Norte',
  name: 'Punto Centro',
  address: 'Av. Córdoba 123',
  latitude: -34.6,
  longitude: -58.4,
  categories: [{ id: 'notebooks', name: 'Notebooks', slug: 'notebooks' }],
  schedules: [
    { weekday: 1, opensMinute: 540, closesMinute: 720 },
    { weekday: 1, opensMinute: 840, closesMinute: 1080 },
  ],
  timeZone: 'America/Argentina/Buenos_Aires',
  pickupEnabled: true,
};
test('horarios usan zona del punto, límites exclusivos y turno partido', () => {
  assert.equal(openingStatus(point, new Date('2026-09-28T12:00:00Z')), 'open');
  assert.equal(openingStatus(point, new Date('2026-09-28T15:00:00Z')), 'closed');
  assert.equal(openingStatus(point, new Date('2026-09-28T17:00:00Z')), 'open');
  assert.equal(openingStatus(point, new Date('2026-09-28T21:00:00Z')), 'closed');
  assert.equal(openingStatus(point, new Date('2026-09-29T13:00:00Z')), 'closed');
});
test('turno nocturno del domingo cruza a lunes y cierra a su hora', () => {
  const overnight = {
    ...point,
    schedules: [{ weekday: 7, opensMinute: 1320, closesMinute: 1560 }],
  };
  assert.equal(openingStatus(overnight, new Date('2026-09-28T02:00:00Z')), 'open');
  assert.equal(openingStatus(overnight, new Date('2026-09-28T04:00:00Z')), 'open');
  assert.equal(openingStatus(overnight, new Date('2026-09-28T05:00:00Z')), 'closed');
  assert.equal(formatScheduleMinute(1560), '02:00 (+1 día)');
});
test('sin horario o zona inválida no se afirma abierto/cerrado', () => {
  assert.equal(openingStatus({ ...point, schedules: [] }), 'unknown');
  assert.equal(openingStatus({ ...point, timeZone: 'Invalid/Zone' }), 'unknown');
  assert.equal(
    filterGreenPoints([{ ...point, schedules: [] }], { openOnly: true }, null).length,
    0
  );
});
test('distancia geográfica permite ordenar y filtrar cercanos sin inventar ubicación', () => {
  const far = { ...point, id: 'far', latitude: -31.4, longitude: -64.2 };
  assert.equal(distanceKm(point, point), 0);
  assert.ok(distanceKm(point, far) > 640 && distanceKm(point, far) < 650);
  assert.equal(formatDistance(0.5), '500 m');
  assert.deepEqual(
    filterGreenPoints([far, point], {}, point).map((p) => p.id),
    ['p1', 'far']
  );
  assert.deepEqual(
    filterGreenPoints([far, point], { nearbyOnly: true }, point).map((p) => p.id),
    ['p1']
  );
  assert.equal(filterGreenPoints([point], { nearbyOnly: true }, null).length, 0);
});
test('búsqueda ignora acentos y combina categoría, organización, servicio y horario', () => {
  for (const search of ['cordoba', 'organizacion', 'NOTEBOOKS', '  centro  ']) {
    assert.equal(filterGreenPoints([point], { search }, null).length, 1);
  }
  assert.equal(filterGreenPoints([point], { categoryId: 'phones' }, null).length, 0);
  assert.equal(filterGreenPoints([point], { companyId: 'other' }, null).length, 0);
  assert.equal(
    filterGreenPoints(
      [point],
      {
        search: 'centro',
        categoryId: 'notebooks',
        companyId: 'c1',
        openOnly: true,
        pickupOnly: true,
      },
      null,
      new Date('2026-09-28T13:00:00Z')
    ).length,
    1
  );
  assert.equal(
    filterGreenPoints([{ ...point, pickupEnabled: false }], { pickupOnly: true }, null).length,
    0
  );
});
test('categoryIds (checkboxes del filtro) combina varias categorías con OR y no rompe categoryId', () => {
  const phones = {
    ...point,
    id: 'p2',
    categories: [{ id: 'phones', name: 'Celulares', slug: 'celulares' }],
  };
  assert.deepEqual(
    filterGreenPoints([point, phones], { categoryIds: ['notebooks', 'phones'] }, null)
      .map((p) => p.id)
      .sort(),
    ['p1', 'p2']
  );
  assert.equal(filterGreenPoints([point, phones], { categoryIds: ['notebooks'] }, null).length, 1);
  assert.equal(filterGreenPoints([point], { categoryIds: [] }, null).length, 1);
  // categoryIds tiene prioridad, pero categoryId sigue funcionando si no se envía el array.
  assert.equal(filterGreenPoints([point], { categoryId: 'notebooks' }, null).length, 1);
});
