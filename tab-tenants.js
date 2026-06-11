/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — LANDLORD TENANTS TAB
   js/tab-tenants.js

   Tenant profiles (name, email, birthday), vacancy + kitchen
   status (read-only, derived from rooms table via appRooms),
   password reset, birthday auto-notice.

   Profiles stored in Supabase: lounge_data type='room_profile'
   room=name body=JSON {firstName,lastName,birthday,email}
   Depends on: constants.js, utils.js, storage.js, supabase-client.js
   ───────────────────────────────────────────────────────────── */

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-tenants').innerHTML = `
  <h1 class="cc-h1 cc-mb-24">Tenants</h1>
  <div class="cc-section" style="padding-top:0;">
    <div id="tenants-list"></div>
  </div>
`;

/* ── PROFILE — SUPABASE ─────────────────────────────────── */
// Cache: { [room]: {firstName,lastName,birthday,email} }
let _tenantProfiles = {};

async function _loadTenantProfiles() {
  if (!sbL) return;
  const { data } = await sbL.from('lounge_data')
    .select('room,body')
    .eq('type', 'room_profile');
  if (!data) return;
  _tenantProfiles = {};
  data.forEach(row => {
    try { _tenantProfiles[row.room] = JSON.parse(row.body); } catch(e) {}
  });
}

async function saveRoomProfile(room, field, value) {
  // Update local cache immediately
  if (!_tenantProfiles[room]) _tenantProfiles[room] = {};
  _tenantProfiles[room][field] = value;

  // Persist to Supabase — upsert by deleting then inserting
  if (sbL) {
    const body = JSON.stringify(_tenantProfiles[room]);
    await sbL.from('lounge_data').delete().eq('type', 'room_profile').eq('room', room);
    await sbL.from('lounge_data').insert({ type: 'room_profile', room, body });
  }

  if (field === 'birthday') {
    if (!value.trim()) _clearBirthdayNoticeIfNone();
    else               checkBirthdays();
  }
}

function _getProfile(room) {
  // Supabase wins — localStorage used only as migration fallback for fields not yet in Supabase
  const supa = _tenantProfiles[room] || {};
  const local = (() => {
    try { return JSON.parse(localStorage.getItem('cc_room_profile_' + room) || '{}'); } catch { return {}; }
  })();
  return { ...local, ...supa };
}

/* ── BIRTHDAY AUTO-NOTICE ────────────────────────────────── */
async function checkBirthdays() {
  if (!sbL) return;
  const today = new Date();
  const dd = String(today.getDate()).padStart(2,'0');
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const yyyy = today.getFullYear();
  const dedup = 'cc_bday_sent_' + yyyy + '_' + mm + '_' + dd;
  const msgs = [];

  const rooms = (typeof appRooms !== 'undefined' && appRooms.length)
    ? appRooms.map(r => r.name)
    : ALL_ROOMS;

  rooms.forEach(room => {
    const p = _getProfile(room);
    if (!p.birthday) return;
    const b = p.birthday.trim();
    const dot = b.match(/^(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?$/);
    const iso = b.match(/^\d{4}-(\d{2})-(\d{2})$/);
    let bDay, bMon;
    if (dot)      { bDay = dot[1].padStart(2,'0'); bMon = dot[2].padStart(2,'0'); }
    else if (iso) { bMon = iso[1]; bDay = iso[2]; }
    else return;
    if (bDay === dd && bMon === mm) {
      const name = p.firstName || room;
      msgs.push('Happy Birthday' + (name ? ', ' + name : '') + ' 🎉🥳');
    }
  });

  if (!msgs.length) { localStorage.removeItem(dedup); return; }
  if (localStorage.getItem(dedup)) return;
  localStorage.setItem(dedup, '1');
  await sbL.from('lounge_data').delete().eq('type','notice');
  await sbL.from('lounge_data').insert({ type:'notice', body:msgs.join(' · '), color:'green' });
  loadNotice?.();
}

async function _clearBirthdayNoticeIfNone() {
  if (!sbL) return;
  const today = new Date();
  const dd = String(today.getDate()).padStart(2,'0');
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const yyyy = today.getFullYear();

  const rooms = (typeof appRooms !== 'undefined' && appRooms.length)
    ? appRooms.map(r => r.name)
    : ALL_ROOMS;

  const stillBirthday = rooms.some(room => {
    const p = _getProfile(room);
    if (!p.birthday) return false;
    const b = p.birthday.trim();
    const dot = b.match(/^(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?$/);
    const iso = b.match(/^\d{4}-(\d{2})-(\d{2})$/);
    let bDay, bMon;
    if (dot)      { bDay = dot[1].padStart(2,'0'); bMon = dot[2].padStart(2,'0'); }
    else if (iso) { bMon = iso[1]; bDay = iso[2]; }
    else return false;
    return bDay === dd && bMon === mm;
  });
  if (stillBirthday) { checkBirthdays(); return; }
  localStorage.removeItem('cc_bday_sent_' + yyyy + '_' + mm + '_' + dd);
  await sbL.from('lounge_data').delete().eq('type','notice');
  loadNotice?.();
}

/* ── PASSWORD RESET ──────────────────────────────────────── */
async function resetRoomPassword(room) {
  if (!sbL) { alert('No database connection.'); return; }
  if (!confirm('Reset password for ' + room + '? The tenant will need to use the default password to log in again.')) return;
  await sbL.from('lounge_data').delete().eq('type','password').eq('room', room);
  // Re-insert default password hash so tenant can always log back in
  const defaultPw = room.toLowerCase().replace(/\s+/g, '') + '2026';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(defaultPw));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  await sbL.from('lounge_data').insert({ type: 'password', room, body: hash });
  const btn = document.querySelector('.tenants-reset-btn[data-room="' + room + '"]');
  if (btn) { const orig = btn.textContent; btn.textContent = 'Reset ✓'; setTimeout(() => btn.textContent = orig, 1500); }
}

/* ── RENDER ──────────────────────────────────────────────── */
async function loadTenants() {
  // Load profiles from Supabase first
  await _loadTenantProfiles();

  const isMob = window.innerWidth <= 700;

  // Use appRooms (Supabase) — fallback to ALL_ROOMS constants if not loaded
  const rooms = (typeof appRooms !== 'undefined' && appRooms.length)
    ? appRooms.filter(r => r.active)
    : ALL_ROOMS.map(r => ({ name: r, active: true, vacant: false, kitchen_enabled: false }));

  const field = (room, label, fieldName, value, type) => `
    <div class="room-field-row">
      <span class="room-field-label">${label}</span>
      <div class="room-field-wrap">
        <input class="room-field-input" type="${type || 'text'}"
          value="${esc(value)}" placeholder="—"
          onblur="saveRoomProfile('${room}','${fieldName}',this.value)"/>
        <button class="room-field-clear" tabindex="-1"
          onmousedown="event.preventDefault();
            this.previousElementSibling.value='';
            saveRoomProfile('${room}','${fieldName}','');">✕</button>
      </div>
    </div>`;

  document.getElementById('tenants-list').innerHTML =
    '<div class="rooms-grid">' +
    rooms.map(r => {
      const vacant     = !!r.vacant;
      const p          = _getProfile(r.name);
      const email      = p.email || '';
      // Kitchen enabled: read from rooms table (kitchen_enabled) OR kitchen_config fallback
      const hasKitchen = !!r.kitchen_enabled
        || (typeof getKitchenRooms === 'function' && getKitchenRooms().includes(r.name));
      // Room meta from appRooms columns (fallback gracefully)
      const size       = r.flaeche_m2 ? r.flaeche_m2 + ' m²' : '';
      const floor      = r.floor || '';
      const sub        = [size, floor].filter(Boolean).join(' · ');

      return `
        <div class="room-card">
          <div class="room-card__hdr">
            <span class="room-card__name">${esc(r.name)}</span>
            <span class="room-occ-badge ${vacant ? 'room-occ-badge--vacant' : 'room-occ-badge--occupied'}">
              ${vacant ? 'Vacant' : 'Occupied'}
            </span>
          </div>
          ${sub ? `<p class="room-card__sub">${esc(sub)}</p>` : ''}
          <p class="room-card__section">Tenant</p>
          <div class="room-card__fields">
            ${field(r.name, 'First name', 'firstName', p.firstName || '')}
            ${field(r.name, 'Last name',  'lastName',  p.lastName  || '')}
            ${field(r.name, 'Birthday',   'birthday',  p.birthday  || '')}
            ${field(r.name, 'Email',      'email',     p.email     || '', 'email')}
            ${field(r.name, 'Phone',      'phone',     p.phone     || '', 'tel')}
          </div>
          <div class="room-card__divider"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:10px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:var(--cc-taupe);">Kitchen tab</span>
            <span style="font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 12px;border-radius:var(--cc-r-pill);border:0.5px solid ${hasKitchen ? '#9AC87A' : 'var(--cc-rule)'};background:${hasKitchen ? '#EAF3DE' : 'var(--cc-surface)'};color:${hasKitchen ? '#27500A' : 'var(--cc-taupe)'};">
              ${hasKitchen ? '✓ Enabled' : '— Disabled'}
            </span>
          </div>
          <div class="room-card__actions">
            ${email ? `<a class="btn-email"
              href="${buildMailto(email, 'Message from Casa Castel', '')}"
              target="_blank" style="flex-shrink:0;">✉ Email</a>` : ''}
            ${p.phone ? `<a class="btn-email"
              href="tel:${esc(p.phone)}"
              style="flex-shrink:0;">✆ Call</a>` : ''}
            <button class="room-reset-btn tenants-reset-btn"
              data-room="${esc(r.name)}"
              onclick="resetRoomPassword('${esc(r.name)}')"
              style="margin-left:auto;">
              ${isMob ? 'Reset pw' : 'Reset password'}
            </button>
          </div>
        </div>`;
    }).join('') + '</div>';

  checkBirthdays();
}
