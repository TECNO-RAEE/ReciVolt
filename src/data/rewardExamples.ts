import type { Reward } from '@/models/Reward';
// Used only in the explicitly labelled preview when no businesses have published rewards.
export const rewardExamples: Reward[] = [
  [
    'medialuna',
    'Medialuna gratis',
    'Panadería La Plaza',
    'food',
    10,
    'photo-1555507036-ab1f4038808a',
  ],
  [
    'gimnasio',
    '20% OFF en membresías',
    'Gym Norte',
    'wellness',
    50,
    'photo-1517836357463-d25dfeac3438',
  ],
  ['cafe', 'Un café', 'Cafe del Pellegrini', 'food', 100, 'photo-1509042239860-f550ce710b93'],
  [
    'libros',
    'Descuento en librería',
    'Librería El Faro',
    'education',
    25,
    'photo-1495446815901-a7297e633e8d',
  ],
  [
    'plantin',
    'Plantín nativo',
    'Vivero Raíces',
    'shopping',
    30,
    'photo-1416879595882-3373a0480b5b',
  ],
  [
    'botella',
    'Botella reutilizable',
    'EcoTienda Verde',
    'shopping',
    40,
    'photo-1602143407151-7111542de6e8',
  ],
].map(([id, title, businessName, category, pointsCost, photo]) => ({
  id: `example-${id}`,
  companyId: '',
  title: String(title),
  businessName: String(businessName),
  category: category as Reward['category'],
  pointsCost: Number(pointsCost),
  imageUrl: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=85`,
  description:
    id === 'cafe'
      ? 'Premio de ejemplo: un café en Cafe del Pellegrini por 100 puntos globales. Esta muestra no permite canjes reales.'
      : 'Un ejemplo de los beneficios que podés disfrutar al darle una nueva vida a tu tecnología. Los premios reales aparecerán cuando los comercios los publiquen.',
  address:
    id === 'cafe'
      ? 'Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires'
      : '',
  hours: '',
  latitude: null,
  longitude: null,
  stock: null,
  active: true,
  startsAt: null,
  endsAt: null,
  demo: true,
}));
