/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — LANDLORD TENANTS TAB
   tab-tenants.js

   Tenant profiles + Kaution tracker.
   Profiles stored in Supabase: lounge_data type='room_profile'
   Kaution stored in Supabase: kaution_transactions (room_id TEXT, type TEXT, amount NUMERIC, date DATE, note TEXT, created_at TIMESTAMPTZ)
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
  if (!_tenantProfiles[room]) _tenantProfiles[room] = {};
  _tenantProfiles[room][field] = value;
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
  const supa  = _tenantProfiles[room] || {};
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
    ? appRooms.map(r => r.name) : ALL_ROOMS;
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
    ? appRooms.map(r => r.name) : ALL_ROOMS;
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
  const defaultPw = room.toLowerCase().replace(/\s+/g, '') + '2026';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(defaultPw));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  await sbL.from('lounge_data').insert({ type: 'password', room, body: hash });
  const btn = document.querySelector('.tenants-reset-btn[data-room="' + room + '"]');
  if (btn) { const orig = btn.textContent; btn.textContent = 'Reset ✓'; setTimeout(() => btn.textContent = orig, 1500); }
}

/* ── KAUTION — STATE ─────────────────────────────────────── */
// { [room]: [ {id, type, amount, date, note, created_at} ] }
let _kautionData = {};

async function _loadKaution() {
  if (!sbL) return;
  const { data } = await sbL.from('kaution_transactions')
    .select('*')
    .order('date', { ascending: true });
  if (!data) return;
  _kautionData = {};
  data.forEach(row => {
    if (!_kautionData[row.room_id]) _kautionData[row.room_id] = [];
    _kautionData[row.room_id].push(row);
  });
}

function _kautionCalc(room) {
  const rows = _kautionData[room] || [];
  const erhalten    = rows.filter(r => r.type === 'erhalten').reduce((s,r) => s + Number(r.amount), 0);
  const rueckgezahlt= rows.filter(r => r.type === 'rueckzahlung').reduce((s,r) => s + Number(r.amount), 0);
  const einbehalten = rows.filter(r => r.type === 'einbehalt').reduce((s,r) => s + Number(r.amount), 0);
  const offen       = erhalten - rueckgezahlt - einbehalten;
  // status: 'leer' | 'offen' | 'teil' | 'abgeschlossen' | 'verrechnet'
  let status = 'leer';
  if (erhalten > 0) {
    const abschluss = rows.find(r => r.type === 'abschluss');
    if (abschluss) {
      status = abschluss.note === 'verrechnet' ? 'verrechnet' : 'abgeschlossen';
    } else if (rueckgezahlt > 0 || einbehalten > 0) {
      status = 'teil';
    } else {
      status = 'offen';
    }
  }
  return { erhalten, rueckgezahlt, einbehalten, offen, rows, status };
}

async function _saveKautionRow(room, type, amount, date, note) {
  if (!sbL) return null;
  const { data, error } = await sbL.from('kaution_transactions')
    .insert({ room_id: room, type, amount: Number(amount), date, note: note || '' })
    .select().single();
  if (error) { console.error('Kaution save error', error); return null; }
  if (!_kautionData[room]) _kautionData[room] = [];
  _kautionData[room].push(data);
  return data;
}

async function _deleteKautionRow(id, room) {
  if (!sbL) return;
  await sbL.from('kaution_transactions').delete().eq('id', id);
  if (_kautionData[room]) {
    _kautionData[room] = _kautionData[room].filter(r => r.id !== id);
  }
}

/* ── KAUTION — HELPERS ───────────────────────────────────── */
function _fmtEUR(n) {
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d + '.' + m + '.' + y;
}

