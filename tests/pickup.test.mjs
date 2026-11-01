import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canCoordinatePickup,
  canMarkPickupInTransit,
  canReceivePickup,
  canRequestPickup,
  formatPickupDate,
  getPickupTimeline,
  isPickupActive,
  pickupEstimate,
  pickupMaterialSummary,
  pickupQuantity,
  pickupQr,
  pickupScheduleDays,
  pickupStatusNames,
  pickupTimeSlots,
  pickupTotalUnits,
} from '../src/models/Pickup.ts';

test('pickupStatusNames covers all pickup statuses', () => {
  assert.equal(pickupStatusNames.REQUESTED, 'Por coordinar');
  assert.equal(pickupStatusNames.COORDINATED, 'Coordinado');
  assert.equal(pickupStatusNames.IN_TRANSIT, 'En camino');
  assert.equal(pickupStatusNames.COMPLETED, 'Recibido');
  assert.equal(pickupStatusNames.CANCELLED, 'Cancelado');
});

test('pickupQr formats QR content according to app protocol', () => {
  const code = 'TR-ABCD1234-EF012345-6789ABCD-EF012345';
  assert.equal(pickupQr(code), `TECNO-RAEE:PICKUP:${code}`);
});

test('pickupQuantity accepts integers from 1 to 999 and rejects 0 or negatives', () => {
  assert.equal(pickupQuantity('1'), 1);
  assert.equal(pickupQuantity('10'), 10);
  assert.equal(pickupQuantity('999'), 999);
  assert.throws(() => pickupQuantity('0'), /Usá cantidades enteras entre 1 y 999/);
  assert.throws(() => pickupQuantity('-5'), /Usá cantidades enteras entre 1 y 999/);
  assert.throws(() => pickupQuantity('1.5'), /Usá cantidades enteras entre 1 y 999/);
  assert.throws(() => pickupQuantity('abc'), /Usá cantidades enteras entre 1 y 999/);
});

test('pickupEstimate and pickupTotalUnits calculate sums accurately', () => {
  const items = [
    {
      categoryId: 'cat-1',
      categoryName: 'Lavarropas',
      declaredQuantity: 2,
      confirmedQuantity: null,
      pointsSnapshot: 500,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Heladera',
      declaredQuantity: 1,
      confirmedQuantity: 1,
      pointsSnapshot: 800,
    },
  ];

  assert.equal(pickupTotalUnits(items), 3);
  assert.deepEqual(pickupEstimate(items), { points: 1800 });
});

test('canRequestPickup checks pickupEnabled and excludes demo points', () => {
  assert.equal(canRequestPickup({ id: 'real-1', pickupEnabled: true }), true);
  assert.equal(canRequestPickup({ id: 'real-2', pickupEnabled: false }), false);
  assert.equal(canRequestPickup({ id: 'example-demo', pickupEnabled: true, demo: true }), false);
  assert.equal(canRequestPickup({ id: 'example-uni', pickupEnabled: true }), false);
});

