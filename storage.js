/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — STORAGE
   js/storage.js

   In-memory state helpers. No localStorage for room or kitchen state.
   Source of truth is always Supabase via appRooms[] and kitchenRooms[].
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
// Reads appRooms[] in memory only — no localStorage fallback.
// appRooms is populated by loadRoomsData() and kept live by initRoomsRealtime().
function isVacant(room) {
  if (typeof appRooms !== 'undefined') {
    const r = appRooms.find(r => r.name === room);
    if (r) return !!r.vacant;
  }
  return false;
}

/* ── KITCHEN ROOMS (landlord-configurable, Supabase-synced) ─ */
// Single in-memory array — no localStorage. Populated by loadKitchenRoomsFromSupabase().
// Updated live when a lounge_data kitchen_config INSERT arrives via realtime.
let kitchenRooms = [...KITCHEN_ROOMS];

function getKitchenRooms() {
  return kitchenRooms;
}

async function loadKitchenRoomsFromSupabase() {
  if (!sbL) return;
  const { data } = await sbL.from('lounge_data').select('body')
    .eq('type', 'kitchen_config').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (data && data.body) {
    try {
      const rooms = JSON.parse(data.body);
      if (Array.isArray(rooms)) kitchenRooms = rooms;
    } catch {}
  }
}

// Called from realtime handler when a kitchen_config row is inserted/updated.
function _applyKitchenConfig(body) {
  try {
    const rooms = JSON.parse(body);
    if (Array.isArray(rooms)) kitchenRooms = rooms;
  } catch {}
}

async function syncKitchenRoomsToSupabase(rooms) {
  if (!sbL) return;
  kitchenRooms = rooms;
  await sbL.from('lounge_data').delete().eq('type', 'kitchen_config');
  await sbL.from('lounge_data').insert({ type: 'kitchen_config', body: JSON.stringify(rooms) });
}
