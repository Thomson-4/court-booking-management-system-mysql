const API = '/api';

let state = {
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  role: localStorage.getItem('role'),
  username: localStorage.getItem('username'),
  walletBalance: parseFloat(localStorage.getItem('walletBalance') || '0'),
  selectedCourt: null,
  selectedSlot: null,
  currentPage: null,
};

// ─── INIT ────────────────────────────────────────────────────────────────────
window.onload = () => {
  if (state.token) {
    showApp();
    showPage('courts');
  } else {
    showPage('auth');
  }
};

function showApp() {
  document.getElementById('navbar').classList.remove('hidden');
  document.getElementById('nav-username').textContent = state.username;
  if (state.role === 'admin') document.getElementById('admin-link').classList.remove('hidden');
  updateNavBalance();
}

function updateNavBalance() {
  document.getElementById('nav-balance').textContent = `₹${parseFloat(state.walletBalance).toFixed(2)}`;
}

// ─── PAGES ───────────────────────────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  state.currentPage = page;

  if (page === 'courts') loadCourts();
  if (page === 'my-bookings') loadMyBookings();
  if (page === 'wallet') loadWallet();
  if (page === 'admin') loadAdmin();
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  hideAuthMessages();
}

function hideAuthMessages() {
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
}

async function login(e) {
  e.preventDefault();
  hideAuthMessages();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return showError('auth-error', data.error);

    saveSession(data);
    showApp();
    showPage('courts');
  } catch {
    showError('auth-error', 'Connection failed. Is the server running?');
  }
}

async function register(e) {
  e.preventDefault();
  hideAuthMessages();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return showError('auth-error', data.error);

    document.getElementById('auth-success').textContent = 'Account created! You can now login.';
    document.getElementById('auth-success').classList.remove('hidden');
    document.getElementById('register-form').reset();
  } catch {
    showError('auth-error', 'Connection failed. Is the server running?');
  }
}

function saveSession(data) {
  state.token = data.token;
  state.userId = data.userId;
  state.role = data.role;
  state.username = data.username;
  state.walletBalance = data.walletBalance || 0;
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

// ─── COURTS ──────────────────────────────────────────────────────────────────
let allCourts = [];

async function loadCourts() {
  const grid = document.getElementById('courts-grid');
  grid.innerHTML = '<p style="color:var(--muted)">Loading courts...</p>';
  try {
    const res = await fetch(`${API}/courts`);
    allCourts = await res.json();
    renderCourts(allCourts);
  } catch {
    grid.innerHTML = '<p style="color:var(--danger)">Failed to load courts.</p>';
  }
}

function filterCourts() {
  const sport = document.getElementById('filter-sport').value;
  const filtered = sport ? allCourts.filter(c => c.sport === sport) : allCourts;
  renderCourts(filtered);
}

function renderCourts(courts) {
  const grid = document.getElementById('courts-grid');
  if (!courts.length) {
    grid.innerHTML = '<p style="color:var(--muted)">No courts found.</p>';
    return;
  }
  grid.innerHTML = courts.map(c => `
    <div class="court-card" onclick="openBooking(${c.id})">
      <h3>${c.name}</h3>
      <div class="sport-badge sport-${c.sport}">${c.sport}</div>
      <p class="court-address">📍 ${c.address}</p>
      <p class="court-rate">₹${parseFloat(c.rate_per_hour).toFixed(2)} <span>/ hour</span></p>
      <p class="${c.status === 'available' ? 'status-available' : 'status-unavailable'}">
        ${c.status === 'available' ? '✓ Available' : '✗ Unavailable'}
      </p>
    </div>
  `).join('');
}

// ─── BOOKING ─────────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

function openBooking(courtId) {
  const court = allCourts.find(c => c.id === courtId);
  if (!court || court.status === 'unavailable') return;
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
    </div>
  `;

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

  try {
    const res = await authFetch(`${API}/bookings?courtId=${state.selectedCourt.id}&date=${date}`);
    const booked = await res.json();

    const grid = document.getElementById('slots-grid');
    grid.innerHTML = TIME_SLOTS.map(t => {
      const isBooked = booked.includes(t + ':00') || booked.includes(t);
      return `<div class="slot ${isBooked ? 'booked' : ''}" onclick="${isBooked ? '' : `selectSlot('${t}', this)`}">${t}</div>`;
    }).join('');

    document.getElementById('slots-container').classList.remove('hidden');
    document.getElementById('booking-error').classList.add('hidden');
  } catch {
    document.getElementById('booking-error').textContent = 'Failed to load slots.';
    document.getElementById('booking-error').classList.remove('hidden');
  }
}

function selectSlot(time, el) {
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSlot = time;
  document.getElementById('confirm-btn').disabled = false;
}

async function confirmBooking() {
  const date = document.getElementById('booking-date').value;
  const errEl = document.getElementById('booking-error');
  errEl.classList.add('hidden');

  if (parseFloat(state.walletBalance) < parseFloat(state.selectedCourt.rate_per_hour)) {
    errEl.textContent = `Insufficient balance. Required: ₹${state.selectedCourt.rate_per_hour}. Please top up your wallet.`;
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await authFetch(`${API}/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId: state.selectedCourt.id, date, time: state.selectedSlot + ':00' })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Booking failed.';
      errEl.classList.remove('hidden');
      return;
    }

    state.walletBalance -= parseFloat(state.selectedCourt.rate_per_hour);
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    alert(`Booking confirmed! ₹${data.amount} deducted from your wallet.`);
    loadSlots();
  } catch {
    errEl.textContent = 'Booking failed. Please try again.';
    errEl.classList.remove('hidden');
  }
}

