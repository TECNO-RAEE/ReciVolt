import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

// Dedicated local container only. Never take a remote connection URL or credentials.
const container = 'supabase_db_tecno-raee-app';
function sql(query, onOutput) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
    ]);
    let output = '',
      error = '';
    child.stdout.on('data', (data) => {
      output += data;
      onOutput?.(output);
    });
    child.stderr.on('data', (data) => {
      error += data;
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(output.trim()) : reject(new Error(error))));
    child.stdin.end(query);
  });
}
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
async function command(user, operation, payload, domain = 'reward') {
  const result = await sql(`begin; set local role authenticated;
    set local statement_timeout='8s';
    select set_config('request.jwt.claim.sub','${user}',true);
    select public.${domain}_command('${operation}',${json(payload)}); commit;`);
  return JSON.parse(result.split('\n').at(-1));
}

// Hold the target row until both independent transactions are waiting on it.
async function raceOnReward(rewardId, requests) {
  let unlock;
  const locked = new Promise((resolve) => {
    unlock = resolve;
  });
  const rewardIds = (Array.isArray(rewardId) ? rewardId : [rewardId])
    .map((id) => `'${id}'`)
    .join(',');
  const holder = sql(
    `begin; select 1 from public.rewards where id in (${rewardIds}) for update;
    select 'locked'; select pg_sleep(2); commit;`,
    (output) => {
      if (output.includes('locked')) unlock();
    }
  );
  // Propagate startup errors instead of waiting forever for a readiness message.
  await Promise.race([
    locked,
    holder.then(() => {
      throw new Error('Lock not acquired');
    }),
  ]);
  const pending = requests.map((request) => request());
  const results = await Promise.allSettled(pending);
  await holder;
  return results;
}

test('reservas concurrentes conservan saldo, stock e idempotencia', async (t) => {
  const users = Array.from({ length: 5 }, randomUUID);
  const [first, second, third, fourth, owner] = users;
  const companies = [randomUUID(), randomUUID()];
  const point = randomUUID();
  const rewards = Array.from({ length: 4 }, randomUUID);
  try {
    await sql(`begin;
      insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
      ${users.map((id) => `('${id}','concurrency-${id}@example.test',now(),'{"full_name":"Prueba de concurrencia"}')`).join(',')};
      insert into public.companies(id,name) values
      ('${companies[0]}','Origen QA concurrencia'),('${companies[1]}','Premios QA concurrencia');
      insert into public.company_memberships(user_id,company_id,role,status)
      values('${owner}','${companies[0]}','company_owner','ACTIVE');
      insert into public.green_points(id,company_id,name,address,latitude,longitude,active)
      values('${point}','${companies[0]}','Punto QA concurrencia','Dirección de prueba',-34,-58,true);
      insert into public.green_point_device_categories(green_point_id,device_category_id)
      select '${point}',id from public.device_categories where slug='celulares';
      insert into public.company_device_points(company_id,device_category_id,points)
      select '${companies[0]}',id,100 from public.device_categories where slug='celulares';
      insert into public.rewards(id,company_id,title,category,points_cost,business_name,address,stock,active) values
      ${rewards.map((id, index) => `('${id}','${companies[1]}','Premio QA ${index}','food',100,'Premios QA','Dirección de prueba',${index === 1 ? 1 : 'null'},true)`).join(',')};
      commit;`);
    const category = await sql("select id from public.device_categories where slug='celulares'");
    for (const user of users.slice(0, 4)) {
      const delivery = await command(
        user,
        'create',
        {
          requestId: randomUUID(),
          pointId: point,
          items: [{ categoryId: category, quantity: 1 }],
        },
        'delivery'
      );
      await command(
        owner,
        'confirm',
        {
          companyId: companies[0],
          code: delivery.verification_token,
          items: [{ categoryId: category, quantity: 1 }],
        },
        'delivery'
      );
    }
    await t.test('dos reservas no gastan dos veces un saldo de 100', async () => {
      const targets = [rewards[0], rewards[3]];
      const results = await raceOnReward(
        targets,
        targets.map(
          (rewardId) => () => command(first, 'reserve', { rewardId, requestId: randomUUID() })
        )
      );
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.match(
        results.find((r) => r.status === 'rejected').reason.message,
        /puntos suficientes/
      );
      assert.equal(await sql(`select private.global_points('${first}')`), '0');
    });
    await t.test('dos ciudadanos no reservan la misma última unidad', async () => {
      const results = await raceOnReward(
        rewards[1],
        [second, third].map(
          (user) => () =>
            command(user, 'reserve', { rewardId: rewards[1], requestId: randomUUID() })
        )
      );
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.match(results.find((r) => r.status === 'rejected').reason.message, /agotado/);
      assert.equal(await sql(`select stock from public.rewards where id='${rewards[1]}'`), '0');
      assert.equal(
        await sql(`select count(*) from public.reward_redemptions where reward_id='${rewards[1]}'`),
        '1'
      );
    });
    await t.test('reintentos simultáneos devuelven el mismo canje', async () => {
      const payload = { rewardId: rewards[2], requestId: randomUUID() };
      const results = await raceOnReward(
        rewards[2],
        [1, 2].map(() => () => command(fourth, 'reserve', payload))
      );
      assert.ok(results.every((r) => r.status === 'fulfilled'));
      assert.equal(results[0].value.id, results[1].value.id);
      assert.equal(await sql(`select private.global_points('${fourth}')`), '0');
      assert.equal(
        await sql(`select count(*) from public.reward_redemptions where user_id='${fourth}'`),
        '1'
      );
    });
  } finally {
    const ids = users.map((id) => `'${id}'`).join(',');
    const companyIds = companies.map((id) => `'${id}'`).join(',');
    await sql(`begin;
      delete from public.audit_log where actor_id in (${ids}) or company_id in (${companyIds});
      delete from public.reward_redemptions where user_id in (${ids});
      delete from public.rewards where company_id in (${companyIds});
      delete from public.points_transactions where user_id in (${ids});
      delete from public.impact_transactions where user_id in (${ids});
      delete from public.delivery_items where delivery_id in (select id from public.deliveries where user_id in (${ids}));
      delete from public.deliveries where user_id in (${ids});
      delete from public.company_device_points where company_id in (${companyIds});
      delete from public.companies where id in (${companyIds});
      delete from auth.users where id in (${ids}); commit;`);
  }
});
