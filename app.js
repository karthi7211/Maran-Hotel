// Cashier Billing System - Mobile Optimized

import { db } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, onSnapshot, query, orderBy, serverTimestamp, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check Session
if (sessionStorage.getItem('userRole') !== 'admin') {
    window.location.href = 'login.html';
}

window.handleAdminLogout = function () {
    sessionStorage.clear();
    window.location.href = 'login.html';
};

// Data Management Layer - Firebase Edition
class DataManager {
    constructor() {
        this.menuCollection = collection(db, 'menu');
        this.ordersCollection = collection(db, 'orders');
        // Local cache for synchronous access where needed (though we should move to async)
        this.menuCache = [];
    }

    // Initialize: Check if menu exists in DB, if not, seed it.
    async initializeStorage() {
        try {
            console.log("Checking Menu in Firestore...");
            const snapshot = await getDocs(this.menuCollection);

            if (snapshot.empty) {
                console.log("Menu empty. Seeding default items...");
                const defaultItems = this.getDefaultMenuItems();
                for (const item of defaultItems) {
                    await setDoc(doc(this.menuCollection, item.id), item);
                }
                this.menuCache = defaultItems;
            } else {
                console.log("Menu loaded from Firestore.");
                snapshot.forEach(doc => this.menuCache.push(doc.data()));
            }

            // Start listening for real-time menu updates
            onSnapshot(query(this.menuCollection), (snap) => {
                this.menuCache = [];
                snap.forEach(doc => this.menuCache.push(doc.data()));
                // Trigger UI refresh if component exists
                if (window.menuComponent) window.menuComponent.render();
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize Firestore Data:', error);
            return false;
        }
    }

    // Get default items (kept for seeding)
    getDefaultMenuItems() {
        return [
            {
                id: 'idli',
                name: 'Idli',
                price: 20,
                description: 'Steamed rice cakes served with sambar and chutney',
                image: 'https://maayeka.com/wp-content/uploads/2013/10/soft-idli-recipe.jpg',
                category: 'South Indian',
                available: true
            },
            {
                id: 'vada',
                name: 'Vada',
                price: 20,
                description: 'Crispy lentil donuts served with sambar and chutney',
                image: 'https://c.ndtvimg.com/2023-08/cds65egg_medu-vada_625x300_08_August_23.jpg?im=FaceCrop,algorithm=dnn,width=1200,height=886',
                category: 'South Indian',
                available: true
            },
            {
                id: 'dosa',
                name: 'Dosa',
                price: 45,
                description: 'Crispy crepe made from rice and lentil batter',
                image: 'https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__1200_0_0_0_auto.jpg',
                category: 'South Indian',
                available: true
            },
            {
                id: 'poori',
                name: 'Poori',
                price: 40,
                description: 'Deep-fried bread served with curry',
                image: 'https://www.awesomecuisine.com/wp-content/uploads/2020/03/poori-masala-kizhangu-500x375.jpg',
                category: 'North Indian',
                available: true
            },
            {
                id: 'coffee',
                name: 'Coffee',
                price: 15,
                description: 'Fresh brewed South Indian filter coffee',
                image: 'https://corkframes.com/cdn/shop/articles/Corkframes_Coffee_Guide_520x500_422ebe38-4cfa-42b5-a266-b9bfecabaf30.jpg?v=1734598727',
                category: 'Beverages',
                available: true
            },
            {
                id: 'pongal',
                name: 'Pongal',
                price: 25,
                description: 'Savory rice and lentil dish with spices',
                image: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2021/01/pongal-ven-pongal.webp',
                category: 'South Indian',
                available: true
            },
            {
                id: 'full-meal',
                name: 'Full Meal',
                price: 100,
                description: 'Complete meal with rice, curry, vegetables, and dessert',
                image: 'https://rakskitchen.net/wp-content/uploads/2013/08/9634876480_20d7ac8196_o.jpg',
                category: 'Meals',
                available: true
            },
            {
                id: 'mini-meal',
                name: 'Mini Meal',
                price: 50,
                description: 'Smaller portion meal with rice and curry',
                image: 'https://thehomecookings.com/wp-content/uploads/2025/03/veg-mini.jpeg',
                category: 'Meals',
                available: true
            }
        ];
    }

    // Menu Items - Async for Write, Sync for Read (via cache)
    async saveMenuItems(menuItems) {
        // In Firestore, we update items individually or overwrite.
        // For simplicity in this port, we won't batch write everything every time.
        // But since the current app passes the whole array, let's just log a warning 
        // that we should use specific update methods.
        console.warn("saveMenuItems called - For Firebase, prefer updating single items.");
        return true;
    }

    // New method for adding/updating single item
    async saveMenuItem(item) {
        try {
            await setDoc(doc(this.menuCollection, item.id), item);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    loadMenuItems() {
        return this.menuCache;
    }

    // Cart Management (Keep LocalStorage for Cart - it's per device/session usually)
    saveCart(cartItems) {
        try {
            localStorage.setItem('restaurant_current_cart', JSON.stringify(cartItems));
            return true;
        } catch (error) { return false; }
    }

    loadCart() {
        try {
            return JSON.parse(localStorage.getItem('restaurant_current_cart')) || [];
        } catch (error) { return []; }
    }

    // Orders Management (Push to Firestore)
    async saveOrder(order) {
        try {
            await addDoc(collection(db, 'sales'), {
                ...order,
                timestamp: serverTimestamp()
            });
            console.log("Order saved to Firestore");
            return true;
        } catch (error) {
            console.error('Failed to save order:', error);
            return false;
        }
    }

    async loadOrders() {
        try {
            const snapshot = await getDocs(query(collection(db, 'sales'), orderBy('timestamp', 'desc')));
            const orders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convert Firestore timestamp to JS Date string for the report logic
                if (data.timestamp && data.timestamp.toDate) {
                    data.timestamp = data.timestamp.toDate().toISOString();
                }
                orders.push(data);
            });
            return orders;
        } catch (error) {
            console.error('Failed to load orders:', error);
            return [];
        }
    }

    async deleteMenuItem(itemId) {
        try {
            await deleteDoc(doc(this.menuCollection, itemId));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // Settings (Keep Local)
    loadSettings() {
        try {
            const settings = localStorage.getItem('restaurant_settings');
            return settings ? JSON.parse(settings) : { currency: 'INR', restaurantName: 'Restaurant' };
        } catch (error) {
            return { currency: 'INR', restaurantName: 'Restaurant' };
        }
    }

    async saveMonthlyReport(reportData) {
        try {
            const reportsCollection = collection(db, 'monthly_reports');
            // Use a specific ID format: YYYY-MM
            const reportId = `${reportData.year}-${String(reportData.month + 1).padStart(2, '0')}`;
            await setDoc(doc(reportsCollection, reportId), {
                ...reportData,
                savedAt: serverTimestamp()
            });
            console.log("Monthly report saved to Firestore:", reportId);
            return true;
        } catch (error) {
            console.error('Failed to save monthly report:', error);
            return false;
        }
    }

    isStorageAvailable() { return true; }
    generateId() { return Date.now().toString(36); }
}

// Menu Component
class MenuComponent {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentFilter = 'all';
        this.menuItems = [];
    }

    init() {
        this.loadMenuItems();
        this.setupEventListeners();
        this.render();
    }

    loadMenuItems() {
        this.menuItems = this.dataManager.loadMenuItems();
    }

    setupEventListeners() {
        // Category filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.category;
                this.render();
            });
        });
    }

    render() {
        const container = document.getElementById('menu-container');
        if (!container) {
            console.error('Menu container not found');
            return;
        }

        const filteredItems = this.currentFilter === 'all'
            ? this.menuItems
            : this.menuItems.filter(item => item.category === this.currentFilter);

        console.log(`Rendering ${filteredItems.length} menu items`);

        container.innerHTML = filteredItems.map(item => `
            <div class="menu-item" data-id="${item.id}" onclick="window.cartComponent.addItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <img src="${item.image}" alt="${item.name}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300/FFD700/2C2C2C?text=${encodeURIComponent(item.name)}'; console.log('Image failed for ${item.name}');"
                     onload="console.log('Image loaded for ${item.name}');">
                <div class="category">${item.category}</div>
                <h3>${item.name}</h3>
                <div class="price">₹${item.price}</div>
            </div>
        `).join('');
    }

    refresh() {
        this.loadMenuItems();
        this.render();
    }
}

