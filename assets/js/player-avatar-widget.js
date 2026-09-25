(function () {
    function getProfileStore() {
        return window.MathsProfileStore || null;
    }

    function getScopedKey(baseKey) {
        const profileStore = getProfileStore();
        return profileStore ? profileStore.getScopedStorageKey(baseKey) : baseKey;
    }

    function getCurrentAvatarSource(profileStore, profile) {
        const avatarType = profile?.avatar?.avatarType;
        const sources = profileStore?.getAvatarBaseImageSources?.(avatarType) || [];
        return sources[0] || "assets/image/avatar.png";
    }

    // The wallet lives in the profile store; arcadeCoins is only a mirror and can be stale.
    function getGoldValue(profileStore) {
        if (profileStore?.getPoints) return Math.max(0, Math.round(Number(profileStore.getPoints()) || 0));
        return Math.max(0, Math.round(Number(localStorage.getItem(getScopedKey("arcadeCoins")) || 0)));
    }

    function getWidgetHostElement() {
        const gameContainer = document.querySelector(".game-container");
        if (gameContainer) return gameContainer;
        return document.body;
    }

    function ensureWidget() {
        const profileStore = getProfileStore();
        if (!profileStore) return null;

        const state = profileStore.loadAccountState();
        const profileContext = profileStore.getActiveProfile(state);
        const activeProfile = profileContext?.activeProfile;
        if (!activeProfile) return null;

        let container = document.getElementById("player-corner-widget");
        if (!container) {
            container = document.createElement("aside");
            container.id = "player-corner-widget";
            container.className = "player-corner-widget";
        }

        const hostElement = getWidgetHostElement();
        if (container.parentElement !== hostElement) {
            hostElement.appendChild(container);
        }

        const goldValue = getGoldValue(profileStore);
        const safeName = String(activeProfile.name || "Player").trim() || "Player";
        // Show the avatar with everything it wears (hat, glasses, extra) when the shared renderer is loaded.
        const avatarHtml = window.MathsAvatar
            ? `<div class="player-corner-avatar av-corner" role="img" aria-label="Player avatar">${window.MathsAvatar.buildAvatarHtml(activeProfile.avatar, { background: false, fill: 0.8, centerY: 0.44 })}</div>`
            : `<img class="player-corner-avatar" src="${getCurrentAvatarSource(profileStore, activeProfile)}" alt="Player avatar">`;

        const html = `
            <div class="player-corner-name">${safeName}</div>
            <div class="player-corner-avatar-wrap">${avatarHtml}</div>
            <div class="player-corner-gold">Gold: ${goldValue} <span aria-hidden="true">🥇</span></div>
        `;
        // It refreshes every second; only touch the DOM when something changed.
        if (container.dataset.html !== html) {
            container.dataset.html = html;
            container.innerHTML = html;
        }

        return container;
    }

    function bootstrapWidget() {
        ensureWidget();

        window.addEventListener("storage", () => {
            ensureWidget();
        });

        setInterval(() => {
            ensureWidget();
        }, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrapWidget);
    } else {
        bootstrapWidget();
    }
})();
