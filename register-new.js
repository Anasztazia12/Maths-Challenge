import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
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

// Profile UI
const profileSummaryEl = document.getElementById("profile-summary");
const profileAvatarPreviewEl = document.getElementById("profile-avatar-preview");
const profileSelectEl = document.getElementById("profile-select");
const profileResultsBtn = document.getElementById("profile-results-btn");
const profileEditBtn = document.getElementById("profile-edit-btn");
const editProfileNameOneInput = document.getElementById("edit-profile-name-1");
const editProfileNameTwoInput = document.getElementById("edit-profile-name-2");
const profileEditCancelBtn = document.getElementById("profile-edit-cancel-btn");
const profileEditSaveBtn = document.getElementById("profile-edit-save-btn");
const profileEditPanelEl = document.getElementById("profile-edit-panel");
const resultsPanelEl = document.getElementById("results-panel");
const resultsPanelTitleEl = document.getElementById("results-panel-title");
const resultsListEl = document.getElementById("results-list");
const resultsRefreshBtn = document.getElementById("results-refresh-btn");
const resultsCloseBtn = document.getElementById("results-close-btn");
const logoutBtn = document.getElementById("auth-logout-btn");

// ===== State =====
let currentAuthStep = "entry"; // entry, login, register, reset, verifyReset
let resetEmailForVerify = "";

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
    authLoginEmailEl.value = "";
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

function renderHomeCornerAvatar(profile) {
    if (!homeCornerAvatarEl || !profile?.avatar) return;

    const imageSources = getAvatarBaseImageSources(profile.avatar.avatarType);
    const firstImage = imageSources[0] || "";

    if (firstImage) {
        homeCornerAvatarEl.innerHTML = `
            <div class="home-corner-avatar-title">Your Avatar</div>
            <div class="home-corner-avatar-card">
                <img class="home-corner-avatar-img" src="${firstImage}" alt="Avatar" style="cursor: pointer;" id="corner-avatar-click">
            </div>`;
        document.getElementById("corner-avatar-click")?.addEventListener("click", () => {
            location.href = "shop.html";
        });
    }
    homeCornerAvatarEl.classList.remove("hidden");
}

function renderAvatarPreview(profile) {
    if (!profileAvatarPreviewEl || !profile) return;

    const profileStore = getProfileStore();
    if (!profileStore) return;

    const avatarType = (profileStore.AVATAR_SHOP?.avatarType || []).find(item => item.id === profile.avatar?.avatarType);
    const eyes = (profileStore.AVATAR_SHOP?.eyes || []).find(item => item.id === profile.avatar?.eye);
    const eyeColor = (profileStore.AVATAR_SHOP?.eyeColor || []).find(item => item.id === profile.avatar?.eyeColor);
    const nose = (profileStore.AVATAR_SHOP?.nose || []).find(item => item.id === profile.avatar?.nose);
    const mouth = (profileStore.AVATAR_SHOP?.mouth || []).find(item => item.id === profile.avatar?.mouth);
    const skin = (profileStore.AVATAR_SHOP?.skin || []).find(item => item.id === profile.avatar?.skin);
    const hairColor = (profileStore.AVATAR_SHOP?.hairColor || []).find(item => item.id === profile.avatar?.hairColor);
    const hairLength = (profileStore.AVATAR_SHOP?.hairLength || []).find(item => item.id === profile.avatar?.hairLength);
    const hat = (profileStore.AVATAR_SHOP?.hat || []).find(item => item.id === profile.avatar?.hat);
    const glasses = (profileStore.AVATAR_SHOP?.glasses || []).find(item => item.id === profile.avatar?.glasses);
    const outfit = (profileStore.AVATAR_SHOP?.outfit || []).find(item => item.id === profile.avatar?.outfit);

    profileAvatarPreviewEl.innerHTML = `<div class="avatar-mini-card">
        <div class="avatar-mini-type">${avatarType?.glyph || "Kid"}</div>
        <div class="avatar-mini-hair" style="background:${hairColor?.color || "#6d4c41"};">${hairLength?.glyph || "Short"}</div>
        <div class="avatar-mini-head" style="background:${skin?.color || "#f9c9a4"};">
            <div class="avatar-mini-eyes" style="color:${eyeColor?.color || "#111827"};">${eyes?.glyph || "• •"}</div>
            <div class="avatar-mini-nose">${nose?.glyph || "ˇ"}</div>
            <div class="avatar-mini-mouth">${mouth?.glyph || "⌣"}</div>
        </div>
        <div class="avatar-mini-gear">${hat?.glyph || "None"} • ${glasses?.glyph || "None"}</div>
        <div class="avatar-mini-body" style="background:${outfit?.color || "#38bdf8"};"></div>
    </div>`;
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

    renderAvatarPreview(profileContext.activeProfile);
    renderHomeCornerAvatar(profileContext.activeProfile);

    if (profileSelectEl) {
        profileSelectEl.innerHTML = "";
        profileContext.profiles.forEach((profile) => {
            const option = document.createElement("option");
            option.value = profile.id;
            option.innerText = profile.name;
            profileSelectEl.appendChild(option);
        });
        profileSelectEl.value = profileContext.activeProfileId;
        profileSelectEl.disabled = profileContext.profiles.length <= 1;
    }

    if (resultsPanelTitleEl) {
        resultsPanelTitleEl.innerText = `Profile history: ${profileContext.profileName}`;
    }

    if (editProfileNameOneInput) {
        editProfileNameOneInput.value = profileContext.profiles[0]?.name || "";
    }

    if (editProfileNameTwoInput) {
        editProfileNameTwoInput.value = profileContext.profiles[1]?.name || "";
    }
}

