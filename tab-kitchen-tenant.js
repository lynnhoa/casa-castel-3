/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   Proof upload: single button → step through 3 photos (trash,
   geschirr, overview) → submit → posts [submission] to chat.
   Button only shown when isMyTurn && status pending|flagged.

   Chat: identical to landlord. Room = currentRoom from auth.js.
   Realtime: kitchen-tenant-rt channel.

   Depends on: constants.js, utils.js, supabase-client.js,
               chat-viewport.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-kitchen').innerHTML = `

  <style>
    /* Tenant kitchen: show k-mob-wrapper on desktop as normal scrollable column.
       Overrides the global @media(min-width:701px){#k-mob-wrapper{display:none}} */
    @media(min-width:701px){
      #tab-kitchen #k-mob-wrapper {
        display: flex !important;
        flex-direction: column;
        max-width: 720px;
        margin: 0 auto;
        padding: 32px 0 48px;
        height: auto;
        overflow: visible;
      }
      #tab-kitchen #k-mob-rot-strip { display: none; }
      #tab-kitchen .k-mob-week { border-radius: var(--cc-r-lg); }
      #tab-kitchen .k-mob-feed { max-height: 480px; }
      #tab-kitchen #k-ten-nudge-banner { border-radius: var(--cc-r-md); margin-bottom: 8px; }
    }
  </style>

  <!-- ══ MOBILE WRAPPER ══ -->
  <div id="k-mob-wrapper">

    <!-- Rotation progress strip -->
    <div class="k-mob-rot" id="k-mob-rot-strip"></div>

    <!-- Week card -->
    <div class="k-mob-week">
      <div class="k-mob-week-top-row">
        <span class="k-mob-status-chip pending" id="k-mob-status-chip"></span>
        <div class="k-mob-week-corner-links">
          <button class="k-mob-week-corner-link" onclick="kitchenTenantOpenModal('history')">history</button>
        </div>
      </div>
      <div class="k-mob-week-body">
        <div class="k-mob-week-left">
          <span class="k-mob-week-room" id="k-mob-room-name">—</span>
          <span class="k-mob-week-dates-sm" id="k-mob-dates">—</span>
          <span class="k-mob-absent-note" id="k-mob-absent-note" style="display:none;"></span>
        </div>
        <!-- Upload proof button — shown only when it is tenant's turn -->
        <div id="k-ten-act"></div>
      </div>
    </div>

    <!-- Nudge banner — shown when landlord sends a nudge to this room -->
    <div id="k-ten-nudge-banner" style="display:none;flex-shrink:0;padding:8px 14px;background:#FEFCE8;border-bottom:0.5px solid #EAD96B;align-items:center;gap:8px;">
      <span style="font-size:13px;flex-shrink:0;">⚑</span>
      <span id="k-ten-nudge-banner-text" style="flex:1;font-size:11px;color:#78640A;font-weight:400;"></span>
      <button onclick="_kTenMarkNudgeDone()" style="flex-shrink:0;background:#FEF9C3;border:0.5px solid #EAD96B;border-radius:6px;font-size:10px;font-weight:500;color:#78640A;cursor:pointer;padding:4px 10px;font-family:inherit;white-space:nowrap;">✓ Done</button>
      <button onclick="_kTenDismissNudgeBanner()" style="flex-shrink:0;background:none;border:none;font-size:14px;color:#A0860E;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
    </div>

    <!-- Proof wizard overlay — 3-slot single screen -->
    <div id="k-ten-wizard" style="display:none;position:fixed;inset:0;background:var(--cc-bg);z-index:200;flex-direction:column;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:0.5px solid var(--cc-rule);flex-shrink:0;">
        <span style="font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);">Kitchen proof</span>
        <button onclick="_kTenWizCancel()" style="font-size:14px;color:var(--cc-stone);background:none;border:none;cursor:pointer;padding:4px 8px;">✕</button>
      </div>
      <!-- 3 photo slots -->
      <div style="flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px;">
        <p style="font-size:12px;color:var(--cc-taupe);text-align:center;margin:0 0 4px;">Tap each slot to take a photo. Tap again to retake.</p>
        <div id="k-ten-wiz-slots" style="display:flex;gap:10px;"></div>
      </div>
      <!-- Hidden file input — shared, tracks which slot -->
      <input type="file" id="k-ten-wiz-file" accept="image/*" capture="environment" style="display:none;"/>
      <!-- Submit -->
      <div style="padding:16px 20px;border-top:0.5px solid var(--cc-rule);flex-shrink:0;">
        <button id="k-ten-wiz-submit-btn" class="cc-btn" style="width:100%;opacity:0.4;pointer-events:none;" onclick="_kTenWizSubmit()">↑ Submit proof</button>
      </div>
    </div>

    <!-- Chat -->
    <div class="k-mob-chat">
      <div class="k-mob-chat-hdr">
        <span class="k-mob-chat-lbl">Proof &amp; chat</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="k-mob-tlink" onclick="initKitchenMobile()">↺ Refresh</button>
        </div>
      </div>
      <div class="k-mob-feed" id="k-feed-mob"></div>
      <div class="k-mob-compose">
        <input class="k-mob-compose-input" id="k-mob-msg-input" type="text" placeholder="Write to kitchen group…"/>
        <input type="file" id="k-mob-photo-file" accept="image/*" capture="environment" style="display:none;"/>
        <button class="k-mob-camera-btn" id="k-mob-photo-btn" aria-label="Send photo" title="Send photo">
          <i class="ti ti-camera" style="font-size:18px;"></i>
        </button>
      </div>
    </div>

  </div><!-- /#k-mob-wrapper -->

  <!-- History modal -->
  <div class="cc-modal-overlay" id="kitchen-tenant-modal-history" onclick="if(event.target===this)kitchenTenantCloseModal('history')">
    <div class="cc-modal-sheet" style="max-height:70vh;">
      <div class="cc-modal-hdr">
        <span class="cc-modal-title">History</span>
        <button class="cc-modal-close" onclick="kitchenTenantCloseModal('history')">✕</button>
      </div>
      <div class="cc-modal-body" id="k-ten-history-body"><p class="cc-note">Loading…</p></div>
    </div>
  </div>
