/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   [PLACEHOLDER — replace with full implementation]

   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js, chat-viewport.js
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
        <div id="k-ten-dsk-rot"></div>
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
async function _kTenGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}

/* ── ROOM LIST ──────────────────────────────────────────── */
function _kTenGetRoomList() {
  const kitchenEnabled = typeof getKitchenRooms === 'function' ? getKitchenRooms() : [];
  if (typeof appRooms !== 'undefined' && appRooms.length > 0) {
    return [...appRooms]
      .filter(r => r.active && kitchenEnabled.includes(r.name))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(r => r.name);
  }
  return kitchenEnabled;
}

/* ── ROTATION STATE ─────────────────────────────────────── */
function _kRotState(opts) {
  const { isNow, isPast, isNext, dbStatus, room, weekStart, absenceRows } = opts;
  if (absenceRows && weekStart) {
    const wStart = weekStart.toISOString().slice(0, 10);
    const wEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (absenceRows.some(a => a.room === room && a.from_date <= wEnd && a.to_date >= wStart)) return 'absent';
  }
  if (isVacant(room)) return 'skipped';
  if (isNow) {
    if (dbStatus === 'approved') return 'done';
    return 'now';
  }
  if (!isPast) return isNext ? 'next' : 'upcoming';
  if (!dbStatus)               return 'none';
  if (dbStatus === 'approved') return 'done';
  if (dbStatus === 'skipped')  return 'skipped';
  if (dbStatus === 'absent')   return 'absent';
  return 'missed';
}

/* ── ROTATION STRIP ─────────────────────────────────────── */
async function _kTenRenderMobRotation() {
  const el = document.getElementById('k-mob-rot-strip'); if (!el) return;
  const rooms      = _kTenGetRoomList();
  const idx        = kWeekIdx();
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);

  const [dbRows, absData] = await Promise.all([
    Promise.all(rooms.map((_, i) => _kTenGetWeek(cycleStart + i))),
    sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
  ]);

  let approvedCount = 0;
  for (let i = 0; i < cyclePos; i++) { if (dbRows[i] && dbRows[i].status === 'approved') approvedCount++; }
  const greenPct = approvedCount > 0 ? ((approvedCount / rooms.length) * 100).toFixed(1) + '%' : '0%';

  let trueNextI = -1;
  for (let offset = 1; offset < rooms.length; offset++) {
    const ni = cyclePos + offset;
    if (ni >= rooms.length) break;
    const nRoom  = rooms[ni];
    const nStart = new Date(K_START.getTime() + (cycleStart + ni) * 7 * 24 * 60 * 60 * 1000);
    const nEnd   = new Date(nStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const nWs = nStart.toISOString().slice(0, 10);
    const nWe = nEnd.toISOString().slice(0, 10);
    const nAbsent  = absData.some(a => a.room === nRoom && a.from_date <= nWe && a.to_date >= nWs);
    const nSkipped = isVacant(nRoom);
    if (!nAbsent && !nSkipped) { trueNextI = ni; break; }
  }

  const items = rooms.map((room, i) => {
    const slotIdx = cycleStart + i;
    const info    = kWeekInfo(Math.max(0, slotIdx));
    const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
    const dbRow   = dbRows[i];
    const state   = _kRotState({ isNow: i===cyclePos, isPast: i<cyclePos, isNext: i===trueNextI, dbStatus: dbRow?dbRow.status:null, room, weekStart: info?info.start:null, absenceRows: absData });
    const badgeText = { done:'✓', missed:'✗', skipped:'—', absent:'away', now:'Now', none:'—', next:'Next', upcoming:'—' }[state] || '—';
    return `<div class="k-mob-rot-item ${state}"><span class="k-mob-rot-badge ${state}">${badgeText}</span><span class="k-mob-rot-room">${esc(room)}</span><span class="k-mob-rot-dates">${dateStr}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="k-mob-rot-line"></div><div class="k-mob-rot-line-done" style="width:${greenPct}"></div><div class="k-mob-rot-items">${items}</div>`;

  const dskRot = document.getElementById('k-ten-dsk-rot');
  if (dskRot) {
    dskRot.innerHTML = '<div class="rot-tl">' + rooms.map((room, i) => {
      const slotIdx  = cycleStart + i;
      const start    = new Date(K_START.getTime() + slotIdx * 7 * 24 * 60 * 60 * 1000);
      const end      = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      const dateStr  = fmt(start) + ' – ' + fmt(end);
      const dbRow    = dbRows[i];
      const state    = _kRotState({ isNow: i===cyclePos, isPast: i<cyclePos, isNext: i===trueNextI, dbStatus: dbRow?dbRow.status:null, room, weekStart: start, absenceRows: absData });
      const dotClass = { done:'rot-dot--done', now:'rot-dot--now', missed:'rot-dot--missed', skipped:'rot-dot--skipped', absent:'rot-dot--absent' }[state] || 'rot-dot--next';
      const topLine  = state==='done'||state==='now' ? 'rot-line-done'
                     : state==='skipped' ? 'rot-line-skipped'
                     : state==='absent'  ? 'rot-line-absent'
                     : state==='missed'  ? 'rot-line-missed' : 'rot-line-faded';
      const botLine  = state==='done' && slotIdx < idx-1 ? 'rot-line-done' : 'rot-line-faded';
      const badge    = {
        done:     '<span class="rot-badge rot-badge--done">Done</span>',
        now:      '<span class="rot-badge rot-badge--now">Now</span>',
        next:     '<span class="rot-badge rot-badge--next">Next</span>',
        missed:   '<span class="rot-badge rot-badge--missed">Missed</span>',
        skipped:  '<span class="rot-badge rot-badge--skipped">Skipped</span>',
        absent:   '<span class="rot-badge rot-badge--absent">Away</span>',
        upcoming: '<span class="rot-badge rot-badge--none">—</span>',
      }[state] || '<span class="rot-badge rot-badge--none">—</span>';
      const rowClass = 'rot-tl-row'
        + (state==='now'     ? ' rot-tl-row--now'
         : state==='missed'  ? ' rot-tl-row--missed'
         : state==='skipped' ? ' rot-tl-row--skipped'
         : state==='absent'  ? ' rot-tl-row--absent'
         : state==='next'    ? ' rot-tl-row--next' : '');
      return `<div class="${rowClass}"><div class="rot-spine"><div class="rot-spine-top ${topLine}"></div><div class="rot-dot ${dotClass}"></div><div class="rot-spine-bot ${botLine}"></div></div><div class="rot-tl-body"><div class="rot-tl-info"><p class="rot-tl-room">${esc(room)}</p><p class="rot-tl-dates">${dateStr}</p></div>${badge}</div></div>`;
    }).join('') + '</div>';
  }
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
  await _kTenRenderMobRotation();
})();

/* ── NAV ALIASES (layout.js expects these) ──────────────── */
function initKitchenMobile() { _kTenRenderMobRotation(); }
var initKitchenMobExtend = initKitchenMobile;
var initKitchen          = initKitchenMobile;
