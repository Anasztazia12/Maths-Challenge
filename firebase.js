import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAc8wfh2Ps4ayv52Furp--ZBdvVaV9K3RE",
    authDomain: "maths-challenge-23693.firebaseapp.com",
    projectId: "maths-challenge-23693",
    storageBucket: "maths-challenge-23693.firebasestorage.app",
    messagingSenderId: "406061577561",
    appId: "1:406061577561:web:f70b8f89529743e3e34848",
    measurementId: "G-SQXN2TCNLM"
};

function hasPlaceholderConfig(config) {
    return Object.values(config).some((value) => String(value).startsWith("REPLACE_WITH_"));
}

let app = null;
let auth = null;
let db = null;
let firebaseReady = false;

if (!hasPlaceholderConfig(firebaseConfig)) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        firebaseReady = true;
    } catch (error) {
        console.error("Firebase initialization failed.", error);
    }
} else {
    console.warn("Firebase is not configured yet. Fill values in firebase.js before using auth/database.");
}

export { app, auth, db, firebaseReady };
