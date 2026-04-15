function getSessionMode() {
    return localStorage.getItem("mathsSessionMode") || "";
}

function hasAllowedSession() {
    return getSessionMode() === "guest" || getSessionMode() === "auth";
}

function redirectToStart() {
    if (window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/")) return;
    window.location.href = "index.html";
}

if (!hasAllowedSession()) {
    redirectToStart();
}

function ensureSessionBadge() {
    const badgeId = "session-badge";
    if (document.getElementById(badgeId)) return;

    const badge = document.createElement("div");
    badge.id = badgeId;
    badge.className = "session-badge";
    const mode = getSessionMode() === "guest" ? "guest" : "auth";
    badge.dataset.mode = mode;
    badge.innerText = mode === "guest" ? "Guest mode" : "Signed in";
    document.body.appendChild(badge);
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
ensureSessionBadge();
