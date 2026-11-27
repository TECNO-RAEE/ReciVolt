import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_DIR || 'playwright');
const base = process.env.TEST_APP_URL || 'http://localhost:8083';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test app');

test('la entrada directa y la recarga conservan las rutas públicas', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await page.waitForURL('**/home');
    for (const route of ['/green-points', '/rewards', '/profile']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).pathname, route);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).pathname, route);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('la recuperación conserva el formulario hasta guardar la nueva contraseña', async () => {
  const config = JSON.parse(
    execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  );
  assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
  assert.equal(new URL(config.MAILPIT_URL).hostname, '127.0.0.1');
  const backend = createClient(config.API_URL, config.SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `navigation-recovery-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const created = await backend.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/forgot-password', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('nombre@correo.com', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
    await page
      .getByText('Código enviado. Revisá tu correo; también la carpeta de spam.', { exact: true })
      .waitFor();
    let code;
    for (let attempt = 0; attempt < 10; attempt++) {
      const list = await (await fetch(config.MAILPIT_URL + '/api/v1/messages')).json();
      const message = list.messages.find((mail) => mail.To.some((to) => to.Address === email));
      if (message) {
        const mail = await (
          await fetch(config.MAILPIT_URL + '/api/v1/message/' + message.ID)
        ).json();
        code = (mail.Text || mail.HTML).replace(/<[^>]*>/g, ' ').match(/\b\d{6}\b/)?.[0];
        if (code) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(code, 'El correo local debe incluir el código de recuperación');
    await page
      .getByRole('textbox', { name: 'Código de recuperación de 6 dígitos', exact: true })
      .fill(code);
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await page
      .getByPlaceholder('Ingresá tu nueva contraseña', { exact: true })
      .fill(password + '-new');
    await page
      .getByPlaceholder('Repetí tu nueva contraseña', { exact: true })
      .fill(password + '-new');
    assert.equal(new URL(page.url()).pathname, '/new-password');
    await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
    await page.waitForURL('**/home');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    const removed = await backend.auth.admin.deleteUser(created.data.user.id);
    assert.equal(removed.error, null);
  }
});

test('mis puntos abre sin redirigir y las transiciones web muestran fondo temático', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    let releaseLightRewards;
    let delayedLightChunk = false;
    const lightRewardsGate = new Promise((resolve) => {
      releaseLightRewards = resolve;
    });
    await page.route('**/_expo/static/js/web/rewards*.js', async (route) => {
      delayedLightChunk = true;
      await lightRewardsGate;
      await route.continue();
    });

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await page.waitForURL('**/home');
    await page.getByText('¡Hola, visitante!', { exact: true }).waitFor();

    await page.getByRole('tab', { name: /Premios/ }).click();
    await page.waitForTimeout(200);
    if (delayedLightChunk) {
      const midLight = await page.evaluate(() => {
        const el = document.elementFromPoint(100, 200);
        const spinner = document.querySelector('[aria-label="Cargando pantalla"]');
        return {
          midBg: el ? getComputedStyle(el).backgroundColor : null,
          midText: el ? el.textContent : null,
          hasSpinner: Boolean(spinner && spinner.getBoundingClientRect().width > 0),
        };
      });
      assert.equal(midLight.midBg, 'rgb(248, 251, 249)');
      assert.equal(midLight.midText, '');
      assert.equal(midLight.hasSpinner, true);
    }
    releaseLightRewards();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: /Inicio/ }).click();
    await page.waitForURL('**/home');
    await page
      .getByRole('button', { name: 'Creá tu cuenta para sumar puntos', exact: true })
      .click();
    await page.waitForURL('**/my-points');
    await page.getByRole('heading', { name: 'Mis puntos', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/my-points');

    // Verify Dark Mode transition too.
    await page.unroute('**/_expo/static/js/web/rewards*.js');
    const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const darkPage = await darkContext.newPage();
    darkPage.setDefaultTimeout(15000);
    darkPage.on('pageerror', (error) => errors.push(error.message));

    let releaseDarkRewards;
    let delayedDarkChunk = false;
    const darkRewardsGate = new Promise((resolve) => {
      releaseDarkRewards = resolve;
    });
    await darkPage.route('**/_expo/static/js/web/rewards*.js', async (route) => {
      delayedDarkChunk = true;
      await darkRewardsGate;
      await route.continue();
    });

    await darkPage.goto(base, { waitUntil: 'networkidle' });
    await darkPage.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await darkPage.waitForURL('**/home');
    await darkPage
      .getByRole('button', { name: 'Modo claro. Cambiar a modo oscuro', exact: true })
      .click();
    await darkPage.waitForFunction(() => document.body.style.backgroundColor === 'rgb(12, 21, 17)');

    await darkPage.getByRole('tab', { name: /Premios/ }).click();
    await darkPage.waitForTimeout(200);
    if (delayedDarkChunk) {
      const midDark = await darkPage.evaluate(() => {
        const el = document.elementFromPoint(100, 200);
        const spinner = document.querySelector('[aria-label="Cargando pantalla"]');
        return {
          midBg: el ? getComputedStyle(el).backgroundColor : null,
          midText: el ? el.textContent : null,
          hasSpinner: Boolean(spinner && spinner.getBoundingClientRect().width > 0),
        };
      });
      assert.equal(midDark.midBg, 'rgb(12, 21, 17)');
      assert.equal(midDark.midText, '');
      assert.equal(midDark.hasSpinner, true);
    }
    releaseDarkRewards();
    await darkPage.waitForTimeout(250);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('perfil oculta mi actividad y abre mis puntos y mis entregas con sesión activa', async () => {
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
  const email = `navigation-points-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const created = await backend.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Ana Tester' },
  });
  assert.equal(created.error, null);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(base + '/login', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('nombre@correo.com', { exact: true }).fill(email);
    await page.getByPlaceholder('Ingresá tu contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL('**/home');

    await page.getByRole('tab', { name: /Perfil/ }).click();
    await page.waitForURL('**/profile');
    await page.getByRole('button', { name: 'Mis entregas', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Mis puntos', exact: true }).waitFor();
    assert.equal(await page.getByText('Mi actividad').count(), 0);

    await page.getByRole('button', { name: 'Mis puntos', exact: true }).click();
    await page.waitForURL('**/my-points');
    await page.getByText('Todavía no sumaste puntos', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/my-points');

    await page.goto(base + '/profile', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Mis entregas', exact: true }).click();
    await page.waitForURL('**/my-raee');
    await page.getByRole('heading', { name: 'Mis entregas', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/my-raee');

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    const removed = await backend.auth.admin.deleteUser(created.data.user.id);
    assert.equal(removed.error, null);
  }
});
