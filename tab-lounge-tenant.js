/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — TENANT LOUNGE TAB
   js/tab-lounge-tenant.js

   Tenant Lounge: read announcements + notice, send/receive chat.
   No compose, no delete, no reset — read + send own messages only.
   Depends on: constants.js, utils.js, supabase-client.js,
               chat-viewport.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-lounge').innerHTML = `

  <!-- Mobile: ann strip + notice strip + chat — hidden on desktop via CSS -->
  <div class="l-ann-strip">
    <div id="ann-list"><p class="cc-note" style="padding:4px 0;">No announcement yet.</p></div>
  </div>

  <div class="l-notice-strip" id="notice-strip">
    <span class="l-notice-icon">ⓘ</span>
    <span class="l-notice-text" id="notice-strip-text"></span>
  </div>

  <div class="l-chat">
    <div class="l-chat-hdr">
      <span class="l-chat-lbl">House chat</span>
      <button class="l-chat-tlink" id="lounge-refresh-btn">↺ Refresh</button>
    </div>
    <div class="l-feed" id="lounge-feed">
      <p class="cc-note" style="padding:8px 0 4px;">No messages yet. Say hello 👋</p>
    </div>
    <div class="l-compose">
      <input class="l-compose-input" id="lounge-input" type="text" placeholder="Message the house…"/>
      <button class="l-compose-send" id="lounge-send">↑</button>
    </div>
  </div>

  <!-- Desktop 2-column layout — hidden on mobile via CSS -->
  <div class="l-desktop-grid">

    <!-- Left column: announcement + notice (read-only) -->
    <div class="l-desktop-left">

      <div class="l-dsk-section">
        <div class="l-dsk-section-hdr">
          <span class="l-dsk-section-lbl">Announcement</span>
        </div>
        <div id="ann-list-desktop"><p class="cc-note" style="padding:4px 0;">No announcement yet.</p></div>
      </div>

      <div class="l-dsk-section" style="border-bottom:none;">
        <div class="l-dsk-section-hdr">
          <span class="l-dsk-section-lbl">Notice</span>
        </div>
        <div id="notice-display-desktop"><p class="cc-note" style="padding:4px 0;">No notice posted.</p></div>
      </div>

    </div><!-- /.l-desktop-left -->

    <!-- Right column: chat -->
    <div class="l-desktop-right">
      <div class="l-dsk-chat-hdr">
        <span class="l-dsk-chat-lbl">House chat</span>
        <button class="l-dsk-chat-link" id="lounge-refresh-btn-desktop">↺ Refresh</button>
      </div>
      <div class="l-feed" id="lounge-feed-desktop">
        <p class="cc-note" style="padding:8px 0 4px;">No messages yet. Say hello 👋</p>
      </div>
      <div class="compose-bar">
        <textarea class="compose-input" id="lounge-input-desktop" placeholder="Message the house…" rows="1"></textarea>
        <button class="compose-send" id="lounge-send-desktop">↑</button>
      </div>
    </div><!-- /.l-desktop-right -->

  </div><!-- /.l-desktop-grid -->
