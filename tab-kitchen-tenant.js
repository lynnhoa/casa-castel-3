/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   [PLACEHOLDER — replace with full implementation]

   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js, chat-viewport.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-kitchen').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;font-family:inherit;">
    Kitchen tab coming soon…
  </div>
`;

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
})();

/* ── NAV ALIASES (layout.js expects these) ──────────────── */
function initKitchenMobile() { /* TODO: implement */ }
var initKitchenMobExtend = initKitchenMobile;
var initKitchen          = initKitchenMobile;
