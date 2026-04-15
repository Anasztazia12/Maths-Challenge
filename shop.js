const profileLabelEl = document.getElementById("shop-profile-label");
const pointsEl = document.getElementById("shop-points");
const avatarPreviewEl = document.getElementById("shop-avatar-preview");
const cornerAvatarEl = document.getElementById("shop-corner-avatar");
const presetListEl = document.getElementById("shop-preset-list");
const categoryTabsEl = document.getElementById("shop-category-tabs");
const wardrobeTitleEl = document.getElementById("shop-wardrobe-title");
const wardrobeEl = document.getElementById("shop-wardrobe");
const marketTitleEl = document.getElementById("shop-market-title");
const marketEl = document.getElementById("shop-market");
const statusEl = document.getElementById("shop-status");

let activeCategory = "eyes";

function getProfileStore() {
    return window.MathsProfileStore || null;
}

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.innerText = message || "";
    statusEl.classList.toggle("save-status-error", Boolean(isError));
}

function getCurrentState() {
    const profileStore = getProfileStore();
    if (!profileStore) return null;
    return profileStore.loadAccountState();
}

function getActiveProfile(state) {
    if (!state) return null;
    return state.profiles.find((item) => item.id === state.activeProfileId) || state.profiles[0] || null;
}

function getCatalogItem(category, itemId) {
    const profileStore = getProfileStore();
    return (profileStore?.AVATAR_SHOP?.[category] || []).find((item) => item.id === itemId) || null;
}

function buildFigureHtml(profile, sizeClass = "large") {
    const avatar = profile?.avatar || {};
    const avatarType = getCatalogItem("avatarType", avatar.avatarType);
    const eyes = getCatalogItem("eyes", avatar.eye);
    const eyeColor = getCatalogItem("eyeColor", avatar.eyeColor);
    const nose = getCatalogItem("nose", avatar.nose);
    const mouth = getCatalogItem("mouth", avatar.mouth);
    const skin = getCatalogItem("skin", avatar.skin);
    const hairColor = getCatalogItem("hairColor", avatar.hairColor);
    const hairLength = getCatalogItem("hairLength", avatar.hairLength);
    const hat = getCatalogItem("hat", avatar.hat);
    const glasses = getCatalogItem("glasses", avatar.glasses);
    const accessory = getCatalogItem("accessory", avatar.accessory);
    const background = getCatalogItem("background", avatar.background);
    const outfit = getCatalogItem("outfit", avatar.outfit);

    const skinColor = skin?.color || "#f9c9a4";
    const eyeGlyph = eyes?.glyph || "• •";
    const eyeColorValue = eyeColor?.color || "#111827";
    const noseGlyph = nose?.glyph || "ˇ";
    const mouthGlyph = mouth?.glyph || "⌣";
    const hairColorValue = hairColor?.color || "#6d4c41";
    const hairLengthLabel = hairLength?.glyph || "Short";
    const hatLabel = hat?.glyph || "";
    const glassesLabel = glasses?.glyph || "";
    const accessoryLabel = accessory?.glyph || "";
    const outfitColor = outfit?.color || "#38bdf8";
    const avatarTypeLabel = avatarType?.label || "Avatar";
    const bgStyle = background?.color || "linear-gradient(180deg,#bae6fd,#60a5fa)";

    return `<div class="avatar-figure ${sizeClass}" style="--avatar-bg:${bgStyle};--avatar-skin:${skinColor};--avatar-outfit:${outfitColor};--avatar-hair:${hairColorValue};--avatar-eye:${eyeColorValue};">
        <div class="avatar-figure-bg"></div>
        <div class="avatar-type-tag">${avatarTypeLabel}</div>
        <div class="avatar-hair">${hairLengthLabel}</div>
        <div class="avatar-head">
            <div class="avatar-eyes">${eyeGlyph}</div>
            <div class="avatar-nose">${noseGlyph}</div>
            <div class="avatar-mouth">${mouthGlyph}</div>
            ${hatLabel && hatLabel !== "None" ? `<div class="avatar-hat">${hatLabel}</div>` : ""}
            ${glassesLabel && glassesLabel !== "None" ? `<div class="avatar-glasses">${glassesLabel}</div>` : ""}
        </div>
        <div class="avatar-torso">
            <div class="avatar-arm avatar-arm-left"></div>
            <div class="avatar-arm avatar-arm-right"></div>
            <div class="avatar-chest"></div>
            ${accessoryLabel && accessoryLabel !== "None" ? `<div class="avatar-accessory">${accessoryLabel}</div>` : ""}
        </div>
        <div class="avatar-legs">
            <div class="avatar-leg"></div>
            <div class="avatar-leg"></div>
        </div>
    </div>`;
}

