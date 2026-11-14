export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** 'system' sigue al dispositivo; ante un valor desconocido o nulo cae en claro. */
export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined
): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
