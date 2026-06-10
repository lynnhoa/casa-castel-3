/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   [PLACEHOLDER — replace with full implementation]

   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js, chat-viewport.js,
               tab-kitchen-rotation.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-kitchen').innerHTML = `
  <div id="k-mob-wrapper">
    <div class="k-mob-rot" id="k-mob-rot-strip"></div>
    <div style="display:flex;align-items:center;justify-content:center;flex:1;color:#999;font-size:14px;font-family:inherit;padding:32px 0;">
      Kitchen tab coming soon…
    </div>
  </div>
`;

/* ── SUPABASE HELPER ─────────────────────────────────────── */
async function _kTenGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}

/* ── ROTATION STRIP ─────────────────────────────────────── */
async function initKitchenMobile() {
  await renderKitchenRotation(_kTenGetWeek, {
    dskListId:  'k-ten-dsk-rot',
    dskVariant: 'tenant',
  });
}

/* ── SHOW KITCHEN TAB IN NAV ────────────────────────────── */
function _kTenShowTabIfEligible() {
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : null)
             || localStorage.getItem('cc_room');
  if (!room) return;
  const inKitchenConfig = getKitchenRooms().includes(room);
  const inRoomsTable    = typeof appRooms !== 'undefined'
    && !!appRooms.find(r => r.name === room)?.kitchen_enabled;
  if (inKitchenConfig || inRoomsTable) {
    document.getElementById('kitchenTab')?.style.removeProperty('display');
  }
}
(async function _kTenEnsureTabVisible() {
  await loadKitchenRoomsFromSupabase();
  _kTenShowTabIfEligible();
  initKitchenMobile();
})();

/* ── NAV ALIASES (layout.js expects these) ──────────────── */
var initKitchenMobExtend = initKitchenMobile;
var initKitchen          = initKitchenMobile;