test('getPickupTimeline reflects 4 milestones for active lifecycle', () => {
  const basePickup = {
    id: 'p-1',
    userId: 'u-1',
    companyId: 'c-1',
    pointId: 'pt-1',
    citizenName: 'Juan Pérez',
    citizenPhone: '1122334455',
    companyName: 'Recicladora Pilar',
    pointName: 'Pilar Centro',
    status: 'REQUESTED',
    addressStreet: 'San Martín 123',
    addressLocality: 'Pilar',
    addressReference: 'Timbre 1',
    notes: '',
    photoPath: null,
    code: 'TR-1234',
    scheduledDate: null,
    scheduledTimeSlot: null,
    driverName: null,
    createdAt: '2026-11-01T10:00:00Z',
    coordinatedAt: null,
    inTransitAt: null,
    completedAt: null,
    cancelledAt: null,
    points: 0,
    items: [],
  };

  // State 1: REQUESTED
  const timelineRequested = getPickupTimeline(basePickup);
  assert.equal(timelineRequested.length, 4);
  assert.equal(timelineRequested[0].status, 'current');
  assert.equal(timelineRequested[1].status, 'upcoming');
  assert.equal(timelineRequested[2].status, 'upcoming');
  assert.equal(timelineRequested[3].status, 'upcoming');

  // State 2: COORDINATED
  const coordinatedPickup = {
    ...basePickup,
    status: 'COORDINATED',
    scheduledDate: '2026-11-05',
    scheduledTimeSlot: '10:00 - 14:00',
    driverName: 'Roberto',
    coordinatedAt: '2026-11-02T12:00:00Z',
  };
  const timelineCoordinated = getPickupTimeline(coordinatedPickup);
  assert.equal(timelineCoordinated[0].status, 'completed');
  assert.equal(timelineCoordinated[1].status, 'current');
  assert.ok(timelineCoordinated[1].dateLabel.includes('2026'));
  assert.equal(timelineCoordinated[1].subtitle, 'Responsable: Roberto');
  assert.equal(timelineCoordinated[2].status, 'upcoming');
  assert.equal(timelineCoordinated[3].status, 'upcoming');

  // State 3: IN_TRANSIT
  const inTransitPickup = {
    ...coordinatedPickup,
    status: 'IN_TRANSIT',
    inTransitAt: '2026-11-05T10:30:00Z',
  };
  const timelineInTransit = getPickupTimeline(inTransitPickup);
  assert.equal(timelineInTransit[0].status, 'completed');
  assert.equal(timelineInTransit[1].status, 'completed');
  assert.equal(timelineInTransit[2].status, 'current');
  assert.equal(timelineInTransit[3].status, 'upcoming');

  // State 4: COMPLETED
  const completedPickup = {
    ...inTransitPickup,
    status: 'COMPLETED',
    completedAt: '2026-11-05T11:15:00Z',
    points: 1500,
  };
  const timelineCompleted = getPickupTimeline(completedPickup);
  assert.equal(timelineCompleted[0].status, 'completed');
  assert.equal(timelineCompleted[1].status, 'completed');
  assert.equal(timelineCompleted[2].status, 'completed');
  assert.equal(timelineCompleted[3].status, 'completed');
  assert.equal(timelineCompleted[3].subtitle, '1500 puntos acreditados');

  // State 5: CANCELLED
  const cancelledPickup = {
    ...basePickup,
    status: 'CANCELLED',
    cancelledAt: '2026-11-01T15:00:00Z',
  };
  const timelineCancelled = getPickupTimeline(cancelledPickup);
  assert.equal(timelineCancelled.length, 2);
  assert.equal(timelineCancelled[0].title, 'Solicitado');
  assert.equal(timelineCancelled[1].title, 'Cancelado');
  assert.equal(timelineCancelled[1].status, 'current');
});

test('pickupMaterialSummary joins items with confirmed or declared quantities', () => {
  const items = [
    {
      categoryId: 'cat-1',
      categoryName: 'Lavarropas',
      declaredQuantity: 2,
      confirmedQuantity: null,
      pointsSnapshot: 500,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Heladera',
      declaredQuantity: 1,
      confirmedQuantity: 1,
      pointsSnapshot: 800,
    },
  ];
  assert.equal(pickupMaterialSummary(items), 'Lavarropas ×2 · Heladera ×1');
  assert.equal(
    pickupMaterialSummary([{ ...items[0], declaredQuantity: 3, confirmedQuantity: 0 }, items[1]]),
    'Lavarropas ×0 · Heladera ×1'
  );
  assert.equal(pickupMaterialSummary([]), '');
});

test('pickupScheduleDays emits consecutive local dates with es-AR labels', () => {
  const days = pickupScheduleDays(new Date(2026, 10, 5), 3); // 5 nov 2026 (jueves)
  assert.equal(days.length, 3);
  assert.equal(days[0].value, '2026-11-05');
  assert.equal(days[1].value, '2026-11-06');
  assert.equal(days[2].value, '2026-11-07');
  assert.match(days[0].label, /5/);
  assert.match(days[0].label, /nov/);
});

test('pickupTimeSlots offers fixed day ranges', () => {
  assert.deepEqual(pickupTimeSlots, ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00']);
});

test('operation guards reflect the pickup state machine', () => {
  assert.equal(canCoordinatePickup('REQUESTED'), true);
  assert.equal(canCoordinatePickup('COORDINATED'), false);
  assert.equal(canCoordinatePickup('CANCELLED'), false);

  assert.equal(canMarkPickupInTransit('COORDINATED'), true);
  assert.equal(canMarkPickupInTransit('IN_TRANSIT'), false);
  assert.equal(canMarkPickupInTransit('REQUESTED'), false);

  assert.equal(canReceivePickup('COORDINATED'), true);
  assert.equal(canReceivePickup('IN_TRANSIT'), true);
  assert.equal(canReceivePickup('REQUESTED'), false);
  assert.equal(canReceivePickup('COMPLETED'), false);

  assert.equal(isPickupActive('REQUESTED'), true);
  assert.equal(isPickupActive('IN_TRANSIT'), true);
  assert.equal(isPickupActive('COMPLETED'), false);
  assert.equal(isPickupActive('CANCELLED'), false);
});
