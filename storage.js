/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — STORAGE
   js/storage.js

   localStorage wrapper + vacancy state helpers.
   Depends on: constants.js, supabase-client.js
   ───────────────────────────────────────────────────────────── */

/* ── GENERIC WRAPPER ────────────────────────────────────── */
const S = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem('cc_' + k);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem('cc_' + k, JSON.stringify(v)); } catch {}
  },
  remove(k) {
    try { localStorage.removeItem('cc_' + k); } catch {}
  }
};

/* ── VACANCY HELPERS ────────────────────────────────────── */
function isVacant(room) {
  try {
    if (typeof appRooms !== 'undefined' && appRooms.length > 0) {
      const r = appRooms.find(r => r.name === room);
      if (r) return !!r.vacant;
    }
    const v = localStorage.getItem('cc_vacancies');
    return v ? JSON.parse(v)[room] === true : false;
  } catch { return false; }
}

function setVacancy(room, vacant) {
  try {
    const v = JSON.parse(localStorage.getItem('cc_vacancies') || '{}');
    v[room] = vacant;
    localStorage.setItem('cc_vacancies', JSON.stringify(v));
  } catch {}
}

async function syncVacanciesToSupabase(room, vacant) {
  if (!sbL) return;
  await sbL.from('lounge_data').delete().eq('type','vacancy').eq('room', room);
  if (vacant) await sbL.from('lounge_data').insert({ type:'vacancy', room, body:'vacant' });
}

async function loadVacanciesFromSupabase() {
  if (!sbL) return;
  const { data } = await sbL.from('lounge_data').select('room').eq('type','vacancy');
  if (!data) return;
  const map = {};
  data.forEach(r => { if (r.room) map[r.room] = true; });
  localStorage.setItem('cc_vacancies', JSON.stringify(map));
}

async function toggleVacancyFull(room) {
  const nowVacant = !isVacant(room);
  setVacancy(room, nowVacant);
  await syncVacanciesToSupabase(room, nowVacant);
}

/* ── KITCHEN ROOMS (landlord-configurable, Supabase-synced) ─ */
function getKitchenRooms() {
  try {
    const v = localStorage.getItem('cc_kitchen_rooms');
    return v ? JSON.parse(v) : [...KITCHEN_ROOMS];
  } catch { return [...KITCHEN_ROOMS]; }
}

async function loadKitchenRoomsFromSupabase() {
  if (!sbL) return;
  const { data } = await sbL.from('lounge_data').select('body')
    .eq('type', 'kitchen_config').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (data && data.body) {
    try {
      const rooms = JSON.parse(data.body);
      if (Array.isArray(rooms)) localStorage.setItem('cc_kitchen_rooms', JSON.stringify(rooms));
    } catch {}
  }
}

async function syncKitchenRoomsToSupabase(rooms) {
  if (!sbL) return;
  await sbL.from('lounge_data').delete().eq('type', 'kitchen_config');
  await sbL.from('lounge_data').insert({ type: 'kitchen_config', body: JSON.stringify(rooms) });
}
