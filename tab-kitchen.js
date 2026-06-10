/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — LANDLORD KITCHEN TAB
   js/tab-kitchen.js

   Mobile:  rotation strip · week card · action buttons · chat
   Desktop: current week card · approve/flag/reset · proof feed · rotation · history · absences · nudge log

   PWA KEYBOARD FIX (v2 improvement over v1):
   ─────────────────────────────────────────────────────────────
   v1 BUG: visualViewport only covered tab-lounge. #k-mob-msg-input
   had zero blur handler and no viewport resize handling.
   Result: keyboard opened → compose bar hidden behind keyboard.
   Keyboard closed → white space below compose persisted.

   v2 FIX (three layers):
   1. initChatViewport() in layout.js covers BOTH tab-lounge and
      tab-kitchen via the shared chat-viewport.js module.
   2. wireComposeBlur(#k-mob-msg-input) — called at end of this
      file after DOM is ready. Resets scroll only when keyboard
      is confirmed closed (300ms delay + visualViewport check).
   3. overscroll-behavior:none on .kitchen-active shell +
      overscroll-behavior:contain on .k-mob-feed — in casa-castel.css.

   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js, chat-viewport.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-kitchen').innerHTML = `

  <!-- ══ MOBILE WRAPPER (hidden on desktop via CSS) ══ -->
  <div id="k-mob-wrapper">

    <!-- Rotation progress strip -->
    <div class="k-mob-rot" id="k-mob-rot-strip"></div>

    <!-- Week card + action buttons -->
    <div class="k-mob-week">
      <div class="k-mob-week-top-row">
        <span class="k-mob-status-chip pending" id="k-mob-status-chip"></span>
        <div class="k-mob-week-corner-links">
          <button class="k-mob-week-corner-link" onclick="kitchenOpenModal('history')">history</button>
        </div>
      </div>
      <div class="k-mob-week-body">
        <div class="k-mob-week-left">
          <span class="k-mob-week-room" id="k-mob-room-name">—</span>
          <span class="k-mob-week-dates-sm" id="k-mob-dates">—</span>
          <span class="k-mob-week-absent-note" id="k-mob-absent-note" style="display:none;"></span>
        </div>
        <div class="k-mob-week-acts" id="k-mob-actions"></div>
      </div>
    </div>

    <!-- Nudge banner — shown when an active nudge exists, hidden by default -->
    <div id="k-mob-nudge-banner" style="display:none;flex-shrink:0;margin:0;padding:8px 14px;background:#FEFCE8;border-bottom:0.5px solid #EAD96B;display:none;align-items:center;gap:8px;">
      <span style="font-size:13px;flex-shrink:0;">⚑</span>
      <span id="k-mob-nudge-banner-text" style="flex:1;font-size:11px;color:#78640A;font-weight:400;"></span>
      <span id="k-mob-nudge-banner-status" style="font-size:9px;font-weight:500;padding:2px 7px;border-radius:8px;background:#FEF9C3;border:0.5px solid #EAD96B;color:#78640A;white-space:nowrap;flex-shrink:0;"></span>
      <button onclick="_kDismissNudgeBanner()" style="flex-shrink:0;background:none;border:none;font-size:14px;color:#A0860E;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
    </div>

    <!-- Chat (the PWA-critical part) -->
    <div class="k-mob-chat">
      <div class="k-mob-chat-hdr">
        <span class="k-mob-chat-lbl">Proof &amp; chat</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="k-mob-tlink" onclick="kClearChat()">✕ Clear</button>
          <button class="k-mob-tlink" onclick="initKitchenMobile()">↺ Refresh</button>
        </div>
      </div>
      <!-- Feed: flex:1, overscroll-behavior:contain — set in css/casa-castel.css -->
      <div class="k-mob-feed" id="k-feed-mob"></div>
      <!-- Compose bar: padding-bottom uses env(safe-area-inset-bottom)
           Height adjusted by initChatViewport() when keyboard opens -->
      <div class="k-mob-compose">
        <input class="k-mob-compose-input" id="k-mob-msg-input" type="text" placeholder="Write to kitchen group…"/>
        <button class="k-mob-nudge-flag-btn" id="k-mob-nudge-flag-btn" onclick="kitchenOpenModal('nudge')" aria-label="Send a nudge">⚑</button>
        <input type="file" id="k-mob-photo-file" accept="image/*" capture="environment" style="display:none;"/>
        <button class="k-mob-camera-btn" id="k-mob-photo-btn" aria-label="Send photo" title="Send photo">
          <i class="ti ti-camera" style="font-size:18px;"></i>
        </button>
      </div>
    </div>
  </div><!-- /#k-mob-wrapper -->

  <!-- ══ DESKTOP GRID (hidden on mobile via CSS) ══ -->
  <div class="k-desktop-grid">

    <!-- Left column: week status + rotation + history + nudge -->
    <div class="k-desktop-left">

      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr">
          <span class="k-dsk-section-lbl">This week</span>
          <span class="kc-week-badge" id="k-week-label">Awaiting proof</span>
        </div>
        <p class="k-dsk-week-room" id="k-current-room">—</p>
        <p class="k-dsk-week-dates" id="k-dates">—</p>
        <div class="k-nudge-notice" id="k-nudge-notice" style="display:none;">
          <span class="k-nudge-notice__icon">⚑</span>
          <span id="k-nudge-notice-text">A house nudge was sent this week.</span>
        </div>
        <p class="kc-proof-meta" id="k-proof-meta" style="font-size:11px;color:var(--cc-taupe);margin-bottom:4px;"></p>
        <div class="k-dsk-act-row">
          <button class="cc-btn cc-btn--primary k-flag-btn" id="k-approve-btn"   style="display:none;">✓ Approve</button>
          <button class="k-flag-btn"                        id="k-unapprove-btn" style="display:none;background:var(--cc-surface);color:var(--cc-taupe);border-color:var(--cc-rule);">↩ Undo</button>
          <button class="k-flag-btn"                        id="k-flag-btn">⚑ Flag</button>
          <button class="k-flag-btn"                        id="k-reminder-btn" style="background:var(--cc-surface);color:var(--cc-taupe);border-color:var(--cc-rule);">✉ Remind</button>
          <button class="k-flag-btn"                        id="k-reset-btn"    style="background:var(--cc-surface);color:var(--cc-stone);border-color:var(--cc-rule);">↺ Reset</button>
        </div>
      </div>

      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr"><span class="k-dsk-section-lbl">Rotation</span></div>
        <div id="k-rotation"></div>
      </div>

      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr">
          <span class="k-dsk-section-lbl">History</span>
          <button class="k-dsk-section-link" onclick="kitchenOpenModal('history')">see all</button>
        </div>
        <div id="k-history"></div>
      </div>

      <div class="k-dsk-section">
        <div class="k-dsk-section-hdr"><span class="k-dsk-section-lbl">Send nudge</span></div>
        <div class="issue-panel" style="border:none;padding:0;background:none;">
          <p class="issue-panel-title" style="margin-bottom:6px;">What is the problem?</p>
          <div class="issue-type-grid" id="k-type-grid" style="margin-bottom:8px;">
            <button class="issue-type-btn" data-type="Trash not taken out"><span class="icon">🗑</span>Trash</button>
            <button class="issue-type-btn" data-type="Dishes not clean"><span class="icon">🍽</span>Dishes</button>
            <button class="issue-type-btn" data-type="Fridge not clean"><span class="icon">🧊</span>Fridge</button>
          </div>
          <p class="issue-to-label" style="margin-bottom:6px;">Send to</p>
          <div class="issue-to-grid" id="k-to-grid" style="margin-bottom:8px;">
            <button class="issue-to-btn" data-to="All">All rooms</button>
            ${getKitchenRooms().map(r => `<button class="issue-to-btn" data-to="${r}">${r}</button>`).join('')}
          </div>
          <textarea class="issue-note-input" id="k-issue-note" placeholder="Optional note… e.g. bio bin is full" rows="2" style="margin-bottom:8px;"></textarea>
          <div class="issue-actions">
            <button class="issue-post-btn" id="k-post-btn">Send nudge</button>
            <a class="btn-email" id="k-email-btn" href="#">✉ Email</a>
          </div>
        </div>
      </div>

      <div class="k-dsk-section" style="border-bottom:none;">
        <div class="k-dsk-section-hdr">
          <span class="k-dsk-section-lbl">Nudge log</span>
          <button class="k-dsk-section-link" onclick="kitchenOpenModal('nudgelog')">see all</button>
        </div>
        <div id="k-issues-log"></div>
      </div>

    </div><!-- /.k-desktop-left -->

    <!-- Right column: proof & chat feed -->
    <div class="k-desktop-right">
      <div class="k-dsk-chat-hdr">
        <span class="k-dsk-chat-lbl">Proof &amp; chat</span>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="k-dsk-chat-link" onclick="initKitchen()">↺ Refresh</button>
          <button class="k-dsk-chat-link k-dsk-chat-link--danger" onclick="kClearChat()">✕ Clear chat</button>
        </div>
      </div>
      <div class="k-feed-inner" id="k-feed"></div>
      <div class="k-feed-compose">
        <textarea class="k-feed-compose-input" id="k-msg-input" placeholder="Write to the kitchen group…" rows="1"></textarea>
        <button class="k-feed-compose-send" id="k-msg-send">↑</button>
        <input type="file" id="k-desk-photo-file" accept="image/*" style="display:none;"/>
        <button class="k-feed-compose-send" id="k-desk-photo-btn" title="Send photo" style="background:var(--cc-surface);color:var(--cc-taupe);border:0.5px solid var(--cc-rule);">
          <i class="ti ti-camera" style="font-size:17px;"></i>
        </button>
      </div>
    </div><!-- /.k-desktop-right -->

  </div><!-- /.k-desktop-grid -->

  <!-- ── MOBILE MODALS ── -->

  <!-- History modal -->
  <div class="cc-modal-overlay" id="kitchen-modal-history" onclick="if(event.target===this)kitchenCloseModal('history')">
    <div class="cc-modal-sheet" style="max-height:70vh;">
      <div class="cc-modal-hdr">
        <span class="cc-modal-title">History</span>
        <button class="cc-modal-close" onclick="kitchenCloseModal('history')">✕</button>
      </div>
      <div class="cc-modal-body" id="k-mob-history-body">
        <p class="cc-note">Loading…</p>
      </div>
    </div>
  </div>

  <!-- Absences modal -->
  <!-- Nudge modal (mobile) -->
  <div class="cc-modal-overlay" id="kitchen-modal-nudge" onclick="if(event.target===this)kitchenCloseModal('nudge')">
    <div class="cc-modal-sheet" style="max-height:75vh;">
      <div class="cc-modal-hdr">
        <span class="cc-modal-title">Send a nudge</span>
        <button class="cc-modal-close" onclick="kitchenCloseModal('nudge')">✕</button>
      </div>
      <div class="cc-modal-body">
        <p style="font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);margin-bottom:8px;">What is the problem?</p>
        <div style="display:flex;gap:6px;margin-bottom:16px;" id="k-mob-nudge-type-row">
          <button class="k-mob-n-chip" style="flex:1;padding:10px 4px;text-align:center;" data-type="Trash not taken out">🗑 Trash</button>
          <button class="k-mob-n-chip" style="flex:1;padding:10px 4px;text-align:center;" data-type="Dishes not clean">🍽 Dishes</button>
          <button class="k-mob-n-chip" style="flex:1;padding:10px 4px;text-align:center;" data-type="Fridge not clean">🧊 Fridge</button>
        </div>
        <p style="font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--cc-taupe);margin-bottom:8px;">Send to</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;" id="k-mob-nudge-to-row">
          <button class="k-mob-n-chip" style="padding:10px 0;text-align:center;" data-to="All">All rooms</button>
          ${getKitchenRooms().map(r => `<button class="k-mob-n-chip" style="padding:10px 0;text-align:center;" data-to="${r}">${r}</button>`).join('')}
        </div>
        <textarea class="issue-note-input" id="k-mob-nudge-note" placeholder="Optional note…" rows="2" style="margin-bottom:12px;"></textarea>
        <button class="cc-btn cc-btn--primary" id="k-mob-nudge-send-btn">Send nudge</button>
      </div>
    </div>
  </div>

  <!-- Nudge log modal -->
  <div class="cc-modal-overlay" id="kitchen-modal-nudgelog" onclick="if(event.target===this)kitchenCloseModal('nudgelog')">
    <div class="cc-modal-sheet" style="max-height:70vh;">
      <div class="cc-modal-hdr">
        <span class="cc-modal-title">Nudge log</span>
        <button class="cc-modal-close" onclick="kitchenCloseModal('nudgelog')">✕</button>
      </div>
      <div class="cc-modal-body" id="k-mob-nudgelog-body">
        <p class="cc-note">Loading…</p>
      </div>
    </div>
  </div>
`;

/* ── MODAL HELPERS ──────────────────────────────────────── */
function kitchenOpenModal(name) {
  document.getElementById('kitchen-modal-' + name)?.classList.add('open');
  if (name === 'history')  _populateKHistory();
  if (name === 'nudgelog') _populateKNudgeLog();
}
function kitchenCloseModal(name) {
  document.getElementById('kitchen-modal-' + name)?.classList.remove('open');
}

/* ── SUPABASE HELPERS ───────────────────────────────────── */
async function _kGetWeek(idx) {
  if (!sbL) return null;
  const { data } = await sbL.from('kitchen_weeks').select('*').eq('week_index', idx).maybeSingle();
  return data;
}
async function _kUpdateWeek(idx, patch) {
  if (!sbL) return;
  await sbL.from('kitchen_weeks').update(patch).eq('week_index', idx);
}
async function _kGetComments(weekId) {
  if (!sbL) return [];
  const { data } = await sbL.from('kitchen_comments').select('*').eq('week_id', weekId).order('created_at', { ascending: true });
  return data || [];
}
async function _kAddComment(weekId, room, text, isFlag) {
  if (!sbL) return;
  await sbL.from('kitchen_comments').insert({ week_id: weekId, room, text, is_flag: !!isFlag });
  const w = await sbL.from('kitchen_weeks').select('comment_count').eq('id', weekId).single();
  if (w.data) await sbL.from('kitchen_weeks').update({ comment_count: (w.data.comment_count || 0) + 1 }).eq('id', weekId);
}
async function _kDeleteComment(commentId) {
  if (!sbL) return;
  await sbL.from('kitchen_comments').delete().eq('id', commentId);
}
async function _kDeleteComments(weekId) {
  if (!sbL || !weekId) return;
  await sbL.from('kitchen_comments').delete().eq('week_id', weekId);
}
async function _kDetectReupload(row) {
  if (!row || row.status !== 'submitted') return false;
  if (row.reupload_count > 0) return true; // tenant writes this on re-upload — race-free
  const comments = await _kGetComments(row.id);
  return comments.some(c => c.is_flag);
}
async function _kAutoReset(currentIdx) {
  if (!sbL) return;
  const THIRTY = 30 * 24 * 60 * 60 * 1000;
  const { data } = await sbL.from('kitchen_weeks').select('*').lt('week_index', currentIdx).order('week_index', { ascending: false });
  if (!data || !data.length) return;
  const cutoff = Date.now() - THIRTY;
  for (const row of data) {
    const ts = row.submitted_at || row.closed_at || row.created_at;
    if (!ts || new Date(ts).getTime() > cutoff) continue;
    if (row.photo_path) await sbL.storage.from('kitchen-proofs').remove([row.photo_path]);
    await sbL.from('kitchen_comments').delete().eq('week_id', row.id);
    if (row.photo_path || row.photo_url || row.photos)
      await sbL.from('kitchen_weeks').update({ photos: null, photo_path: null, photo_url: null, closed_at: row.closed_at || new Date().toISOString() }).eq('id', row.id);
  }
}

/* ── ROTATION STATE HELPER ──────────────────────────────── */
// Single source of truth for what state a rotation slot shows.
// absenceRows = array of {room, from_date, to_date} from kitchen_absences.
// weekStart = Date object for the start of the slot's week.
function _kRotState(opts) {
  const { isNow, isPast, isNext, dbStatus, room, weekStart, absenceRows } = opts;

  // Absence first — explicit absence overrides vacancy, now, next, missed
  if (absenceRows && weekStart) {
    const wStart = weekStart.toISOString().slice(0, 10);
    const wEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const absent = absenceRows.some(a =>
      a.room === room && a.from_date <= wEnd && a.to_date >= wStart
    );
    if (absent) return 'absent';
  }

  // Vacant room — skipped
  if (isVacant(room)) return 'skipped';

  // Current week
  if (isNow) {
    if (dbStatus === 'approved') return 'done';
    return 'now';
  }

  // Only the immediate next actionable room gets 'next' — all others are 'upcoming'
  if (!isPast) return isNext ? 'next' : 'upcoming';

  // Past week — determine from DB status
  if (!dbStatus) return 'none';
  if (dbStatus === 'approved') return 'done';
  if (dbStatus === 'skipped')  return 'skipped';
  if (dbStatus === 'absent')   return 'absent';
  return 'missed';
}

/* ── STATE ──────────────────────────────────────────────── */
let _kWeekRow     = null;
let _kChannel     = null;
let _kActionBusy  = false;
let _kMobSending  = false;
let _kNudgeReady  = false;
let _kSelType     = null;
let _kSelTo       = null;

/* ── FEED RENDERER (shared mobile + desktop) ────────────── */
function _kBuildFeedHtml(comments, weekRow, forMobile) {
  const labels = { trash: 'Trash', geschirr: 'Geschirr', overview: 'Kitchen' };
  const lbl    = t => labels[t] || t;

  const events = [];
  const hasSub = comments.some(c => c.text && c.text.startsWith('[submission] '));
  // Only synthesize a submission entry from the row if there are no submission comments
  // AND the week has photos stored — meaning comments were never written (legacy v1 data).
  // If photos is null (cleared by Clear chat), don't synthesize — feed stays empty.
  if (!hasSub && weekRow.submitted_at && weekRow.photos && weekRow.photos.length) {
    let photos = weekRow.photos || [];
    events.push({ _type: 'submission', _ts: new Date(weekRow.submitted_at).getTime(), room: weekRow.room, photos, isReupload: false });
  }
  comments.forEach(c => {
    if (c.text && c.text.startsWith('[submission] ')) {
      try {
        const p = JSON.parse(c.text.slice(13));
        events.push({ _type: 'submission', _ts: new Date(c.created_at).getTime(), room: c.room, photos: p.photos || [], isReupload: !!p.isReupload });
      } catch(e) {}
    } else {
      events.push({ _type: 'comment', _ts: new Date(c.created_at).getTime(), ...c });
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
            `<div class="k-chat-photo-thumb" onclick="openPhotoModal('${p.url}','${lbl(p.type)}')">`
            + `<img src="${p.url}" alt="${p.type}" onerror="this.style.display='none'"/><span>${lbl(p.type)}</span></div>`
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
    } else {
      if (ev.is_flag) {
        flagSeen = true;
        return `<div class="k-sys-event" data-comment-id="${ev.id}">
          <div class="k-sys-event__line"></div>
          <span class="k-sys-event__text k-sys-event__text--flag">⚑ Re-upload requested · ${fmtTs(ev._ts)}</span>
          ${!forMobile ? `<button class="k-delete-btn k-delete-btn--sys" title="Delete">✕</button>` : ''}
          <div class="k-sys-event__line"></div></div>`;
      }
      const isSysApproved = ev.text && (ev.text.startsWith('✓ Approved') || ev.text.startsWith('↩ Approval'));
      if (isSysApproved) {
        const isApproved = ev.text.startsWith('✓ Approved');
        return `<div class="k-sys-event" data-comment-id="${ev.id}">
          <div class="k-sys-event__line"></div>
          <span class="k-sys-event__text${isApproved ? ' k-sys-event__text--approved' : ''}">
            ${isApproved ? '✓ Approved' : '↩ Approval undone'} · ${fmtTs(ev._ts)}
          </span>
          <div class="k-sys-event__line"></div></div>`;
      }
      if (ev.text && ev.text.startsWith('✓ ') && !ev.text.startsWith('✓ Approved') && !ev.text.startsWith('✓ Approval')) {
        return `<div class="k-sys-event" data-comment-id="${ev.id}">
          <div class="k-sys-event__line"></div>
          <span class="k-sys-event__text k-sys-event__text--done">${esc(ev.text)} · ${fmtTs(ev._ts)}</span>
          <div class="k-sys-event__line"></div></div>`;
      }
      if (ev.text && ev.text.startsWith('[photo] ')) {
        const pUrl = ev.text.slice(8).trim();
        return `<div class="k-chat-row" data-comment-id="${ev.id}">
          <div class="k-chat-avatar k-chat-avatar--me" style="background:var(--cc-ink);color:var(--cc-white);">MG</div>
          <div style="flex:1;min-width:0;"><div class="k-chat-meta">
            <span class="k-chat-name" style="color:var(--cc-gold);">Casa Castel</span>
            <span class="k-chat-time">${fmtTs(ev._ts)}</span></div>
            <div style="margin-top:5px;"><img src="${pUrl}" alt="photo"
              style="max-width:100%;border-radius:6px;display:block;object-fit:contain;cursor:pointer;"
              onclick="openPhotoModal(this.src,'Photo')" onerror="this.style.display='none'"/></div>
          </div>
          <button class="k-delete-btn" title="Delete">✕</button></div>`;
      }
      return `<div class="k-chat-row" data-comment-id="${ev.id}">
        <div class="k-chat-avatar">${roomInitials(ev.room)}</div>
        <div style="flex:1;min-width:0;"><div class="k-chat-meta">
          <span class="k-chat-name">${esc(ev.room)}</span>
          <span class="k-chat-time">${fmtTs(ev._ts)}</span></div>
          <p class="k-chat-text">${esc(ev.text)}</p>
        </div>
        <button class="k-delete-btn" title="Delete">✕</button></div>`;
    }
  }).join('');
}

async function _kRenderFeed(feedId, weekRow, forMobile) {
  const el = document.getElementById(feedId); if (!el) return;
  if (!weekRow) { el.innerHTML = '<p class="cc-note" style="padding:8px 0;">No data.</p>'; return; }
  if (weekRow.status === 'missed') { el.innerHTML = '<p class="cc-note" style="padding:8px 0;">Week reset — marked as missed.</p>'; return; }
  const comments = await _kGetComments(weekRow.id);
  el.innerHTML = _kBuildFeedHtml(comments, weekRow, forMobile);
  // Wire delete buttons
  el.querySelectorAll('[data-comment-id] .k-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const row = btn.closest('[data-comment-id]');
      const id  = row && row.dataset.commentId; if (!id) return;
      if (!confirm('Delete this message?')) return;
      await _kDeleteComment(id);
      await _kRenderFeed(feedId, _kWeekRow, forMobile);
    });
  });
  // v2: use scrollToBottom with rAF retry instead of setTimeout
  scrollToBottom(el);
}

/* ── LANDLORD BUTTONS (desktop) ─────────────────────────── */
async function _kRenderLandlordButtons() {
  const metaEl      = document.getElementById('k-proof-meta');
  const approveBtn  = document.getElementById('k-approve-btn');
  const unapproveBtn= document.getElementById('k-unapprove-btn');
  const fBtn        = document.getElementById('k-flag-btn');
  const reminderBtn = document.getElementById('k-reminder-btn');
  const resetBtn    = document.getElementById('k-reset-btn');
  const badgeEl     = document.getElementById('k-week-label');

  const idx = kWeekIdx();
  const wi  = _kWeekInfo(idx);
  if (!wi) return;

  const [freshRow, absRes] = await Promise.all([
    _kGetWeek(idx),
    sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
  ]);

  const state = _kRotState({
    isNow: true, isPast: false,
    dbStatus:    freshRow ? freshRow.status : null,
    room:        wi.room,
    weekStart:   wi.start,
    absenceRows: absRes,
  });

  approveBtn.style.display   = 'none';
  unapproveBtn.style.display = 'none';
  fBtn.classList.remove('flagged');
  fBtn.textContent   = '⚑ Flag — needs redo';
  fBtn.style.display = '';
  reminderBtn.style.display = '';
  resetBtn.style.display    = '';
  resetBtn.textContent      = '↺ Reset — mark missed';

  if (state === 'skipped') {
    metaEl.textContent = 'Room is vacant this week.'; badgeEl.textContent = 'Skipped';
    approveBtn.style.display = 'none'; unapproveBtn.style.display = 'none';
    fBtn.style.display = 'none'; reminderBtn.style.display = 'none';
    resetBtn.style.display = 'none';
  } else if (state === 'absent') {
    metaEl.textContent = 'Room is away this week.'; badgeEl.textContent = 'Away';
    fBtn.style.display = 'none'; reminderBtn.style.display = 'none';
    resetBtn.style.display = 'none'; approveBtn.style.display = 'none';
    unapproveBtn.style.display = 'none';
  } else if (state === 'done') {
    metaEl.textContent = '✓ Approved'; badgeEl.textContent = 'Approved';
    unapproveBtn.style.display = ''; fBtn.style.display = 'none'; reminderBtn.style.display = 'none';
  } else if (freshRow && freshRow.status === 'missed') {
    metaEl.textContent = 'No proof submitted. Week closed.'; badgeEl.textContent = 'Missed';
    fBtn.style.display = 'none'; reminderBtn.style.display = 'none';
    resetBtn.textContent = '↺ Reopen week — give another chance';
  } else if (freshRow && freshRow.status === 'flagged') {
    metaEl.textContent = '⚑ Flagged — awaiting re-upload'; badgeEl.textContent = 'Redo requested';
    fBtn.classList.add('flagged'); fBtn.textContent = '✓ Flagged — tap to unflag';
  } else if (freshRow && freshRow.status === 'submitted') {
    const label = (freshRow.reupload_count > 0) ? 'Re-submitted' : 'Submitted';
    metaEl.textContent = label + ' · ' + fmtTs(new Date(freshRow.submitted_at).getTime());
    badgeEl.textContent = (freshRow.reupload_count > 0) ? 'Re-uploaded' : 'Ready to review';
    approveBtn.style.display = ''; approveBtn.textContent = '✓ Approve week';
  } else {
    metaEl.textContent = 'No proof submitted yet'; badgeEl.textContent = 'Awaiting proof';
    fBtn.style.display = 'none';
  }
}

/* ── MOBILE WEEK CARD ───────────────────────────────────── */
async function _kRenderMobWeekCard(overrideRow) {
  const idx = kWeekIdx();
  const wi  = _kWeekInfo(idx); if (!wi) return;
  document.getElementById('k-mob-room-name').textContent = wi.room;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  document.getElementById('k-mob-dates').textContent =
    fmt(wi.start) + ' – ' + fmt(wi.end) + (wi.daysLeft > 0 ? ' · ' + wi.daysLeft + 'd left' : ' · ends today');

  // If caller passes overrideRow (optimistic patch), use it directly — no race.
  // Otherwise fetch fresh from Supabase. Realtime always calls without arg → authoritative re-sync.
  const [freshRow, absRes] = await Promise.all([
    overrideRow ? Promise.resolve(overrideRow) : _kGetWeek(idx),
    sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
  ]);
  const state   = _kRotState({
    isNow:       true,
    isPast:      false,
    dbStatus:    freshRow ? freshRow.status : null,
    room:        wi.room,
    weekStart:   wi.start,
    absenceRows: absRes,
  });
  const isResub = state === 'now' && freshRow && freshRow.reupload_count > 0;

  const chip = document.getElementById('k-mob-status-chip');
  if (chip) {
    const chipMap = {
      now:      'pending',
      done:     'approved',
      missed:   'missed',
      flagged:  'flagged',
      absent:   'skipped',
      skipped:  'skipped',
      next:     'pending',
    };
      const dbStatusNow = freshRow ? freshRow.status : null;
      const chipClsNow = isResub              ? 'resubmitted'
                       : state === 'done'     ? 'approved'
                       : state === 'missed'   ? 'missed'
                       : state === 'absent'   ? 'skipped'
                       : state === 'skipped'  ? 'skipped'
                       : dbStatusNow === 'flagged'   ? 'flagged'
                       : dbStatusNow === 'submitted' ? 'submitted'
                       : 'pending';
      chip.className   = 'k-mob-status-chip ' + chipClsNow;
      chip.textContent = state !== 'now'
        ? ({ done:'✓ Approved', missed:'✗ Missed', absent:'— Away', skipped:'— Skipped' }[state] || 'Pending')
        : isResub                        ? '↑↑ Re-submitted'
        : dbStatusNow === 'submitted'    ? '↑ Submitted'
        : dbStatusNow === 'flagged'      ? '⚑ Redo'
        : 'Pending';
  }

  // Action buttons — same state, no separate fetch
  _kRenderMobActionsFromState(state, freshRow);
}

/* ── MOBILE ACTION BUTTONS ──────────────────────────────── */
// Called from _kRenderMobWeekCard with state+freshRow already derived — no extra fetch.
function _kRenderMobActionsFromState(state, freshRow) {
  const el = document.getElementById('k-mob-actions'); if (!el) return;
  const dbStatus = freshRow ? freshRow.status : null;
  let items = [];
  if (state === 'skipped' || state === 'absent') {
    // vacant or away — no action buttons
  } else if (dbStatus === 'submitted') {
    items.push(`<button class="k-mob-wact green" onclick="kMobApprove()" aria-label="Approve"><i class="ti ti-circle-check"></i><span>Approve</span></button>`);
    items.push(`<button class="k-mob-wact red"   onclick="kMobFlag()"    aria-label="Flag"><i class="ti ti-flag"></i><span>Flag</span></button>`);
  } else if (dbStatus === 'approved') {
    items.push(`<button class="k-mob-wact amber" onclick="kMobUnapprove()" aria-label="Undo"><i class="ti ti-arrow-back-up"></i><span>Undo</span></button>`);
  } else if (dbStatus === 'flagged') {
    items.push(`<button class="k-mob-wact amber" onclick="kMobUnflag()"   aria-label="Unflag"><i class="ti ti-flag-off"></i><span>Unflag</span></button>`);
    items.push(`<button class="k-mob-wact blue"  onclick="kMobReminder()" aria-label="Remind"><i class="ti ti-mail"></i><span>Remind</span></button>`);
  } else if (dbStatus === 'missed') {
    items.push(`<button class="k-mob-wact blue"  onclick="kMobReopen()"  aria-label="Reopen"><i class="ti ti-rotate"></i><span>Reopen</span></button>`);
  } else {
    items.push(`<button class="k-mob-wact blue"  onclick="kMobReminder()" aria-label="Remind"><i class="ti ti-mail"></i><span>Remind</span></button>`);
    items.push(`<button class="k-mob-wact red"   onclick="kMobReset()"   aria-label="Missed"><i class="ti ti-rotate"></i><span>Missed</span></button>`);
  }
  el.innerHTML = items.join('');
}

/* ── MOBILE ROTATION STRIP ──────────────────────────────── */
/* ── ROOM LIST — dynamic from rooms tab (sort_order + kitchen-enabled) ── */
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

function _kWeekInfo(idx) {
  if (idx < 0) return null;
  const rot   = _kGetRoomList();
  if (!rot.length) return kWeekInfo(idx);
  const room  = rot[idx % rot.length];
  const start = new Date(K_START.getTime() + idx * 7 * 24 * 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);
  const daysLeft = Math.max(0, Math.ceil((end - new Date()) / (24 * 60 * 60 * 1000)));
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  return { room, start, end, daysLeft, i: idx, dateRange: fmt(start) + ' – ' + fmt(end) };
}

/* ── MOBILE ROTATION STRIP ──────────────────────────────── */
async function _kRenderMobRotation() {
  const el = document.getElementById('k-mob-rot-strip'); if (!el) return;
  const rooms      = _kGetRoomList();
  if (!rooms.length) { el.innerHTML = ''; return; }
  const idx        = kWeekIdx();
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);

  const [dbRows, absData] = await Promise.all([
    Promise.all(rooms.map((_, i) => _kGetWeek(cycleStart + i))),
    sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
  ]);

  let approvedCount = 0;
  for (let i = 0; i < cyclePos; i++) { if (dbRows[i] && dbRows[i].status === 'approved') approvedCount++; }
  const greenPct = approvedCount > 0 ? ((approvedCount / rooms.length) * 100).toFixed(1) + '%' : '0%';


  // Find the one true next room — first future slot that isn't absent or skipped
  let trueNextI = -1;
  for (let offset = 1; offset < rooms.length; offset++) {
    const ni = cyclePos + offset;
    if (ni >= rooms.length) break;
    const nRoom = rooms[ni];
    const nStart = new Date(K_START.getTime() + (cycleStart + ni) * 7 * 24 * 60 * 60 * 1000);
    const nEnd   = new Date(nStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const nWs = nStart.toISOString().slice(0,10);
    const nWe = nEnd.toISOString().slice(0,10);
    const nAbsent  = absData.some(a => a.room === nRoom && a.from_date <= nWe && a.to_date >= nWs);
    const nSkipped = isVacant(nRoom);
    if (!nAbsent && !nSkipped) { trueNextI = ni; break; }
  }
  const items = rooms.map((room, i) => {
    const slotIdx  = cycleStart + i;
    const info     = kWeekInfo(Math.max(0, slotIdx));
    const dateStr  = info ? fmt(info.start) + '–' + fmt(info.end) : '—';
    const dbRow    = dbRows[i];
    const state    = _kRotState({
      isNow:       i === cyclePos,
      isPast:      i < cyclePos,
      isNext:      i === trueNextI,
      dbStatus:    dbRow ? dbRow.status : null,
      room,
      weekStart:   info ? info.start : null,
      absenceRows: absData,
    });
    const badgeText = { done:'✓', missed:'✗', skipped:'—', absent:'away', now:'Now', none:'—', next:'Next', upcoming:'—' }[state] || '—';
    return `<div class="k-mob-rot-item ${state}"><span class="k-mob-rot-badge ${state}">${badgeText}</span><span class="k-mob-rot-room">${esc(room)}</span><span class="k-mob-rot-dates">${dateStr}</span></div>`;
  }).join('');

  el.innerHTML = `<div class="k-mob-rot-line"></div><div class="k-mob-rot-line-done" style="width:${greenPct}"></div><div class="k-mob-rot-items">${items}</div>`;
}

/* ── DESKTOP ROTATION TIMELINE ──────────────────────────── */
async function _kRenderDesktopRotation(currentIdx, currentInfo) {
  const el = document.getElementById('k-rotation'); if (!el) return;
  const rooms = _kGetRoomList();
  if (!rooms.length) { el.innerHTML = '<p class="cc-note">No kitchen rooms configured.</p>'; return; }
  const idx        = Math.max(0, currentIdx);
  const pad        = n => String(n).padStart(2, '0');
  const fmt        = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  const cyclePos   = ((idx % rooms.length) + rooms.length) % rooms.length;
  const cycleStart = idx - cyclePos;

  const [dbRows, absData] = await Promise.all([
    Promise.all(rooms.map((_, i) => _kGetWeek(cycleStart + i))),
    sbL ? sbL.from('kitchen_absences').select('room,from_date,to_date').then(r => r.data || []) : Promise.resolve([])
  ]);

  let trueNextI = -1;
  for (let offset = 1; offset < rooms.length; offset++) {
    const ni     = cyclePos + offset;
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

  el.innerHTML = '<div class="rot-tl">' + rooms.map((room, i) => {
    const slotIdx = cycleStart + i;
    const start   = new Date(K_START.getTime() + slotIdx * 7 * 24 * 60 * 60 * 1000);
    const end     = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const dateStr = fmt(start) + ' – ' + fmt(end);
    const dbRow   = dbRows[i];
    const state   = _kRotState({
      isNow:       i === cyclePos,
      isPast:      i < cyclePos,
      isNext:      i === trueNextI,
      dbStatus:    dbRow ? dbRow.status : null,
      room,
      weekStart:   start,
      absenceRows: absData,
    });
    const dotClass = { done:'rot-dot--done', now:'rot-dot--now', missed:'rot-dot--missed', skipped:'rot-dot--skipped', absent:'rot-dot--absent' }[state] || 'rot-dot--next';
    const topLine  = state === 'done' || state === 'now' ? 'rot-line-done'
                   : state === 'skipped' ? 'rot-line-skipped'
                   : state === 'absent'  ? 'rot-line-absent'
                   : state === 'missed'  ? 'rot-line-missed' : 'rot-line-faded';
    const botLine  = state === 'done' && slotIdx < idx - 1 ? 'rot-line-done' : 'rot-line-faded';
    const rowClass = 'rot-tl-row'
      + (state === 'now'     ? ' rot-tl-row--now'
       : state === 'missed'  ? ' rot-tl-row--missed'
       : state === 'skipped' ? ' rot-tl-row--skipped'
       : state === 'absent'  ? ' rot-tl-row--absent'
       : state === 'next'    ? ' rot-tl-row--next' : '');
    const badge = {
      done:     '<span class="rot-badge rot-badge--done">Done</span>',
      now:      '<span class="rot-badge rot-badge--now">Now</span>',
      next:     '<span class="rot-badge rot-badge--next">Next</span>',
      missed:   '<span class="rot-badge rot-badge--missed">Missed</span>',
      skipped:  '<span class="rot-badge rot-badge--skipped">Skipped</span>',
      absent:   '<span class="rot-badge rot-badge--absent">Away</span>',
      upcoming: '<span class="rot-badge rot-badge--none">—</span>',
    }[state] || '<span class="rot-badge rot-badge--none">—</span>';
    return `<div class="${rowClass}"><div class="rot-spine"><div class="rot-spine-top ${topLine}"></div><div class="rot-dot ${dotClass}"></div><div class="rot-spine-bot ${botLine}"></div></div><div class="rot-tl-body"><div class="rot-tl-info"><p class="rot-tl-room">${esc(room)}</p><p class="rot-tl-dates">${dateStr}</p></div>${badge}</div></div>`;
  }).join('') + '</div>';
}

/* ── DESKTOP HISTORY ────────────────────────────────────── */
function _kHistPill(status) { return kHistPill(status); }
async function _kRenderDesktopHistory(currentIdx) {
  const el = document.getElementById('k-history'); if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const { data } = await sbL.from('kitchen_weeks').select('*').lte('week_index', currentIdx).order('week_index', { ascending: false }).limit(4);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">Past weeks will appear here.</p>'; return; }
  el.innerHTML = data.map(w => {
    const dateStr = kWeekDateRange(w.week_index);
    return `<div class="k-dsk-hist-row"><div><div class="k-dsk-hist-room">${esc(w.room)}</div><div class="k-dsk-hist-date">${dateStr}</div></div>${kHistPill(w.status, 'sm')}</div>`;
  }).join('');
}

/* ── DESKTOP ABSENCES ───────────────────────────────────── */
/* ── MOBILE MODAL POPULATORS ────────────────────────────── */
async function _populateKHistory() {
  const el = document.getElementById('k-mob-history-body'); if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const idx = kWeekIdx();
  const { data } = await sbL.from('kitchen_weeks').select('*').lte('week_index', idx).order('week_index', { ascending: false }).limit(12);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">No past weeks yet.</p>'; return; }
  el.innerHTML = data.map(w => {
    const dateStr = kWeekDateRange(w.week_index);
    const c = w.comment_count ? ` · ${w.comment_count} comment${w.comment_count !== 1 ? 's' : ''}` : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:0.5px solid var(--cc-rule);"><div><p style="font-size:13px;font-weight:500;color:var(--cc-ink);">${esc(w.room)}</p><p style="font-size:11px;color:var(--cc-taupe);">${dateStr}${c}</p></div>${_kHistPill(w.status)}</div>`;
  }).join('');
}
async function _populateKNudgeLog() {
  const el = document.getElementById('k-mob-nudgelog-body'); if (!sbL) { el.innerHTML = '<p class="cc-note">Connect Supabase.</p>'; return; }
  const { data } = await sbL.from('lounge_data').select('*').eq('type', 'kitchen_nudge').order('created_at', { ascending: false }).limit(20);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note">No nudges sent yet.</p>'; return; }
  el.innerHTML = data.map(n =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:0.5px solid var(--cc-rule);"><div><p style="font-size:13px;font-weight:500;color:var(--cc-ink);">${esc(n.body)}</p><p style="font-size:11px;color:var(--cc-taupe);">→ ${esc(n.room === 'All' ? 'All rooms' : n.room)} · ${fmtTs(new Date(n.created_at).getTime())}</p></div><button onclick="_kDeleteNudge('${n.id}',this)" style="font-size:10px;color:var(--cc-stone);background:none;border:none;cursor:pointer;">✕</button></div>`
  ).join('');
}
async function _kDeleteNudge(id, btn) {
  if (!sbL) return;
  await sbL.from('lounge_data').delete().eq('id', id);
  btn.closest('div[style]')?.remove();
}

