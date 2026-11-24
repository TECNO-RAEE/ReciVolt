import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterActivityEntries,
  getActivityPresentationState,
  resolveActivityFilter,
} from '../src/models/ActivityFilter.ts';
import {
  addPickupDraftItem,
  changePickupDraftItemCategory,
  createEmptyPickupDraftFields,
  hasPickupDraftErrors,
  reconcilePickupDraftItems,
  remainingPickupCategories,
  selectableCategoriesForPickupItem,
  validatePickupDraft,
} from '../src/models/PickupDraft.ts';

test('resolveActivityFilter resuelve pestañas conocidas y vuelve a Todos si falta o no coincide', () => {
  assert.equal(resolveActivityFilter(undefined), 'Todos');
  assert.equal(resolveActivityFilter(''), 'Todos');
  assert.equal(resolveActivityFilter('otra'), 'Todos');
  assert.equal(resolveActivityFilter('entregas'), 'Entregas');
  assert.equal(resolveActivityFilter('RETIROS'), 'Retiros');
  assert.equal(resolveActivityFilter(['Canjes']), 'Canjes');
});

test('filterActivityEntries filtra por categoría manteniendo Todos completo', () => {
  const entries = [
    { id: '1', kind: 'DELIVERY' },
    { id: '2', kind: 'PICKUP' },
    { id: '3', kind: 'REDEMPTION' },
  ];
  assert.equal(filterActivityEntries(entries, 'Todos').length, 3);
  assert.deepEqual(
    filterActivityEntries(entries, 'Entregas').map((item) => item.id),
    ['1']
  );
  assert.deepEqual(
    filterActivityEntries(entries, 'Retiros').map((item) => item.id),
    ['2']
  );
  assert.deepEqual(
    filterActivityEntries(entries, 'Canjes').map((item) => item.id),
    ['3']
  );
});

test('getActivityPresentationState muestra vacío en Todos/Entregas/Canjes y restringe Retiros', () => {
  assert.deepEqual(
    getActivityPresentationState({
      filter: 'Todos',
      visibleCount: 0,
      totalCount: 0,
      hasPickups: false,
      mayHaveMorePickups: false,
      loading: false,
      error: null,
    }),
    {
      showLoading: false,
      showInitialError: false,
      showRetirementInfo: false,
      showEmptySectionMessage: true,
    }
  );

  assert.deepEqual(
    getActivityPresentationState({
      filter: 'Todos',
      visibleCount: 2,
      totalCount: 2,
      hasPickups: false,
      mayHaveMorePickups: false,
      loading: false,
      error: null,
    }),
    {
      showLoading: false,
      showInitialError: false,
      showRetirementInfo: false,
      showEmptySectionMessage: false,
    }
  );

  for (const filter of ['Entregas', 'Canjes']) {
    assert.deepEqual(
      getActivityPresentationState({
        filter,
        visibleCount: 0,
        totalCount: 1,
        hasPickups: false,
        mayHaveMorePickups: false,
        loading: false,
        error: null,
      }),
      {
        showLoading: false,
        showInitialError: false,
        showRetirementInfo: false,
        showEmptySectionMessage: true,
      }
    );
  }

  assert.deepEqual(
    getActivityPresentationState({
      filter: 'Retiros',
      visibleCount: 0,
      totalCount: 1,
      hasPickups: false,
      mayHaveMorePickups: false,
      loading: false,
      error: null,
    }),
    {
      showLoading: false,
      showInitialError: false,
      showRetirementInfo: true,
      showEmptySectionMessage: false,
    }
  );

  assert.deepEqual(
    getActivityPresentationState({
      filter: 'Retiros',
      visibleCount: 0,
      totalCount: 0,
      hasPickups: false,
      mayHaveMorePickups: true,
      loading: false,
      error: null,
    }),
    {
      showLoading: false,
      showInitialError: false,
      showRetirementInfo: false,
      showEmptySectionMessage: true,
    }
  );

  assert.deepEqual(
    getActivityPresentationState({
      filter: 'Retiros',
      visibleCount: 0,
      totalCount: 0,
      hasPickups: false,
      mayHaveMorePickups: false,
      loading: false,
      error: 'Error de red',
    }),
    {
      showLoading: false,
      showInitialError: true,
      showRetirementInfo: false,
      showEmptySectionMessage: false,
    }
  );
});

