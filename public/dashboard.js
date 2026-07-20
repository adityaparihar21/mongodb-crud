const API_URL = '/products';

// DOM Elements
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productBrandInput = document.getElementById('product-brand');
const productCategoryInput = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productStockInput = document.getElementById('product-stock');

const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const seedBtn = document.getElementById('seed-btn');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const productsTableBody = document.getElementById('products-table-body');
const consoleLogs = document.getElementById('console-logs');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Debug Buttons
const btnTestInvalidId = document.getElementById('btn-test-invalid-id');
const btnTestMissingFields = document.getElementById('btn-test-missing-fields');

// Stats Elements
const statTotalProducts = document.getElementById('stat-total-products');
const statInventoryValue = document.getElementById('stat-inventory-value');
const statOutOfStock = document.getElementById('stat-out-of-stock');

// Local state
let products = [];
let logs = [];

// Init
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  
  // Event listeners
  productForm.addEventListener('submit', handleFormSubmit);
  cancelEditBtn.addEventListener('click', resetForm);
  seedBtn.addEventListener('click', seedSampleData);
  refreshBtn.addEventListener('click', () => fetchProducts());
  clearLogsBtn.addEventListener('click', clearLogs);
  searchInput.addEventListener('input', handleSearch);
  
  // Debug listeners
  btnTestInvalidId.addEventListener('click', testInvalidId);
  btnTestMissingFields.addEventListener('click', testMissingFields);

  // Theme Toggle Logic
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = themeToggleBtn.querySelector('span');

  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.className = 'fa-solid fa-moon';
    themeText.textContent = 'Dark Theme';
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.className = 'fa-solid fa-sun';
    themeText.textContent = 'Light Theme';
  }

  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    if (isLight) {
      localStorage.setItem('theme', 'light');
      themeIcon.className = 'fa-solid fa-moon';
      themeText.textContent = 'Dark Theme';
      showToast('Switched to Light Theme', 'info');
    } else {
      localStorage.setItem('theme', 'dark');
      themeIcon.className = 'fa-solid fa-sun';
      themeText.textContent = 'Light Theme';
      showToast('Switched to Dark Theme', 'info');
    }
  });
});

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i> ${message}`;
  
  setTimeout(() => {
    toast.className = toast.className.replace(' show', '');
  }, 3000);
}

// Log traffic in our custom terminal emulator
function logTraffic(method, url, status, requestBody, responseBody) {
  const logEntry = {
    timestamp: new Date().toLocaleTimeString(),
    method,
    url,
    status,
    request: requestBody ? requestBody : null,
    response: responseBody
  };

  logs.unshift(logEntry);
  if (logs.length > 15) logs.pop(); // Keep last 15 actions

  renderLogs();
}

function renderLogs() {
  if (logs.length === 0) {
    consoleLogs.innerHTML = '// Awaiting API interactions...\n// Select, edit, add, or delete products above to inspect actual HTTP queries.';
    return;
  }

  let formatted = '';
  logs.forEach((log, index) => {
    const statusColor = log.status >= 200 && log.status < 300 ? '#10b981' : '#ef4444';
    const methodColor = log.method === 'GET' ? '#60a5fa' : log.method === 'POST' ? '#34d399' : log.method === 'PUT' ? '#fbbf24' : '#f87171';
    
    formatted += `<span style="color: #94a3b8">[${log.timestamp}]</span> <span style="color: ${methodColor}; font-weight: bold">${log.method}</span> <span style="color: #cbd5e1">${log.url}</span> - <span style="color: ${statusColor}; font-weight: bold">Status ${log.status}</span>\n`;
    if (log.request) {
      formatted += `<span style="color: #475569">→ Request Body:</span> <span style="color: #f1f5f9">${JSON.stringify(log.request, null, 2)}</span>\n`;
    }
    formatted += `<span style="color: #475569">← Response:</span> <span style="color: #38bdf8">${JSON.stringify(log.response, null, 2)}</span>\n\n`;
    if (index < logs.length - 1) {
      formatted += `<span style="color: #334155">--------------------------------------------------</span>\n\n`;
    }
  });

  consoleLogs.innerHTML = formatted;
}

function clearLogs() {
  logs = [];
  renderLogs();
  showToast('Traffic logs cleared', 'info');
}

// Fetch all products
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    
    logTraffic('GET', API_URL, response.status, null, result);
    
    if (result.success) {
      products = result.data;
      renderProductsTable(products);
      updateStats(products);
    } else {
      showToast(result.message || 'Failed to fetch products', 'error');
    }
  } catch (error) {
    logTraffic('GET', API_URL, 500, null, { success: false, error: error.message });
    showToast('Failed to connect to the backend server', 'error');
  }
}

// Render Table
function renderProductsTable(productsToRender) {
  if (productsToRender.length === 0) {
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="fa-solid fa-folder-open"></i>
          No products in database. Add one or click "Load Samples".
        </td>
      </tr>
    `;
    return;
  }

  productsTableBody.innerHTML = '';
  productsToRender.forEach(product => {
    const row = document.createElement('tr');
    
    // Stock pill class selection
    let stockClass = 'stock-ok';
    let stockText = `${product.stock} units`;
    if (product.stock === 0) {
      stockClass = 'stock-empty';
      stockText = 'Out of Stock';
    } else if (product.stock <= 5) {
      stockClass = 'stock-low';
      stockText = `Low Stock (${product.stock})`;
    }

    row.innerHTML = `
      <td>
        <div class="prod-info">
          <span class="prod-name">${escapeHTML(product.name)}</span>
          <span class="prod-brand">${escapeHTML(product.brand)}</span>
        </div>
      </td>
      <td>
        <span class="badge-category">${escapeHTML(product.category)}</span>
      </td>
      <td>
        <span class="prod-price">$${Number(product.price).toFixed(2)}</span>
      </td>
      <td>
        <span class="stock-pill ${stockClass}">${stockText}</span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-edit" onclick="startEdit('${product._id}')" title="Edit Product">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-action btn-delete" onclick="handleDelete('${product._id}')" title="Delete Product">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    productsTableBody.appendChild(row);
  });
}

// Stats Calculation
function updateStats(productsList) {
  statTotalProducts.textContent = productsList.length;
  
  const totalValue = productsList.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
  statInventoryValue.textContent = `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const outOfStock = productsList.filter(p => p.stock === 0).length;
  statOutOfStock.textContent = outOfStock;
}

// Handle Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = productIdInput.value;
  const productData = {
    name: productNameInput.value.trim(),
    brand: productBrandInput.value.trim(),
    category: productCategoryInput.value.trim(),
    price: Number(productPriceInput.value),
    stock: Number(productStockInput.value)
  };
  
  const isEditing = !!id;
  const url = isEditing ? `${API_URL}/${id}` : API_URL;
  const method = isEditing ? 'PUT' : 'POST';
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    const result = await response.json();
    
    logTraffic(method, url, response.status, productData, result);
    
    if (result.success) {
      showToast(result.message || `Product ${isEditing ? 'updated' : 'created'} successfully!`);
      resetForm();
      fetchProducts();
    } else {
      showToast(result.message || 'Error occurred while saving', 'error');
    }
  } catch (error) {
    logTraffic(method, url, 500, productData, { success: false, error: error.message });
    showToast('Failed to reach backend server', 'error');
  }
}

