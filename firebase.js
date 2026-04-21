import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const placeholderFirebaseConfig = {
    apiKey: "REPLACE_WITH_API_KEY",
    authDomain: "REPLACE_WITH_AUTH_DOMAIN",
    projectId: "REPLACE_WITH_PROJECT_ID",
    storageBucket: "REPLACE_WITH_STORAGE_BUCKET",
    messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_APP_ID",
    measurementId: "REPLACE_WITH_MEASUREMENT_ID"
};

async function loadFirebaseConfig() {
    try {
        const localConfigModule = await import("./firebase.local.js");
        return localConfigModule.firebaseConfig ?? localConfigModule.default ?? null;
    } catch (error) {
        return null;
    }
}

const firebaseConfig = (await loadFirebaseConfig()) ?? placeholderFirebaseConfig;

function hasPlaceholderConfig(config) {
    return !config || Object.values(config).some((value) => String(value).startsWith("REPLACE_WITH_"));
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
    console.warn("Firebase is not configured yet. Create firebase.local.js from firebase.local.example.js before using auth/database.");
}

export { app, auth, db, firebaseReady };