// Cart Component
class CartComponent {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.cartItems = [];
        this.settings = {};
    }

    init() {
        this.loadCart();
        this.loadSettings();
        this.setupEventListeners();
        this.render();
    }

    loadCart() {
        this.cartItems = this.dataManager.loadCart();
    }

    loadSettings() {
        this.settings = this.dataManager.loadSettings();
    }

    setupEventListeners() {
        document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
            if (confirm('Clear all items from cart?')) {
                this.clearCart();
            }
        });

        document.getElementById('download-invoice-btn')?.addEventListener('click', () => {
            this.downloadInvoice();
        });

        document.getElementById('pay-now-btn')?.addEventListener('click', () => {
            this.showPaymentQR();
        });
    }

    addItem(menuItem) {
        const existingItem = this.cartItems.find(item => item.menuItemId === menuItem.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cartItems.push({
                menuItemId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1,
                priceAtTime: menuItem.price
            });
        }

        this.saveCart();
        this.render();

        // Haptic feedback for mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    removeItem(itemId) {
        this.cartItems = this.cartItems.filter(item => item.menuItemId !== itemId);
        this.saveCart();
        this.render();
    }

    updateQuantity(itemId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeItem(itemId);
            return;
        }

        const item = this.cartItems.find(item => item.menuItemId === itemId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
            this.render();
        }
    }

    clearCart() {
        this.cartItems = [];
        this.saveCart();
        this.render();
    }

    saveCart() {
        this.dataManager.saveCart(this.cartItems);
    }

    getTotal() {
        return this.cartItems.reduce((total, item) => total + (item.priceAtTime * item.quantity), 0);
    }

    render() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        const generateQRBtn = document.getElementById('generate-qr-btn');

        if (!cartItemsContainer) return;

        // Render cart items
        if (this.cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p class="no-data">No items added yet</p>';
        } else {
            cartItemsContainer.innerHTML = this.cartItems.map(item => `
                <div class="cart-item" data-id="${item.menuItemId}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₹${item.priceAtTime} each</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease-btn" onclick="window.cartComponent.updateQuantity('${item.menuItemId}', ${item.quantity - 1})">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn increase-btn" onclick="window.cartComponent.updateQuantity('${item.menuItemId}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="window.cartComponent.removeItem('${item.menuItemId}')">×</button>
                </div>
            `).join('');
        }

        // Update total
        const total = this.getTotal();
        if (cartTotal) cartTotal.textContent = `₹${total}`;

        // Enable/disable buttons
        const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
        const payNowBtn = document.getElementById('pay-now-btn');

        if (downloadInvoiceBtn) downloadInvoiceBtn.disabled = this.cartItems.length === 0;
        if (payNowBtn) payNowBtn.disabled = this.cartItems.length === 0;
    }

    downloadInvoice() {
        if (this.cartItems.length === 0) return;

        const order = {
            id: this.dataManager.generateId(),
            items: [...this.cartItems],
            total: this.getTotal(),
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Show invoice modal
        window.billingComponent.showInvoice(order);
    }

    showPaymentQR() {
        if (this.cartItems.length === 0) return;

        const order = {
            id: this.dataManager.generateId(),
            items: [...this.cartItems],
            total: this.getTotal(),
            timestamp: new Date().toISOString(),
            status: 'completed'
        };

        // Save order
        this.dataManager.saveOrder(order);

        // Show payment QR modal
        window.billingComponent.showPaymentQR(order);
    }
}

