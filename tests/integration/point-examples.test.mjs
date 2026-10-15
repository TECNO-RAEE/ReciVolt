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
const exampleId = 'example-universidad-de-pilar';
const rowName = 'Ver Universidad de Pilar, punto verde de ejemplo';
const categories = [
  { id: 'phones', name: 'Celulares', slug: 'phones' },
  { id: 'computers', name: 'Computadoras', slug: 'computers' },
];
const realPoint = {
  id: '11111111-1111-4111-8111-111111111111',
  company_id: '22222222-2222-4222-8222-222222222222',
  name: 'Punto operativo de prueba',
  address: 'Dirección de prueba',
  latitude: -34.6,
  longitude: -58.4,
  phone: null,
  description: null,
  time_zone: 'America/Argentina/Buenos_Aires',
  pickup_enabled: false,
  companies: { name: 'Organización de prueba', status: 'ACTIVE' },
  green_point_schedules: [],
  green_point_device_categories: categories.map((category) => ({ device_categories: category })),
};

async function setup(page, state = { mode: 'empty' }) {
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/rest/v1/device_categories?*', (route) =>
    route.fulfill({ json: categories })
  );
  await page.route('**/rest/v1/green_points?*', async (route) => {
    if (state.mode === 'loading') await state.pending;
    if (state.mode === 'error') return route.abort('failed');
    await route.fulfill({ json: state.mode === 'real' ? [realPoint] : [] });
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
  await page.waitForURL('**/home');
  return errors;
}

async function capture(page, name) {
  await mkdir('output/verification', { recursive: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    page.viewportSize().width,
    'No horizontal document overflow'
  );
  await page.screenshot({ path: `output/verification/university-${name}.png`, fullPage: true });
}

test('invitado explora la muestra en Inicio, mapa, lista y ficha sin registrar entregas', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = await setup(page);
    await page.getByRole('button', { name: rowName, exact: true }).waitFor();
    await capture(page, 'home-mobile');
    await page.goto(base + '/green-points', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: rowName, exact: true }).waitFor();
    await page
      .getByLabel('Ver Universidad de Pilar · Punto verde de ejemplo', { exact: true })
      .waitFor()
      .catch(async (error) => {
        console.log(
          'Marker diagnostics:',
          await page.locator('.leaflet-marker-icon').evaluateAll((nodes) =>
            nodes.map((node) => ({
              title: node.getAttribute('title'),
              label: node.getAttribute('aria-label'),
            }))
          )
        );
        await capture(page, 'map-diagnostic');
        throw error;
      });
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.getByRole('textbox', { name: 'Buscar puntos verdes' }).fill('pueyrredon');
    await page.getByRole('button', { name: 'Computadoras', exact: true }).click();
    await page.getByRole('button', { name: rowName, exact: true }).waitFor();
    await capture(page, 'list-mobile');
    await page.getByRole('button', { name: rowName, exact: true }).click();
    await page.waitForURL('**/point/' + exampleId);
    await page.getByText(/Punto verde de ejemplo\. Podés explorar/).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Registrar una entrega', exact: true }).count(),
      0
    );
    assert.equal(await page.getByText('10:00 – 20:00', { exact: true }).count(), 6);
    await page.getByText('Domingo', { exact: true }).waitFor();
    await page.getByText('Cerrado', { exact: true }).waitFor();
    await capture(page, 'detail-mobile');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(/Punto verde de ejemplo\. Podés explorar/).waitFor();
    assert.equal(new URL(page.url()).pathname, '/point/' + exampleId);
    await page.setViewportSize({ width: 1280, height: 900 });
    await capture(page, 'detail-desktop');
    await page.goto(base + '/green-points', { waitUntil: 'networkidle' });
    await page.getByRole('textbox', { name: 'Buscar puntos verdes' }).fill('inexistente');
    await page.getByText('No encontramos puntos con estos filtros.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await page.getByRole('button', { name: rowName, exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Buscar puntos verdes' }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'button');
    await capture(page, 'points-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    // Simulate enlarged text for layout review; this is not a native OS font-scale test.
    await page.addStyleTag({
      content: '[dir="auto"] { font-size: 20px !important; line-height: 1.5 !important; }',
    });
    await capture(page, 'points-enlarged-text');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('carga y error no se sustituyen por la muestra, y los puntos reales tienen prioridad', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let resume;
  try {
    const page = await browser.newPage();
    const state = { mode: 'real' };
    const errors = await setup(page, state);
    await page.goto(base + '/green-points', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: 'Ver Punto operativo de prueba', exact: true })
      .first()
      .waitFor();
    assert.equal(await page.getByRole('button', { name: rowName, exact: true }).count(), 0);
    await page.getByRole('textbox', { name: 'Buscar puntos verdes' }).fill('universidad');
    await page.getByText('No encontramos puntos con estos filtros.', { exact: true }).waitFor();
    state.mode = 'loading';
    state.pending = new Promise((resolve) => {
      resume = resolve;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('Cargando puntos verdes', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: rowName, exact: true }).count(), 0);
    state.mode = 'error';
    resume();
    await page.getByText(/No pudimos cargar los puntos verdes\./).waitFor();
    assert.equal(await page.getByRole('button', { name: rowName, exact: true }).count(), 0);
    state.mode = 'empty';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.getByRole('button', { name: rowName, exact: true }).waitFor();
    state.mode = 'real';
    await page.goto(base + '/point/' + exampleId, { waitUntil: 'networkidle' });
    await page.getByText('Punto no disponible', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Registrar una entrega', exact: true }).count(),
      0
    );
    assert.deepEqual(errors, []);
  } finally {
    resume?.();
    await browser.close();
  }
});

test('ciudadano no inicia entregas de ejemplo ni por URL ni desde el selector', async () => {
  const config = JSON.parse(
    execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  );
  assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
  const backend = createClient(config.API_URL, config.SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `university-example-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const created = await backend.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = await setup(page);
    await page.goto(base + '/login', { waitUntil: 'networkidle' });
    // Ensure this app logs in against the local fixture backend, never a remote project.
    let localLogin = false;
    await page.route('**/auth/v1/token?*', async (route) => {
      assert.equal(new URL(route.request().url()).origin, new URL(config.API_URL).origin);
      localLogin = true;
      await route.continue();
    });
    await page.getByPlaceholder('Ingresá tu correo', { exact: true }).fill(email);
    await page.getByPlaceholder('Ingresá tu contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
    await page.waitForURL('**/home');
    assert.equal(localLogin, true);
    const forbiddenRequests = [];
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        url.pathname.includes('/company_device_points') ||
        url.pathname.includes('/rpc/delivery_command') ||
        (url.pathname.includes('/storage/v1/') && request.method() !== 'GET')
      ) {
        forbiddenRequests.push(url.pathname);
        return route.abort();
      }
      await route.fallback();
    });
    await page.goto(base + '/new-delivery?pointId=' + exampleId, { waitUntil: 'networkidle' });
    await page.getByText('Punto verde de ejemplo', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Adjuntar foto/ }).count(), 0);
    await capture(page, 'delivery-blocked-mobile');
    await page.goto(base + '/new-delivery', { waitUntil: 'networkidle' });
    await page
      .getByText('Todavía no hay puntos publicados para registrar una entrega.', { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Entregar en este punto', exact: true }).count(),
      0
    );
    assert.deepEqual(forbiddenRequests, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    const deleted = await backend.auth.admin.deleteUser(created.data.user.id);
    assert.equal(deleted.error, null);
  }
});
