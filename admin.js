// Ms. Lil Baker — Admin Panel Order Management Logic

const config = window.MSB_CONFIG || {};
const body = document.querySelector('#ordersBody');
const status = document.querySelector('#adminStatus');
const client = window.supabase?.createClient(config.url, config.anonKey);

let rows = [];

// Helper Functions
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const code = (id) => `MLB-${String(id).padStart(4, '0')}`;

const fmtDate = (d) => d 
  ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

// Filter Orders Based on Search, Status, and Date
function filtered() {
  const query = (document.querySelector('#searchOrders')?.value || '').trim().toLowerCase();
  const statusFilter = document.querySelector('#statusFilter')?.value || 'all';
  const dateFilter = document.querySelector('#dateFilter')?.value || '';

  return rows.filter((o) => {
    const haystack = `${o.id} ${o.customer_name || ''} ${o.phone || ''}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesDate = !dateFilter || o.requested_date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });
}

// Render Order Table Rows
function render() {
  const list = filtered();

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-menu">No orders match these filters.</div></td></tr>`;
    return;
  }

  body.innerHTML = list.map((o) => {
    const orderItems = Array.isArray(o.items)
      ? o.items.map((i) => `• ${esc(i.name)} × ${Number(i.qty) || 1}`).join('<br>')
      : '—';

    const formattedAmount = o.total_amount ? `₹${Number(o.total_amount).toLocaleString('en-IN')}` : 'Pending';
    const cleanPhone = String(o.phone || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`Hi ${o.customer_name || 'there'}, update regarding your Ms. Lil Baker order ${code(o.id)}: Status is now "${(o.status || 'new').toUpperCase()}".`);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${waText}` : '#';

    return `
      <tr class="order-row status-row-${esc(o.status || 'new')}">
        <td>
          <strong class="order-code">${code(o.id)}</strong>
          <div class="small text-muted">Placed ${new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </td>
        <td>
          <strong>${fmtDate(o.requested_date)}</strong>
        </td>
        <td>
          <strong>${esc(o.customer_name)}</strong>
          <div class="small notes-text">${esc(o.notes || 'No custom notes')}</div>
        </td>
        <td>
          <div class="phone-cell">
            <span>${esc(o.phone)}</span>
            ${cleanPhone ? `<a href="${waUrl}" target="_blank" class="btn-wa-sm" title="Chat on WhatsApp"><i class="fa-brands fa-whatsapp"></i> Chat</a>` : ''}
          </div>
        </td>
        <td class="items-cell">${orderItems}</td>
        <td><strong class="amount-text">${formattedAmount}</strong></td>
        <td>
          <div class="status-select-wrap">
            <select data-id="${o.id}" class="order-status status-badge-${esc(o.status || 'new')}">
              <option value="new" ${o.status === 'new' ? 'selected' : ''}>🔴 New</option>
              <option value="accepted" ${o.status === 'accepted' ? 'selected' : ''}>🟡 Accepted</option>
              <option value="preparing" ${o.status === 'preparing' ? 'selected' : ''}>🟠 Preparing</option>
              <option value="ready" ${o.status === 'ready' ? 'selected' : ''}>🟢 Ready</option>
              <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
              <option value="rejected" ${o.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
            </select>
          </div>
          <div class="quick-actions">
            <button class="btn-action btn-accept" data-quick="accepted" data-id="${o.id}">Accept</button>
            <button class="btn-action btn-prep" data-quick="preparing" data-id="${o.id}">Prep</button>
            <button class="btn-action btn-ready" data-quick="ready" data-id="${o.id}">Ready</button>
            <button class="btn-action btn-reject" data-quick="rejected" data-id="${o.id}">Reject</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach Event Handlers
  document.querySelectorAll('.order-status').forEach((s) => {
    s.onchange = () => setStatus(s.dataset.id, s.value);
  });

  document.querySelectorAll('[data-quick]').forEach((b) => {
    b.onclick = () => setStatus(b.dataset.id, b.dataset.quick);
  });
}

// Update Order Status in Supabase
async function setStatus(id, newStatus) {
  const { error } = await client.from('orders').update({ status: newStatus }).eq('id', id);

  if (error) {
    alert('Could not update order: ' + error.message);
    return;
  }

  const order = rows.find((x) => String(x.id) === String(id));
  if (order) order.status = newStatus;

  render();
  updateStats();
  if (status) status.textContent = `Order ${code(id)} status updated to "${newStatus}".`;
}

// Recalculate Dashboard Stats Bar
function updateStats() {
  const today = new Date().toISOString().slice(0, 10);
  
  const statNew = document.querySelector('#statNew');
  const statPreparing = document.querySelector('#statPreparing');
  const statReady = document.querySelector('#statReady');
  const statToday = document.querySelector('#statToday');

  if (statNew) statNew.textContent = rows.filter((o) => o.status === 'new').length;
  if (statPreparing) statPreparing.textContent = rows.filter((o) => ['accepted', 'preparing'].includes(o.status)).length;
  if (statReady) statReady.textContent = rows.filter((o) => o.status === 'ready').length;
  if (statToday) statToday.textContent = rows.filter((o) => String(o.created_at || '').slice(0, 10) === today).length;
}

// Load Orders from Database
async function load() {
  if (status) status.textContent = 'Refreshing live orders…';

  if (!client) {
    if (status) status.textContent = 'Supabase client unavailable. Check config.js.';
    return;
  }

  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    location.href = 'admin-login.html';
    return;
  }

  try {
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    rows = data || [];
    updateStats();
    render();

    if (status) status.textContent = `Live • ${rows.length} total order${rows.length === 1 ? '' : 's'}`;
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Failed to fetch live orders.';
  }
}

// Global Event Listeners
document.querySelector('#refresh')?.addEventListener('click', load);

document.querySelector('#logout')?.addEventListener('click', async () => {
  await client.auth.signOut();
  location.href = 'admin-login.html';
});

['searchOrders', 'statusFilter', 'dateFilter'].forEach((id) => {
  document.querySelector('#' + id)?.addEventListener('input', render);
});

document.querySelector('#clearFilters')?.addEventListener('click', () => {
  const searchInput = document.querySelector('#searchOrders');
  const statusSelect = document.querySelector('#statusFilter');
  const dateInput = document.querySelector('#dateFilter');

  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = 'all';
  if (dateInput) dateInput.value = '';

  render();
});

// Initialize & Auto-Refresh Every 15 Seconds
load();
setInterval(load, 15000);