`

/* ── STATE ──────────────────────────────────────────────── */
let _loungeSub = null;

/* ── ANNOUNCEMENTS ──────────────────────────────────────── */
async function loadAnnouncements() {
  const el = document.getElementById('ann-list'); if (!el) return;
  if (!sbL) { el.innerHTML = '<p class="cc-note" style="padding:4px 0;">—</p>'; return; }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type','announcement').order('created_at',{ascending:false}).limit(1).maybeSingle();
  _renderAnn(data);
}

function _renderAnn(data) {
  const emptyHtml = '<p class="cc-note" style="padding:4px 0;">No announcement yet.</p>';
  const annHtml = !data ? emptyHtml : `
    <div class="ann-card${data.pinned ? ' ann-card--pinned' : ''}">
      <div class="ann-top">
        ${data.pinned ? '<span class="ann-pin">Pinned</span>' : '<span></span>'}
        <span class="ann-date">${fmtTs(new Date(data.created_at).getTime())}</span>
      </div>
      <p class="ann-from">Casa Castel</p>
      ${data.title ? `<p class="ann-title-text">${esc(data.title)}</p>` : ''}
      <p class="ann-body-text">${esc(data.body)}</p>
    </div>`;
  const el    = document.getElementById('ann-list');
  const elDsk = document.getElementById('ann-list-desktop');
  if (el)    el.innerHTML    = annHtml;
  if (elDsk) elDsk.innerHTML = annHtml;
}

/* ── NOTICE ─────────────────────────────────────────────── */
async function loadNotice() {
  const strip  = document.getElementById('notice-strip');
  const dskEl  = document.getElementById('notice-display-desktop');
  const cols = {
    yellow: { bg:'#FEFCE8', bd:'#EAD96B', tx:'#78640A', ic:'#A0860E' },
    green:  { bg:'#F0FDF4', bd:'#86EFAC', tx:'#14532D', ic:'#16A34A' },
    red:    { bg:'#FFF1F2', bd:'#FECDD3', tx:'#9F1239', ic:'#E11D48' },
  };
  if (!sbL) {
    if (strip) strip.className = 'l-notice-strip';
    if (dskEl) dskEl.innerHTML = '<p class="cc-note" style="padding:4px 0;">No notice posted.</p>';
    return;
  }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type','notice').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if (data && data.body) {
    if (strip) {
      document.getElementById('notice-strip-text').textContent = data.body;
      strip.className = 'l-notice-strip visible ' + (data.color || 'yellow');
    }
    if (dskEl) {
      const c   = data.color || 'yellow';
      const col = cols[c] || cols.yellow;
      dskEl.innerHTML = `<div style="background:${col.bg};border:0.5px solid ${col.bd};border-radius:var(--cc-r-md);padding:9px 12px;display:flex;align-items:flex-start;gap:8px;">
        <span style="font-size:13px;color:${col.ic};flex-shrink:0;">ⓘ</span>
        <span style="font-size:12px;font-weight:300;color:${col.tx};flex:1;line-height:1.5;">${esc(data.body)}</span>
      </div>`;
    }
  } else {
    if (strip) strip.className = 'l-notice-strip';
    if (dskEl) dskEl.innerHTML = '<p class="cc-note" style="padding:4px 0;">No notice posted.</p>';
  }
}

/* ── CHAT ───────────────────────────────────────────────── */
async function loadLounge(room) {
  const feed    = document.getElementById('lounge-feed');
  const feedDsk = document.getElementById('lounge-feed-desktop');
  const empty   = '<p class="cc-note" style="padding:8px 0 4px;">No messages yet. Say hello 👋</p>';
  if (!sbL) {
    if (feed)    feed.innerHTML    = empty;
    if (feedDsk) feedDsk.innerHTML = empty;
    return;
  }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type','message').order('created_at',{ascending:true}).limit(100);
  const html = (!data || !data.length) ? empty : data.map(m => _msgHtml(m, room)).join('');
  if (feed)    { feed.innerHTML    = html; scrollToBottom(feed); }
  if (feedDsk) { feedDsk.innerHTML = html; scrollToBottom(feedDsk); }
}

function _msgHtml(m, currentRoom) {
  const isCC  = m.room === 'Casa Castel';
  const isMe  = m.room === currentRoom;
  return `<div class="msg-row">
    <div class="msg-avatar${isCC ? ' msg-avatar--mgmt' : ''}">${roomInitials(m.room)}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name${isCC ? ' msg-name--mgmt' : ''}">${esc(m.room)}</span>
        <span class="msg-time">${fmtTs(new Date(m.created_at).getTime())}</span>
      </div>
      <p class="msg-text">${parseMsg(m.body, currentRoom)}</p>
    </div>
  </div>`;
}

async function sendLounge(room, inputId) {
  if (!sbL || !room) return;
  const input = document.getElementById(inputId || 'lounge-input');
  if (!input) return;
  const text = input.value.trim(); if (!text) return;
  input.value = '';
  await sbL.from('lounge_data').insert({ type:'message', room, body:text });
  loadLounge(room);
}

/* ── REALTIME ───────────────────────────────────────────── */
function subscribeLounge(room) {
  if (!sbL || _loungeSub) return;
  _loungeSub = sbL.channel('lounge-tenant')
    .on('postgres_changes', { event:'*', schema:'public', table:'lounge_data' }, payload => {
      const r = payload.new || {};
      loadLounge(room);
      loadNotice();
      loadAnnouncements();
      if (r.type === 'hc_done') loadHouseCleaning?.(room);
    })
    .subscribe();
}

/* ── EVENT WIRING (called after showApp sets currentRoom) ── */
function initLoungeTab(room) {
  // Mobile wiring
  document.getElementById('lounge-send')
    ?.addEventListener('click', () => sendLounge(room, 'lounge-input'));
  document.getElementById('lounge-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendLounge(room, 'lounge-input'); }});
  document.getElementById('lounge-refresh-btn')
    ?.addEventListener('click', () => loadLounge(room));

  // Desktop wiring
  document.getElementById('lounge-send-desktop')
    ?.addEventListener('click', () => sendLounge(room, 'lounge-input-desktop'));
  document.getElementById('lounge-input-desktop')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLounge(room, 'lounge-input-desktop'); }});
  document.getElementById('lounge-refresh-btn-desktop')
    ?.addEventListener('click', () => loadLounge(room));

  // v2 keyboard fix
  wireComposeBlur(document.getElementById('lounge-input'));

  loadAnnouncements();
  loadNotice();
  loadLounge(room);
  subscribeLounge(room);
}

/* ── loadLoungeAll alias — called by switchTab on tab switch ── */
function loadLoungeAll() {
  if (typeof currentRoom !== 'undefined' && currentRoom) {
    loadAnnouncements();
    loadNotice();
    loadLounge(currentRoom);
  }
}
