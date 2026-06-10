/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — SHARED KITCHEN ROTATION STRIP
   js/tab-kitchen-rotation.js

   Single source of truth for the mobile rotation strip
   (#k-mob-rot-strip) shown in both the landlord and tenant
   kitchen tabs.

   Usage
   ─────
   Call renderKitchenRotation(getWeekFn, opts) from either tab
   after the current week row + absence data are available.

     getWeekFn  async (idx) => dbRow | null
                The caller's own Supabase fetch — _kGetWeek for
                landlord, _kTenGetWeek for tenant.

     opts (all optional)
       mobStripId   string   DOM id of the strip (default 'k-mob-rot-strip')
       dskListId    string   DOM id of the desktop list element, if any.
                             Landlord passes 'k-dsk-rot-list' (k-dsk-rot-*
                             CSS), tenant passes 'k-ten-dsk-rot' (rot-tl CSS).
       dskVariant   string   'landlord' | 'tenant'  (default 'landlord')

   Depends on: constants.js (K_START), utils.js (kWeekIdx, kWeekInfo,
               esc), storage.js (isVacant, getKitchenRooms, appRooms)
   ───────────────────────────────────────────────────────────── */

/* ── ROOM LIST ──────────────────────────────────────────── */
function _kRotGetRoomList() {
  const kitchenEnabled = typeof getKitchenRooms === 'function' ? getKitchenRooms() : [];
  if (typeof appRooms !== 'undefined' && appRooms.length > 0) {
    return [...appRooms]
      .filter(r => r.active && kitchenEnabled.includes(r.name))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(r => r.name);
  }
  return kitchenEnabled;
}

/* ── STATE CLASSIFIER ───────────────────────────────────── */
function _kRotState({ isNow, isPast, isNext, dbStatus, room, weekStart, absenceRows }) {
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

/* ── MAIN RENDER ────────────────────────────────────────── */
async function renderKitchenRotation(getWeekFn, opts = {}) {
  const {
    mobStripId = 'k-mob-rot-strip',
    dskListId  = null,
    dskVariant = 'landlord',
  } = opts;

  const el = document.getElementById(mobStripId);
  if (!el) return;

  const rooms = _kRotGetRoomList();
  if (!rooms.length) { el.innerHTML = ''; return; }

  const idx        = kWeekIdx();
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;

  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);

  // Fetch all rows for this cycle + absence data in parallel
  const [dbRows, absData] = await Promise.all([
    Promise.all(rooms.map((_, i) => getWeekFn(cycleStart + i))),
    (typeof sbL !== 'undefined' && sbL)
      ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || [])
      : Promise.resolve([]),
  ]);

  // Progress bar — count approved weeks before current position
  let approvedCount = 0;
  for (let i = 0; i < cyclePos; i++) {
    if (dbRows[i] && dbRows[i].status === 'approved') approvedCount++;
  }
  const greenPct = approvedCount > 0
    ? ((approvedCount / rooms.length) * 100).toFixed(1) + '%'
    : '0%';

  // True next — first future slot that is neither absent nor vacant
  let trueNextI = -1;
  for (let offset = 1; offset < rooms.length; offset++) {
    const ni    = cyclePos + offset;
    if (ni >= rooms.length) break;
    const nRoom  = rooms[ni];
    const nStart = new Date(K_START.getTime() + (cycleStart + ni) * 7 * 24 * 60 * 60 * 1000);
    const nEnd   = new Date(nStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const nWs    = nStart.toISOString().slice(0, 10);
    const nWe    = nEnd.toISOString().slice(0, 10);
    if (!absData.some(a => a.room === nRoom && a.from_date <= nWe && a.to_date >= nWs) && !isVacant(nRoom)) {
      trueNextI = ni; break;
    }
  }

  // ── MOBILE STRIP ──────────────────────────────────────
  const badgeLabel = { done:'✓', missed:'✗', skipped:'—', absent:'away', now:'Now', none:'—', next:'Next', upcoming:'—' };
  const items = rooms.map((room, i) => {
    const info    = kWeekInfo(Math.max(0, cycleStart + i));
    const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
    const state   = _kRotState({
      isNow:       i === cyclePos,
      isPast:      i < cyclePos,
      isNext:      i === trueNextI,
      dbStatus:    dbRows[i] ? dbRows[i].status : null,
      room,
      weekStart:   info ? info.start : null,
      absenceRows: absData,
    });
    const badge = badgeLabel[state] || '—';
    return `<div class="k-mob-rot-item ${state}"><span class="k-mob-rot-badge ${state}">${badge}</span><span class="k-mob-rot-room">${esc(room)}</span><span class="k-mob-rot-dates">${dateStr}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="k-mob-rot-line"></div><div class="k-mob-rot-line-done" style="width:${greenPct}"></div><div class="k-mob-rot-items">${items}</div>`;

  // ── DESKTOP LIST (optional) ────────────────────────────
  const elDsk = dskListId ? document.getElementById(dskListId) : null;
  if (!elDsk) return;

  if (dskVariant === 'tenant') {
    // Vertical timeline (rot-tl CSS) — used by tenant.html
    elDsk.innerHTML = '<div class="rot-tl">' + rooms.map((room, i) => {
      const slotIdx = cycleStart + i;
      const start   = new Date(K_START.getTime() + slotIdx * 7 * 24 * 60 * 60 * 1000);
      const end     = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      const dateStr = fmt(start) + ' – ' + fmt(end);
      const state   = _kRotState({ isNow: i===cyclePos, isPast: i<cyclePos, isNext: i===trueNextI, dbStatus: dbRows[i]?dbRows[i].status:null, room, weekStart: start, absenceRows: absData });
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

  } else {
    // k-dsk-rot-* compact list — used by landlord.html
    const dotColor    = { done:'#9AC87A', now:'#E8C97A', next:'#90C2F5', missed:'#F5A8A5', skipped:'#C4B5FD', absent:'#D4A87A', upcoming:'var(--cc-rule)', none:'var(--cc-rule)' };
    const statusLabel = { done:'✓ Done', missed:'✗ Missed', skipped:'— Skip', absent:'Away', now:'Now', next:'Next', upcoming:'', none:'' };
    const statusCls   = { done:'rs-done', missed:'rs-missed', now:'rs-now', next:'rs-next' };
    elDsk.innerHTML = rooms.map((room, i) => {
      const info    = kWeekInfo(Math.max(0, cycleStart + i));
      const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
      const state   = _kRotState({ isNow:i===cyclePos, isPast:i<cyclePos, isNext:i===trueNextI, dbStatus:dbRows[i]?dbRows[i].status:null, room, weekStart:info?info.start:null, absenceRows:absData });
      const dot     = dotColor[state]    || 'var(--cc-rule)';
      const lbl     = statusLabel[state] || '';
      const cls     = statusCls[state]   || '';
      const style   = state === 'now' ? 'font-weight:500;color:#633806;' : '';
      const badge   = lbl ? `<span class="k-dsk-rot-status ${cls}">${lbl}</span>` : '';
      return `<div class="k-dsk-rot-item"><div class="k-dsk-rot-dot" style="background:${dot};"></div><span class="k-dsk-rot-room" style="${style}">${esc(room)}</span><span class="k-dsk-rot-date">${dateStr}</span>${badge}</div>`;
    }).join('');
  }
}
