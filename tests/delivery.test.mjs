import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryQr,
  parseOperationCode,
  deliveryQuantity,
  effectiveDeliveryStatus,
  deliveryEstimate,
} from '../src/models/Delivery.ts';

const code = 'TR-12345678-90ABCDEF-12345678-90ABCDEF';
test('lector identifica entregas, retiros y recompensas; admite código manual', () => {
  assert.deepEqual(parseOperationCode(deliveryQr(code)), { type: 'DELIVERY', code });
  assert.deepEqual(parseOperationCode(`  ${code.toLowerCase()}  `), { type: 'DELIVERY', code });
  assert.equal(parseOperationCode(`TECNO-RAEE:PICKUP:${code}`).type, 'PICKUP');
  assert.equal(parseOperationCode(`TECNO-RAEE:REWARD:${code}`).type, 'REWARD');
  assert.equal(parseOperationCode(`ECO-RAEE:PICKUP:${code}`).type, 'PICKUP');
  assert.equal(parseOperationCode(`ECO-RAEE:REWARD:${code}`).type, 'REWARD');
  for (const invalid of ['TR-1234', 'https://example.com', `EVIL:DELIVERY:${code}`, `${code}x`])
    assert.throws(() => parseOperationCode(invalid));
});
test('cantidades declaradas y recibidas tienen límites distintos', () => {
  assert.equal(deliveryQuantity('999'), 999);
  assert.equal(deliveryQuantity(' 1 '), 1);
  assert.equal(deliveryQuantity('0', true), 0);
  for (const invalid of ['', '0', '-1', '1.5', '1e2', '1000', '01', 'Infinity'])
    assert.throws(() => deliveryQuantity(invalid));
});
test('vencimiento sólo afecta pendientes, sin alterar confirmadas o canceladas', () => {
  const expiresAt = '2026-10-01T00:00:00Z';
  assert.equal(
    effectiveDeliveryStatus({ status: 'PENDING_RECEPTION', expiresAt }, Date.parse(expiresAt) - 1),
    'PENDING_RECEPTION'
  );
  assert.equal(
    effectiveDeliveryStatus({ status: 'PENDING_RECEPTION', expiresAt }, Date.parse(expiresAt)),
    'EXPIRED'
  );
  assert.equal(
    effectiveDeliveryStatus({ status: 'CONFIRMED', expiresAt }, Date.parse(expiresAt) + 1),
    'CONFIRMED'
  );
});
test('estimaciones de puntos usan cantidades físicas ajustadas', () => {
  const items = [
    { categoryId: 'a', declaredQuantity: 3, pointsSnapshot: 100 },
    { categoryId: 'b', declaredQuantity: 2, pointsSnapshot: 25 },
  ];
  assert.deepEqual(deliveryEstimate(items), { points: 350 });
  assert.deepEqual(deliveryEstimate(items, { a: '2', b: '0' }), { points: 200 });
  assert.throws(() => deliveryEstimate(items, { a: '1.1', b: '0' }));
});
