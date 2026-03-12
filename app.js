const DB_KEY = 'saritech_db';

const DEFAULT_DB = {
  products: [
    { id: 1, name: 'Lucky Me Pancit Canton',   category: 'Noodles & Pasta',  unit: 'pack',    price: 15,  cost: 10,   stock: 50,  threshold: 10 },
    { id: 2, name: 'Milo 3-in-1 Sachet',       category: 'Beverages',        unit: 'sachet',  price: 8,   cost: 5,    stock: 80,  threshold: 20 },
    { id: 3, name: 'Sky Flakes Crackers',       category: 'Snacks',           unit: 'pack',    price: 12,  cost: 8,    stock: 30,  threshold: 15 },
    { id: 4, name: 'Purefoods Corned Beef',     category: 'Canned Goods',     unit: 'can',     price: 45,  cost: 32,   stock: 4,   threshold: 5  },
    { id: 5, name: 'Del Monte Tomato Sauce',    category: 'Condiments',       unit: 'pouch',   price: 10,  cost: 7,    stock: 0,   threshold: 10 },
    { id: 6, name: 'Palmolive Shampoo Sachet',  category: 'Personal Care',    unit: 'sachet',  price: 7,   cost: 4.5,  stock: 120, threshold: 30 },
  ],
  sales: [],
  nextProductId: 7,
  nextSaleId: 1001,
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    showToast('Warning: data could not be saved.', 'error');
  }
}

let db = loadDB();
refreshDashboard();

// SIDEBAR
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen  = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  overlay.classList.toggle('active', !isOpen);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// NAVIGATION
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.trim().toLowerCase().includes(page)) n.classList.add('active');
  });
  document.querySelectorAll('.bottom-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  const titles = { dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory', sales: 'Sales', reports: 'Reports' };
  const el = document.getElementById('topbarPageTitle');
  if (el) el.textContent = titles[page] || '';
  closeSidebar();
  if (page === 'dashboard') refreshDashboard();
  if (page === 'products')  renderProducts();
  if (page === 'inventory') renderInventory();
  if (page === 'sales')     renderSales();
  if (page === 'reports')   renderReports();
}

// DASHBOARD
function refreshDashboard() {
  const today = todayStr();

  document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const todaySales = db.sales.filter(s => s.date === today);
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);
  document.getElementById('dashTodaySales').textContent = fmt(todayTotal);
  document.getElementById('dashTodayCount').textContent = todaySales.length + ' transaction' + (todaySales.length !== 1 ? 's' : '');
  document.getElementById('dashTotalProducts').textContent = db.products.length;

  const low = db.products.filter(p => p.stock > 0 && p.stock <= p.threshold);
  const out = db.products.filter(p => p.stock === 0);
  document.getElementById('dashLowStock').textContent = low.length;
  document.getElementById('dashOutStock').textContent = out.length;

  const recent = [...db.sales].reverse().slice(0, 5);
  document.getElementById('dashRecentSales').innerHTML = recent.length
    ? recent.map(s => `
        <div class="activity-item">
          <div>
            <div class="activity-name">Receipt #${s.id}</div>
            <div class="activity-time">${s.time} — ${s.items.length} item(s)</div>
          </div>
          <div class="activity-amount">${fmt(s.total)}</div>
        </div>`).join('')
    : '<div class="empty-msg">No transactions yet</div>';

  const alerts = db.products.filter(p => p.stock <= p.threshold);
  document.getElementById('dashLowStockList').innerHTML = alerts.length
    ? alerts.map(p => `
        <div class="activity-item">
          <div>
            <div class="activity-name">${p.name}</div>
            <div class="activity-time">${p.category}</div>
          </div>
          <span class="badge ${p.stock === 0 ? 'badge-out' : 'badge-low'}">
            ${p.stock === 0 ? 'OUT' : p.stock + ' left'}
          </span>
        </div>`).join('')
    : '<div class="empty-msg">All stocks are sufficient ✓</div>';
}

// PRODUCTS
function stockBadgeClass(p) {
  return p.stock === 0 ? 'badge-out' : p.stock <= p.threshold ? 'badge-low' : 'badge-ok';
}
function stockBadgeText(p) {
  return p.stock === 0 ? 'Out of Stock' : p.stock <= p.threshold ? 'Low Stock' : 'In Stock';
}

function renderProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  const rows = db.products.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  document.getElementById('productsTable').innerHTML = rows.length
    ? rows.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td style="color:var(--accent);font-weight:600;">₱${p.price.toFixed(2)}</td>
          <td>₱${p.cost.toFixed(2)}</td>
          <td>${p.stock} ${p.unit || 'pc'}</td>
          <td><span class="badge ${stockBadgeClass(p)}">${stockBadgeText(p)}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openProductModal(${p.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})" style="margin-left:6px;">Delete</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">No products found</td></tr>';

  const cardsEl = document.getElementById('productCards');
  cardsEl.innerHTML = rows.length
    ? rows.map(p => `
        <div class="p-card">
          <div class="p-card-header">
            <div class="p-card-name">${p.name}</div>
            <span class="badge ${stockBadgeClass(p)}">${stockBadgeText(p)}</span>
          </div>
          <div class="p-card-body">
            <div class="p-card-field">Category<span>${p.category}</span></div>
            <div class="p-card-field">Unit<span>${p.unit || 'piece'}</span></div>
            <div class="p-card-field">Sell Price<span style="color:var(--accent);font-weight:700;">₱${p.price.toFixed(2)}</span></div>
            <div class="p-card-field">Cost Price<span>₱${p.cost.toFixed(2)}</span></div>
            <div class="p-card-field">Stock<span>${p.stock} ${p.unit || 'pc'}</span></div>
            <div class="p-card-field">Threshold<span>${p.threshold}</span></div>
          </div>
          <div class="p-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="openProductModal(${p.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
          </div>
        </div>`).join('')
    : '<div class="empty-msg">No products found</div>';
}

function openProductModal(id) {
  ['pName','pCategory','pUnit','pPrice','pCost','pStock','pThreshold','pEditId']
    .forEach(f => document.getElementById(f).value = '');
  document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add Product';
  if (id) {
    const p = db.products.find(x => x.id === id);
    document.getElementById('pName').value      = p.name;
    document.getElementById('pCategory').value  = p.category;
    document.getElementById('pUnit').value      = p.unit || '';
    document.getElementById('pPrice').value     = p.price;
    document.getElementById('pCost').value      = p.cost;
    document.getElementById('pStock').value     = p.stock;
    document.getElementById('pThreshold').value = p.threshold;
    document.getElementById('pEditId').value    = p.id;
  }
  openModal('productModal');
}

function saveProduct() {
  const name  = document.getElementById('pName').value.trim();
  const cat   = document.getElementById('pCategory').value;
  const price = parseFloat(document.getElementById('pPrice').value);
  const cost  = parseFloat(document.getElementById('pCost').value);
  const stock = parseInt(document.getElementById('pStock').value);
  if (!name || !cat || isNaN(price) || isNaN(cost) || isNaN(stock)) {
    showToast('Please fill all required fields.', 'error'); return;
  }
  const threshold = parseInt(document.getElementById('pThreshold').value) || 5;
  const unit      = document.getElementById('pUnit').value.trim() || 'piece';
  const editId    = document.getElementById('pEditId').value;
  if (editId) {
    Object.assign(db.products.find(x => x.id == editId), { name, category: cat, unit, price, cost, stock, threshold });
    showToast('Product updated!', 'success');
  } else {
    db.products.push({ id: db.nextProductId++, name, category: cat, unit, price, cost, stock, threshold });
    showToast('Product added!', 'success');
  }
  saveDB();
  closeModal('productModal');
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  db.products = db.products.filter(p => p.id !== id);
  saveDB();
  renderProducts();
  showToast('Product deleted.', 'success');
}

