import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryVisual } from '../src/models/DeviceCategory.ts';

test('getCategoryVisual prioriza notebook sobre computadora', () => {
  const visualNotebook = getCategoryVisual({ name: 'Notebooks y Laptops', slug: 'notebooks' });
  assert.equal(visualNotebook.icon, 'laptop');

  const visualPC = getCategoryVisual({ name: 'Computadoras de escritorio', slug: 'computadoras' });
  assert.equal(visualPC.icon, 'desktop-classic');
});

test('getCategoryVisual usa límites de palabra (no falso positivo en palabras que contienen "pc")', () => {
  const visualOpciones = getCategoryVisual({ name: 'Opciones varias', slug: 'opciones' });
  assert.notEqual(visualOpciones.icon, 'desktop-classic');
  assert.equal(visualOpciones.icon, 'devices');

  const visualPC = getCategoryVisual({ name: 'PC y periféricos' });
  assert.equal(visualPC.icon, 'desktop-classic');
});

test('getCategoryVisual respeta descripción personalizada si está presente', () => {
  const custom = getCategoryVisual({
    name: 'Celulares',
    description: 'Smartphones de cualquier marca con o sin cargador',
  });
  assert.equal(custom.icon, 'cellphone');
  assert.equal(custom.description, 'Smartphones de cualquier marca con o sin cargador');
});

test('getCategoryVisual soporta string directo para retrocompatibilidad', () => {
  const visual = getCategoryVisual('Impresoras y escáneres');
  assert.equal(visual.icon, 'printer');
});
