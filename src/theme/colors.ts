export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  surfaceSoft: string;
  accent: string;
  brandDark: string;
  impactValue: string;
  impactWeight: string;
  danger: string;
  dangerBackground: string;
  overlay: string;
  background: string;
  surface: string;
  tabBarBackground: string;
  impactBackground: string;
  avatarBackground: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  borderPrimary: string;
  tabInactive: string;
}

export const lightColors: ThemeColors = {
  // Brand
  primary: '#246440',
  primaryDark: '#174F32',
  primarySoft: '#E7F3EB',
  surfaceSoft: '#F1F7F3',
  accent: '#50B43C',
  brandDark: '#10282C',
  impactValue: '#0B5C27',
  impactWeight: '#0E5C28',

  // Feedback
  danger: '#A30303',
  dangerBackground: 'rgba(179, 38, 30, 0.16)',
  overlay: 'rgba(16, 40, 44, 0.55)',

  // Backgrounds
  background: '#F8FBF9',
  surface: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  impactBackground: '#E8F3EC',
  avatarBackground: '#D9D9D9',

  // Text
  text: '#102530',
  textSecondary: '#53676D',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E2EBE6',
  borderPrimary: '#246440',

  // Navigation
  tabInactive: '#748591',
};

/**
 * Paleta oscura. Los verdes de marca se aclaran para conservar contraste sobre fondos
 * oscuros (>= 4.5:1 en texto); por eso `textOnPrimary` pasa a ser casi negro.
 */
export const darkColors: ThemeColors = {
  primary: '#5CC38A',
  primaryDark: '#8ED6AE',
  primarySoft: '#1B3328',
  surfaceSoft: '#14221C',
  accent: '#6CCB57',
  brandDark: '#D3E6DB',
  impactValue: '#7FDDA0',
  impactWeight: '#7FDDA0',

  danger: '#FF8A80',
  dangerBackground: 'rgba(255, 138, 128, 0.18)',
  overlay: 'rgba(0, 0, 0, 0.65)',

  background: '#0D1612',
  surface: '#16221D',
  tabBarBackground: '#111C17',
  impactBackground: '#17291F',
  avatarBackground: '#34423B',

  text: '#E6F0EA',
  textSecondary: '#A3B7AD',
  textOnPrimary: '#06140C',

  border: '#2A3A33',
  borderPrimary: '#5CC38A',

  tabInactive: '#8A9C93',
};

/**
 * Paleta clara fija, solo para código que no puede usar hooks (p. ej. configuración
 * estática). En componentes usá `useColors()` para respetar el tema elegido.
 */
export const colors = lightColors;
