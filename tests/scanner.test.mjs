import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {
  deliveryEstimate,
  deliveryTotalUnits,
  parseOperationCode,
} from '../src/models/Delivery.ts';
import * as pickupModel from '../src/models/Pickup.ts';

function loadPickupService(supabaseMock) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL('../src/services/pickup.service.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === '@/config/supabase') return { supabase: supabaseMock };
      if (name === '@/models/Pickup') return pickupModel;
      if (name === './delivery.service') {
        return {
          pickDeliveryPhoto: async () => null,
          removeDeliveryPhoto: async () => {},
          getDeliveryPhotoUrl: async () => '',
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('scanner parseOperationCode identifica códigos con prefijo y sin prefijo', () => {
  const deliveryCode = 'TR-11112222-33334444-55556666-77778888';
  const rewardCode = 'TRR-AAAABBBB-CCCCDDDD-EEEEFFFF-00001111';

  // Delivery
  assert.deepEqual(parseOperationCode(deliveryCode), {
    type: 'DELIVERY',
    code: deliveryCode,
  });
  assert.deepEqual(parseOperationCode(`RECIVOLT:DELIVERY:${deliveryCode}`), {
    type: 'DELIVERY',
    code: deliveryCode,
  });

  // Reward
  assert.deepEqual(parseOperationCode(rewardCode), {
    type: 'REWARD',
    code: rewardCode,
  });
  assert.deepEqual(parseOperationCode(`RECIVOLT:REWARD:${rewardCode}`), {
    type: 'REWARD',
    code: rewardCode,
  });

  // Códigos inválidos
  assert.throws(() => parseOperationCode('INVALID-CODE'));
  assert.throws(() => parseOperationCode('TR-1234'));
});

test('scanner deliveryEstimate soporta números enteros directos desde NumericStepper', () => {
  const items = [
    { categoryId: 'cat-pc', categoryName: 'PC', declaredQuantity: 2, pointsSnapshot: 150 },
    { categoryId: 'cat-bat', categoryName: 'Baterías', declaredQuantity: 5, pointsSnapshot: 10 },
  ];

  // Sin cantidades ajustadas toma lo declarado (2*150 + 5*10 = 350)
  assert.deepEqual(deliveryEstimate(items), { points: 350 });

  // Con cantidades ajustadas numéricas desde stepper (1*150 + 0*10 = 150)
  assert.deepEqual(deliveryEstimate(items, { 'cat-pc': 1, 'cat-bat': 0 }), { points: 150 });

  // Cuando todo se ajusta a 0, los puntos resultantes son 0
  assert.deepEqual(deliveryEstimate(items, { 'cat-pc': 0, 'cat-bat': 0 }), { points: 0 });
});

test('scanner deliveryTotalUnits calcula unidades físicas reales y detecta entrega en 0', () => {
  const items = [
    { categoryId: 'cat-1', categoryName: 'Notebook', declaredQuantity: 1, pointsSnapshot: 200, confirmedQuantity: null },
    { categoryId: 'cat-2', categoryName: 'Cables', declaredQuantity: 3, pointsSnapshot: 5, confirmedQuantity: null },
  ];

  // Sin cantidades ajustadas toma lo declarado (1 + 3 = 4)
  assert.equal(deliveryTotalUnits(items), 4);

  // Con cantidades ajustadas parcialmente (1 + 0 = 1)
  assert.equal(deliveryTotalUnits(items, { 'cat-1': 1, 'cat-2': 0 }), 1);

  // Cuando todo se ajusta a 0, detecta 0 unidades físicas para bloquear confirmación
  assert.equal(deliveryTotalUnits(items, { 'cat-1': 0, 'cat-2': 0 }), 0);

  // Soporta valores numéricos y en string
  assert.equal(deliveryTotalUnits(items, { 'cat-1': '2', 'cat-2': '5' }), 7);
});

test("scanner deliveryEstimate y deliveryTotalUnits usan el mismo fallback ante claves faltantes", () => {
  const items = [
    { categoryId: "cat-1", categoryName: "Notebook", declaredQuantity: 1, confirmedQuantity: 2, pointsSnapshot: 200 },
    { categoryId: "cat-2", categoryName: "Cables", declaredQuantity: 3, confirmedQuantity: null, pointsSnapshot: 10 },
  ];

  // Sin quantities: cat-1 usa confirmed (2), cat-2 usa declared (3)
  assert.equal(deliveryTotalUnits(items), 5);
  assert.deepEqual(deliveryEstimate(items), { points: 2 * 200 + 3 * 10 });

  // Con quantities parcial (solo cat-2 ajustado a 1): cat-1 cae en fallback confirmed (2)
  assert.equal(deliveryTotalUnits(items, { "cat-2": 1 }), 3);
  assert.deepEqual(deliveryEstimate(items, { "cat-2": 1 }), { points: 2 * 200 + 1 * 10 });
});

test('scanner parseOperationCode identifica códigos QR de retiro (PICKUP)', () => {
  const pickupCode = 'TR-ABCDEF12-34567890-ABCDEF12-34567890';
  assert.deepEqual(parseOperationCode(`TECNO-RAEE:PICKUP:${pickupCode}`), {
    type: 'PICKUP',
    code: pickupCode,
  });
  assert.deepEqual(parseOperationCode(`RECIVOLT:PICKUP:${pickupCode.toLowerCase()}`), {
    type: 'PICKUP',
    code: pickupCode,
  });
  assert.throws(() =>
    parseOperationCode('RECIVOLT:PICKUP:TRR-AAAABBBB-CCCCDDDD-EEEEFFFF-00001111')
  );
});

test('getPickupByCode consulta por company_id + verification_token normalizado y devuelve null si no existe', async () => {
  const calls = [];
  const sampleRow = {
    id: 'pickup-1',
    user_id: 'user-1',
    company_id: 'company-1',
    green_point_id: 'point-1',
    citizen_name: 'Ana',
    citizen_phone: null,
    company_name: 'EcoCentro',
    point_name: 'Centro',
    status: 'COORDINATED',
    address_street: 'Calle 1',
    address_locality: 'Pilar',
    address_reference: '',
    notes: '',
    photo_path: null,
    verification_token: 'TR-11112222-33334444-55556666-77778888',
    scheduled_date: '2026-11-26',
    scheduled_time_slot: '08:00 - 12:00',
    driver_name: 'Luis',
    created_at: '2026-11-24T10:00:00Z',
    coordinated_at: '2026-11-24T11:00:00Z',
    in_transit_at: null,
    completed_at: null,
    cancelled_at: null,
    confirmed_points: 0,
    pickup_items: [
      {
        device_category_id: 'cat-1',
        category_name: 'Monitores',
        declared_quantity: 2,
        confirmed_quantity: null,
        points_snapshot: 120,
      },
    ],
  };

  function makeSupabase(resultRow, resultError = null) {
    return {
      from(table) {
        assert.equal(table, 'pickups');
        const eqs = [];
        const chain = {
          select(columns) {
            calls.push({ select: columns });
            return chain;
          },
          eq(col, val) {
            eqs.push([col, val]);
            return chain;
          },
          async maybeSingle() {
            calls.push({ eqs });
            return { data: resultRow, error: resultError };
          },
        };
        return chain;
      },
    };
  }

  const found = await loadPickupService(makeSupabase(sampleRow)).getPickupByCode(
    'company-1',
    '  tr-11112222-33334444-55556666-77778888  '
  );
  assert.equal(found?.id, 'pickup-1');
  assert.equal(found?.status, 'COORDINATED');
  assert.equal(found?.items[0].categoryName, 'Monitores');
  assert.deepEqual(calls[0], { select: '*, pickup_items(*)' });
  assert.deepEqual(calls[1], {
    eqs: [
      ['company_id', 'company-1'],
      ['verification_token', 'TR-11112222-33334444-55556666-77778888'],
    ],
  });

  const missing = await loadPickupService(makeSupabase(null)).getPickupByCode(
    'company-1',
    'TR-00000000-00000000-00000000-00000000'
  );
  assert.equal(missing, null);
});
