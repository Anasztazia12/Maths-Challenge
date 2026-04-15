import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, firebaseReady } from "./firebase.js";

const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const profileCountSelect = document.getElementById("profile-count");
const profileNameOneInput = document.getElementById("profile-name-1");
const profileNameTwoInput = document.getElementById("profile-name-2");
const registerBtn = document.getElementById("auth-register-btn");
const loginBtn = document.getElementById("auth-login-btn");
const guestBtn = document.getElementById("auth-guest-btn");
const logoutBtn = document.getElementById("auth-logout-btn");
const statusEl = document.getElementById("auth-status");
const userLabelEl = document.getElementById("auth-user-label");
const profileSummaryEl = document.getElementById("profile-summary");
const profileSelectEl = document.getElementById("profile-select");
const profileResultsBtn = document.getElementById("profile-results-btn");
const profileEditBtn = document.getElementById("profile-edit-btn");
const profileEditPanelEl = document.getElementById("profile-edit-panel");
const editProfileNameOneInput = document.getElementById("edit-profile-name-1");
const editProfileNameTwoInput = document.getElementById("edit-profile-name-2");
const profileEditCancelBtn = document.getElementById("profile-edit-cancel-btn");
const profileEditSaveBtn = document.getElementById("profile-edit-save-btn");
const resultsPanelEl = document.getElementById("results-panel");
const resultsPanelTitleEl = document.getElementById("results-panel-title");
const resultsListEl = document.getElementById("results-list");
const resultsRefreshBtn = document.getElementById("results-refresh-btn");
const resultsCloseBtn = document.getElementById("results-close-btn");
const startPanelEl = document.getElementById("start-panel");
const menuPanelEl = document.getElementById("menu-panel");
const sessionBadgeId = "session-badge";

function getProfileStore() {
    return window.MathsProfileStore || null;
}

function hasAuthUi() {
    return Boolean(
        emailInput
        && passwordInput
        && profileCountSelect
        && profileNameOneInput
        && profileNameTwoInput
        && registerBtn
        && loginBtn
        && guestBtn
        && logoutBtn
        && statusEl
        && userLabelEl
        && profileSummaryEl
        && profileSelectEl
        && profileResultsBtn
        && profileEditBtn
        && profileEditPanelEl
        && editProfileNameOneInput
        && editProfileNameTwoInput
        && profileEditCancelBtn
        && profileEditSaveBtn
        && resultsPanelEl
        && resultsPanelTitleEl
        && resultsListEl
        && resultsRefreshBtn
        && resultsCloseBtn
    );
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
    syncSessionBadge(mode);
}

function clearSessionMode() {
    localStorage.removeItem("mathsSessionMode");
    syncSessionBadge("");
}

function syncSessionBadge(mode) {
    let badge = document.getElementById(sessionBadgeId);
    if (!mode) {
        badge?.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement("div");
        badge.id = sessionBadgeId;
        badge.className = "session-badge";
        document.body.appendChild(badge);
    }

    badge.dataset.mode = mode;
    badge.innerText = mode === "guest" ? "Guest mode" : "Signed in";
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

function setProfileInputsVisibility() {
    const showSecondProfile = Number(profileCountSelect?.value || 1) === 2;
    if (profileNameTwoInput) {
        profileNameTwoInput.classList.toggle("hidden", !showSecondProfile);
    }
}

function getProfileFormData() {
    const profileCount = Number(profileCountSelect?.value || 1) === 2 ? 2 : 1;
    const profileNames = [
        (profileNameOneInput?.value || "").trim(),
        (profileNameTwoInput?.value || "").trim()
    ];

    if (!profileNames[0]) profileNames[0] = "";
    if (profileCount === 2 && !profileNames[1]) profileNames[1] = "";

    return {
        profileCount,
        profileNames: profileNames.slice(0, profileCount)
    };
}

function getProfileStateForUi(accountState) {
    const profileStore = getProfileStore();
    if (!profileStore) return null;
    return profileStore.getActiveProfile(accountState);
}

function renderProfileUi(accountState) {
    const profileStore = getProfileStore();
    if (!profileStore || !accountState) return;

    const state = profileStore.saveAccountState(accountState);
    const profileContext = profileStore.getActiveProfile(state);

    if (profileSummaryEl) {
        const profileCountText = profileContext.profileCount === 1 ? "1 profile" : `${profileContext.profileCount} profiles`;
        profileSummaryEl.innerText = `${profileContext.profileName} • ${profileCountText}`;
    }

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
        editProfileNameTwoInput.classList.toggle("hidden", profileContext.profiles.length <= 1);
    }
}

