/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — LANDLORD TENANTS TAB
   js/tab-tenants.js

   Tenant profiles (name, email, birthday), vacancy toggle,
   password reset, birthday auto-notice.
   This is the v1 "Rooms" tab content, moved here in v2.
   Depends on: constants.js, utils.js, storage.js,
               supabase-client.js
   ───────────────────────────────────────────────────────────── */

/* ── ROOM CONFIG (static — edit if rooms change) ─────────── */
const ROOM_DATA = [
  { name:'Paris',       floor:'Attic',        size:'28 m²', kitchen:'Own kitchen'    },
  { name:'Copenhagen',  floor:'Ground floor',  size:'12 m²', kitchen:'Shared kitchen' },
  { name:'Stockholm',   floor:'1st floor',     size:'16 m²', kitchen:'Shared kitchen' },
  { name:'Oslo',        floor:'1st floor',     size:'13 m²', kitchen:'Shared kitchen' },
  { name:'London',      floor:'Ground floor',  size:'25 m²', kitchen:'Shared kitchen' },
  { name:'New York',    floor:'Basement',      size:'16 m²', kitchen:'Own kitchen'    },
  { name:'Los Angeles', floor:'Basement',      size:'11 m²', kitchen:'Own kitchen'    },
];

/* ── INJECT HTML ────────────────────────────────────────── */
document.getElementById('tab-tenants').innerHTML = `
  <h1 class="cc-h1 cc-mb-24">Tenants</h1>
  <div class="cc-section" style="padding-top:0;">
    <div id="tenants-list"></div>
  </div>
`;

/* ── PROFILE SAVE ────────────────────────────────────────── */
function saveRoomProfile(room, field, value) {
  const p = S.get('room_profile_' + room, {});
  p[field] = value;
  S.set('room_profile_' + room, p);
  if (field === 'birthday') {
    if (!value.trim()) _clearBirthdayNoticeIfNone();
    else               checkBirthdays();
  }
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

  ALL_ROOMS.forEach(room => {
    const p = S.get('room_profile_' + room, {});
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
  const stillBirthday = ALL_ROOMS.some(room => {
    const p = S.get('room_profile_' + room, {});
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
  const btn = document.querySelector('.tenants-reset-btn[data-room="' + room + '"]');
  if (btn) { const orig = btn.textContent; btn.textContent = 'Reset ✓'; setTimeout(() => btn.textContent = orig, 1500); }
}

/* ── RENDER ──────────────────────────────────────────────── */
function toggleKitchenAccess(room) {
  const rooms = [...getKitchenRooms()];
  const idx   = rooms.indexOf(room);
  if (idx === -1) rooms.push(room);
  else            rooms.splice(idx, 1);
  syncKitchenRoomsToSupabase(rooms); // updates kitchenRooms[] in memory + writes to Supabase
  loadTenants(); // re-render to update toggle state
}

function loadTenants() {
  const isMob = window.innerWidth <= 700;

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
    ROOM_DATA.map(r => {
      const vacant      = isVacant(r.name);
      const p           = S.get('room_profile_' + r.name, {});
      const email       = p.email || '';
      const kitchenRooms= getKitchenRooms();
      const hasKitchen  = kitchenRooms.includes(r.name);

      return `
        <div class="room-card">
          <div class="room-card__hdr">
            <span class="room-card__name">${r.name}</span>
            <span class="room-occ-badge ${vacant ? 'room-occ-badge--vacant' : 'room-occ-badge--occupied'}">
              ${vacant ? 'Vacant' : 'Occupied'}
            </span>
          </div>
          <p class="room-card__sub">${r.size} · ${r.floor} · ${r.kitchen}</p>
          <p class="room-card__section">Tenant</p>
          <div class="room-card__fields">
            ${field(r.name, 'First name', 'firstName', p.firstName || '')}
            ${field(r.name, 'Last name',  'lastName',  p.lastName  || '')}
            ${field(r.name, 'Birthday',   'birthday',  p.birthday  || '')}
            ${field(r.name, 'Email',      'email',     p.email     || '', 'email')}
          </div>
          <div class="room-card__divider"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:10px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:var(--cc-taupe);">Kitchen tab</span>
            <button onclick="toggleKitchenAccess('${r.name}')"
              style="font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 12px;border-radius:var(--cc-r-pill);cursor:pointer;font-family:inherit;border:0.5px solid ${hasKitchen ? '#9AC87A' : 'var(--cc-rule)'};background:${hasKitchen ? '#EAF3DE' : 'var(--cc-surface)'};color:${hasKitchen ? '#27500A' : 'var(--cc-taupe)'};">
              ${hasKitchen ? '✓ Enabled' : '— Disabled'}
            </button>
          </div>
          <div class="room-card__actions">
            <button class="room-occ-btn"
              onclick="toggleVacancyFull('${r.name}').then(()=>loadTenants())">
              ${vacant ? 'Mark occupied' : 'Mark vacant'}
            </button>
            ${email ? `<a class="btn-email"
              href="${buildMailto(email, 'Message from Casa Castel', '')}"
              target="_blank" style="flex-shrink:0;">✉ Email</a>` : ''}
            <button class="room-reset-btn tenants-reset-btn"
              data-room="${r.name}"
              onclick="resetRoomPassword('${r.name}')"
              style="margin-left:auto;">
              ${isMob ? 'Reset pw' : 'Reset password'}
            </button>
          </div>
        </div>`;
    }).join('') + '</div>';

  // Run birthday check each time Tenants tab opens
  checkBirthdays();
}
