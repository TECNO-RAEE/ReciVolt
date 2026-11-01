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

// Full page loads beyond the initial boot are avoided on purpose: the Expo
// Router SSR renderer of this project intermittently fails document requests
// with "Requiring unknown module" (dev-server issue), so every navigation
// below stays client-side after the first load of `/`.
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

const suffix = randomUUID().slice(0, 8);
const citizenEmail = `card10-citizen-${suffix}@example.test`;
const ownerEmail = `card10-owner-${suffix}@example.test`;
const password = randomBytes(18).toString('base64url');
const companyId = randomUUID();
const pointId = randomUUID();
const pointName = `Punto Card10 ${suffix}`;
const citizenName = 'María Retiro';
const rate = 250;
let categoryName = '';

async function capture(page, name) {
  await mkdir('output/verification', { recursive: true });
  await page.screenshot({ path: `output/verification/card10-${name}.png`, fullPage: true });
}

// Boots the SPA once and signs in through the UI (no further full loads).
async function boot(page, email) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
  await page.waitForURL(/\/home$/);
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).click();
  await page.waitForURL(/\/profile$/);
  await page
    .getByRole('button', { name: /Iniciar sesión/ })
    .first()
    .click();
  await page.waitForURL(/\/login$/);
  await page.getByPlaceholder('nombre@correo.com', { exact: true }).fill(email);
  await page.getByPlaceholder('Ingresá tu contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL(/\/(home|company)$/, { timeout: 15000 });
}

