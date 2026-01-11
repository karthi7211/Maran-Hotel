import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check Session
if (sessionStorage.getItem('userRole') !== 'waiter') {
    window.location.href = 'login.html';
}

const TOTAL_TABLES = 20;

class WaiterApp {
    constructor() {
        this.currentTableId = null;
        this.currentTab = 'notepad';
        // localCarts: { "T1": [{id, name, price, qty}], "T2": [] }
        this.localCarts = JSON.parse(localStorage.getItem('waiter_carts') || '{}');
        this.menuItems = [];

        // DOM Elements
        this.notepadView = document.getElementById('notepad-view');
        this.tablesView = document.getElementById('tables-view');
        this.tableSelector = document.getElementById('table-selector');
        this.tablesGrid = document.getElementById('tables-grid');
        this.title = document.getElementById('active-table-title');

        // New DOM Elements
        this.menuGrid = document.getElementById('waiter-menu-grid');
        this.cartList = document.getElementById('waiter-cart-list');
        this.cartTotal = document.getElementById('cart-total-display');
    }

    async init() {
        console.log("Waiter App 3.0 (Cart) Initialized");
        this.renderTableSelector();
        this.subscribeToTables();
        await this.loadMenu();
    }

    // --- Logout ---
    logout() {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }

    // --- Navigation ---
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update Views
        if (tabName === 'notepad') {
            this.notepadView.classList.add('active');
            this.tablesView.classList.remove('active');
        } else {
            this.notepadView.classList.remove('active');
            this.tablesView.classList.add('active');
        }

        // Update Nav Icons
        document.querySelectorAll('.nav-item').forEach(el => {
            if (el.innerText.toLowerCase().includes(tabName)) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    // --- Menu & Cart Logic ---
    async loadMenu() {
        try {
            const snapshot = await getDocs(collection(db, "menu"));
            this.menuItems = [];
            snapshot.forEach(doc => this.menuItems.push(doc.data()));
            this.renderMenu();
        } catch (e) {
            console.error("Error loading menu:", e);
            this.menuGrid.innerHTML = '<p style="color:red">Failed to load menu</p>';
        }
    }

    renderMenu() {
        if (this.menuItems.length === 0) {
            this.menuGrid.innerHTML = '<p style="color:#666">No menu items found.</p>';
            return;
        }

        this.menuGrid.innerHTML = this.menuItems.map(item => `
            <button class="menu-btn" onclick="window.waiterApp.addToCart('${item.id}')">
                <span>${item.name}</span>
                <small>₹${item.price}</small>
            </button>
        `).join('');
    }

    renderTableSelector() {
        // Create chips for all 20 tables
        let html = '';
        for (let i = 1; i <= TOTAL_TABLES; i++) {
            const id = `T${i}`;
            const cart = this.localCarts[id] || [];
            const hasItems = cart.length > 0;

            html += `
                <div class="table-chip ${hasItems ? 'has-items' : ''}" 
                     id="chip-${id}"
                     onclick="window.waiterApp.selectTable('${id}')">
                    Table ${i}
                </div>
            `;
        }
        this.tableSelector.innerHTML = html;
    }

    selectTable(tableId) {
        this.currentTableId = tableId;
        this.title.textContent = `Table ${tableId.replace('T', '')} Order`;

        // Update UI Chips
        document.querySelectorAll('.table-chip').forEach(c => c.classList.remove('active'));
        document.getElementById(`chip-${tableId}`).classList.add('active');

        this.renderCart();
    }

    addToCart(itemId) {
        if (!this.currentTableId) {
            alert("Select a table first!");
            return;
        }

        const item = this.menuItems.find(i => i.id === itemId);
        if (!item) return;

        // Initialize cart for table if not exists
        if (!this.localCarts[this.currentTableId]) {
            this.localCarts[this.currentTableId] = [];
        }

        const cart = this.localCarts[this.currentTableId];
        const existingItem = cart.find(i => i.id === itemId);

        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ ...item, qty: 1 });
        }

        this.saveCarts();
        this.renderCart();

