/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v3 — TENANT KITCHEN TAB
   js/tab-kitchen-tenant.js

   Architecture: one loadKitchenTenant() function, called on
   init and by every realtime event. No mobile/desktop split.
   Pattern mirrors tab-cleaning-tenant.js exactly.

   PWA KEYBOARD FIX — same three layers as landlord file.
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-kitchen').innerHTML = `

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
        </div>
        <div id="k-ten-act"></div>
      </div>
    </div>

    <!-- Nudge banner -->
    <div id="k-ten-nudge-banner" style="display:none;flex-shrink:0;padding:8px 14px;background:#FEFCE8;border-bottom:0.5px solid #EAD96B;align-items:center;gap:8px;">
      <span style="font-size:13px;flex-shrink:0;">⚑</span>
      <span id="k-ten-nudge-banner-text" style="flex:1;font-size:11px;color:#78640A;font-weight:400;"></span>
      <button onclick="_kTenMarkNudgeDone()" style="flex-shrink:0;background:#FEF9C3;border:0.5px solid #EAD96B;border-radius:6px;font-size:10px;font-weight:500;color:#78640A;cursor:pointer;padding:4px 10px;font-family:inherit;white-space:nowrap;">✓ Done</button>
      <button onclick="_kTenDismissNudgeBanner()" style="flex-shrink:0;background:none;border:none;font-size:14px;color:#A0860E;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
    </div>

    <!-- Proof & chat -->
    <div class="k-mob-chat">
      <div class="k-mob-chat-hdr">
        <span class="k-mob-chat-lbl">Proof &amp; chat</span>
        <button class="k-mob-tlink" onclick="loadKitchenTenant()">↺ Refresh</button>
      </div>
      <div class="k-mob-feed" id="k-feed-mob"></div>
      <div class="k-mob-compose">
        <input class="k-mob-compose-input" id="k-mob-msg-input" type="text" placeholder="Write to kitchen group…"/>
        <input type="file" id="k-mob-photo-file" accept="image/*" capture="environment" style="display:none;"/>
        <button class="k-mob-camera-btn" id="k-mob-photo-btn" aria-label="Send photo">
          <i class="ti ti-camera" style="font-size:18px;"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════
       TENANT DESKTOP GRID — hidden on mobile, shown ≥701px
       Same data as mobile — rendered by same functions.
       ═══════════════════════════════════════════════════════ -->
  <div class="k-desktop-grid">

    <!-- Left column: week card + rotation -->
    <div class="k-desktop-left">

      <!-- This week -->
      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr">
          <span class="k-dsk-section-lbl">This week</span>
          <span class="k-mob-status-chip pending" id="k-dsk-status-chip"></span>
        </div>
        <div class="k-mob-week-body" style="margin-top:0;">
          <div class="k-mob-week-left">
            <span class="k-mob-week-room" id="k-dsk-room-name">—</span>
            <span class="k-mob-week-dates-sm" id="k-dsk-dates">—</span>
          </div>
          <div id="k-dsk-ten-act"></div>
        </div>
      </div>

      <!-- Rotation list -->
      <div class="k-dsk-section" style="border-bottom:none;">
        <div class="k-dsk-section-hdr">
          <span class="k-dsk-section-lbl">Rotation</span>
          <button class="k-dsk-section-link" onclick="kitchenTenantOpenModal('history')">history ›</button>
        </div>
        <div id="k-dsk-rot-list"></div>
      </div>

    </div><!-- /.k-desktop-left -->

    <!-- Right column: nudge banner + feed + compose -->
    <div class="k-desktop-right">

      <div class="k-dsk-chat-hdr">
        <span class="k-dsk-chat-lbl">Proof &amp; chat</span>
        <button class="k-dsk-chat-link" onclick="loadKitchenTenant()">↺ Refresh</button>
      </div>

      <!-- Nudge banner (desktop) -->
      <div id="k-dsk-ten-nudge-banner" style="display:none;flex-shrink:0;padding:7px 14px;background:#FEFCE8;border-bottom:0.5px solid #EAD96B;align-items:center;gap:8px;">
        <span style="font-size:12px;flex-shrink:0;">⚑</span>
        <span id="k-dsk-ten-nudge-banner-text" style="flex:1;font-size:11px;color:#78640A;font-weight:400;"></span>
        <button onclick="_kTenMarkNudgeDoneDsk()" style="flex-shrink:0;background:#FEF9C3;border:0.5px solid #EAD96B;border-radius:6px;font-size:10px;font-weight:500;color:#78640A;cursor:pointer;padding:4px 10px;font-family:inherit;white-space:nowrap;">✓ Done</button>
        <button onclick="_kTenDismissNudgeBannerDsk()" style="flex-shrink:0;background:none;border:none;font-size:14px;color:#A0860E;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
      </div>

      <!-- Feed -->
      <div class="k-dsk-feed" id="k-feed-dsk"></div>

      <!-- Compose bar -->
      <div class="k-mob-compose" style="padding-bottom:10px!important;">
        <input class="k-mob-compose-input" id="k-dsk-msg-input" type="text" placeholder="Write to kitchen group…"/>
        <input type="file" id="k-dsk-photo-file" accept="image/*" style="display:none;"/>
        <button class="k-mob-camera-btn" id="k-dsk-photo-btn" aria-label="Send photo">
          <i class="ti ti-camera" style="font-size:18px;"></i>
        </button>
      </div>

    </div><!-- /.k-desktop-right -->

  </div><!-- /.k-desktop-grid -->

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

