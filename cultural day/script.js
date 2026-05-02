/**
 * ============================================================
 *  WORLD MISSION CULTURAL DAY – script.js
 *  Features:
 *    • Form validation with descriptive error messages
 *    • LocalStorage persistence
 *    • Participant CRUD (create, read, update, delete)
 *    • Search by name / country
 *    • Filter by participation type
 *    • CSV export
 * ============================================================
 */

'use strict';

/* ── Storage key ── */
const STORAGE_KEY = 'wmcd_registrations';

/* ── Load registrations from LocalStorage ── */
function loadRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/* ── Save registrations to LocalStorage ── */
function saveRegistrations(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ── State ── */
let registrations = loadRegistrations();
let activeFilter  = 'All';
let searchQuery   = '';

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    // Toggle active class on buttons
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle active class on panels
    tabPanels.forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${target}`).classList.add('active');

    // Refresh list when switching to participants tab
    if (target === 'participants') renderParticipants();
  });
});

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

/**
 * Display an error message for a field.
 * @param {string} fieldId  – base field id (without 'err-')
 * @param {string} message  – text to show; empty string = clear
 */
function setError(fieldId, message) {
  const errEl = document.getElementById(`err-${fieldId}`);
  if (!errEl) return;
  errEl.textContent = message ? `⚠ ${message}` : '';

  // Mark / unmark the input element
  const inputEl = document.getElementById(fieldId)
                || document.querySelector(`[name="${fieldId}"]`);
  if (!inputEl) return;

  if (message) {
    inputEl.classList.add('invalid');
  } else {
    inputEl.classList.remove('invalid');
  }
}

/**
 * Validate all form fields.
 * @returns {boolean} – true if all valid
 */
function validateForm() {
  let isValid = true;

  // ── Full Name
  const name = document.getElementById('fullName').value.trim();
  if (!name) {
    setError('fullName', 'Full name is required.');
    isValid = false;
  } else if (name.length < 2) {
    setError('fullName', 'Name must be at least 2 characters.');
    isValid = false;
  } else {
    setError('fullName', '');
  }

  // ── Email
  const email = document.getElementById('email').value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    setError('email', 'Email address is required.');
    isValid = false;
  } else if (!emailRegex.test(email)) {
    setError('email', 'Please enter a valid email address.');
    isValid = false;
  } else {
    setError('email', '');
  }

  // ── Phone
  const phone = document.getElementById('phone').value.trim();
  // Allow digits, spaces, +, -, ()
  const phoneRegex = /^[+\d][\d\s\-().]{6,19}$/;
  if (!phone) {
    setError('phone', 'Phone number is required.');
    isValid = false;
  } else if (!phoneRegex.test(phone)) {
    setError('phone', 'Enter a valid phone number (7–20 digits).');
    isValid = false;
  } else {
    setError('phone', '');
  }

  // ── Gender
  const genderChecked = document.querySelector('input[name="gender"]:checked');
  if (!genderChecked) {
    setError('gender', 'Please select a gender.');
    isValid = false;
  } else {
    setError('gender', '');
  }

  // ── Country
  const country = document.getElementById('country').value.trim();
  if (!country) {
    setError('country', 'Country / Culture is required.');
    isValid = false;
  } else {
    setError('country', '');
  }

  // ── Participation Type
  const participation = document.getElementById('participation').value;
  if (!participation) {
    setError('participation', 'Please select a participation type.');
    isValid = false;
  } else {
    setError('participation', '');
  }

  // ── Terms checkbox
  const terms = document.getElementById('terms').checked;
  if (!terms) {
    setError('terms', 'You must agree to the Terms & Conditions.');
    isValid = false;
  } else {
    setError('terms', '');
  }

  return isValid;
}

/* ============================================================
   FORM SUBMISSION
   ============================================================ */
const form = document.getElementById('registrationForm');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (!validateForm()) return;

  // Build registration object
  const registration = {
    id:            Date.now().toString(),  // unique ID
    fullName:      document.getElementById('fullName').value.trim(),
    email:         document.getElementById('email').value.trim(),
    phone:         document.getElementById('phone').value.trim(),
    gender:        document.querySelector('input[name="gender"]:checked').value,
    country:       document.getElementById('country').value.trim(),
    participation: document.getElementById('participation').value,
    requests:      document.getElementById('requests').value.trim(),
    registeredAt:  new Date().toLocaleString(),
  };

  // Save
  registrations.push(registration);
  saveRegistrations(registrations);

  // Reset form
  form.reset();

  // Clear any remaining invalid highlights
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  // Show success banner
  const banner = document.getElementById('successBanner');
  banner.classList.remove('hidden');
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

/* Close success banner */
document.getElementById('closeBanner').addEventListener('click', () => {
  document.getElementById('successBanner').classList.add('hidden');
});

/* ============================================================
   RENDER PARTICIPANTS TABLE
   ============================================================ */
function renderParticipants() {
  const tbody = document.getElementById('participantBody');
  const emptyState = document.getElementById('emptyState');
  const countBadge = document.getElementById('participantCount');

  // Filter & search
  let filtered = registrations.filter(r => {
    const matchFilter = activeFilter === 'All' || r.participation === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || r.fullName.toLowerCase().includes(q)
      || r.country.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // Update count
  countBadge.textContent = `${registrations.length} registered`;

  // Empty state
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Build rows
  tbody.innerHTML = filtered.map((r, index) => `
    <tr data-id="${r.id}">
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(r.fullName)}</strong><br/>
          <span style="font-size:0.75rem;color:var(--text-light)">${escapeHtml(r.email)}</span>
      </td>
      <td>${escapeHtml(r.email)}</td>
      <td>🌍 ${escapeHtml(r.country)}</td>
      <td><span class="role-badge role-${r.participation}">${r.participation}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit"   onclick="openEditModal('${r.id}')">✏️ Edit</button>
          <button class="btn-delete" onclick="deleteRegistration('${r.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ── Helper: prevent XSS ── */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ============================================================
   DELETE
   ============================================================ */
