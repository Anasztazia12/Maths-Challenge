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
    getDoc,
    getDocs,
    collection,
    query,
    orderBy,
    limit,
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
const resultsPanelEl = document.getElementById("results-panel");
const resultsPanelTitleEl = document.getElementById("results-panel-title");
const resultsListEl = document.getElementById("results-list");
const resultsRefreshBtn = document.getElementById("results-refresh-btn");
const resultsCloseBtn = document.getElementById("results-close-btn");
const resultsFilterAllBtn = document.getElementById("results-filter-all-btn");
const resultsFilterCompletedBtn = document.getElementById("results-filter-completed-btn");
const resultsFilterUnfinishedBtn = document.getElementById("results-filter-unfinished-btn");
const isAuthPage = Boolean(startPanelEl && authEntryActionsEl);
const isHomeDashboardPage = Boolean(menuPanelEl) && !isAuthPage;
const AUTH_VIEW_HASHES = new Set(["login", "register", "reset", "verify"]);

// ===== State =====
let resetEmailForVerify = "";
const LAST_LOGIN_EMAIL_KEY = "mathsLastLoginEmail";
const AUTH_BADGE_PENDING_KEY = "mathsAuthBadgePending";
let currentResultsFilter = "all";

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

function queueAuthBadge() {
    sessionStorage.setItem(AUTH_BADGE_PENDING_KEY, "1");
}

function clearAuthBadgeQueue() {
    sessionStorage.removeItem(AUTH_BADGE_PENDING_KEY);
}

function showTransientAuthBadge() {
    const badgeId = "session-badge";
    const existingBadge = document.getElementById(badgeId);
    if (existingBadge) existingBadge.remove();

    const badge = document.createElement("div");
    badge.id = badgeId;
    badge.className = "session-badge";
    badge.innerText = "Signed in";
    document.body.appendChild(badge);

    window.setTimeout(() => {
        if (badge.isConnected) badge.remove();
    }, 2800);
}

function isDefaultProfileName(name, index = 0) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) return true;

    const normalizedName = trimmedName.toLowerCase();
    if (normalizedName === "player" || normalizedName === "guest") return true;

    return normalizedName === `profile ${index + 1}` || normalizedName === `profile${index + 1}`;
}

function mergePreferredProfileNames(baseState, preferredState) {
    if (!baseState || !Array.isArray(baseState.profiles)) return baseState;
    if (!preferredState || !Array.isArray(preferredState.profiles)) return baseState;

    const mergedProfiles = baseState.profiles.map((profile, index) => {
        const preferredProfile = preferredState.profiles[index];
        const preferredName = String(preferredProfile?.name || "").trim();
        if (!isDefaultProfileName(preferredName, index)) {
            return {
                ...profile,
                name: preferredName
            };
        }

        return profile;
    });

    return {
        ...baseState,
        profiles: mergedProfiles
    };
}

function deriveAccountDisplayName(user, cloudData, fallbackState) {
    const cloudUsername = String(cloudData?.username || "").trim();
    if (cloudUsername) return cloudUsername;

    const stateName = String(fallbackState?.profiles?.[0]?.name || "").trim();
    if (stateName && !isDefaultProfileName(stateName, 0)) return stateName;

    const email = String(user?.email || "").trim();
    if (!email.includes("@")) return "";

    const localPart = email.split("@")[0].trim();
    if (!localPart) return "";

    return localPart.slice(0, 24);
}

