/* ═══════════════════════════════════════════════════════════════
   CAFE MANAGEMENT SYSTEM — script.js
   Dual-Role System (Customer & Admin) + Python Backend Integration
   Student: Dev Jain | Roll: 44 | Section: A4 | Batch: B3
═══════════════════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════════════════════
//  CONFIGURATION & STATE
// ══════════════════════════════════════════════════════════════

// REST API base URL (relative when served by Flask, or localhost when opened directly)
const API_BASE = window.location.origin.includes('5000') 
  ? '/api' 
  : 'http://localhost:5000/api';

const STORAGE_KEYS = {
  ROLE: 'cms_active_role',
  MENU: 'cms_menu',
  ORDERS: 'cms_orders',
  CART: 'cms_cart',
  NEXT_MID: 'cms_next_mid',
  NEXT_OID: 'cms_next_oid'
};

const DEFAULT_MENU = [
  { id:1,  name:'Espresso',             category:'Coffee',      price:80,  description:'Single-shot dark roast espresso.',           available:true  },
  { id:2,  name:'Cappuccino',           category:'Coffee',      price:120, description:'Espresso topped with steamed milk foam.',    available:true  },
  { id:3,  name:'Cafe Latte',           category:'Coffee',      price:130, description:'Espresso balanced with steamed milk.',       available:true  },
  { id:4,  name:'Cold Coffee',          category:'Cold Drinks', price:150, description:'Chilled coffee with vanilla ice cream.',     available:true  },
  { id:5,  name:'Masala Chai',          category:'Tea',         price:60,  description:'Spiced black tea with cardamom and ginger.', available:true  },
  { id:6,  name:'Green Tea',            category:'Tea',         price:80,  description:'Organic herbal green tea infusion.',         available:true  },
  { id:7,  name:'Chocolate Cake',       category:'Desserts',    price:180, description:'Dark chocolate layered truffle cake slice.', available:true  },
  { id:8,  name:'Croissant',            category:'Bakery',      price:110, description:'Buttery, flaky French puff pastry.',         available:true  },
  { id:9,  name:'Veg Grilled Sandwich', category:'Snacks',      price:90,  description:'Toasted bread with seasoned garden vegetables.', available:true  },
  { id:10, name:'French Fries',         category:'Snacks',      price:100, description:'Seasoned crispy golden potato fries.',        available:false },
  { id:11, name:'Fluffy Pancakes',      category:'Breakfast',   price:140, description:'Stacked warm pancakes served with syrup.',    available:true  },
  { id:12, name:'Mango Smoothie',       category:'Cold Drinks', price:160, description:'Alphonso mangoes blended with yogurt.',       available:true  },
];

let currentRole = null; // 'customer' or 'admin'
let currentPage = null;
let menuItems   = [];
let orders      = [];
let cart        = [];    // Array of { menuItem, qty }
let isBackendOnline = false;

// ══════════════════════════════════════════════════════════════
//  API COMMUNICATION (With automatic offline fallback)
// ══════════════════════════════════════════════════════════════

async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/stats`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      isBackendOnline = true;
      return true;
    }
  } catch (e) {
    isBackendOnline = false;
  }
  return false;
}

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] Falling back to local storage: ${err.message}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  DATA MANAGEMENT (Load / Save)
// ══════════════════════════════════════════════════════════════

async function loadData() {
  const backendUp = await checkBackend();

  if (backendUp) {
    const menuData = await apiFetch('/menu');
    const ordersData = await apiFetch('/orders');
    if (menuData) menuItems = menuData;
    if (ordersData) orders = ordersData;
  } else {
    // Local storage fallback
    const rawMenu = localStorage.getItem(STORAGE_KEYS.MENU);
    menuItems = rawMenu ? JSON.parse(rawMenu) : [...DEFAULT_MENU];

    const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    orders = rawOrders ? JSON.parse(rawOrders) : [
      {
        id: 101,
        order_date: new Date(Date.now() - 3600000).toLocaleString('en-IN'),
        customer_name: 'Dev Jain',
        subtotal: 200,
        tax: 10,
        total: 210,
        status: 'Preparing',
        payment_status: 'Paid',
        items: [
          { name: 'Cappuccino', quantity: 1, unit_price: 120, subtotal: 120 },
          { name: 'Green Tea', quantity: 1, unit_price: 80, subtotal: 80 }
        ]
      },
      {
        id: 102,
        order_date: new Date(Date.now() - 1800000).toLocaleString('en-IN'),
        customer_name: 'Table 4',
        subtotal: 270,
        tax: 13.5,
        total: 283.5,
        status: 'Pending',
        payment_status: 'Unpaid',
        items: [
          { name: 'Chocolate Cake', quantity: 1, unit_price: 180, subtotal: 180 },
          { name: 'Veg Grilled Sandwich', quantity: 1, unit_price: 90, subtotal: 90 }
        ]
      }
    ];
    saveLocal();
  }

  // Load cart from storage
  const rawCart = localStorage.getItem(STORAGE_KEYS.CART);
  cart = rawCart ? JSON.parse(rawCart) : [];
  updateCartBadge();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// ══════════════════════════════════════════════════════════════
//  VALIDATION FUNCTIONS (Tested in white-box testing)
// ══════════════════════════════════════════════════════════════

function validateItemName(name) {
  if (name === null || name === undefined || String(name).trim() === '') {
    return { ok: false, msg: 'Item name cannot be empty.' };
  }
  const t = String(name).trim();
  if (t.length < 2)   return { ok: false, msg: 'Item name must be at least 2 characters.' };
  if (t.length > 150) return { ok: false, msg: 'Item name must not exceed 150 characters.' };
  if (!/[a-zA-Z0-9]/.test(t)) {
    return { ok: false, msg: 'Item name must contain at least one letter or digit.' };
  }
  return { ok: true, msg: '' };
}

function validatePrice(val) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { ok: false, msg: 'Price cannot be empty.' };
  }
  const n = parseFloat(String(val).trim());
  if (isNaN(n))    return { ok: false, msg: 'Price must be a valid number.' };
  if (n <= 0)      return { ok: false, msg: 'Price must be greater than zero.' };
  if (n > 99999)   return { ok: false, msg: 'Price must not exceed ₹99,999.' };
  return { ok: true, msg: '' };
}

function validateCategory(cat) {
  if (!cat || !String(cat).trim()) {
    return { ok: false, msg: 'Please select a category.' };
  }
  return { ok: true, msg: '' };
}

function validateQuantity(qty) {
  const n = parseInt(String(qty).trim(), 10);
  if (isNaN(n) || n < 1) return { ok: false, msg: 'Quantity must be at least 1.' };
  if (n > 99)            return { ok: false, msg: 'Quantity must not exceed 99.' };
  return { ok: true, msg: '' };
}

function calculateSubtotal(items) {
  return items.reduce((acc, it) => acc + (it.unit_price || it.price) * (it.quantity || it.qty), 0);
}

function calculateTax(subtotal, rate = 0.05) {
  return Math.round(subtotal * rate * 100) / 100;
}

function calculateTotal(subtotal, tax) {
  return Math.round((subtotal + tax) * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
//  LOGIN & ROLE SWITCHING
// ══════════════════════════════════════════════════════════════

function loginAs(role) {
  currentRole = role;
  localStorage.setItem(STORAGE_KEYS.ROLE, role);

  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');

  // Update sidebar branding & user profile
  const roleLabel = document.getElementById('sb-role-label');
  const suAvatar = document.getElementById('su-avatar');
  const suName = document.getElementById('su-name');
  const suRoleText = document.getElementById('su-role-text');

  if (role === 'admin') {
    if (roleLabel) roleLabel.textContent = 'Administration';
    if (suAvatar) { suAvatar.textContent = 'A'; suAvatar.style.background = 'var(--c-sand)'; suAvatar.style.color = 'var(--text-main)'; }
    if (suName) suName.textContent = 'Administrator';
    if (suRoleText) suRoleText.textContent = 'Operations';
    renderSidebarNav('admin');
    navigate('a-dashboard');
  } else {
    if (roleLabel) roleLabel.textContent = 'Customer';
    if (suAvatar) { suAvatar.textContent = 'C'; suAvatar.style.background = 'var(--c-sky)'; suAvatar.style.color = 'var(--c-sky-dark)'; }
    if (suName) suName.textContent = 'Dev Jain';
    if (suRoleText) suRoleText.textContent = 'Customer';
    renderSidebarNav('customer');
    navigate('c-menu');
  }

  showToast(`Signed in as ${role === 'admin' ? 'Administrator' : 'Customer'}`);
}

function logout() {
  currentRole = null;
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appShell) appShell.classList.add('hidden');
  showToast('Signed out');
}

function renderSidebarNav(role) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  if (role === 'admin') {
    nav.innerHTML = `
      <div class="nav-item" id="nav-a-dashboard" onclick="navigate('a-dashboard')">
        <span>Dashboard</span>
      </div>
      <div class="nav-item" id="nav-a-menu" onclick="navigate('a-menu')">
        <span>Menu Items</span>
      </div>
      <div class="nav-item" id="nav-a-orders" onclick="navigate('a-orders')">
        <span>Order Management</span>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <div class="nav-item" id="nav-c-menu" onclick="navigate('c-menu')">
        <span>Menu Catalog</span>
      </div>
      <div class="nav-item" id="nav-c-cart" onclick="navigate('c-cart')">
        <span>Cart</span>
        <span class="nav-badge" id="nav-cart-badge" style="display:none">0</span>
      </div>
      <div class="nav-item" id="nav-c-orders" onclick="navigate('c-orders')">
        <span>Order History</span>
      </div>
    `;
  }
}

function navigate(pageId) {
  currentPage = pageId;

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  // Update sidebar active link
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${pageId}`);
  if (activeNav) activeNav.classList.add('active');

  // Render content according to page
  if (pageId === 'c-menu')      renderCustomerMenu();
  if (pageId === 'c-cart')      renderCustomerCart();
  if (pageId === 'c-orders')    renderMyOrders();
  if (pageId === 'a-dashboard') renderAdminDashboard();
  if (pageId === 'a-menu')      renderAdminMenu();
  if (pageId === 'a-orders')    renderAdminOrders();
}

// ══════════════════════════════════════════════════════════════
//  CUSTOMER: MENU BROWSING & CART
// ══════════════════════════════════════════════════════════════

function populateCategoryDropdowns() {
  const categories = [...new Set(menuItems.map(m => m.category))].sort();

  ['c-menu-cat', 'a-menu-cat', 'item-category'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    const defaultLabel = id === 'item-category' ? 'Select category' : 'All Categories';
    el.innerHTML = `<option value="">${defaultLabel}</option>` +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (currentVal && categories.includes(currentVal)) {
      el.value = currentVal;
    }
  });
}

function renderCustomerMenu() {
  const grid = document.getElementById('c-menu-grid');
  if (!grid) return;

  populateCategoryDropdowns();

  const search = (document.getElementById('c-menu-search')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('c-menu-cat')?.value || '';

  const filtered = menuItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) || 
                        (item.description && item.description.toLowerCase().includes(search));
    const matchCat = !catFilter || item.category === catFilter;
    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 16px;color:var(--text-muted)">
        No menu items found.
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const inCart = cart.find(ci => ci.menuItem.id === item.id);
    const qty = inCart ? inCart.qty : 0;

    return `
      <div class="menu-card ${!item.available ? 'unavailable' : ''}">
        <div class="mc-header">
          <span class="mc-category">${escapeHtml(item.category)}</span>
          ${!item.available ? '<span class="mc-avail">Unavailable</span>' : ''}
        </div>
        <div class="mc-title">${escapeHtml(item.name)}</div>
        <div class="mc-desc">${escapeHtml(item.description || 'Standard catalog item.')}</div>
        <div class="mc-footer">
          <div class="mc-price">₹${Number(item.price).toFixed(2)}</div>
          <div>
            ${!item.available ? `
              <button class="btn btn-secondary btn-sm" disabled>Sold Out</button>
            ` : qty > 0 ? `
              <div class="mc-qty-ctrl">
                <button class="mc-qty-btn" onclick="updateCartQty(${item.id}, ${qty - 1})">−</button>
                <span class="mc-qty-val">${qty}</span>
                <button class="mc-qty-btn" onclick="updateCartQty(${item.id}, ${qty + 1})">+</button>
              </div>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="addToCartById(${item.id})">Add to Cart</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addToCartById(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;
  if (!item.available) {
    showToast(`"${item.name}" is currently unavailable`, 'error');
    return;
  }

  const existing = cart.find(ci => ci.menuItem.id === itemId);
  if (existing) {
    if (existing.qty >= 99) {
      showToast('Maximum quantity of 99 reached', 'error');
      return;
    }
    existing.qty++;
  } else {
    cart.push({ menuItem: item, qty: 1 });
  }

  saveLocal();
  updateCartBadge();
  renderCustomerMenu();
  showToast(`Added ${item.name} to cart`, 'success');
}

function updateCartQty(itemId, newQty) {
  if (newQty <= 0) {
    cart = cart.filter(ci => ci.menuItem.id !== itemId);
    showToast('Item removed from cart');
  } else {
    const existing = cart.find(ci => ci.menuItem.id === itemId);
    if (existing) {
      existing.qty = Math.min(newQty, 99);
    }
  }

  saveLocal();
  updateCartBadge();
  if (currentPage === 'c-menu') renderCustomerMenu();
  if (currentPage === 'c-cart') renderCustomerCart();
}

function updateCartBadge() {
  const totalCount = cart.reduce((sum, ci) => sum + ci.qty, 0);

  const headerBadge = document.getElementById('header-cart-badge');
  if (headerBadge) {
    headerBadge.textContent = totalCount > 0 ? `(${totalCount})` : '';
  }

  const navBadge = document.getElementById('nav-cart-badge');
  if (navBadge) {
    navBadge.textContent = totalCount;
    navBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
  }
}

function renderCustomerCart() {
  const body = document.getElementById('cart-body');
  const summary = document.getElementById('cart-summary-panel');
  if (!body || !summary) return;

  if (cart.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="table-empty">Your cart is currently empty. <br><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('c-menu')">Back to Catalog</button></td></tr>`;
    summary.innerHTML = '';
    return;
  }

  let subtotal = 0;
  body.innerHTML = cart.map(ci => {
    const lineTotal = ci.menuItem.price * ci.qty;
    subtotal += lineTotal;
    return `
      <tr>
        <td><strong>${escapeHtml(ci.menuItem.name)}</strong></td>
        <td><span class="mc-category">${escapeHtml(ci.menuItem.category)}</span></td>
        <td style="text-align:right">₹${Number(ci.menuItem.price).toFixed(2)}</td>
        <td style="text-align:center">
          <div class="mc-qty-ctrl" style="display:inline-flex">
            <button class="mc-qty-btn" onclick="updateCartQty(${ci.menuItem.id}, ${ci.qty - 1})">−</button>
            <span class="mc-qty-val">${ci.qty}</span>
            <button class="mc-qty-btn" onclick="updateCartQty(${ci.menuItem.id}, ${ci.qty + 1})">+</button>
          </div>
        </td>
        <td style="text-align:right">₹${lineTotal.toFixed(2)}</td>
        <td style="text-align:center">
          <button class="btn btn-danger btn-sm" onclick="updateCartQty(${ci.menuItem.id}, 0)">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  const tax = calculateTax(subtotal, 0.05);
  const total = calculateTotal(subtotal, tax);

  summary.innerHTML = `
    <div class="cart-summary-panel">
      <div class="cart-row"><span>Subtotal (${cart.reduce((a, b) => a + b.qty, 0)} items):</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="cart-row"><span>GST (5%):</span><span>₹${tax.toFixed(2)}</span></div>
      <div class="cart-row total-row"><span>Total Payable:</span><span>₹${total.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px;gap:8px">
        <button class="btn btn-secondary" onclick="clearCart()">Clear Cart</button>
        <button class="btn btn-primary" onclick="openConfirmModal()">Proceed to Order</button>
      </div>
    </div>
  `;
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  saveLocal();
  updateCartBadge();
  renderCustomerCart();
  showToast('Cart cleared');
}

// ══════════════════════════════════════════════════════════════
//  ORDER CONFIRMATION & PLACEMENT
// ══════════════════════════════════════════════════════════════

function openConfirmModal() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  const modalBody = document.getElementById('confirm-modal-body');
  if (!modalBody) return;

  const subtotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.qty, 0);
  const tax = calculateTax(subtotal, 0.05);
  const total = calculateTotal(subtotal, tax);

  modalBody.innerHTML = `
    <div>
      <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px">
        Review line items before order confirmation:
      </p>
      <div class="table-wrap" style="max-height:200px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${cart.map(ci => `
              <tr>
                <td>${escapeHtml(ci.menuItem.name)}</td>
                <td style="text-align:center">${ci.qty}</td>
                <td style="text-align:right">₹${Number(ci.menuItem.price).toFixed(2)}</td>
                <td style="text-align:right">₹${(ci.menuItem.price * ci.qty).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:14px;background:var(--surface-alt);border:1px solid var(--border);padding:12px 14px;border-radius:var(--radius-sm)">
        <div class="cart-row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div class="cart-row"><span>GST (5%):</span><span>₹${tax.toFixed(2)}</span></div>
        <div class="cart-row total-row"><span>Grand Total:</span><span>₹${total.toFixed(2)}</span></div>
      </div>
      <div class="form-group" style="margin-top:14px">
        <label class="form-label">Payment Method</label>
        <select id="confirm-pay-mode" class="input-field select-field" style="width:100%">
          <option value="Cash">Cash at Counter</option>
          <option value="UPI">UPI / Digital</option>
          <option value="Card">Credit / Debit Card</option>
        </select>
      </div>
    </div>
  `;

  const overlay = document.getElementById('confirm-modal-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeConfirmModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
  const overlay = document.getElementById('confirm-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

async function confirmPlaceOrder() {
  if (cart.length === 0) return;

  const payModeEl = document.getElementById('confirm-pay-mode');
  const payMode = payModeEl ? payModeEl.value : 'Cash';

  const orderPayload = {
    customer_name: currentRole === 'customer' ? 'Dev Jain' : 'Customer',
    payment_method: payMode,
    items: cart.map(ci => ({
      menu_item_id: ci.menuItem.id,
      name: ci.menuItem.name,
      category: ci.menuItem.category,
      quantity: ci.qty,
      unit_price: ci.menuItem.price
    }))
  };

  // Try API first
  let newOrder = null;
  if (isBackendOnline) {
    newOrder = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
  }

  if (newOrder && newOrder.order_id) {
    await loadData();
  } else {
    // Fallback local placement
    const subtotal = calculateSubtotal(cart.map(c => ({ price: c.menuItem.price, qty: c.qty })));
    const tax = calculateTax(subtotal);
    const total = calculateTotal(subtotal, tax);

    const localOrder = {
      id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 101,
      order_date: new Date().toLocaleString('en-IN'),
      customer_name: orderPayload.customer_name,
      subtotal,
      tax,
      total,
      status: 'Pending',
      payment_status: 'Unpaid',
      payment_method: payMode,
      items: cart.map(ci => ({
        id: ci.menuItem.id,
        item_name: ci.menuItem.name,
        category: ci.menuItem.category,
        quantity: ci.qty,
        unit_price: ci.menuItem.price,
        subtotal: ci.menuItem.price * ci.qty
      }))
    };
    orders.unshift(localOrder);
    saveLocal();
  }

  cart = [];
  saveLocal();
  updateCartBadge();
  closeConfirmModal();
  showToast('Order placed successfully.', 'success');
  navigate('c-orders');
}

// ══════════════════════════════════════════════════════════════
//  CUSTOMER: MY ORDERS
// ══════════════════════════════════════════════════════════════

async function renderMyOrders() {
  const body = document.getElementById('my-orders-body');
  if (!body) return;

  if (isBackendOnline) {
    const freshOrders = await apiFetch('/orders');
    if (freshOrders) orders = freshOrders;
  }

  if (orders.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="table-empty">No records found.</td></tr>`;
    return;
  }

  body.innerHTML = orders.map(ord => {
    const itemsSummary = (ord.items || [])
      .map(it => `${it.quantity || it.qty}x ${escapeHtml(it.item_name || it.name)}`)
      .join(', ');

    const statusClass = `status-${(ord.status || 'pending').toLowerCase()}`;
    const payClass = ord.payment_status === 'Paid' ? 'pay-paid' : 'pay-unpaid';

    return `
      <tr>
        <td><strong>#${ord.id}</strong></td>
        <td>${escapeHtml(ord.order_date || 'N/A')}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(itemsSummary)}">
          ${escapeHtml(itemsSummary)}
        </td>
        <td style="text-align:right">₹${Number(ord.total).toFixed(2)}</td>
        <td style="text-align:center"><span class="badge ${statusClass}">${escapeHtml(ord.status)}</span></td>
        <td style="text-align:center"><span class="badge ${payClass}">${escapeHtml(ord.payment_status)}</span></td>
        <td style="text-align:right">
          <button class="btn btn-secondary btn-sm" onclick="openDetailModal(${ord.id})">Receipt</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  ADMIN: DASHBOARD
// ══════════════════════════════════════════════════════════════

async function renderAdminDashboard() {
  const timeEl = document.getElementById('a-dash-time');
  if (timeEl) {
    timeEl.textContent = `Operations Overview • ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}`;
  }

  let stats = null;
  if (isBackendOnline) {
    stats = await apiFetch('/stats');
    const freshOrders = await apiFetch('/orders');
    if (freshOrders) orders = freshOrders;
  }

  const menuCount = menuItems.length;
  const orderCount = orders.length;
  const liveCount = orders.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status)).length;
  const unpaidCount = orders.filter(o => o.payment_status === 'Unpaid').length;

  const elMenu = document.getElementById('as-menu');
  const elOrders = document.getElementById('as-orders');
  const elLive = document.getElementById('as-live');
  const elUnpaid = document.getElementById('as-unpaid');

  if (elMenu) elMenu.textContent = stats ? stats.menu_items : menuCount;
  if (elOrders) elOrders.textContent = stats ? stats.total_orders : orderCount;
  if (elLive) elLive.textContent = stats ? stats.live_orders : liveCount;
  if (elUnpaid) elUnpaid.textContent = stats ? stats.unpaid_orders : unpaidCount;

  // Render live orders table
  const liveBody = document.getElementById('a-live-orders-body');
  if (!liveBody) return;

  const liveOrders = orders.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status));

  if (liveOrders.length === 0) {
    liveBody.innerHTML = `<tr><td colspan="7" class="table-empty">No active orders found.</td></tr>`;
    return;
  }

  liveBody.innerHTML = liveOrders.map(ord => {
    const itemsSummary = (ord.items || [])
      .map(it => `${it.quantity || it.qty}x ${escapeHtml(it.item_name || it.name)}`)
      .join(', ');

    const statusClass = `status-${(ord.status || 'pending').toLowerCase()}`;
    const payClass = ord.payment_status === 'Paid' ? 'pay-paid' : 'pay-unpaid';

    return `
      <tr>
        <td><strong>#${ord.id}</strong></td>
        <td>${escapeHtml(ord.order_date || 'N/A')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(itemsSummary)}">
          ${escapeHtml(itemsSummary)}
        </td>
        <td style="text-align:right">₹${Number(ord.total).toFixed(2)}</td>
        <td style="text-align:center"><span class="badge ${statusClass}">${escapeHtml(ord.status)}</span></td>
        <td style="text-align:center"><span class="badge ${payClass}">${escapeHtml(ord.payment_status)}</span></td>
        <td style="text-align:right">
          <div style="display:inline-flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="markOrderDone(${ord.id})">Mark Completed</button>
            <button class="btn btn-secondary btn-sm" onclick="toggleOrderPayment(${ord.id})">
              ${ord.payment_status === 'Paid' ? 'Set Unpaid' : 'Set Paid'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openDetailModal(${ord.id})">Receipt</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  ADMIN: MENU MANAGEMENT
// ══════════════════════════════════════════════════════════════

function renderAdminMenu() {
  const body = document.getElementById('a-menu-body');
  if (!body) return;

  populateCategoryDropdowns();

  const search = (document.getElementById('a-menu-search')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('a-menu-cat')?.value || '';
  const availOnly = document.getElementById('a-avail-only')?.checked || false;

  const filtered = menuItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) ||
                        (item.description && item.description.toLowerCase().includes(search));
    const matchCat = !catFilter || item.category === catFilter;
    const matchAvail = !availOnly || item.available;
    return matchSearch && matchCat && matchAvail;
  });

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="table-empty">No records found.</td></tr>`;
    return;
  }

  body.innerHTML = filtered.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><span class="mc-category">${escapeHtml(item.category)}</span></td>
      <td style="text-align:right">
        <div style="display:inline-flex;align-items:center;gap:6px">
          <span>₹${Number(item.price).toFixed(2)}</span>
          <button class="btn btn-secondary btn-sm" style="height:22px;padding:0 6px;font-size:11px" onclick="openPriceModal(${item.id})">Edit</button>
        </div>
      </td>
      <td style="text-align:center">
        <button class="btn ${item.available ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="toggleItemAvail(${item.id})">
          ${item.available ? 'Available' : 'Unavailable'}
        </button>
      </td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)" title="${escapeHtml(item.description || '')}">
        ${escapeHtml(item.description || '—')}
      </td>
      <td style="text-align:right">
        <div style="display:inline-flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="openEditItemModal(${item.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMenuItem(${item.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddItemModal() {
  const title = document.getElementById('item-modal-title');
  const idInput = document.getElementById('item-id');
  const nameInput = document.getElementById('item-name');
  const catSelect = document.getElementById('item-category');
  const priceInput = document.getElementById('item-price');
  const descInput = document.getElementById('item-desc');
  const availBox = document.getElementById('item-available');
  const saveBtn = document.getElementById('item-save-btn');

  if (title) title.textContent = 'Add Menu Item';
  if (idInput) idInput.value = '';
  if (nameInput) nameInput.value = '';
  if (catSelect) catSelect.value = '';
  if (priceInput) priceInput.value = '';
  if (descInput) descInput.value = '';
  if (availBox) availBox.checked = true;
  if (saveBtn) saveBtn.textContent = 'Save Item';

  const overlay = document.getElementById('item-modal-overlay');
  if (overlay) overlay.classList.add('active');
}

function openEditItemModal(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;

  const title = document.getElementById('item-modal-title');
  const idInput = document.getElementById('item-id');
  const nameInput = document.getElementById('item-name');
  const catSelect = document.getElementById('item-category');
  const priceInput = document.getElementById('item-price');
  const descInput = document.getElementById('item-desc');
  const availBox = document.getElementById('item-available');
  const saveBtn = document.getElementById('item-save-btn');

  if (title) title.textContent = `Edit Item #${item.id}`;
  if (idInput) idInput.value = item.id;
  if (nameInput) nameInput.value = item.name;
  if (catSelect) catSelect.value = item.category;
  if (priceInput) priceInput.value = item.price;
  if (descInput) descInput.value = item.description || '';
  if (availBox) availBox.checked = item.available;
  if (saveBtn) saveBtn.textContent = 'Update Item';

  const overlay = document.getElementById('item-modal-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeItemModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
  const overlay = document.getElementById('item-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

async function saveItem() {
  const id = document.getElementById('item-id')?.value;
  const name = document.getElementById('item-name')?.value;
  const category = document.getElementById('item-category')?.value;
  const priceVal = document.getElementById('item-price')?.value;
  const description = document.getElementById('item-desc')?.value;
  const available = document.getElementById('item-available')?.checked ?? true;

  // Validate using tested functions
  const vName = validateItemName(name);
  if (!vName.ok) { showToast(vName.msg, 'error'); return; }

  const vCat = validateCategory(category);
  if (!vCat.ok) { showToast(vCat.msg, 'error'); return; }

  const vPrice = validatePrice(priceVal);
  if (!vPrice.ok) { showToast(vPrice.msg, 'error'); return; }

  const numPrice = parseFloat(priceVal);

  // Check unique name constraint (excluding current item)
  const duplicate = menuItems.find(m => m.name.toLowerCase() === name.trim().toLowerCase() && (!id || m.id !== parseInt(id)));
  if (duplicate) {
    showToast(`An item named "${name.trim()}" already exists.`, 'error');
    return;
  }

  const payload = {
    name: name.trim(),
    category: category.trim(),
    price: numPrice,
    description: (description || '').trim(),
    available
  };

  if (isBackendOnline) {
    if (id) {
      await apiFetch(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/menu', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadData();
  } else {
    // Offline local update
    if (id) {
      const idx = menuItems.findIndex(m => m.id === parseInt(id));
      if (idx !== -1) {
        menuItems[idx] = { ...menuItems[idx], ...payload };
      }
    } else {
      const newId = menuItems.length > 0 ? Math.max(...menuItems.map(m => m.id)) + 1 : 1;
      menuItems.push({ id: newId, ...payload });
    }
    saveLocal();
  }

  closeItemModal();
  renderAdminMenu();
  showToast(id ? 'Item updated.' : 'Item added.');
}

function openPriceModal(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;

  const idInput = document.getElementById('price-item-id');
  const label = document.getElementById('price-item-name-label');
  const priceInput = document.getElementById('price-input');

  if (idInput) idInput.value = item.id;
  if (label) label.textContent = `New price for ${item.name} (Current: ₹${Number(item.price).toFixed(2)})`;
  if (priceInput) {
    priceInput.value = item.price;
    setTimeout(() => priceInput.focus(), 50);
  }

  const overlay = document.getElementById('price-modal-overlay');
  if (overlay) overlay.classList.add('active');
}

function closePriceModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
  const overlay = document.getElementById('price-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

async function savePrice() {
  const id = document.getElementById('price-item-id')?.value;
  const priceVal = document.getElementById('price-input')?.value;

  const vPrice = validatePrice(priceVal);
  if (!vPrice.ok) { showToast(vPrice.msg, 'error'); return; }

  const numPrice = parseFloat(priceVal);

  if (isBackendOnline) {
    await apiFetch(`/menu/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price: numPrice })
    });
    await loadData();
  } else {
    const item = menuItems.find(m => m.id === parseInt(id));
    if (item) item.price = numPrice;
    saveLocal();
  }

  closePriceModal();
  renderAdminMenu();
  showToast(`Price updated to ₹${numPrice.toFixed(2)}`);
}

async function toggleItemAvail(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;

  if (isBackendOnline) {
    await apiFetch(`/menu/${itemId}/toggle`, { method: 'PATCH' });
    await loadData();
  } else {
    item.available = !item.available;
    saveLocal();
  }

  renderAdminMenu();
  showToast(`Updated availability for ${item.name}`);
}

async function deleteMenuItem(itemId) {
  const item = menuItems.find(m => m.id === itemId);
  if (!item) return;

  if (!confirm(`Delete "${item.name}" from catalog?`)) {
    return;
  }

  if (isBackendOnline) {
    await apiFetch(`/menu/${itemId}`, { method: 'DELETE' });
    await loadData();
  } else {
    menuItems = menuItems.filter(m => m.id !== itemId);
    saveLocal();
  }

  renderAdminMenu();
  showToast('Item deleted.');
}

// ══════════════════════════════════════════════════════════════
//  ADMIN: ORDER MANAGEMENT
// ══════════════════════════════════════════════════════════════

async function renderAdminOrders() {
  const body = document.getElementById('a-orders-body');
  if (!body) return;

  if (isBackendOnline) {
    const freshOrders = await apiFetch('/orders');
    if (freshOrders) orders = freshOrders;
  }

  const statusFilter = document.getElementById('a-order-filter')?.value || '';
  const payFilter = document.getElementById('a-pay-filter')?.value || '';

  const filtered = orders.filter(o => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchPay = !payFilter || o.payment_status === payFilter;
    return matchStatus && matchPay;
  });

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="table-empty">No records found.</td></tr>`;
    return;
  }

  body.innerHTML = filtered.map(ord => {
    const itemsSummary = (ord.items || [])
      .map(it => `${it.quantity || it.qty}x ${escapeHtml(it.item_name || it.name)}`)
      .join(', ');

    const statusOptions = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled']
      .map(s => `<option value="${s}" ${ord.status === s ? 'selected' : ''}>${s}</option>`)
      .join('');

    const payClass = ord.payment_status === 'Paid' ? 'pay-paid' : 'pay-unpaid';

    return `
      <tr>
        <td><strong>#${ord.id}</strong></td>
        <td>${escapeHtml(ord.order_date || 'N/A')}</td>
        <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(itemsSummary)}">
          ${escapeHtml(itemsSummary)}
        </td>
        <td style="text-align:right">₹${Number(ord.total).toFixed(2)}</td>
        <td style="text-align:center">
          <select class="input-field select-field btn-sm" onchange="changeOrderStatus(${ord.id}, this.value)">
            ${statusOptions}
          </select>
        </td>
        <td style="text-align:center">
          <button class="btn btn-sm ${ord.payment_status === 'Paid' ? 'btn-success' : 'btn-secondary'}" onclick="toggleOrderPayment(${ord.id})">
            ${ord.payment_status}
          </button>
        </td>
        <td style="text-align:right">
          <button class="btn btn-secondary btn-sm" onclick="openDetailModal(${ord.id})">Receipt</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function markOrderDone(orderId) {
  await changeOrderStatus(orderId, 'Completed');
}

async function changeOrderStatus(orderId, newStatus) {
  if (isBackendOnline) {
    await apiFetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    await loadData();
  } else {
    const ord = orders.find(o => o.id === orderId);
    if (ord) ord.status = newStatus;
    saveLocal();
  }

  if (currentPage === 'a-dashboard') renderAdminDashboard();
  if (currentPage === 'a-orders')    renderAdminOrders();
  if (currentPage === 'c-orders')    renderMyOrders();

  showToast(`Order #${orderId} marked as ${newStatus}.`);
}

async function toggleOrderPayment(orderId) {
  const ord = orders.find(o => o.id === orderId);
  if (!ord) return;

  const targetPayment = ord.payment_status === 'Paid' ? 'Unpaid' : 'Paid';

  if (isBackendOnline) {
    await apiFetch(`/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: targetPayment })
    });
    await loadData();
  } else {
    ord.payment_status = targetPayment;
    saveLocal();
  }

  if (currentPage === 'a-dashboard') renderAdminDashboard();
  if (currentPage === 'a-orders')    renderAdminOrders();
  if (currentPage === 'c-orders')    renderMyOrders();

  showToast(`Order #${orderId} set to ${targetPayment}.`);
}

// ══════════════════════════════════════════════════════════════
//  ORDER DETAIL / RECEIPT MODAL
// ══════════════════════════════════════════════════════════════

function openDetailModal(orderId) {
  const ord = orders.find(o => o.id === orderId);
  if (!ord) return;

  const title = document.getElementById('detail-modal-title');
  const body = document.getElementById('detail-modal-body');

  if (title) title.textContent = `Receipt #${ord.id}`;
  if (!body) return;

  body.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px">
      <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--primary)">CAFE MANAGEMENT SYSTEM</div>
          <div style="font-size:11px;color:var(--text-muted)">Order #${ord.id} • ${escapeHtml(ord.customer_name || 'Customer')}</div>
        </div>
        <div style="text-align:right;font-size:11.5px;color:var(--text-muted)">
          <div>${escapeHtml(ord.order_date || 'N/A')}</div>
          <div>Payment: ${escapeHtml(ord.payment_status)} (${escapeHtml(ord.payment_method || 'Cash')})</div>
        </div>
      </div>

      <div class="table-wrap" style="margin-bottom:14px">
        <table class="data-table">
          <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>
            ${(ord.items || []).map(it => `
              <tr>
                <td>${escapeHtml(it.item_name || it.name)}</td>
                <td style="text-align:center">${it.quantity || it.qty}</td>
                <td style="text-align:right">₹${Number(it.unit_price || it.price).toFixed(2)}</td>
                <td style="text-align:right">₹${Number(it.subtotal || ((it.unit_price || it.price) * (it.quantity || it.qty))).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="background:var(--surface-alt);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-xs);font-size:12.5px">
        <div class="cart-row"><span>Subtotal:</span><span>₹${Number(ord.subtotal).toFixed(2)}</span></div>
        <div class="cart-row"><span>GST (5%):</span><span>₹${Number(ord.tax).toFixed(2)}</span></div>
        <div class="cart-row total-row"><span>Total:</span><span>₹${Number(ord.total).toFixed(2)}</span></div>
      </div>
    </div>
  `;

  const overlay = document.getElementById('detail-modal-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeDetailModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
  const overlay = document.getElementById('detail-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2400);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ══════════════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
  await loadData();

  // Check if role is remembered in session
  const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
  if (savedRole && (savedRole === 'admin' || savedRole === 'customer')) {
    loginAs(savedRole);
  }
});
