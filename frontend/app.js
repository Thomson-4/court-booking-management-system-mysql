const API = '/api';

let state = {
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  role: localStorage.getItem('role'),
  username: localStorage.getItem('username'),
  walletBalance: parseFloat(localStorage.getItem('walletBalance') || '0'),
  selectedCourt: null,
  selectedSlot: null,
  allBookings: [],
};

// ── INIT ──────────────────────────────────────────────────────
window.onload = () => {
  if (state.token) { showApp(); showPage('courts'); }
  else showPage('auth');
};

function showApp() {
  document.getElementById('navbar').classList.remove('hidden');
  document.getElementById('nav-username') && (document.getElementById('nav-username').textContent = state.username);
  if (state.role === 'admin') document.getElementById('admin-link').classList.remove('hidden');
  updateNavBalance();
}

function updateNavBalance() {
  const el = document.getElementById('nav-balance');
  if (el) el.textContent = `₹${parseFloat(state.walletBalance).toFixed(2)}`;
}

// ── PAGES ─────────────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const el = document.getElementById(`page-${page}`);
  if (!el) { showPage('404'); return; }
  el.classList.remove('hidden');
  el.classList.add('active');
  closeMenu();

  if (page === 'courts')      loadCourts();
  if (page === 'my-bookings') loadMyBookings();
  if (page === 'wallet')      loadWallet();
  if (page === 'admin')       loadAdmin();
  if (page === 'profile')     loadProfile();
}

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── MOBILE NAV ────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('nav-links').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('nav-links')?.classList.remove('open');
}

// ── AUTH ──────────────────────────────────────────────────────
function switchTab(tab, e) {
  document.querySelectorAll('.tab-row .tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function login(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Logging in...'; btn.disabled = true;
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error, 'error'); return; }
    saveSession(data);
    showApp();
    showPage('courts');
    toast(`Welcome back, ${data.username}!`, 'success');
  } catch { toast('Connection failed. Is the server running?', 'error'); }
  finally { btn.textContent = 'Login'; btn.disabled = false; }
}

async function register(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  btn.textContent = 'Creating...'; btn.disabled = true;
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error, 'error'); return; }
    toast('Account created! You can now login.', 'success');
    document.getElementById('register-form').reset();
  } catch { toast('Connection failed.', 'error'); }
  finally { btn.textContent = 'Create Account'; btn.disabled = false; }
}

function saveSession(data) {
  Object.assign(state, { token: data.token, userId: data.userId, role: data.role, username: data.username, walletBalance: data.walletBalance || 0 });
  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', data.userId);
  localStorage.setItem('role', data.role);
  localStorage.setItem('username', data.username);
  localStorage.setItem('walletBalance', data.walletBalance || 0);
}

function logout() {
  localStorage.clear();
  location.reload();
}

// ── COURTS ────────────────────────────────────────────────────
let allCourts = [];

