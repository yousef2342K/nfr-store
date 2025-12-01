// Admin Dashboard JavaScript

// Check authentication immediately
if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
    window.location.href = '/login.html';
}

const user = JSON.parse(localStorage.getItem('user'));
if (user.role !== 'admin') {
    alert('Access denied. Admin privileges required.');
    window.location.href = '/';
}

let currentProducts = [];
let currentOrders = [];
let currentUsers = [];
let editingProductId = null;



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check admin authentication
    if (!auth.requireAuth()) return;
    if (!auth.requireAdmin()) return;

    // Display admin name
    document.getElementById('adminName').textContent = auth.user.name;

    // Initialize navigation
    initNavigation();

    // Load dashboard data
    loadDashboard();

    // Setup event listeners
    setupEventListeners();

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
});

// Navigation
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.admin-section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const sectionName = item.dataset.section;
            
            // Update active menu item
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${sectionName}-section`) {
                    section.classList.add('active');
                }
            });

            // Load section data
            switch(sectionName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'users':
                    loadUsers();
                    break;
            }
        });
    });

    // View all links in dashboard
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = link.dataset.section;
            const menuItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (menuItem) menuItem.click();
        });
    });
}



// Setup Event Listeners
function setupEventListeners() {
    // Product form
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Product images
    const productImages = document.getElementById('productImages');
    if (productImages) {
        productImages.addEventListener('change', handleImagePreview);
    }

    // Size checkboxes
    document.querySelectorAll('.size-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const size = this.value;
            const stockInput = document.querySelector(`.stock-input[data-size="${size}"]`);
            stockInput.disabled = !this.checked;
            if (!this.checked) stockInput.value = 0;
        });
    });

    // Order status filter
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', (e) => {
            loadOrders(e.target.value);
        });
    }
}

// Load Dashboard
async function loadDashboard() {
    try {
        const data = await api.request('/admin/dashboard');
        
        // Update stats
        document.getElementById('totalProducts').textContent = data.stats.totalProducts;
        document.getElementById('totalOrders').textContent = data.stats.totalOrders;
        document.getElementById('totalUsers').textContent = data.stats.totalUsers;
        document.getElementById('pendingOrders').textContent = data.stats.pendingOrders;
        document.getElementById('processingOrders').textContent = data.stats.processingOrders;
        document.getElementById('totalRevenue').textContent = `$${data.stats.totalRevenue.toFixed(2)}`;

        // Display recent orders
        displayRecentOrders(data.recentOrders);

        // Display low stock products
        displayLowStockProducts(data.lowStockProducts);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Display Recent Orders
function displayRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recent orders</p></div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <div class="order-number">#${order.orderNumber}</div>
                <div class="order-customer">${order.user?.name || 'Guest'}</div>
            </div>
            <div>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
            <div class="order-amount">$${order.totalAmount.toFixed(2)}</div>
        </div>
    `).join('');
}

