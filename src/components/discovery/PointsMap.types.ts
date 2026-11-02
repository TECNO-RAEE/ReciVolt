import type { Coordinates, GreenPoint } from '@/models/GreenPoint';
export interface PointsMapProps {
  points: GreenPoint[];
  location?: Coordinates | null;
  preview?: boolean;
  /** Ocupa todo el alto disponible del contenedor en vez de una altura fija. */
  fill?: boolean;
  /** Punto destacado con un marcador distinto (p. ej. el de la tarjeta flotante). */
  selectedId?: string | null;
  onSelect: (point: GreenPoint) => void;
}