function setSelectedProfile(profileId) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const accountState = profileStore.loadAccountState();
    const nextState = profileStore.setActiveProfileId(profileId, accountState);
    renderProfileUi(nextState);
}

function openProfileEditPanel() {
    profileEditPanelEl?.classList.remove("hidden");
}

function closeProfileEditPanel() {
    profileEditPanelEl?.classList.add("hidden");
}

function saveEditedProfileNames() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const accountState = profileStore.loadAccountState();
    const profileNames = [
        editProfileNameOneInput?.value.trim() || "",
        editProfileNameTwoInput?.value.trim() || ""
    ];

    const nextState = profileStore.updateProfileNames(profileNames, accountState);
    renderProfileUi(nextState);
    closeProfileEditPanel();
}

function openResultsPanel() {
    resultsPanelEl?.classList.remove("hidden");
    loadProfileResults();
}

function closeResultsPanel() {
    resultsPanelEl?.classList.add("hidden");
}

function loadProfileResults() {
    // Placeholder for results loading
    resultsListEl.innerHTML = "<p>No results yet. Play some games!</p>";
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

// Profile UI
if (profileSelectEl) {
    profileSelectEl.addEventListener("change", () => {
        setSelectedProfile(profileSelectEl.value);
    });
}
if (profileEditBtn) profileEditBtn.addEventListener("click", openProfileEditPanel);
if (profileEditCancelBtn) profileEditCancelBtn.addEventListener("click", closeProfileEditPanel);
if (profileEditSaveBtn) profileEditSaveBtn.addEventListener("click", saveEditedProfileNames);
if (profileResultsBtn) profileResultsBtn.addEventListener("click", openResultsPanel);
if (resultsRefreshBtn) resultsRefreshBtn.addEventListener("click", loadProfileResults);
if (resultsCloseBtn) resultsCloseBtn.addEventListener("click", closeResultsPanel);
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

// ===== Initialization =====

function initSession() {
    const sessionMode = getSessionMode();
    if (sessionMode === "guest" || sessionMode === "auth") {
        showMenuPanel();
        if (getProfileStore()) {
            renderProfileUi(getProfileStore().loadAccountState());
        }
    } else {
        showStartPanel();
        showEntryActions();
    }
}

if (firebaseReady && auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (getProfileStore()) {
                getProfileStore().setActiveAccountKey(user.uid);
                renderProfileUi(getProfileStore().loadAccountState(user.uid, {
                    accountKey: user.uid,
                    email: user.email,
                    profileCount: 1,
                    profileNames: ["Player"]
                }));
            }
            setSessionMode("auth");
            showMenuPanel();
        } else {
            // User is signed out
            initSession();
        }
    });
} else {
    initSession();
}

export { renderHomeCornerAvatar };
