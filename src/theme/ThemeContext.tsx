import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import {
  getColors,
  parseThemePreference,
  resolveColorScheme,
  type ColorScheme,
  type ThemeColors,
  type ThemePreference,
} from './palette';

const THEME_PREFERENCE_KEY = 'recivolt:theme_preference:v1';

type ThemeContextValue = {
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  preference: 'system',
  setPreference: () => undefined,
  colors: getColors('light'),
});

function readSyncWebPreference(): ThemePreference {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'system';
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_PREFERENCE_KEY));
  } catch {
    return 'system';
  }
}

export function ThemeProvider({
  children,
  schemeOverride,
}: Readonly<{ children: ReactNode; schemeOverride?: ColorScheme }>) {
  const systemScheme = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>(() =>
    readSyncWebPreference()
  );
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (schemeOverride) return;
    let cancelled = false;
    void AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((value) => {
        if (cancelled || dirtyRef.current || !value) return;
        setStoredPreference(parseThemePreference(value));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [schemeOverride]);

  const setPreference = useCallback((next: ThemePreference) => {
    dirtyRef.current = true;
    setStoredPreference(next);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_PREFERENCE_KEY, next);
      } catch {
        // Private browsing or storage restrictions keep in-memory preference.
      }
    }
    void AsyncStorage.setItem(THEME_PREFERENCE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ColorScheme = schemeOverride ?? resolveColorScheme(preference, systemScheme);
  const colors = getColors(scheme);

  useEffect(() => {
    if (schemeOverride) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.dataset.theme = scheme;
      if (document.body) {
        document.body.style.backgroundColor = colors.background;
      }
      return;
    }
    if (Platform.OS !== 'web' && typeof Appearance.setColorScheme === 'function') {
      try {
        Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
      } catch {
        // Ignore on platforms where programmatic native override is unavailable.
      }
    }
  }, [schemeOverride, preference, scheme, colors.background]);

  const value = useMemo(
    () => ({
      scheme,
      preference,
      setPreference,
      colors,
    }),
    [scheme, preference, setPreference, colors]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useColorSchemeName(): ColorScheme {
  return useContext(ThemeContext).scheme;
}

export function useThemePreference() {
  const { preference, scheme, setPreference } = useContext(ThemeContext);
  return { preference, scheme, setPreference };
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