function _isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function _statusBadge(status) {
  const map = {
    leer:          ['—',                 '#F5F0EB', '#9A8E7E', '#D4BFA0'],
    offen:         ['Erhalten',          '#EDF5E8', '#3A6A1A', '#9AC87A'],
    teil:          ['Teilweise zurück',  '#FEF9EC', '#7A5C0A', '#D4A83A'],
    abgeschlossen: ['Vollständig ✓',     '#EDF5E8', '#3A6A1A', '#9AC87A'],
    verrechnet:    ['Verrechnet',        '#FAF0F0', '#8A2A2A', '#D48A8A'],
  };
  const [label, bg, color, border] = map[status] || map.leer;
  return `<span style="font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;
    padding:3px 10px;border-radius:var(--cc-r-pill);background:${bg};color:${color};border:0.5px solid ${border};"
  >${label}</span>`;
}

/* ── KAUTION — RENDER BLOCK ──────────────────────────────── */
function _renderKautionBlock(room, roomObj) {
  const calc = _kautionCalc(room);
  const { erhalten, rueckgezahlt, einbehalten, offen, rows, status } = calc;

  // Soll-Kaution from rooms data (same logic as tab-rooms)
  let kautionSoll = 0;
  if (roomObj) {
    const rent = roomObj.rent_amount || roomObj.price || 0;
    if (roomObj.kaution_override && roomObj.kaution_default) {
      kautionSoll = Number(roomObj.kaution_default);
    } else {
      const start = roomObj.contract_start;
      const end   = roomObj.contract_end;
      if (start && end) {
        const months = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30.44);
        kautionSoll = months <= 3 ? rent : rent * 3;
      } else {
        kautionSoll = rent * 3;
      }
    }
  }

  // Timeline rows (only if any transactions exist)
  const timelineHtml = rows.length ? `
    <div class="kt-timeline">
      ${rows.map(r => {
        const icons = { erhalten: '↓', rueckzahlung: '↑', einbehalt: '⊖', abschluss: '✓' };
        const colors = {
          erhalten:    '#3A6A1A',
          rueckzahlung:'#1A4A6A',
          einbehalt:   '#7A5C0A',
          abschluss:   '#3A6A1A',
        };
        const icon  = icons[r.type]  || '·';
        const color = colors[r.type] || '#9A8E7E';
        return `<div class="kt-event">
          <span class="kt-dot" style="background:${color}"></span>
          <div class="kt-event-body">
            <span class="kt-event-title">${_typeLabel(r.type)}</span>
            ${r.type !== 'abschluss' ? `<span class="kt-event-amount">${_fmtEUR(r.amount)}</span>` : ''}
            <span class="kt-event-date">${_fmtDate(r.date)}</span>
            ${r.note ? `<span class="kt-event-note">${esc(r.note)}</span>` : ''}
          </div>
          <button class="kt-del" title="Löschen"
            onclick="_kautionDelete('${r.id}','${esc(room)}')">✕</button>
        </div>`;
      }).join('')}
    </div>` : '';

  // Summary bar (only if erhalten > 0)
  const summaryHtml = erhalten > 0 ? `
    <div class="kt-summary">
      <div class="kt-sum-cell">
        <span class="kt-sum-lbl">Erhalten</span>
        <span class="kt-sum-val">${_fmtEUR(erhalten)}</span>
      </div>
      ${einbehalten > 0 ? `<div class="kt-sum-cell">
        <span class="kt-sum-lbl">Einbehalten</span>
        <span class="kt-sum-val" style="color:#7A5C0A">${_fmtEUR(einbehalten)}</span>
      </div>` : ''}
      ${rueckgezahlt > 0 ? `<div class="kt-sum-cell">
        <span class="kt-sum-lbl">Zurück</span>
        <span class="kt-sum-val" style="color:#1A4A6A">${_fmtEUR(rueckgezahlt)}</span>
      </div>` : ''}
      <div class="kt-sum-cell">
        <span class="kt-sum-lbl">Offen</span>
        <span class="kt-sum-val" style="color:${offen > 0 ? '#3A6A1A' : offen < 0 ? '#8A2A2A' : '#9A8E7E'}">${_fmtEUR(offen)}</span>
      </div>
      ${kautionSoll > 0 && erhalten !== kautionSoll ? `<div class="kt-sum-cell">
        <span class="kt-sum-lbl">Soll</span>
        <span class="kt-sum-val" style="color:#9A8E7E">${_fmtEUR(kautionSoll)}</span>
      </div>` : ''}
    </div>` : '';

  // Add form (inline, always visible below timeline)
  const formHtml = `
    <div class="kt-form" id="ktf-${esc(room)}">
      <div class="kt-form-row">
        <select class="kt-select" id="ktt-${esc(room)}" onchange="_kautionFormChange('${esc(room)}')">
          <option value="erhalten">↓ Kaution erhalten</option>
          <option value="rueckzahlung">↑ Rückzahlung</option>
          <option value="einbehalt">⊖ Einbehalt</option>
          <option value="abschluss">✓ Abschluss</option>
        </select>
      </div>
      <div class="kt-form-row" id="ktamtrow-${esc(room)}">
        <input class="room-field-input" type="number" step="0.01" min="0"
          id="kta-${esc(room)}" placeholder="Betrag (€)" style="flex:1">
        <input class="room-field-input" type="date"
          id="ktd-${esc(room)}" value="${_isoToday()}" style="width:140px">
      </div>
      <div class="kt-form-row" id="ktnoterow-${esc(room)}">
        <input class="room-field-input" type="text"
          id="ktn-${esc(room)}" placeholder="Notiz (optional)" style="flex:1">
        <select class="kt-select" id="ktabs-${esc(room)}"
          style="display:none;width:160px">
          <option value="">Vollständig</option>
          <option value="verrechnet">Verrechnet (NK etc.)</option>
        </select>
      </div>
      <div class="kt-form-row" style="justify-content:flex-end">
        <button class="room-reset-btn" style="font-size:10px"
          onclick="_kautionSave('${esc(room)}')">Speichern</button>
      </div>
    </div>`;

  return `
    <div class="room-card__divider" style="margin-top:6px"></div>
    <div class="kt-header">
      <span class="room-card__section" style="margin:0;border:none;padding:0">Kaution</span>
      ${_statusBadge(status)}
    </div>
    ${summaryHtml}
    ${timelineHtml}
    ${formHtml}`;
}

