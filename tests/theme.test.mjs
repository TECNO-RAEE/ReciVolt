import assert from 'node:assert/strict';
import { test } from 'node:test';
import { darkColors, lightColors } from '../src/theme/colors.ts';
import { isThemePreference, resolveScheme } from '../src/theme/preference.ts';

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Pares (texto, fondo) que la app usa realmente; todos deben cumplir WCAG AA (4.5:1).
const PAIRS = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceSoft'],
  ['textOnPrimary', 'primary'],
  ['textOnPrimary', 'primaryDark'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primaryDark', 'primarySoft'],
  ['brandDark', 'background'],
  ['impactValue', 'impactBackground'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['text', 'tabBarBackground'],
];

for (const [name, palette] of [['claro', lightColors], ['oscuro', darkColors]]) {
  test(`paleta ${name}: contraste AA en los pares de uso real`, () => {
    for (const [fg, bg] of PAIRS) {
      const ratio = contrast(palette[fg], palette[bg]);
      assert.ok(ratio >= 4.5, `${name}: ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 (< 4.5)`);
    }
  });
}

test('ambas paletas definen exactamente las mismas claves', () => {
  assert.deepEqual(Object.keys(darkColors).sort(), Object.keys(lightColors).sort());
});

test('resolveScheme respeta la preferencia y sigue al sistema en automático', () => {
  assert.equal(resolveScheme('dark', 'light'), 'dark');
  assert.equal(resolveScheme('light', 'dark'), 'light');
  assert.equal(resolveScheme('system', 'dark'), 'dark');
  assert.equal(resolveScheme('system', 'light'), 'light');
  assert.equal(resolveScheme('system', null), 'light');
  assert.equal(resolveScheme('system', undefined), 'light');
});

test('isThemePreference descarta valores guardados inválidos', () => {
  assert.ok(isThemePreference('system') && isThemePreference('dark') && isThemePreference('light'));
  assert.ok(!isThemePreference('auto') && !isThemePreference(null) && !isThemePreference(1));
});