/* ── DESKTOP NUDGE LOG (sidebar #k-issues-log) ──────────── */
async function _kRenderNudgeLog() {
  const el = document.getElementById('k-issues-log');
  if (!el) return;
  if (!sbL) { el.innerHTML = '<p class="cc-note">No nudges sent yet.</p>'; return; }
  const { data } = await sbL.from('lounge_data').select('*').eq('type', 'kitchen_nudge').order('created_at', { ascending: false }).limit(4);
  if (!data || !data.length) { el.innerHTML = '<p class="cc-note" style="font-size:10px;">No nudges sent yet.</p>'; return; }
  el.innerHTML = data.map(n => {
    const to = n.room === 'All' ? 'All rooms' : n.room;
    return `<div class="k-dsk-hist-row" style="align-items:flex-start;">
      <div style="flex:1;min-width:0;">
        <div class="k-dsk-hist-room">${esc(n.body)}</div>
        <div class="k-dsk-hist-date">→ ${esc(to)} · ${fmtTs(new Date(n.created_at).getTime())}</div>
      </div>
      <button onclick="_kDeleteNudge('${n.id}',this)" style="font-size:10px;color:var(--cc-stone);background:none;border:none;cursor:pointer;flex-shrink:0;padding:0 0 0 8px;">✕</button>
    </div>`;
  }).join('');
}

