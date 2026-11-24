import assert from 'node:assert/strict';
import { test } from 'node:test';
import { darkColors, getColors, lightColors } from '../src/theme/palette.ts';

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]) {
  return [r, g, b].reduce((acc, c, i) => {
    const v = c / 255;
    const linear = v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return acc + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function blendRgbaOverHex(rgba, bgHex) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const [br, bg, bb] = hexToRgb(bgHex);
  return `#${[r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)]
    .map((x) => Math.round(x).toString(16).padStart(2, '0'))
    .join('')}`;
}

function contrastRatio(fg, bg) {
  const resolvedBg = bg.startsWith('rgba') ? bg : bg;
  const resolvedFg = fg.startsWith('rgba') ? blendRgbaOverHex(fg, resolvedBg) : fg;
  const l1 = luminance(hexToRgb(resolvedFg));
  const l2 = luminance(hexToRgb(resolvedBg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test('lightColors y darkColors exponen exactamente los mismos tokens semánticos', () => {
  assert.deepEqual(Object.keys(lightColors).sort(), Object.keys(darkColors).sort());
  assert.equal(getColors('light'), lightColors);
  assert.equal(getColors('dark'), darkColors);
  assert.equal(getColors(null), lightColors);
  assert.equal(getColors(undefined), lightColors);
});

test('darkColors respeta jerarquía de superficies Apple HIG sin fondos blancos puros', () => {
  assert.ok(luminance(hexToRgb(darkColors.surface)) > luminance(hexToRgb(darkColors.background)));
  assert.ok(luminance(hexToRgb(darkColors.surfaceSoft)) > luminance(hexToRgb(darkColors.surface)));
  assert.notEqual(darkColors.surface.toLowerCase(), '#ffffff');
  assert.notEqual(darkColors.background.toLowerCase(), '#ffffff');
  assert.notEqual(darkColors.tabBarBackground.toLowerCase(), '#ffffff');
  assert.equal(darkColors.qrBackground.toUpperCase(), '#FFFFFF');
});

test('lightColors y darkColors cumplen contraste WCAG AA en texto y controles', () => {
  for (const [name, p] of [
    ['light', lightColors],
    ['dark', darkColors],
  ]) {
    const dangerOverSurface = blendRgbaOverHex(p.dangerBackground, p.surface);
    const textPairs = [
      ['text on background', p.text, p.background],
      ['text on surface', p.text, p.surface],
      ['text on surfaceSoft', p.text, p.surfaceSoft],
      ['textSecondary on background', p.textSecondary, p.background],
      ['textSecondary on surface', p.textSecondary, p.surface],
      ['textSecondary on primarySoft', p.textSecondary, p.primarySoft],
      ['primary on background', p.primary, p.background],
      ['primary on surface', p.primary, p.surface],
      ['primaryDark on primarySoft', p.primaryDark, p.primarySoft],
      ['primaryDark on surface', p.primaryDark, p.surface],
      ['brandDark on background', p.brandDark, p.background],
      ['brandDark on surface', p.brandDark, p.surface],
      ['textOnPrimary on primaryAction', p.textOnPrimary, p.primaryAction],
      ['textOnPrimary on dangerAction', p.textOnPrimary, p.dangerAction],
      ['danger on background', p.danger, p.background],
      ['danger on surface', p.danger, p.surface],
      ['danger on dangerBackground', p.danger, dangerOverSurface],
      ['impactValue on impactBackground', p.impactValue, p.impactBackground],
      ['impactWeight on impactBackground', p.impactWeight, p.impactBackground],
      ['primary on tabBarBackground', p.primary, p.tabBarBackground],
      ['navInactive on tabBarBackground', p.navInactive, p.tabBarBackground],
      ['warning on warningSoft', p.warning, p.warningSoft],
      ['warningSecondary on warningSoft', p.warningSecondary, p.warningSoft],
      ['warning on warningSurface', p.warning, p.warningSurface],
      ['info on infoSoft', p.info, p.infoSoft],
      ['infoSecondary on infoSoft', p.infoSecondary, p.infoSoft],
      ['info on infoSurface', p.info, p.infoSurface],
    ];
    for (const [pair, fg, bg] of textPairs) {
      const r = contrastRatio(fg, bg);
      assert.ok(r >= 4.5, `${name} ${pair} debe superar 4.5:1 (actual: ${r.toFixed(2)}:1)`);
    }
    const controlRatio = contrastRatio(p.borderControl, p.surface);
    assert.ok(
      controlRatio >= 3.0,
      `${name} borderControl on surface debe superar 3:1 (actual: ${controlRatio.toFixed(2)}:1)`
    );
  }
});
