import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryEstimate,
  deliveryQuantity,
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

test('scanner detecta entrega vacía (todas las categorías en 0)', () => {
  const items = [
    { categoryId: 'cat-1', categoryName: 'Notebook', declaredQuantity: 1, pointsSnapshot: 200 },
    { categoryId: 'cat-2', categoryName: 'Cables', declaredQuantity: 3, pointsSnapshot: 5 },
  ];

  const quantitiesAllZero = { 'cat-1': 0, 'cat-2': 0 };
  const totalZero = items.reduce(
    (sum, item) => sum + (quantitiesAllZero[item.categoryId] ?? item.declaredQuantity),
    0
  );
  assert.equal(totalZero, 0, 'El total de unidades físicas debe ser 0 cuando todo se ajusta a 0');

  const quantitiesWithItems = { 'cat-1': 1, 'cat-2': 0 };
  const totalWithItems = items.reduce(
    (sum, item) => sum + (quantitiesWithItems[item.categoryId] ?? item.declaredQuantity),
    0
  );
  assert.equal(totalWithItems, 1, 'El total de unidades físicas debe ser mayor a 0');
});