/* ── NUDGE BANNER (mobile) ──────────────────────────────── */
/* ── NUDGE NOTICE IN WEEK CARD (desktop) ─────────────────── */
async function _kRefreshNudgeNotice() {
  const noticeEl = document.getElementById('k-nudge-notice');
  const noticeText = document.getElementById('k-nudge-notice-text');
  if (!noticeEl) return;
  if (!sbL) { noticeEl.style.display = 'none'; return; }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type', 'kitchen_nudge').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (data && data.body) {
    const to = data.room === 'All' ? 'All rooms' : data.room;
    noticeText.textContent = '⚑ ' + data.body + ' → ' + to;
    noticeEl.style.display = 'flex';
  } else {
    noticeEl.style.display = 'none';
  }
}

async function _kLoadNudgeBanner() {
  if (!sbL) return;
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type', 'kitchen_nudge')
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
  const banner = document.getElementById('k-mob-nudge-banner');
  const text   = document.getElementById('k-mob-nudge-banner-text');
  const status = document.getElementById('k-mob-nudge-banner-status');
  if (!banner || !text) return;
  if (!data) { banner.style.display = 'none'; return; }
  const to = data.room === 'All' ? 'All rooms' : data.room;
  const note = data.title ? ` · ${data.title}` : '';
  text.textContent = `${data.body}${note} → ${to}`;
  // Show current week status for targeted room nudge only
  if (status) {
    if (_kWeekRow && data.room !== 'All') {
      const statusMap = { pending:'Pending', submitted:'Submitted', approved:'Approved', flagged:'Flagged', missed:'Missed', skipped:'Skipped' };
      status.textContent = statusMap[_kWeekRow.status] || '';
      status.style.display = status.textContent ? '' : 'none';
    } else {
      status.style.display = 'none';
    }
  }
  banner.style.display = 'flex';
}
function _kDismissNudgeBanner() {
  const banner = document.getElementById('k-mob-nudge-banner');
  if (banner) banner.style.display = 'none';
}

