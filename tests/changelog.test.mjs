import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  auditGroupOf,
  auditGroups,
  auditNames,
  changelogChanges,
} from '../src/models/Changelog.ts';

test('el historial muestra el estado anterior y nuevo de una empresa', () => {
  assert.deepEqual(
    changelogChanges(
      [{ id: 'company', name: 'Recicladora', status: 'ACTIVE' }],
      [{ id: 'company', name: 'Recicladora', status: 'SUSPENDED' }]
    ),
    [{ entity: 'Recicladora', field: 'Estado', before: 'Activa', after: 'Suspendida' }]
  );
});
test('XP agrupa cambios por identidad aunque cambie el orden; omite valores sin cambios', () => {
  assert.deepEqual(
    changelogChanges(
      [
        { id: '1', name: 'Celulares', impact_xp: 10 },
        { id: '2', name: 'Cables', impact_xp: 2 },
      ],
      [
        { id: '2', name: 'Cables', impact_xp: 2 },
        { id: '1', name: 'Celulares', impact_xp: 15 },
      ]
    ),
    [{ entity: 'Celulares', field: 'XP por unidad', before: '10', after: '15' }]
  );
});
test('un nuevo nivel conserva nombre y umbral en el historial', () => {
  assert.deepEqual(changelogChanges([], [{ id: 'level', name: 'Bosque', minimum_xp: 1500 }]), [
    { entity: 'Bosque', field: 'Nombre', before: 'Sin valor', after: 'Bosque' },
    { entity: 'Bosque', field: 'XP mínimo', before: 'Sin valor', after: '1500' },
  ]);
});
test('registros antiguos sin snapshots no inventan modificaciones', () => {
  assert.deepEqual(changelogChanges(null, undefined), []);
});
test('cada tipo de acción del filtro tiene nombre y pertenece a un solo grupo', () => {
  const seen = new Set();
  for (const group of auditGroups)
    for (const action of group.actions) {
      assert.ok(auditNames[action], `falta el nombre de ${action}`);
      assert.ok(!seen.has(action), `${action} está en dos grupos`);
      seen.add(action);
      assert.equal(auditGroupOf(action), group.key);
    }
  assert.equal(auditGroupOf('delivery_created'), null);
});
test('toda acción que el historial de admin incluye por lista blanca se puede filtrar', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20261101120000_admin_changelog_filters.sql', import.meta.url),
    'utf8'
  );
  const list = sql.match(/a\.action in \(([^)]*)\)/)[1];
  for (const [, action] of list.matchAll(/'([a-z_]+)'/g))
    assert.ok(auditGroupOf(action), `${action} no tiene grupo de filtro`);
});