function closeProfileEditPanel() {
    profileEditPanelEl?.classList.add("hidden");
}

function openProfileEditPanel() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = profileStore.loadAccountState();
    renderProfileUi(state);
    profileEditPanelEl?.classList.remove("hidden");
}

async function saveEditedProfileNames() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = profileStore.loadAccountState();
    const firstName = (editProfileNameOneInput?.value || "").trim();
    const secondName = (editProfileNameTwoInput?.value || "").trim();

    state.profiles = state.profiles.map((profile, index) => {
        const desiredName = index === 0 ? firstName : secondName;
        const fallbackName = profile.name || `Profile ${index + 1}`;
        return {
            ...profile,
            name: desiredName || fallbackName
        };
    });

    const nextState = profileStore.setAccountState(state);
    renderProfileUi(nextState);

    if (firebaseReady && auth?.currentUser && db) {
        try {
            await saveAccountStateToCloud(auth.currentUser, nextState);
        } catch (error) {
            console.error("Could not save profile names to cloud", error);
            setStatus("Profile names saved locally. Cloud sync failed.", true);
            return;
        }
    }

    closeProfileEditPanel();
    setStatus("Profile names updated.");
}

function setSelectedProfile(profileId) {
    const profileStore = getProfileStore();
    if (!profileStore) return null;

    const nextState = profileStore.setActiveProfile(profileId);
    renderProfileUi(nextState);

    if (firebaseReady && auth?.currentUser && db) {
        saveAccountStateToCloud(auth.currentUser, profileStore.loadAccountState()).catch((error) => {
            console.error("Could not sync active profile", error);
        });
    }

    return nextState;
}

function formatResultRow(result) {
    const hasTimestamp = result?.createdAt && typeof result.createdAt === "object" && typeof result.createdAt.seconds === "number";
    const timestampDate = hasTimestamp ? new Date(result.createdAt.seconds * 1000) : null;
    const dateLabel = result.dateLabel || result.createdAtLabel || (timestampDate ? timestampDate.toLocaleDateString() : "Unknown date");
    const scoreLabel = `${Number(result.correctCount) || 0}/${Number(result.total) || 0}`;
    const titleLabel = result.operationLabel || "Quiz";
    const modeLabel = result.modeLabel || "Type Answer";
    return `<div class="result-history-item">
        <div class="result-history-main">
            <strong>${dateLabel}</strong>
            <span>${titleLabel} • ${modeLabel}</span>
        </div>
        <div class="result-history-score">${scoreLabel}</div>
    </div>`;
}

function renderResultsList(results, profileName) {
    if (!resultsListEl) return;

    if (!results || results.length === 0) {
        resultsListEl.innerHTML = '<p class="results-empty">No completed tests yet for this profile.</p>';
        return;
    }

    resultsListEl.innerHTML = results.map((result) => formatResultRow(result)).join("");
}