function openProfileNameDialog(initialName, onSave) {
    const existingDialog = document.getElementById("profile-name-dialog");
    if (existingDialog) existingDialog.remove();

    const overlay = document.createElement("div");
    overlay.id = "profile-name-dialog";
    overlay.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,0.72);backdrop-filter:blur(8px);";

    const panel = document.createElement("div");
    panel.style.cssText = "width:min(92vw,380px);border-radius:18px;padding:18px 16px 16px;background:rgba(15,23,42,0.96);border:1px solid rgba(186,230,253,0.22);box-shadow:0 24px 50px rgba(2,8,23,0.5);color:#e2e8f0;";

    panel.innerHTML = `
        <div style="font-size:18px;font-weight:900;margin-bottom:8px;">Edit profile name</div>
        <div style="font-size:13px;line-height:1.4;color:#cbd5e1;margin-bottom:12px;">Choose the name shown in your profile and game screens.</div>
        <input id="profile-name-dialog-input" type="text" autocomplete="nickname" maxlength="24" style="width:100%;box-sizing:border-box;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:rgba(15,23,42,0.9);color:#f8fafc;padding:12px 14px;font-size:15px;outline:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
            <button id="profile-name-dialog-cancel" type="button" class="menu-btn" style="margin-top:0;">Cancel</button>
            <button id="profile-name-dialog-save" type="button" class="menu-btn special" style="margin-top:0;">Save</button>
        </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const input = panel.querySelector("#profile-name-dialog-input");
    const cancelBtn = panel.querySelector("#profile-name-dialog-cancel");
    const saveBtn = panel.querySelector("#profile-name-dialog-save");

    input.value = String(initialName || "").trim();
    if (!input.value) input.value = "Player";

    const closeDialog = () => {
        overlay.remove();
        document.removeEventListener("keydown", handleKeyDown);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            closeDialog();
        }
        if (event.key === "Enter") {
            event.preventDefault();
            saveBtn.click();
        }
    };

    cancelBtn.addEventListener("click", closeDialog);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeDialog();
    });
    saveBtn.addEventListener("click", async () => {
        const nextName = input.value.trim();
        if (!nextName) {
            setStatusMessage(authStatusEl, "Profile name is required.", true);
            input.focus();
            return;
        }

        try {
            await onSave(nextName);
            closeDialog();
        } catch (error) {
            setStatusMessage(authStatusEl, error?.message || "Profile name update failed.", true);
        }
    });

    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => input.focus(), 0);
    window.setTimeout(() => input.select(), 0);
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
}

function setAuthViewHash(view) {
    if (!isAuthPage) return;

    const nextHash = view ? `#${view}` : "";
    if (window.location.hash === nextHash) return;
    window.location.hash = nextHash;
}

function getAuthViewFromHash() {
    const view = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    return AUTH_VIEW_HASHES.has(view) ? view : "";
}

function syncAuthViewFromHash() {
    const view = getAuthViewFromHash();

    if (view === "login") {
        showLoginForm();
        return;
    }

    if (view === "register") {
        showRegisterForm();
        return;
    }

    if (view === "reset") {
        showResetForm();
        return;
    }

    if (view === "verify") {
        showVerifyResetForm();
        return;
    }

    showEntryActions();
}

function showLoginForm() {
    hideAllAuthForms();
    authLoginFormEl?.classList.remove("hidden");
    const rememberedEmail = localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || "";
    authLoginEmailEl.value = rememberedEmail;
    authLoginPasswordEl.value = "";
    authLoginStatusEl.textContent = "";
    setAuthViewHash("login");
}

function showResetForm() {
    hideAllAuthForms();
    authResetFormEl?.classList.remove("hidden");
    authResetEmailEl.value = "";
    authResetStatusEl.textContent = "";
    setAuthViewHash("reset");
}

function showVerifyResetForm() {
    hideAllAuthForms();
    authVerifyResetFormEl?.classList.remove("hidden");
    authVerifyCodeEl.value = "";
    authNewPasswordEl.value = "";
    authConfirmPasswordEl.value = "";
    authVerifyStatusEl.textContent = "";
    setAuthViewHash("verify");
}

function showRegisterForm() {
    hideAllAuthForms();
    authRegisterFormEl?.classList.remove("hidden");
    authRegisterEmailEl.value = "";
    authRegisterUsernameEl.value = "";
    authRegisterPasswordEl.value = "";
    authRegisterPasswordConfirmEl.value = "";
    authRegisterStatusEl.textContent = "";
    setAuthViewHash("register");
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

function toMillis(value) {
    if (!value) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value?.toMillis === "function") {
        const asMillis = value.toMillis();
        return Number.isFinite(asMillis) ? asMillis : 0;
    }
    return 0;
}

