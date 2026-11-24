export interface PickupDraftItem {
  id: string;
  categoryId: string;
  quantity: number;
}

export interface PickupDraftFields {
  street: string;
  locality: string;
  reference: string;
  phone: string;
  notes: string;
}

export interface PickupDraftValidationErrors {
  items?: string;
  street?: string;
  locality?: string;
  summary?: string;
}

/**
 * Returns initial empty pickup form fields without hardcoding a default locality.
 */
export function createEmptyPickupDraftFields(): PickupDraftFields {
  return {
    street: '',
    locality: '',
    reference: '',
    phone: '',
    notes: '',
  };
}

/**
 * Returns categories accepted by the point that are not yet used in the draft items.
 */
export function remainingPickupCategories<T extends { id: string }>(
  categories: readonly T[],
  items: readonly PickupDraftItem[]
): T[] {
  const usedIds = new Set(items.map((item) => item.categoryId));
  return categories.filter((category) => !usedIds.has(category.id));
}

/**
 * Returns categories selectable for a specific draft item without duplicating other items' categories.
 */
export function selectableCategoriesForPickupItem<T extends { id: string }>(
  categories: readonly T[],
  items: readonly PickupDraftItem[],
  editingItemId: string | null
): T[] {
  const usedByOtherItems = new Set(
    items.filter((item) => item.id !== editingItemId).map((item) => item.categoryId)
  );
  return categories.filter((category) => !usedByOtherItems.has(category.id));
}

/**
 * Reconciles draft items when switching points, keeping valid overlapping categories and quantities.
 */
export function reconcilePickupDraftItems(
  currentItems: readonly PickupDraftItem[],
  pointCategories: readonly { id: string }[],
  createId: () => string = () => 'item-1'
): PickupDraftItem[] {
  if (pointCategories.length === 0) {
    return currentItems.length === 0 ? (currentItems as PickupDraftItem[]) : [];
  }

  const validIds = new Set(pointCategories.map((category) => category.id));
  const seen = new Set<string>();
  const kept: PickupDraftItem[] = [];

  for (const item of currentItems) {
    if (!validIds.has(item.categoryId) || seen.has(item.categoryId)) {
      continue;
    }
    seen.add(item.categoryId);
    kept.push(item);
  }

  if (kept.length > 0) {
    const unchanged =
      kept.length === currentItems.length &&
      kept.every((item, index) => item === currentItems[index]);
    return unchanged ? (currentItems as PickupDraftItem[]) : kept;
  }

  return [{ id: createId(), categoryId: pointCategories[0].id, quantity: 1 }];
}

/**
 * Appends a new item using the next unused category, or returns items unchanged if none remain.
 */
export function addPickupDraftItem(
  items: readonly PickupDraftItem[],
  categories: readonly { id: string }[],
  id: string
): PickupDraftItem[] {
  const nextCategory = remainingPickupCategories(categories, items)[0];
  if (!nextCategory) {
    return items as PickupDraftItem[];
  }
  return [...items, { id, categoryId: nextCategory.id, quantity: 1 }];
}

/**
 * Updates an item's category only if the category is accepted and unused by other draft items.
 */
export function changePickupDraftItemCategory(
  items: readonly PickupDraftItem[],
  itemId: string,
  newCategoryId: string,
  categories: readonly { id: string }[]
): PickupDraftItem[] {
  const isAllowed = selectableCategoriesForPickupItem(categories, items, itemId).some(
    (category) => category.id === newCategoryId
  );
  if (!isAllowed) {
    return items as PickupDraftItem[];
  }
  return items.map((item) =>
    item.id === itemId ? { ...item, categoryId: newCategoryId } : item
  );
}

/**
 * Validates required pickup draft fields for inline and submit-banner error feedback.
 */
export function validatePickupDraft(input: {
  items: readonly PickupDraftItem[];
  street: string;
  locality: string;
}): PickupDraftValidationErrors {
  const errors: PickupDraftValidationErrors = {};
  if (input.items.length === 0) {
    errors.items = 'Seleccioná al menos un material a retirar.';
  }
  if (!input.street.trim()) {
    errors.street = 'Ingresá la calle y altura del domicilio de retiro.';
  }
  if (!input.locality.trim()) {
    errors.locality = 'Ingresá la localidad.';
  }

  const ordered = [errors.items, errors.street, errors.locality].filter(
    (message): message is string => Boolean(message)
  );
  if (ordered.length === 1) {
    errors.summary = ordered[0];
  } else if (ordered.length > 1) {
    errors.summary = 'Completá los campos obligatorios marcados con *.';
  }
  return errors;
}

export function hasPickupDraftErrors(errors: PickupDraftValidationErrors): boolean {
  return Boolean(errors.items || errors.street || errors.locality);
}
