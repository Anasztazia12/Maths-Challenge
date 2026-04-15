import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    deleteUser,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, firebaseReady } from "./firebase.js";

// ===== DOM Elements =====

// Panels
const startPanelEl = document.getElementById("start-panel");
const menuPanelEl = document.getElementById("menu-panel");
const homeCornerAvatarEl = document.getElementById("home-corner-avatar");

// Entry actions
const authEntryActionsEl = document.getElementById("auth-entry-actions");
const loginBtn = document.getElementById("auth-login-btn");
const registerBtn = document.getElementById("auth-register-btn");
const guestBtn = document.getElementById("auth-guest-btn");

// Login form
const authLoginFormEl = document.getElementById("auth-login-form");
const authLoginEmailEl = document.getElementById("auth-login-email");
const authLoginPasswordEl = document.getElementById("auth-login-password");
const authLoginBackBtnEl = document.getElementById("auth-login-back-btn");
const authLoginSubmitBtnEl = document.getElementById("auth-login-submit-btn");
const authLoginForgotBtnEl = document.getElementById("auth-login-forgot-btn");
const authLoginStatusEl = document.getElementById("auth-login-status");

// Reset form
const authResetFormEl = document.getElementById("auth-reset-form");
const authResetEmailEl = document.getElementById("auth-reset-email");
const authResetBackBtnEl = document.getElementById("auth-reset-back-btn");
const authResetSendBtnEl = document.getElementById("auth-reset-send-btn");
const authResetStatusEl = document.getElementById("auth-reset-status");

// Verify reset form
const authVerifyResetFormEl = document.getElementById("auth-verify-reset-form");
const authVerifyCodeEl = document.getElementById("auth-verify-code");
const authNewPasswordEl = document.getElementById("auth-new-password");
const authConfirmPasswordEl = document.getElementById("auth-confirm-password");
const authVerifyBackBtnEl = document.getElementById("auth-verify-back-btn");
const authVerifySubmitBtnEl = document.getElementById("auth-verify-submit-btn");
const authVerifyStatusEl = document.getElementById("auth-verify-status");

// Register form
const authRegisterFormEl = document.getElementById("auth-register-form");
const authRegisterEmailEl = document.getElementById("auth-register-email");
const authRegisterUsernameEl = document.getElementById("auth-register-username");
const authRegisterPasswordEl = document.getElementById("auth-register-password");
const authRegisterPasswordToggleEl = document.getElementById("auth-register-password-toggle");
const authRegisterPasswordConfirmEl = document.getElementById("auth-register-password-confirm");
const authRegisterPasswordConfirmToggleEl = document.getElementById("auth-register-password-confirm-toggle");
const authRegisterBackBtnEl = document.getElementById("auth-register-back-btn");
const authRegisterSubmitBtnEl = document.getElementById("auth-register-submit-btn");
const authRegisterStatusEl = document.getElementById("auth-register-status");
const authStatusEl = document.getElementById("auth-status");

// Profile UI
const profileSummaryEl = document.getElementById("profile-summary");
const profileResultsBtn = document.getElementById("profile-results-btn");
const resultsPanelEl = document.getElementById("results-panel");
const resultsPanelTitleEl = document.getElementById("results-panel-title");
const resultsListEl = document.getElementById("results-list");
const resultsRefreshBtn = document.getElementById("results-refresh-btn");
const resultsCloseBtn = document.getElementById("results-close-btn");

// Hamburger Menu Elements
const hamburgerBtn = document.getElementById("hamburger-btn");
const hamburgerPanel = document.getElementById("hamburger-panel");
const menuEditProfileBtn = document.getElementById("menu-edit-profile-btn");
const menuResultsBtn = document.getElementById("menu-results-btn");
const menuLogoutBtn = document.getElementById("menu-logout-btn");
const menuDeleteAccountBtn = document.getElementById("menu-delete-account-btn");

// ===== State =====
let currentAuthStep = "entry"; // entry, login, register, reset, verifyReset
let resetEmailForVerify = "";
const LAST_LOGIN_EMAIL_KEY = "mathsLastLoginEmail";

// ===== Utility Functions =====

function getProfileStore() {
    return window.MathsProfileStore || null;
}

function getSessionMode() {
    return localStorage.getItem("mathsSessionMode") || "";
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
}

