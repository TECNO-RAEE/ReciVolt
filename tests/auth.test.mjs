import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real service with an SDK boundary stub; no emails or remote users.
function authService(auth) {
  const exports = {};
  const supabase = {
    auth,
    from() {
      throw new Error('Auth must not write profiles');
    },
  };
  const compiled = ts.transpileModule(
    readFileSync(new URL('../src/services/auth.service.ts', import.meta.url), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;
  vm.runInNewContext(compiled, {
    exports,
    Error,
    require(name) {
      if (name === '@/config/supabase') return { supabase };
      if (name === '@/lib/logger') return { log: { info() {}, error() {}, warn() {} } };
      throw new Error('Unexpected dependency: ' + name);
    },
  });
  return exports;
}

test('registro con confirmación de email mantiene resultado y usa trigger, sin upsert cliente', async () => {
  let input;
  const data = { user: { id: 'user-a' }, session: null };
  const service = authService({
    signUp: async (value) => {
      input = value;
      return { data, error: null };
    },
  });
  assert.equal(
    await service.register({
      name: ' Ana ',
      email: ' ANA@Example.Test ',
      password: 'password',
      termsAcceptedAt: '2026-11-01T12:00:00.000Z',
      termsUrl: null,
    }),
    data
  );
  assert.equal(input.email, 'ana@example.test');
  assert.equal(input.options.data.full_name, 'Ana');
  assert.equal(input.options.data.terms_accepted_at, '2026-11-01T12:00:00.000Z');
  assert.equal(input.options.data.terms_url, null);
});
test('login no depende de poder insertar perfiles ni cierra sesión exitosamente creada', async () => {
  let input;
  const data = { user: { id: 'user-a' }, session: { access_token: 'local-token' } };
  const service = authService({
    signInWithPassword: async (value) => {
      input = value;
      return { data, error: null };
    },
  });
  assert.equal(await service.login(' ANA@Example.Test ', 'password'), data);
  assert.equal(input.email, 'ana@example.test');
});
test('errores Auth se propagan y no se confunden con éxito', async () => {
  const failure = new Error('Invalid credentials');
  const service = authService({ signInWithPassword: async () => ({ data: null, error: failure }) });
  await assert.rejects(service.login('a@example.test', 'wrong'), failure);
});
test('recuperación conserva OTP recovery y exige sesión + usuario', async () => {
  let input;
  const data = { user: { id: 'user-a' }, session: { access_token: 'recovery' } };
  const service = authService({
    verifyOtp: async (value) => {
      input = value;
      return { data, error: null };
    },
  });
  assert.equal(await service.verifyRecoveryCode(' A@Example.Test ', ' 123456 '), data);
  assert.equal(input.type, 'recovery');
  assert.equal(input.email, 'a@example.test');
  assert.equal(input.token, '123456');
  await assert.rejects(
    authService({
      verifyOtp: async () => ({ data: { user: null, session: null }, error: null }),
    }).verifyRecoveryCode('a@example.test', '123456')
  );
});

test('envío de recuperación confirma respuesta Auth y propaga el error para el aviso visible', async () => {
  let email;
  const data = {};
  const service = authService({
    resetPasswordForEmail: async (value) => {
      email = value;
      return { data, error: null };
    },
  });
  assert.equal(await service.sendRecoveryCode(' A@Example.Test '), data);
  assert.equal(email, 'a@example.test');
  const failure = new Error('Email rate limit exceeded');
  await assert.rejects(
    authService({
      resetPasswordForEmail: async () => ({ data: null, error: failure }),
    }).sendRecoveryCode('a@example.test'),
    failure
  );
});
test('guardar password conserva la sesión verificada para volver al inicio; errores se propagan', async () => {
  const calls = [];
  const service = authService({
    updateUser: async (value) => {
      calls.push(['update', value.password]);
      return { data: {}, error: null };
    },
    signOut: async (value) => {
      calls.push(['logout', value.scope]);
      return { error: null };
    },
  });
  await service.updateRecoveredPassword('new-password');
  assert.deepEqual(calls, [['update', 'new-password']]);
  const failure = new Error('Password update failed');
  await assert.rejects(
    authService({
      updateUser: async () => ({ error: failure }),
      signOut: () => assert.fail('must preserve recovery session on failure'),
    }).updateRecoveredPassword('new-password'),
    failure
  );
});
test('logout conserva scope local y propaga errores', async () => {
  let scope;
  const service = authService({
    signOut: async (value) => {
      scope = value.scope;
      return { error: null };
    },
  });
  await service.logout();
  assert.equal(scope, 'local');
  const failure = new Error('Logout failed');
  await assert.rejects(
    authService({ signOut: async () => ({ error: failure }) }).logout(),
    failure
  );
});
