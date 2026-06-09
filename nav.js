/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — NAV
   js/nav.js

   Profile dropdown, preview-tenant button, language toggle,
   logout wiring, profile modal trigger.
   Depends on: constants.js, auth.js, layout.js, profile-modal.js
   ───────────────────────────────────────────────────────────── */

/* ── PROFILE DROPDOWN ───────────────────────────────────── */
function toggleProfileMenu() {
  document.getElementById('navProfileMenu')?.classList.toggle('open');
}

// Close on outside click
document.addEventListener('click', e => {
  const profile = document.getElementById('navProfile');
  if (profile && !profile.contains(e.target)) {
    document.getElementById('navProfileMenu')?.classList.remove('open');
  }
});

/* ── LANGUAGE TOGGLE ────────────────────────────────────── */
let _currentLang = localStorage.getItem('cc_lang') || 'en';

const LANG = {
  en: {
    // Nav / tabs
    tab_lounge:   'Lounge',
    tab_cleaning: 'Cleaning',
    tab_kitchen:  'Kitchen',
    tab_rooms:    'Rooms',
    tab_tenants:  'Tenants',
    lang_btn:     'Deutsch',
    nav_profile:  'Profile',

    // Profile modal — section titles
    profile_title:           'Profile',
    profile_landlord:        'Landlord',
    profile_property:        'Property',
    profile_bank:            'Bank details',
    profile_shared_spaces:   'Shared spaces',
    profile_bathrooms:       'Bathrooms',
    profile_meters:          'Utility meters',

    // Profile modal — field labels
    profile_name:            'Name',
    profile_address:         'Address',
    profile_postcode_city:   'Postcode / City',
    profile_jurisdiction:    'Jurisdiction',
    profile_signing_location:'Signing location',
    profile_account_holder:  'Account holder',
    profile_landlord_name:   'Landlord name',
    profile_landlord_address:'Landlord address',

    // Profile modal — UI strings
    profile_none_added:      'None added yet',
    profile_new_space:       'New space…',
    profile_new_bathroom:    'e.g. Bathroom 3rd floor…',
    profile_meter_number:    'Meter number…',
    profile_meter_number_label: 'Meter number',
    profile_edit:            'Edit',
    profile_save:            'Save',
    profile_cancel:          'Cancel',
    profile_add:             '+ Add',
  },
  de: {
    // Nav / tabs
    tab_lounge:   'Lounge',
    tab_cleaning: 'Reinigung',
    tab_kitchen:  'Küche',
    tab_rooms:    'Zimmer',
    tab_tenants:  'Mieter',
    lang_btn:     'English',
    nav_profile:  'Profil',

    // Profile modal — section titles
    profile_title:           'Profil',
    profile_landlord:        'Vermieter',
    profile_property:        'Objekt',
    profile_bank:            'Bankverbindung',
    profile_shared_spaces:   'Gemeinschaftsräume',
    profile_bathrooms:       'Badezimmer',
    profile_meters:          'Zählerstände',

    // Profile modal — field labels
    profile_name:            'Name',
    profile_address:         'Adresse',
    profile_postcode_city:   'PLZ / Ort',
    profile_jurisdiction:    'Gerichtsstand',
    profile_signing_location:'Unterschriftsort',
    profile_account_holder:  'Kontoinhaber',
    profile_landlord_name:   'Vermieter Name',
    profile_landlord_address:'Vermieter Adresse',

    // Profile modal — UI strings
    profile_none_added:      'Keine eingetragen',
    profile_new_space:       'Neuer Bereich…',
    profile_new_bathroom:    'z.B. Bad 3. OG…',
    profile_meter_number:    'Zählernummer…',
    profile_meter_number_label: 'Zählernummer',
    profile_edit:            'Bearbeiten',
    profile_save:            'Speichern',
    profile_cancel:          'Abbrechen',
    profile_add:             '+ Hinzufügen',
  }
};

function applyLang(lang) {
  _currentLang = lang;
  localStorage.setItem('cc_lang', lang);
  const L = LANG[lang] || LANG.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (L[key]) el.textContent = L[key];
  });
  const btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = L.lang_btn;

  // If profile panel is open, re-render it in the new language
  const profileOverlay = document.getElementById('profileOverlay');
  if (profileOverlay?.classList.contains('open')) {
    if (typeof _renderProfileSections === 'function') _renderProfileSections();
  }
}

// Expose current lang for other modules
function getCurrentLang() { return _currentLang; }
function t(key) { return (LANG[_currentLang] || LANG.en)[key] || (LANG.en)[key] || key; }

function toggleLang() {
  applyLang(_currentLang === 'en' ? 'de' : 'en');
  toggleProfileMenu();
}

/* ── LOGOUT WIRING ──────────────────────────────────────── */
function initNavLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

/* ── PROFILE MODAL WIRING ───────────────────────────────── */
function initNavProfile() {
  document.getElementById('profileBtn')?.addEventListener('click', () => {
    toggleProfileMenu();
    openProfile();
  });
}

/* ── PREVIEW TENANT (landlord only) ─────────────────────── */
function initPreviewTenant() {
  const previewBtn = document.getElementById('previewBtn');
  if (!previewBtn) return;

  previewBtn.addEventListener('click', () => {
    document.getElementById('roomPickerOverlay')?.classList.add('visible');
  });

  document.getElementById('cancelPickerBtn')?.addEventListener('click', () => {
    document.getElementById('roomPickerOverlay')?.classList.remove('visible');
  });

  document.getElementById('roomPickerOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('roomPickerOverlay')) {
      document.getElementById('roomPickerOverlay').classList.remove('visible');
    }
  });

  document.querySelectorAll('.room-picker__item').forEach(item => {
    item.addEventListener('click', () => {
      const room = item.dataset.room;
      document.getElementById('roomPickerOverlay')?.classList.remove('visible');
      const label = document.getElementById('tenantPreviewLabel');
      if (label) label.textContent = 'Previewing — ' + room;
      const frame = document.getElementById('tenantPreviewFrame');
      if (frame) frame.src = 'tenant.html?preview=' + encodeURIComponent(room);
      document.getElementById('tenantPreviewOverlay')?.classList.add('visible');
    });
  });

  document.getElementById('tenantPreviewClose')?.addEventListener('click', () => {
    document.getElementById('tenantPreviewOverlay')?.classList.remove('visible');
    const frame = document.getElementById('tenantPreviewFrame');
    if (frame) frame.src = '';
  });

  document.getElementById('exitPreviewBtn')?.addEventListener('click', () => {
    document.getElementById('previewBanner')?.classList.remove('visible');
    if (previewBtn) previewBtn.style.display = '';
    sessionStorage.removeItem('cc_preview_room');
  });

  // Restore preview banner if returning to landlord in preview mode
  const savedPreview = sessionStorage.getItem('cc_preview_room');
  if (savedPreview && localStorage.getItem('cc_role') === 'landlord') {
    const label = document.getElementById('previewRoomLabel');
    if (label) label.textContent = savedPreview;
    document.getElementById('previewBanner')?.classList.add('visible');
    if (previewBtn) previewBtn.style.display = 'none';
  }
}

/* ── INIT ALL NAV ───────────────────────────────────────── */
function initNav() {
  initNavLogout();
  initNavProfile();
  applyLang(_currentLang);
}
