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

function isLocalEnvironment() {
    const host = window.location.hostname || "";
    const protocol = window.location.protocol || "";
    return protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function tryLoadModuleConfig(path) {
    try {
        const response = await fetch(path, {
            method: "HEAD",
            cache: "no-store"
        });
        if (!response.ok) return null;

        const configModule = await import(path);
        return configModule.firebaseConfig ?? configModule.default ?? null;
    } catch (error) {
        return null;
    }
}

async function loadFirebaseConfig() {
    const runtimeConfig = window.__FIREBASE_CONFIG__ ?? null;
    if (runtimeConfig) return runtimeConfig;

    const publicConfig = await tryLoadModuleConfig("./firebase.public.js");
    if (publicConfig) return publicConfig;

    if (!isLocalEnvironment()) return null;
    return await tryLoadModuleConfig("./firebase.local.js");
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
}

export { app, auth, db, firebaseReady };
