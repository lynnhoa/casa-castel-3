/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — SUPABASE CLIENT
   js/supabase-client.js

   Single createClient() call shared by both landlord.html
   and tenant.html. Exports global `sbL`.
   Depends on: constants.js (SB_URL, SB_KEY)
   Load order: constants.js → supabase-client.js → everything else
   ───────────────────────────────────────────────────────────── */

let sbL = null;

if (typeof supabase !== 'undefined') {
  sbL = supabase.createClient(SB_URL, SB_KEY);
}