// ─── MY BOOKINGS ─────────────────────────────────────────────────────────────
async function loadMyBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
  try {
    const res = await authFetch(`${API}/bookings/user/${state.userId}`);
    const bookings = await res.json();

    if (!bookings.length) {
      list.innerHTML = '<div class="bookings-empty"><p>No bookings yet.</p><p style="margin-top:0.5rem;font-size:0.85rem">Browse courts to make your first booking!</p></div>';
      return;
    }

    list.innerHTML = bookings.map(b => `
      <div class="booking-item">
        <div class="booking-info">
          <h4>${b.name} <span class="sport-badge sport-${b.sport}" style="font-size:0.7rem">${b.sport}</span></h4>
          <p class="booking-meta">📅 ${formatDate(b.date)} &nbsp;⏰ ${b.time} &nbsp;💰 ₹${b.rate_per_hour || ''}</p>
        </div>
        <div style="display:flex;gap:0.8rem;align-items:center">
          <span class="booking-status status-${b.status}">${b.status}</span>
          ${b.status === 'confirmed' ? `<button class="btn-cancel" onclick="cancelBooking(${b.id})">Cancel</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--danger)">Failed to load bookings.</p>';
  }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? The amount will be refunded to your wallet.')) return;
  try {
    const res = await authFetch(`${API}/bookings/${id}/cancel`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Cancellation failed.');
    state.walletBalance += parseFloat(data.refundAmount || 0);
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    loadMyBookings();
  } catch {
    alert('Cancellation failed.');
  }
}

// ─── WALLET ──────────────────────────────────────────────────────────────────
async function loadWallet() {
  try {
    const res = await authFetch(`${API}/wallet/balance`);
    const data = await res.json();
    state.walletBalance = data.balance || 0;
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    document.getElementById('wallet-balance').textContent = `₹${parseFloat(state.walletBalance).toFixed(2)}`;
  } catch {}
}

function setAmount(val) {
  document.getElementById('wallet-amount').value = val;
}