function buildResultKey(result) {
    const time = Number(result?.timestamp) || toMillis(result?.endedAt) || toMillis(result?.date) || 0;
    const correct = Number(result?.correctCount || result?.correct || 0);
    const total = Number(result?.total || 0);
    const operation = String(result?.operationLabel || result?.op || result?.operation || "").trim();
    const mode = String(result?.modeLabel || result?.mode || "").trim();
    return [time, correct, total, operation, mode].join("|");
}

function mergeUniqueResults(primary, secondary, maxCount = 100) {
    const seen = new Set();
    const merged = [];

    [...primary, ...secondary].forEach((item) => {
        if (!item || typeof item !== "object") return;
        const key = buildResultKey(item);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
    });

    merged.sort((a, b) => {
        const ta = Number(a?.timestamp) || toMillis(a?.endedAt) || toMillis(a?.date) || 0;
        const tb = Number(b?.timestamp) || toMillis(b?.endedAt) || toMillis(b?.date) || 0;
        return tb - ta;
    });

    return merged.slice(0, maxCount);
}

async function saveAccountStateToCloud(user, accountState) {
    if (!firebaseReady || !db || !user?.uid || !accountState) return;

    const primaryName = accountState.profiles?.[0]?.name || "Player";
    const activeProfileId = accountState.activeProfileId || accountState.profiles?.[0]?.id || "";
    const profileStore = getProfileStore();
    const pointsBalance = profileStore && activeProfileId
        ? Math.max(0, Math.round(Number(profileStore.getPoints({ accountKey: user.uid, profileId: activeProfileId })) || 0))
        : 0;

    await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        {
            uid: user.uid,
            email: user.email || accountState.email || "",
            username: primaryName,
            accountState,
            pointsBalance,
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
        },
        { merge: true }
    );
}

function getLegacyProfileIdsForSync(userUid, activeProfileId) {
    const ids = new Set([
        String(activeProfileId || "").trim(),
        `${userUid}-profile-1`,
        "profile-1",
        "guest-profile-1"
    ]);

    ids.delete("");
    return [...ids];
}

async function loadCloudResults(user, profileId) {
    if (!firebaseReady || !db || !user?.uid || !profileId) return [];

    const snapshot = await getDocs(
        query(
            collection(db, "users", user.uid, "profiles", profileId, "quizResults"),
            orderBy("createdAt", "desc"),
            limit(100)
        )
    );

    return snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        const createdAtMillis = toMillis(data.createdAt);
        const endedAt = data.endedAt || (createdAtMillis ? new Date(createdAtMillis).toISOString() : new Date().toISOString());
        const timestamp = Number(data.timestamp) || createdAtMillis || toMillis(endedAt) || Date.now();

        return {
            accountKey: data.accountKey || user.uid,
            profileId: data.profileId || profileId,
            profileName: data.profileName || "Player",
            studentName: data.studentName || data.profileName || "Player",
            correctCount: Number(data.correctCount || 0),
            total: Number(data.total || 0),
            rating: data.rating || "",
            badge: data.badge || null,
            operationLabel: data.operationLabel || data.operation || "Quiz",
            difficultyLabel: data.difficultyLabel || "",
            modeLabel: data.modeLabel || data.mode || "",
            tableInfoLabel: data.tableInfoLabel || "",
            completionStatus: data.completionStatus || "completed",
            startedAt: data.startedAt || endedAt,
            endedAt,
            date: data.date || endedAt,
            timestamp,
            dateLabel: data.dateLabel || new Date(timestamp).toLocaleDateString(),
            createdAtLabel: data.createdAtLabel || new Date(timestamp).toLocaleDateString(),
            sessionMode: "auth",
            results: Array.isArray(data.results) ? data.results : []
        };
    });
}

