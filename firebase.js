import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "REPLACE_WITH_API_KEY",
    authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
    projectId: "REPLACE_WITH_PROJECT_ID",
    storageBucket: "REPLACE_WITH_PROJECT_ID.appspot.com",
    messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_APP_ID"
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
