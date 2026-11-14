import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';
import {
  isThemePreference,
  resolveScheme,
  type ColorScheme,
  type ThemePreference,
} from './preference';

export type { ColorScheme, ThemePreference };

const STORAGE_KEY = 'recivolt.theme-preference';

interface ThemeContextValue {
  scheme: ColorScheme;
  preference: ThemePreference;
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  preference: 'system',
  colors: lightColors,
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = resolveScheme(preference, system);
    return {
      scheme,
      preference,
      colors: scheme === 'dark' ? darkColors : lightColors,
      setPreference,
    };
  }, [preference, system, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

type StyleFactory<T> = (colors: ThemeColors) => T;
const styleCache = new WeakMap<object, Partial<Record<ColorScheme, unknown>>>();

/**
 * Devuelve los estilos de `make` calculados con la paleta activa. El resultado se cachea por
 * fábrica y esquema, así que no se recrea `StyleSheet` en cada render.
 */
export function useThemedStyles<T>(make: StyleFactory<T>): T {
  const { scheme, colors } = useContext(ThemeContext);
  let entry = styleCache.get(make);
  if (!entry) {
    entry = {};
    styleCache.set(make, entry);
  }
  if (!(scheme in entry)) entry[scheme] = make(colors);
  return entry[scheme] as T;
}