/* ── SEND HELPERS ───────────────────────────────────────── */
async function kClearChat() {
  if (!_kWeekRow) return;
  if (!confirm('Clear all messages and delete proof photos? This cannot be undone.')) return;

  // Collect all storage paths before deleting comments
  const paths = [];

  // A) kitchen_weeks.photos jsonb — first upload proof photos
  if (_kWeekRow.photos && Array.isArray(_kWeekRow.photos)) {
    _kWeekRow.photos.forEach(p => { if (p.path) paths.push(p.path); });
  }

  // B) kitchen_comments — [submission] and [photo] entries
  const comments = await _kGetComments(_kWeekRow.id);
  comments.forEach(c => {
    if (!c.text) return;
    if (c.text.startsWith('[submission] ')) {
      try {
        const data = JSON.parse(c.text.replace('[submission] ', ''));
        (data.photos || []).forEach(p => { if (p.path) paths.push(p.path); });
      } catch(e) {}
    } else if (c.text.startsWith('[photo] ')) {
      // Public URL — extract storage path after bucket name
      const url = c.text.replace('[photo] ', '').trim();
      const marker = 'kitchen-proofs/';
      const idx = url.indexOf(marker);
      if (idx !== -1) paths.push(decodeURIComponent(url.slice(idx + marker.length)));
    }
  });

  // Delete storage files first (fire and forget — don't block on storage errors)
  if (sbL && paths.length) {
    sbL.storage.from('kitchen-proofs').remove(paths).catch(e => console.warn('Storage cleanup error', e));
  }

  // Clear photos column on kitchen_weeks row
  if (sbL && _kWeekRow.photos) {
    await sbL.from('kitchen_weeks').update({ photos: null }).eq('id', _kWeekRow.id);
    _kWeekRow = { ..._kWeekRow, photos: null };
  }

  // Delete comments
  await _kDeleteComments(_kWeekRow.id);

  const mobile = window.innerWidth <= 700;
  if (mobile) await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  else        await _kRenderFeed('k-feed',     _kWeekRow, false);
}