function _typeLabel(t) {
  return { erhalten:'Erhalten', rueckzahlung:'Rückzahlung', einbehalt:'Einbehalt', abschluss:'Abschluss' }[t] || t;
}

/* ── KAUTION — INTERACTIONS ──────────────────────────────── */
function _kautionFormChange(room) {
  const type = document.getElementById('ktt-' + room)?.value;
  const amtRow  = document.getElementById('ktamtrow-' + room);
  const absEl   = document.getElementById('ktabs-' + room);
  if (!amtRow || !absEl) return;
  if (type === 'abschluss') {
    amtRow.style.display = 'none';
    absEl.style.display  = '';
  } else {
    amtRow.style.display = '';
    absEl.style.display  = 'none';
  }
}

async function _kautionSave(room) {
  const type    = document.getElementById('ktt-' + room)?.value;
  const amountEl= document.getElementById('kta-' + room);
  const dateEl  = document.getElementById('ktd-' + room);
  const noteEl  = document.getElementById('ktn-' + room);
  const absEl   = document.getElementById('ktabs-' + room);

  const date   = dateEl?.value || _isoToday();
  let   note   = noteEl?.value?.trim() || '';
  let   amount = 0;

  if (type !== 'abschluss') {
    amount = parseFloat(amountEl?.value || '0');
    if (!amount || amount <= 0) { amountEl?.focus(); return; }
  } else {
    note = absEl?.value || '';
    amount = 0;
  }

  const btn = document.querySelector(`#ktf-${room} .room-reset-btn`);
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  const saved = await _saveKautionRow(room, type, amount, date, note);
  if (!saved) {
    if (btn) { btn.textContent = 'Fehler'; btn.disabled = false; }
    return;
  }

  // Re-render only the kaution block for this card
  _rerenderKautionBlock(room);
}

