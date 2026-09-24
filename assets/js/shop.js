const pointsEl = document.getElementById("shop-points");
const avatarPreviewEl = document.getElementById("shop-avatar-preview");
const categoryTabsEl = document.getElementById("shop-category-tabs");
const itemsEl = document.getElementById("shop-items");
const statusEl = document.getElementById("shop-status");
const actionTitleEl = document.getElementById("shop-action-title");
const actionSubEl = document.getElementById("shop-action-sub");
const cancelBtn = document.getElementById("shop-cancel-btn");
const confirmBtn = document.getElementById("shop-confirm-btn");

const GUEST_ACCOUNT_KEY = "guest";
const ACCOUNT_STATE_PREFIX = "mathsAccountState:";

// Only categories that visibly change the picture avatars are sold.
const SHOP_CATEGORIES = [
    { id: "avatarType", label: "Characters" },
    { id: "hat", label: "Hats" },
    { id: "glasses", label: "Glasses" },
    { id: "outfit", label: "Clothes" },
    { id: "accessory", label: "Extras" },
    { id: "background", label: "Backgrounds" }
];

const HIDDEN_AVATAR_TYPE_IDS = new Set(["type-boy", "type-girl", "type-dog"]);

// Duplicates or items without a good look: kept for owners, not sold any more.
const RETIRED_ITEM_IDS = new Set(["hat-beanie", "glasses-square", "glasses-sun-color", "acc-bandana"]);

const { buildAvatarHtml, ITEM_EMOJI, ACCESSORY_BOUNDS, LEGACY_OUTFIT_IDS } = window.MathsAvatar;
const NO_OUTFIT_ID = "outfit-sky";

let activeCategory = "avatarType";
let selected = null; // { category, id } of the item being tried on

function getProfileStore() {
    return window.MathsProfileStore || null;
}

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.innerText = message || "";
    statusEl.classList.toggle("is-error", Boolean(isError));
}

function getSessionMode() {
    return localStorage.getItem("mathsSessionMode") || "";
}

function findNonGuestAccountKey(profileStore) {
    for (let index = 0; index < localStorage.length; index += 1) {
        const storageKey = localStorage.key(index) || "";
        if (!storageKey.startsWith(ACCOUNT_STATE_PREFIX)) continue;
        let accountKey = "";
        try {
            accountKey = decodeURIComponent(storageKey.slice(ACCOUNT_STATE_PREFIX.length));
        } catch {
            continue;
        }
        if (!accountKey || accountKey === GUEST_ACCOUNT_KEY) continue;
        const state = profileStore.loadAccountState(accountKey);
        if (state?.accountKey && state.accountKey !== GUEST_ACCOUNT_KEY) return state.accountKey;
    }
    return "";
}

function resolveAccountKey(profileStore) {
    const activeAccountKey = profileStore.getActiveAccountKey?.() || GUEST_ACCOUNT_KEY;
    if (activeAccountKey !== GUEST_ACCOUNT_KEY || getSessionMode() !== "auth") return activeAccountKey;

    const fallbackAccountKey = findNonGuestAccountKey(profileStore);
    if (fallbackAccountKey) {
        profileStore.setActiveAccountKey(fallbackAccountKey);
        return fallbackAccountKey;
    }
    return activeAccountKey;
}

function getCurrentState() {
    const profileStore = getProfileStore();
    if (!profileStore) return null;
    const accountKey = resolveAccountKey(profileStore);
    profileStore.setActiveAccountKey(accountKey);
    return profileStore.loadAccountState(accountKey);
}

function getActiveProfile(state) {
    if (!state) return null;
    return state.profiles.find((item) => item.id === state.activeProfileId) || state.profiles[0] || null;
}

function saveState(state) {
    const profileStore = getProfileStore();
    const accountKey = resolveAccountKey(profileStore);
    const nextState = {
        ...state,
        accountKey: state?.accountKey && state.accountKey !== GUEST_ACCOUNT_KEY ? state.accountKey : accountKey
    };
    profileStore.setActiveAccountKey(nextState.accountKey);
    return profileStore.setAccountState(nextState);
}

function getAvatarKey(category) {
    return getProfileStore()?.SHOP_CATEGORY_TO_AVATAR_KEY?.[category] || category;
}

function getCatalogItem(category, itemId) {
    return (getProfileStore()?.AVATAR_SHOP?.[category] || []).find((item) => item.id === itemId) || null;
}

function isNoneItem(item) {
    return /-none$/.test(item?.id || "") || item?.id === NO_OUTFIT_ID;
}

// Old hoodies never showed on the picture avatars; they all count as "no outfit".
function canonicalItemId(category, itemId) {
    if (category === "outfit" && LEGACY_OUTFIT_IDS.has(itemId)) return NO_OUTFIT_ID;
    return itemId;
}

