function getSessionMode() {
    return localStorage.getItem("mathsSessionMode") || "";
}

function hasAllowedSession() {
    return getSessionMode() === "guest" || getSessionMode() === "auth";
}

function redirectToStart() {
    if (window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/")) return;
    window.location.replace("index.html");
}

if (!hasAllowedSession()) {
    redirectToStart();
}

function ensureProfileContext() {
    const profileStore = window.MathsProfileStore;
    if (!profileStore) return;

    const mode = getSessionMode();
    const accountKey = mode === "auth"
        ? (localStorage.getItem("mathsActiveAccountKey") || "guest")
        : "guest";

    profileStore.setActiveAccountKey(accountKey);
    profileStore.loadAccountState(accountKey, {
        accountKey,
        profileCount: 1,
        profileNames: [mode === "guest" ? "Guest" : "Player"]
    });
}

ensureProfileContext();