`;

/* ── MODAL HELPERS ──────────────────────────────────────── */
function kitchenTenantOpenModal(name) {
  document.getElementById('kitchen-tenant-modal-' + name)?.classList.add('open');
  if (name === 'history') _kTenPopulateHistory();
}
function kitchenTenantCloseModal(name) {
  document.getElementById('kitchen-tenant-modal-' + name)?.classList.remove('open');
}

/* ── LOCAL HELPERS (not in shared utils) ────────────────── */
function _kTenRoomInitials(r) {
  const w = r.split(' ');
  return w.length > 1 ? w[0][0] + w[1][0] : r.slice(0, 2).toUpperCase();
}

async function _kTenCompressImage(file, maxPx = 1280, quality = 0.80) {
  return new Promise(resolve => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else        { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(b => resolve(b || file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function _kTenOpenPhoto(url, label) {
  let overlay = document.getElementById('k-ten-photo-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'k-ten-photo-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;cursor:pointer;';
    overlay.innerHTML = '<img id="k-ten-overlay-img" style="max-width:100%;max-height:90%;border-radius:8px;object-fit:contain;"/>'
      + '<p id="k-ten-overlay-lbl" style="color:#fff;font-size:11px;margin-top:10px;opacity:0.6;text-transform:capitalize;"></p>';
    overlay.addEventListener('click', () => { overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
  }
  document.getElementById('k-ten-overlay-img').src = url;
  document.getElementById('k-ten-overlay-lbl').textContent = label || '';
  overlay.style.display = 'flex';
}

/* ── SUPABASE HELPERS (identical to landlord) ───────────── */
async function _kTenGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}
async function _kTenGetComments(weekId) {
  if (!sbL) return [];
  const { data } = await sbL.from('kitchen_comments').select('*').eq('week_id', weekId).order('created_at', { ascending: true });
  return data || [];
}
async function _kTenAddComment(weekId, room, text, isFlag) {
  if (!sbL) return;
  await sbL.from('kitchen_comments').insert({ week_id: weekId, room, text, is_flag: !!isFlag });
}

/* ── ROTATION STATE HELPER (mirrors landlord) ───────────── */
function _kRotState(opts) {
  const { isNow, isPast, dbStatus, room, weekStart, absenceRows } = opts;
  // Absence first — explicit absence overrides vacancy, now, next, missed
  if (absenceRows && weekStart) {
    const wStart = weekStart.toISOString().slice(0, 10);
    const wEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const absent = absenceRows.some(a => a.room === room && a.from_date <= wEnd && a.to_date >= wStart);
    if (absent) return 'absent';
  }
  if (isVacant(room)) return 'skipped';
  if (isNow) {
    if (dbStatus === 'approved') return 'done';
    return 'now';
  }
  if (!isPast) return 'next';
  if (!dbStatus)               return 'none';
  if (dbStatus === 'approved') return 'done';
  if (dbStatus === 'skipped')  return 'skipped';
  if (dbStatus === 'absent')   return 'absent';
  return 'missed';
}

/* ── STATE ──────────────────────────────────────────────── */
let _kTenWeekRow    = null;
let _kTenChannel    = null;
let _kTenMobSending = false;

/* ─────────────────────────────────────────────────────────
   PROOF WIZARD
   Steps: 0 = trash, 1 = geschirr, 2 = overview
   Each step: take photo → preview → Next / Retake
   After step 2: Submit → upload all → post [submission]
   ───────────────────────────────────────────────────────── */
const _kWizSlots = [
  { type: 'trash',    emoji: '🗑️', label: 'Trash',    hint: 'Bin empty & clean' },
  { type: 'geschirr', emoji: '🍽️', label: 'Dishes',   hint: 'Dishes & sink clean' },
  { type: 'overview', emoji: '🏠', label: 'Overview', hint: 'Stovetop, surfaces, floor' },
];
let _kWizBlobs    = [null, null, null];
let _kWizPreviews = [null, null, null];
let _kWizSubmitting = false;
let _kWizActiveSlot = 0; // which slot the file input is for

function _kTenWizOpen() {
  _kWizBlobs      = [null, null, null];
  _kWizPreviews.forEach(u => u && URL.revokeObjectURL(u));
  _kWizPreviews   = [null, null, null];
  _kWizSubmitting = false;
  _kWizActiveSlot = 0;
  _kTenWizRenderSlots();
  document.getElementById('k-ten-wizard').style.display = 'flex';
}

function _kTenWizCancel() {
  document.getElementById('k-ten-wizard').style.display = 'none';
}

function _kTenWizRenderSlots() {
  const container = document.getElementById('k-ten-wiz-slots');
  if (!container) return;
  container.innerHTML = _kWizSlots.map((slot, i) => {
    const hasPhoto = !!_kWizBlobs[i];
    const preview  = _kWizPreviews[i];
    return '<div onclick="_kTenWizTakeSlot(' + i + ')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">'
      + '<div style="width:100%;aspect-ratio:1;border-radius:var(--cc-r-md);overflow:hidden;border:' + (hasPhoto ? '1.5px solid var(--cc-gold)' : '1px dashed var(--cc-rule)') + ';background:var(--cc-surface);display:flex;align-items:center;justify-content:center;position:relative;">'
      + (hasPhoto && preview
          ? '<img src="' + preview + '" style="width:100%;height:100%;object-fit:cover;display:block;" alt="' + slot.label + '"/>'
            + '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);padding:4px 0;text-align:center;font-size:9px;color:#fff;letter-spacing:0.06em;text-transform:uppercase;">↺ retake</div>'
          : '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'
            + '<span style="font-size:28px;">' + slot.emoji + '</span>'
            + '<span style="font-size:9px;font-weight:500;color:var(--cc-taupe);letter-spacing:0.06em;text-transform:uppercase;">tap to add</span>'
            + '</div>')
      + '</div>'
      + '<span style="font-size:11px;font-weight:500;color:var(--cc-ink);">' + slot.label + '</span>'
      + '<span style="font-size:10px;color:var(--cc-taupe);text-align:center;">' + slot.hint + '</span>'
      + '</div>';
  }).join('');

  // Submit button: enabled only when all 3 slots filled
  const allFilled = _kWizBlobs.every(Boolean);
  const btn = document.getElementById('k-ten-wiz-submit-btn');
  if (btn) {
    btn.style.opacity       = allFilled ? '1'    : '0.4';
    btn.style.pointerEvents = allFilled ? 'auto' : 'none';
    btn.style.background    = allFilled ? 'var(--cc-ink)' : '';
    btn.style.color         = allFilled ? 'var(--cc-white)' : '';
    btn.textContent         = _kWizSubmitting ? 'Uploading…' : '↑ Submit proof';
  }
}

function _kTenWizTakeSlot(slotIndex) {
  if (_kWizSubmitting) return;
  _kWizActiveSlot = slotIndex;
  const file = document.getElementById('k-ten-wiz-file');
  file.value = '';
  file.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const blob     = await _kTenCompressImage(f);
    const localUrl = URL.createObjectURL(blob);
    if (_kWizPreviews[_kWizActiveSlot]) URL.revokeObjectURL(_kWizPreviews[_kWizActiveSlot]);
    _kWizBlobs[_kWizActiveSlot]    = blob;
    _kWizPreviews[_kWizActiveSlot] = localUrl;
    _kTenWizRenderSlots();
  };
  file.click();
}

async function _kTenWizSubmit() {
  if (_kWizSubmitting) return;
  if (!sbL || !_kTenWeekRow) { alert('No connection. Please refresh.'); return; }

  const room = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  _kWizSubmitting = true;

  const submitBtn = document.getElementById('k-ten-wiz-submit-btn');
  if (submitBtn) { submitBtn.textContent = 'Uploading 1/3…'; submitBtn.style.pointerEvents = 'none'; }

  try {
    const idx      = kWeekIdx();
    const uploaded = [];
    const total    = _kWizSlots.length;
    let   done     = 0;

    for (let i = 0; i < _kWizSlots.length; i++) {
      const blob = _kWizBlobs[i];
      if (!blob) continue;
      const type = _kWizSlots[i].type;
      const path = 'week-' + idx + '-' + room + '-' + type + '-' + Date.now() + '.jpg';
      if (submitBtn) submitBtn.textContent = 'Uploading ' + (done + 1) + '/' + total + '…';

      // Wrap upload in a 30s timeout so it never hangs indefinitely
      const uploadResult = await Promise.race([
        sbL.storage.from('kitchen-proofs').upload(path, blob, { upsert: true, contentType: 'image/jpeg' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000))
      ]);

      if (uploadResult.error) {
        console.error('Upload error ' + type, uploadResult.error);
        _kWizSubmitting = false;
        _kTenWizRenderSlots();
        alert('Photo ' + (done + 1) + ' failed to upload — please try again.');
        return;
      }

      const { data } = sbL.storage.from('kitchen-proofs').getPublicUrl(path);
      uploaded.push({ type, path, url: data.publicUrl });
      done++;
    }

    if (!uploaded.length) {
      alert('Upload failed — please try again.');
      _kWizSubmitting = false;
      _kTenWizRenderSlots();
      return;
    }

    const isReupload = _kTenWeekRow.status === 'flagged';
    const patch = {
      status:       'submitted',
      submitted_at: new Date().toISOString(),
    };
    if (isReupload) {
      // Re-upload: keep original photos column intact — new photos go in the comment only
      patch.reupload_count = (_kTenWeekRow.reupload_count || 0) + 1;
      patch.flagged        = false;
    } else {
      // First upload: write photos to the row
      patch.photos = uploaded;
    }
    await sbL.from('kitchen_weeks').update(patch).eq('week_index', idx);

    // Post [submission] comment — this is what the feed renderer reads on both sides
    const commentPayload = JSON.stringify({ photos: uploaded, isReupload });
    await _kTenAddComment(_kTenWeekRow.id, room, '[submission] ' + commentPayload, false);

    // Close wizard
    document.getElementById('k-ten-wizard').style.display = 'none';
    _kWizSubmitting = false;

    // Patch local state and render immediately from it — no re-fetch.
    // Avoids the race where a fresh DB fetch returns the old row before the write propagates.
    // Realtime subscription fires ~100–800ms later and does the authoritative re-sync.
    _kTenWeekRow = { ..._kTenWeekRow, ...patch };
    await _kTenRenderWeekCard(_kTenWeekRow);
    await _kTenRenderFeed();

  } catch (err) {
    console.error('Proof submit error', err);
    alert('Error submitting — please try again.');
    _kWizSubmitting = false;
    _kTenWizRenderSlots();
  }
}

/* ── ACTION BUTTON (upload proof / re-upload) ───────────── */
// Called from _kTenRenderWeekCard with state+freshRow already derived — no extra fetch.
function _kTenRenderActBtnFromState(state, freshRow) {
  const el = document.getElementById('k-ten-act'); if (!el) return;
  if (state !== 'now') { el.innerHTML = ''; return; }
  const dbStatus = freshRow ? freshRow.status : null;
  if (dbStatus === 'flagged') {
    // Landlord flagged — tenant must re-upload
    el.innerHTML = `<button class="k-mob-wact red" onclick="_kTenWizOpen()" aria-label="Re-upload proof">
      <i class="ti ti-camera-plus"></i><span>Re-upload</span></button>`;
  } else if (!dbStatus || dbStatus === 'pending') {
    // No row yet or explicitly pending — first upload
    el.innerHTML = `<button class="k-mob-wact blue" onclick="_kTenWizOpen()" aria-label="Upload proof">
      <i class="ti ti-camera-plus"></i><span>Proof</span></button>`;
  } else {
    // submitted, approved, missed — no button needed
    el.innerHTML = '';
  }
}

/* ── WEEK CARD ──────────────────────────────────────────── */
async function _kTenRenderWeekCard(overrideRow) {
  const wi = _kTenWeekInfo(kWeekIdx()); if (!wi) return;
  const myRoom = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const isAssigned = wi.room === myRoom;

  document.getElementById('k-mob-room-name').textContent = wi.room;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  document.getElementById('k-mob-dates').textContent =
    fmt(wi.start) + ' – ' + fmt(wi.end) + (isAssigned && wi.daysLeft > 0 ? ' · ' + wi.daysLeft + 'd left' : isAssigned ? ' · ends today' : '');

  // If caller passes overrideRow (e.g. after optimistic patch), use it directly — no DB fetch.
  // Otherwise fetch fresh from Supabase as normal.
  let state = null;
  let freshRow = null;
  if (isAssigned) {
    const idx = kWeekIdx();
    let row, absRes;
    if (overrideRow) {
      [row, absRes] = await Promise.all([
        Promise.resolve(overrideRow),
        sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
      ]);
    } else {
      [row, absRes] = await Promise.all([
        _kTenGetWeek(idx),
        sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
      ]);
    }
    freshRow = row;
    state = _kRotState({
      isNow:       true,
      isPast:      false,
      dbStatus:    freshRow ? freshRow.status : null,
      room:        wi.room,
      weekStart:   wi.start,
      absenceRows: absRes,
    });
  }

  // Chip
  const chip = document.getElementById('k-mob-status-chip');
  if (chip) {
    if (!isAssigned) {
      chip.className   = 'k-mob-status-chip not-your-turn';
      chip.textContent = '— Not your turn';
    } else {
      const isResub = state === 'now' && freshRow && freshRow.reupload_count > 0;
      const chipMap = {
        now:     'pending',
        done:    'approved',
        missed:  'missed',
        flagged: 'flagged',
        absent:  'skipped',
        skipped: 'skipped',
        next:    'pending',
      };
      const dbStatus = freshRow ? freshRow.status : null;
      const chipCls = isResub         ? 'resubmitted'
                    : state === 'done'    ? 'approved'
                    : state === 'missed'  ? 'missed'
                    : state === 'absent'  ? 'skipped'
                    : state === 'skipped' ? 'skipped'
                    : dbStatus === 'flagged'   ? 'flagged'
                    : dbStatus === 'submitted' ? 'submitted'
                    : 'pending';
      chip.className   = 'k-mob-status-chip ' + chipCls;
      chip.textContent = state !== 'now'
        ? ({ done:'✓ Approved', missed:'✗ Missed', absent:'— Away', skipped:'— Skipped' }[state] || 'Pending')
        : isResub                      ? '↑↑ Re-submitted'
        : dbStatus === 'submitted'     ? '↑ Submitted'
        : dbStatus === 'flagged'       ? '⚑ Redo'
        : 'Pending';
    }
  }

  // Action button — same fetch, same state
  const actEl = document.getElementById('k-ten-act');
  if (actEl) {
    if (!isAssigned) {
      actEl.innerHTML = '';
    } else {
      _kTenRenderActBtnFromState(state, freshRow);
    }
  }

  const absNote = document.getElementById('k-mob-absent-note');
  if (absNote) {
    if (freshRow && freshRow.is_absent) { absNote.textContent = '📅 ' + wi.room + ' is absent — no proof required'; absNote.style.display = ''; }
    else { absNote.style.display = 'none'; }
  }
}

/* ── ROTATION STRIP ─────────────────────────────────────── */
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

function _kTenWeekInfo(idx) {
  if (idx < 0) return null;
  const rot   = _kTenGetRoomList();
  if (!rot.length) return kWeekInfo(idx);
  const room  = rot[idx % rot.length];
  const start = new Date(K_START.getTime() + idx * 7 * 24 * 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);
  const daysLeft = Math.max(0, Math.ceil((end - new Date()) / (24 * 60 * 60 * 1000)));
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  return { room, start, end, daysLeft, i: idx, dateRange: fmt(start) + ' – ' + fmt(end) };
}

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

  const items = rooms.map((room, i) => {
    const slotIdx = cycleStart + i;
    const info    = kWeekInfo(Math.max(0, slotIdx));
    const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
    const dbRow   = dbRows[i];
    const state   = _kRotState({
      isNow:       i === cyclePos,
      isPast:      i < cyclePos,
      dbStatus:    dbRow ? dbRow.status : null,
      room,
      weekStart:   info ? info.start : null,
      absenceRows: absData,
    });
    const badgeText = { done:'✓', missed:'✗', skipped:'—', absent:'away', now:'Now', none:'—' }[state] || 'Next';
    return `<div class="k-mob-rot-item ${state}"><span class="k-mob-rot-badge ${state}">${badgeText}</span><span class="k-mob-rot-room">${esc(room)}</span><span class="k-mob-rot-dates">${dateStr}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="k-mob-rot-line"></div><div class="k-mob-rot-line-done" style="width:${greenPct}"></div><div class="k-mob-rot-items">${items}</div>`;
}

/* ── FEED RENDERER (identical to landlord, no delete buttons) */
function _kTenBuildFeedHtml(comments, weekRow) {
  const labels = { trash: 'Trash', geschirr: 'Geschirr', overview: 'Kitchen' };
  const lbl    = t => labels[t] || t;
  const events = [];

  const hasSub = comments.some(c => c.text && c.text.startsWith('[submission] '));
  if (!hasSub && weekRow.submitted_at) {
    let photos = weekRow.photos || [];
    if (!photos.length && weekRow.photo_url) photos = [{ url: weekRow.photo_url, type: 'overview' }];
    events.push({ _type:'submission', _ts:new Date(weekRow.submitted_at).getTime(), room:weekRow.room, photos, isReupload:false });
  }
  comments.forEach(c => {
    if (c.text && c.text.startsWith('[submission] ')) {
      try {
        const p = JSON.parse(c.text.slice(13));
        events.push({ _type:'submission', _ts:new Date(c.created_at).getTime(), room:c.room, photos:p.photos||[], isReupload:!!p.isReupload });
      } catch(e) {}
    } else {
      events.push({ _type:'comment', _ts:new Date(c.created_at).getTime(), ...c });
    }
  });
  events.sort((a, b) => a._ts - b._ts);

  if (!events.length) return '<p class="cc-note" style="padding:8px 0;">No activity yet this week.</p>';

  let flagSeen = false;
  return events.map(ev => {

    if (ev._type === 'submission') {
      const isRe = flagSeen; flagSeen = false;
      const photoStrip = ev.photos && ev.photos.length
        ? '<div class="k-chat-photos" style="margin-top:8px;">'
          + ev.photos.filter(p => p.url).map(p =>
              `<div class="k-chat-photo-thumb" onclick="_kTenOpenPhoto('${p.url}','${lbl(p.type)}')">`
              + `<img src="${p.url}" alt="${p.type}" onerror="this.style.display='none'"/>`
              + `<span>${lbl(p.type)}</span></div>`
            ).join('') + '</div>'
        : '';
      const badge = isRe
        ? '<span class="k-reupload-badge">↑ Re-uploaded</span>'
        : '<span style="font-size:9px;font-weight:500;background:#EDF5E8;color:#3A6A1A;border:0.5px solid #9AC87A;border-radius:3px;padding:1px 5px;">↑ Submitted</span>';
      return `<div style="padding:8px 0;border-bottom:0.5px solid var(--cc-rule);">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:11px;font-weight:500;color:var(--cc-ink);background:var(--cc-surface);border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-pill);padding:2px 9px;">${esc(ev.room)}</span>
          ${badge}<span style="font-size:10px;color:var(--cc-stone);">${fmtTs(ev._ts)}</span>
        </div>${photoStrip}</div>`;
    }

    if (ev.is_flag) {
      flagSeen = true;
      return `<div class="k-sys-event"><div class="k-sys-event__line"></div>
        <span class="k-sys-event__text k-sys-event__text--flag">⚑ Re-upload requested · ${fmtTs(ev._ts)}</span>
        <div class="k-sys-event__line"></div></div>`;
    }

    const isSysApproved = ev.text && (ev.text.startsWith('✓ Approved') || ev.text.startsWith('↩ Approval'));
    if (isSysApproved) {
      const isApproved = ev.text.startsWith('✓ Approved');
      return `<div class="k-sys-event"><div class="k-sys-event__line"></div>
        <span class="k-sys-event__text${isApproved ? ' k-sys-event__text--approved' : ''}">
          ${isApproved ? '✓ Approved' : '↩ Approval undone'} · ${fmtTs(ev._ts)}
        </span><div class="k-sys-event__line"></div></div>`;
    }

    if (ev.text && ev.text.startsWith('✓ ') && !ev.text.startsWith('✓ Approved') && !ev.text.startsWith('✓ Approval')) {
      return `<div class="k-sys-event"><div class="k-sys-event__line"></div>
        <span class="k-sys-event__text k-sys-event__text--done">${esc(ev.text)} · ${fmtTs(ev._ts)}</span>
        <div class="k-sys-event__line"></div></div>`;
    }

    if (ev.text && ev.text.startsWith('[photo] ')) {
      const pUrl = ev.text.slice(8).trim();
      const isCC = ev.room === 'Casa Castel';
      return `<div class="k-chat-row">
        <div class="k-chat-avatar${isCC?' k-chat-avatar--me':''}" ${isCC?'style="background:var(--cc-ink);color:var(--cc-white);"':''}>${_kTenRoomInitials(ev.room)}</div>
        <div style="flex:1;min-width:0;"><div class="k-chat-meta">
          <span class="k-chat-name"${isCC?' style="color:var(--cc-gold);"':''}>${esc(ev.room)}</span>
          <span class="k-chat-time">${fmtTs(ev._ts)}</span></div>
          <div style="margin-top:5px;"><img src="${pUrl}" alt="photo"
            style="max-width:100%;border-radius:6px;display:block;object-fit:contain;cursor:pointer;"
            onclick="_kTenOpenPhoto(this.src,'Photo')" onerror="this.style.display='none'"/></div>
        </div></div>`;
    }

    const isCC = ev.room === 'Casa Castel';
    return `<div class="k-chat-row">
      <div class="k-chat-avatar${isCC?' k-chat-avatar--me':''}" ${isCC?'style="background:var(--cc-ink);color:var(--cc-white);"':''}>${_kTenRoomInitials(ev.room)}</div>
      <div style="flex:1;min-width:0;"><div class="k-chat-meta">
        <span class="k-chat-name"${isCC?' style="color:var(--cc-gold);"':''}>${esc(ev.room)}</span>
        <span class="k-chat-time">${fmtTs(ev._ts)}</span></div>
        <p class="k-chat-text">${esc(ev.text)}</p>
      </div></div>`;

  }).join('');
}

async function _kTenRenderFeed() {
  const el  = document.getElementById('k-feed-mob'); if (!el) return;
  const row = _kTenWeekRow;
  if (!row)                    { el.innerHTML = '<p class="cc-note" style="padding:8px 0;">No data.</p>'; return; }
  if (row.status === 'missed') { el.innerHTML = '<p class="cc-note" style="padding:8px 0;">Week reset — marked as missed.</p>'; return; }
  const comments = await _kTenGetComments(row.id);
  el.innerHTML = _kTenBuildFeedHtml(comments, row);
  scrollToBottom(el);
}

/* ── HISTORY MODAL ──────────────────────────────────────── */
async function _kTenPopulateHistory() {
  const el = document.getElementById('k-ten-history-body');
  if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const idx = kWeekIdx();
  const { data } = await sbL.from('kitchen_weeks').select('*').lte('week_index', idx).order('week_index', { ascending: false }).limit(12);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">No past weeks yet.</p>'; return; }
  const base = 'font-size:10px;padding:2px 9px;border-radius:20px;font-weight:500;white-space:nowrap;border:0.5px solid;display:inline-block;';
  const pill = s => {
    if (s === 'approved') return `<span style="${base}background:#EDF5E8;color:#3A6A1A;border-color:#9AC87A;">✓ Approved</span>`;
    if (s === 'missed')   return `<span style="${base}background:#FEF2F2;color:#991B1B;border-color:#FCA5A5;">✗ Missed</span>`;
    if (s === 'skipped')  return `<span style="${base}background:#F5F3FF;color:#5B21B6;border-color:#C4B5FD;">Skipped</span>`;
    if (s === 'absent')   return `<span style="${base}background:#F5EEE8;color:#8C5A30;border-color:#D4A87A;">Away</span>`;
    return `<span style="${base}background:var(--cc-surface);color:var(--cc-stone);border-color:var(--cc-rule);">—</span>`;
  };
  el.innerHTML = data.map(w => {
    const wi = kWeekInfo(w.week_index); const dateStr = wi ? wi.dateRange : '—';
    const c  = w.comment_count ? ` · ${w.comment_count} comment${w.comment_count !== 1 ? 's' : ''}` : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:0.5px solid var(--cc-rule);">
      <div><p style="font-size:13px;font-weight:500;color:var(--cc-ink);">${esc(w.room)}</p>
      <p style="font-size:11px;color:var(--cc-taupe);">${dateStr}${c}</p></div>
      ${pill(w.status)}</div>`;
  }).join('');
}