async function _kautionDelete(id, room) {
  if (!confirm('Eintrag löschen?')) return;
  await _deleteKautionRow(id, room);
  _rerenderKautionBlock(room);
}

function _rerenderKautionBlock(room) {
  const card = document.querySelector(`.room-card[data-room="${room}"]`);
  if (!card) return;
  const existing = card.querySelector('.kt-zone');
  if (!existing) return;
  const roomObj = (typeof appRooms !== 'undefined') ? appRooms.find(r => r.name === room) : null;
  existing.innerHTML = _renderKautionBlock(room, roomObj);
}

/* ── INJECT CSS ──────────────────────────────────────────── */
(function() {
  if (document.getElementById('kt-styles')) return;
  const s = document.createElement('style');
  s.id = 'kt-styles';
  s.textContent = `
.kt-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.kt-summary{display:flex;gap:0;border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);overflow:hidden;margin-bottom:10px;}
.kt-sum-cell{flex:1;padding:6px 8px;border-right:0.5px solid var(--cc-rule);}
.kt-sum-cell:last-child{border-right:none;}
.kt-sum-lbl{display:block;font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--cc-stone);margin-bottom:2px;}
.kt-sum-val{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:400;color:var(--cc-ink);}
.kt-timeline{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
.kt-event{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:var(--cc-r-sm);background:var(--cc-surface);}
.kt-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.kt-event-body{display:flex;align-items:baseline;gap:7px;flex:1;flex-wrap:wrap;}
.kt-event-title{font-size:11px;font-weight:500;color:var(--cc-charcoal);letter-spacing:0.02em;}
.kt-event-amount{font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;color:var(--cc-ink);}
.kt-event-date{font-size:10px;color:var(--cc-stone);margin-left:auto;}
.kt-event-note{font-size:10px;color:var(--cc-taupe);font-style:italic;width:100%;margin-top:1px;}
.kt-del{background:none;border:none;cursor:pointer;color:var(--cc-stone);font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;flex-shrink:0;}
.kt-del:hover{color:var(--cc-charcoal);}
.kt-form{display:flex;flex-direction:column;gap:6px;padding-top:2px;}
.kt-form-row{display:flex;gap:6px;align-items:center;}
.kt-select{height:30px;background:var(--cc-surface);border:0.5px solid var(--cc-rule);border-radius:var(--cc-r-sm);padding:0 8px;font-family:'Inter',system-ui,sans-serif;font-size:12px;font-weight:400;color:var(--cc-charcoal);outline:none;cursor:pointer;flex:1;}
.kt-select:focus{border-color:var(--cc-charcoal);}
`;
  document.head.appendChild(s);
})();

/* ── RENDER MAIN ─────────────────────────────────────────── */
async function loadTenants() {
  await _loadTenantProfiles();
  await _loadKaution();

  const isMob = window.innerWidth <= 700;

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
      const hasKitchen = !!r.kitchen_enabled
        || (typeof getKitchenRooms === 'function' && getKitchenRooms().includes(r.name));
      const size  = r.flaeche_m2 ? r.flaeche_m2 + ' m²' : '';
      const floor = r.floor || '';
      const sub   = [size, floor].filter(Boolean).join(' · ');

      return `
        <div class="room-card" data-room="${esc(r.name)}">
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
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:10px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:var(--cc-taupe);">Kitchen tab</span>
            <span style="font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 12px;border-radius:var(--cc-r-pill);border:0.5px solid ${hasKitchen ? '#9AC87A' : 'var(--cc-rule)'};background:${hasKitchen ? '#EAF3DE' : 'var(--cc-surface)'};color:${hasKitchen ? '#27500A' : 'var(--cc-taupe)'};">
              ${hasKitchen ? '✓ Enabled' : '— Disabled'}
            </span>
          </div>
          <div class="kt-zone">${_renderKautionBlock(r.name, r)}</div>
          <div class="room-card__divider"></div>
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
