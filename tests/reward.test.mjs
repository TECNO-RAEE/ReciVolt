import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointsLabel, rewardAvailable, rewardQr } from '../src/models/Reward.ts';

const reward = {
  active: true,
  stock: null,
  startsAt: null,
  endsAt: null,
};

test('el costo usa singular para un punto y separador de miles', () => {
  assert.equal(pointsLabel(1), '1 punto');
  assert.equal(pointsLabel(0), '0 puntos');
  assert.equal(pointsLabel(1199), '1.199 puntos');
});
test('un premio agotado, inactivo o fuera de vigencia no está disponible', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  assert.equal(rewardAvailable(reward, now), true);
  assert.equal(rewardAvailable({ ...reward, stock: 0 }, now), false);
  assert.equal(rewardAvailable({ ...reward, active: false }, now), false);
  assert.equal(rewardAvailable({ ...reward, endsAt: '2026-10-30T00:00:00Z' }, now), false);
  assert.equal(rewardAvailable({ ...reward, startsAt: '2026-11-01T00:00:00Z' }, now), false);
});
test('el QR del canje conserva el formato que lee el escáner', () => {
  assert.equal(rewardQr('RV-1234'), 'TECNO-RAEE:REWARD:RV-1234');
});