function getVisibleItems(category, profile) {
    const owned = profile?.wardrobe?.[category] || [];
    return (getProfileStore()?.AVATAR_SHOP?.[category] || []).filter((item) => {
        if (category === "avatarType" && HIDDEN_AVATAR_TYPE_IDS.has(item.id)) return false;
        if (category === "outfit" && LEGACY_OUTFIT_IDS.has(item.id) && item.id !== NO_OUTFIT_ID) return false;
        if (RETIRED_ITEM_IDS.has(item.id) && !owned.includes(item.id)) return false;
        return true;
    });
}

function getItemName(category, item) {
    if (!item) return "";
    if (item.id === NO_OUTFIT_ID) return "No Outfit";
    if (category === "avatarType" && /^type-photo-(\d+)$/.test(item.id)) {
        return `Kid ${item.id.split("-").pop()}`;
    }
    return item.label;
}

function formatGold(value) {
    return `${Math.max(0, Math.round(Number(value) || 0))} gold`;
}

// ---------- Rendering ----------

function getContext() {
    const state = getCurrentState();
    const profile = getActiveProfile(state);
    return { state, profile };
}

function getPreviewAvatar(profile) {
    if (!selected) return profile.avatar;
    return { ...profile.avatar, [getAvatarKey(selected.category)]: selected.id };
}

function getItemStatus(profile, category, item) {
    const owned = (profile.wardrobe?.[category] || []).includes(item.id);
    const wearing = canonicalItemId(category, profile.avatar?.[getAvatarKey(category)]) === item.id;
    const free = Number(item.cost) <= 0;
    return { owned: owned || free, wearing, free };
}

function renderTabs() {
    if (!categoryTabsEl) return;
    categoryTabsEl.innerHTML = SHOP_CATEGORIES.map((category) => {
        const isActive = category.id === activeCategory;
        return `<button type="button" role="tab" class="shop2-tab${isActive ? " is-active" : ""}" aria-selected="${isActive}" data-category="${category.id}">${category.label}</button>`;
    }).join("");
}

function buildThumb(category, item, profile) {
    if (category === "outfit" && !isNoneItem(item)) {
        // Clothes are shown on your own character.
        return buildAvatarHtml(
            { ...profile.avatar, outfit: item.id, hat: "hat-none", glasses: "glasses-none", accessory: "acc-none" },
            { background: false, fill: 0.95, centerY: 0.52 }
        );
    }
    if (category === "avatarType") {
        return buildAvatarHtml({ avatarType: item.id }, { layers: false, background: false, fill: 0.92, centerY: 0.5 });
    }
    if (category === "background") {
        return `<span class="shop2-swatch" style="background:${item.color}"></span>`;
    }
    if (isNoneItem(item)) {
        return `<span class="shop2-none" aria-hidden="true"></span>`;
    }
    if (item.imagePath) {
        const bounds = ACCESSORY_BOUNDS[item.imagePath] || [0, 0, 1, 1];
        const zoom = 0.8 / Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
        const shiftX = (0.5 - (bounds[0] + bounds[2]) / 2) * 100;
        const shiftY = (0.5 - (bounds[1] + bounds[3]) / 2) * 100;
        return `<img class="shop2-thumb-img" src="${item.imagePath}" alt="" style="transform:scale(${zoom.toFixed(2)}) translate(${shiftX.toFixed(1)}%, ${shiftY.toFixed(1)}%)">`;
    }
    return `<span class="shop2-emoji">${ITEM_EMOJI[item.id] || "✨"}</span>`;
}

function renderItems(profile) {
    if (!itemsEl) return;
    const points = getProfileStore().getPoints();

    itemsEl.innerHTML = getVisibleItems(activeCategory, profile).map((item) => {
        const status = getItemStatus(profile, activeCategory, item);
        const isSelected = selected?.category === activeCategory && selected.id === item.id;
        let tag;
        if (status.wearing) tag = `<span class="shop2-tag is-wearing">Wearing</span>`;
        else if (status.owned) tag = `<span class="shop2-tag is-owned">${status.free && !(profile.wardrobe?.[activeCategory] || []).includes(item.id) ? "Free" : "Owned"}</span>`;
        else tag = `<span class="shop2-tag${Number(item.cost) > points ? " is-locked" : ""}"><span class="shop2-coin small" aria-hidden="true"></span>${item.cost}</span>`;

        const classes = ["shop2-card"];
        if (status.wearing) classes.push("is-wearing");
        if (isSelected) classes.push("is-selected");
        if (!status.owned && Number(item.cost) > points) classes.push("is-locked");

        return `<button type="button" class="${classes.join(" ")}" data-id="${item.id}" aria-pressed="${isSelected}">
            <span class="shop2-thumb${activeCategory === "background" ? " is-swatch" : ""}">${buildThumb(activeCategory, item, profile)}</span>
            <span class="shop2-name">${escapeHtml(getItemName(activeCategory, item))}</span>
            ${tag}
        </button>`;
    }).join("");
}

