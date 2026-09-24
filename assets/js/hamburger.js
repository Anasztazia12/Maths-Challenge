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

    const ICONS = {
        home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
        play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
        weekly: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
        shop: '<path d="M4 8h16l-1.5 12h-13z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        results: '<path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/>',
        edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
        install: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
        logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
        delete: '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/>'
    };

    const NAV_LINKS = [
        { href: "home.html", label: "Home", icon: "home" },
        { href: "game.html", label: "Play Game", icon: "play" },
        { href: "weekly.html", label: "Weekly Challenge", icon: "weekly" },
        { href: "shop.html", label: "Avatar Shop", icon: "shop" }
    ];

    function iconSvg(name) {
        return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
    }

    function currentPageName() {
        const parts = window.location.pathname.split(/[\\/]/);
        return (parts.pop() || "home.html").toLowerCase();
    }

    function withIcon(element, iconName) {
        if (!element || element.querySelector("svg")) return;
        const label = document.createElement("span");
        label.textContent = element.textContent.trim();
        element.textContent = "";
        element.insertAdjacentHTML("afterbegin", iconSvg(iconName));
        element.appendChild(label);
    }

    function buildGroup(label, children) {
        const group = document.createElement("div");
        group.className = "menu-group";
        if (label) {
            const heading = document.createElement("span");
            heading.className = "menu-group-label";
            heading.textContent = label;
            group.appendChild(heading);
        }
        children.filter(Boolean).forEach((child) => group.appendChild(child));
        return group;
    }

    // Re-arranges the page's menu into: page links, account items, app items.
    function buildMenuLayout(panel) {
        if (panel.classList.contains("menu-v2")) return;
        const page = currentPageName();

        const links = NAV_LINKS.map((link) => {
            const anchor = document.createElement("a");
            anchor.className = "menu-item";
            anchor.href = link.href;
            anchor.innerHTML = `${iconSvg(link.icon)}<span>${link.label}</span>`;
            if (page === link.href) {
                anchor.classList.add("is-current");
                anchor.setAttribute("aria-current", "page");
            }
            return anchor;
        });

        const resultsBtn = document.getElementById("menu-results-btn");
        const editBtn = document.getElementById("menu-edit-profile-btn");
        const installBtn = document.getElementById("menu-install-btn");
        const logoutBtn = document.getElementById("menu-logout-btn");
        const deleteBtn = document.getElementById("menu-delete-account-btn");

        withIcon(resultsBtn, "results");
        withIcon(editBtn, "edit");
        withIcon(logoutBtn, "logout");
        withIcon(deleteBtn, "delete");
        if (installBtn && !installBtn.querySelector("svg")) {
            // pwa-install.js rewrites this button's text, so the icon goes in front of a text node.
            installBtn.insertAdjacentHTML("afterbegin", iconSvg("install"));
        }

        panel.textContent = "";
        panel.appendChild(buildGroup("Go to", links));
        panel.appendChild(buildGroup("Account", [resultsBtn, editBtn]));
        panel.appendChild(buildGroup("", [installBtn, logoutBtn, deleteBtn]));
        panel.classList.add("menu-v2");
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

        buildMenuLayout(panel);

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

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !panel.classList.contains("hidden")) {
                closePanel();
                btn.focus();
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

    window.goBackOnePage = function goBackOnePage(fallbackUrl) {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        if (fallbackUrl) {
            window.location.replace(fallbackUrl);
            return;
        }

        const sessionMode = localStorage.getItem("mathsSessionMode") || "";
        window.location.replace(sessionMode ? "home.html" : "index.html");
    };

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
