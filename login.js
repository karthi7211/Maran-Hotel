import { app, db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Static credentials for Admin and Waiter
const ADMIN_CREDENTIALS = {
    id: 'admin',
    password: 'admin123'
};

const WAITER_CREDENTIALS = {
    id: 'waiter',
    password: 'waiter123'
};

// Initialize Firebase Auth with app instance
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Temporary storage for Google user during registration
let tempGoogleUser = null;

// Role selection
let currentRole = 'admin';

window.selectRole = function (role) {
    currentRole = role;

    // Update button states
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.role-btn').classList.add('active');

    // Hide all forms
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(`${role}-form`).classList.add('active');

    // Clear error
    hideError();
}

// Admin Login
window.handleAdminLogin = function (event) {
    event.preventDefault();

    const adminId = document.getElementById('admin-id').value;
    const password = document.getElementById('admin-password').value;

    if (adminId === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('userId', adminId);
        showLoadingAndRedirect('admin', 'index.html');
    } else {
        showError('Invalid admin credentials. Please try again.');
    }
}

// Waiter Login
window.handleWaiterLogin = function (event) {
    event.preventDefault();

    const waiterId = document.getElementById('waiter-id').value;
    const password = document.getElementById('waiter-password').value;

    if (waiterId === WAITER_CREDENTIALS.id && password === WAITER_CREDENTIALS.password) {
        sessionStorage.setItem('userRole', 'waiter');
        sessionStorage.setItem('userId', waiterId);
        showLoadingAndRedirect('waiter', 'waiter.html');
    } else {
        showError('Invalid waiter credentials. Please try again.');
    }
}

// Customer Login with Email/Password
window.handleCustomerLogin = async function (event) {
    event.preventDefault();

    const email = document.getElementById('customer-email').value;
    const password = document.getElementById('customer-password').value;

    try {
        // Check if customer exists in database
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showError('No account found with this email. Please register first.');
            return;
        }

        // Get customer data
        const customerDoc = querySnapshot.docs[0];
        const customerData = customerDoc.data();

        // Check password
        if (customerData.password !== password) {
            showError('Incorrect password. Please try again.');
            return;
        }

        // Login successful
        sessionStorage.setItem('userRole', 'customer');
        sessionStorage.setItem('userId', customerData.uid);
        sessionStorage.setItem('userName', customerData.name);
        sessionStorage.setItem('userEmail', customerData.email);

        showLoadingAndRedirect('customer', 'customer.html');

    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
}

// Google Registration (Step 1: Get email from Google)
window.handleGoogleRegister = async function () {
    try {
        console.log('Starting Google registration...');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        console.log('Google auth successful:', user.email);

        // Check if user already exists
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            showError('Account already exists. Please use email/password login.');
            return;
        }

        // Store user temporarily and show password setup modal
        tempGoogleUser = user;
        showPasswordModal();

    } catch (error) {
        console.error('Google registration error:', error);

        let errorMessage = 'Registration failed. ';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage += 'Popup was closed before completing sign in.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage += 'Popup was blocked by browser. Please allow popups.';
        } else {
            errorMessage += error.message;
        }

        showError(errorMessage);
    }
}

// Password Setup (Step 2: Set password after Google auth)
window.handlePasswordSetup = async function (event) {
    event.preventDefault();

    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    try {
        // Save customer to database with password
        await addDoc(collection(db, 'customers'), {
            uid: tempGoogleUser.uid,
            name: tempGoogleUser.displayName,
            email: tempGoogleUser.email,
            photoURL: tempGoogleUser.photoURL,
            password: password, // In production, this should be hashed!
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        console.log('Customer registered successfully:', tempGoogleUser.email);

        // Login the user
        sessionStorage.setItem('userRole', 'customer');
        sessionStorage.setItem('userId', tempGoogleUser.uid);
        sessionStorage.setItem('userName', tempGoogleUser.displayName);
        sessionStorage.setItem('userEmail', tempGoogleUser.email);

        // Redirect to customer page with loading
        showLoadingAndRedirect('customer', 'customer.html');

    } catch (error) {
        console.error('Error saving customer:', error);
        showError('Registration failed. Please try again.');
    }
}

// Loading Overlay Logic
function showLoadingAndRedirect(role, url) {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const subtext = document.querySelector('.loading-subtext');

    if (role === 'customer') {
        loadingText.textContent = "Setting your table...";
        subtext.textContent = "Your food is getting ready...";
    } else if (role === 'waiter') {
        loadingText.textContent = "Preparing your station...";
        subtext.textContent = "Getting the menu ready...";
    } else {
        loadingText.textContent = "Accessing Dashboard...";
        subtext.textContent = "Loading administrative tools...";
    }

    overlay.classList.add('show');

    // Simulate loading for 3 seconds before redirect
    setTimeout(() => {
        window.location.href = url;
    }, 3000);
}

// Error Message Functions
function showError(message) {
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
}

function hideError() {
    document.getElementById('error-message').classList.remove('show');
}

function showPasswordModal() {
    document.getElementById('password-modal').classList.add('show');
}

function hidePasswordModal() {
    document.getElementById('password-modal').classList.remove('show');
}

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const userRole = sessionStorage.getItem('userRole');

    if (userRole === 'admin') {
        window.location.href = 'index.html';
    } else if (userRole === 'waiter') {
        window.location.href = 'waiter.html';
    } else if (userRole === 'customer') {
        window.location.href = 'customer.html';
    }
});
