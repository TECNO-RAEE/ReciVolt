import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  didTransitionToConfirmed,
  shouldPollStatus,
} from '../src/models/ConfirmationWatcher.ts';

test('didTransitionToConfirmed solo dispara cuando pasa de estado pendiente a confirmado', () => {
  const pending = ['PENDING_RECEPTION'];
  const confirmed = ['CONFIRMED'];

  assert.equal(didTransitionToConfirmed('PENDING_RECEPTION', 'CONFIRMED', pending, confirmed), true);
  assert.equal(didTransitionToConfirmed(null, 'CONFIRMED', pending, confirmed), false);
  assert.equal(didTransitionToConfirmed('CONFIRMED', 'CONFIRMED', pending, confirmed), false);
  assert.equal(
    didTransitionToConfirmed('PENDING_RECEPTION', 'CANCELLED', pending, confirmed),
    false
  );
  assert.equal(
    didTransitionToConfirmed('PENDING_RECEPTION', 'PENDING_RECEPTION', pending, confirmed),
    false
  );
});

test('didTransitionToConfirmed soporta múltiples estados pendientes en retiros', () => {
  const pending = ['REQUESTED', 'COORDINATED', 'IN_TRANSIT'];
  const confirmed = ['COMPLETED'];

  assert.equal(didTransitionToConfirmed('REQUESTED', 'COMPLETED', pending, confirmed), true);
  assert.equal(didTransitionToConfirmed('COORDINATED', 'COMPLETED', pending, confirmed), true);
  assert.equal(didTransitionToConfirmed('IN_TRANSIT', 'COMPLETED', pending, confirmed), true);
  assert.equal(didTransitionToConfirmed('REQUESTED', 'COORDINATED', pending, confirmed), false);
  assert.equal(didTransitionToConfirmed('COORDINATED', 'CANCELLED', pending, confirmed), false);
});

test('shouldPollStatus exige foco activo y estado pendiente', () => {
  const pending = ['RESERVED'];

  assert.equal(shouldPollStatus('RESERVED', true, pending), true);
  assert.equal(shouldPollStatus('RESERVED', false, pending), false);
  assert.equal(shouldPollStatus('REDEEMED', true, pending), false);
  assert.equal(shouldPollStatus(null, true, pending), false);
  assert.equal(shouldPollStatus(undefined, true, pending), false);
});