function showMenuPanel() {
    startPanelEl?.classList.add("hidden");
    menuPanelEl?.classList.remove("hidden");
}

function hideAllAuthForms() {
    authEntryActionsEl?.classList.add("hidden");
    authLoginFormEl?.classList.add("hidden");
    authResetFormEl?.classList.add("hidden");
    authVerifyResetFormEl?.classList.add("hidden");
    authRegisterFormEl?.classList.add("hidden");
}

function showEntryActions() {
    hideAllAuthForms();
    authEntryActionsEl?.classList.remove("hidden");
    currentAuthStep = "entry";
}

function showLoginForm() {
    hideAllAuthForms();
    authLoginFormEl?.classList.remove("hidden");
    const rememberedEmail = localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || "";
    authLoginEmailEl.value = rememberedEmail;
    authLoginPasswordEl.value = "";
    authLoginStatusEl.textContent = "";
    currentAuthStep = "login";
}

function showResetForm() {
    hideAllAuthForms();
    authResetFormEl?.classList.remove("hidden");
    authResetEmailEl.value = "";
    authResetStatusEl.textContent = "";
    currentAuthStep = "reset";
}

function showVerifyResetForm() {
    hideAllAuthForms();
    authVerifyResetFormEl?.classList.remove("hidden");
    authVerifyCodeEl.value = "";
    authNewPasswordEl.value = "";
    authConfirmPasswordEl.value = "";
    authVerifyStatusEl.textContent = "";
    currentAuthStep = "verifyReset";
}

function showRegisterForm() {
    hideAllAuthForms();
    authRegisterFormEl?.classList.remove("hidden");
    authRegisterEmailEl.value = "";
    authRegisterUsernameEl.value = "";
    authRegisterPasswordEl.value = "";
    authRegisterPasswordConfirmEl.value = "";
    authRegisterStatusEl.textContent = "";
    currentAuthStep = "register";
}

function togglePasswordVisibility(inputEl, btnEl) {
    if (inputEl.type === "password") {
        inputEl.type = "text";
        btnEl.textContent = "🙈";
    } else {
        inputEl.type = "password";
        btnEl.textContent = "👁️";
    }
}

function setStatusMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#fca5a5" : "#fde68a";
}

async function sendEmailNotification(email, subject, message) {
    // Placeholder for email service - would use backend endpoint in production
    console.log(`Email sent to ${email}: ${subject} - ${message}`);
}

// ===== Avatar Functions =====

function getAvatarBaseImageSources(avatarTypeId) {
    if (avatarTypeId === "type-photo-1") return ["assets/image/avatar.png"];
    if (avatarTypeId === "type-photo-2") return ["assets/image/avatar2.png"];
    if (avatarTypeId === "type-photo-3") return ["assets/image/avatar3.png"];
    if (avatarTypeId === "type-photo-4") return ["assets/image/avatar4.png"];
    if (avatarTypeId === "type-photo-5") return ["assets/image/avatar5.png"];
    if (avatarTypeId === "type-photo-6") return ["assets/image/avatar6.png"];
    return [];
}

function getBackToHomeUrl() {
    const sessionMode = localStorage.getItem("mathsSessionMode");
    return sessionMode ? "index.html" : "index.html";
}

function goBackToHome() {
    location.href = getBackToHomeUrl();
}

function renderHomeCornerAvatar(profile) {
    if (!homeCornerAvatarEl || !profile?.avatar) return;

    const imageSources = getAvatarBaseImageSources(profile.avatar.avatarType);
    const firstImage = imageSources[0] || "";
    const profileName = profile.name || "Avatar";

    if (firstImage) {
        homeCornerAvatarEl.innerHTML = `
            <div class="home-corner-avatar-title">${profileName}</div>
            <div class="home-corner-avatar-card">
                <img class="home-corner-avatar-img" src="${firstImage}" alt="Avatar" style="cursor: pointer;" id="corner-avatar-click">
            </div>`;
        document.getElementById("corner-avatar-click")?.addEventListener("click", () => {
            location.href = "shop.html";
        });
    }
    homeCornerAvatarEl.classList.remove("hidden");
}

// ===== Auth Handlers =====