function renderAction(profile) {
    const points = getProfileStore().getPoints();
    let title = "Your avatar";
    let sub = "Tap any item to try it on.";
    let confirmText = "";
    let confirmDisabled = false;

    if (selected) {
        const item = getCatalogItem(selected.category, selected.id);
        const status = getItemStatus(profile, selected.category, item);
        title = getItemName(selected.category, item);
        if (status.wearing) {
            sub = "You are wearing this.";
        } else if (status.owned) {
            sub = status.free ? "Free — wear it any time." : "In your wardrobe.";
            confirmText = "Wear";
        } else if (Number(item.cost) <= points) {
            sub = `Costs ${formatGold(item.cost)}. You have ${formatGold(points)}.`;
            confirmText = `Buy for ${formatGold(item.cost)}`;
        } else {
            sub = `Costs ${formatGold(item.cost)}. Keep playing to earn more!`;
            confirmText = `Need ${formatGold(item.cost - points)} more`;
            confirmDisabled = true;
        }
    }

    if (actionTitleEl) actionTitleEl.innerText = title;
    if (actionSubEl) actionSubEl.innerText = sub;
    if (cancelBtn) cancelBtn.classList.toggle("hidden", !selected);
    if (confirmBtn) {
        confirmBtn.classList.toggle("hidden", !confirmText);
        confirmBtn.innerText = confirmText;
        confirmBtn.disabled = confirmDisabled;
    }
}

function renderAll() {
    const profileStore = getProfileStore();
    const { profile } = getContext();
    if (!profileStore || !profile) return;

    if (pointsEl) pointsEl.innerText = String(profileStore.getPoints());
    if (avatarPreviewEl) avatarPreviewEl.innerHTML = buildAvatarHtml(getPreviewAvatar(profile));
    avatarPreviewEl?.classList.toggle("is-trying", Boolean(selected));
    renderTabs();
    renderItems(profile);
    renderAction(profile);
}

function popPreview() {
    if (!avatarPreviewEl) return;
    avatarPreviewEl.classList.remove("is-pop");
    void avatarPreviewEl.offsetWidth;
    avatarPreviewEl.classList.add("is-pop");
}

// ---------- Actions ----------

function wearItem(category, itemId) {
    const profileStore = getProfileStore();
    const { state, profile } = getContext();
    if (!state || !profile) return;
    const avatarKey = getAvatarKey(category);

    state.profiles = state.profiles.map((entry) => {
        if (entry.id !== profile.id) return entry;
        const nextAvatar = { ...entry.avatar, [avatarKey]: itemId };
        const nextWardrobe = {
            ...entry.wardrobe,
            [category]: Array.from(new Set([...(entry.wardrobe?.[category] || []), itemId]))
        };
        return {
            ...entry,
            avatar: nextAvatar,
            wardrobe: profileStore.normalizeWardrobe(nextWardrobe, nextAvatar)
        };
    });
    saveState(state);
}

function confirmSelection() {
    if (!selected) return;
    const profileStore = getProfileStore();
    const { profile } = getContext();
    const item = getCatalogItem(selected.category, selected.id);
    if (!profile || !item) return;

    const status = getItemStatus(profile, selected.category, item);
    const name = getItemName(selected.category, item);

    if (!status.owned) {
        if (!profileStore.spendPoints(item.cost)) {
            setStatus("Not enough gold yet.", true);
            renderAll();
            return;
        }
        localStorage.setItem(profileStore.getScopedStorageKey("arcadeCoins"), String(profileStore.getPoints()));
        wearItem(selected.category, selected.id);
        setStatus(`${name} bought and equipped.`);
    } else {
        wearItem(selected.category, selected.id);
        setStatus(`${name} equipped.`);
    }

    selected = null;
    renderAll();
    popPreview();
}

function setupEvents() {
    categoryTabsEl?.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-category]");
        if (!button) return;
        activeCategory = button.dataset.category;
        selected = null;
        setStatus("");
        renderAll();
    });

    itemsEl?.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-id]");
        if (!button) return;
        const { profile } = getContext();
        const id = button.dataset.id;
        const isWearing = canonicalItemId(activeCategory, profile?.avatar?.[getAvatarKey(activeCategory)]) === id;
        // Tapping the item you already wear, or the one being tried on, just clears the preview.
        selected = isWearing || (selected?.id === id && selected.category === activeCategory)
            ? null
            : { category: activeCategory, id };
        setStatus("");
        renderAll();
        popPreview();
    });

    cancelBtn?.addEventListener("click", () => {
        selected = null;
        setStatus("");
        renderAll();
    });

    confirmBtn?.addEventListener("click", confirmSelection);

    window.addEventListener("storage", () => renderAll());
}

setupEvents();
renderAll();
