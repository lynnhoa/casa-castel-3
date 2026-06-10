/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   [PLACEHOLDER — replace with full implementation]

   Proof upload: single button → step through 3 photos (trash,
   geschirr, overview) → submit → posts [submission] to chat.
   Button only shown when isMyTurn && status pending|flagged.

   Chat: identical to landlord. Room = currentRoom from auth.js.
   Realtime: kitchen-tenant-rt channel.

   Depends on: constants.js, utils.js, supabase-client.js,
               chat-viewport.js
   ───────────────────────────────────────────────────────────── */

document.getElementById('tab-kitchen').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;font-family:inherit;">
    Kitchen tab coming soon…
  </div>
`;

function initKitchenMobile() {
  // TODO: implement
}
