/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — LANDLORD KITCHEN TAB
   js/tab-kitchen.js

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

  <div class="k-desktop-grid">
    <div class="k-desktop-left">
      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr"><span class="k-dsk-section-lbl">Rotation</span></div>
        <div id="k-dsk-rot-list"></div>
      </div>
    </div>
    <div class="k-desktop-right">
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;font-family:inherit;">
        Kitchen tab coming soon…
      </div>
    </div>
  </div>
`;

/* ── SUPABASE HELPER ─────────────────────────────────────── */
async function _kGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}

/* ── ROTATION STRIP ─────────────────────────────────────── */
async function loadKitchen() {
  await renderKitchenRotation(_kGetWeek, {
    dskListId:  'k-dsk-rot-list',
    dskVariant: 'landlord',
  });
}

loadKitchen();