/* ── SEND — text (identical to landlord, room = currentRoom) */
async function _kTenMobSendMsg() {
  const inp  = document.getElementById('k-mob-msg-input');
  const text = inp.value.trim();
  if (!text || !_kTenWeekRow || _kTenMobSending) return;
  _kTenMobSending = true; inp.value = '';
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const feed = document.getElementById('k-feed-mob');
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-mob-optimistic';
    tmp.innerHTML = `<div class="k-chat-avatar">${_kTenRoomInitials(room)}</div>`
      + `<div style="flex:1;min-width:0;"><div class="k-chat-meta">`
      + `<span class="k-chat-name">${esc(room)}</span>`
      + `<span class="k-chat-time" style="opacity:0.5;">sending…</span></div>`
      + `<p class="k-chat-text">${esc(text)}</p></div>`;
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  _kTenAddComment(_kTenWeekRow.id, room, text, false)
    .finally(() => { _kTenMobSending = false; });
}

/* ── SEND — camera photo in chat ────────────────────────── */
async function _kTenSendPhoto(file, feedId) {
  if (!file || !_kTenWeekRow) { alert('No active week.'); return; }
  if (file.size > 30 * 1024 * 1024) { alert('Max 30MB.'); return; }
  const room       = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const compressed = await _kTenCompressImage(file);
  const feed       = document.getElementById(feedId);
  const localUrl   = URL.createObjectURL(compressed);
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-ten-photo-optimistic';
    tmp.innerHTML = `<div class="k-chat-avatar">${_kTenRoomInitials(room)}</div>`
      + `<div style="flex:1;min-width:0;"><div class="k-chat-meta">`
      + `<span class="k-chat-name">${esc(room)}</span>`
      + `<span class="k-chat-time" style="opacity:0.5;">uploading…</span></div>`
      + `<div style="margin-top:5px;"><img src="${localUrl}" style="max-width:100%;border-radius:6px;object-fit:contain;opacity:0.7;"/></div></div>`;
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  const idx  = kWeekIdx();
  const path = 'week-' + idx + '-' + room + '-chat-' + Date.now() + '.jpg';
  const { error } = await sbL.storage.from('kitchen-proofs').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
  document.getElementById('k-ten-photo-optimistic')?.remove();
  if (error) { console.error('Chat photo upload', error); alert('Upload failed.'); return; }
  const { data } = sbL.storage.from('kitchen-proofs').getPublicUrl(path);
  await _kTenAddComment(_kTenWeekRow.id, room, '[photo] ' + data.publicUrl, false);
}

