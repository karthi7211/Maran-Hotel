import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check Session
if (sessionStorage.getItem('userRole') !== 'customer') {
    window.location.href = 'login.html';
}

const tablesGrid = document.getElementById('customer-tables-grid');
const menuGrid = document.getElementById('customer-menu-grid');

// --- Initialization ---
async function init() {
    console.log("Customer View Initialized");
    subscribeToTables();
    loadMenu(); // Ideally this subscribes too, but simple fetch is okay for now
}

// --- Live Table Status ---
function subscribeToTables() {
    const q = query(collection(db, "tables"), orderBy("id"));

    onSnapshot(q, (snapshot) => {
        const tables = [];
        snapshot.forEach((doc) => {
            tables.push(doc.data());
        });

        // Sort numerically (T1, T2, ... T10)
        tables.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        if (tables.length === 0) {
            tablesGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">System is connecting...</p>';
        } else {
            renderTables(tables);
        }
    });
}

function renderTables(tables) {
    tablesGrid.innerHTML = tables.map(table => `
        <div class="table-card ${table.status}">
            <h3>${table.id.replace('T', '')}</h3>
            <p class="status">${table.status === 'occupied' ? 'Occupied' : 'Available'}</p>
        </div>
    `).join('');
}

// --- Menu Display ---
async function loadMenu() {
    try {
        const menuSnapshot = await getDocs(collection(db, "menu"));
        const menuItems = [];
        menuSnapshot.forEach(doc => menuItems.push(doc.data()));

        if (menuItems.length > 0) {
            renderMenu(menuItems);
        } else {
            // Fallback if DB is empty
            menuGrid.innerHTML = '<p class="empty-state">Menu is being updated...</p>';
        }
    } catch (e) {
        console.error("Error loading menu:", e);
        menuGrid.innerHTML = '<p class="empty-state">Error loading menu</p>';
    }
}

function renderMenu(items) {
    menuGrid.innerHTML = items.map(item => `
        <div class="menu-card">
            <img src="${item.image || 'https://via.placeholder.com/280x180'}" alt="${item.name}">
            <div class="menu-card-content">
                <span class="category">${item.category || 'Special'}</span>
                <h3>${item.name}</h3>
                <p class="description">${item.description || ''}</p>
                <div class="price">₹${item.price}</div>
            </div>
        </div>
    `).join('');
}

window.handleLogout = function () {
    sessionStorage.clear();
    window.location.href = 'login.html';
};

init();