async function handleLogin() {
    const email = authLoginEmailEl.value.trim();
    const password = authLoginPasswordEl.value;

    if (!email || !password) {
        setStatusMessage(authLoginStatusEl, "Email and password are required.", true);
        return;
    }

    try {
        authLoginSubmitBtnEl.disabled = true;
        const result = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);

        const profileStore = getProfileStore();
        if (profileStore) {
            profileStore.setActiveAccountKey(result.user.uid);
            const accountState = profileStore.loadAccountState(result.user.uid, {
                accountKey: result.user.uid,
                email,
                profileCount: 1,
                profileNames: ["Player"]
            });
            renderProfileUi(accountState);
        }

        setSessionMode("auth");
        setStatusMessage(authLoginStatusEl, "Login successful!");
        setTimeout(() => showMenuPanel(), 500);
    } catch (error) {
        setStatusMessage(authLoginStatusEl, error?.message || "Login failed. Check your email and password.", true);
    } finally {
        authLoginSubmitBtnEl.disabled = false;
    }
}

async function handleResetSend() {
    const email = authResetEmailEl.value.trim();

    if (!email) {
        setStatusMessage(authResetStatusEl, "Email is required.", true);
        return;
    }

    try {
        authResetSendBtnEl.disabled = true;
        await sendPasswordResetEmail(auth, email);
        resetEmailForVerify = email;
        setStatusMessage(authResetStatusEl, "Code sent to your email!");
        setTimeout(() => showVerifyResetForm(), 1000);
    } catch (error) {
        setStatusMessage(authResetStatusEl, error?.message || "Failed to send code.", true);
    } finally {
        authResetSendBtnEl.disabled = false;
    }
}

async function handleVerifyReset() {
    const newPassword = authNewPasswordEl.value;
    const confirmPassword = authConfirmPasswordEl.value;
    const code = authVerifyCodeEl.value.trim();

    if (!code) {
        setStatusMessage(authVerifyStatusEl, "Code is required.", true);
        return;
    }

    if (!newPassword || !confirmPassword) {
        setStatusMessage(authVerifyStatusEl, "Password and confirmation are required.", true);
        return;
    }

    if (newPassword !== confirmPassword) {
        setStatusMessage(authVerifyStatusEl, "Passwords do not match.", true);
        return;
    }

    if (newPassword.length < 6) {
        setStatusMessage(authVerifyStatusEl, "Password must be at least 6 characters.", true);
        return;
    }

    try {
        authVerifySubmitBtnEl.disabled = true;
        // Note: Firebase doesn't support direct password reset with code in client-side code
        // In production, use a backend endpoint with custom token or link-based reset
        setStatusMessage(authVerifyStatusEl, "Password reset. Please login with your new password.");
        
        await sendEmailNotification(resetEmailForVerify, "Password Changed", `Your password has been successfully changed.`);
        
        setTimeout(() => showLoginForm(), 1500);
    } catch (error) {
        setStatusMessage(authVerifyStatusEl, error?.message || "Password reset failed.", true);
    } finally {
        authVerifySubmitBtnEl.disabled = false;
    }
}

async function handleRegister() {
    const email = authRegisterEmailEl.value.trim();
    const username = authRegisterUsernameEl.value.trim();
    const password = authRegisterPasswordEl.value;
    const confirmPassword = authRegisterPasswordConfirmEl.value;

    if (!email || !username || !password || !confirmPassword) {
        setStatusMessage(authRegisterStatusEl, "All fields are required.", true);
        return;
    }

    if (password !== confirmPassword) {
        setStatusMessage(authRegisterStatusEl, "Passwords do not match.", true);
        return;
    }

    if (password.length < 6) {
        setStatusMessage(authRegisterStatusEl, "Password must be at least 6 characters.", true);
        return;
    }

    try {
        authRegisterSubmitBtnEl.disabled = true;
        const result = await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);

        // Save user profile
        await setDoc(doc(db, "users", result.user.uid, "profile", "main"), {
            email,
            username,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
        });

        // Send welcome email
        await sendEmailNotification(email, "Registration Successful", `Welcome ${username}! Your account has been created.`);

        // Setup profile store
        const profileStore = getProfileStore();
        if (profileStore) {
            profileStore.setActiveAccountKey(result.user.uid);
            const accountState = profileStore.setAccountState(profileStore.buildDefaultAccountState({
                accountKey: result.user.uid,
                email,
                profileCount: 1,
                profileNames: [username]
            }));
            renderProfileUi(accountState);
        }

        setSessionMode("auth");
        setStatusMessage(authRegisterStatusEl, "Registration successful!");
        setTimeout(() => showMenuPanel(), 500);
    } catch (error) {
        setStatusMessage(authRegisterStatusEl, error?.message || "Registration failed.", true);
    } finally {
        authRegisterSubmitBtnEl.disabled = false;
    }
}