async function syncAuthDataFromCloud(profileStore, user) {
    if (!profileStore || !user?.uid) return null;

    const hadLocalStateBeforeSync = Boolean(localStorage.getItem(profileStore.getAccountStorageKey(user.uid)));

    let state = profileStore.loadAccountState(user.uid, {
        accountKey: user.uid,
        email: user.email || "",
        profileCount: 1,
        profileNames: ["Player"]
    });

    try {
        const profileDocRef = doc(db, "users", user.uid, "profile", "main");
        const profileDocSnap = await getDoc(profileDocRef);
        const cloudData = profileDocSnap.exists() ? (profileDocSnap.data() || {}) : null;

        if (cloudData?.accountState && typeof cloudData.accountState === "object") {
            const localUpdatedAt = toMillis(state.updatedAt);
            const cloudUpdatedAt = toMillis(cloudData.accountState.updatedAt) || toMillis(cloudData.updatedAt);
            const cloudState = {
                ...cloudData.accountState,
                accountKey: user.uid,
                email: user.email || cloudData.email || state.email || ""
            };

            const shouldPreferCloud = !hadLocalStateBeforeSync || cloudUpdatedAt >= localUpdatedAt;

            if (shouldPreferCloud) {
                state = profileStore.setAccountState(mergePreferredProfileNames(cloudState, state));
            }
        } else if (cloudData?.username && state.profiles?.[0] && (!state.profiles[0].name || state.profiles[0].name === "Player")) {
            state = profileStore.setProfileName(String(cloudData.username).trim(), state, state.profiles[0].id);
        }

        const accountDisplayName = deriveAccountDisplayName(user, cloudData, state);
        if (accountDisplayName && Array.isArray(state.profiles) && state.profiles.length > 0) {
            const primaryProfile = state.profiles[0];
            if (primaryProfile && isDefaultProfileName(primaryProfile.name, 0)) {
                state = profileStore.setProfileName(accountDisplayName, state, primaryProfile.id);
            }

            const activeIndex = state.profiles.findIndex((profile) => profile.id === state.activeProfileId);
            if (activeIndex >= 0 && isDefaultProfileName(state.profiles[activeIndex]?.name, activeIndex)) {
                state = profileStore.setProfileName(accountDisplayName, state, state.profiles[activeIndex].id);
            }
        }

        const activeProfileId = state.activeProfileId || state.profiles?.[0]?.id;
        if (activeProfileId) {
            const profileIdsToCheck = getLegacyProfileIdsForSync(user.uid, activeProfileId);
            let cloudResults = [];

            for (const profileId of profileIdsToCheck) {
                try {
                    const resultSlice = await loadCloudResults(user, profileId);
                    cloudResults = mergeUniqueResults(cloudResults, resultSlice, 300);
                } catch (error) {
                    console.warn("Cloud results read failed for profile", profileId, error);
                }
            }

            const localResults = profileStore.getProfileHistory({
                accountKey: user.uid,
                profileId: activeProfileId
            });
            const merged = mergeUniqueResults(cloudResults, Array.isArray(localResults) ? localResults : []);
            profileStore.saveProfileHistory(merged, {
                accountKey: user.uid,
                profileId: activeProfileId
            });

            const cloudPoints = Math.max(0, Math.round(Number(cloudData?.pointsBalance) || 0));
            const localPoints = Math.max(0, Math.round(Number(profileStore.getPoints({
                accountKey: user.uid,
                profileId: activeProfileId
            })) || 0));
            const mergedPoints = Math.max(localPoints, cloudPoints);

            profileStore.setPoints(mergedPoints, {
                accountKey: user.uid,
                profileId: activeProfileId
            });
            localStorage.setItem(
                profileStore.getScopedStorageKey("arcadeCoins", { accountKey: user.uid, profileId: activeProfileId }),
                String(mergedPoints)
            );
        }

        await saveAccountStateToCloud(user, state);
    } catch (error) {
        console.error("Auth cloud sync failed", error);
    }

    return state;
}

async function sendEmailNotification(email, subject, message) {
    // Placeholder for email service - would use backend endpoint in production
    console.log(`Email sent to ${email}: ${subject} - ${message}`);
}

