import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cellDegreesForRegion,
  cellDegreesForZoom,
  clusterPoints,
  regionForCluster,
} from '../src/models/PointCluster.ts';
import {
  dominantGroupKey,
  groupCategories,
  isGroupSelected,
  toggleGroupSelection,
} from '../src/models/DeviceCategory.ts';

const p = (id, latitude, longitude) => ({ id, latitude, longitude });
const cat = (id, name) => ({ id, name, slug: name.toLowerCase().replace(/\s+/g, '-') });

test('puntos lejanos quedan separados y cercanos se agrupan', () => {
  const items = [p('a', -34.45, -58.91), p('b', -34.4501, -58.9101), p('c', -34.9, -58.2)];
  const out = clusterPoints(items, 0.05);
  const clusters = out.filter((i) => i.kind === 'cluster');
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 2);
  assert.deepEqual(clusters[0].items.map((i) => i.id).sort(), ['a', 'b']);
  assert.equal(out.filter((i) => i.kind === 'point').length, 1);
});

test('el cluster se ubica en el centro de sus miembros', () => {
  const [cluster] = clusterPoints([p('a', 0, 0), p('b', 0.002, 0.004)], 1);
  assert.equal(cluster.kind, 'cluster');
  assert.ok(Math.abs(cluster.latitude - 0.001) < 1e-9);
  assert.ok(Math.abs(cluster.longitude - 0.002) < 1e-9);
});

test('con celda muy chica o inválida no agrupa y no muta la entrada', () => {
  const items = [p('a', 1, 1), p('b', 1, 1)];
  for (const cell of [0, -1, NaN, 0.0001]) {
    const out = clusterPoints(items, cell);
    assert.equal(out.length, 2);
    assert.ok(out.every((i) => i.kind === 'point'));
  }
  assert.equal(items.length, 2);
});

test('al acercar el zoom los clusters se deshacen', () => {
  const items = [p('a', -34.45, -58.91), p('b', -34.46, -58.92), p('c', -34.47, -58.93)];
  const far = clusterPoints(items, cellDegreesForZoom(8));
  const near = clusterPoints(items, cellDegreesForZoom(16));
  assert.equal(far.length, 1);
  assert.equal(far[0].count, 3);
  assert.equal(near.length, 3);
});

test('celda por región y regionForCluster', () => {
  assert.equal(cellDegreesForRegion(0), 0);
  assert.ok(cellDegreesForRegion(0.36, 360, 56) > 0.05);
  const r = regionForCluster([p('a', 0, 0), p('b', 0.1, 0.2)]);
  assert.ok(r.latitudeDelta >= 0.1 && r.longitudeDelta >= 0.2);
  assert.equal(regionForCluster([p('a', 1, 1), p('b', 1, 1)]).latitudeDelta, 0.004);
});

test('grupos de categorías, selección y grupo dominante', () => {
  const cats = [
    cat('1', 'Pilas'),
    cat('2', 'Baterías'),
    cat('3', 'Celulares'),
    cat('4', 'Heladeras'),
    cat('5', 'Cables'),
  ];
  const groups = groupCategories(cats);
  assert.deepEqual(
    groups.map((g) => g.key),
    ['especiales', 'informatica', 'electrodomesticos', 'insumos']
  );
  const pilas = groups[0];
  assert.deepEqual(pilas.categoryIds, ['1', '2']);
  let selected = toggleGroupSelection(pilas, ['3']);
  assert.deepEqual(selected.sort(), ['1', '2', '3']);
  assert.ok(isGroupSelected(pilas, selected));
  selected = toggleGroupSelection(pilas, selected);
  assert.deepEqual(selected, ['3']);
  assert.equal(dominantGroupKey([cats[0], cats[1], cats[2]]), 'especiales');
  assert.equal(dominantGroupKey([]), 'otros');
});