// Display Low Stock Products
function displayLowStockProducts(products) {
    const container = document.getElementById('lowStockProducts');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>All products are well stocked!</p></div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="stock-item">
            <div class="stock-info">
                <div class="product-name">${product.name}</div>
                <div class="stock-level">Stock: ${product.totalStock} units</div>
            </div>
            <button onclick="editProduct('${product._id}')" class="btn-icon">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `).join('');
}

// Load Products
async function loadProducts() {

try {

const data = await api.admin.getProducts();

currentProducts = data.products;

// Fixed: Update UI immediately

displayProducts(currentProducts);

updateStats(); // Refresh dashboard stats

} catch (error) {

toast.error('Failed to load products');

}

}

// Display Products
function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => {
        const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
        const totalStock = product.sizes.reduce((sum, size) => sum + size.stock, 0);
        
        return `
            <tr>
                <td>
                    <img src="${primaryImage?.url || '/images/placeholder.jpg'}" 
                         alt="${product.name}" 
                         class="product-image">
                </td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${totalStock}</td>
                <td>
                    <span class="status-badge status-${product.isActive ? 'active' : 'inactive'}">
                        ${product.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    ${product.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>' : '-'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editProduct('${product._id}')" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProduct('${product._id}')" class="btn-icon-danger" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Show Add Product Modal
function showAddProductModal() {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('existingImagesContainer').innerHTML = '';
    
    // Reset colors
    document.getElementById('colorsContainer').innerHTML = `
        <div class="color-input-row">
            <input type="text" class="form-control color-name" placeholder="Color Name (e.g., Black)">
            <input type="color" class="form-control color-picker" value="#000000">
            <button type="button" onclick="removeColorRow(this)" class="btn-icon-danger">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Uncheck all sizes and disable stock inputs
    document.querySelectorAll('.size-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('.stock-input').forEach(input => {
        input.disabled = true;
        input.value = 0;
    });
    
    document.getElementById('productModal').classList.add('show');
}

// Edit Product
async function editProduct(productId) {
    try {
        const product = currentProducts.find(p => p._id === productId);
        if (!product) return;

        editingProductId = productId;
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = productId;
        
        // Fill form
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productComparePrice').value = product.comparePrice || '';
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productFeatured').checked = product.featured;
        document.getElementById('productTags').value = product.tags?.join(', ') || '';

        // Set sizes
        document.querySelectorAll('.size-checkbox').forEach(checkbox => {
            const size = product.sizes.find(s => s.name === checkbox.value);
            checkbox.checked = !!size;
            const stockInput = document.querySelector(`.stock-input[data-size="${checkbox.value}"]`);
            stockInput.disabled = !size;
            stockInput.value = size?.stock || 0;
        });

        // Set colors
        const colorsContainer = document.getElementById('colorsContainer');
        colorsContainer.innerHTML = product.colors.map(color => `
            <div class="color-input-row">
                <input type="text" class="form-control color-name" value="${color.name}">
                <input type="color" class="form-control color-picker" value="${color.hexCode}">
                <button type="button" onclick="removeColorRow(this)" class="btn-icon-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Show existing images
        const existingContainer = document.getElementById('existingImagesContainer');
        existingContainer.innerHTML = product.images.map((img, index) => `
            <div class="image-preview-item" data-url="${img.url}">
                <img src="${img.url}" alt="Product">
                <button type="button" onclick="removeExistingImage('${img.url}')" class="remove-image-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('productModal').classList.add('show');

    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product', 'error');
    }
}

// Handle Product Submit
async function handleProductSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData();
        
        // Basic info
        formData.append('name', document.getElementById('productName').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('comparePrice', document.getElementById('productComparePrice').value || '');
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('featured', document.getElementById('productFeatured').checked);

        // Tags
        const tags = document.getElementById('productTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);
        formData.append('tags', JSON.stringify(tags));

        // Sizes
        const sizes = [];
        document.querySelectorAll('.size-checkbox:checked').forEach(checkbox => {
            const size = checkbox.value;
            const stock = parseInt(document.querySelector(`.stock-input[data-size="${size}"]`).value) || 0;
            sizes.push({ name: size, stock });
        });
        formData.append('sizes', JSON.stringify(sizes));

        // Colors
        const colors = [];
        document.querySelectorAll('.color-input-row').forEach(row => {
            const name = row.querySelector('.color-name').value.trim();
            const hexCode = row.querySelector('.color-picker').value;
            if (name) colors.push({ name, hexCode });
        });
        formData.append('colors', JSON.stringify(colors));

        // New images
        const imageFiles = document.getElementById('productImages').files;
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append('images', imageFiles[i]);
        }

        // Existing images (for edit)
        if (editingProductId) {
            const existingImages = [];
            document.querySelectorAll('#existingImagesContainer .image-preview-item').forEach(item => {
                existingImages.push({
                    url: item.dataset.url,
                    isPrimary: false
                });
            });
            if (existingImages.length > 0) {
                existingImages[0].isPrimary = true;
            }
            formData.append('existingImages', JSON.stringify(existingImages));
        }

        // Submit
        let response;
        if (editingProductId) {
            response = await fetch(`${window.location.origin}/api/admin/products/${editingProductId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                },
                body: formData
            });
        } else {
            response = await fetch(`${window.location.origin}/api/admin/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                },
                body: formData
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            closeProductModal();
            loadProducts();
        } else {
            showToast(data.message || 'Error saving product', 'error');
        }

    } catch (error) {
        console.error('Error submitting product:', error);
        showToast('Error saving product', 'error');
    }
}

// Delete Product
async function deleteProduct(productId) {

if (!confirm('Delete this product?')) return;


try {

await api.admin.deleteProduct(productId);

await loadProducts();

toast.success('Product deleted');

} catch (error) {

// Fixed: Show proper error message

toast.error(error.message || 'Delete failed');

}

}

// Close Product Modal
function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
}

async function createProduct() {

const formData = new FormData();

formData.append('name', productName);

formData.append('price', price);

formData.append('category', category);


// Fixed: Properly append images

for (let img of imageFiles) {

formData.append('images', img);

}


const response = await fetch('/api/admin/products', {

method: 'POST',

headers: { 'Authorization': `Bearer ${token}` },

body: formData

});


if (response.ok) toast.success('Product created');

}
async function updateProduct(productId) {

const updateData = {

name: productName,

price: Number(price),

// Fixed: Properly update stock by size

sizes: sizes.map(s => ({

name: s.name,

stock: Number(s.stock)

}))

};


const response = await api.admin.updateProduct(productId, updateData);

await loadProducts(); // Refresh list

toast.success('Stock updated successfully');

}
// Add Color Row
function addColorRow() {
    const container = document.getElementById('colorsContainer');
    const row = document.createElement('div');
    row.className = 'color-input-row';
    row.innerHTML = `
        <input type="text" class="form-control color-name" placeholder="Color Name">
        <input type="color" class="form-control color-picker" value="#000000">
        <button type="button" onclick="removeColorRow(this)" class="btn-icon-danger">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(row);
}

// Remove Color Row
function removeColorRow(button) {
    button.closest('.color-input-row').remove();
}

// Remove Existing Image
function removeExistingImage(url) {
    const item = document.querySelector(`[data-url="${url}"]`);
    if (item) item.remove();
}

// Handle Image Preview
function handleImagePreview(e) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';

    Array.from(e.target.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Load Orders
async function loadOrders(status = '') {
    try {
        const endpoint = status ? `/admin/orders?status=${status}` : '/admin/orders';
        const data = await api.request(endpoint);
        currentOrders = data.orders;
        displayOrders(data.orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error loading orders', 'error');
    }
}

// Display Orders
function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.orderNumber}</td>
            <td>${order.user?.name || 'Guest'}<br><small>${order.user?.email || ''}</small></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>${order.items.length} items</td>
            <td>$${order.totalAmount.toFixed(2)}</td>
            <td>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewOrder('${order._id}')" class="btn-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// View Order
async function viewOrder(orderId) {
    try {
        const order = currentOrders.find(o => o._id === orderId);
        if (!order) return;

        const content = document.getElementById('orderDetailContent');
        content.innerHTML = `
            <div class="order-detail-grid">
                <div class="detail-section">
                    <h3>Order Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Order Number</span>
                        <span class="detail-value">#${order.orderNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">${new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge status-${order.status}">${order.status}</span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment</span>
                        <span class="detail-value">${order.paymentMethod || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total</span>
                        <span class="detail-value">$${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Customer & Shipping</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${order.shippingAddress.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${order.shippingAddress.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${order.user?.email || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Address</span>
                        <span class="detail-value">
                            ${order.shippingAddress.street}<br>
                            ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
                            ${order.shippingAddress.zipCode}, ${order.shippingAddress.country}
                        </span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Order Items</h3>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <img src="${item.image}" alt="${item.name}" class="order-item-image">
                            <div class="order-item-info">
                                <div class="order-item-name">${item.name}</div>
                                <div class="order-item-details">
                                    Size: ${item.size} | Color: ${item.color} | Quantity: ${item.quantity}
                                </div>
                            </div>
                            <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${order.notes ? `
                <div class="detail-section">
                    <h3>Order Notes</h3>
                    <p>${order.notes}</p>
                </div>
            ` : ''}

            <div class="status-update-form">
                <h3>Update Order Status</h3>
                <div class="form-row">
                    <select id="newOrderStatus" class="form-control">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button onclick="updateOrderStatus('${order._id}')" class="btn-primary">
                        <i class="fas fa-save"></i> Update Status
                    </button>
                </div>
            </div>
        `;

        document.getElementById('orderModal').classList.add('show');
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast('Error loading order details', 'error');
    }
}

// Update Order Status
async function updateOrderStatus(orderId) {
    try {
        const status = document.getElementById('newOrderStatus').value;
        
        const data = await api.request(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        showToast(data.message, 'success');
        closeOrderModal();
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Error updating order status', 'error');
    }
}

// Close Order Modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
}

// Load Users
async function loadUsers() {
    try {
        const data = await api.request('/admin/users');
        currentUsers = data.users;
        displayUsers(data.users);
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

// Display Users
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'status-confirmed' : 'status-pending'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});
