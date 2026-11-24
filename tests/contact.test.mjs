import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadContactConfig(env = {}) {
  const brandJson = JSON.parse(
    readFileSync(new URL('../src/config/brand.json', import.meta.url), 'utf8')
  );
  const brandExports = {};
  const brandCode = ts.transpileModule(
    readFileSync(new URL('../src/config/brand.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(brandCode, {
    exports: brandExports,
    require(name) {
      assert.equal(name, './brand.json');
      return brandJson;
    },
  });

  const exports = {};
  const contactCode = ts.transpileModule(
    readFileSync(new URL('../src/config/contact.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(contactCode, {
    exports,
    process: { env },
    require(name) {
      assert.equal(name, './brand');
      return brandExports;
    },
  });
  return exports;
}

test('contactTopics incluye soporte general como opción además de punto verde y premio', () => {
  const { contactTopics } = loadContactConfig();
  assert.deepEqual(Object.keys(contactTopics), ['support', 'point', 'reward']);
  assert.equal(contactTopics.support.title, 'Soporte o consulta');
  assert.match(contactTopics.support.subject, /ReciVolt/);
  assert.ok(contactTopics.support.fields.length >= 3);
  assert.equal(contactTopics.point.title, 'Sumarme como punto verde');
  assert.equal(contactTopics.reward.title, 'Ofrecer un premio');
});

test('resolveContactTopic usa support por defecto y preserva point/reward cuando corresponde', () => {
  const { resolveContactTopic } = loadContactConfig();
  assert.equal(resolveContactTopic(undefined), 'support');
  assert.equal(resolveContactTopic(''), 'support');
  assert.equal(resolveContactTopic('unknown'), 'support');
  assert.equal(resolveContactTopic('support'), 'support');
  assert.equal(resolveContactTopic('point'), 'point');
  assert.equal(resolveContactTopic('reward'), 'reward');
  assert.equal(resolveContactTopic(['point', 'reward']), 'point');
  assert.equal(resolveContactTopic(['invalid']), 'support');
});

test('contactEmail recorta espacios y queda vacío si no está configurado', () => {
  assert.equal(loadContactConfig({}).contactEmail, '');
  assert.equal(loadContactConfig({ EXPO_PUBLIC_CONTACT_EMAIL: '   ' }).contactEmail, '');
  assert.equal(
    loadContactConfig({ EXPO_PUBLIC_CONTACT_EMAIL: '  hola@recivolt.test  ' }).contactEmail,
    'hola@recivolt.test'
  );
});

test('buildContactMailBody arma la plantilla con los campos del motivo elegido', () => {
  const { buildContactMailBody } = loadContactConfig();
  const supportBody = buildContactMailBody('support');
  assert.match(supportBody, /ReciVolt/);
  assert.match(supportBody, /Tu nombre y email de contacto:/);
  assert.match(supportBody, /Descripción de tu consulta o problema:/);

  const pointBody = buildContactMailBody('point');
  assert.match(pointBody, /Nombre del punto verde o institución:/);
});
