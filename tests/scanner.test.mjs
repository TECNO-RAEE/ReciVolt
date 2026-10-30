import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryEstimate,
  deliveryTotalUnits,
  parseOperationCode,
} from '../src/models/Delivery.ts';

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