async function citizenFillPickupForm(page) {
  await page.getByRole('button', { name: `Solicitar retiro a ${pointName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Aumentar cantidad', exact: true }).click();
  await page
    .getByPlaceholder('Ej. Av. Tratado del Pilar 1234', { exact: true })
    .fill('San Martín 123');
  await page.getByPlaceholder('Ej. 11 2345-6789', { exact: true }).fill('1122334455');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await page.waitForURL(/\/pickup\/[0-9a-f]{8}-[0-9a-f]{4}-/, { timeout: 15000 });
  return page.url().split('/pickup/')[1];
}

// From /home or /pickup/[id]: open Mis entregas > Retiros and request a pickup.
async function citizenRequestPickup(page) {
  if (page.url().includes('/pickup/')) {
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.waitForURL(/\/my-raee$/);
  } else {
    await page
      .getByRole('button', { name: /Entregas/ })
      .first()
      .click();
    await page.waitForURL(/\/my-raee$/);
  }
  await page.getByRole('tab', { name: 'Retiros', exact: true }).click();
  await page.getByRole('button', { name: 'Solicitar retiro a domicilio', exact: true }).click();
  await page.waitForURL(/\/pickup\/new$/);
  return citizenFillPickupForm(page);
}

// From /pickup/[id]: go back to Mis entregas > Retiros and open the newest tracking.
async function citizenOpenTracking(page) {
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.waitForURL(/\/my-raee$/);
  await page.getByRole('tab', { name: 'Retiros', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ver seguimiento del retiro', exact: true })
    .first()
    .click();
  await page.waitForURL(/\/pickup\/[0-9a-f]{8}-[0-9a-f]{4}-/);
}

async function seed() {
  const [citizen, owner] = await Promise.all([
    backend.auth.admin.createUser({ email: citizenEmail, password, email_confirm: true }),
    backend.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true }),
  ]);
  assert.equal(citizen.error, null);
  assert.equal(owner.error, null);
  const citizenId = citizen.data.user.id;
  const ownerId = owner.data.user.id;

  await backend
    .from('profiles')
    .update({ full_name: citizenName })
    .eq('id', citizenId)
    .throwOnError();
  await backend
    .from('profiles')
    .update({ full_name: 'Roberto Responsable' })
    .eq('id', ownerId)
    .throwOnError();

  await backend
    .from('companies')
    .insert({
      id: companyId,
      name: `Recicladora Card10 ${suffix}`,
      status: 'ACTIVE',
      worker_limit: 20,
    })
    .throwOnError();
  await backend
    .from('company_memberships')
    .insert({ company_id: companyId, user_id: ownerId, role: 'company_owner', status: 'ACTIVE' })
    .throwOnError();

  const { data: category } = await backend
    .from('device_categories')
    .select('id,name')
    .eq('active', true)
    .order('sort_order')
    .limit(1)
    .single();
  assert.ok(category, 'El catálogo local debe tener al menos una categoría activa');
  categoryName = category.name;

  await backend
    .from('green_points')
    .insert({
      id: pointId,
      company_id: companyId,
      name: pointName,
      address: 'Av. Tratado del Pilar 1234',
      latitude: -34.45,
      longitude: -58.91,
      active: true,
      pickup_enabled: true,
    })
    .throwOnError();
  await backend
    .from('green_point_device_categories')
    .insert({ green_point_id: pointId, device_category_id: category.id })
    .throwOnError();
  await backend
    .from('company_device_points')
    .insert({ company_id: companyId, device_category_id: category.id, points: rate })
    .throwOnError();

  return citizenId;
}

test('CARD-10: empresa coordina, recibe y acredita retiros; rechazo cancela la solicitud', async () => {
  const citizenId = await seed();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    // Citizen: requests a pickup (2 units).
    const citizenCtx = await browser.newContext();
    const citizen = await citizenCtx.newPage();
    citizen.setDefaultTimeout(15000);
    const citizenErrors = [];
    citizen.on('pageerror', (error) => citizenErrors.push(error.message));
    await boot(citizen, citizenEmail);
    const pickupId = await citizenRequestPickup(citizen);
    await citizen.getByText('Por coordinar', { exact: true }).waitFor();
    await capture(citizen, 'citizen-requested');

    // Owner: coordinates the pickup from the inbox.
    const ownerCtx = await browser.newContext();
    const owner = await ownerCtx.newPage();
    owner.setDefaultTimeout(15000);
    const ownerErrors = [];
    owner.on('pageerror', (error) => ownerErrors.push(error.message));
    await boot(owner, ownerEmail);
    await owner.getByRole('button', { name: /Retiros a domicilio/ }).click();
    await owner.waitForURL(/\/company\/pickups$/);
    await owner.getByText('1 solicitudes activas en total.', { exact: true }).waitFor();
    await owner.getByText(`${categoryName} ×2`, { exact: true }).waitFor();
    await capture(owner, 'inbox-requested');
    await owner.getByRole('button', { name: 'Ver solicitud', exact: true }).click();
    await owner.waitForURL(new RegExp(`/company/pickups/${pickupId}/coordinate$`));
    await owner.getByText('Coordinación', { exact: true }).waitFor();
    await owner.getByText(citizenName, { exact: true }).waitFor();
    await owner.getByText('Teléfono: 1122334455', { exact: true }).waitFor();
    await owner.getByPlaceholder('Nombre de quien retira', { exact: true }).fill('Roberto Chofer');
    await owner.getByRole('button', { name: /Confirmar coordinación/ }).click();
    await owner.getByText('Coordinación confirmada.', { exact: true }).waitFor();
    await capture(owner, 'coordinate');

    // Citizen: sees the coordinated state.
    await citizenOpenTracking(citizen);
    await citizen.getByText('Responsable: Roberto Chofer', { exact: true }).waitFor();
    await capture(citizen, 'citizen-coordinated');

    // Owner: reception with quantity adjustment (2 declared -> 1 received).
    await owner.getByRole('button', { name: 'Volver', exact: true }).click();
    await owner.waitForURL(/\/company\/pickups$/);
    await owner.getByRole('tab', { name: 'Coordinados', exact: true }).click();
    await owner.getByRole('button', { name: 'Ver solicitud', exact: true }).click();
    await owner.waitForURL(new RegExp(`/company/pickups/${pickupId}/receive$`));
    await owner.getByText(`${rate * 2} puntos a acreditar`, { exact: true }).waitFor();
    await owner.getByRole('button', { name: 'Disminuir cantidad', exact: true }).click();
    await owner.getByText(`${rate} puntos a acreditar`, { exact: true }).waitFor();
    await capture(owner, 'receive');
    await owner.getByRole('button', { name: /Marcar en camino/ }).click();
    await owner.getByText('El retiro está en camino.', { exact: true }).waitFor();
    await owner.getByRole('button', { name: 'Confirmar recepción', exact: true }).click();
    await owner.getByText('Recepción confirmada y puntos acreditados.', { exact: true }).waitFor();
    await owner.getByText('Recibido', { exact: true }).first().waitFor();
    await capture(owner, 'completed');

    // Atomic ledger check: exactly one PICKUP credit with the confirmed amount.
    const { data: ledger } = await backend
      .from('points_transactions')
      .select('amount,type,reference_type')
      .eq('user_id', citizenId)
      .eq('reference_type', 'PICKUP');
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].type, 'PICKUP');
    assert.equal(Number(ledger[0].amount), rate);

    // Citizen: completed state shows credited points.
    await citizenOpenTracking(citizen);
    await citizen.getByText(`${rate} puntos acreditados`, { exact: true }).waitFor();
    await capture(citizen, 'citizen-completed');

    // Rejection path: second pickup is cancelled by the company.
    const pickup2Id = await citizenRequestPickup(citizen);
    await owner.getByRole('button', { name: 'Volver', exact: true }).click();
    await owner.waitForURL(/\/company\/pickups$/);
    await owner.getByRole('tab', { name: 'Solicitados', exact: true }).click();
    await owner.getByRole('button', { name: 'Ver solicitud', exact: true }).click();
    await owner.waitForURL(new RegExp(`/company/pickups/${pickup2Id}/coordinate$`));
    await owner
      .getByRole('button', { name: 'No podemos realizar este retiro', exact: true })
      .click();
    await owner.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
    await owner.waitForURL(/\/company\/pickups$/);
    await owner.getByText('No hay retiros en este estado.', { exact: true }).waitFor();
    await capture(owner, 'rejected');
    await citizenOpenTracking(citizen);
    await citizen.getByText('Cancelado', { exact: true }).waitFor();

    assert.deepEqual(citizenErrors, []);
    assert.deepEqual(ownerErrors, []);
  } finally {
    await browser.close();
  }
});
