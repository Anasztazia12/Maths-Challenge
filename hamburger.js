(function () {
    function onHomePage() {
        return window.location.pathname.toLowerCase().endsWith("/home.html")
            || window.location.pathname.toLowerCase().endsWith("\\home.html");
    }

    function buildActionUrl(action) {
        const target = new URL("home.html", window.location.href);
        target.searchParams.set("action", action);
        return target.toString();
    }

    function redirectToIndexAction(action) {
        window.location.href = buildActionUrl(action);
    }

    function triggerAction(action) {
        const actions = window.MathsMenuActions;
        if (onHomePage() && actions && typeof actions[action] === "function") {
            actions[action]();
            return;
        }

        redirectToIndexAction(action);
    }

    function initHamburgerMenu() {
        const wrapper = document.querySelector(".hamburger-menu-wrapper");
        const btn = document.getElementById("hamburger-btn");
        const panel = document.getElementById("hamburger-panel");
        const editBtn = document.getElementById("menu-edit-profile-btn");
        const resultsBtn = document.getElementById("menu-results-btn");
        const logoutBtn = document.getElementById("menu-logout-btn");
        const deleteBtn = document.getElementById("menu-delete-account-btn");

        if (!wrapper || !btn || !panel) return;

        function closePanel() {
            panel.classList.add("hidden");
            btn.setAttribute("aria-expanded", "false");
        }

        function togglePanel() {
            panel.classList.toggle("hidden");
            btn.setAttribute("aria-expanded", panel.classList.contains("hidden") ? "false" : "true");
        }

        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            togglePanel();
        });

        document.addEventListener("click", (event) => {
            const clickInside = event.target.closest(".hamburger-menu-wrapper");
            if (!clickInside) {
                closePanel();
            }
        });

        if (editBtn) {
            editBtn.addEventListener("click", () => {
                closePanel();
                triggerAction("edit");
            });
        }

        if (resultsBtn) {
            resultsBtn.addEventListener("click", () => {
                closePanel();
                triggerAction("results");
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                closePanel();
                triggerAction("logout");
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                closePanel();
                triggerAction("delete");
            });
        }
    }

    window.goBackToHome = function goBackToHome() {
        const sessionMode = localStorage.getItem("mathsSessionMode") || "";
        window.location.replace(sessionMode ? "home.html" : "index.html");
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initHamburgerMenu);
    } else {
        initHamburgerMenu();
    }
})();
