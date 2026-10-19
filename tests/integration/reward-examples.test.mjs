import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_DIR || 'playwright');
const base = process.env.TEST_APP_URL || 'http://localhost:8083';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test app');
const cafeCard = 'Un café, Cafe del Pellegrini, 100 puntos. Ver detalle';
const realReward = {
  id: '11111111-1111-4111-8111-111111111111',
  company_id: '22222222-2222-4222-8222-222222222222',
  title: 'Beneficio real de prueba',
  business_name: 'Comercio de prueba',
  points_cost: 50,
  category: 'food',
  active: true,
  stock: 1,
  starts_at: null,
  ends_at: null,
};

async function setup(page, state = { mode: 'empty' }) {
  page.setDefaultTimeout(15000);
  const errors = [];
  const commands = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/rest/v1/rewards?*', async (route) => {
    if (state.mode === 'loading') await state.pending;
    if (state.mode === 'error') return route.abort('failed');
    await route.fulfill({ json: state.mode === 'real' ? [realReward] : [] });
  });
  await page.route('**/rest/v1/rpc/reward_command', async (route) => {
    commands.push(route.request().method());
    await route.abort();
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
  await page.waitForURL('**/home');
  return { errors, commands };
}

async function capture(page, name) {
  await mkdir('output/verification', { recursive: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    page.viewportSize().width
  );
  await page.screenshot({ path: `output/verification/cafe-${name}.png`, fullPage: true });
}

test('invitado encuentra el café y explora su ficha sin poder canjear', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const { errors, commands } = await setup(page);
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: cafeCard, exact: true }).waitFor();
    await page.getByRole('button', { name: /Medialuna gratis, Panadería La Plaza/ }).waitFor();
    await page.getByRole('button', { name: 'Buscar premios', exact: true }).click();
    const search = page.getByRole('textbox', { name: 'Buscar por premio o comercio' });
    await search.fill('Pellegrini');
    await page.getByRole('button', { name: 'Gastronomía', exact: true }).click();
    await page.getByRole('button', { name: cafeCard, exact: true }).waitFor();
    await capture(page, 'catalog-mobile');
    await search.fill('café');
    await page.getByRole('button', { name: cafeCard, exact: true }).waitFor();
    await search.fill('inexistente');
    await page.getByText('No encontramos premios', { exact: true }).waitFor();
    await search.fill('Pellegrini');
    await page.getByRole('button', { name: cafeCard, exact: true }).click();
    await page.waitForURL('**/reward/example-cafe');
    await page.getByText(/Premio de ejemplo: un café en Cafe del Pellegrini/).waitFor();
    await page
      .getByText('Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires', {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Premio de ejemplo', exact: true }).isDisabled(),
      true
    );
    assert.equal(
      await page.getByRole('button', { name: 'Canjear premio', exact: true }).count(),
      0
    );
    await capture(page, 'detail-mobile-top');
    await page
      .getByRole('button', { name: 'Premio de ejemplo', exact: true })
      .scrollIntoViewIfNeeded();
    await capture(page, 'detail-mobile-bottom');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(/Premio de ejemplo: un café en Cafe del Pellegrini/).waitFor();
    assert.equal(new URL(page.url()).pathname, '/reward/example-cafe');
    await page.setViewportSize({ width: 1280, height: 1000 });
    await capture(page, 'detail-desktop');
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: cafeCard, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Buscar premios', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY');
    await capture(page, 'catalog-desktop');
    assert.deepEqual(commands, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('carga, error y premios reales conservan su comportamiento', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let resume;
  try {
    const page = await browser.newPage();
    const state = { mode: 'real' };
    const { errors, commands } = await setup(page, state);
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /Beneficio real de prueba, Comercio de prueba/ })
      .waitFor();
    assert.equal(await page.getByRole('button', { name: cafeCard, exact: true }).count(), 0);
    state.mode = 'loading';
    state.pending = new Promise((resolve) => {
      resume = resolve;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('Cargando premios', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: cafeCard, exact: true }).count(), 0);
    state.mode = 'error';
    resume();
    await page.getByRole('button', { name: 'Reintentar', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: cafeCard, exact: true }).count(), 0);
    state.mode = 'empty';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.getByRole('button', { name: cafeCard, exact: true }).waitFor();
    assert.deepEqual(commands, []);
    assert.deepEqual(errors, []);
  } finally {
    resume?.();
    await browser.close();
  }
});

test('ciudadano con saldo de lectura simulado suficiente no reserva la muestra ni genera historial', async () => {
  const config = JSON.parse(
    execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  );
  assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
  const backend = createClient(config.API_URL, config.SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `cafe-example-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const created = await backend.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const { errors, commands } = await setup(page);
    let localLogin = false;
    await page.route('**/auth/v1/token?*', async (route) => {
      assert.equal(new URL(route.request().url()).origin, new URL(config.API_URL).origin);
      localLogin = true;
      await route.continue();
    });
    await page.route('**/rest/v1/rpc/my_delivery_balance', (route) =>
      route.fulfill({
        json: { points: 500, companies: [] },
      })
    );
    await page.goto(base + '/login', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Ingresá tu correo', { exact: true }).fill(email);
    await page.getByPlaceholder('Ingresá tu contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
    await page.waitForURL('**/home');
    assert.equal(localLogin, true);
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page.getByText('500 puntos disponibles', { exact: true }).waitFor();
    await page.getByRole('button', { name: cafeCard, exact: true }).click();
    await page.waitForURL('**/reward/example-cafe');
    const button = page.getByRole('button', { name: 'Premio de ejemplo', exact: true });
    await button.waitFor();
    assert.equal(await button.isDisabled(), true);
    assert.equal(
      await page.getByRole('button', { name: 'Confirmar canje', exact: true }).count(),
      0
    );
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Mis canjes', exact: true }).click();
    await page.getByText('Todavía no tenés canjes', { exact: true }).waitFor();
    assert.deepEqual(commands, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    const deleted = await backend.auth.admin.deleteUser(created.data.user.id);
    assert.equal(deleted.error, null);
  }
});
