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
const guestBtn = document.getElementById("auth-guest-btn");
const logoutBtn = document.getElementById("auth-logout-btn");
const statusEl = document.getElementById("auth-status");
const userLabelEl = document.getElementById("auth-user-label");
const startPanelEl = document.getElementById("start-panel");
const menuPanelEl = document.getElementById("menu-panel");

function hasAuthUi() {
    return Boolean(emailInput && passwordInput && registerBtn && loginBtn && guestBtn && logoutBtn && statusEl && userLabelEl);
}

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.innerText = message || "";
    statusEl.style.color = isError ? "#fecaca" : "#fde68a";
}

function setBusy(isBusy) {
    if (!registerBtn || !loginBtn || !guestBtn || !logoutBtn) return;
    registerBtn.disabled = isBusy;
    loginBtn.disabled = isBusy;
    guestBtn.disabled = isBusy;
    if (!auth?.currentUser) logoutBtn.disabled = true;
}

function setSessionMode(mode) {
    localStorage.setItem("mathsSessionMode", mode);
}

function clearSessionMode() {
    localStorage.removeItem("mathsSessionMode");
}

function showStartPanel() {
    startPanelEl?.classList.remove("hidden");
    menuPanelEl?.classList.add("hidden");
    if (logoutBtn) logoutBtn.disabled = true;
}

function showMenuPanel() {
    startPanelEl?.classList.add("hidden");
    menuPanelEl?.classList.remove("hidden");
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
        setSessionMode("auth");
        showMenuPanel();
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
        setSessionMode("auth");
        showMenuPanel();
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
        clearSessionMode();
        showStartPanel();
        setStatus("Logged out.");
    } catch (error) {
        setStatus(error?.message || "Logout failed.", true);
    } finally {
        setBusy(false);
    }
}

function handleGuestMode() {
    clearSessionMode();
    setSessionMode("guest");
    setStatus("Guest mode enabled. Your progress stays on this device.");
    if (logoutBtn) logoutBtn.disabled = false;
    showMenuPanel();
}

if (hasAuthUi()) {
    registerBtn.addEventListener("click", handleRegister);
    loginBtn.addEventListener("click", handleLogin);
    guestBtn.addEventListener("click", handleGuestMode);
    logoutBtn.addEventListener("click", handleLogout);

    if (!firebaseReady || !auth) {
        setStatus("Set up firebase.js first (apiKey, projectId, appId...).", true);
        registerBtn.disabled = true;
        loginBtn.disabled = true;
        guestBtn.disabled = false;
        logoutBtn.disabled = true;
        showStartPanel();
    } else {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                userLabelEl.innerText = "Not signed in";
                logoutBtn.disabled = true;
                if (getSessionMode() === "guest") {
                    showMenuPanel();
                } else if (getSessionMode() === "auth") {
                    showMenuPanel();
                } else {
                    showStartPanel();
                }
                return;
            }

            userLabelEl.innerText = `Signed in: ${user.email || user.uid}`;
            setSessionMode("auth");
            logoutBtn.disabled = false;
            showMenuPanel();
        });

        if (getSessionMode() === "guest") {
            showMenuPanel();
        } else if (getSessionMode() !== "auth") {
            showStartPanel();
        }
    }
}
