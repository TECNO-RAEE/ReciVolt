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
    await page.getByPlaceholder('Ingresá tu correo', { exact: true }).fill(email);
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
    await page.getByRole('button', { name: 'Verificar Código', exact: true }).click();
    await page
      .getByPlaceholder('Ingresá tu nueva contraseña', { exact: true })
      .fill(password + '-new');
    await page
      .getByPlaceholder('Repetí tu nueva contraseña', { exact: true })
      .fill(password + '-new');
    assert.equal(new URL(page.url()).pathname, '/new-password');
    await page.getByRole('button', { name: 'Guardar Contraseña', exact: true }).click();
    await page.waitForURL('**/home');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    const removed = await backend.auth.admin.deleteUser(created.data.user.id);
    assert.equal(removed.error, null);
  }
});