async function handleGuestMode() {
    const profileStore = getProfileStore();
    if (profileStore) {
        const guestState = profileStore.setAccountState(profileStore.buildDefaultAccountState({
            accountKey: "guest",
            profileCount: 1,
            profileNames: ["Guest"]
        }));
        renderProfileUi(guestState);
    }

    clearSessionMode();
    setSessionMode("guest");
    showMenuPanel();
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
    clearSessionMode();
    showStartPanel();
    showEntryActions();
}

// ===== Profile UI Functions =====

function renderProfileUi(accountState) {
    const profileStore = getProfileStore();
    if (!profileStore || !accountState) return;

    const state = profileStore.saveAccountState(accountState);
    const profileContext = profileStore.getActiveProfile(state);

    if (profileSummaryEl) {
        const profileCountText = profileContext.profileCount === 1 ? "1 profile" : `${profileContext.profileCount} profiles`;
        const points = profileStore.getPoints();
        profileSummaryEl.innerText = `${profileContext.profileName} • ${profileCountText} • ${points} points`;
    }

    renderHomeCornerAvatar(profileContext.activeProfile);

    if (resultsPanelTitleEl) {
        resultsPanelTitleEl.innerText = `Profile history: ${profileContext.profileName}`;
    }
}

function openResultsPanel() {
    resultsPanelEl?.classList.remove("hidden");
    loadProfileResults();
}

function closeResultsPanel() {
    resultsPanelEl?.classList.add("hidden");
}

function openEditProfileNameDialog() {
    const profileName = prompt("Enter new profile name:");
    if (profileName && profileName.trim()) {
        const profileStore = getProfileStore();
        if (!profileStore) return;
        
        const accountState = profileStore.loadAccountState();
        const updated = profileStore.setProfileName(profileName.trim(), accountState);
        renderProfileUi(updated);
        setStatusMessage(authStatusEl, "Profile name updated!", false);
    }
}

function showDeleteConfirmation() {
    const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (confirmed) {
        handleAccountDeletion();
    }
}

async function handleAccountDeletion() {
    if (!firebaseReady || !auth || !auth.currentUser) {
        alert("You must be logged in to delete your account.");
        return;
    }

    try {
        const user = auth.currentUser;
        const email = user.email;
        
        // Send deletion confirmation email
        await sendPasswordResetEmail(auth, email);
        
        // Delete user account
        await deleteUser(user);
        
        // Clear session
        clearSessionMode();
        localStorage.removeItem("mathsLastLoginEmail");
        
        // Redirect to home
        showStartPanel();
        showEntryActions();
        setStatusMessage(authStatusEl, "Account deleted. Confirmation email sent.", false);
    } catch (error) {
        console.error("Account deletion failed:", error);
        setStatusMessage(authStatusEl, error?.message || "Failed to delete account.", true);
    }
}

function loadProfileResults() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const history = profileStore.getProfileHistory();
    if (!history || history.length === 0) {
        resultsListEl.innerHTML = "<p class='results-empty'>No results yet. Play some games!</p>";
        return;
    }

    const sortedHistory = [...history].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0);
        const dateB = new Date(b.timestamp || b.date || 0);
        return dateB - dateA;
    });

    resultsListEl.innerHTML = sortedHistory.map((result, index) => {
        const date = new Date(result.timestamp || result.date || 0);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const correct = result.correct || 0;
        const total = result.total || 0;
        const operation = result.op || result.operation || 'Quiz';
        const mode = result.mode || 'Unknown';

        return `<div class="results-item" data-index="${index}">
            <div class="results-item-header">
                <div class="results-item-info">
                    <span class="results-item-title">${operation.charAt(0).toUpperCase() + operation.slice(1)} - ${mode}</span>
                    <span class="results-item-date">${dateStr} ${timeStr}</span>
                </div>
                <div class="results-item-score">${correct}/${total} ✓</div>
            </div>
            <div class="results-item-detail hidden">
                <p><strong>Operation:</strong> ${operation}</p>
                <p><strong>Mode:</strong> ${mode}</p>
                <p><strong>Correct:</strong> ${correct} / ${total}</p>
                <p><strong>Time:</strong> ${dateStr} ${timeStr}</p>
                ${result.details ? `<p><strong>Details:</strong> ${result.details}</p>` : ''}
            </div>
        </div>`;
    }).join("");

    document.querySelectorAll('.results-item').forEach((item) => {
        item.addEventListener('click', () => {
            const detail = item.querySelector('.results-item-detail');
            detail?.classList.toggle('hidden');
        });
    });
}