async function loadProfileResults() {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const profileContext = profileStore.getCurrentProfileContext();
    const profileName = profileContext.profileName || "Player";

    if (resultsPanelTitleEl) {
        resultsPanelTitleEl.innerText = `Profile history: ${profileName}`;
    }

    if (!firebaseReady || !auth || !db || !auth.currentUser) {
        const localResults = profileStore.getProfileHistory({
            accountKey: profileContext.accountKey,
            profileId: profileContext.activeProfileId
        });
        renderResultsList(localResults, profileName);
        return;
    }

    try {
        const resultsRef = collection(db, "users", auth.currentUser.uid, "profiles", profileContext.activeProfileId, "quizResults");
        const resultQuery = query(resultsRef, orderBy("createdAt", "desc"), limit(100));
        const snapshot = await getDocs(resultQuery);
        const results = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

        profileStore.saveProfileHistory(results, {
            accountKey: profileContext.accountKey,
            profileId: profileContext.activeProfileId
        });

        renderResultsList(results, profileName);
    } catch (error) {
        console.error("Could not load profile results", error);
        const fallbackResults = profileStore.getProfileHistory({
            accountKey: profileContext.accountKey,
            profileId: profileContext.activeProfileId
        });
        renderResultsList(fallbackResults, profileName);
        setStatus("Could not load cloud history. Showing saved results from this device.", true);
    }
}

function closeResultsPanel() {
    resultsPanelEl?.classList.add("hidden");
}

function openResultsPanel() {
    resultsPanelEl?.classList.remove("hidden");
    loadProfileResults();
}

function createCloudProfilePayload(state, email) {
    return {
        email,
        profileCount: state.profileCount,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

async function saveAccountStateToCloud(user, state) {
    if (!firebaseReady || !db || !user || !state) return;

    await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        createCloudProfilePayload(state, user.email || state.email || ""),
        { merge: true }
    );
}

async function loadAccountStateFromCloud(user, email) {
    const profileStore = getProfileStore();
    if (!profileStore || !user) return null;

    const profileDocRef = doc(db, "users", user.uid, "profile", "main");
    const profileSnapshot = await getDoc(profileDocRef);

    if (!profileSnapshot.exists()) {
        return profileStore.buildDefaultAccountState({
            accountKey: user.uid,
            email,
            profileCount: 1,
            profileNames: ["Player"]
        });
    }

    const savedState = profileSnapshot.data() || {};
    const nextState = profileStore.buildDefaultAccountState({
        accountKey: user.uid,
        email: savedState.email || email,
        profileCount: savedState.profileCount || savedState.profiles?.length || 1,
        profileNames: Array.isArray(savedState.profiles) ? savedState.profiles.map((profile) => profile?.name) : ["Player", "Player 2"]
    });

    if (savedState.activeProfileId && nextState.profiles.some((profile) => profile.id === savedState.activeProfileId)) {
        nextState.activeProfileId = savedState.activeProfileId;
    }

    return nextState;
}

function getCredentials() {
    const email = (emailInput?.value || "").trim();
    const password = String(passwordInput?.value || "").trim();
    return { email, password };
}

function buildRegistrationState(user, email) {
    const profileStore = getProfileStore();
    if (!profileStore) return null;

    const formData = getProfileFormData();
    return profileStore.buildDefaultAccountState({
        accountKey: user.uid,
        email,
        profileCount: formData.profileCount,
        profileNames: formData.profileNames
    });
}

async function syncAuthenticatedState(user, email) {
    const profileStore = getProfileStore();
    if (!profileStore || !user) return null;

    const cloudState = await loadAccountStateFromCloud(user, email);
    const normalizedState = profileStore.setAccountState(cloudState || profileStore.buildDefaultAccountState({
        accountKey: user.uid,
        email,
        profileCount: 1,
        profileNames: ["Player"]
    }));

    await saveAccountStateToCloud(user, normalizedState);
    return normalizedState;
}

function updateProfileInputsFromSelection() {
    setProfileInputsVisibility();
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

        const profileStore = getProfileStore();
        const accountState = buildRegistrationState(cred.user, email);
        const normalizedState = profileStore?.setAccountState(accountState);

        await setDoc(
            doc(db, "users", cred.user.uid, "profile", "main"),
            {
                email,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                profileCount: normalizedState?.profileCount || accountState?.profileCount || 1,
                activeProfileId: normalizedState?.activeProfileId || accountState?.activeProfileId || "",
                profiles: normalizedState?.profiles || accountState?.profiles || []
            },
            { merge: true }
        );

        if (profileStore && normalizedState) {
            profileStore.setActiveAccountKey(cred.user.uid);
            renderProfileUi(normalizedState);
            setSelectedProfile(normalizedState.activeProfileId);
        }

        setStatus("Registration successful.");
        setSessionMode("auth");
        userLabelEl.innerText = `Signed in: ${email}`;
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

        const normalizedState = await syncAuthenticatedState(cred.user, email);
        if (normalizedState) {
            renderProfileUi(normalizedState);
            profileNameOneInput.value = normalizedState.profiles[0]?.name || profileNameOneInput.value;
            profileNameTwoInput.value = normalizedState.profiles[1]?.name || profileNameTwoInput.value;
        }

        setStatus("Login successful.");
        setSessionMode("auth");
        userLabelEl.innerText = `Signed in: ${cred.user.email || email}`;
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
        closeProfileEditPanel();
        closeResultsPanel();
        await signOut(auth);
        const profileStore = getProfileStore();
        if (profileStore) {
            profileStore.setActiveAccountKey("guest");
            renderProfileUi(profileStore.setAccountState(profileStore.buildDefaultAccountState({
                accountKey: "guest",
                profileCount: 1,
                profileNames: ["Guest"]
            })));
        }
        clearSessionMode();
        showStartPanel();
        setStatus("Logged out.");
        userLabelEl.innerText = "Not signed in";
    } catch (error) {
        setStatus(error?.message || "Logout failed.", true);
    } finally {
        setBusy(false);
    }
}

