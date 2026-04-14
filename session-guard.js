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

ensureSessionBadge();