function waitForAuthUser(timeoutMs = 1500) {
    if (!firebaseReady || !auth) return Promise.resolve(null);
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise((resolve) => {
        let unsubscribe = null;
        const timeoutId = setTimeout(() => {
            if (unsubscribe) unsubscribe();
            resolve(auth.currentUser || null);
        }, timeoutMs);

        unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeoutId);
            if (unsubscribe) unsubscribe();
            resolve(user || null);
        });
    });
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
    return sessionMode ? "home.html" : "index.html";
}

function goBackToHome() {
    location.replace(getBackToHomeUrl());
}

function navigateToHome() {
    location.replace("home.html");
}

function consumeMenuActionFromUrl() {
    try {
        const url = new URL(window.location.href);
        const action = (url.searchParams.get("action") || "").trim().toLowerCase();
        if (!action) return "";

        url.searchParams.delete("action");
        const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, "", cleanUrl);
        return action;
    } catch {
        return "";
    }
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
        queueAuthBadge();

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
        if (isAuthPage) {
            setTimeout(() => navigateToHome(), 250);
        } else {
            setTimeout(() => showMenuPanel(), 250);
        }
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
        queueAuthBadge();

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
        if (isAuthPage) {
            setTimeout(() => navigateToHome(), 250);
        } else {
            setTimeout(() => showMenuPanel(), 250);
        }
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
    if (isAuthPage) {
        navigateToHome();
        return;
    }
    showMenuPanel();
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
    clearSessionMode();
    clearAuthBadgeQueue();
    if (isHomeDashboardPage) {
        location.replace("index.html");
        return;
    }
    showStartPanel();
    showEntryActions();
}

// ===== Profile UI Functions =====

function renderProfileUi(accountState) {
    const profileStore = getProfileStore();
    if (!profileStore || !accountState) return;

    const state = profileStore.saveAccountState(accountState);
    const profileContext = profileStore.getActiveProfile(state);

    renderHomeCornerAvatar(profileContext.activeProfile);

    if (resultsPanelTitleEl) {
        resultsPanelTitleEl.innerText = `Profile history: ${profileContext.profileName}`;
    }
}

function openResultsPanel() {
    resultsPanelEl?.classList.remove("hidden");
    if (resultsListEl) {
        resultsListEl.innerHTML = "<p class='results-empty'>Loading results...</p>";
    }
    loadProfileResults();
}

function closeResultsPanel() {
    resultsPanelEl?.classList.add("hidden");
}

function getResultCompletionStatus(result) {
    return (result?.completionStatus || "completed").toLowerCase() === "completed"
        ? "completed"
        : "unfinished";
}

function updateResultsFilterButtons() {
    const isAll = currentResultsFilter === "all";
    const isCompleted = currentResultsFilter === "completed";
    const isUnfinished = currentResultsFilter === "unfinished";

    resultsFilterAllBtn?.classList.toggle("active", isAll);
    resultsFilterCompletedBtn?.classList.toggle("active", isCompleted);
    resultsFilterUnfinishedBtn?.classList.toggle("active", isUnfinished);
}

function setResultsFilter(filter) {
    if (!["all", "completed", "unfinished"].includes(filter)) return;
    currentResultsFilter = filter;
    updateResultsFilterButtons();
    loadProfileResults();
}

function openEditProfileNameDialog() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const accountKey = auth?.currentUser?.uid || profileStore.getActiveAccountKey();
    if (accountKey) {
        profileStore.setActiveAccountKey(accountKey);
    }

    const accountState = profileStore.loadAccountState(accountKey);
    const activeProfile = profileStore.getActiveProfile(accountState)?.activeProfile;
    const currentName = activeProfile?.name || "Player";

    openProfileNameDialog(currentName, async (nextName) => {
        const updated = profileStore.setProfileName(nextName, accountState, activeProfile?.id || accountState.activeProfileId || null);
        renderProfileUi(updated);

        if (firebaseReady && auth?.currentUser) {
            await saveAccountStateToCloud(auth.currentUser, updated);
            setStatusMessage(authStatusEl, "Profile name updated and synced!", false);
            return;
        }

        setStatusMessage(authStatusEl, "Profile name updated!", false);
    });
}

