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
  if (/(comput|notebook|tablet|celular|telefono|impres|fax|parlante|audio|comunic)/.test(value))
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
