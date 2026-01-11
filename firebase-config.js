import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC7-vsnCxYKXD5EXLJc5gufrA7sR4oJFmA",
    authDomain: "maaran-hotel.firebaseapp.com",
    projectId: "maaran-hotel",
    storageBucket: "maaran-hotel.firebasestorage.app",
    messagingSenderId: "298177368070",
    appId: "1:298177368070:web:fb634baa11211023a97387",
    measurementId: "G-8DZ7CPXSMX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };