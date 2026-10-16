import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localStatus } from './supabase-command.mjs';

const status = localStatus();
const url = status.API_URL,
  key = status.PUBLISHABLE_KEY || status.ANON_KEY;
const settings = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, status.SERVICE_ROLE_KEY, settings);
const a = createClient(url, key, settings),
  b = createClient(url, key, settings),
  anon = createClient(url, key, settings);
const users = [],
  passed = [];
function ok(name, condition) {
  assert.ok(condition, name);
  passed.push(name);
  console.log(`PASS ${name}`);
}
const criteria = ['Time', 'Enjoyment'].map((name) => ({ id: randomUUID(), name, weight: 50 }));
const payload = {
  schemaVersion: 1,
  title: 'Backend test decision',
  context: '',
  criteria,
  options: ['A', 'B'].map((name) => ({
    id: randomUUID(),
    name,
    scores: Object.fromEntries(criteria.map((c) => [c.id, { value: 5, uncertain: false }])),
  })),
  notes: '',
};
try {
  for (const [index, client] of [a, b].entries()) {
    const email = `faultline-test-${randomUUID()}@example.test`,
      password = `${randomUUID()}Aa9!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(created.error);
    users.push(created.data.user.id);
    const login = await client.auth.signInWithPassword({ email, password });
    ok(`account ${index + 1} can authenticate`, !login.error && !!login.data.session);
  }
  const inserted = await a
    .from('faultline_decisions')
    .insert({ owner_id: users[0], payload })
    .select()
    .single();
  assert.ifError(inserted.error);
  const id = inserted.data.id;
  ok('owner can insert and read', inserted.data.payload.title === payload.title);
  const outsiderRead = await b.from('faultline_decisions').select('*').eq('id', id);
  ok('other account cannot read', !outsiderRead.error && outsiderRead.data.length === 0);
  const outsiderUpdate = await b
    .from('faultline_decisions')
    .update({ payload: { ...payload, title: 'Not mine' }, revision: 2 })
    .eq('id', id)
    .select();
  ok('other account cannot update', !!outsiderUpdate.error || outsiderUpdate.data.length === 0);
  const outsiderDelete = await b.from('faultline_decisions').delete().eq('id', id).select();
  ok('other account cannot delete', !!outsiderDelete.error || outsiderDelete.data.length === 0);
  const spoof = await b.from('faultline_decisions').insert({ owner_id: users[0], payload });
  ok('forged ownership is rejected', !!spoof.error);
  const reassign = await a.from('faultline_decisions').update({ owner_id: users[1] }).eq('id', id);
  ok('owner reassignment is rejected', !!reassign.error);
  const anonymous = await anon.from('faultline_decisions').select('*');
  ok('unauthenticated read is rejected', !!anonymous.error);
  const invalid = await a
    .from('faultline_decisions')
    .insert({ owner_id: users[0], payload: { ...payload, criteria: [] } });
  ok('database rejects invalid document', !!invalid.error);
  const badScore = structuredClone(payload);
  badScore.options[0].scores[criteria[0].id].value = 99;
  const invalidScore = await a
    .from('faultline_decisions')
    .insert({ owner_id: users[0], payload: badScore });
  ok('database rejects out-of-range score', !!invalidScore.error);
  const updated = await a
    .from('faultline_decisions')
    .update({ payload: { ...payload, notes: 'Saved for real.' }, revision: 2 })
    .eq('id', id)
    .eq('revision', 1)
    .select()
    .single();
  ok('owner can update with matching revision', !updated.error && updated.data.revision === 2);
  const stale = await a
    .from('faultline_decisions')
    .update({ payload, revision: 2 })
    .eq('id', id)
    .eq('revision', 1)
    .select();
  ok('stale revision cannot overwrite', !stale.error && stale.data.length === 0);
  const badRevision = await a
    .from('faultline_decisions')
    .update({ payload, revision: 9 })
    .eq('id', id);
  ok('revision trigger rejects skipped versions', !!badRevision.error);
  const removed = await a.from('faultline_decisions').delete().eq('id', id).select();
  ok('owner can delete', !removed.error && removed.data.length === 1);
  const logout = await a.auth.signOut();
  ok('sign-out succeeds', !logout.error);
  console.log(`\n${passed.length} backend checks passed against real local Supabase.`);
} finally {
  await Promise.all([a.auth.signOut(), b.auth.signOut()]);
  for (const id of users) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) console.error(`Test user cleanup failed: ${id}`);
  }
}