function skeletonCards(n = 6) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton sk-title"></div>
      <div class="skeleton sk-badge"></div>
      <div class="skeleton sk-line"></div>
      <div class="skeleton sk-line sk-short"></div>
    </div>`).join('');
}

async function loadCourts() {
  const grid = document.getElementById('courts-grid');
  grid.innerHTML = skeletonCards();
  try {
    const res = await fetch(`${API}/courts`);
    allCourts = await res.json();
    filterCourts();
  } catch { grid.innerHTML = '<p style="color:var(--danger)">Failed to load courts.</p>'; }
}

function filterCourts() {
  const sport  = document.getElementById('filter-sport').value;
  const search = document.getElementById('search-courts').value.toLowerCase();
  const filtered = allCourts.filter(c =>
    (!sport  || c.sport === sport) &&
    (!search || c.name.toLowerCase().includes(search) || c.sport.toLowerCase().includes(search) || c.address.toLowerCase().includes(search))
  );
  renderCourts(filtered);
}

function renderCourts(courts) {
  const grid = document.getElementById('courts-grid');
  if (!courts.length) { grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1">No courts match your search.</p>'; return; }
  grid.innerHTML = courts.map(c => `
    <div class="court-card" onclick="${c.status === 'unavailable' ? '' : `openBooking(${c.id})`}" style="${c.status === 'unavailable' ? 'opacity:0.6;cursor:default' : ''}">
      <h3>${c.name}</h3>
      <div class="sport-badge sport-${c.sport}">${c.sport}</div>
      <p class="court-address">📍 ${c.address}</p>
      <p class="court-rate">₹${parseFloat(c.rate_per_hour).toFixed(2)} <span>/ hour</span></p>
      <p class="${c.status === 'available' ? 'status-available' : 'status-unavailable'}">
        ${c.status === 'available' ? '✓ Available' : '✗ Unavailable'}
      </p>
    </div>`).join('');
}

// ── BOOKING ───────────────────────────────────────────────────
const TIME_SLOTS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function openBooking(courtId) {
  const court = allCourts.find(c => c.id === courtId);
  if (!court) return;
  state.selectedCourt = court;
  state.selectedSlot = null;

  document.getElementById('court-detail').innerHTML = `
    <div class="court-detail-card">
      <h2>${court.name}</h2>
      <span class="sport-badge sport-${court.sport}">${court.sport}</span>
      <div class="detail-row">
        <div class="detail-item">📍 <strong>${court.address}</strong></div>
        <div class="detail-item">💰 <strong>₹${parseFloat(court.rate_per_hour).toFixed(2)}/hour</strong></div>
        <div class="detail-item">💳 Your balance: <strong>₹${parseFloat(state.walletBalance).toFixed(2)}</strong></div>
      </div>
    </div>`;

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('booking-date').min = today;
  document.getElementById('booking-date').value = today;
  document.getElementById('slots-container').classList.add('hidden');
  document.getElementById('confirm-btn').disabled = true;
  showPage('booking');
  loadSlots();
}

async function loadSlots() {
  const date = document.getElementById('booking-date').value;
  if (!date) return;
  state.selectedSlot = null;
  document.getElementById('confirm-btn').disabled = true;
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Loading slots...</p>';
  document.getElementById('slots-container').classList.remove('hidden');

  try {
    const res = await authFetch(`${API}/bookings?courtId=${state.selectedCourt.id}&date=${date}`);
    const booked = await res.json();
    grid.innerHTML = TIME_SLOTS.map(t => {
      const isBooked = booked.some(b => b.startsWith(t));
      return `<div class="slot${isBooked ? ' booked' : ''}" ${isBooked ? '' : `onclick="selectSlot('${t}', this)"`}>${t}</div>`;
    }).join('');
  } catch { grid.innerHTML = '<p style="color:var(--danger)">Failed to load slots.</p>'; }
}

function selectSlot(time, el) {
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSlot = time;
  document.getElementById('confirm-btn').disabled = false;
}

function openConfirmModal() {
  const court = state.selectedCourt;
  const date  = document.getElementById('booking-date').value;
  const time  = state.selectedSlot;

  if (parseFloat(state.walletBalance) < parseFloat(court.rate_per_hour)) {
    toast(`Insufficient balance. Need ₹${court.rate_per_hour}. Please top up your wallet.`, 'error', 5000);
    return;
  }

  document.getElementById('confirm-summary').innerHTML = `
    <div class="confirm-row"><span>Court</span><span>${court.name}</span></div>
    <div class="confirm-row"><span>Sport</span><span>${court.sport}</span></div>
    <div class="confirm-row"><span>Date</span><span>${formatDate(date)}</span></div>
    <div class="confirm-row"><span>Time</span><span>${time}</span></div>
    <div class="confirm-row"><span>Amount to Pay</span><span>₹${parseFloat(court.rate_per_hour).toFixed(2)}</span></div>`;

  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

async function confirmBooking() {
  closeConfirmModal();
  const date = document.getElementById('booking-date').value;
  const btn  = document.getElementById('confirm-btn');
  btn.textContent = 'Booking...'; btn.disabled = true;

  try {
    const res = await authFetch(`${API}/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId: state.selectedCourt.id, date, time: state.selectedSlot + ':00' })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Booking failed.', 'error'); return; }

    state.walletBalance -= parseFloat(state.selectedCourt.rate_per_hour);
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    toast(`Booking confirmed! ₹${data.amount} deducted from wallet.`, 'success', 4000);
    loadSlots();
  } catch { toast('Booking failed. Please try again.', 'error'); }
  finally { btn.textContent = 'Confirm Booking'; btn.disabled = false; }
}

// ── MY BOOKINGS ───────────────────────────────────────────────
async function loadMyBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = skeletonCards(3).replace(/courts-grid/g, '').replace(/court-card/g, 'skeleton-card');

  try {
    const res = await authFetch(`${API}/bookings/user/${state.userId}`);
    state.allBookings = await res.json();
    renderBookings(state.allBookings);
  } catch { list.innerHTML = '<p style="color:var(--danger)">Failed to load bookings.</p>'; }
}