/* ── PROOF WIZARD (injected into body to escape overflow:hidden) */
(function() {
  const wiz = document.createElement('div');
  wiz.id = 'k-ten-wizard';
  wiz.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;flex-direction:column;align-items:center;justify-content:center;padding:0;';
  wiz.innerHTML = `
    <div style="background:var(--cc-bg);display:flex;flex-direction:column;width:100%;height:100%;max-width:480px;max-height:100%;border-radius:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:0.5px solid var(--cc-rule);flex-shrink:0;">
        <span style="font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);">Kitchen proof</span>
        <button onclick="_kTenWizCancel()" style="font-size:14px;color:var(--cc-stone);background:none;border:none;cursor:pointer;padding:4px 8px;">✕</button>
      </div>
      <div id="k-ten-wiz-dots" style="display:flex;gap:6px;justify-content:center;padding:12px 0 4px;flex-shrink:0;"></div>
      <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;">
        <div id="k-ten-wiz-slide"></div>
      </div>
      <input type="file" id="k-ten-wiz-file" accept="image/*" style="display:none;"/>
      <div style="padding:16px 20px;padding-bottom:max(16px,env(safe-area-inset-bottom,16px));border-top:0.5px solid var(--cc-rule);flex-shrink:0;display:flex;gap:10px;">
        <button id="k-ten-wiz-back-btn" onclick="_kTenWizBack()" style="height:44px;padding:0 18px;background:none;border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);color:var(--cc-taupe);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">← Back</button>
        <button id="k-ten-wiz-next-btn" onclick="_kTenWizNext()" style="flex:1;height:44px;background:var(--cc-ink);border:none;border-radius:var(--cc-r-sm);color:var(--cc-white);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;opacity:0.4;pointer-events:none;">Next →</button>
      </div>
    </div>`;
  document.body.appendChild(wiz);
})();

/* ── MODAL HELPERS ──────────────────────────────────────── */
function kitchenTenantOpenModal(name) {
  document.getElementById('kitchen-tenant-modal-' + name)?.classList.add('open');
  if (name === 'history') _kTenPopulateHistory();
}
function kitchenTenantCloseModal(name) {
  document.getElementById('kitchen-tenant-modal-' + name)?.classList.remove('open');
}

/* ── SUPABASE HELPERS ───────────────────────────────────── */
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

/* ── ROOM LIST + WEEK INFO ──────────────────────────────── */
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

/* ── ROTATION STATE ─────────────────────────────────────── */
function _kRotState(opts) {
  const { isNow, isPast, isNext, dbStatus, room, weekStart, absenceRows } = opts;
  if (absenceRows && weekStart) {
    const wStart = weekStart.toISOString().slice(0, 10);
    const wEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (absenceRows.some(a => a.room === room && a.from_date <= wEnd && a.to_date >= wStart)) return 'absent';
  }
  if (isVacant(room)) return 'skipped';
  if (isNow) { if (dbStatus === 'approved') return 'done'; return 'now'; }
  if (!isPast) return isNext ? 'next' : 'upcoming';
  if (!dbStatus)               return 'none';
  if (dbStatus === 'approved') return 'done';
  if (dbStatus === 'skipped')  return 'skipped';
  if (dbStatus === 'absent')   return 'absent';
  return 'missed';
}

/* ── PROOF WIZARD ───────────────────────────────────────── */
const _kWizSlots = [
  { type:'trash',    emoji:'🗑️', label:'Trash',    hint:'Bin empty & clean' },
  { type:'geschirr', emoji:'🍽️', label:'Dishes',   hint:'Dishes & sink clean' },
  { type:'overview', emoji:'🏠', label:'Overview', hint:'Stovetop, surfaces, floor' },
];
let _kWizBlobs      = [null, null, null];
let _kWizPreviews   = [null, null, null];
let _kWizSubmitting = false;
let _kWizStep       = 0;