window.deleteRegistration = function (id) {
  if (!confirm('Remove this participant from the list?')) return;
  registrations = registrations.filter(r => r.id !== id);
  saveRegistrations(registrations);
  renderParticipants();
};

/* ============================================================
   EDIT MODAL
   ============================================================ */
window.openEditModal = function (id) {
  const record = registrations.find(r => r.id === id);
  if (!record) return;

  document.getElementById('editId').value           = record.id;
  document.getElementById('editName').value         = record.fullName;
  document.getElementById('editCountry').value      = record.country;
  document.getElementById('editParticipation').value = record.participation;

  document.getElementById('editModal').classList.remove('hidden');
};

document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

// Close on overlay click
document.getElementById('editModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.add('hidden');
});

document.getElementById('saveEdit').addEventListener('click', () => {
  const id          = document.getElementById('editId').value;
  const newName     = document.getElementById('editName').value.trim();
  const newCountry  = document.getElementById('editCountry').value.trim();
  const newRole     = document.getElementById('editParticipation').value;

  if (!newName || !newCountry) {
    alert('Name and Country cannot be empty.');
    return;
  }

  const record = registrations.find(r => r.id === id);
  if (record) {
    record.fullName     = newName;
    record.country      = newCountry;
    record.participation = newRole;
    saveRegistrations(registrations);
  }

  document.getElementById('editModal').classList.add('hidden');
  renderParticipants();
});

/* ============================================================
   SEARCH & FILTER
   ============================================================ */
document.getElementById('searchInput').addEventListener('input', function () {
  searchQuery = this.value;
  renderParticipants();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter;
    renderParticipants();
  });
});

/* ============================================================
   CSV EXPORT
   ============================================================ */
document.getElementById('exportBtn').addEventListener('click', () => {
  if (registrations.length === 0) {
    alert('No registrations to export yet.');
    return;
  }

  const headers = ['#', 'Full Name', 'Email', 'Phone', 'Gender', 'Country', 'Participation', 'Special Requests', 'Registered At'];

  const rows = registrations.map((r, i) => [
    i + 1,
    `"${r.fullName}"`,
    r.email,
    r.phone,
    r.gender,
    `"${r.country}"`,
    r.participation,
    `"${r.requests.replace(/"/g, '""')}"`,
    r.registeredAt,
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'wmcd_registrations.csv';
  a.click();
  URL.revokeObjectURL(url);
});

/* ============================================================
   LIVE VALIDATION (clear errors on input)
   ============================================================ */
['fullName', 'email', 'phone', 'country'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => setError(id, ''));
});

document.getElementById('participation').addEventListener('change', () => setError('participation', ''));
document.getElementById('terms').addEventListener('change', () => setError('terms', ''));

document.querySelectorAll('input[name="gender"]').forEach(radio => {
  radio.addEventListener('change', () => setError('gender', ''));
});

/* ============================================================
   INIT
   ============================================================ */
// Set school logo
const heroLogo = document.getElementById('heroLogo');
if (heroLogo && typeof SCHOOL_LOGO !== 'undefined') heroLogo.src = SCHOOL_LOGO;

// Initial render when page loads (in case already on participants tab)
renderParticipants();
