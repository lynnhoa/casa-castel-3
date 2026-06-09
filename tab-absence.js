/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — ABSENCE MANAGEMENT
   js/tab-absence.js

   Single source of truth for all absence functionality.
   Loaded in both landlord.html and tenant.html.
   Writes to kitchen_absences table — shared by kitchen and
   cleaning tabs for rotation strip state.

   Public API:
     absOpenModal(name)       — 'register' or 'list'
     absCloseModal(name)
   Depends on: constants.js, supabase-client.js, utils.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT MODAL HTML ──────────────────────────────────────── */
(function _absInjectModals() {
  const wrap = document.createElement('div');
  wrap.id = 'absence-modals';
  wrap.innerHTML = `
    <!-- Register absence modal (tenant only) -->
    <div class="cc-modal-overlay" id="absence-modal-register" onclick="if(event.target===this)absCloseModal('register')">
      <div class="cc-modal-sheet" style="max-height:80vh;">
        <div class="cc-modal-hdr">
          <span class="cc-modal-title">Register absence</span>
          <button class="cc-modal-close" onclick="absCloseModal('register')">✕</button>
        </div>
        <div class="cc-modal-body">
          <div id="abs-room-pill" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500;padding:3px 10px;border-radius:8px;background:var(--cc-notice-bg);border:0.5px solid var(--cc-notice-bdr);color:var(--cc-notice-text);margin-bottom:14px;"></div>
          <p style="font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);margin-bottom:6px;">Dates</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <p style="font-size:11px;color:var(--cc-taupe);width:36px;flex-shrink:0;">From</p>
              <input type="date" id="abs-from" style="flex:1;min-width:0;height:40px;border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);padding:0 10px;font-size:12px;color:var(--cc-taupe);background:var(--cc-white);font-family:inherit;"/>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <p style="font-size:11px;color:var(--cc-taupe);width:36px;flex-shrink:0;">To</p>
              <input type="date" id="abs-to" style="flex:1;min-width:0;height:40px;border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);padding:0 10px;font-size:12px;color:var(--cc-taupe);background:var(--cc-white);font-family:inherit;"/>
            </div>
          </div>
          <p style="font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);margin-bottom:6px;">Note (optional)</p>
          <textarea id="abs-note" rows="2" placeholder="e.g. holiday, work trip…" style="width:100%;border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);padding:8px 10px;font-size:12px;color:var(--cc-ink);background:var(--cc-white);font-family:inherit;resize:none;margin-bottom:14px;"></textarea>
          <p id="abs-error" style="font-size:11px;color:#7A2020;margin-bottom:8px;display:none;"></p>
          <button id="abs-save" style="width:100%;height:42px;background:var(--cc-notice-bg);border:0.5px solid var(--cc-notice-bdr);border-radius:var(--cc-r-sm);color:var(--cc-notice-text);font-size:11px;font-weight:500;letter-spacing:0.06em;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;">
            <i class="ti ti-calendar-plus" style="font-size:14px;" aria-hidden="true"></i>
            Save absence
          </button>
        </div>
      </div>
    </div>

    <!-- All absences list modal (tenant + landlord) -->
    <div class="cc-modal-overlay" id="absence-modal-list" onclick="if(event.target===this)absCloseModal('list')">
      <div class="cc-modal-sheet" style="max-height:75vh;">
        <div class="cc-modal-hdr">
          <span class="cc-modal-title">Absences</span>
          <button class="cc-modal-close" onclick="absCloseModal('list')">✕</button>
        </div>
        <div class="cc-modal-body">
          <div id="abs-list-body"><p class="cc-note">Loading…</p></div>
          <div id="abs-list-add" style="margin-top:14px;display:none;">
            <button onclick="absCloseModal('list');absOpenModal('register');" style="width:100%;height:40px;background:var(--cc-notice-bg);border:0.5px solid var(--cc-notice-bdr);border-radius:var(--cc-r-sm);color:var(--cc-notice-text);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;">
              <i class="ti ti-plus" style="font-size:14px;" aria-hidden="true"></i>
              Add absence
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  /* Wire from-date change → update to-date min */
  document.getElementById('abs-from')?.addEventListener('change', e => {
    const toEl = document.getElementById('abs-to');
    if (toEl) { toEl.min = e.target.value; if (toEl.value < e.target.value) toEl.value = e.target.value; }
  });

  /* Wire save button */
  document.getElementById('abs-save')?.addEventListener('click', absSaveAbsence);
})();

/* ── ROLE DETECTION ─────────────────────────────────────────── */
function _absRole() { return localStorage.getItem('cc_role') || 'tenant'; }
function _absMyRoom() {
  return (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
}

/* ── OPEN / CLOSE ───────────────────────────────────────────── */
function absOpenModal(name) {
  document.getElementById('absence-modal-' + name)?.classList.add('open');
  if (name === 'list') _absPopulateList();
  if (name === 'register') {
    const myRoom = _absMyRoom();
    const pill = document.getElementById('abs-room-pill');
    if (pill) pill.textContent = myRoom;
    // Pre-fill to next Mon–Sun
    const today = new Date();
    const day = today.getDay();
    const daysToMon = day === 0 ? 1 : 8 - day;
    const nextMon = new Date(today); nextMon.setDate(today.getDate() + daysToMon);
    const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);
    const fmt = d => d.toISOString().slice(0,10);
    const today10 = fmt(today);
    const fromEl = document.getElementById('abs-from');
    const toEl   = document.getElementById('abs-to');
    if (fromEl) { fromEl.min = today10; fromEl.value = fmt(nextMon); }
    if (toEl)   { toEl.min = fmt(nextMon); toEl.value = fmt(nextSun); }
    const errEl = document.getElementById('abs-error');
    if (errEl) errEl.style.display = 'none';
    const noteEl = document.getElementById('abs-note');
    if (noteEl) noteEl.value = '';
  }
}
function absCloseModal(name) {
  document.getElementById('absence-modal-' + name)?.classList.remove('open');
}

/* ── LIST POPULATOR ─────────────────────────────────────────── */
async function _absPopulateList() {
  const el = document.getElementById('abs-list-body');
  const addBtn = document.getElementById('abs-list-add');
  if (!el) return;
  if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const isLandlord = _absRole() === 'landlord';
  // Show Add button for tenants only
  if (addBtn) addBtn.style.display = isLandlord ? 'none' : '';
  const { data } = await sbL.from('kitchen_absences').select('*').order('from_date', { ascending: true });
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">No absences registered.</p>'; return; }
  const fmtD = s => { const [y,m,d] = s.split('-'); return `${d}.${m}.${y}`; };
  // Current cleaning week dates for "this week" indicator
  const curIdx = typeof _hcWeekIndex === 'function' ? _hcWeekIndex(new Date()) : -1;
  const curInfo = curIdx >= 0 && typeof _hcWeekInfo === 'function' ? _hcWeekInfo(curIdx) : null;
  const curStart = curInfo ? curInfo.start.toISOString().slice(0,10) : null;
  const curEnd   = curInfo ? curInfo.end.toISOString().slice(0,10)   : null;
  const badge = `<span style="font-size:9px;font-weight:500;padding:2px 8px;border-radius:8px;background:#F5EEE8;border:0.5px solid #D4A87A;color:#8C5A30;white-space:nowrap;flex-shrink:0;">Away</span>`;
  el.innerHTML = data.map(a => {
    const overlaps = curStart && a.from_date <= curEnd && a.to_date >= curStart;
    const thisWeek = overlaps ? `<span style="font-size:10px;color:#8C5A30;margin-left:4px;">· this week</span>` : '';
    const note = a.note ? ` · <span style="color:var(--cc-stone);">${esc(a.note)}</span>` : '';
    const canDelete = isLandlord || a.room === _absMyRoom();
    return `<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:9px 0;border-bottom:0.5px solid var(--cc-rule);">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">${badge}<span style="font-size:13px;font-weight:500;color:var(--cc-ink);">${esc(a.room)}</span>${thisWeek}</div>
        <div style="font-size:11px;color:var(--cc-taupe);">${fmtD(a.from_date)} – ${fmtD(a.to_date)}${note}</div>
      </div>
      ${canDelete ? `<button onclick="absDeleteAbsence('${a.id}')" style="font-size:11px;color:var(--cc-stone);background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;">✕</button>` : ''}
    </div>`;
  }).join('');
}

/* ── SAVE (tenant only, with merge) ─────────────────────────── */
let _absSaveBusy = false;
async function absSaveAbsence() {
  if (_absSaveBusy) return; _absSaveBusy = true;
  try {
    if (!sbL) return;
    const myRoom  = _absMyRoom();
    const fromVal = document.getElementById('abs-from')?.value;
    const toVal   = document.getElementById('abs-to')?.value;
    const noteRaw = document.getElementById('abs-note')?.value.trim() || '';
    const errEl   = document.getElementById('abs-error');
    const showErr = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = ''; } };
    if (!fromVal || !toVal) { showErr('Please select both dates.'); return; }
    const today = new Date().toISOString().slice(0,10);
    if (fromVal < today) { showErr('From date must be today or later.'); return; }
    if (toVal < fromVal) { showErr('To date must be on or after from date.'); return; }
    const saveBtn = document.getElementById('abs-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
    // Fetch existing for merge
    const { data: existing, error: fetchErr } = await sbL.from('kitchen_absences').select('*').eq('room', myRoom);
    if (fetchErr) {
      showErr('Could not save — ' + (fetchErr.message || 'please try again.'));
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="ti ti-calendar-plus" style="font-size:14px;margin-right:6px;" aria-hidden="true"></i>Save absence'; }
      return;
    }
    // Merge overlapping/adjacent
    const dayAfter  = d => { const x = new Date(d); x.setDate(x.getDate()+1); return x.toISOString().slice(0,10); };
    const dayBefore = d => { const x = new Date(d); x.setDate(x.getDate()-1); return x.toISOString().slice(0,10); };
    const overlapping = (existing||[]).filter(a => a.from_date <= dayAfter(toVal) && a.to_date >= dayBefore(fromVal));
    const allFrom = [fromVal, ...overlapping.map(a=>a.from_date)];
    const allTo   = [toVal,   ...overlapping.map(a=>a.to_date)];
    const mergedFrom = allFrom.reduce((a,b) => a<b?a:b);
    const mergedTo   = allTo.reduce((a,b) => a>b?a:b);
    const existingNote = overlapping.find(a=>a.note)?.note || null;
    const mergedNote   = noteRaw || existingNote;
    if (overlapping.length) {
      await sbL.from('kitchen_absences').delete().in('id', overlapping.map(a=>a.id));
    }
    const payload = { room: myRoom, from_date: mergedFrom, to_date: mergedTo };
    if (mergedNote) payload.note = mergedNote;
    const { error: insErr } = await sbL.from('kitchen_absences').insert(payload);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="ti ti-calendar-plus" style="font-size:14px;margin-right:6px;" aria-hidden="true"></i>Save absence'; }
    if (insErr) { showErr('Could not save — ' + (insErr.message || 'please try again.')); return; }
    absCloseModal('register');
    absOpenModal('list');
  } finally { _absSaveBusy = false; }
}

/* ── DELETE ─────────────────────────────────────────────────── */
async function absDeleteAbsence(id) {
  if (!sbL) return;
  await sbL.from('kitchen_absences').delete().eq('id', id);
  _absPopulateList();
  // Notify both tabs to re-render rotation
  // kitchen_absences realtime listeners on _kChannel and _hcChannel handle this automatically
}
