/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — LANDLORD KITCHEN TAB
   js/tab-kitchen.js

   [PLACEHOLDER — replace with full implementation]

   Architecture: one loadKitchen() function, called on init and
   by every realtime event. No mobile/desktop split in JS.
   CSS handles layout. Pattern mirrors tab-cleaning.js exactly.

   PWA KEYBOARD FIX — three layers (unchanged from v2):
   1. initChatViewport() in layout.js covers tab-kitchen.
   2. wireComposeBlur(#k-mob-msg-input) at bottom of this file.
   3. overscroll-behavior:none/.k-mob-feed in casa-castel.css.

   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js, chat-viewport.js
   ───────────────────────────────────────────────────────────── */

document.getElementById('tab-kitchen').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;font-family:inherit;">
    Kitchen tab coming soon…
  </div>
`;

function loadKitchen() {
  // TODO: implement
}