/* ── REALTIME ───────────────────────────────────────────── */
function _kTenSubscribe(idx) {
  if (_kTenChannel) { sbL.removeChannel(_kTenChannel); _kTenChannel = null; }
  _kTenChannel = sbL.channel('kitchen-tenant-rt')
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'kitchen_weeks' }, async payload => {
      if (!_kTenWeekRow) return;
      const fresh = await _kTenGetWeek(idx);
      if (!fresh) return;
      _kTenWeekRow = fresh;

      await _kTenRenderWeekCard();
      await _kTenRenderFeed();
      await _kTenRenderMobRotation();
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'kitchen_comments' }, async payload => {
      if (!payload.new || !_kTenWeekRow) return;
      if (payload.new.week_id && payload.new.week_id !== _kTenWeekRow.id) return;
      document.getElementById('k-mob-optimistic')?.remove();
      await _kTenRenderFeed();
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'lounge_data' }, async payload => {
      const t = payload.new?.type || payload.old?.type;
      const isDelete = payload.eventType === 'DELETE' || (!payload.new?.id && payload.old?.id);
      if (t === 'kitchen_config' && payload.new?.body) { _applyKitchenConfig(payload.new.body); await _kTenRenderWeekCard(); await _kTenRenderMobRotation(); }
      if (t === 'kitchen_nudge' || isDelete) { await _kTenLoadNudgeBanner(); }
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'kitchen_absences' }, async () => {
      await _kTenRenderMobRotation();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, async () => {
      if (typeof loadRoomsData === 'function') await loadRoomsData();
      await _kTenRenderWeekCard();
      await _kTenRenderMobRotation();
    })
    .subscribe();
}