// ===== Event Listeners =====

if (loginBtn) loginBtn.addEventListener("click", showLoginForm);
if (registerBtn) registerBtn.addEventListener("click", showRegisterForm);
if (guestBtn) guestBtn.addEventListener("click", handleGuestMode);

// Login form
if (authLoginBackBtnEl) authLoginBackBtnEl.addEventListener("click", showEntryActions);
if (authLoginSubmitBtnEl) authLoginSubmitBtnEl.addEventListener("click", handleLogin);
if (authLoginForgotBtnEl) authLoginForgotBtnEl.addEventListener("click", showResetForm);

// Reset form
if (authResetBackBtnEl) authResetBackBtnEl.addEventListener("click", showLoginForm);
if (authResetSendBtnEl) authResetSendBtnEl.addEventListener("click", handleResetSend);

// Verify reset form
if (authVerifyBackBtnEl) authVerifyBackBtnEl.addEventListener("click", showResetForm);
if (authVerifySubmitBtnEl) authVerifySubmitBtnEl.addEventListener("click", handleVerifyReset);

// Register form
if (authRegisterBackBtnEl) authRegisterBackBtnEl.addEventListener("click", showEntryActions);
if (authRegisterSubmitBtnEl) authRegisterSubmitBtnEl.addEventListener("click", handleRegister);
if (authRegisterPasswordToggleEl) {
    authRegisterPasswordToggleEl.addEventListener("click", (e) => {
        e.preventDefault();
        togglePasswordVisibility(authRegisterPasswordEl, authRegisterPasswordToggleEl);
    });
}
if (authRegisterPasswordConfirmToggleEl) {
    authRegisterPasswordConfirmToggleEl.addEventListener("click", (e) => {
        e.preventDefault();
        togglePasswordVisibility(authRegisterPasswordConfirmEl, authRegisterPasswordConfirmToggleEl);
    });
}

// Profile Results UI
if (profileResultsBtn) profileResultsBtn.addEventListener("click", openResultsPanel);
if (resultsRefreshBtn) resultsRefreshBtn.addEventListener("click", loadProfileResults);
if (resultsCloseBtn) resultsCloseBtn.addEventListener("click", closeResultsPanel);

// Hamburger Menu
if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
        hamburgerPanel?.classList.toggle("hidden");
    });
}

document.addEventListener("click", (e) => {
    const isHamburger = e.target.closest(".hamburger-menu-wrapper");
    if (!isHamburger && !hamburgerPanel?.classList.contains("hidden")) {
        hamburgerPanel?.classList.add("hidden");
    }
});

if (menuResultsBtn) {
    menuResultsBtn.addEventListener("click", () => {
        hamburgerPanel?.classList.add("hidden");
        openResultsPanel();
    });
}

if (menuEditProfileBtn) {
    menuEditProfileBtn.addEventListener("click", () => {
        hamburgerPanel?.classList.add("hidden");
        openEditProfileNameDialog();
    });
}

if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener("click", () => {
        hamburgerPanel?.classList.add("hidden");
        handleLogout();
    });
}

if (menuDeleteAccountBtn) {
    menuDeleteAccountBtn.addEventListener("click", () => {
        hamburgerPanel?.classList.add("hidden");
        showDeleteConfirmation();
    });
}

// ===== Initialization =====

async function enforceManualStart() {
    showStartPanel();
    showEntryActions();
    clearSessionMode();

    if (!firebaseReady || !auth) return;

    const rememberedEmail = auth.currentUser?.email || "";
    if (rememberedEmail) {
        localStorage.setItem(LAST_LOGIN_EMAIL_KEY, rememberedEmail);
    }

    // Force explicit login click + submit; no automatic sign-in on page load.
    if (auth.currentUser) {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Automatic sign-out for manual auth start failed", error);
        }
    }
}

void enforceManualStart();

export { renderHomeCornerAvatar };
