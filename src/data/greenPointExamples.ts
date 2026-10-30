import type { DeviceCategory } from '@/models/DeviceCategory';
import type { GreenPoint } from '@/models/GreenPoint';

// Call only after a successful catalog load; errors and pending loads are not empty catalogs.
export function getDiscoveryPoints(
  points: GreenPoint[],
  categories: readonly DeviceCategory[]
): GreenPoint[] {
  if (points.length) return points;
  return [
    {
      id: 'example-universidad-de-pilar',
      companyId: 'example-universidad-de-pilar',
      companyName: 'Universidad de Pilar',
      name: 'Universidad de Pilar',
      address: 'Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires',
      // SEDE PELLEGRINI in the public map linked by unpilar.edu.ar/INGRESANTES.
      // Source and limits of precision are recorded in tasks/plan.md.
      latitude: -34.4378787,
      longitude: -58.892156,
      phone: null,
      description:
        'Punto verde de ejemplo. Podés explorar sus datos, pero no registrar entregas reales. La tarifa de puntos por dispositivo todavía no está definida.',
      timeZone: 'America/Argentina/Buenos_Aires',
      pickupEnabled: false,
      categories: [],
      intakeConfirmed: false,
      intakePolicies: [],
      schedules: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        opensMinute: 600,
        closesMinute: 1200,
      })),
      demo: true,
    },
  ];
}
