/**
 * iOS-aligned 60/120fps motion tokens for ReciVolt.
 * Kept pure (no native imports) so theme tests run without UI bindings.
 */
export const motion = {
  pressSpring: {
    damping: 22,
    stiffness: 420,
    mass: 0.7,
  },
  sheetSpring: {
    damping: 28,
    stiffness: 320,
    mass: 0.9,
  },
  iconSpring: {
    damping: 18,
    stiffness: 340,
    mass: 0.8,
  },
  duration: {
    pressFade: 110,
    backdropIn: 220,
    backdropOut: 160,
    sheetOut: 180,
    dialogIn: 220,
    dialogOut: 150,
    skeletonPulse: 900,
  },
  scale: {
    button: 0.975,
    card: 0.98,
    chip: 0.96,
    row: 0.99,
    icon: 0.92,
  },
  opacity: {
    pressed: 0.82,
    pressedSubtle: 0.88,
  },
  sheetSlideDistance: 72,
  dialogStartScale: 0.94,
} as const;