function handleGuestMode() {
    closeProfileEditPanel();
    closeResultsPanel();

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
    setStatus("Guest mode enabled. Your progress stays on this device.");
    if (logoutBtn) logoutBtn.disabled = false;
    userLabelEl.innerText = "Guest mode";
    showMenuPanel();
}

async function refreshMenuState(user, email) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    if (user) {
        const state = await syncAuthenticatedState(user, email || user.email || "");
        if (state) {
            renderProfileUi(state);
            profileNameOneInput.value = state.profiles[0]?.name || profileNameOneInput.value;
            profileNameTwoInput.value = state.profiles[1]?.name || profileNameTwoInput.value;
        }
        userLabelEl.innerText = `Signed in: ${user.email || email || user.uid}`;
        setSessionMode("auth");
        logoutBtn.disabled = false;
        showMenuPanel();
        return;
    }

    const guestState = profileStore.setAccountState(profileStore.buildDefaultAccountState({
        accountKey: "guest",
        profileCount: 1,
        profileNames: ["Guest"]
    }));

    renderProfileUi(guestState);
    if (getSessionMode() === "guest") {
        userLabelEl.innerText = "Guest mode";
        showMenuPanel();
    } else if (getSessionMode() === "auth") {
        showMenuPanel();
    } else {
        showStartPanel();
    }
}

if (hasAuthUi()) {
    setProfileInputsVisibility();
    profileCountSelect.addEventListener("change", setProfileInputsVisibility);
    profileSelectEl.addEventListener("change", () => {
        setSelectedProfile(profileSelectEl.value);
        closeProfileEditPanel();
    });
    profileResultsBtn.addEventListener("click", openResultsPanel);
    profileEditBtn.addEventListener("click", openProfileEditPanel);
    profileEditCancelBtn.addEventListener("click", closeProfileEditPanel);
    profileEditSaveBtn.addEventListener("click", saveEditedProfileNames);
    resultsRefreshBtn.addEventListener("click", loadProfileResults);
    resultsCloseBtn.addEventListener("click", closeResultsPanel);

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
            refreshMenuState(user, user?.email || "");
        });

        if (getSessionMode() === "guest") {
            showMenuPanel();
        } else if (getSessionMode() !== "auth") {
            showStartPanel();
        }

        if (getProfileStore()) {
            renderProfileUi(getProfileStore().loadAccountState());
        }
        syncSessionBadge(getSessionMode());
    }
}