async function addMoney() {
  const amount = parseFloat(document.getElementById('wallet-amount').value);
  const errEl = document.getElementById('wallet-error');
  const sucEl = document.getElementById('wallet-success');
  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');

  if (!amount || amount <= 0) {
    errEl.textContent = 'Enter a valid amount.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await authFetch(`${API}/wallet/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to add money.';
      errEl.classList.remove('hidden');
      return;
    }
    state.walletBalance = data.newBalance;
    localStorage.setItem('walletBalance', state.walletBalance);
    updateNavBalance();
    document.getElementById('wallet-balance').textContent = `₹${parseFloat(state.walletBalance).toFixed(2)}`;
    document.getElementById('wallet-amount').value = '';
    sucEl.textContent = `₹${amount} added successfully!`;
    sucEl.classList.remove('hidden');
  } catch {
    errEl.textContent = 'Failed to add money.';
    errEl.classList.remove('hidden');
  }
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('admin-courts').classList.toggle('hidden', tab !== 'courts');
  document.getElementById('admin-bookings').classList.toggle('hidden', tab !== 'bookings');
  if (tab === 'bookings') loadAdminBookings();
}

async function loadAdmin() {
  loadAdminCourts();
}

async function loadAdminCourts() {
  const list = document.getElementById('admin-courts-list');
  list.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
  try {
    const res = await authFetch(`${API}/admin/courts`);
    const courts = await res.json();
    list.innerHTML = courts.map(c => `
      <div class="admin-court-row">
        <div class="admin-court-info">
          <h4>${c.name} <span class="sport-badge sport-${c.sport}" style="font-size:0.7rem">${c.sport}</span></h4>
          <p>📍 ${c.address} &nbsp;|&nbsp; ₹${c.rate_per_hour}/hr &nbsp;|&nbsp; ${c.status}</p>
        </div>
        <div class="admin-court-actions">
          <button class="btn-edit" onclick="openCourtModal(${JSON.stringify(c).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn-danger" onclick="deleteCourt(${c.id})">Delete</button>
        </div>
      </div>
    `).join('') || '<p style="color:var(--muted)">No courts yet.</p>';
  } catch {
    list.innerHTML = '<p style="color:var(--danger)">Failed to load.</p>';
  }
}

async function loadAdminBookings() {
  const list = document.getElementById('admin-bookings-list');
  list.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
  try {
    const res = await authFetch(`${API}/admin/bookings`);
    const bookings = await res.json();
    list.innerHTML = bookings.map(b => `
      <div class="admin-booking-row">
        <div class="admin-booking-info">
          <strong>${b.court_name}</strong> (${b.sport})
          <p style="color:var(--muted);margin-top:3px">User: ${b.username} &nbsp;|&nbsp; ${formatDate(b.date)} at ${b.time}</p>
        </div>
        <span class="booking-status status-${b.status}">${b.status}</span>
      </div>
    `).join('') || '<p style="color:var(--muted)">No bookings yet.</p>';
  } catch {
    list.innerHTML = '<p style="color:var(--danger)">Failed to load.</p>';
  }
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
    document.getElementById('modal-court-id').value = '';
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-sport').value = '';
    document.getElementById('modal-address').value = '';
    document.getElementById('modal-rate').value = '';
    document.getElementById('modal-status').value = 'available';
  }
  document.getElementById('court-modal').classList.remove('hidden');
}

function closeCourtModal() {
  document.getElementById('court-modal').classList.add('hidden');
}

async function saveCourt(e) {
  e.preventDefault();
  const id = document.getElementById('modal-court-id').value;
  const body = {
    name: document.getElementById('modal-name').value,
    sport: document.getElementById('modal-sport').value,
    address: document.getElementById('modal-address').value,
    rate_per_hour: document.getElementById('modal-rate').value,
    status: document.getElementById('modal-status').value,
  };

  try {
    const url = id ? `${API}/admin/courts/${id}` : `${API}/admin/courts`;
    const method = id ? 'PUT' : 'POST';
    const res = await authFetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('modal-error').textContent = data.error;
      document.getElementById('modal-error').classList.remove('hidden');
      return;
    }
    closeCourtModal();
    loadAdminCourts();
    allCourts = [];
  } catch {
    document.getElementById('modal-error').textContent = 'Failed to save court.';
    document.getElementById('modal-error').classList.remove('hidden');
  }
}

async function deleteCourt(id) {
  if (!confirm('Delete this court? All associated bookings will also be deleted.')) return;
  try {
    const res = await authFetch(`${API}/admin/courts/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert('Delete failed.');
    loadAdminCourts();
    allCourts = [];
  } catch {
    alert('Delete failed.');
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${state.token}` }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