async function _kSendDesktopMsg() {
  const input = document.getElementById('k-msg-input');
  const text  = input.value.trim(); if (!text || !_kWeekRow) return;
  input.value = '';
  await _kAddComment(_kWeekRow.id, 'Casa Castel', text, false);
  await _kRenderFeed('k-feed', _kWeekRow, false);
}

async function _kMobSendMsg() {
  const inp  = document.getElementById('k-mob-msg-input');
  const text = inp.value.trim(); if (!text || !_kWeekRow || _kMobSending) return;
  _kMobSending = true; inp.value = '';
  // Optimistic row
  const feed = document.getElementById('k-feed-mob');
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-mob-optimistic';
    tmp.innerHTML = '<div class="k-chat-avatar" style="background:var(--cc-ink);color:var(--cc-white);">MG</div>'
      + '<div style="flex:1;min-width:0;"><div class="k-chat-meta"><span class="k-chat-name" style="color:var(--cc-gold);">Casa Castel</span>'
      + '<span class="k-chat-time" style="opacity:0.5;">sending…</span></div><p class="k-chat-text">' + esc(text) + '</p></div>';
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  _kAddComment(_kWeekRow.id, 'Casa Castel', text, false).finally(() => { _kMobSending = false; });
}

/* ── PHOTO UPLOAD ───────────────────────────────────────── */
async function _kCompressImage(file, maxPx = 1280, quality = 0.80) {
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

async function _kSendPhoto(file, feedId) {
  if (!file || !_kWeekRow) { alert('No active week.'); return; }
  if (file.size > 30 * 1024 * 1024) { alert('Max 30MB.'); return; }
  const compressed = await _kCompressImage(file);
  const feed = document.getElementById(feedId);
  const localUrl = URL.createObjectURL(compressed);
  if (feed) {
    const tmp = document.createElement('div'); tmp.className = 'k-chat-row'; tmp.id = 'k-landlord-photo-optimistic';
    tmp.innerHTML = '<div class="k-chat-avatar" style="background:var(--cc-ink);color:var(--cc-white);">MG</div>'
      + '<div style="flex:1;min-width:0;"><div class="k-chat-meta"><span class="k-chat-name" style="color:var(--cc-gold);">Casa Castel</span>'
      + '<span class="k-chat-time" style="opacity:0.5;">sending…</span></div>'
      + '<div style="margin-top:5px;"><img src="' + localUrl + '" style="max-width:100%;border-radius:6px;display:block;object-fit:contain;opacity:0.7;"/></div></div>';
    feed.appendChild(tmp); scrollToBottom(feed);
  }
  const idx  = kWeekIdx();
  const path = `week-${idx}-mgmt-${Date.now()}.jpg`;
  const { error } = await sbL.storage.from('kitchen-proofs').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
  document.getElementById('k-landlord-photo-optimistic')?.remove();
  if (error) { console.error('Upload error', error); alert('Upload failed.'); return; }
  const { data } = sbL.storage.from('kitchen-proofs').getPublicUrl(path);
  await _kAddComment(_kWeekRow.id, 'Casa Castel', '[photo] ' + data.publicUrl, false);
  await _kRenderFeed('k-feed',     _kWeekRow, false);
  await _kRenderFeed('k-feed-mob', _kWeekRow, true);
}

/* ── MOBILE ACTION HANDLERS ─────────────────────────────── */
// After an action, re-render week card (chip + buttons) from fresh Supabase data.
// _kRenderMobWeekCard is async and does its own fresh fetch — no stale patch passed.
async function _kMobApplyPatch(patch) {
  _kWeekRow = { ..._kWeekRow, ...patch };
  // Pass patched row directly — no re-fetch race. Realtime fires later for authoritative sync.
  await _kRenderMobWeekCard(_kWeekRow);
  _kRenderMobRotation();
}

async function kMobApprove() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    const idx = kWeekIdx();
    const patch = { status:'approved', flagged:false, approved_at:new Date().toISOString() };
    await _kUpdateWeek(idx, patch);
    await _kAddComment(_kWeekRow.id, 'Casa Castel', '✓ Approved by landlord.', false);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
async function kMobFlag() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    const idx = kWeekIdx();
    const patch = { flagged:true, status:'flagged' };
    await _kUpdateWeek(idx, patch);
    await _kAddComment(_kWeekRow.id, 'Casa Castel', '⚑ Flagged by landlord — please re-upload your photos.', true);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
async function kMobUnapprove() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    const idx = kWeekIdx();
    const patch = { status:'submitted', flagged:false, approved_at:null };
    await _kUpdateWeek(idx, patch);
    await _kAddComment(_kWeekRow.id, 'Casa Castel', '↩ Approval undone — week back under review.', false);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
async function kMobUnflag() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    const idx = kWeekIdx();
    const patch = { flagged:false, status:'submitted' };
    await _kUpdateWeek(idx, patch);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
async function kMobReset() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    if (!confirm(`Reset week for ${_kWeekRow.room}? Marks as Missed and clears proof.`)) return;
    const idx = kWeekIdx();
    const patch = { status:'missed', photos:null, photo_path:null, photo_url:null, flagged:false, closed_at:new Date().toISOString() };
    await _kDeleteComments(_kWeekRow.id);
    await _kUpdateWeek(idx, patch);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
async function kMobReopen() {
  if (!_kWeekRow || !sbL || _kActionBusy) return; _kActionBusy = true;
  try {
    if (!confirm(`Reopen week for ${_kWeekRow.room}? They can upload proof again.`)) return;
    const idx = kWeekIdx();
    const patch = { status:'pending', flagged:false, closed_at:null };
    await _kUpdateWeek(idx, patch);
    await _kMobApplyPatch(patch);
    await _kRenderFeed('k-feed-mob', _kWeekRow, true);
  } finally { _kActionBusy = false; }
}
function kMobReminder() {
  if (!_kWeekRow) return;
  const email = tenantEmail(_kWeekRow.room);
  const name  = S.get('room_profile_' + _kWeekRow.room, {}).firstName || _kWeekRow.room;
  window.location.href = buildMailto(email, 'Casa Castel Kitchen — Proof required',
    `Hi ${name},\n\nPlease clean the kitchen and upload your proof in the app.\n\nCasa Castel`);
}

/* ── PHOTO MODAL ────────────────────────────────────────── */
function openPhotoModal(url, label) {
  document.getElementById('k-photo-modal-img').src = url;
  document.getElementById('k-photo-modal-label').textContent = label || '';
  document.getElementById('k-photo-modal').classList.add('visible');
}
function closePhotoModal() {
  document.getElementById('k-photo-modal').classList.remove('visible');
  document.getElementById('k-photo-modal-img').src = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePhotoModal(); });

