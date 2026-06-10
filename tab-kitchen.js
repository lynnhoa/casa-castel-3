/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — LANDLORD KITCHEN TAB
   js/tab-kitchen.js

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

/* ── SUPABASE HELPERS ───────────────────────────────────── */
async function _kGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}

/* ── ROOM LIST ──────────────────────────────────────────── */
function _kGetRoomList() {
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
async function _kRenderRotation(absData) {
  const el = document.getElementById('k-mob-rot-strip'); if (!el) return;
  const rooms = _kGetRoomList();
  if (!rooms.length) { el.innerHTML = ''; return; }
  const idx        = kWeekIdx();
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);

  const dbRows = await Promise.all(rooms.map((_, i) => _kGetWeek(cycleStart + i)));

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
    if (!absData.some(a => a.room === nRoom && a.from_date <= nWe && a.to_date >= nWs) && !isVacant(nRoom)) {
      trueNextI = ni; break;
    }
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

  const elDsk = document.getElementById('k-dsk-rot-list');
  if (elDsk) {
    const dotColor    = { done:'#9AC87A', now:'#E8C97A', next:'#90C2F5', missed:'#F5A8A5', skipped:'#C4B5FD', absent:'#D4A87A', upcoming:'var(--cc-rule)', none:'var(--cc-rule)' };
    const statusLabel = { done:'✓ Done', missed:'✗ Missed', skipped:'— Skip', absent:'Away', now:'Now', next:'Next', upcoming:'', none:'' };
    const statusCls   = { done:'rs-done', missed:'rs-missed', now:'rs-now', next:'rs-next' };
    elDsk.innerHTML = rooms.map((room, i) => {
      const slotIdx = cycleStart + i;
      const info    = kWeekInfo(Math.max(0, slotIdx));
      const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
      const dbRow   = dbRows[i];
      const state   = _kRotState({ isNow:i===cyclePos, isPast:i<cyclePos, isNext:i===trueNextI, dbStatus:dbRow?dbRow.status:null, room, weekStart:info?info.start:null, absenceRows:absData });
      const dot     = dotColor[state] || 'var(--cc-rule)';
      const lbl     = statusLabel[state] || '';
      const cls     = statusCls[state] || '';
      const roomStyle = state === 'now' ? 'font-weight:500;color:#633806;' : '';
      const badge   = lbl ? `<span class="k-dsk-rot-status ${cls}">${lbl}</span>` : '';
      return `<div class="k-dsk-rot-item"><div class="k-dsk-rot-dot" style="background:${dot};"></div><span class="k-dsk-rot-room" style="${roomStyle}">${esc(room)}</span><span class="k-dsk-rot-date">${dateStr}</span>${badge}</div>`;
    }).join('');
  }
}

/* ── INIT ───────────────────────────────────────────────── */
async function loadKitchen() {
  const absData = sbL
    ? await sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || [])
    : [];
  await _kRenderRotation(absData);
}

loadKitchen();
