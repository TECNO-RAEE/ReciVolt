import assert from 'node:assert/strict';
import { test } from 'node:test';
import { humanizePortalError } from '../src/models/PortalError.ts';

const fallback = 'No pudimos completar la acción.';

test('traduce errores de red y conectividad a español claro', () => {
  for (const cause of [
    new Error('Failed to fetch'),
    new TypeError('Network request failed'),
    { message: 'Load failed' },
    { name: 'AuthRetryableFetchError', message: 'Request failed', status: 0 },
    { message: 'Service Unavailable', status: 503 },
  ]) {
    const msg = humanizePortalError(cause, fallback);
    assert.match(msg, /conexi[oó]n|conectarnos/i);
    assert.doesNotMatch(msg, /fetch|Network|Load failed|Unavailable/i);
  }
});

test('traduce errores de JWT y sesión expirada sin exponer detalles técnicos', () => {
  for (const cause of [
    { code: 'PGRST301', message: 'JWT expired' },
    new Error('Invalid JWT'),
    { code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' },
    { status: 401, message: 'Unauthorized' },
  ]) {
    const msg = humanizePortalError(cause, fallback);
    assert.match(msg, /sesi[oó]n/i);
    assert.doesNotMatch(msg, /JWT|PGRST|Refresh Token|Unauthorized/i);
  }
});

test('traduce códigos PostgREST PGRST* y errores de Postgres', () => {
  assert.equal(
    humanizePortalError(
      { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      fallback
    ),
    'No encontramos el registro solicitado.'
  );

  const schemaMsg = humanizePortalError(
    { code: 'PGRST204', message: "Could not find the 'foo' column of 'bar' in the schema cache" },
    fallback
  );
  assert.doesNotMatch(schemaMsg, /PGRST|schema cache|column/i);

  const permissionMsg = humanizePortalError(
    { code: '42501', message: 'permission denied for table companies' },
    fallback
  );
  assert.match(permissionMsg, /permisos/i);

  const rlsMsg = humanizePortalError(
    { message: 'new row violates row-level security policy for table "deliveries"' },
    fallback
  );
  assert.match(rlsMsg, /permisos/i);

  const duplicateMsg = humanizePortalError(
    { code: '23505', message: 'duplicate key value violates unique constraint "companies_pkey"' },
    fallback
  );
  assert.match(duplicateMsg, /ya existe/i);

  const syntaxMsg = humanizePortalError(
    { code: '22P02', message: 'invalid input syntax for type uuid: "abc"' },
    fallback
  );
  assert.match(syntaxMsg, /datos ingresados no son v[aá]lidos/i);

  const constraintMsg = humanizePortalError(
    { message: 'new row for relation "deliveries" violates check constraint "qty_positive"' },
    fallback
  );
  assert.match(constraintMsg, /datos ingresados no son v[aá]lidos/i);

  assert.equal(
    humanizePortalError({ code: '22023', message: 'Invalid point time zone' }, fallback),
    'La zona horaria del punto no es válida.'
  );
});

test('conserva sin alterar los mensajes de dominio y validación ya escritos en español', () => {
  const spanishErrors = [
    { code: '42501', message: 'Premio ajeno a esta empresa.' },
    { code: '42501', message: 'Sólo el responsable puede solicitar una ampliación.' },
    { code: '22023', message: 'Indicá el estado y el motivo del cambio.' },
    new Error('Usá puntos enteros entre 0 y 1.000.000.'),
    new Error('Empresa no encontrada.'),
    'Cupo agotado.',
  ];

  for (const cause of spanishErrors) {
    const expected = typeof cause === 'string' ? cause : cause.message;
    assert.equal(humanizePortalError(cause, fallback), expected);
  }
});

test('usa el fallback ante valores vacíos o errores técnicos en inglés no clasificados', () => {
  for (const cause of [
    null,
    undefined,
    {},
    new Error(''),
    new Error('column "foo" does not exist'),
    new Error('TypeError: cannot read properties of undefined'),
    new Error('Something went wrong while executing query'),
  ]) {
    assert.equal(humanizePortalError(cause, fallback), fallback);
  }
});