/* ── MAIN INIT — MOBILE ─────────────────────────────────── */
async function initKitchenMobile() {
  if (typeof loadRoomsData === 'function') await loadRoomsData();
  // Step 1: instant skeleton (no DB yet)
  await _kRenderMobWeekCard(_kWeekRow);

  const idx  = kWeekIdx(new Date());
  const info = _kWeekInfo(Math.max(0, idx));

  // Load kitchen room config from Supabase
  await loadKitchenRoomsFromSupabase();
  // Re-render room buttons now that kitchenRooms is loaded
  _kRefreshNudgeRoomButtons();

  // Step 2: fetch weekRow + rotation in parallel
  const [, weekRowFresh] = await Promise.all([
    _kRenderMobRotation(),
    _kGetWeek(idx)
  ]);

  let weekRow = weekRowFresh;
  if (!weekRow) {
    const { data } = await sbL.from('kitchen_weeks').insert({ week_index: idx, room: info.room, status: 'pending' }).select().single();
    weekRow = data || (await _kGetWeek(idx));
  }
  _kWeekRow = weekRow;
  await _kRenderMobWeekCard(_kWeekRow);

  // Step 3: feed
  await _kRenderFeed('k-feed-mob', _kWeekRow, true);

  // Step 4: nudge banner
  await _kLoadNudgeBanner();

  // Step 5: realtime
  _kSubscribe(idx);
}