test('PickupDraft inicia localidad vacía y preserva superposición al cambiar de punto', () => {
  const fields = createEmptyPickupDraftFields();
  assert.equal(fields.locality, '');
  assert.equal(fields.street, '');

  const categoriesA = [{ id: 'cat-1' }, { id: 'cat-2' }];
  const categoriesB = [{ id: 'cat-2' }, { id: 'cat-3' }];
  const categoriesC = [{ id: 'cat-4' }];

  const initial = reconcilePickupDraftItems([], categoriesA, () => 'draft-1');
  assert.deepEqual(initial, [{ id: 'draft-1', categoryId: 'cat-1', quantity: 1 }]);

  const edited = [
    { id: 'draft-1', categoryId: 'cat-1', quantity: 2 },
    { id: 'draft-2', categoryId: 'cat-2', quantity: 4 },
  ];
  const onB = reconcilePickupDraftItems(edited, categoriesB, () => 'draft-3');
  assert.deepEqual(onB, [{ id: 'draft-2', categoryId: 'cat-2', quantity: 4 }]);

  const onC = reconcilePickupDraftItems(onB, categoriesC, () => 'draft-4');
  assert.deepEqual(onC, [{ id: 'draft-4', categoryId: 'cat-4', quantity: 1 }]);

  assert.deepEqual(reconcilePickupDraftItems(onC, []), []);
});

test('PickupDraft impide categorías duplicadas al agregar y editar ítems', () => {
  const categories = [{ id: 'cat-1' }, { id: 'cat-2' }];
  const first = [{ id: 'item-1', categoryId: 'cat-1', quantity: 1 }];

  assert.deepEqual(
    remainingPickupCategories(categories, first).map((c) => c.id),
    ['cat-2']
  );

  const second = addPickupDraftItem(first, categories, 'item-2');
  assert.deepEqual(second, [
    { id: 'item-1', categoryId: 'cat-1', quantity: 1 },
    { id: 'item-2', categoryId: 'cat-2', quantity: 1 },
  ]);

  assert.equal(remainingPickupCategories(categories, second).length, 0);
  const afterOverflow = addPickupDraftItem(second, categories, 'item-3');
  assert.equal(afterOverflow.length, 2);

  assert.deepEqual(
    selectableCategoriesForPickupItem(categories, second, 'item-1').map((c) => c.id),
    ['cat-1']
  );
  const unchanged = changePickupDraftItemCategory(second, 'item-1', 'cat-2', categories);
  assert.deepEqual(unchanged, second);
});

test('validatePickupDraft devuelve errores claros por campo y resumen al enviar incompleto', () => {
  const emptyErrors = validatePickupDraft({ items: [], street: '   ', locality: '' });
  assert.equal(hasPickupDraftErrors(emptyErrors), true);
  assert.ok(emptyErrors.items);
  assert.ok(emptyErrors.street);
  assert.ok(emptyErrors.locality);
  assert.equal(emptyErrors.summary, 'Completá los campos obligatorios marcados con *.');

  const localityOnly = validatePickupDraft({
    items: [{ id: 'i1', categoryId: 'cat-1', quantity: 1 }],
    street: 'Av. Rivadavia 100',
    locality: ' ',
  });
  assert.equal(hasPickupDraftErrors(localityOnly), true);
  assert.equal(localityOnly.street, undefined);
  assert.equal(localityOnly.summary, localityOnly.locality);

  const valid = validatePickupDraft({
    items: [{ id: 'i1', categoryId: 'cat-1', quantity: 1 }],
    street: 'Av. Rivadavia 100',
    locality: 'Rosario',
  });
  assert.equal(hasPickupDraftErrors(valid), false);
  assert.equal(valid.summary, undefined);
});