function renderAvatarPreview(profile) {
    if (avatarPreviewEl) {
        avatarPreviewEl.innerHTML = buildFigureHtml(profile, "large");
    }

    if (cornerAvatarEl) {
        cornerAvatarEl.innerHTML = `<div class="shop-corner-title">Selected Avatar</div>${buildFigureHtml(profile, "small")}`;
    }
}

function saveState(state) {
    const profileStore = getProfileStore();
    if (!profileStore) return null;
    return profileStore.setAccountState(state);
}

function equipItem(category, itemId) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = getCurrentState();
    const active = getActiveProfile(state);
    if (!state || !active) return;

    const avatarKey = profileStore.SHOP_CATEGORY_TO_AVATAR_KEY[category];
    const owned = active.wardrobe?.[category] || [];
    if (!avatarKey || !owned.includes(itemId)) return;

    state.profiles = state.profiles.map((profile) => {
        if (profile.id !== active.id) return profile;
        const nextAvatar = {
            ...profile.avatar,
            [avatarKey]: itemId
        };
        return {
            ...profile,
            avatar: nextAvatar,
            wardrobe: profileStore.normalizeWardrobe(profile.wardrobe, nextAvatar)
        };
    });

    saveState(state);
    renderAll();
    setStatus("Item equipped.");
}

function purchaseItem(category, itemId) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = getCurrentState();
    const active = getActiveProfile(state);
    if (!state || !active) return;

    const item = getCatalogItem(category, itemId);
    if (!item) return;

    const owned = active.wardrobe?.[category] || [];
    if (owned.includes(itemId)) {
        setStatus("Already in wardrobe.");
        return;
    }

    if (!profileStore.spendPoints(item.cost)) {
        setStatus("Not enough points.", true);
        return;
    }

    state.profiles = state.profiles.map((profile) => {
        if (profile.id !== active.id) return profile;
        const nextWardrobe = {
            ...profile.wardrobe,
            [category]: [...(profile.wardrobe?.[category] || []), itemId]
        };
        return {
            ...profile,
            wardrobe: profileStore.normalizeWardrobe(nextWardrobe, profile.avatar)
        };
    });

    saveState(state);
    localStorage.setItem(profileStore.getScopedStorageKey("arcadeCoins"), String(profileStore.getPoints()));
    renderAll();
    setStatus("Item purchased.");
}

function setPreset(presetId) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = getCurrentState();
    const active = getActiveProfile(state);
    if (!state || !active) return;

    const preset = (profileStore.AVATAR_PRESETS || []).find((item) => item.id === presetId);
    if (!preset) return;

    const nextAvatar = profileStore.getDefaultAvatarByPreset(preset.id);

    state.profiles = state.profiles.map((profile) => {
        if (profile.id !== active.id) return profile;
        return {
            ...profile,
            avatar: nextAvatar,
            wardrobe: profileStore.normalizeWardrobe(profile.wardrobe, nextAvatar)
        };
    });

    saveState(state);
    renderAll();
    setStatus(`Preset selected: ${preset.name}.`);
}

function buildItemVisual(category, item) {
    if (item.color) {
        return `<span class="shop-card-swatch" style="background:${item.color}"></span>`;
    }

    const glyph = item.glyph || item.label || "*";
    return `<span class="shop-card-glyph">${glyph}</span>`;
}

function buildItemCardHtml(category, item, isActive, priceLabel, mode) {
    const activeClass = isActive ? "shop-item-active" : "";
    const visual = buildItemVisual(category, item);
    return `<button type="button" class="shop-item-btn ${activeClass}" title="${item.label}" data-action="${mode}" data-category="${category}" data-id="${item.id}">
        ${visual}
        <span class="shop-card-price">${priceLabel}</span>
    </button>`;
}

