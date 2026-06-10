/* ─────────────────────────────────────────────────────────────
   CASA CASTEL v2 — LAYOUT
   js/layout.js

   App shell, tab switching, viewport locking.
   Depends on: constants.js, auth.js, chat-viewport.js
   ───────────────────────────────────────────────────────────── */

const kIsMobile = () => window.innerWidth <= 700;

/* ── TAB SWITCH ─────────────────────────────────────────── */
function switchTab(tabName) {
  const mobile    = kIsMobile();
  const isLounge  = tabName === 'lounge';
  const isKitchen = tabName === 'kitchen';

  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

  // Show requested tab
  // Lounge + kitchen need display:flex on mobile (column layout for chat viewport lock)
  // On desktop all tabs use display:block — the desktop grid handles its own layout
  const tabEl = document.getElementById('tab-' + tabName);
  if (tabEl) {
    tabEl.style.display = ((isLounge || isKitchen) && mobile) ? 'flex' : 'block';
  }

  // Active state on nav tabs
  document.querySelectorAll('.cc-tab[data-tab]').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  if (mobile) {
    const shell = document.getElementById('appShell');
    shell?.classList.toggle('lounge-active',  isLounge);
    shell?.classList.toggle('kitchen-active', isKitchen);
    document.body.classList.toggle('kitchen-locked', isLounge || isKitchen);
    const lockVp = isLounge || isKitchen;
    document.documentElement.style.height  = lockVp ? '100%' : '';
    document.body.style.height             = lockVp ? '100%' : '';
    document.documentElement.style.overflow= lockVp ? 'hidden' : '';
    document.body.style.overflow           = lockVp ? 'hidden' : '';
  } else {
    const shell = document.getElementById('appShell');
    shell?.classList.remove('lounge-active', 'kitchen-active');
    document.body.classList.remove('kitchen-locked');
    document.documentElement.style.height   = '';
    document.body.style.height              = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow            = '';
    // Restore scroll to top when leaving chat tabs — prevents blank white area
    window.scrollTo(0, 0);
  }

  // Trigger tab load functions (defined in each tab module)
  // currentRoom is set by showApp for tenants; undefined for landlord (cleaning ignores it)
  const _room = typeof currentRoom !== 'undefined' ? currentRoom : undefined;
  if (tabName === 'lounge')   loadLoungeAll?.();
  if (tabName === 'cleaning') loadHouseCleaning?.(_room);
  if (tabName === 'kitchen')  (mobile || typeof initKitchen === 'undefined') ? initKitchenMobile?.(_room) : initKitchen?.(_room);
  if (tabName === 'rooms')    loadRooms?.();
  if (tabName === 'tenants')  loadTenants?.();
}

/* ── SHOW APP (after login) ─────────────────────────────── */
function showApp(room) {
  document.getElementById('loginScreen').style.display = 'none';

  const shell = document.getElementById('appShell');
  shell?.classList.add('visible');
  shell?.classList.remove('kitchen-active');

  // Lock scroll from the start on mobile (lounge is default first tab)
  if (kIsMobile()) {
    shell?.classList.add('lounge-active');
    document.documentElement.style.height  = '100%';
    document.body.style.height             = '100%';
    document.documentElement.style.overflow= 'hidden';
    document.body.style.overflow           = 'hidden';
  }

  window.scrollTo(0, 0);
  detectPWAMode();         // from auth.js
  initChatViewport();      // from chat-viewport.js

  if (room) {
    currentRoom = room;
    const pill = document.getElementById('navRoomPill');
    if (pill) pill.textContent = room;
    // Show kitchen tab now that room is known — covers first login
    // where the tab was hidden at parse time before localStorage was written
    if (typeof _kTenShowTabIfEligible === 'function') _kTenShowTabIfEligible();
  }

  // For tenant: wire lounge compose events now that room is known.
  // switchTab('lounge') below will call loadLoungeAll which calls loadLounge(room).
  if (room && typeof initLoungeTab === 'function') initLoungeTab(room);

  // Activate first tab
  switchTab('lounge');
}

/* ── WIRE TAB BUTTONS ───────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.cc-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

