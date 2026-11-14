import type { MaterialCommunityIcons } from '@expo/vector-icons';

export interface DeviceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  groupKey?: string;
}

export type DeviceIntakeMode = 'onsite' | 'pickup' | 'not_accepted';

export interface DeviceIntakePolicy {
  categoryId: string;
  mode: DeviceIntakeMode;
  category?: DeviceCategory;
}

export function getDeviceCategoryGroupKey(category: {
  name?: string;
  slug?: string;
  groupKey?: string | null;
}): string {
  if (category.groupKey) return category.groupKey;
  const value = `${category.slug ?? ''} ${category.name ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
  if (/(pila|bateria|mercurio|termometro|fluorescente|medic|dialisis|cardiologia)/.test(value))
    return 'especiales';
  if (
    /(comput|notebook|tablet|celular|telefono|impres|fax|parlante|audio|comunic|monitor|auricular)/.test(
      value
    )
  )
    return 'informatica';
  if (
    /(electro|heladera|freezer|lavar|cocina|microonda|radio|televisor|aspiradora|ventilador)/.test(
      value
    )
  )
    return 'electrodomesticos';
  if (/(cable|enchufe|zapatilla|aplique|cargador|insumo)/.test(value)) return 'insumos';
  if (/(herramienta|soldar|cortar)/.test(value)) return 'herramientas';
  if (/(juguete|consola|videojuego|deportivo|tren)/.test(value)) return 'juguetes';
  return 'otros';
}

export interface CategoryVisual {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}

/**
 * Returns a robust icon and description for a category based on word boundary matching,
 * prioritizing specific devices (e.g. notebooks before computers) and honoring category.description if provided.
 */
export function getCategoryVisual(
  input: { name?: string; slug?: string; description?: string } | string
): CategoryVisual {
  const name = typeof input === 'string' ? input : (input.name ?? '');
  const slug = typeof input === 'string' ? '' : (input.slug ?? '');
  const customDesc = typeof input === 'string' ? undefined : input.description;

  const target = `${slug} ${name}`.toLowerCase();

  // 1. Notebooks / Laptops (MUST check before generic computers)
  if (/\b(notebook|notebooks|laptop|laptops|netbook|netbooks)\b/i.test(target)) {
    return {
      icon: 'laptop',
      description: customDesc || 'Notebooks, netbooks y cargadores.',
    };
  }

  // 2. Computadoras de escritorio / PCs
  if (
    /\b(pc|computadora|computadoras|computador|computadores|desktop|cpu|monitor|monitores)\b/i.test(
      target
    )
  ) {
    return {
      icon: 'desktop-classic',
      description: customDesc || 'PC de escritorio, monitores y periféricos.',
    };
  }

  // 3. Celulares / Smartphones
  if (
    /\b(celular|celulares|telefono|telefonos|teléfono|teléfonos|smartphone|smartphones|movil|moviles|móvil|móviles)\b/i.test(
      target
    )
  ) {
    return {
      icon: 'cellphone',
      description: customDesc || 'Teléfonos móviles, smartphones y cargadores.',
    };
  }

  // 4. Tablets
  if (/\b(tablet|tablets|ipad|ipads|e-reader|ereader)\b/i.test(target)) {
    return {
      icon: 'tablet',
      description: customDesc || 'Tablets y lectores de libros digitales.',
    };
  }

  // 5. Pequeños electrodomésticos
  if (
    /\b(electrodomestico|electrodomesticos|electrodoméstico|electrodomésticos|hogar|microondas|licuadora|cafetera)\b/i.test(
      target
    )
  ) {
    return {
      icon: 'microwave',
      description: customDesc || 'Pequeños electrodomésticos del hogar.',
    };
  }

  // 6. Audio / Auriculares / Parlantes
  if (
    /\b(audio|sonido|auricular|auriculares|parlante|parlantes|microfono|micrófono)\b/i.test(target)
  ) {
    return {
      icon: 'headphones',
      description: customDesc || 'Equipos de sonido, auriculares y parlantes.',
    };
  }

  // 7. Consolas y videojuegos
  if (
    /\b(consola|consolas|videojuego|videojuegos|joystick|joysticks|playstation|xbox|nintendo)\b/i.test(
      target
    )
  ) {
    return {
      icon: 'gamepad-variant',
      description: customDesc || 'Consolas de videojuegos y controles.',
    };
  }

  // 8. Impresoras y escáneres
  if (/\b(impresora|impresoras|scanner|scanners|escaner|escáner|toner)\b/i.test(target)) {
    return {
      icon: 'printer',
      description: customDesc || 'Impresoras, multifuncionales y escáneres.',
    };
  }

  // 9. Baterías y pilas
  if (/\b(bateria|baterias|batería|baterías|pila|pilas|acumulador|acumuladores)\b/i.test(target)) {
    return {
      icon: 'battery-charging',
      description: customDesc || 'Baterías y acumuladores eléctricos.',
    };
  }

  // 10. Cables y conectores
  if (/\b(cable|cables|cargador|cargadores|adaptador|adaptadores)\b/i.test(target)) {
    return {
      icon: 'cable-data',
      description: customDesc || 'Cables de alimentación y adaptadores.',
    };
  }

  // Fallback genérico
  return {
    icon: 'devices',
    description: customDesc || 'Dispositivos y accesorios electrónicos.',
  };
}

/** Orden fijo en que se muestran los grupos de categorías (chips del mapa, íconos de pines). */
export const CATEGORY_GROUP_ORDER = [
  'especiales',
  'informatica',
  'electrodomesticos',
  'insumos',
  'herramientas',
  'juguetes',
  'otros',
] as const;
export type CategoryGroupKey = (typeof CATEGORY_GROUP_ORDER)[number];

export const CATEGORY_GROUP_LABELS: Record<CategoryGroupKey, string> = {
  especiales: 'Pilas y baterías',
  informatica: 'Celulares y computadoras',
  electrodomesticos: 'Electrodomésticos',
  insumos: 'Cables y cargadores',
  herramientas: 'Herramientas',
  juguetes: 'Juguetes y consolas',
  otros: 'Otros',
};

/** Ícono (MaterialCommunityIcons) que identifica a cada grupo en los pines del mapa. */
export const CATEGORY_GROUP_ICONS: Record<
  CategoryGroupKey,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  especiales: 'battery',
  informatica: 'cellphone',
  electrodomesticos: 'washing-machine',
  insumos: 'power-plug',
  herramientas: 'tools',
  juguetes: 'gamepad-variant',
  otros: 'recycle',
};

function asGroupKey(key: string): CategoryGroupKey {
  return (CATEGORY_GROUP_ORDER as readonly string[]).includes(key)
    ? (key as CategoryGroupKey)
    : 'otros';
}

export interface CategoryGroup {
  key: CategoryGroupKey;
  label: string;
  categoryIds: string[];
}

/** Agrupa las categorías disponibles por tipo de residuo, en orden fijo y sin grupos vacíos. */
export function groupCategories(categories: readonly DeviceCategory[]): CategoryGroup[] {
  const byKey = new Map<CategoryGroupKey, string[]>();
  for (const category of categories) {
    const key = asGroupKey(getDeviceCategoryGroupKey(category));
    byKey.set(key, [...(byKey.get(key) ?? []), category.id]);
  }
  return CATEGORY_GROUP_ORDER.filter((key) => byKey.has(key)).map((key) => ({
    key,
    label: CATEGORY_GROUP_LABELS[key],
    categoryIds: byKey.get(key) ?? [],
  }));
}

/** Un grupo está activo cuando todas sus categorías están seleccionadas. */
export function isGroupSelected(group: CategoryGroup, selectedIds: readonly string[]): boolean {
  return group.categoryIds.length > 0 && group.categoryIds.every((id) => selectedIds.includes(id));
}

/** Activa o desactiva todas las categorías de un grupo sin tocar las demás selecciones. */
export function toggleGroupSelection(group: CategoryGroup, selectedIds: readonly string[]): string[] {
  if (isGroupSelected(group, selectedIds))
    return selectedIds.filter((id) => !group.categoryIds.includes(id));
  return [...new Set([...selectedIds, ...group.categoryIds])];
}

/**
 * Grupo "principal" de un punto: el más frecuente entre sus categorías aceptadas
 * (desempata por el orden fijo de grupos). Sin categorías devuelve 'otros'.
 */
export function dominantGroupKey(categories: readonly DeviceCategory[]): CategoryGroupKey {
  const counts = new Map<CategoryGroupKey, number>();
  for (const category of categories) {
    const key = asGroupKey(getDeviceCategoryGroupKey(category));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: CategoryGroupKey = 'otros';
  let bestCount = 0;
  for (const key of CATEGORY_GROUP_ORDER) {
    const count = counts.get(key) ?? 0;
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