        if (navigator.vibrate) navigator.vibrate(50);
    }

    updateQty(itemId, change) {
        if (!this.currentTableId) return;
        const cart = this.localCarts[this.currentTableId];
        if (!cart) return;

        const itemIndex = cart.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
            cart[itemIndex].qty += change;
            if (cart[itemIndex].qty <= 0) {
                cart.splice(itemIndex, 1);
            }
        }

        this.saveCarts();
        this.renderCart();
    }

    clearCurrentCart() {
        if (!this.currentTableId) return;
        if (!confirm(`Clear orders for Table ${this.currentTableId.replace('T', '')}?`)) return;

        delete this.localCarts[this.currentTableId];
        this.saveCarts();
        this.renderCart();
    }

    saveCarts() {
        localStorage.setItem('waiter_carts', JSON.stringify(this.localCarts));
        this.renderTableSelector(); // Update chips
    }

    renderCart() {
        if (!this.currentTableId) {
            this.cartList.innerHTML = '<div class="empty-state">Select a table</div>';
            this.cartTotal.innerText = '₹0';
            return;
        }

        const cart = this.localCarts[this.currentTableId] || [];

        if (cart.length === 0) {
            this.cartList.innerHTML = '<div class="empty-state">Cart is empty</div>';
            this.cartTotal.innerText = '₹0';
            return;
        }

        let total = 0;
        this.cartList.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            return `
            <div class="cart-item-row">
                <div class="cart-item-name">
                    ${item.name}<br>
                    <small style="font-weight:normal; color:#aaa">₹${item.price} x ${item.qty}</small>
                </div>
                <div class="cart-controls">
                    <button class="qty-btn" onclick="window.waiterApp.updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="window.waiterApp.updateQty('${item.id}', 1)">+</button>
                </div>
            </div>
            `;
        }).join('');

        this.cartTotal.innerText = `₹${total}`;
    }

    // --- Table Status Logic (Firebase) ---
    subscribeToTables() {
        const q = query(collection(db, "tables"), orderBy("id"));

        onSnapshot(q, (snapshot) => {
            const tables = [];
            snapshot.forEach((doc) => tables.push(doc.data()));

            // Check if we need to seed 20 tables (if db has fewer)
            if (tables.length < TOTAL_TABLES) {
                this.seedTables();
            } else {
                this.renderTablesGrid(tables);
            }
        });
    }

    renderTablesGrid(tables) {
        // Ensure we sort by ID number not string (T1, T10, T2...)
        tables.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        // Only do full render if grid is empty (first time)
        if (this.tablesGrid.children.length === 0) {
            this.tablesGrid.innerHTML = tables.map(table => `
                <div class="table-unit ${table.status}" data-table-id="${table.id}" onclick="window.waiterApp.toggleTable('${table.id}', '${table.status}')">
                    <h3>${table.id.replace('T', '')}</h3>
                    <span>${table.status === 'occupied' ? 'Busy' : 'Free'}</span>
                </div>
            `).join('');
        } else {
            // Update only changed tables
            tables.forEach(table => {
                const tableEl = this.tablesGrid.querySelector(`[data-table-id="${table.id}"]`);
                if (tableEl) {
                    // Only update if status changed
                    if (!tableEl.classList.contains(table.status)) {
                        // Remove old status class
                        tableEl.classList.remove('available', 'occupied');
                        // Add new status class
                        tableEl.classList.add(table.status);
                        // Update text
                        tableEl.querySelector('span').textContent = table.status === 'occupied' ? 'Busy' : 'Free';
                        // Update onclick
                        tableEl.setAttribute('onclick', `window.waiterApp.toggleTable('${table.id}', '${table.status}')`);
                    }
                }
            });
        }
    }

    async toggleTable(tableId, currentStatus) {
        const newStatus = currentStatus === 'available' ? 'occupied' : 'available';
        try {
            await updateDoc(doc(db, "tables", tableId), {
                status: newStatus,
                lastUpdated: serverTimestamp()
            });
            if (navigator.vibrate) navigator.vibrate(50);
        } catch (e) {
            console.error(e);
            alert("Connection Error");
        }
    }

    async seedTables() {
        console.log("Seeding 20 tables...");
        for (let i = 1; i <= TOTAL_TABLES; i++) {
            const id = `T${i}`;
            // Use setDoc with merge to avoid overwriting existing real data
            await setDoc(doc(db, "tables", id), {
                id: id,
                label: `Table ${i}`,
                status: 'available', // Resetting status might be annoying if live, but ok for seeding
                capacity: 4
            }, { merge: true });
        }
    }
}

// Initialize
const app = new WaiterApp();
window.waiterApp = app; // Expose for HTML onclicks
app.init();