/* ── MAIN INIT — DESKTOP ────────────────────────────────── */
async function initKitchen() {
  if (typeof loadRoomsData === 'function') await loadRoomsData();
  await loadKitchenRoomsFromSupabase();
  // Re-render room buttons now that kitchenRooms is loaded from Supabase
  _kRefreshNudgeRoomButtons();

  const idx  = kWeekIdx(new Date());
  const info = _kWeekInfo(Math.max(0, idx));
  const pad  = n => String(n).padStart(2, '0');
  const fmtDt = dt => `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;

  document.getElementById('k-current-room').textContent = info.room;
  document.getElementById('k-dates').textContent = idx < 0
    ? 'Starts ' + fmtDt(info.start)
    : fmtDt(info.start) + ' – ' + fmtDt(info.end);

  if (!sbL) {
    document.getElementById('k-feed').innerHTML = '<p class="cc-note">Connect Supabase to see proof feed.</p>';
    document.getElementById('k-history').innerHTML = '<p class="cc-note">History available once Supabase is connected.</p>';
    return;
  }
  if (idx < 0) { _kRenderDesktopRotation(0, info); return; }

  _kAutoReset(idx);

  const [, weekRowRaw] = await Promise.all([
    _kRenderDesktopRotation(idx, info),
    _kGetWeek(idx)
  ]);

  let weekRow = weekRowRaw;
  if (!weekRow) {
    const { data, error } = await sbL.from('kitchen_weeks').insert({ week_index: idx, room: info.room, status: 'pending' }).select().single();
    weekRow = error ? (await _kGetWeek(idx)) : data;
  }
  _kWeekRow = weekRow;

  const [comments] = await Promise.all([
    _kGetComments(weekRow.id),
    _kRenderDesktopHistory(idx)
  ]);
  await _kRenderLandlordButtons();
  await _kRenderFeed('k-feed', weekRow, false);
  _kRenderNudgeLog();

  // Check active nudge notice in week card
  await _kRefreshNudgeNotice();

  // Wire desktop action buttons (clone to remove stale listeners)
  const rewire = (id, fn) => {
    const old = document.getElementById(id); if (!old) return;
    const fresh = old.cloneNode(true); old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', fn);
  };
  rewire('k-approve-btn', async () => {
    if (!confirm('Approve this week?')) return;
    await _kUpdateWeek(idx, { status:'approved', flagged:false, approved_at:new Date().toISOString() });
    await _kAddComment(_kWeekRow.id, 'Casa Castel', '✓ Approved by landlord.', false);
    _kWeekRow = await _kGetWeek(idx); await _kRenderLandlordButtons(); await _kRenderFeed('k-feed', _kWeekRow, false); _kRenderDesktopHistory(idx);
  });
  rewire('k-unapprove-btn', async () => {
    if (!confirm('Undo approval? Tenant keeps their photos.')) return;
    await _kUpdateWeek(idx, { status:'submitted', flagged:false, approved_at:null });
    await _kAddComment(_kWeekRow.id, 'Casa Castel', '↩ Approval undone — week back under review.', false);
    _kWeekRow = await _kGetWeek(idx); await _kRenderLandlordButtons(); await _kRenderFeed('k-feed', _kWeekRow, false); _kRenderDesktopHistory(idx);
  });
  rewire('k-flag-btn', async () => {
    const nowFlagged = _kWeekRow.status !== 'flagged';
    const patch = nowFlagged ? { flagged:true, status:'flagged' } : { flagged:false, status:'submitted' };
    await _kUpdateWeek(idx, patch);
    if (nowFlagged) await _kAddComment(_kWeekRow.id, 'Casa Castel', '⚑ Flagged by landlord — please re-upload your photos.', true);
    _kWeekRow = await _kGetWeek(idx); await _kRenderLandlordButtons(); await _kRenderFeed('k-feed', _kWeekRow, false);
  });
  rewire('k-reminder-btn', async () => {
    const email = tenantEmail(_kWeekRow.room);
    const name  = S.get('room_profile_' + _kWeekRow.room, {}).firstName || _kWeekRow.room;
    window.location.href = buildMailto(email, 'Casa Castel Kitchen — Proof required',
      `Hi ${name},\n\nWe noticed no proof photo was uploaded for your kitchen cleaning week.\n\nPlease clean and upload your proof in the app.\n\nCasa Castel`);
    await _kUpdateWeek(idx, { reminder_sent: true });
  });
  rewire('k-reset-btn', async () => {
    if (_kWeekRow.status === 'missed') {
      if (!confirm(`Reopen week for ${_kWeekRow.room}?`)) return;
      await _kUpdateWeek(idx, { status:'pending', flagged:false, closed_at:null });
    } else {
      if (!confirm(`Reset week for ${_kWeekRow.room}? Marks as Missed and clears all proof.`)) return;
      await _kDeleteComments(_kWeekRow.id);
      await _kUpdateWeek(idx, { status:'missed', photos:null, photo_path:null, photo_url:null, flagged:false, closed_at:new Date().toISOString() });
    }
    _kWeekRow = await _kGetWeek(idx); await _kRenderLandlordButtons(); await _kRenderFeed('k-feed', _kWeekRow, false); _kRenderDesktopHistory(idx);
  });
  rewire('k-msg-send', () => _kSendDesktopMsg());
  const kMsgInput = document.getElementById('k-msg-input');
  if (kMsgInput) {
    const fi = kMsgInput.cloneNode(true); kMsgInput.parentNode.replaceChild(fi, kMsgInput);
    fi.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _kSendDesktopMsg(); } });
  }

  _kSubscribe(idx);
}

/* ── REALTIME SUBSCRIPTION ──────────────────────────────── */
function _kSubscribe(idx) {
  if (_kChannel) { sbL.removeChannel(_kChannel); _kChannel = null; }
  _kChannel = sbL.channel('kitchen-landlord-rt')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kitchen_weeks' }, async payload => {
      if (!_kWeekRow) return;
      // Only re-render if the expected status differs from what we already have.
      // This prevents the UPDATE handler from overwriting the INSERT handler's correct render.
      const expectedStatus = payload.new?.status;
      if (expectedStatus && expectedStatus === _kWeekRow.status) return; // already correct, skip
      const fresh = await _kGetWeek(idx);
      if (!fresh) return;
      if (fresh.status === _kWeekRow.status) return; // fetch still stale, skip — INSERT handler has correct state
      _kWeekRow = fresh;
      const mobile = window.innerWidth <= 700;
      if (mobile) {
        await _kRenderMobWeekCard(_kWeekRow);
        await _kRenderFeed('k-feed-mob', _kWeekRow, true);
        _kRenderMobRotation();
      } else {
        await _kRenderLandlordButtons();
        await _kRenderFeed('k-feed', _kWeekRow, false);
        _kRenderDesktopHistory(idx);
        _kRenderDesktopRotation(idx, kWeekInfo(Math.max(0, idx)));
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kitchen_comments' }, async payload => {
      if (!payload.new || !_kWeekRow) return;
      if (payload.new.week_id && payload.new.week_id !== _kWeekRow.id) return;
      const mobile = window.innerWidth <= 700;
      const text = payload.new.text || '';

      // [submission] comment = tenant just re-uploaded.
      // Force _kWeekRow to submitted immediately — no DB fetch, no race condition.
      // Parse the payload to get reupload_count increment and photo data.
      if (text.startsWith('[submission]')) {
        let isReupload = false;
        try {
          const data = JSON.parse(text.replace('[submission] ', ''));
          isReupload = !!data.isReupload;
        } catch(e) {}
        // Force status to submitted on _kWeekRow right now
        _kWeekRow = {
          ..._kWeekRow,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          flagged: false,
          ...(isReupload ? { reupload_count: (_kWeekRow.reupload_count || 0) + 1 } : {}),
        };
        if (mobile) {
          await _kRenderMobWeekCard(_kWeekRow);
        } else {
          await _kRenderLandlordButtons();
        }
      }

      await _kRenderFeed(mobile ? 'k-feed-mob' : 'k-feed', _kWeekRow, mobile);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_absences' }, async () => {
      const mobile = window.innerWidth <= 700;
      if (mobile) { _kRenderMobRotation(); }
      else        { const idx = kWeekIdx(); _kRenderDesktopRotation(idx, kWeekInfo(Math.max(0, idx))); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lounge_data' }, async payload => {
      const t = payload.new?.type || payload.old?.type;
      const isDelete = payload.eventType === 'DELETE' || (!payload.new?.id && payload.old?.id);
      // Kitchen config changed — update kitchenRooms[] in memory and re-render
      if (t === 'kitchen_config' && payload.new?.body) {
        _applyKitchenConfig(payload.new.body);
        const mobile = window.innerWidth <= 700;
        if (mobile) { await _kRenderMobWeekCard(_kWeekRow); await _kRenderMobRotation(); }
        else        { _kRenderDesktopRotation(idx, _kWeekInfo(Math.max(0, idx))); }
      }
      const isNudge = t === 'kitchen_nudge' || isDelete;
      if (isNudge) {
        _kLoadNudgeBanner();
        const mobile = window.innerWidth <= 700;
        if (!mobile) {
          _kRenderNudgeLog();
          _kRefreshNudgeNotice();
        }
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, async payload => {
      // Vacancy change — refresh appRooms and re-render week card + strip
      if (typeof loadRoomsData === 'function') await loadRoomsData();
      const mobile = window.innerWidth <= 700;
      if (mobile) {
        await _kRenderMobWeekCard(_kWeekRow);
        await _kRenderMobRotation();
      } else {
        await _kRenderLandlordButtons();
        _kRenderDesktopRotation(idx, _kWeekInfo(Math.max(0, idx)));
      }
    })
    .subscribe();
}

/* ── NUDGE PANEL WIRING ─────────────────────────────────── */

// Re-renders room buttons in nudge panel after kitchenRooms loads from Supabase.
// Called from initKitchen() after loadKitchenRoomsFromSupabase().
function _kRefreshNudgeRoomButtons() {
  const rooms = getKitchenRooms();
  const toGrid = document.getElementById('k-to-grid');
  if (toGrid) {
    // Keep the "All rooms" button, replace the rest
    const allBtn = toGrid.querySelector('.issue-to-btn[data-to="All"]');
    toGrid.innerHTML = '';
    if (allBtn) toGrid.appendChild(allBtn);
    rooms.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'issue-to-btn';
      btn.dataset.to = r;
      btn.textContent = r;
      toGrid.appendChild(btn);
    });
    // Re-attach listeners
    toGrid.querySelectorAll('.issue-to-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toGrid.querySelectorAll('.issue-to-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected'); _kSelTo = btn.dataset.to; _kUpdateNudgeEmailBtn();
      });
    });
  }
  // Also refresh mobile nudge modal room row
  const mobToRow = document.getElementById('k-mob-nudge-to-row');
  if (mobToRow) {
    const allMob = mobToRow.querySelector('.k-mob-n-chip[data-to="All"]');
    mobToRow.innerHTML = '';
    if (allMob) mobToRow.appendChild(allMob);
    rooms.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'k-mob-n-chip';
      btn.style.cssText = 'padding:10px 0;text-align:center;';
      btn.dataset.to = r;
      btn.textContent = r;
      mobToRow.appendChild(btn);
    });
    mobToRow.querySelectorAll('.k-mob-n-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        mobToRow.querySelectorAll('.k-mob-n-chip').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }
}

(function _wireNudgePanel() {
  // Desktop nudge panel
  document.querySelectorAll('#k-type-grid .issue-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#k-type-grid .issue-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); _kSelType = btn.dataset.type; _kUpdateNudgeEmailBtn();
    });
  });
  document.querySelectorAll('#k-to-grid .issue-to-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#k-to-grid .issue-to-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); _kSelTo = btn.dataset.to; _kUpdateNudgeEmailBtn();
    });
  });
  document.getElementById('k-issue-note')?.addEventListener('input', _kUpdateNudgeEmailBtn);
  document.getElementById('k-post-btn')?.addEventListener('click', async () => {
    if (!_kSelType || !_kSelTo) { alert('Select a problem and who it is for.'); return; }
    if (!sbL) { alert('Supabase not connected.'); return; }
    const note = document.getElementById('k-issue-note').value.trim();
    await sbL.from('lounge_data').delete().eq('type', 'kitchen_nudge');
    await sbL.from('lounge_data').insert({ type: 'kitchen_nudge', room: _kSelTo, body: _kSelType, title: note || null });
    document.getElementById('k-issue-note').value = '';
    document.querySelectorAll('#k-type-grid .issue-type-btn, #k-to-grid .issue-to-btn').forEach(b => b.classList.remove('selected'));
    _kSelType = null; _kSelTo = null; _kRenderNudgeLog(); _kRefreshNudgeNotice();
  });

  // Mobile nudge modal
  document.querySelectorAll('#k-mob-nudge-type-row .k-mob-n-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#k-mob-nudge-type-row .k-mob-n-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  document.querySelectorAll('#k-mob-nudge-to-row .k-mob-n-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#k-mob-nudge-to-row .k-mob-n-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  document.getElementById('k-mob-nudge-send-btn')?.addEventListener('click', async () => {
    const typeBtn = document.querySelector('#k-mob-nudge-type-row .k-mob-n-chip.selected');
    const toBtn   = document.querySelector('#k-mob-nudge-to-row .k-mob-n-chip.selected');
    const sendBtn = document.getElementById('k-mob-nudge-send-btn');
    if (!typeBtn || !toBtn) { sendBtn.textContent = 'Select type & room first'; sendBtn.style.background = '#A32D2D'; setTimeout(() => { sendBtn.textContent = 'Send nudge'; sendBtn.style.background = ''; }, 1500); return; }
    if (!sbL) return;
    const note = document.getElementById('k-mob-nudge-note').value.trim();
    await sbL.from('lounge_data').delete().eq('type', 'kitchen_nudge');
    await sbL.from('lounge_data').insert({ type: 'kitchen_nudge', room: toBtn.dataset.to, body: typeBtn.dataset.type, title: note || null });
    document.querySelectorAll('#k-mob-nudge-type-row .k-mob-n-chip, #k-mob-nudge-to-row .k-mob-n-chip').forEach(b => b.classList.remove('selected'));
    document.getElementById('k-mob-nudge-note').value = '';
    kitchenCloseModal('nudge');
  });
})();

function _kUpdateNudgeEmailBtn() {
  if (!_kSelType || !_kSelTo) return;
  const to   = _kSelTo === 'All' ? getKitchenRooms().map(r => tenantEmail(r)).filter(Boolean).join(',') : tenantEmail(_kSelTo);
  const note = document.getElementById('k-issue-note')?.value.trim() || '';
  const name = _kSelTo === 'All' ? '' : (S.get('room_profile_' + _kSelTo, {}).firstName || _kSelTo);
  const el   = document.getElementById('k-email-btn');
  if (el) el.href = buildMailto(to, 'Casa Castel Kitchen — ' + _kSelType,
    `Hi${_kSelTo === 'All' ? '' : ' ' + name},\n\n${_kSelType}${note ? '\n\n' + note : ''}\n\nCasa Castel`);
}

/* ── WIRE MOBILE SEND + PHOTO ───────────────────────────── */
(function _wireMobSend() {
  const mobInput  = document.getElementById('k-mob-msg-input');
  const mobPhoto  = document.getElementById('k-mob-photo-btn');
  const mobFile   = document.getElementById('k-mob-photo-file');
  const deskPhoto = document.getElementById('k-desk-photo-btn');
  const deskFile  = document.getElementById('k-desk-photo-file');

  mobInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _kMobSendMsg(); } });

  mobPhoto?.addEventListener('click', () => mobFile?.click());
  mobFile?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    mobFile.value = ''; mobPhoto.style.opacity = '0.5';
    await _kSendPhoto(file, 'k-feed-mob');
    mobPhoto.style.opacity = '';
  });

  deskPhoto?.addEventListener('click', () => deskFile?.click());
  deskFile?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    deskFile.value = ''; deskPhoto.style.opacity = '0.5';
    await _kSendPhoto(file, 'k-feed');
    deskPhoto.style.opacity = '';
  });

  /* ── PWA KEYBOARD FIX ───────────────────────────────────
     wireComposeBlur is defined in chat-viewport.js.
     This is the fix that was MISSING in v1 for kitchen chat.
     It replaces the aggressive scrollTo(0,0) on every blur
     with a keyboard-state-aware reset that only fires when
     the keyboard is confirmed closed (300ms + visualViewport check).
     Combined with initChatViewport() covering tab-kitchen in
     layout.js, this eliminates the white-space-below-keyboard bug.
  ─────────────────────────────────────────────────────────── */
  wireComposeBlur(mobInput);
})();
