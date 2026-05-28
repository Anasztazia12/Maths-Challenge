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

    function getGoldValue(profileStore) {
        const localGold = Math.max(0, Number(localStorage.getItem(getScopedKey("arcadeCoins")) || 0));
        const profileGold = Math.max(0, Number(profileStore?.getPoints?.() || 0));
        return Math.max(0, Math.round(Math.max(localGold, profileGold)));
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

        const avatarSrc = getCurrentAvatarSource(profileStore, activeProfile);
        const goldValue = getGoldValue(profileStore);
        const safeName = String(activeProfile.name || "Player").trim() || "Player";

        container.innerHTML = `
            <div class="player-corner-name">${safeName}</div>
            <div class="player-corner-avatar-wrap">
                <img class="player-corner-avatar" src="${avatarSrc}" alt="Player avatar">
            </div>
            <div class="player-corner-gold">Gold: ${goldValue} <span aria-hidden="true">🥇</span></div>
        `;

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