function filterBookings(status, e) {
  document.querySelectorAll('.bookings-tabs .tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  const filtered = status === 'all' ? state.allBookings : state.allBookings.filter(b => b.status === status);
  renderBookings(filtered);
}

function renderBookings(bookings) {
  const list = document.getElementById('bookings-list');
  if (!bookings.length) {
    list.innerHTML = '<div class="bookings-empty"><p>No bookings found.</p><p style="margin-top:0.5rem;font-size:0.85rem">Browse courts to make your first booking!</p></div>';
    return;
  }
  list.innerHTML = bookings.map(b => `
    <div class="booking-item">
      <div class="booking-info">
        <h4>${b.name} <span class="sport-badge sport-${b.sport}" style="font-size:0.7rem">${b.sport}</span></h4>
        <p class="booking-meta">📅 ${formatDate(b.date)} &nbsp;⏰ ${b.time} &nbsp;💰 ₹${parseFloat(b.rate_per_hour).toFixed(2)}</p>
      </div>
      <div style="display:flex;gap:0.8rem;align-items:center;flex-shrink:0">
        <span class="booking-status status-${b.status}">${b.status}</span>
        ${b.status === 'confirmed' ? `<button class="btn-cancel" onclick="cancelBooking(${b.id})">Cancel</button>` : ''}
      </div>
    </div>`).join('');
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? Amount will be refunded to your wallet.')) return;
  try {
    const res = await authFetch(`${API}/bookings/${id}/cancel`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Cancellation failed.', 'error'); return; }
    state.walletBalance += parseFloat(data.refundAmount || 0);
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    toast(`Booking cancelled. ₹${data.refundAmount} refunded to wallet.`, 'success', 4000);
    loadMyBookings();
  } catch { toast('Cancellation failed.', 'error'); }
}

// ── WALLET ────────────────────────────────────────────────────
async function loadWallet() {
  try {
    const [balRes, txnRes] = await Promise.all([
      authFetch(`${API}/wallet/balance`),
      authFetch(`${API}/wallet/transactions`)
    ]);
    const { balance } = await balRes.json();
    const txns = await txnRes.json();

    state.walletBalance = balance || 0;
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    document.getElementById('wallet-balance').textContent = `₹${parseFloat(state.walletBalance).toFixed(2)}`;
    document.getElementById('wallet-username').textContent = state.username;

    const txnList = document.getElementById('txn-list');
    if (!txns.length) { txnList.innerHTML = '<p class="txn-empty">No transactions yet.</p>'; return; }
    txnList.innerHTML = txns.map(t => `
      <div class="txn-item">
        <div>
          <div class="txn-desc">${t.description}</div>
          <div class="txn-date">${formatDateTime(t.created_at)}</div>
        </div>
        <div class="txn-amount txn-${t.type}">
          ${t.type === 'credit' ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}
        </div>
      </div>`).join('');
  } catch {}
}

function setAmount(val) { document.getElementById('wallet-amount').value = val; }

async function addMoney() {
  const amount = parseFloat(document.getElementById('wallet-amount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount.', 'error'); return; }

  try {
    const res = await authFetch(`${API}/wallet/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to add money.', 'error'); return; }
    state.walletBalance = data.newBalance;
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    document.getElementById('wallet-amount').value = '';
    toast(`₹${amount} added to wallet!`, 'success');
    loadWallet();
  } catch { toast('Failed to add money.', 'error'); }
}

// ── PROFILE ───────────────────────────────────────────────────
async function loadProfile() {
  document.getElementById('profile-avatar').textContent = state.username[0].toUpperCase();
  document.getElementById('profile-name').textContent = state.username;
  document.getElementById('profile-role').textContent = state.role === 'admin' ? '👑 Admin' : '👤 User';

  try {
    const [bookRes, balRes] = await Promise.all([
      authFetch(`${API}/bookings/user/${state.userId}`),
      authFetch(`${API}/wallet/balance`)
    ]);
    const bookings = await bookRes.json();
    const { balance } = await balRes.json();

    const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled  = bookings.filter(b => b.status === 'cancelled').length;
    const totalSpent = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + parseFloat(b.rate_per_hour), 0);

    document.getElementById('profile-stats').innerHTML = `
      <div class="stat-card"><div class="stat-value">${confirmed}</div><div class="stat-label">Active Bookings</div></div>
      <div class="stat-card"><div class="stat-value">${cancelled}</div><div class="stat-label">Cancelled</div></div>
      <div class="stat-card"><div class="stat-value">₹${totalSpent.toFixed(0)}</div><div class="stat-label">Total Spent</div></div>`;

    state.walletBalance = balance;
    updateNavBalance();
  } catch {}
}

// ── ADMIN ─────────────────────────────────────────────────────
function switchAdminTab(tab, e) {
  document.querySelectorAll('.admin-tabs .tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById('admin-courts').classList.toggle('hidden', tab !== 'courts');
  document.getElementById('admin-bookings').classList.toggle('hidden', tab !== 'bookings');
  if (tab === 'bookings') loadAdminBookings();
}

function loadAdmin() { loadAdminCourts(); }

async function loadAdminCourts() {
  const list = document.getElementById('admin-courts-list');
  list.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
  try {
    const res = await authFetch(`${API}/admin/courts`);
    const courts = await res.json();
    if (!courts.length) { list.innerHTML = '<p style="color:var(--muted)">No courts yet.</p>'; return; }
    list.innerHTML = courts.map(c => `
      <div class="admin-court-row">
        <div class="admin-court-info">
          <h4>${c.name} <span class="sport-badge sport-${c.sport}" style="font-size:0.7rem">${c.sport}</span></h4>
          <p>📍 ${c.address} &nbsp;|&nbsp; ₹${c.rate_per_hour}/hr &nbsp;|&nbsp; ${c.status}</p>
        </div>
        <div class="admin-court-actions">
          <button class="btn-edit" onclick='openCourtModal(${JSON.stringify(c)})'>Edit</button>
          <button class="btn-danger" onclick="deleteCourt(${c.id})">Delete</button>
        </div>
      </div>`).join('');
  } catch { list.innerHTML = '<p style="color:var(--danger)">Failed to load.</p>'; }
}

async function loadAdminBookings() {
  const list = document.getElementById('admin-bookings-list');
  list.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
  try {
    const res = await authFetch(`${API}/admin/bookings`);
    const bookings = await res.json();
    if (!bookings.length) { list.innerHTML = '<p style="color:var(--muted)">No bookings yet.</p>'; return; }
    list.innerHTML = bookings.map(b => `
      <div class="admin-booking-row">
        <div class="admin-booking-info">
          <strong>${b.court_name}</strong> (${b.sport})
          <p style="color:var(--muted);margin-top:3px">👤 ${b.username} &nbsp;|&nbsp; 📅 ${formatDate(b.date)} at ${b.time}</p>
        </div>
        <span class="booking-status status-${b.status}">${b.status}</span>
      </div>`).join('');
  } catch { list.innerHTML = '<p style="color:var(--danger)">Failed to load.</p>'; }
}

function openCourtModal(court) {
  document.getElementById('modal-error').classList.add('hidden');
  if (court && typeof court === 'object') {
    document.getElementById('modal-title').textContent = 'Edit Court';
    document.getElementById('modal-court-id').value = court.id;
    document.getElementById('modal-name').value = court.name;
    document.getElementById('modal-sport').value = court.sport;
    document.getElementById('modal-address').value = court.address;
    document.getElementById('modal-rate').value = court.rate_per_hour;
    document.getElementById('modal-status').value = court.status;
  } else {
    document.getElementById('modal-title').textContent = 'Add Court';
    ['modal-court-id','modal-name','modal-address','modal-rate'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('modal-sport').value = '';
    document.getElementById('modal-status').value = 'available';
  }
  document.getElementById('court-modal').classList.remove('hidden');
}

function closeCourtModal() { document.getElementById('court-modal').classList.add('hidden'); }

async function saveCourt(e) {
  e.preventDefault();
  const id   = document.getElementById('modal-court-id').value;
  const body = {
    name: document.getElementById('modal-name').value,
    sport: document.getElementById('modal-sport').value,
    address: document.getElementById('modal-address').value,
    rate_per_hour: document.getElementById('modal-rate').value,
    status: document.getElementById('modal-status').value,
  };
  try {
    const res = await authFetch(`${API}/admin/courts${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('modal-error').textContent = data.error;
      document.getElementById('modal-error').classList.remove('hidden');
      return;
    }
    closeCourtModal();
    toast(id ? 'Court updated.' : 'Court added.', 'success');
    loadAdminCourts();
    allCourts = [];
  } catch {
    document.getElementById('modal-error').textContent = 'Failed to save.';
    document.getElementById('modal-error').classList.remove('hidden');
  }
}

async function deleteCourt(id) {
  if (!confirm('Delete this court? All associated bookings will be removed.')) return;
  try {
    const res = await authFetch(`${API}/admin/courts/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast('Delete failed.', 'error'); return; }
    toast('Court deleted.', 'success');
    loadAdminCourts();
    allCourts = [];
  } catch { toast('Delete failed.', 'error'); }
}

// ── HELPERS ───────────────────────────────────────────────────
function authFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${state.token}` } });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