// Billing Component
class BillingComponent {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentOrder = null;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Invoice buttons
        document.getElementById('print-invoice-btn')?.addEventListener('click', () => {
            this.printInvoice();
        });

        document.getElementById('download-invoice-pdf-btn')?.addEventListener('click', () => {
            this.downloadInvoicePDF();
        });

        // Payment buttons
        document.getElementById('payment-complete-btn')?.addEventListener('click', () => {
            this.completePayment();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showInvoice(order) {
        this.currentOrder = order;
        const modal = document.getElementById('invoice-modal');
        const invoiceContent = document.getElementById('invoice-content');

        if (!modal || !invoiceContent) return;

        const settings = this.dataManager.loadSettings();
        const invoiceNumber = `INV-${order.id.toUpperCase()}`;

        invoiceContent.innerHTML = `
            <div class="bill-header">
                <h3>${settings.restaurantName}</h3>
                <p><strong>INVOICE</strong></p>
                <p>Invoice No: ${invoiceNumber}</p>
                <p>Date: ${new Date(order.timestamp).toLocaleDateString('en-IN')}</p>
                <p>Time: ${new Date(order.timestamp).toLocaleTimeString('en-IN')}</p>
            </div>
            
            <div class="bill-items">
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${item.priceAtTime}</td>
                                <td>₹${(item.priceAtTime * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="bill-totals">
                <div class="total-row final-total">
                    <span>Total Amount:</span>
                    <span>₹${order.total}</span>
                </div>
                <div class="total-row">
                    <span>Amount in Words:</span>
                    <span>${this.numberToWords(order.total)} Rupees Only</span>
                </div>
            </div>
            
            <div class="bill-footer">
                <p>Thank you for your visit!</p>
                <p>GST No: 29XXXXX1234X1ZX (Sample)</p>
            </div>
        `;

        modal.style.display = 'block';
    }

    showPaymentQR(order) {
        this.currentOrder = order;
        const modal = document.getElementById('payment-modal');
        const paymentAmount = document.getElementById('payment-amount');

        if (!modal) return;

        if (paymentAmount) {
            paymentAmount.textContent = `₹${order.total}`;
        }

        // Generate QR Code
        this.generateQRCode(order);

        modal.style.display = 'block';
    }

    printInvoice() {
        window.print();
    }

    downloadInvoicePDF() {
        // Simple PDF download simulation
        const invoiceContent = document.getElementById('invoice-content');
        if (invoiceContent) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Invoice - ${this.currentOrder?.id}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .bill-header { text-align: center; margin-bottom: 20px; }
                            .bill-totals { margin-top: 20px; }
                            .final-total { font-weight: bold; font-size: 1.2em; }
                        </style>
                    </head>
                    <body>
                        ${invoiceContent.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    }

    completePayment() {
        // Clear cart and close modal
        window.cartComponent.clearCart();
        document.getElementById('payment-modal').style.display = 'none';

        // Show success message
        alert('Payment completed successfully!');

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    showInvoiceWithQR(order) {
        this.currentOrder = order;
        const modal = document.getElementById('bill-modal');
        const billContent = document.getElementById('bill-content');

        if (!modal || !billContent) return;

        const settings = this.dataManager.loadSettings();
        const invoiceNumber = `INV-${order.id.toUpperCase()}`;

        billContent.innerHTML = `
            <div class="bill-header">
                <h3>${settings.restaurantName}</h3>
                <p><strong>INVOICE</strong></p>
                <p>Invoice No: ${invoiceNumber}</p>
                <p>Date: ${new Date(order.timestamp).toLocaleDateString('en-IN')}</p>
                <p>Time: ${new Date(order.timestamp).toLocaleTimeString('en-IN')}</p>
            </div>
            
            <div class="bill-items">
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${item.priceAtTime}</td>
                                <td>₹${(item.priceAtTime * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="bill-totals">
                <div class="total-row final-total">
                    <span>Total Amount:</span>
                    <span>₹${order.total}</span>
                </div>
                <div class="total-row">
                    <span>Amount in Words:</span>
                    <span>${this.numberToWords(order.total)} Rupees Only</span>
                </div>
            </div>
            
            <div class="bill-footer">
                <p>Thank you for your visit!</p>
                <p>GST No: 29XXXXX1234X1ZX (Sample)</p>
            </div>
        `;

        // Generate QR Code
        this.generateQRCode(order);

        modal.style.display = 'block';
    }

    numberToWords(num) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if (num === 0) return 'Zero';
        if (num < 10) return ones[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + this.numberToWords(num % 100) : '');
        if (num < 100000) return this.numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.numberToWords(num % 1000) : '');

        return 'Amount too large';
    }

    generateQRCode(order) {
        const qrContainer = document.getElementById('qr-code');
        if (!qrContainer) return;

        // Clear container and add static Google Pay QR code
        qrContainer.innerHTML = `
            <img src="./qr_code.png" 
                 alt="Google Pay QR Code" 
                 style="max-width: 200px; max-height: 200px; border: 4px solid #FFD700; border-radius: 12px; padding: 1rem; background: white; box-shadow: 0 2px 8px rgba(218, 165, 32, 0.2);"
                 onerror="console.log('QR image failed to load'); this.style.display='none'; this.nextElementSibling.style.display='block';"
                 onload="console.log('QR image loaded successfully');">
            <p style="display: none; color: #dc3545; font-weight: bold;">QR Code failed to load</p>
        `;
    }

    printBill() {
        window.print();
    }

    startNewOrder() {
        // Clear cart and close modal
        window.cartComponent.clearCart();
        document.getElementById('bill-modal').style.display = 'none';

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
}

// Time Display Component
class TimeDisplay {
    constructor() {
        this.timeElement = document.getElementById('current-time');
    }

    init() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    updateTime() {
        if (this.timeElement) {
            const now = new Date();
            this.timeElement.textContent = now.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
}





// Main Application
class CashierApp {
    constructor() {
        this.dataManager = new DataManager();
        this.menuComponent = null;
        this.cartComponent = null;
        this.billingComponent = null;
        this.reportsComponent = null;
        this.menuManagementComponent = null;
        this.liveOrdersComponent = null; // New
        this.timeDisplay = null;
        this.currentView = 'cashier';
    }

    async init() {
        try {
            console.log("Initializing App Data...");
            const storageInitialized = await this.dataManager.initializeStorage();
            if (!storageInitialized) {
                console.error("Storage initialization warning.");
            }

            // Initialize components
            this.menuComponent = new MenuComponent(this.dataManager);
            setTimeout(() => this.menuComponent.init(), 100);

            this.cartComponent = new CartComponent(this.dataManager);
            this.billingComponent = new BillingComponent(this.dataManager);
            this.reportsComponent = new ReportsComponent(this.dataManager);
            this.menuManagementComponent = new MenuManagementComponent(this.dataManager);

            // Initialize Live Orders - REMOVED per request
            // this.liveOrdersComponent = new LiveOrdersComponent(this.dataManager);
            // this.liveOrdersComponent.init();
            // window.liveOrders = this.liveOrdersComponent;

            this.timeDisplay = new TimeDisplay();

            // Make components globally available
            window.menuComponent = this.menuComponent;
            window.cartComponent = this.cartComponent;
            window.billingComponent = this.billingComponent;
            window.reportsComponent = this.reportsComponent;
            window.menuManagementComponent = this.menuManagementComponent;

            // Initialize other components
            this.cartComponent.init();
            this.billingComponent.init();
            this.reportsComponent.init();
            this.menuManagementComponent.init();

            if (this.timeDisplay) this.timeDisplay.init();

            this.setupNavigation();
            this.showView('cashier');

            console.log('Cashier app initialized successfully');
            return true;

        } catch (error) {
            console.error('Initialization failed:', error);
            return false;
        }
    }

    setupNavigation() {
        // Navigation buttons
        document.getElementById('cashier-view-btn')?.addEventListener('click', () => {
            this.showView('cashier');
        });

        document.getElementById('reports-view-btn')?.addEventListener('click', () => {
            this.showView('reports');
        });

        document.getElementById('menu-manage-btn')?.addEventListener('click', () => {
            this.showView('menu-manage');
        });
    }

    showView(viewName) {
        this.currentView = viewName;

        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });

        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
        }

        // Update active navigation button
        const activeBtn = document.getElementById(`${viewName}-view-btn`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Refresh components when switching views
        if (viewName === 'menu-manage' && this.menuManagementComponent) {
            this.menuManagementComponent.render();
        }
        if (viewName === 'reports' && this.reportsComponent) {
            this.reportsComponent.refreshData();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new CashierApp();
    const success = app.init();
    if (success) {
        console.log('App initialized successfully');
    } else {
        console.error('App initialization failed');
    }
});

// Export for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CashierApp, DataManager, MenuComponent, CartComponent, BillingComponent };
}
// Reports Component
class ReportsComponent {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.orders = [];
        this.currentTab = 'daily';
        this.currentMonthlyData = null;
    }

    async init() {
        await this.loadOrders();
        this.setupEventListeners();
        this.populateDropdowns();
        this.setDefaultDate();
    }

    async loadOrders() {
        this.orders = await this.dataManager.loadOrders();
    }

    setupEventListeners() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Report generation buttons
        document.getElementById('generate-daily-btn')?.addEventListener('click', () => {
            this.generateDailyReport();
        });

        document.getElementById('generate-monthly-btn')?.addEventListener('click', () => {
            this.generateMonthlyReport();
        });

        document.getElementById('generate-annual-btn')?.addEventListener('click', () => {
            this.generateAnnualReport();
        });

        document.getElementById('save-monthly-btn')?.addEventListener('click', () => {
            this.saveMonthlyReportToDB();
        });
    }

    async refreshData() {
        await this.loadOrders();
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.report-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-report`).classList.add('active');
    }

    setDefaultDate() {
        const today = new Date();
        const dailyDate = document.getElementById('daily-date');
        if (dailyDate) {
            dailyDate.value = today.toISOString().split('T')[0];
        }
    }

    populateDropdowns() {
        // Populate months
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthSelect = document.getElementById('monthly-month');
        if (monthSelect) {
            monthSelect.innerHTML = '<option value="">Select Month</option>' +
                months.map((month, index) => `<option value="${index}">${month}</option>`).join('');

            // Set current month as default
            monthSelect.value = new Date().getMonth();
        }

        // Populate years
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

        [document.getElementById('monthly-year'), document.getElementById('annual-year')].forEach(yearSelect => {
            if (yearSelect) {
                yearSelect.innerHTML = '<option value="">Select Year</option>' +
                    years.map(year => `<option value="${year}">${year}</option>`).join('');

                // Set current year as default
                yearSelect.value = currentYear;
            }
        });
    }

    generateDailyReport() {
        const dateInput = document.getElementById('daily-date');
        const reportContent = document.getElementById('daily-report-content');

        if (!dateInput || !reportContent) return;

        const selectedDate = dateInput.value;
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }

        const targetDate = new Date(selectedDate);
        const filteredOrders = this.orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate.toDateString() === targetDate.toDateString();
        });

        this.renderDailyReport(filteredOrders, targetDate, reportContent);
    }

    renderDailyReport(orders, date, container) {
        if (orders.length === 0) {
            container.innerHTML = `<div class="no-data-report">No orders found for ${date.toLocaleDateString('en-IN')}</div>`;
            return;
        }

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalRevenue / totalOrders;

        // Calculate hourly breakdown
        const hourlyBreakdown = {};
        orders.forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            const hourKey = `${hour}:00 - ${hour + 1}:00`;
            if (!hourlyBreakdown[hourKey]) {
                hourlyBreakdown[hourKey] = { orders: 0, revenue: 0 };
            }
            hourlyBreakdown[hourKey].orders++;
            hourlyBreakdown[hourKey].revenue += order.total;
        });

        // Calculate popular items
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const popularItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        container.innerHTML = `
            <h3>Daily Sales Report - ${date.toLocaleDateString('en-IN')}</h3>
            
            <div class="report-summary">
                <div class="report-card">
                    <h4>Total Revenue</h4>
                    <div class="value">₹${totalRevenue}</div>
                </div>
                <div class="report-card">
                    <h4>Total Orders</h4>
                    <div class="value">${totalOrders}</div>
                </div>
                <div class="report-card">
                    <h4>Average Order</h4>
                    <div class="value">₹${Math.round(averageOrderValue)}</div>
                </div>
                <div class="report-card">
                    <h4>Peak Hour</h4>
                    <div class="value">${this.getPeakHour(hourlyBreakdown)}</div>
                </div>
            </div>

            <div class="report-section">
                <h4>Popular Items Today</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${popularItems.map(([name, count]) => {
            const itemRevenue = this.calculateItemRevenue(orders, name);
            return `
                                <tr>
                                    <td>${name}</td>
                                    <td>${count}</td>
                                    <td>₹${itemRevenue}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="report-section">
                <h4>Hourly Breakdown</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(hourlyBreakdown)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([hour, data]) => `
                                <tr>
                                    <td>${hour}</td>
                                    <td>${data.orders}</td>
                                    <td>₹${data.revenue}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateMonthlyReport() {
        const monthSelect = document.getElementById('monthly-month');
        const yearSelect = document.getElementById('monthly-year');
        const reportContent = document.getElementById('monthly-report-content');

        if (!monthSelect || !yearSelect || !reportContent) return;

        const selectedMonth = monthSelect.value;
        const selectedYear = yearSelect.value;

        if (!selectedMonth || !selectedYear) {
            alert('Please select both month and year');
            return;
        }

        const filteredOrders = this.orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate.getMonth() === parseInt(selectedMonth) &&
                orderDate.getFullYear() === parseInt(selectedYear);
        });

        this.currentMonthlyData = {
            orders: filteredOrders,
            month: parseInt(selectedMonth),
            year: parseInt(selectedYear)
        };

        this.renderMonthlyReport(filteredOrders, parseInt(selectedMonth), parseInt(selectedYear), reportContent);

        // Show save button if there are orders
        const saveBtn = document.getElementById('save-monthly-btn');
        if (saveBtn) saveBtn.style.display = filteredOrders.length > 0 ? 'inline-block' : 'none';

        const downloadBtn = document.getElementById('download-monthly-btn');
        if (downloadBtn) downloadBtn.style.display = filteredOrders.length > 0 ? 'inline-block' : 'none';
    }

    async saveMonthlyReportToDB() {
        if (!this.currentMonthlyData || this.currentMonthlyData.orders.length === 0) {
            alert('No report data to save!');
            return;
        }

        const stats = this.calculateMonthlyStats(this.currentMonthlyData.orders, this.currentMonthlyData.month, this.currentMonthlyData.year);

        const success = await this.dataManager.saveMonthlyReport({
            month: this.currentMonthlyData.month,
            year: this.currentMonthlyData.year,
            ...stats
        });

        if (success) {
            alert('Monthly report saved successfully to the database!');
        } else {
            alert('Failed to save the report. Please try again.');
        }
    }

    calculateMonthlyStats(orders, month, year) {
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;

        // Calculate popular items
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const popularItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count, revenue: this.calculateItemRevenue(orders, name) }));

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue: totalRevenue / totalOrders,
            averageDailyRevenue: totalRevenue / daysInMonth,
            popularItems
        };
    }

    renderMonthlyReport(orders, month, year, container) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        if (orders.length === 0) {
            container.innerHTML = `<div class="no-data-report">No orders found for ${monthNames[month]} ${year}</div>`;
            return;
        }

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalRevenue / totalOrders;

        // Calculate daily breakdown
        const dailyBreakdown = {};
        orders.forEach(order => {
            const day = new Date(order.timestamp).getDate();
            if (!dailyBreakdown[day]) {
                dailyBreakdown[day] = { orders: 0, revenue: 0 };
            }
            dailyBreakdown[day].orders++;
            dailyBreakdown[day].revenue += order.total;
        });

        // Calculate popular items
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const popularItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const averageDailyRevenue = totalRevenue / daysInMonth;

        container.innerHTML = `
            <h3>Monthly Sales Report - ${monthNames[month]} ${year}</h3>
            
            <div class="report-summary">
                <div class="report-card">
                    <h4>Total Revenue</h4>
                    <div class="value">₹${totalRevenue}</div>
                    <div class="subvalue">Avg Daily: ₹${Math.round(averageDailyRevenue)}</div>
                </div>
                <div class="report-card">
                    <h4>Total Orders</h4>
                    <div class="value">${totalOrders}</div>
                    <div class="subvalue">Avg Daily: ${Math.round(totalOrders / daysInMonth)}</div>
                </div>
                <div class="report-card">
                    <h4>Average Order</h4>
                    <div class="value">₹${Math.round(averageOrderValue)}</div>
                </div>
                <div class="report-card">
                    <h4>Best Day</h4>
                    <div class="value">${this.getBestDay(dailyBreakdown)}</div>
                </div>
            </div>

            <div class="report-section">
                <h4>Top Selling Items</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${popularItems.map(([name, count]) => {
            const itemRevenue = this.calculateItemRevenue(orders, name);
            return `
                                <tr>
                                    <td>${name}</td>
                                    <td>${count}</td>
                                    <td>₹${itemRevenue}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="report-section">
                <h4>Daily Performance</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(dailyBreakdown)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([day, data]) => `
                                <tr>
                                    <td>${day}/${month + 1}/${year}</td>
                                    <td>${data.orders}</td>
                                    <td>₹${data.revenue}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateAnnualReport() {
        const yearSelect = document.getElementById('annual-year');
        const reportContent = document.getElementById('annual-report-content');

        if (!yearSelect || !reportContent) return;

        const selectedYear = yearSelect.value;
        if (!selectedYear) {
            alert('Please select a year');
            return;
        }

        const filteredOrders = this.orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate.getFullYear() === parseInt(selectedYear);
        });

        this.renderAnnualReport(filteredOrders, parseInt(selectedYear), reportContent);
    }

    renderAnnualReport(orders, year, container) {
        if (orders.length === 0) {
            container.innerHTML = `<div class="no-data-report">No orders found for ${year}</div>`;
            return;
        }

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalRevenue / totalOrders;

        // Calculate monthly breakdown
        const monthlyBreakdown = {};
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        orders.forEach(order => {
            const month = new Date(order.timestamp).getMonth();
            const monthName = monthNames[month];
            if (!monthlyBreakdown[monthName]) {
                monthlyBreakdown[monthName] = { orders: 0, revenue: 0 };
            }
            monthlyBreakdown[monthName].orders++;
            monthlyBreakdown[monthName].revenue += order.total;
        });

        // Calculate popular items
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const popularItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const averageMonthlyRevenue = totalRevenue / 12;

        container.innerHTML = `
            <h3>Annual Sales Report - ${year}</h3>
            
            <div class="report-summary">
                <div class="report-card">
                    <h4>Total Revenue</h4>
                    <div class="value">₹${totalRevenue}</div>
                    <div class="subvalue">Avg Monthly: ₹${Math.round(averageMonthlyRevenue)}</div>
                </div>
                <div class="report-card">
                    <h4>Total Orders</h4>
                    <div class="value">${totalOrders}</div>
                    <div class="subvalue">Avg Monthly: ${Math.round(totalOrders / 12)}</div>
                </div>
                <div class="report-card">
                    <h4>Average Order</h4>
                    <div class="value">₹${Math.round(averageOrderValue)}</div>
                </div>
                <div class="report-card">
                    <h4>Best Month</h4>
                    <div class="value">${this.getBestMonth(monthlyBreakdown)}</div>
                </div>
            </div>

            <div class="report-section">
                <h4>Top Selling Items (${year})</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${popularItems.map(([name, count]) => {
            const itemRevenue = this.calculateItemRevenue(orders, name);
            return `
                                <tr>
                                    <td>${name}</td>
                                    <td>${count}</td>
                                    <td>₹${itemRevenue}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="report-section">
                <h4>Monthly Performance</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Orders</th>
                            <th>Revenue</th>
                            <th>Growth</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthNames.map((monthName, index) => {
            const data = monthlyBreakdown[monthName] || { orders: 0, revenue: 0 };
            const prevMonthData = index > 0 ? (monthlyBreakdown[monthNames[index - 1]] || { revenue: 0 }) : { revenue: 0 };
            const growth = prevMonthData.revenue > 0 ?
                Math.round(((data.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100) : 0;

            return `
                                <tr>
                                    <td>${monthName}</td>
                                    <td>${data.orders}</td>
                                    <td>₹${data.revenue}</td>
                                    <td>${growth > 0 ? '+' : ''}${growth}%</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Helper methods
    getPeakHour(hourlyBreakdown) {
        let maxRevenue = 0;
        let peakHour = 'N/A';

        Object.entries(hourlyBreakdown).forEach(([hour, data]) => {
            if (data.revenue > maxRevenue) {
                maxRevenue = data.revenue;
                peakHour = hour;
            }
        });

        return peakHour;
    }

    getBestDay(dailyBreakdown) {
        let maxRevenue = 0;
        let bestDay = 'N/A';

        Object.entries(dailyBreakdown).forEach(([day, data]) => {
            if (data.revenue > maxRevenue) {
                maxRevenue = data.revenue;
                bestDay = day;
            }
        });

        return bestDay;
    }

    getBestMonth(monthlyBreakdown) {
        let maxRevenue = 0;
        let bestMonth = 'N/A';

        Object.entries(monthlyBreakdown).forEach(([month, data]) => {
            if (data.revenue > maxRevenue) {
                maxRevenue = data.revenue;
                bestMonth = month;
            }
        });

        return bestMonth;
    }

    calculateItemRevenue(orders, itemName) {
        let revenue = 0;
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.name === itemName) {
                    revenue += item.priceAtTime * item.quantity;
                }
            });
        });
        return revenue;
    }
}
// Menu Management Component
class MenuManagementComponent {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.menuItems = [];
        this.editingItem = null;
    }

    init() {
        this.loadMenuItems();
        this.setupEventListeners();
        this.render();
    }

    loadMenuItems() {
        this.menuItems = this.dataManager.loadMenuItems();
    }

    setupEventListeners() {
        document.getElementById('add-new-item-btn')?.addEventListener('click', () => {
            this.showItemModal();
        });

        document.getElementById('item-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });
    }

    render() {
        const container = document.getElementById('menu-manage-grid');
        if (!container) return;

        container.innerHTML = this.menuItems.map(item => `
            <div class="menu-manage-item" data-id="${item.id}">
                ${!item.available ? '<div class="unavailable-badge">Unavailable</div>' : ''}
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x300/FFD700/2C2C2C?text=${encodeURIComponent(item.name)}'">
                <div class="category">${item.category}</div>
                <h3>${item.name}</h3>
                <div class="price">₹${item.price}</div>
                <p class="description">${item.description}</p>
                <div class="menu-manage-actions">
                    <button class="btn btn-secondary edit-btn" onclick="window.menuManagementComponent.editItem('${item.id}')">Edit</button>
                    <button class="btn btn-danger delete-btn" onclick="window.menuManagementComponent.deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    showItemModal(item = null) {
        this.editingItem = item;
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-modal-title');
        const form = document.getElementById('item-form');

        if (!modal || !form) return;

        title.textContent = item ? 'Edit Menu Item' : 'Add Menu Item';

        if (item) {
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-price').value = item.price;
            document.getElementById('item-description').value = item.description;
            document.getElementById('item-category').value = item.category;
            document.getElementById('item-image').value = item.image;
            document.getElementById('item-available').checked = item.available;
        } else {
            form.reset();
            document.getElementById('item-available').checked = true;
        }

        modal.style.display = 'block';
    }

    editItem(itemId) {
        const item = this.menuItems.find(i => i.id === itemId);
        if (item) {
            this.showItemModal(item);
        }
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            const success = await this.dataManager.deleteMenuItem(itemId);
            if (success) {
                this.menuItems = this.menuItems.filter(item => item.id !== itemId);
                this.render();

                // Refresh menu component
                if (window.menuComponent) {
                    window.menuComponent.refresh();
                }
            } else {
                alert('Failed to delete item from database.');
            }
        }
    }

    async saveItem() {
        const itemData = {
            id: this.editingItem ? this.editingItem.id : this.dataManager.generateId(),
            name: document.getElementById('item-name').value,
            price: parseInt(document.getElementById('item-price').value),
            description: document.getElementById('item-description').value,
            category: document.getElementById('item-category').value,
            image: document.getElementById('item-image').value || `https://via.placeholder.com/400x300/FFD700/2C2C2C?text=${encodeURIComponent(document.getElementById('item-name').value)}`,
            available: document.getElementById('item-available').checked,
            createdAt: this.editingItem ? this.editingItem.createdAt : Date.now()
        };

        const success = await this.dataManager.saveMenuItem(itemData);
        if (success) {
            if (this.editingItem) {
                // Update existing item in local cache
                const index = this.menuItems.findIndex(item => item.id === this.editingItem.id);
                if (index !== -1) {
                    this.menuItems[index] = itemData;
                }
            } else {
                // Add new item to local cache
                this.menuItems.push(itemData);
            }

            this.render();

            // Refresh menu component
            if (window.menuComponent) {
                window.menuComponent.refresh();
            }

            // Close modal
            document.getElementById('item-modal').style.display = 'none';
            this.editingItem = null;
        } else {
            alert('Failed to save item to database.');
        }
    }
}

// Global functions for modal management
function closeItemModal() {
    document.getElementById('item-modal').style.display = 'none';
}