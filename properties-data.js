'use strict';

/* ══════════════════════════════════════════════════════
   properties-data.js
   Source of truth — all Supabase calls go here only.
   Other files import from this module.
   No data is stored in localStorage or JS variables.
══════════════════════════════════════════════════════ */

const SUPABASE_URL  = window.__SUPABASE_URL__;
const SUPABASE_KEY  = window.__SUPABASE_KEY__;

let _client = null;

function getClient() {
  if (!_client) {
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

/* ── AUTH ── */
async function getSession() {
  const { data, error } = await getClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

/* ── DATA ── */
async function fetchAll() {
  const { data, error } = await getClient()
    .from('properties')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('fetchAll error:', error); throw error; }
  console.log('fetchAll returned:', data ? data.length : 0, 'rows');
  return data || [];
}

async function addProperty(fields) {
  // id assigned by Supabase IDENTITY — never pass id
  const { data, error } = await getClient()
    .from('properties')
    .insert([fields])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateProperty(id, fields) {
  // Never update id or created_at
  const safe = { ...fields };
  delete safe.id;
  delete safe.created_at;
  const { data, error } = await getClient()
    .from('properties')
    .update(safe)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteProperty(id) {
  // 1. Delete
  const { error } = await getClient()
    .from('properties')
    .delete()
    .eq('id', id);
  if (error) throw error;

  // 2. Re-fetch remaining ordered by sort_order
  const remaining = await fetchAll();

  // 3. Re-number sort_order sequentially
  const updates = remaining.map((p, i) =>
    getClient()
      .from('properties')
      .update({ sort_order: i + 1 })
      .eq('id', p.id)
  );
  await Promise.all(updates);
}

async function getNextSortOrder() {
  const { data, error } = await getClient()
    .from('properties')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data.length ? data[0].sort_order + 1 : 1;
}