// Start Edit Mode
function startEdit(id) {
  const product = products.find(p => p._id === id);
  if (!product) return;
  
  productIdInput.value = product._id;
  productNameInput.value = product.name;
  productBrandInput.value = product.brand;
  productCategoryInput.value = product.category;
  productPriceInput.value = product.price;
  productStockInput.value = product.stock;
  
  formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Product`;
  submitBtn.innerHTML = `<i class="fa-solid fa-save"></i> Update Product`;
  cancelEditBtn.style.display = 'inline-flex';
  
  productNameInput.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form State
function resetForm() {
  productIdInput.value = '';
  productForm.reset();
  
  formTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Add New Product`;
  submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Save Product`;
  cancelEditBtn.style.display = 'none';
}

// Delete Product
async function handleDelete(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  const url = `${API_URL}/${id}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE'
    });
    const result = await response.json();
    
    logTraffic('DELETE', url, response.status, null, result);
    
    if (result.success) {
      showToast('Product deleted successfully');
      fetchProducts();
    } else {
      showToast(result.message || 'Failed to delete product', 'error');
    }
  } catch (error) {
    logTraffic('DELETE', url, 500, null, { success: false, error: error.message });
    showToast('Failed to connect to the backend server', 'error');
  }
}

// Search Filter
function handleSearch() {
  const term = searchInput.value.toLowerCase();
  if (!term) {
    renderProductsTable(products);
    return;
  }
  
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(term) ||
    p.brand.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );
  
  renderProductsTable(filtered);
}

// Seed mock data sequentially
async function seedSampleData() {
  const sampleProducts = [
    { name: 'Wireless Mouse', brand: 'Logitech', category: 'Electronics', price: 799, stock: 50 },
    { name: 'Mechanical Keyboard', brand: 'Keychron', category: 'Electronics', price: 4999, stock: 12 },
    { name: 'Noise Cancelling Headphones', brand: 'Sony', category: 'Audio', price: 14999, stock: 8 },
    { name: 'UltraWide Monitor 34"', brand: 'Dell', category: 'Electronics', price: 32999, stock: 5 },
    { name: 'Smart Fitness Band', brand: 'Xiaomi', category: 'Wearables', price: 2499, stock: 100 },
    { name: 'USB-C Fast Charger', brand: 'Anker', category: 'Accessories', price: 1199, stock: 0 }
  ];
  
  seedBtn.disabled = true;
  seedBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Seeding...`;
  
  showToast('Seeding test data...', 'info');
  
  for (const item of sampleProducts) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      const result = await response.json();
      logTraffic('POST', API_URL, response.status, item, result);
    } catch (e) {
      console.error(e);
    }
  }
  
  await fetchProducts();
  showToast('Mock data loaded successfully!');
  seedBtn.disabled = false;
  seedBtn.innerHTML = `<i class="fa-solid fa-seedling"></i> Load Samples`;
}

// Debug API: Test Invalid Product ID
async function testInvalidId() {
  const invalidId = 'invalid_id_example_123';
  const url = `${API_URL}/${invalidId}`;
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    logTraffic('GET', url, response.status, null, result);
    showToast('Tested Invalid ID successfully! Check console logs.', 'info');
  } catch (error) {
    showToast('Failed to request invalid ID endpoint', 'error');
  }
}

// Debug API: Test Missing Fields (Validation error)
async function testMissingFields() {
  const invalidBody = {
    name: 'Broken Item',
    // Missing brand, category, price, stock
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidBody)
    });
    const result = await response.json();
    
    logTraffic('POST', API_URL, response.status, invalidBody, result);
    showToast('Tested validation failure successfully! Check console logs.', 'info');
  } catch (error) {
    showToast('Failed to request product creation', 'error');
  }
}

// Helper to escape HTML characters
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