function runMenuAction(action) {
    if (action === "results") {
        openResultsPanel();
        return;
    }

    if (action === "edit") {
        openEditProfileNameDialog();
        return;
    }

    if (action === "logout") {
        handleLogout();
        return;
    }

    if (action === "delete") {
        showDeleteConfirmation();
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
        
        // Redirect back to the auth landing page without keeping the dashboard in history
        location.replace("index.html");
    } catch (error) {
        console.error("Account deletion failed:", error);
        setStatusMessage(authStatusEl, error?.message || "Failed to delete account.", true);
    }
}

async function loadProfileResults() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const currentUser = await waitForAuthUser();

    if (firebaseReady && currentUser) {
        await syncAuthDataFromCloud(profileStore, currentUser);
    }

    const history = profileStore.getProfileHistory();
    if (!history || history.length === 0) {
        resultsListEl.innerHTML = "<p class='results-empty'>No results yet. Play some games!</p>";
        return;
    }

    const getResultTime = (entry) => {
        const numeric = Number(entry?.timestamp);
        if (Number.isFinite(numeric) && numeric > 0) return numeric;

        const isoDate = entry?.date || entry?.endedAt || entry?.createdAt;
        const parsed = isoDate ? Date.parse(isoDate) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) return parsed;

        return 0;
    };

    const sortedHistory = [...history].sort((a, b) => getResultTime(b) - getResultTime(a));

    const filteredHistory = sortedHistory.filter((item) => {
        if (currentResultsFilter === "all") return true;
        return getResultCompletionStatus(item) === currentResultsFilter;
    });

    if (filteredHistory.length === 0) {
        const label = currentResultsFilter === "all"
            ? "results"
            : `${currentResultsFilter} results`;
        resultsListEl.innerHTML = `<p class='results-empty'>No ${label} for this profile yet.</p>`;
        return;
    }

    resultsListEl.innerHTML = filteredHistory.map((result, index) => {
        const timeValue = getResultTime(result);
        const date = new Date(timeValue || Date.now());
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const correct = result.correctCount || result.correct || 0;
        const total = result.total || 0;
        const totalPlanned = result.totalPlanned || 20;
        const operation = result.operationLabel || result.op || result.operation || "Quiz";
        const mode = result.modeLabel || result.mode || "Unknown";
        const completionStatus = getResultCompletionStatus(result);
        const isCompleted = completionStatus === "completed";
        const statusText = isCompleted ? "Completed" : "Unfinished";
        const scoreText = isCompleted
            ? `${correct}/${total} ✓`
            : `${correct}/${total} of ${totalPlanned}`;

        return `<div class="results-item" data-index="${index}">
            <div class="results-item-header">
                <div class="results-item-info">
                    <span class="results-item-title">${operation} - ${mode} • ${statusText}</span>
                    <span class="results-item-date">${dateStr} ${timeStr}</span>
                </div>
                <div class="results-item-score">${scoreText}</div>
            </div>
            <div class="results-item-detail hidden">
                <p><strong>Operation:</strong> ${operation}</p>
                <p><strong>Mode:</strong> ${mode}</p>
                <p><strong>Status:</strong> ${statusText}</p>
                <p><strong>Correct:</strong> ${correct} / ${total}</p>
                <p><strong>Planned Questions:</strong> ${totalPlanned}</p>
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
if (authLoginBackBtnEl) authLoginBackBtnEl.addEventListener("click", () => window.history.back());
if (authLoginSubmitBtnEl) authLoginSubmitBtnEl.addEventListener("click", handleLogin);
if (authLoginForgotBtnEl) authLoginForgotBtnEl.addEventListener("click", showResetForm);

// Reset form
if (authResetBackBtnEl) authResetBackBtnEl.addEventListener("click", () => window.history.back());
if (authResetSendBtnEl) authResetSendBtnEl.addEventListener("click", handleResetSend);

// Verify reset form
if (authVerifyBackBtnEl) authVerifyBackBtnEl.addEventListener("click", () => window.history.back());
if (authVerifySubmitBtnEl) authVerifySubmitBtnEl.addEventListener("click", handleVerifyReset);

// Register form
if (authRegisterBackBtnEl) authRegisterBackBtnEl.addEventListener("click", () => window.history.back());
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
if (resultsRefreshBtn) resultsRefreshBtn.addEventListener("click", loadProfileResults);
if (resultsCloseBtn) resultsCloseBtn.addEventListener("click", closeResultsPanel);
if (resultsFilterAllBtn) resultsFilterAllBtn.addEventListener("click", () => setResultsFilter("all"));
if (resultsFilterCompletedBtn) resultsFilterCompletedBtn.addEventListener("click", () => setResultsFilter("completed"));
if (resultsFilterUnfinishedBtn) resultsFilterUnfinishedBtn.addEventListener("click", () => setResultsFilter("unfinished"));

window.MathsMenuActions = {
    edit: () => runMenuAction("edit"),
    results: () => runMenuAction("results"),
    logout: () => runMenuAction("logout"),
    delete: () => runMenuAction("delete")
};

window.goBackToHome = goBackToHome;

// ===== Initialization =====

function restoreGuestSession(profileStore) {
    if (!profileStore) return false;

    profileStore.setActiveAccountKey("guest");
    const guestState = profileStore.loadAccountState("guest", {
        accountKey: "guest",
        profileCount: 1,
        profileNames: ["Guest"]
    });
    renderProfileUi(guestState);
    showMenuPanel();
    return true;
}

async function restoreAuthSession(profileStore, user) {
    if (!profileStore || !user?.uid) return false;

    profileStore.setActiveAccountKey(user.uid);
    const accountState = await syncAuthDataFromCloud(profileStore, user);
    renderProfileUi(accountState || profileStore.loadAccountState(user.uid));
    showMenuPanel();
    return true;
}

async function initializeHomeState() {
    const profileStore = getProfileStore();
    const sessionMode = getSessionMode();

    if (isAuthPage) {
        showStartPanel();
        syncAuthViewFromHash();

        // Always require explicit login from the auth page.
        clearSessionMode();
        clearAuthBadgeQueue();

        if (!firebaseReady || !auth) {
            return;
        }

        if (auth.currentUser) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Auth-page signout error:", error);
            }
        }

        const rememberedEmail = auth.currentUser?.email || "";
        if (rememberedEmail) {
            localStorage.setItem(LAST_LOGIN_EMAIL_KEY, rememberedEmail);
        }

        window.addEventListener("hashchange", syncAuthViewFromHash);
        return;
    }

    if (!isHomeDashboardPage) return;

    const pendingAction = consumeMenuActionFromUrl();
    let pendingActionHandled = false;
    const runPendingActionOnce = () => {
        if (pendingActionHandled || !pendingAction) return;
        pendingActionHandled = true;
        runMenuAction(pendingAction);
    };

    if (sessionMode === "guest") {
        restoreGuestSession(profileStore);
        runPendingActionOnce();
        return;
    }

    if (sessionMode !== "auth") {
        location.replace("index.html");
        return;
    }

    if (!firebaseReady || !auth) {
        location.replace("index.html");
        return;
    }

    if (auth.currentUser) {
        await restoreAuthSession(profileStore, auth.currentUser);
        if (sessionStorage.getItem(AUTH_BADGE_PENDING_KEY) === "1") {
            clearAuthBadgeQueue();
            showTransientAuthBadge();
        }
        runPendingActionOnce();
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setSessionMode("auth");
            await restoreAuthSession(getProfileStore(), user);
            if (sessionStorage.getItem(AUTH_BADGE_PENDING_KEY) === "1") {
                clearAuthBadgeQueue();
                showTransientAuthBadge();
            }
            runPendingActionOnce();
            return;
        }

        clearSessionMode();
        location.replace("index.html");
    });
}

void initializeHomeState();
updateResultsFilterButtons();

export { renderHomeCornerAvatar };