function _kTenWizOpen() {
  _kWizBlobs    = [null, null, null];
  _kWizPreviews.forEach(u => u && URL.revokeObjectURL(u));
  _kWizPreviews = [null, null, null];
  _kWizSubmitting = false; _kWizStep = 0;
  const fi = document.getElementById('k-ten-wiz-file');
  if (fi) {
    if (window.innerWidth <= 700) fi.setAttribute('capture', 'environment');
    else fi.removeAttribute('capture');
  }
  _kTenWizRender();
  document.getElementById('k-ten-wizard').style.display = 'flex';
}
function _kTenWizCancel() { document.getElementById('k-ten-wizard').style.display = 'none'; }
function _kTenWizRender() {
  const step = _kWizStep; const slot = _kWizSlots[step];
  const hasPhoto = !!_kWizBlobs[step]; const preview = _kWizPreviews[step]; const isLast = step === _kWizSlots.length - 1;
  const dotsEl = document.getElementById('k-ten-wiz-dots');
  if (dotsEl) dotsEl.innerHTML = _kWizSlots.map((_, i) => {
    const bg = i < step ? '#9AC87A' : i === step ? 'var(--cc-gold)' : 'var(--cc-rule)';
    return `<div style="width:24px;height:3px;border-radius:2px;background:${bg};"></div>`;
  }).join('');
  const slideEl = document.getElementById('k-ten-wiz-slide');
  if (slideEl) slideEl.innerHTML =
    `<div style="text-align:center;padding:8px 0 20px;">
      <div style="font-size:36px;margin-bottom:8px;">${slot.emoji}</div>
      <p style="font-size:16px;font-weight:500;color:var(--cc-ink);margin-bottom:4px;">${slot.label}</p>
      <p style="font-size:12px;color:var(--cc-taupe);">${slot.hint}</p>
    </div>
    <div onclick="_kTenWizTakePhoto()" style="width:100%;aspect-ratio:4/3;border-radius:var(--cc-r-md);overflow:hidden;border:${hasPhoto ? '1.5px solid var(--cc-gold)' : '1px dashed var(--cc-rule)'};background:var(--cc-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;cursor:pointer;">`
    + (hasPhoto && preview
        ? `<img src="${preview}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="${slot.label}"/>
           <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.45);padding:6px 0;text-align:center;font-size:9px;color:#fff;letter-spacing:0.06em;text-transform:uppercase;">↺ retake</div>`
        : `<i class="${window.innerWidth <= 700 ? 'ti ti-camera' : 'ti ti-upload'}" style="font-size:36px;color:var(--cc-stone);" aria-hidden="true"></i>
           <span style="font-size:11px;color:var(--cc-taupe);margin-top:8px;">${window.innerWidth <= 700 ? 'Tap to take photo' : 'Click to upload photo'}</span>`)
    + `</div>`;
  const backBtn = document.getElementById('k-ten-wiz-back-btn');
  if (backBtn) backBtn.style.display = step === 0 ? 'none' : '';
  const nextBtn = document.getElementById('k-ten-wiz-next-btn');
  if (nextBtn) {
    nextBtn.textContent         = _kWizSubmitting ? 'Uploading…' : isLast ? '↑ Submit' : 'Next →';
    nextBtn.style.opacity       = hasPhoto ? '1' : '0.4';
    nextBtn.style.pointerEvents = hasPhoto ? 'auto' : 'none';
    nextBtn.onclick             = isLast ? _kTenWizSubmit : _kTenWizNext;
  }
}
function _kTenWizTakePhoto() {
  if (_kWizSubmitting) return;
  const file = document.getElementById('k-ten-wiz-file'); file.value = '';
  file.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const blob = await _kTenCompressImage(f);
    const localUrl = URL.createObjectURL(blob);
    if (_kWizPreviews[_kWizStep]) URL.revokeObjectURL(_kWizPreviews[_kWizStep]);
    _kWizBlobs[_kWizStep] = blob; _kWizPreviews[_kWizStep] = localUrl;
    _kTenWizRender();
  };
  file.click();
}
function _kTenWizBack() { if (_kWizStep > 0) { _kWizStep--; _kTenWizRender(); } }
function _kTenWizNext() { if (_kWizBlobs[_kWizStep] && _kWizStep < _kWizSlots.length - 1) { _kWizStep++; _kTenWizRender(); } }

async function _kTenWizSubmit() {
  if (_kWizSubmitting) return;
  if (!sbL || !_kTenWeekRow) { alert('No connection. Please refresh.'); return; }
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  _kWizSubmitting = true;
  const nextBtn = document.getElementById('k-ten-wiz-next-btn');
  try {
    const idx      = kWeekIdx();
    const uploaded = [];
    for (let i = 0; i < _kWizSlots.length; i++) {
      const blob = _kWizBlobs[i]; if (!blob) continue;
      const type = _kWizSlots[i].type;
      const path = 'week-' + idx + '-' + room + '-' + type + '-' + Date.now() + '.jpg';
      if (nextBtn) nextBtn.textContent = 'Uploading ' + (uploaded.length + 1) + '/' + _kWizSlots.length + '…';
      const uploadResult = await Promise.race([
        sbL.storage.from('kitchen-proofs').upload(path, blob, { upsert: true, contentType: 'image/jpeg' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000))
      ]);
      if (uploadResult.error) { alert('Photo ' + (i + 1) + ' failed — please try again.'); _kWizSubmitting = false; _kTenWizRender(); return; }
      const { data } = sbL.storage.from('kitchen-proofs').getPublicUrl(path);
      uploaded.push({ type, path, url: data.publicUrl });
    }
    if (!uploaded.length) { alert('Upload failed — please try again.'); _kWizSubmitting = false; _kTenWizRender(); return; }

    const isReupload = _kTenWeekRow.status === 'flagged';
    const patch = { status:'submitted', submitted_at:new Date().toISOString() };
    if (isReupload) { patch.reupload_count = (_kTenWeekRow.reupload_count || 0) + 1; patch.flagged = false; }
    else            { patch.photos = uploaded; }
    await sbL.from('kitchen_weeks').update(patch).eq('week_index', idx);
    await _kTenAddComment(_kTenWeekRow.id, room, '[submission] ' + JSON.stringify({ photos: uploaded, isReupload }), false);

    document.getElementById('k-ten-wizard').style.display = 'none';
    _kWizSubmitting = false;
    await loadKitchenTenant();
  } catch (err) {
    console.error('Proof submit error', err);
    alert('Error submitting — please try again.');
    _kWizSubmitting = false; _kTenWizRender();
  }
}

