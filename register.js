import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, firebaseReady } from "./firebase.js";

const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const registerBtn = document.getElementById("auth-register-btn");
const loginBtn = document.getElementById("auth-login-btn");
const logoutBtn = document.getElementById("auth-logout-btn");
const statusEl = document.getElementById("auth-status");
const userLabelEl = document.getElementById("auth-user-label");

function hasAuthUi() {
    return Boolean(emailInput && passwordInput && registerBtn && loginBtn && logoutBtn && statusEl && userLabelEl);
}

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.innerText = message || "";
    statusEl.style.color = isError ? "#fecaca" : "#fde68a";
}

function setBusy(isBusy) {
    if (!registerBtn || !loginBtn || !logoutBtn) return;
    registerBtn.disabled = isBusy;
    loginBtn.disabled = isBusy;
    if (!auth?.currentUser) logoutBtn.disabled = true;
}

function getCredentials() {
    const email = (emailInput?.value || "").trim();
    const password = String(passwordInput?.value || "").trim();
    return { email, password };
}

async function upsertUserProfile(user, email) {
    if (!firebaseReady || !db || !user) return;

    await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        {
            email,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
}

async function handleRegister() {
    if (!firebaseReady || !auth || !db) {
        setStatus("Firebase config missing in firebase.js", true);
        return;
    }

    const { email, password } = getCredentials();
    if (!email || !password) {
        setStatus("Email and password are required.", true);
        return;
    }
    if (password.length < 6) {
        setStatus("Password must be at least 6 characters.", true);
        return;
    }

    try {
        setBusy(true);
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(
            doc(db, "users", cred.user.uid, "profile", "main"),
            {
                email,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            },
            { merge: true }
        );

        setStatus("Registration successful.");
        if (passwordInput) passwordInput.value = "";
    } catch (error) {
        setStatus(error?.message || "Registration failed.", true);
    } finally {
        setBusy(false);
    }
}

async function handleLogin() {
    if (!firebaseReady || !auth || !db) {
        setStatus("Firebase config missing in firebase.js", true);
        return;
    }

    const { email, password } = getCredentials();
    if (!email || !password) {
        setStatus("Email and password are required.", true);
        return;
    }

    try {
        setBusy(true);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await upsertUserProfile(cred.user, email);
        setStatus("Login successful.");
        if (passwordInput) passwordInput.value = "";
    } catch (error) {
        setStatus(error?.message || "Login failed.", true);
    } finally {
        setBusy(false);
    }
}

async function handleLogout() {
    if (!firebaseReady || !auth) {
        setStatus("Firebase config missing in firebase.js", true);
        return;
    }

    try {
        setBusy(true);
        await signOut(auth);
        setStatus("Logged out.");
    } catch (error) {
        setStatus(error?.message || "Logout failed.", true);
    } finally {
        setBusy(false);
    }
}

if (hasAuthUi()) {
    registerBtn.addEventListener("click", handleRegister);
    loginBtn.addEventListener("click", handleLogin);
    logoutBtn.addEventListener("click", handleLogout);

    if (!firebaseReady || !auth) {
        setStatus("Set up firebase.js first (apiKey, projectId, appId...).", true);
        registerBtn.disabled = true;
        loginBtn.disabled = true;
        logoutBtn.disabled = true;
    } else {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                userLabelEl.innerText = "Not signed in";
                logoutBtn.disabled = true;
                return;
            }

            userLabelEl.innerText = `Signed in: ${user.email || user.uid}`;
            logoutBtn.disabled = false;
        });
    }
}