// INVENTORY
function renderInventory() {
  const q = document.getElementById('inventorySearch').value.toLowerCase();
  const rows = db.products.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  document.getElementById('inventoryLowWarn').style.display =
    db.products.some(p => p.stock <= p.threshold) ? 'flex' : 'none';

  document.getElementById('inventoryTable').innerHTML = rows.length
    ? rows.map(p => {
        const pct   = Math.min(100, (p.stock / Math.max(p.threshold * 3, 10)) * 100);
        const color = p.stock === 0 ? 'var(--danger)' : p.stock <= p.threshold ? 'var(--warning)' : 'var(--success)';
        return `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-family:'Syne',sans-serif;font-weight:700;color:${color};font-size:18px;">${p.stock}</span>
                <div style="flex:1;background:var(--border);border-radius:99px;height:5px;min-width:60px;">
                  <div style="width:${pct}%;background:${color};height:100%;border-radius:99px;transition:.3s;"></div>
                </div>
                <span style="font-size:12px;color:var(--muted);">${p.unit || 'pc'}</span>
              </div>
            </td>
            <td>${p.threshold}</td>
            <td><span class="badge ${stockBadgeClass(p)}">${stockBadgeText(p)}</span></td>
            <td><button class="btn btn-primary btn-sm" onclick="openRestockModal(${p.id})">+ Restock</button></td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">No products found</td></tr>';

  const cardsEl = document.getElementById('inventoryCards');
  cardsEl.innerHTML = rows.length
    ? rows.map(p => {
        const pct   = Math.min(100, (p.stock / Math.max(p.threshold * 3, 10)) * 100);
        const color = p.stock === 0 ? 'var(--danger)' : p.stock <= p.threshold ? 'var(--warning)' : 'var(--success)';
        return `
          <div class="p-card">
            <div class="p-card-header">
              <div class="p-card-name">${p.name}</div>
              <span class="badge ${stockBadgeClass(p)}">${stockBadgeText(p)}</span>
            </div>
            <div class="p-card-body">
              <div class="p-card-field">Category<span>${p.category}</span></div>
              <div class="p-card-field">Unit<span>${p.unit || 'piece'}</span></div>
              <div class="p-card-field">Threshold<span>${p.threshold}</span></div>
              <div class="p-card-field">Stock
                <div class="stock-bar-wrap">
                  <span style="font-family:'Syne',sans-serif;font-weight:700;color:${color};font-size:16px;">${p.stock}</span>
                  <div class="stock-bar-bg"><div class="stock-bar-fill" style="width:${pct}%;background:${color};"></div></div>
                </div>
              </div>
            </div>
            <div class="p-card-actions">
              <button class="btn btn-primary btn-sm" onclick="openRestockModal(${p.id})" style="flex:1;justify-content:center;">+ Restock</button>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty-msg">No products found</div>';
}

function openRestockModal(id) {
  const p = db.products.find(x => x.id === id);
  document.getElementById('restockProductName').textContent = p.name;
  document.getElementById('restockCurrent').textContent     = p.stock + ' ' + (p.unit || 'pieces');
  document.getElementById('restockId').value                = id;
  document.getElementById('restockQty').value               = '';
  openModal('restockModal');
}

function doRestock() {
  const qty = parseInt(document.getElementById('restockQty').value);
  if (!qty || qty < 1) { showToast('Enter a valid quantity.', 'error'); return; }
  const p = db.products.find(x => x.id == document.getElementById('restockId').value);
  p.stock += qty;
  saveDB();
  closeModal('restockModal');
  renderInventory();
  showToast(`Restocked ${p.name} +${qty}`, 'success');
}

// SALES
function renderSales() {
  const rows = [...db.sales].reverse();

  document.getElementById('salesTable').innerHTML = rows.length
    ? rows.map(s => `
        <tr>
          <td>${s.date} ${s.time}</td>
          <td style="font-family:'Syne',sans-serif;font-weight:600;color:var(--accent);">#${s.id}</td>
          <td>${s.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
          <td style="font-weight:600;">₱${s.total.toFixed(2)}</td>
          <td>₱${s.cash.toFixed(2)}</td>
          <td>₱${(s.cash - s.total).toFixed(2)}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">No sales recorded yet</td></tr>';

  const cardsEl = document.getElementById('salesCards');
  cardsEl.innerHTML = rows.length
    ? rows.map(s => `
        <div class="sale-card">
          <div class="sale-card-header">
            <span class="sale-card-receipt">#${s.id}</span>
            <span class="sale-card-total">${fmt(s.total)}</span>
          </div>
          <div class="sale-card-meta">${s.date} · ${s.time} · Cash: ${fmt(s.cash)} · Change: ${fmt(s.cash - s.total)}</div>
          <div class="sale-card-items">${s.items.map(i => `${i.name} × ${i.qty}`).join(' &nbsp;|&nbsp; ')}</div>
        </div>`).join('')
    : '<div class="empty-msg">No sales recorded yet</div>';
}

function openSaleModal() {
  document.getElementById('saleItems').innerHTML    = '';
  document.getElementById('saleCash').value         = '';
  document.getElementById('saleTotal').textContent  = '₱0.00';
  document.getElementById('saleChange').textContent = '₱0.00';
  addSaleRow();
  openModal('saleModal');
}

function addSaleRow() {
  const available = db.products.filter(p => p.stock > 0);
  if (!available.length) { showToast('No products in stock!', 'error'); return; }
  const row = document.createElement('div');
  row.className = 'sale-product-row';
  row.innerHTML = `
    <select class="form-select" onchange="updateSaleTotal()">
      <option value="">-- Select Product --</option>
      ${available.map(p =>
        `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">
          ${p.name} (₱${p.price.toFixed(2)}) — ${p.stock} left
        </option>`
      ).join('')}
    </select>
    <input class="form-input" type="number" min="1" value="1" placeholder="Qty" oninput="updateSaleTotal()">
    <button class="remove-row" onclick="removeSaleRow(this)">×</button>`;
  document.getElementById('saleItems').appendChild(row);
  updateSaleTotal();
}

function removeSaleRow(btn) {
  btn.parentElement.remove();
  updateSaleTotal();
}

function updateSaleTotal() {
  let total = 0;
  document.querySelectorAll('#saleItems .sale-product-row').forEach(row => {
    const sel = row.querySelector('select');
    const qty = parseInt(row.querySelector('input').value) || 0;
    if (sel.value) total += (parseFloat(sel.selectedOptions[0].dataset.price) || 0) * qty;
  });
  document.getElementById('saleTotal').textContent = fmt(total);
  calcChange();
}

function calcChange() {
  const total  = parseFloat(document.getElementById('saleTotal').textContent.replace('₱', '')) || 0;
  const cash   = parseFloat(document.getElementById('saleCash').value) || 0;
  const change = cash - total;
  const el     = document.getElementById('saleChange');
  el.textContent = fmt(Math.max(0, change));
  el.style.color = change < 0 ? 'var(--danger)' : 'var(--success)';
}

function completeSale() {
  const rows  = document.querySelectorAll('#saleItems .sale-product-row');
  const items = [];
  let valid   = true;

  rows.forEach(row => {
    const sel = row.querySelector('select');
    const qty = parseInt(row.querySelector('input').value) || 0;
    if (!sel.value || qty < 1) { valid = false; return; }
    const p        = db.products.find(x => x.id == sel.value);
    const maxStock = parseInt(sel.selectedOptions[0].dataset.stock);
    if (qty > maxStock) { showToast(`Not enough stock for ${p.name}`, 'error'); valid = false; return; }
    items.push({ id: p.id, name: p.name, price: p.price, cost: p.cost, qty });
  });

  if (!valid || !items.length) { showToast('Please add valid items.', 'error'); return; }

  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  const cash  = parseFloat(document.getElementById('saleCash').value) || 0;
  if (cash < total) { showToast('Cash is less than total amount.', 'error'); return; }

  items.forEach(i => { db.products.find(x => x.id === i.id).stock -= i.qty; });

  const now = new Date();
  db.sales.push({
    id:     db.nextSaleId++,
    date:   todayStr(),
    time:   now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    items, total, cash,
    profit: items.reduce((a, i) => a + (i.price - i.cost) * i.qty, 0),
  });

  saveDB();
  closeModal('saleModal');
  renderSales();
  showToast('Sale completed! Change: ' + fmt(cash - total), 'success');
}

// REPORTS
function renderReports() {
  const period = document.getElementById('reportPeriod').value;
  const today  = todayStr();
  let filtered = db.sales;

  if (period === 'today')      filtered = db.sales.filter(s => s.date === today);
  else if (period === 'week')  { const d = new Date(); d.setDate(d.getDate()-7); filtered = db.sales.filter(s => new Date(s.date) >= d); }
  else if (period === 'month') { const m = today.slice(0,7); filtered = db.sales.filter(s => s.date.startsWith(m)); }

  const revenue = filtered.reduce((a, s) => a + s.total,  0);
  const profit  = filtered.reduce((a, s) => a + s.profit, 0);
  const items   = filtered.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0);

  document.getElementById('repRevenue').textContent = fmt(revenue);
  document.getElementById('repProfit').textContent  = fmt(profit);
  document.getElementById('repTxns').textContent    = filtered.length;
  document.getElementById('repItems').textContent   = items;

  const prodMap = {};
  filtered.forEach(s => s.items.forEach(i => {
    if (!prodMap[i.name]) prodMap[i.name] = { qty: 0, rev: 0 };
    prodMap[i.name].qty += i.qty;
    prodMap[i.name].rev += i.price * i.qty;
  }));

  document.getElementById('repTopProducts').innerHTML =
    Object.entries(prodMap).sort((a,b) => b[1].rev - a[1].rev).slice(0,8)
      .map(([n,v]) => `<tr><td>${n}</td><td>${v.qty}</td><td style="color:var(--accent);font-weight:600;">${fmt(v.rev)}</td></tr>`).join('')
    || '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:16px;">No data</td></tr>';

  const catMap = {};
  filtered.forEach(s => s.items.forEach(i => {
    const p = db.products.find(x => x.id === i.id);
    const cat = p ? p.category : 'Others';
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat] += i.price * i.qty;
  }));

  document.getElementById('repCategories').innerHTML =
    Object.entries(catMap).sort((a,b) => b[1]-a[1])
      .map(([c,v]) => `<tr><td>${c}</td><td>${fmt(v)}</td><td style="color:var(--muted);">${revenue > 0 ? ((v/revenue)*100).toFixed(1) : 0}%</td></tr>`).join('')
    || '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:16px;">No data</td></tr>';

  document.getElementById('repHistory').innerHTML =
    [...filtered].reverse()
      .map(s => `<tr><td>${s.date} ${s.time}</td><td style="color:var(--accent);">#${s.id}</td><td>${s.items.map(i=>i.name+' x'+i.qty).join(', ')}</td><td style="font-weight:600;">₱${s.total.toFixed(2)}</td><td style="color:var(--success);">₱${s.profit.toFixed(2)}</td></tr>`).join('')
    || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:16px;">No transactions</td></tr>';
}

// UTILITIES
function fmt(n) { return '₱' + n.toFixed(2); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  t.className   = 'toast ' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); });
});
