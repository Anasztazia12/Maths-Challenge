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
