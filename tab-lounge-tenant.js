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

  <!-- Announcement strip -->
  <div class="l-ann-strip">
    <div id="ann-list">
      <p class="cc-note" style="padding:4px 0;">No announcement yet.</p>
    </div>
  </div>

  <!-- Notice strip (shown when landlord posts a notice) -->
  <div class="l-notice-strip" id="notice-strip">
    <span class="l-notice-icon" id="notice-strip-icon">ℹ</span>
    <span class="l-notice-text" id="notice-strip-text"></span>
  </div>

  <!-- Chat -->
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
`;

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
  const el = document.getElementById('ann-list'); if (!el) return;
  if (!data) { el.innerHTML = '<p class="cc-note" style="padding:4px 0;">No announcement yet.</p>'; return; }
  el.innerHTML = `
    <div class="ann-card${data.pinned ? ' ann-card--pinned' : ''}">
      <div class="ann-top">
        ${data.pinned ? '<span class="ann-pin">Pinned</span>' : '<span></span>'}
        <span class="ann-date">${fmtTs(new Date(data.created_at).getTime())}</span>
      </div>
      <p class="ann-from">Casa Castel</p>
      ${data.title ? `<p class="ann-title-text">${esc(data.title)}</p>` : ''}
      <p class="ann-body-text">${esc(data.body)}</p>
    </div>`;
}

/* ── NOTICE ─────────────────────────────────────────────── */
async function loadNotice() {
  const strip = document.getElementById('notice-strip'); if (!strip) return;
  if (!sbL) { strip.className = 'l-notice-strip'; return; }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type','notice').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if (data && data.body) {
    document.getElementById('notice-strip-text').textContent = data.body;
    strip.className = 'l-notice-strip visible ' + (data.color || 'yellow');
  } else {
    strip.className = 'l-notice-strip';
  }
}

/* ── CHAT ───────────────────────────────────────────────── */
async function loadLounge(room) {
  const feed = document.getElementById('lounge-feed'); if (!feed) return;
  if (!sbL) { feed.innerHTML = '<p class="cc-note" style="padding:8px 0 4px;">No messages yet. Say hello 👋</p>'; return; }
  const { data } = await sbL.from('lounge_data').select('*')
    .eq('type','message').order('created_at',{ascending:true}).limit(100);
  if (!data || !data.length) {
    feed.innerHTML = '<p class="cc-note" style="padding:8px 0 4px;">No messages yet. Say hello 👋</p>';
    return;
  }
  feed.innerHTML = data.map(m => _msgHtml(m, room)).join('');
  scrollToBottom(feed);
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

async function sendLounge(room) {
  if (!sbL || !room) return;
  const input = document.getElementById('lounge-input');
  const text  = input.value.trim(); if (!text) return;
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
  document.getElementById('lounge-send')
    ?.addEventListener('click', () => sendLounge(room));
  document.getElementById('lounge-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendLounge(room); }});
  document.getElementById('lounge-refresh-btn')
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