/* ── MAIN INIT ──────────────────────────────────────────── */
async function initKitchenMobile() {
  if (typeof loadRoomsData === 'function') await loadRoomsData();
  await loadKitchenRoomsFromSupabase();

  await _kTenRenderWeekCard();

  const idx  = kWeekIdx(new Date());
  const info = _kTenWeekInfo(Math.max(0, idx));
  if (!sbL) { await _kTenRenderMobRotation(); return; }

  const [, weekRowFresh] = await Promise.all([
    _kTenRenderMobRotation(),
    _kTenGetWeek(idx)
  ]);

  let weekRow = weekRowFresh;
  if (!weekRow) {
    const { data } = await sbL.from('kitchen_weeks')
      .insert({ week_index: idx, room: info.room, status: 'pending' })
      .select().single();
    weekRow = data || (await _kTenGetWeek(idx));
  }
  _kTenWeekRow = weekRow;

  await _kTenRenderWeekCard();
  await _kTenRenderFeed();
  await _kTenLoadNudgeBanner();
  _kTenSubscribe(idx);
}

/* ── NUDGE BANNER ───────────────────────────────────────── */
async function _kTenLoadNudgeBanner() {
  if (!sbL || _kTenNudgeBusy) return;
  const myRoom = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type', 'kitchen_nudge')
    .order('created_at', { ascending: false })
    .limit(5);
  const banner = document.getElementById('k-ten-nudge-banner');
  const text   = document.getElementById('k-ten-nudge-banner-text');
  if (!banner || !text) return;
  // Find nudge for this room or all — skip if this room already acked it
  const nudge = (data || []).find(n => {
    if (n.room !== myRoom && n.room !== 'All') return false;
    const acked = Array.isArray(n.dismissed_by) ? n.dismissed_by : [];
    return !acked.includes(myRoom);
  });
  if (!nudge) { banner.style.display = 'none'; return; }
  const note = nudge.title ? ` · ${nudge.title}` : '';
  text.textContent = `${nudge.body}${note}`;
  banner.dataset.nudgeBody = nudge.body;
  banner.dataset.nudgeId   = nudge.id;
  banner.dataset.nudgeRoom = nudge.room;
  banner.style.display = 'flex';
}
let _kTenNudgeBusy = false;
async function _kTenMarkNudgeDone() {
  if (_kTenNudgeBusy) return; _kTenNudgeBusy = true;
  try {
    const myRoom = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
    const banner    = document.getElementById('k-ten-nudge-banner');
    const nudgeBody = banner?.dataset.nudgeBody || '';
    const nudgeId   = banner?.dataset.nudgeId   || '';
    const resolvedMap = {
      'Trash not taken out': 'Trash taken out',
      'Dishes not clean':    'Dishes cleaned',
      'Fridge not clean':    'Fridge cleaned',
    };
    const resolved = resolvedMap[nudgeBody] || (nudgeBody || 'Done');
    // Hide banner immediately
    if (banner) {
      banner.style.display = 'none';
      banner.dataset.nudgeId = '';
      banner.dataset.nudgeRoom = '';
      banner.dataset.nudgeBody = '';
    }
    // Post system message to feed
    if (sbL && _kTenWeekRow && nudgeBody) {
      await _kTenAddComment(_kTenWeekRow.id, myRoom, `✓ ${myRoom} — ${resolved} · done`, false);
      await _kTenRenderFeed();
    }
    // Always delete the nudge — first person to tap Done resolves it for everyone
    if (sbL && nudgeId) {
      await sbL.from('lounge_data').delete().eq('id', nudgeId);
    }
  } finally { _kTenNudgeBusy = false; }
}
async function _kTenDismissNudgeBanner() {
  // ✕ dismiss — hides locally for this room only via dismissed_by, nudge stays for others
  if (_kTenNudgeBusy) return; _kTenNudgeBusy = true;
  try {
    const myRoom    = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
    const banner    = document.getElementById('k-ten-nudge-banner');
    const nudgeId   = banner?.dataset.nudgeId  || '';
    const nudgeRoom = banner?.dataset.nudgeRoom || '';
    if (banner) {
      banner.style.display = 'none';
      banner.dataset.nudgeId = '';
      banner.dataset.nudgeRoom = '';
      banner.dataset.nudgeBody = '';
    }
    if (sbL && nudgeId) {
      if (nudgeRoom !== 'All') {
        // Specific room nudge — delete entirely on dismiss too
        await sbL.from('lounge_data').delete().eq('id', nudgeId);
      } else {
        // All-rooms nudge — add to dismissed_by so it doesn't reappear for this room
        const { data: fresh } = await sbL.from('lounge_data').select('dismissed_by').eq('id', nudgeId).maybeSingle();
        const existing = Array.isArray(fresh?.dismissed_by) ? fresh.dismissed_by : [];
        if (!existing.includes(myRoom)) {
          await sbL.from('lounge_data').update({ dismissed_by: [...existing, myRoom] }).eq('id', nudgeId);
        }
      }
    }
  } finally { _kTenNudgeBusy = false; }
}