function renderCategoryTabs() {
    const profileStore = getProfileStore();
    if (!profileStore || !categoryTabsEl) return;

    const categories = Object.keys(profileStore.AVATAR_SHOP || {});
    if (!categories.includes(activeCategory)) activeCategory = categories[0] || "eyes";

    categoryTabsEl.innerHTML = categories.map((category) => {
        const selected = category === activeCategory ? "tab-active" : "";
        const label = category.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
        return `<button type="button" class="shop-tab-btn ${selected}" data-action="tab" data-category="${category}">${label}</button>`;
    }).join("");
}

function renderPresets(profile) {
    const profileStore = getProfileStore();
    if (!presetListEl || !profileStore || !profile) return;

    presetListEl.innerHTML = (profileStore.AVATAR_PRESETS || []).map((preset) => {
        const isActive = profile.avatar?.presetId === preset.id;
        return `<button type="button" class="shop-item-btn ${isActive ? "shop-item-active" : ""}" data-action="preset" data-id="${preset.id}" title="${preset.name}">
            <span class="shop-card-glyph">${preset.name.split(" ")[0]}</span>
            <span class="shop-card-price">Free</span>
        </button>`;
    }).join("");
}

function renderWardrobe(profile) {
    const profileStore = getProfileStore();
    if (!wardrobeEl || !profileStore || !profile) return;

    const avatarKey = profileStore.SHOP_CATEGORY_TO_AVATAR_KEY[activeCategory];
    const selectedId = profile.avatar?.[avatarKey];
    const owned = profile.wardrobe?.[activeCategory] || [];

    const cards = owned.map((itemId) => {
        const item = getCatalogItem(activeCategory, itemId);
        if (!item) return "";
        return buildItemCardHtml(activeCategory, item, selectedId === item.id, "Owned", "equip");
    }).join("");

    if (wardrobeTitleEl) {
        const label = activeCategory.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
        wardrobeTitleEl.innerText = `Wardrobe - ${label}`;
    }

    wardrobeEl.innerHTML = cards || '<span class="results-empty">No owned items in this category.</span>';
}

function renderMarket(profile) {
    const profileStore = getProfileStore();
    if (!marketEl || !profileStore || !profile) return;

    const owned = profile.wardrobe?.[activeCategory] || [];
    const cards = (profileStore.AVATAR_SHOP[activeCategory] || []).map((item) => {
        if (owned.includes(item.id)) return "";
        return buildItemCardHtml(activeCategory, item, false, `${item.cost} pts`, "buy");
    }).join("");

    if (marketTitleEl) {
        const label = activeCategory.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
        marketTitleEl.innerText = `Shop - ${label}`;
    }

    marketEl.innerHTML = cards || '<span class="results-empty">Everything purchased in this category.</span>';
}

function renderAll() {
    const profileStore = getProfileStore();
    const state = getCurrentState();
    const active = getActiveProfile(state);
    if (!profileStore || !state || !active) return;

    if (profileLabelEl) {
        profileLabelEl.innerText = `Profile: ${active.name}`;
    }

    if (pointsEl) {
        pointsEl.innerText = `Points: ${profileStore.getPoints()}`;
    }

    renderAvatarPreview(active);
    renderCategoryTabs();
    renderPresets(active);
    renderWardrobe(active);
    renderMarket(active);
}

function setupEvents() {
    if (presetListEl) {
        presetListEl.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action='preset']");
            if (!button) return;
            setPreset(button.dataset.id || "");
        });
    }

    if (categoryTabsEl) {
        categoryTabsEl.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action='tab']");
            if (!button) return;
            activeCategory = button.dataset.category || activeCategory;
            renderAll();
        });
    }

    if (wardrobeEl) {
        wardrobeEl.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action='equip']");
            if (!button) return;
            equipItem(button.dataset.category || "", button.dataset.id || "");
        });
    }

    if (marketEl) {
        marketEl.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action='buy']");
            if (!button) return;
            purchaseItem(button.dataset.category || "", button.dataset.id || "");
        });
    }
}

setupEvents();
renderAll();