/* ── COMPRESS IMAGE ─────────────────────────────────────── */
async function _kTenCompressImage(file, maxPx = 1280, quality = 0.80) {
  return new Promise(resolve => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxPx || h > maxPx) { if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; } else { w = Math.round(w * maxPx / h); h = maxPx; } }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(b => resolve(b || file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ── PHOTO LIGHTBOX ─────────────────────────────────────── */
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

/* ── FEED HTML ──────────────────────────────────────────── */
function _kTenBuildFeedHtml(comments, weekRow) {
  const labels = { trash:'Trash', geschirr:'Geschirr', overview:'Kitchen' };
  const lbl    = t => labels[t] || t;
  const ri     = r => { const w = r.split(' '); return w.length > 1 ? w[0][0] + w[1][0] : r.slice(0, 2).toUpperCase(); };
  const events = [];
  const hasSub = comments.some(c => c.text && c.text.startsWith('[submission] '));
  if (!hasSub && weekRow.submitted_at) {
    let photos = weekRow.photos || [];
    if (!photos.length && weekRow.photo_url) photos = [{ url: weekRow.photo_url, type:'overview' }];
    events.push({ _type:'submission', _ts:new Date(weekRow.submitted_at).getTime(), room:weekRow.room, photos, isReupload:false });
  }
  comments.forEach(c => {
    if (c.text && c.text.startsWith('[submission] ')) {
      try { const p = JSON.parse(c.text.slice(13)); events.push({ _type:'submission', _ts:new Date(c.created_at).getTime(), room:c.room, photos:p.photos||[], isReupload:!!p.isReupload }); } catch(e) {}
    } else { events.push({ _type:'comment', _ts:new Date(c.created_at).getTime(), ...c }); }
  });
  events.sort((a, b) => a._ts - b._ts);
  if (!events.length) return '<p class="cc-note" style="padding:8px 0;">No activity yet this week.</p>';

  let flagSeen = false;
  return events.map(ev => {
    if (ev._type === 'submission') {
      const isRe = flagSeen; flagSeen = false;
      const photoStrip = ev.photos && ev.photos.length
        ? '<div style="display:flex;gap:4px;margin-top:8px;">'
          + ev.photos.filter(p => p.url).map(p =>
              `<div style="flex:1;min-width:0;aspect-ratio:3/4;border-radius:6px;overflow:hidden;border:0.5px solid var(--cc-rule);position:relative;cursor:pointer;" onclick="_kTenOpenPhoto('${p.url}','${lbl(p.type)}')">`
              + `<img src="${p.url}" alt="${p.type}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'"/>`
              + `<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);font-size:8px;font-weight:500;color:#fff;letter-spacing:0.05em;text-transform:uppercase;padding:3px 4px;text-align:center;">${lbl(p.type)}</span>`
              + `</div>`).join('') + '</div>'
        : '';
      const badge = isRe ? '<span class="k-reupload-badge">↑ Re-uploaded</span>'
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
        <div class="k-chat-avatar${isCC?' k-chat-avatar--me':''}" ${isCC?'style="background:var(--cc-ink);color:var(--cc-white);"':''}>${ri(ev.room)}</div>
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
      <div class="k-chat-avatar${isCC?' k-chat-avatar--me':''}" ${isCC?'style="background:var(--cc-ink);color:var(--cc-white);"':''}>${ri(ev.room)}</div>
      <div style="flex:1;min-width:0;"><div class="k-chat-meta">
        <span class="k-chat-name"${isCC?' style="color:var(--cc-gold);"':''}>${esc(ev.room)}</span>
        <span class="k-chat-time">${fmtTs(ev._ts)}</span></div>
        <p class="k-chat-text">${esc(ev.text)}</p>
      </div></div>`;
  }).join('');
}

/* ── FEED RENDER ────────────────────────────────────────── */
async function _kTenRenderFeed(weekRow) {
  const elMob = document.getElementById('k-feed-mob');
  const elDsk = document.getElementById('k-feed-dsk');
  const empty  = '<p class="cc-note" style="padding:8px 0;">No data.</p>';
  const missed = '<p class="cc-note" style="padding:8px 0;">Week reset — marked as missed.</p>';
  if (!weekRow) {
    if (elMob) elMob.innerHTML = empty;
    if (elDsk) elDsk.innerHTML = empty;
    return;
  }
  if (weekRow.status === 'missed') {
    if (elMob) elMob.innerHTML = missed;
    if (elDsk) elDsk.innerHTML = missed;
    return;
  }
  const comments = await _kTenGetComments(weekRow.id);
  const html = _kTenBuildFeedHtml(comments, weekRow);
  if (elMob) { elMob.innerHTML = html; scrollToBottom(elMob); }
  if (elDsk) { elDsk.innerHTML = html; scrollToBottom(elDsk); }
}

/* ── ROTATION STRIP ─────────────────────────────────────── */
async function _kTenRenderRotation(absData) {
  const el = document.getElementById('k-mob-rot-strip'); if (!el) return;
  const rooms = _kTenGetRoomList();
  if (!rooms.length) { el.innerHTML = ''; return; }
  const idx        = kWeekIdx();
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);

  const dbRows = await Promise.all(rooms.map((_, i) => _kTenGetWeek(cycleStart + i)));

  let approvedCount = 0;
  for (let i = 0; i < cyclePos; i++) { if (dbRows[i] && dbRows[i].status === 'approved') approvedCount++; }
  const greenPct = approvedCount > 0 ? ((approvedCount / rooms.length) * 100).toFixed(1) + '%' : '0%';

  let trueNextI = -1;
  for (let offset = 1; offset < rooms.length; offset++) {
    const ni = cyclePos + offset; if (ni >= rooms.length) break;
    const nRoom  = rooms[ni];
    const nStart = new Date(K_START.getTime() + (cycleStart + ni) * 7 * 24 * 60 * 60 * 1000);
    const nEnd   = new Date(nStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const nWs = nStart.toISOString().slice(0, 10); const nWe = nEnd.toISOString().slice(0, 10);
    if (!absData.some(a => a.room === nRoom && a.from_date <= nWe && a.to_date >= nWs) && !isVacant(nRoom)) { trueNextI = ni; break; }
  }

  const items = rooms.map((room, i) => {
    const slotIdx = cycleStart + i;
    const info    = kWeekInfo(Math.max(0, slotIdx));
    const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
    const dbRow   = dbRows[i];
    const state   = _kRotState({ isNow:i===cyclePos, isPast:i<cyclePos, isNext:i===trueNextI, dbStatus:dbRow?dbRow.status:null, room, weekStart:info?info.start:null, absenceRows:absData });
    const badgeText = { done:'✓', missed:'✗', skipped:'—', absent:'away', now:'Now', none:'—', next:'Next', upcoming:'—' }[state] || '—';
    return `<div class="k-mob-rot-item ${state}"><span class="k-mob-rot-badge ${state}">${badgeText}</span><span class="k-mob-rot-room">${esc(room)}</span><span class="k-mob-rot-dates">${dateStr}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="k-mob-rot-line"></div><div class="k-mob-rot-line-done" style="width:${greenPct}"></div><div class="k-mob-rot-items">${items}</div>`;

  // Desktop: vertical list
  const elDsk = document.getElementById('k-dsk-rot-list');
  if (elDsk) {
    const dotColor = { done:'#9AC87A', now:'#E8C97A', next:'#90C2F5', missed:'#F5A8A5', skipped:'#C4B5FD', absent:'#D4A87A', upcoming:'var(--cc-rule)', none:'var(--cc-rule)' };
    const statusLabel = { done:'✓ Done', missed:'✗ Missed', skipped:'— Skip', absent:'Away', now:'Now', next:'Next', upcoming:'', none:'' };
    const statusCls   = { done:'rs-done', missed:'rs-missed', now:'rs-now', next:'rs-next' };
    elDsk.innerHTML = rooms.map((room, i) => {
      const slotIdx = cycleStart + i;
      const info    = kWeekInfo(Math.max(0, slotIdx));
      const dateStr = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
      const dbRow   = dbRows[i];
      const state   = _kRotState({ isNow:i===cyclePos, isPast:i<cyclePos, isNext:i===trueNextI, dbStatus:dbRow?dbRow.status:null, room, weekStart:info?info.start:null, absenceRows:absData });
      const dot  = dotColor[state] || 'var(--cc-rule)';
      const lbl  = statusLabel[state] || '';
      const cls  = statusCls[state] || '';
      const roomStyle = state === 'now' ? 'font-weight:500;color:#633806;' : '';
      const badge = lbl ? `<span class="k-dsk-rot-status ${cls}">${lbl}</span>` : '';
      return `<div class="k-dsk-rot-item"><div class="k-dsk-rot-dot" style="background:${dot};"></div><span class="k-dsk-rot-room" style="${roomStyle}">${esc(room)}</span><span class="k-dsk-rot-date">${dateStr}</span>${badge}</div>`;
    }).join('');
  }
}

/* ── WEEK CARD ──────────────────────────────────────────── */
function _kTenRenderWeekCard(weekRow, absData) {
  const wi = _kTenWeekInfo(kWeekIdx()); if (!wi) return;
  const myRoom     = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const isAssigned = wi.room === myRoom;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  const dateStr = fmt(wi.start) + ' – ' + fmt(wi.end) + (isAssigned && wi.daysLeft > 0 ? ' · ' + wi.daysLeft + 'd left' : isAssigned ? ' · ends today' : '');
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('k-mob-room-name', wi.room);
  setTxt('k-mob-dates', dateStr);
  setTxt('k-dsk-room-name', wi.room);
  setTxt('k-dsk-dates', dateStr);

  const chip = document.getElementById('k-mob-status-chip');
  const chipDsk = document.getElementById('k-dsk-status-chip');
  if (!isAssigned) {
    if (chip)    { chip.className    = 'k-mob-status-chip not-your-turn'; chip.textContent    = '— Not your turn'; }
    if (chipDsk) { chipDsk.className = 'k-mob-status-chip not-your-turn'; chipDsk.textContent = '— Not your turn'; }
    const actEl    = document.getElementById('k-ten-act');    if (actEl)    actEl.innerHTML = '';
    const actElDsk = document.getElementById('k-dsk-ten-act'); if (actElDsk) actElDsk.innerHTML = '';
    return;
  }

  const state    = _kRotState({ isNow:true, isPast:false, dbStatus:weekRow?weekRow.status:null, room:wi.room, weekStart:wi.start, absenceRows:absData });
  const dbStatus = weekRow ? weekRow.status : null;
  const isResub  = state === 'now' && weekRow && weekRow.reupload_count > 0;

  const chipCls = isResub ? 'resubmitted'
    : state==='done' ? 'approved' : state==='missed' ? 'missed'
    : state==='absent' ? 'skipped' : state==='skipped' ? 'skipped'
    : dbStatus==='flagged' ? 'flagged' : dbStatus==='submitted' ? 'submitted' : 'pending';
  const chipTxt = state !== 'now'
    ? ({ done:'✓ Approved', missed:'✗ Missed', absent:'— Away', skipped:'— Skipped' }[state] || 'Pending')
    : isResub ? '↑↑ Re-submitted' : dbStatus==='submitted' ? '↑ Submitted' : dbStatus==='flagged' ? '⚑ Redo' : 'Pending';
  if (chip)    { chip.className    = 'k-mob-status-chip ' + chipCls; chip.textContent    = chipTxt; }
  if (chipDsk) { chipDsk.className = 'k-mob-status-chip ' + chipCls; chipDsk.textContent = chipTxt; }

  // Action button
  const actEl    = document.getElementById('k-ten-act');    if (!actEl) return;
  const actElDsk = document.getElementById('k-dsk-ten-act');
  if (state !== 'now') {
    actEl.innerHTML = '';
    if (actElDsk) actElDsk.innerHTML = '';
    return;
  }
  let btnHtml = '';
  if (dbStatus === 'flagged') {
    btnHtml = `<button class="k-mob-wact red" onclick="_kTenWizOpen()" aria-label="Re-upload proof"><i class="ti ti-camera-plus"></i><span>Re-upload</span></button>`;
  } else if (!dbStatus || dbStatus === 'pending') {
    btnHtml = `<button class="k-mob-wact blue" onclick="_kTenWizOpen()" aria-label="Upload proof"><i class="ti ti-camera-plus"></i><span>Proof</span></button>`;
  }
  actEl.innerHTML = btnHtml;
  if (actElDsk) actElDsk.innerHTML = btnHtml;
}

/* ── NUDGE BANNER ───────────────────────────────────────── */
let _kTenNudgeBusy = false;
async function _kTenLoadNudgeBanner() {
  if (!sbL || _kTenNudgeBusy) return;
  const myRoom = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
  const { data } = await sbL.from('lounge_data').select('*').eq('type','kitchen_nudge').order('created_at',{ascending:false}).limit(5);
  const banner    = document.getElementById('k-ten-nudge-banner');
  const text      = document.getElementById('k-ten-nudge-banner-text');
  const bannerDsk = document.getElementById('k-dsk-ten-nudge-banner');
  const textDsk   = document.getElementById('k-dsk-ten-nudge-banner-text');
  if (!banner || !text) return;
  const nudge = (data||[]).find(n => {
    if (n.room !== myRoom && n.room !== 'All') return false;
    const acked = Array.isArray(n.dismissed_by) ? n.dismissed_by : [];
    return !acked.includes(myRoom);
  });
  if (!nudge) {
    banner.style.display = 'none';
    if (bannerDsk) bannerDsk.style.display = 'none';
    return;
  }
  const note = nudge.title ? ` · ${nudge.title}` : '';
  const bannerText = `${nudge.body}${note}`;
  text.textContent = bannerText;
  if (textDsk) textDsk.textContent = bannerText;
  banner.dataset.nudgeBody = nudge.body;
  banner.dataset.nudgeId   = nudge.id;
  banner.dataset.nudgeRoom = nudge.room;
  if (bannerDsk) {
    bannerDsk.dataset.nudgeBody = nudge.body;
    bannerDsk.dataset.nudgeId   = nudge.id;
    bannerDsk.dataset.nudgeRoom = nudge.room;
    bannerDsk.style.display = 'flex';
  }
  banner.style.display = 'flex';
}
async function _kTenMarkNudgeDone() {
  if (_kTenNudgeBusy) return; _kTenNudgeBusy = true;
  try {
    const myRoom = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
    const banner = document.getElementById('k-ten-nudge-banner');
    const nudgeBody = banner?.dataset.nudgeBody || '';
    const nudgeId   = banner?.dataset.nudgeId   || '';
    const resolvedMap = { 'Trash not taken out':'Trash taken out', 'Dishes not clean':'Dishes cleaned', 'Fridge not clean':'Fridge cleaned' };
    const resolved = resolvedMap[nudgeBody] || (nudgeBody || 'Done');
    if (banner) { banner.style.display = 'none'; banner.dataset.nudgeId = ''; }
    if (sbL && _kTenWeekRow && nudgeBody) {
      await _kTenAddComment(_kTenWeekRow.id, myRoom, `✓ ${myRoom} — ${resolved} · done`, false);
    }
    if (sbL && nudgeId) await sbL.from('lounge_data').delete().eq('id', nudgeId);
    await loadKitchenTenant();
  } finally { _kTenNudgeBusy = false; }
}
async function _kTenDismissNudgeBanner() {
  if (_kTenNudgeBusy) return; _kTenNudgeBusy = true;
  try {
    const myRoom  = (typeof currentRoom !== 'undefined' ? currentRoom : '') || localStorage.getItem('cc_room') || '';
    const banner  = document.getElementById('k-ten-nudge-banner');
    const nudgeId   = banner?.dataset.nudgeId   || '';
    const nudgeRoom = banner?.dataset.nudgeRoom || '';
    if (banner) { banner.style.display = 'none'; banner.dataset.nudgeId = ''; }
    const bannerDsk = document.getElementById('k-dsk-ten-nudge-banner');
    if (bannerDsk) { bannerDsk.style.display = 'none'; bannerDsk.dataset.nudgeId = ''; }
    if (sbL && nudgeId) {
      if (nudgeRoom !== 'All') { await sbL.from('lounge_data').delete().eq('id', nudgeId); }
      else {
        const { data: fresh } = await sbL.from('lounge_data').select('dismissed_by').eq('id', nudgeId).maybeSingle();
        const existing = Array.isArray(fresh?.dismissed_by) ? fresh.dismissed_by : [];
        if (!existing.includes(myRoom)) await sbL.from('lounge_data').update({ dismissed_by: [...existing, myRoom] }).eq('id', nudgeId);
      }
    }
  } finally { _kTenNudgeBusy = false; }
}
// Desktop nudge banner buttons delegate to same logic using desktop banner's dataset
async function _kTenMarkNudgeDoneDsk() {
  const bannerDsk = document.getElementById('k-dsk-ten-nudge-banner');
  if (!bannerDsk) return;
  // Copy dataset to mobile banner so existing handler works
  const mob = document.getElementById('k-ten-nudge-banner');
  if (mob) { mob.dataset.nudgeBody = bannerDsk.dataset.nudgeBody; mob.dataset.nudgeId = bannerDsk.dataset.nudgeId; mob.dataset.nudgeRoom = bannerDsk.dataset.nudgeRoom; }
  await _kTenMarkNudgeDone();
}
async function _kTenDismissNudgeBannerDsk() {
  const bannerDsk = document.getElementById('k-dsk-ten-nudge-banner');
  if (!bannerDsk) return;
  const mob = document.getElementById('k-ten-nudge-banner');
  if (mob) { mob.dataset.nudgeBody = bannerDsk.dataset.nudgeBody; mob.dataset.nudgeId = bannerDsk.dataset.nudgeId; mob.dataset.nudgeRoom = bannerDsk.dataset.nudgeRoom; }
  await _kTenDismissNudgeBanner();
}

/* ── HISTORY MODAL ──────────────────────────────────────── */
async function _kTenPopulateHistory() {
  const el = document.getElementById('k-ten-history-body');
  if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const idx = kWeekIdx();
  const { data } = await sbL.from('kitchen_weeks').select('*').lte('week_index', idx).order('week_index', { ascending: false }).limit(12);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">No past weeks yet.</p>'; return; }
  el.innerHTML = data.map(w => {
    const dateStr = kWeekDateRange(w.week_index);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:0.5px solid var(--cc-rule);">
      <div><p style="font-size:13px;font-weight:500;color:var(--cc-ink);">${esc(w.room)}</p>
      <p style="font-size:11px;color:var(--cc-taupe);">${dateStr}</p></div>
      ${kHistPill(w.status)}</div>`;
  }).join('');
}

/* ── SEND MESSAGE ───────────────────────────────────────── */
let _kTenWeekRow    = null;
let _kTenChannel    = null;
let _kTenMobSending = false;

async function _kTenSendMsg() {
  const mobInp = document.getElementById('k-mob-msg-input');
  const dskInp = document.getElementById('k-dsk-msg-input');
  const inp  = (dskInp && dskInp.value.trim()) ? dskInp : mobInp;
  const text = inp ? inp.value.trim() : ''; if (!text || !_kTenWeekRow || _kTenMobSending) return;
  _kTenMobSending = true; inp.value = '';
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const feed = document.getElementById('k-feed-mob');
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-mob-optimistic';
    tmp.innerHTML = `<div class="k-chat-avatar">${room.slice(0,2).toUpperCase()}</div>`
      + `<div style="flex:1;min-width:0;"><div class="k-chat-meta"><span class="k-chat-name">${esc(room)}</span>`
      + `<span class="k-chat-time" style="opacity:0.5;">sending…</span></div><p class="k-chat-text">${esc(text)}</p></div>`;
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  _kTenAddComment(_kTenWeekRow.id, room, text, false).finally(() => { _kTenMobSending = false; });
}

async function _kTenSendPhoto(file) {
  if (!file || !_kTenWeekRow) { alert('No active week.'); return; }
  if (file.size > 30 * 1024 * 1024) { alert('Max 30MB.'); return; }
  const room       = (typeof currentRoom !== 'undefined' ? currentRoom : '') || '';
  const compressed = await _kTenCompressImage(file);
  const feed       = document.getElementById('k-feed-mob');
  const localUrl   = URL.createObjectURL(compressed);
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-ten-photo-optimistic';
    tmp.innerHTML = `<div class="k-chat-avatar">${room.slice(0,2).toUpperCase()}</div>`
      + `<div style="flex:1;min-width:0;"><div class="k-chat-meta"><span class="k-chat-name">${esc(room)}</span>`
      + `<span class="k-chat-time" style="opacity:0.5;">uploading…</span></div>`
      + `<div style="margin-top:5px;"><img src="${localUrl}" style="max-width:100%;border-radius:6px;object-fit:contain;opacity:0.7;"/></div></div>`;
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  const idx  = kWeekIdx();
  const path = 'week-' + idx + '-' + room + '-chat-' + Date.now() + '.jpg';
  const { error } = await sbL.storage.from('kitchen-proofs').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
  document.getElementById('k-ten-photo-optimistic')?.remove();
  if (error) { alert('Upload failed.'); return; }
  const { data } = sbL.storage.from('kitchen-proofs').getPublicUrl(path);
  await _kTenAddComment(_kTenWeekRow.id, room, '[photo] ' + data.publicUrl, false);
}

/* ── REALTIME ───────────────────────────────────────────── */
function _kTenSubscribe() {
  if (_kTenChannel) { sbL.removeChannel(_kTenChannel); _kTenChannel = null; }
  _kTenChannel = sbL.channel('kitchen-tenant-rt')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kitchen_weeks' },    async () => { await loadKitchenTenant(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kitchen_comments' }, async () => { await loadKitchenTenant(); })
    .on('postgres_changes', { event: '*',      schema: 'public', table: 'kitchen_absences' }, async () => { await loadKitchenTenant(); })
    .on('postgres_changes', { event: '*',      schema: 'public', table: 'lounge_data' },      async () => { await loadKitchenTenant(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, async () => {
      if (typeof loadRoomsData === 'function') await loadRoomsData();
      await loadKitchenTenant();
    })
    .subscribe();
}

/* ── MAIN LOAD ──────────────────────────────────────────── */
async function loadKitchenTenant() {
  if (typeof appRooms !== 'undefined' && appRooms.length === 0 && typeof loadRoomsData === 'function') {
    await loadRoomsData();
  }
  await loadKitchenRoomsFromSupabase();

  const idx  = kWeekIdx(new Date());
  const info = _kTenWeekInfo(Math.max(0, idx));
  if (!info) return;

  if (!sbL) {
    const el = document.getElementById('k-feed-mob');
    if (el) el.innerHTML = '<p class="cc-note">Connect Supabase.</p>';
    return;
  }

  // Fetch week row + absences in parallel
  let [weekRow, absData] = await Promise.all([
    _kTenGetWeek(idx),
    sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || [])
  ]);

  // Create row if missing
  if (!weekRow) {
    const { data } = await sbL.from('kitchen_weeks')
      .insert({ week_index: idx, room: info.room, status: 'pending' })
      .select().single();
    weekRow = data || (await _kTenGetWeek(idx));
  }
  _kTenWeekRow = weekRow;

  _kTenRenderWeekCard(weekRow, absData);
  await _kTenRenderFeed(weekRow);
  await _kTenRenderRotation(absData);
  await _kTenLoadNudgeBanner();

  _kTenSubscribe();

  if (typeof onRoomsChange === 'function') onRoomsChange(() => loadKitchenTenant());
}

/* ── ALIASES — layout.js calls both ────────────────────── */
var initKitchenMobile    = loadKitchenTenant;
var initKitchen          = loadKitchenTenant;
var initKitchenMobExtend = loadKitchenTenant;

/* ── TAB VISIBILITY ─────────────────────────────────────── */
(async function _kTenEnsureTabVisible() {
  await loadKitchenRoomsFromSupabase();
  const room = (typeof currentRoom !== 'undefined' ? currentRoom : null) || localStorage.getItem('cc_room');
  if (!room) return;
  const inKitchenConfig = getKitchenRooms().includes(room);
  const inRoomsTable    = typeof appRooms !== 'undefined' && !!appRooms.find(r => r.name === room)?.kitchen_enabled;
  if (inKitchenConfig || inRoomsTable) document.getElementById('kitchenTab')?.style.removeProperty('display');
})();

/* ── WIRE COMPOSE + PHOTO + PWA KEYBOARD FIX ───────────── */
(function _kTenWireCompose() {
  const mobInput = document.getElementById('k-mob-msg-input');
  const mobPhoto = document.getElementById('k-mob-photo-btn');
  const mobFile  = document.getElementById('k-mob-photo-file');
  const dskInput = document.getElementById('k-dsk-msg-input');
  const dskPhoto = document.getElementById('k-dsk-photo-btn');
  const dskFile  = document.getElementById('k-dsk-photo-file');

  mobInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _kTenSendMsg(); } });
  dskInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _kTenSendMsg(); } });

  mobPhoto?.addEventListener('click', () => mobFile?.click());
  mobFile?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    mobFile.value = ''; mobPhoto.style.opacity = '0.5';
    await _kTenSendPhoto(file);
    mobPhoto.style.opacity = '';
  });

  dskPhoto?.addEventListener('click', () => dskFile?.click());
  dskFile?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    dskFile.value = ''; dskPhoto.style.opacity = '0.5';
    await _kTenSendPhoto(file);
    dskPhoto.style.opacity = '';
  });

  // PWA keyboard fix — mobile only
  wireComposeBlur(mobInput);
})();