/* ── WIRE COMPOSE (identical to landlord) ───────────────── */
(function _kTenWireMobSend() {
  const mobInput  = document.getElementById('k-mob-msg-input');
  const mobPhoto  = document.getElementById('k-mob-photo-btn');
  const mobFile   = document.getElementById('k-mob-photo-file');

  mobInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _kTenMobSendMsg(); } });

  mobPhoto?.addEventListener('click', () => mobFile?.click());
  mobFile?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    mobFile.value = ''; mobPhoto.style.opacity = '0.5';
    await _kTenSendPhoto(file, 'k-feed-mob');
    mobPhoto.style.opacity = '';
  });

  wireComposeBlur(mobInput);
})();

/* ── SHOW KITCHEN TAB IN NAV ────────────────────────────── */
function _kTenShowTabIfEligible() {
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : null)
             || localStorage.getItem('cc_room');
  if (!room) return;
  // Show kitchen tab if room is in kitchen_config (lounge_data) OR has kitchen_enabled in rooms table
  const inKitchenConfig = getKitchenRooms().includes(room);
  const inRoomsTable    = typeof appRooms !== 'undefined'
    && !!appRooms.find(r => r.name === room)?.kitchen_enabled;
  if (inKitchenConfig || inRoomsTable) {
    document.getElementById('kitchenTab')?.style.removeProperty('display');
  }
}
// Load kitchen config from Supabase into kitchenRooms[] memory, then show tab if eligible.
// getKitchenRooms() now reads kitchenRooms[] — no localStorage fallback.
(async function _kTenEnsureTabVisible() {
  await loadKitchenRoomsFromSupabase();
  _kTenShowTabIfEligible();
})();

/* ── NAV ALIAS ──────────────────────────────────────────── */
var initKitchenMobExtend = initKitchenMobile;
