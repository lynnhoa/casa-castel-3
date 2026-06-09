/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — UTILS
   js/utils.js

   Pure functions only. No DOM access. No side effects.
   Depends on: constants.js
   ───────────────────────────────────────────────────────────── */

/* ── STRING HELPERS ─────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function roomInitials(r) {
  const w = r.split(' ');
  return w.length > 1 ? w[0][0] + w[1][0] : r.slice(0, 2).toUpperCase();
}

/* ── DATE / TIME ────────────────────────────────────────── */
function fmtTs(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function fmtDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
}

/* ── KITCHEN WEEK CALC ──────────────────────────────────── */
/* Completely independent Mon–Sun weeks from K_START.
   Kitchen rotation (London, Copenhagen, Stockholm, Oslo)
   cycles over KITCHEN_ROOMS independently from HC rotation. */
const _K_DAY = 24 * 60 * 60 * 1000;

function kWeekIdx(d) {
  const now = d || new Date();
  if (now < K_START) return -1;
  return Math.floor((now - K_START) / (7 * _K_DAY));
}

function kWeekInfo(i) {
  if (i < 0) return null;
  const room  = K_ROTATION[i % K_ROTATION.length];
  const start = new Date(K_START.getTime() + i * 7 * _K_DAY);
  const end   = new Date(start.getTime() + 6 * _K_DAY);
  end.setHours(23, 59, 59, 999);
  const daysLeft = Math.max(0, Math.ceil((end - new Date()) / _K_DAY));
  return { room, start, end, daysLeft, i, dateRange: fmtDate(start) + ' – ' + fmtDate(end) };
}

/* ── HOUSE CLEANING MONTH CALC ──────────────────────────── */
function currentMonthRoomIdx() {
  const now = new Date();
  const months = (now.getFullYear() - HC_START.getFullYear()) * 12
               + (now.getMonth() - HC_START.getMonth());
  return ((months % ALL_ROOMS.length) + ALL_ROOMS.length) % ALL_ROOMS.length;
}

/* ── TENANT CONTACT ─────────────────────────────────────── */
function tenantEmail(room) {
  try {
    const profile = JSON.parse(localStorage.getItem('cc_room_' + room) || '{}');
    return profile.email || '';
  } catch { return ''; }
}

function allTenantEmails() {
  return ALL_ROOMS.map(r => tenantEmail(r)).filter(Boolean).join(',');
}

function buildMailto(to, subject, body) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ── MENTION PARSER ─────────────────────────────────────── */
function parseMsg(text) {
  let s = esc(text);
  ALL_ROOMS.concat(['Casa Castel']).forEach(r => {
    const tag = '@' + r;
    s = s.replace(
      new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      `<span class="msg-mention">${tag}</span>`
    );
  });
  return s;
}

/* ── SCROLL TO BOTTOM ───────────────────────────────────── */
/* Reliable iOS-safe scroll. Replaces all feed.scrollTop=feed.scrollHeight */
function scrollToBottom(feedEl, tries = 3) {
  if (!feedEl) return;
  feedEl.scrollTop = feedEl.scrollHeight;
  let n = 0;
  const retry = () => {
    if (n++ >= tries) return;
    requestAnimationFrame(() => {
      feedEl.scrollTop = feedEl.scrollHeight;
      retry();
    });
  };
  retry();
}
