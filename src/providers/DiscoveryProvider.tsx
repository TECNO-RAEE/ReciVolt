import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import type { DeviceCategory } from '@/models/DeviceCategory';
import type { Coordinates, GreenPoint } from '@/models/GreenPoint';
import { canAccessCitizen } from '@/models/Access';
import { getGreenPoints } from '@/services/green-point.service';
import { getDeviceCategories } from '@/services/device-category.service';
import { getDiscoveryPoints } from '@/data/greenPointExamples';
import { useAuth } from './AuthProvider';

interface DiscoveryContextValue {
  points: GreenPoint[];
  categories: DeviceCategory[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  location: Coordinates | null;
  locating: boolean;
  locationError: string | null;
  requestLocation: () => Promise<void>;
  now: Date;
}
const DiscoveryContext = createContext<DiscoveryContextValue | undefined>(undefined);
export function DiscoveryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { role, guest, user, loading: authLoading, recoveringPassword } = useAuth();
  const enabled = !authLoading && !recoveringPassword && canAccessCitizen(role, guest);
  const [revision, setRevision] = useState(0);
  const scope = enabled ? (user?.id ?? 'guest') : 'disabled';
  const [data, setData] = useState<{
    revision: number;
    scope: string;
    points: GreenPoint[];
    categories: DeviceCategory[];
    error: string | null;
  } | null>(null);
  const [geo, setGeo] = useState<{
    scope: string;
    location: Coordinates | null;
    locating: boolean;
    error: string | null;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const locationRequest = useRef(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void Promise.all([getGreenPoints(controller.signal), getDeviceCategories()])
      .then(([newPoints, newCategories]) => {
        if (!controller.signal.aborted)
          setData({
            revision,
            scope,
            points: getDiscoveryPoints(newPoints, newCategories),
            categories: newCategories,
            error: null,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setData({
            revision,
            scope,
            points: [],
            categories: [],
            error: 'No pudimos cargar los puntos verdes. Revisá tu conexión e intentá nuevamente.',
          });
      });
    return () => controller.abort();
  }, [enabled, scope, revision]);
  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    [scope]
  );
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [enabled]);
  const requestLocation = useCallback(async () => {
    const request = ++locationRequest.current;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setGeo((previous) => ({
      scope,
      location: previous?.scope === scope ? previous.location : null,
      locating: true,
      error: null,
    }));
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request !== locationRequest.current) return;
      if (permission.status !== 'granted') {
        setGeo({
          scope,
          location: null,
          locating: false,
          error:
            'No habilitaste la ubicación. Podés seguir buscando por nombre, dirección o categoría.',
        });
        return;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Location timed out')), 20_000);
        }),
      ]);
      if (request === locationRequest.current)
        setGeo({
          scope,
          location: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          locating: false,
          error: null,
        });
    } catch {
      if (request === locationRequest.current)
        setGeo({
          scope,
          location: null,
          locating: false,
          error:
            'No pudimos obtener tu ubicación. Comprobá que el GPS esté activo o buscá por dirección.',
        });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }, [scope]);
  const current = data?.scope === scope && data.revision === revision ? data : null;
  const currentGeo = geo?.scope === scope ? geo : null;
  return (
    <DiscoveryContext.Provider
      value={{
        points: current?.points ?? [],
        categories: current?.categories ?? [],
        loading: enabled && current === null,
        error: current?.error ?? null,
        refresh,
        location: currentGeo?.location ?? null,
        locating: currentGeo?.locating ?? false,
        locationError: currentGeo?.error ?? null,
        requestLocation,
        now,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}
export function useDiscovery() {
  const value = useContext(DiscoveryContext);
  if (!value) throw new Error('useDiscovery requires DiscoveryProvider');
  return value;
}
