export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme?: ColorScheme | 'unspecified' | null
): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export const lightColors = {
  // Brand
  primary: '#246440',
  primaryAction: '#246440',
  primaryDark: '#174F32',
  primarySoft: '#E7F3EB',
  surfaceSoft: '#F1F7F3',
  accent: '#50B43C',
  brandDark: '#10282C',
  impactValue: '#0B5C27',
  impactWeight: '#0E5C28',

  // Feedback
  danger: '#A30303',
  dangerAction: '#A30303',
  dangerBackground: 'rgba(179, 38, 30, 0.16)',
  overlay: 'rgba(16, 40, 44, 0.55)',
  warning: '#6D4C00',
  warningSecondary: '#8D6B00',
  warningSoft: '#FFF8E1',
  warningSurface: '#FFF0B2',
  warningBorder: '#FFE082',
  info: '#0B4B75',
  infoSecondary: '#155B8A',
  infoSoft: '#E8F3FA',
  infoSurface: '#CEE8F7',
  infoBorder: '#BFE0F2',
  successBorder: '#B9DFC4',
  successIconBackground: '#D1EBD9',

  // Backgrounds
  background: '#F8FBF9',
  surface: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  impactBackground: '#E8F3EC',
  avatarBackground: '#D9D9D9',
  skeletonHighlight: '#D6E7DB',
  qrBackground: '#FFFFFF',

  // Text
  text: '#102530',
  textSecondary: '#53676D',
  textOnPrimary: '#FFFFFF',

  // Navigation
  navInactive: '#53676D',

  // Borders
  border: '#E2EBE6',
  borderControl: '#748591',
  borderPrimary: '#246440',
  cardBorderSubtle: '#FFFFFF',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

export const darkColors: ThemeColors = {
  // Brand
  primary: '#5CD08C',
  primaryAction: '#256D46',
  primaryDark: '#8CE4AF',
  primarySoft: '#193426',
  surfaceSoft: '#1D3027',
  accent: '#5CD08C',
  brandDark: '#E4F2EA',
  impactValue: '#6EE09B',
  impactWeight: '#82E4A8',

  // Feedback
  danger: '#FF8A80',
  dangerAction: '#B9261E',
  dangerBackground: 'rgba(255, 92, 82, 0.18)',
  overlay: 'rgba(4, 10, 7, 0.72)',
  warning: '#F6D06B',
  warningSecondary: '#E8BA46',
  warningSoft: '#2D2512',
  warningSurface: '#3D3116',
  warningBorder: '#5C491F',
  info: '#86CCFA',
  infoSecondary: '#74BEF0',
  infoSoft: '#132635',
  infoSurface: '#1A354A',
  infoBorder: '#284D6B',
  successBorder: '#2D543D',
  successIconBackground: '#214231',

  // Backgrounds
  background: '#0C1511',
  surface: '#15231C',
  tabBarBackground: '#121F19',
  impactBackground: '#193426',
  avatarBackground: '#263B30',
  skeletonHighlight: '#284435',
  qrBackground: '#FFFFFF',

  // Text
  text: '#EDF5F0',
  textSecondary: '#A7BBB1',
  textOnPrimary: '#FFFFFF',

  // Navigation
  navInactive: '#9BB0A5',

  // Borders
  border: '#263A30',
  borderControl: '#6E877A',
  borderPrimary: '#5CD08C',
  cardBorderSubtle: '#2D4739',
};

export function getColors(scheme?: ColorScheme | null): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
