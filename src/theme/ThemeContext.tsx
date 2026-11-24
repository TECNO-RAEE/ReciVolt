import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getColors, type ColorScheme, type ThemeColors } from './palette';

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: getColors('light'),
});

export function ThemeProvider({
  children,
  schemeOverride,
}: Readonly<{ children: ReactNode; schemeOverride?: ColorScheme }>) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = schemeOverride ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const value = useMemo(
    () => ({
      scheme,
      colors: getColors(scheme),
    }),
    [scheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useColorSchemeName(): ColorScheme {
  return useContext(ThemeContext).scheme;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
