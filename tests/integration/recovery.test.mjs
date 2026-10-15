import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

test('el correo local permite recuperar la contraseña con seis dígitos', async () => {
  const config = JSON.parse(
    execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  );
  assert.equal(new URL(config.API_URL).hostname, '127.0.0.1');
  assert.equal(new URL(config.MAILPIT_URL).hostname, '127.0.0.1');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const backend = createClient(config.API_URL, config.SECRET_KEY, options);
  const client = createClient(config.API_URL, config.PUBLISHABLE_KEY, options);
  const email = `recovery-${randomUUID()}@example.test`;
  const password = randomBytes(18).toString('base64url');
  const nextPassword = randomBytes(18).toString('base64url');
  let userId;
  try {
    const created = await backend.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(created.error, null);
    userId = created.data.user.id;
    const sent = await client.auth.resetPasswordForEmail(email);
    assert.equal(sent.error, null);
    let message;
    for (let attempt = 0; attempt < 10; attempt++) {
      const list = await (await fetch(config.MAILPIT_URL + '/api/v1/messages')).json();
      message = list.messages.find((mail) =>
        mail.To.some((recipient) => recipient.Address === email)
      );
      if (message) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(message, 'El correo debe llegar al receptor local de pruebas');
    const mail = await (await fetch(config.MAILPIT_URL + '/api/v1/message/' + message.ID)).json();
    const plain = (mail.Text || mail.HTML).replace(/https?:\/\/\S+/g, '').replace(/<[^>]*>/g, ' ');
    const code = plain.match(/\b\d{6}\b/)?.[0];
    assert.ok(code, 'El correo debe incluir el código que solicita la pantalla');
    const verified = await client.auth.verifyOtp({ email, token: code, type: 'recovery' });
    assert.equal(verified.error, null);
    assert.equal(verified.data.user.id, userId);
    const updated = await client.auth.updateUser({ password: nextPassword });
    assert.equal(updated.error, null);
    await client.auth.signOut();
    const signedIn = await client.auth.signInWithPassword({ email, password: nextPassword });
    assert.equal(signedIn.error, null);
    assert.equal(signedIn.data.user.id, userId);
  } finally {
    await client.auth.signOut();
    if (userId) {
      const removed = await backend.auth.admin.deleteUser(userId);
      assert.equal(removed.error, null);
    }
  }
});
