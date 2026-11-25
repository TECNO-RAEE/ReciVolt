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

async function capture(page, name, { fullPage = true } = {}) {
  await mkdir('output/verification', { recursive: true });
  const overflow = await page.evaluate(
    () => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth
  );
  assert.ok(overflow <= 0, `Overflow horizontal de ${overflow}px en ${name}`);
  await page.screenshot({ path: `output/verification/${name}.png`, fullPage });
}

async function waitForModalSettled(dialog) {
  await dialog.evaluate(
    (el) =>
      new Promise((resolve) => {
        const minSettle = Date.now() + 360;
        const deadline = Date.now() + 2000;
        let stableFrames = 0;
        const tick = () => {
          const now = Date.now();
          let node = el;
          let visible = true;
          while (node && node !== document.body) {
            const style = getComputedStyle(node);
            if (parseFloat(style.opacity) < 0.99) {
              visible = false;
              break;
            }
            if (style.transform && style.transform !== 'none') {
              const matrix = new DOMMatrix(style.transform);
              if (Math.abs(matrix.m42) > 0.5 || Math.abs(matrix.a - 1) > 0.01) {
                visible = false;
                break;
              }
            }
            node = node.parentElement;
          }
          stableFrames = visible && now >= minSettle ? stableFrames + 1 : 0;
          if (stableFrames >= 2 || now >= deadline) return resolve();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
}

test('configuraciones cambia a modo oscuro, persiste al recargar y premios sin foto usan fallback', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.route('**/rest/v1/rewards?*', async (route) => {
      await route.fulfill({
        json: [
          {
            id: '99999999-9999-4999-8999-999999999991',
            company_id: '88888888-8888-4888-8888-888888888888',
            title: 'Café sin foto propia',
            business_name: 'Bar Verde',
            description: 'Premio sin image_url para validar respaldo automático.',
            address: 'Av. Mitre 100',
            hours: 'Lunes a viernes 9 a 18',
            points_cost: 80,
            category: 'food',
            image_url: null,
            active: true,
            stock: 5,
            starts_at: null,
            ends_at: null,
            latitude: null,
            longitude: null,
          },
        ],
      });
    });

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await page.waitForURL(/\/home$/);

    // Smallest compact mobile width (375pt iPhone SE) has zero horizontal overflow.
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(150);
    const compactOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    assert.equal(compactOverflow, 0, `Overflow horizontal inesperado en 375px: ${compactOverflow}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('¡Hola, visitante!', { exact: true }).waitFor();

    // Light baseline on mobile before toggling Dark Mode from Home top-right button.
    const lightBg = await page.evaluate(() => document.body.style.backgroundColor);
    assert.equal(lightBg, 'rgb(248, 251, 249)');
    const lightToggle = page.getByRole('button', {
      name: 'Modo claro. Cambiar a modo oscuro',
      exact: true,
    });
    await lightToggle.waitFor();
    assert.equal(await lightToggle.getAttribute('aria-pressed'), 'false');
    await capture(page, 'ux-home-light-mobile');

    // Toggle to Dark Mode directly from Home top-right sun/moon button.
    await lightToggle.click();
    await page.waitForFunction(
      () =>
        document.documentElement.style.colorScheme === 'dark' &&
        document.body.style.backgroundColor === 'rgb(12, 21, 17)'
    );
    const darkToggle = page.getByRole('button', {
      name: 'Modo oscuro. Cambiar a modo claro',
      exact: true,
    });
    await darkToggle.waitFor();
    assert.equal(await darkToggle.getAttribute('aria-pressed'), 'true');
    await capture(page, 'ux-home-dark-mobile');

    await page.setViewportSize({ width: 1280, height: 900 });
    await capture(page, 'ux-home-dark-desktop');

    // Persistence across reload and sync with Settings radio group.
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('¡Hola, visitante!', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.style.colorScheme), 'dark');
    assert.equal(
      await page
        .getByRole('button', { name: 'Modo oscuro. Cambiar a modo claro', exact: true })
        .getAttribute('aria-pressed'),
      'true'
    );

    // Open Profile tab -> Settings -> Apariencia.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: /Perfil/ }).click();
    await page.waitForURL(/\/profile$/);
    await page.getByRole('button', { name: 'Configuraciones', exact: true }).click();
    await page.waitForURL(/\/settings$/);

    const autoRadio = page.getByRole('radio', { name: /Automático\./ });
    const lightRadio = page.getByRole('radio', { name: /Claro\./ });
    const darkRadio = page.getByRole('radio', { name: /Oscuro\./ });

    await darkRadio.waitFor();
    assert.equal(await darkRadio.getAttribute('aria-checked'), 'true');
    await capture(page, 'ux-settings-dark-mobile');

    await lightRadio.click();
    assert.equal(await lightRadio.getAttribute('aria-checked'), 'true');
    await page.waitForFunction(
      () =>
        document.documentElement.style.colorScheme === 'light' &&
        document.body.style.backgroundColor === 'rgb(248, 251, 249)'
    );
    await capture(page, 'ux-settings-light-mobile');

    // Switch back to Dark Mode via Settings and inspect desktop Settings.
    await darkRadio.click();
    assert.equal(await darkRadio.getAttribute('aria-checked'), 'true');
    await page.waitForFunction(
      () =>
        document.documentElement.style.colorScheme === 'dark' &&
        document.body.style.backgroundColor === 'rgb(12, 21, 17)'
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await capture(page, 'ux-settings-dark-desktop');
    await page.setViewportSize({ width: 390, height: 844 });

    // Verify reward without image_url renders loaded category fallback photo in Dark Mode.
    await page.goto(base + '/rewards', { waitUntil: 'networkidle' });
    await page.getByText('Café sin foto propia', { exact: true }).waitFor();
    const imgSrc = await page.evaluate(async () => {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const imgs = [...document.querySelectorAll('img')];
        const fallback = imgs.find(
          (img) =>
            img.getAttribute('src')?.includes('images.unsplash.com/photo-1509042239860') &&
            img.complete &&
            img.naturalWidth > 0
        );
        if (fallback) return fallback.getAttribute('src');
        await new Promise((r) => setTimeout(r, 150));
      }
      return null;
    });
    assert.ok(
      imgSrc,
      'Premio sin image_url debe mostrar la foto HTTPS predeterminada de gastronomía cargada'
    );
    await capture(page, 'ux-rewards-dark-mobile');

    // Toggle back from dark to light directly on Home and verify Automático in Settings.
    await page.goto(base + '/home', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: 'Modo oscuro. Cambiar a modo claro', exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.documentElement.style.colorScheme === 'light' &&
        document.body.style.backgroundColor === 'rgb(248, 251, 249)'
    );
    await page
      .getByRole('button', { name: 'Modo claro. Cambiar a modo oscuro', exact: true })
      .waitFor();

    await page.goto(base + '/settings', { waitUntil: 'networkidle' });
    await autoRadio.click();
    assert.equal(await autoRadio.getAttribute('aria-checked'), 'true');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('al confirmar escaneo QR en /delivery/[id] aparece modal de éxito con Volver al inicio', async () => {
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
  const citizenEmail = `qr-citizen-${suffix}@example.test`;
  const ownerEmail = `qr-owner-${suffix}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const companyId = randomUUID();
  const pointId = randomUUID();
  const pointName = `Punto QR ${suffix}`;
  const rate = 150;

  let citizenId;
  let ownerId;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const [citizen, owner] = await Promise.all([
      backend.auth.admin.createUser({ email: citizenEmail, password, email_confirm: true }),
      backend.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true }),
    ]);
    assert.equal(citizen.error, null);
    assert.equal(owner.error, null);
    citizenId = citizen.data.user.id;
    ownerId = owner.data.user.id;

    await backend
      .from('profiles')
      .update({ full_name: 'Ciudadano QR' })
      .eq('id', citizenId)
      .throwOnError();
    await backend
      .from('profiles')
      .update({ full_name: 'Operador QR' })
      .eq('id', ownerId)
      .throwOnError();

    await backend
      .from('companies')
      .insert({ id: companyId, name: `Empresa QR ${suffix}`, status: 'ACTIVE', worker_limit: 10 })
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
    assert.ok(category, 'Debe existir al menos una categoría activa');

    await backend
      .from('green_points')
      .insert({
        id: pointId,
        company_id: companyId,
        name: pointName,
        address: 'Calle Demo 123',
        latitude: -34.45,
        longitude: -58.91,
        active: true,
        intake_confirmed: true,
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

    // Sign in via Supabase client as citizen to create a pending QR delivery, and as owner to confirm it later.
    const citizenClient = createClient(config.API_URL, config.PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ownerClient = createClient(config.API_URL, config.PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await citizenClient.auth.signInWithPassword({ email: citizenEmail, password });
    await ownerClient.auth.signInWithPassword({ email: ownerEmail, password });

    const { data: createdDelivery, error: createError } = await citizenClient.rpc(
      'delivery_command',
      {
        operation: 'create',
        payload: {
          pointId,
          requestId: randomUUID(),
          items: [{ categoryId: category.id, quantity: 1 }],
        },
      }
    );
    assert.equal(createError, null);
    assert.ok(createdDelivery?.id);

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Boot SPA, enable Dark Mode via Settings, sign in as citizen, and open the pending QR screen.
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await page.waitForURL(/\/home$/);
    await page.getByRole('tab', { name: /Perfil/ }).click();
    await page.waitForURL(/\/profile$/);
    await page.getByRole('button', { name: 'Configuraciones', exact: true }).click();
    await page.waitForURL(/\/settings$/);
    await page.getByRole('radio', { name: /Oscuro\./ }).click();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.waitForURL(/\/profile$/);
    await page
      .getByRole('button', { name: /Iniciar sesión/ })
      .first()
      .click();
    await page.waitForURL(/\/login$/);
    const emailInput = page.getByPlaceholder('nombre@correo.com', { exact: true });
    await emailInput.waitFor();
    const loginInputSizes = await page
      .locator('input')
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    assert.ok(
      loginInputSizes.length >= 2 && loginInputSizes.every((size) => size >= 16),
      `Se esperaba fontSize >= 16px en AuthTextField de login, llegó ${JSON.stringify(loginInputSizes)}`
    );
    await emailInput.fill(citizenEmail);
    await page.getByPlaceholder('Ingresá tu contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL(/\/home$/);

    await page.getByRole('tab', { name: /Perfil/ }).click();
    await page.waitForURL(/\/profile$/);
    await page.getByRole('button', { name: 'Mis entregas', exact: true }).click();
    await page.waitForURL(/\/my-raee$/);
    await page.getByRole('heading', { name: 'Mis entregas', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ver entrega / QR', exact: true }).first().click();
    await page.waitForURL(new RegExp(`/delivery/${createdDelivery.id}$`));
    await page.getByText('Pendiente de recepción', { exact: true }).waitFor();
    await capture(page, 'ux-delivery-qr-dark-mobile');

    // Company scans & confirms the delivery in DB while citizen stays on the QR page.
    const { error: confirmError } = await ownerClient.rpc('delivery_command', {
      operation: 'confirm',
      payload: {
        companyId,
        code: createdDelivery.verification_token,
        items: [{ categoryId: category.id, quantity: 1 }],
      },
    });
    assert.equal(confirmError, null);

    // Silent polling (~2.5s) detects transition to CONFIRMED and shows ScanSuccessModal.
    await page.getByText('¡Entrega confirmada!', { exact: true }).waitFor({ timeout: 10000 });
    await page.getByText(`+${rate} puntos`, { exact: true }).waitFor();
    await capture(page, 'ux-delivery-scan-success-dark-mobile');

    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Volver al inicio', exact: true })
      .click();
    await page.waitForURL(/\/home$/);

    // ConfirmModal renders consistently across platforms when signing out on web.
    await page.getByRole('tab', { name: /Perfil/ }).click();
    await page.waitForURL(/\/profile$/);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    const confirmDialog = page.getByRole('dialog');
    await confirmDialog.getByRole('heading', { name: 'Cerrar sesión', exact: true }).waitFor();
    await confirmDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await confirmDialog.waitFor({ state: 'hidden' });

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await backend.from('points_transactions').delete().eq('company_id', companyId);
    await backend.from('deliveries').delete().eq('company_id', companyId);
    await backend.from('company_device_points').delete().eq('company_id', companyId);
    await backend.from('green_points').delete().eq('company_id', companyId);
    await backend.from('company_memberships').delete().eq('company_id', companyId);
    await backend.from('companies').delete().eq('id', companyId);
    if (citizenId) await backend.auth.admin.deleteUser(citizenId);
    if (ownerId) await backend.auth.admin.deleteUser(ownerId);
  }
});

test('buscador "¿Qué tenés para reciclar?" en Inicio filtra por categoría, sinónimos y cercanía en modal claro y oscuro', async () => {
  const finderCategories = [
    { id: 'cat-phones', name: 'Celulares', slug: 'celulares' },
    { id: 'cat-notebooks', name: 'Notebooks', slug: 'notebooks' },
    { id: 'cat-tv', name: 'Televisores', slug: 'televisores' },
  ];
  const nearPoint = {
    id: '11111111-1111-4111-8111-111111111111',
    company_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Punto Obelisco',
    address: 'Av. 9 de Julio 100',
    latitude: -34.6037,
    longitude: -58.3816,
    phone: null,
    description: 'Recibe notebooks y televisores en pleno centro.',
    time_zone: 'America/Argentina/Buenos_Aires',
    pickup_enabled: false,
    intake_confirmed: true,
    companies: { name: 'Eco Centro', status: 'ACTIVE' },
    green_point_schedules: [],
    green_point_device_categories: [finderCategories[1], finderCategories[2]].map((c) => ({
      device_categories: c,
    })),
    green_point_device_policies: [finderCategories[1], finderCategories[2]].map((c) => ({
      device_category_id: c.id,
      mode: 'onsite',
      device_categories: c,
    })),
  };
  const farPoint = {
    id: '22222222-2222-4222-8222-222222222222',
    company_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Punto Palermo',
    address: 'Av. Santa Fe 4200',
    latitude: -34.582,
    longitude: -58.421,
    phone: null,
    description: 'Recibe teléfonos móviles.',
    time_zone: 'America/Argentina/Buenos_Aires',
    pickup_enabled: true,
    intake_confirmed: true,
    companies: { name: 'Eco Norte', status: 'ACTIVE' },
    green_point_schedules: [],
    green_point_device_categories: [{ device_categories: finderCategories[0] }],
    green_point_device_policies: [
      {
        device_category_id: finderCategories[0].id,
        mode: 'onsite',
        device_categories: finderCategories[0],
      },
    ],
  };

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['geolocation'],
      geolocation: { latitude: -34.6037, longitude: -58.3816 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.route('**/rest/v1/device_categories?*', (route) =>
      route.fulfill({ json: finderCategories })
    );
    await page.route('**/rest/v1/green_points?*', (route) =>
      route.fulfill({ json: [farPoint, nearPoint] })
    );

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Saltar introducción', exact: true }).click();
    await page.waitForURL(/\/home$/);

    // QuickAccess Entregas button is replaced by "¿Qué tenés para reciclar?" widget.
    assert.equal(await page.getByRole('button', { name: 'Entregas', exact: true }).count(), 0);
    const homeTrigger = page.getByRole('button', {
      name: /¿Qué tenés para reciclar\?/,
    });
    await homeTrigger.waitFor();
    await homeTrigger.click();

    const dialog = page.getByRole('dialog');
    await dialog.getByText('¿Qué tenés para reciclar?', { exact: true }).waitFor();

    // Activate location from modal to sort nearest green points first.
    await dialog.getByRole('button', { name: /Usar mi ubicación/ }).click();
    await dialog.getByText('2 puntos más cercanos', { exact: true }).waitFor();
    await dialog.getByText('0 m', { exact: true }).waitFor();
    await capture(page, 'ux-home-finder-light-mobile');

    // Search input uses >=16px font on web to prevent iOS Safari focus auto-zoom,
    // and sheet stays pinned within a shrunk keyboard-height viewport (390x420).
    const searchInput = dialog.getByRole('textbox', {
      name: 'Buscar qué tenés para reciclar',
      exact: true,
    });
    const inputFontSize = await searchInput.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize)
    );
    assert.ok(
      inputFontSize >= 16,
      `Se esperaba fontSize >= 16px para evitar zoom en iOS, llegó ${inputFontSize}`
    );

    await page.setViewportSize({ width: 390, height: 420 });
    await waitForModalSettled(dialog);
    const headerBox = await dialog
      .getByRole('heading', { name: '¿Qué tenés para reciclar?' })
      .boundingBox();
    const inputBox = await searchInput.boundingBox();
    const closeBox = await dialog
      .getByRole('button', { name: 'Cerrar buscador', exact: true })
      .boundingBox();
    assert.ok(
      headerBox && headerBox.y >= 0 && headerBox.x >= 0,
      'Header visible dentro del viewport con teclado'
    );
    assert.ok(
      closeBox && closeBox.y >= 0 && closeBox.x + closeBox.width <= 390,
      'Botón cerrar visible sin recorte'
    );
    assert.ok(
      inputBox && inputBox.y >= 0 && inputBox.y + inputBox.height <= 420,
      'Buscador visible dentro del viewport con teclado abierto'
    );
    await capture(page, 'ux-home-finder-keyboard-mobile', { fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForModalSettled(dialog);

    // Synonym query ("tele") matches Televisores (Punto Obelisco) without colliding with Celulares.
    await searchInput.fill('tele');
    await dialog.getByRole('button', { name: 'Ver Punto Obelisco', exact: true }).waitFor();
    assert.equal(
      await dialog.getByRole('button', { name: 'Ver Punto Palermo', exact: true }).count(),
      0
    );

    // Clear query and pick Celulares chip -> shows Punto Palermo only.
    await dialog.getByRole('button', { name: 'Borrar búsqueda', exact: true }).click();
    await dialog.getByRole('button', { name: 'Celulares', exact: true }).click();
    await dialog.getByText('1 punto cercano que recibe Celulares', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Ver Punto Palermo', exact: true }).waitFor();
    assert.equal(
      await dialog.getByRole('button', { name: 'Ver Punto Obelisco', exact: true }).count(),
      0
    );

    // Empty state and recovery back to all nearest points.
    await dialog.getByRole('button', { name: 'Todos', exact: true }).click();
    await searchInput.fill('tostadora espacial');
    await dialog
      .getByText('No encontramos puntos verdes que reciban «tostadora espacial».', { exact: true })
      .waitFor();
    await dialog.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
    await dialog.getByText('2 puntos más cercanos', { exact: true }).waitFor();

    // Close modal, switch Home to Dark Mode, reopen and verify mobile + desktop layouts before jumping to detail.
    await dialog.getByRole('button', { name: 'Cerrar buscador', exact: true }).click();
    await page
      .getByRole('button', { name: 'Modo claro. Cambiar a modo oscuro', exact: true })
      .click();
    await page.waitForFunction(() => document.documentElement.style.colorScheme === 'dark');

    await homeTrigger.click();
    await dialog.getByText('¿Qué tenés para reciclar?', { exact: true }).waitFor();
    await waitForModalSettled(dialog);
    await capture(page, 'ux-home-finder-dark-mobile', { fullPage: false });

    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForModalSettled(dialog);
    await capture(page, 'ux-home-finder-dark-desktop', { fullPage: false });

    await dialog.getByRole('button', { name: 'Ver Punto Obelisco', exact: true }).click();
    await page.waitForURL(/\/point\/11111111-1111-4111-8111-111111111111$/);
    await page
      .getByText('Recibe notebooks y televisores en pleno centro.', { exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
