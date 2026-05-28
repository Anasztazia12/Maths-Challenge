const profileLabelEl = document.getElementById("shop-profile-label");
const pointsEl = document.getElementById("shop-points");
const avatarPreviewEl = document.getElementById("shop-avatar-preview");
const cornerAvatarEl = document.getElementById("shop-corner-avatar");
const presetListEl = document.getElementById("shop-preset-list");
const categoryTabsEl = document.getElementById("shop-category-tabs");
const categoryHeaderEl = document.getElementById("shop-category-header");
const categoryBackBtn = document.getElementById("shop-category-back-btn");
const selectedCategoryEl = document.getElementById("shop-selected-category");
const presetSectionEl = document.getElementById("shop-preset-section");
const wardrobeSectionEl = document.getElementById("shop-wardrobe-section");
const marketSectionEl = document.getElementById("shop-market-section");
const wardrobeTitleEl = document.getElementById("shop-wardrobe-title");
const wardrobeEl = document.getElementById("shop-wardrobe");
const marketTitleEl = document.getElementById("shop-market-title");
const marketEl = document.getElementById("shop-market");
const statusEl = document.getElementById("shop-status");

let activeCategory = null;
let previewAvatar = null;
const GUEST_ACCOUNT_KEY = "guest";
const ACCOUNT_STATE_PREFIX = "mathsAccountState:";

const HIDDEN_AVATAR_TYPE_IDS = new Set(["type-boy", "type-girl", "type-dog"]);
const HIDDEN_PRESET_IDS = new Set(["starter-boy", "starter-girl", "starter-dog"]);

const CATEGORY_ICONS = {
    avatarType: "👤",
    eyes: "👀",
    eyeColor: "🎨",
    nose: "👃",
    mouth: "🙂",
    skin: "🧴",
    hairColor: "🪮",
    hairLength: "✂️",
    hat: "🧢",
    glasses: "🕶️",
    accessory: "✨",
    background: "🖼️",
    outfit: "👕"
};

const CATEGORY_LABELS = {
    eyeColor: "Eye Color",
    hairColor: "Hair Color",
    glasses: "Sunglasses"
};

function getProfileStore() {
    return window.MathsProfileStore || null;
}

function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.innerText = message || "";
    statusEl.classList.toggle("save-status-error", Boolean(isError));
}

function getSessionMode() {
    return localStorage.getItem("mathsSessionMode") || "";
}

function findNonGuestAccountKey(profileStore) {
    if (!profileStore) return "";

    for (let index = 0; index < localStorage.length; index += 1) {
        const storageKey = localStorage.key(index) || "";
        if (!storageKey.startsWith(ACCOUNT_STATE_PREFIX)) continue;

        const encodedAccountKey = storageKey.slice(ACCOUNT_STATE_PREFIX.length);
        let accountKey = "";

        try {
            accountKey = decodeURIComponent(encodedAccountKey);
        } catch {
            continue;
        }

        if (!accountKey || accountKey === GUEST_ACCOUNT_KEY) continue;

        const state = profileStore.loadAccountState(accountKey);
        if (state?.accountKey && state.accountKey !== GUEST_ACCOUNT_KEY) {
            return state.accountKey;
        }
    }

    return "";
}

function resolveAccountKey(profileStore) {
    if (!profileStore) return GUEST_ACCOUNT_KEY;

    const activeAccountKey = profileStore.getActiveAccountKey?.() || GUEST_ACCOUNT_KEY;
    if (activeAccountKey && activeAccountKey !== GUEST_ACCOUNT_KEY) {
        return activeAccountKey;
    }

    if (getSessionMode() !== "auth") {
        return activeAccountKey || GUEST_ACCOUNT_KEY;
    }

    const fallbackAccountKey = findNonGuestAccountKey(profileStore);
    if (fallbackAccountKey) {
        profileStore.setActiveAccountKey(fallbackAccountKey);
        return fallbackAccountKey;
    }

    return activeAccountKey || GUEST_ACCOUNT_KEY;
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

function getCatalogItem(category, itemId) {
    const profileStore = getProfileStore();
    return (profileStore?.AVATAR_SHOP?.[category] || []).find((item) => item.id === itemId) || null;
}

function getVisibleCatalogItems(category) {
    const profileStore = getProfileStore();
    const items = profileStore?.AVATAR_SHOP?.[category] || [];
    if (category !== "avatarType") return items;
    return items.filter((item) => !HIDDEN_AVATAR_TYPE_IDS.has(item.id));
}

function getVisiblePresets() {
    const profileStore = getProfileStore();
    return (profileStore?.AVATAR_PRESETS || []).filter((preset) => {
        if (HIDDEN_PRESET_IDS.has(preset.id)) return false;
        if (preset?.avatar?.avatarType === "type-girl") return false;
        return true;
    });
}

function getAvatarBaseImageSources(avatarTypeId) {
    const profileStore = getProfileStore();
    return profileStore?.getAvatarBaseImageSources?.(avatarTypeId) || [];
}

function getGlassesImageSources(glassesItem) {
    if (glassesItem?.imagePath) return [glassesItem.imagePath];
    return [];
}

function getHatImageSources(hatItem) {
    if (hatItem?.imagePath) return [hatItem.imagePath];
    return [];
}

function buildImageWithFallback(sources, className, altText) {
    if (!Array.isArray(sources) || sources.length === 0) return "";
    const firstSource = sources[0];
    const fallbackSources = sources.slice(1);
    const fallbackAttr = fallbackSources.length > 0
        ? ` onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${fallbackSources[0]}';}else{this.onerror=null;this.style.display='none';}"`
        : "";
    return `<img class="${className}" src="${firstSource}" alt="${altText}" loading="lazy"${fallbackAttr}>`;
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
    const hatImageSources = getHatImageSources(hat);
    const glassesLabel = glasses?.glyph || "";
    const glassesImageSources = getGlassesImageSources(glasses);
    const accessoryLabel = accessory?.glyph || "";
    const outfitColor = outfit?.color || "#38bdf8";
    const avatarTypeLabel = avatarType?.label || "Avatar";
    const bgStyle = background?.color || "linear-gradient(180deg,#bae6fd,#60a5fa)";
    const baseImageSources = getAvatarBaseImageSources(avatar?.avatarType);
    const hasBaseImage = baseImageSources.length > 0;
    const baseImage = hasBaseImage
        ? buildImageWithFallback(baseImageSources, "avatar-base-image", `${avatarTypeLabel} base`)
        : "";
    const poseClass = avatar?.avatarType ? `pose-${avatar.avatarType}` : "";

    if (hasBaseImage) {
        return `<div class="avatar-figure ${sizeClass} ${poseClass}" style="--avatar-bg:${bgStyle};"><div class="avatar-figure-bg"></div>${baseImage}</div>`;
    }
    return `<div class="avatar-figure ${sizeClass} ${poseClass}" style="--avatar-bg:${bgStyle};--avatar-skin:${skinColor};--avatar-outfit:${outfitColor};--avatar-hair:${hairColorValue};--avatar-eye:${eyeColorValue};">
        <div class="avatar-figure-bg"></div>
        <div class="avatar-type-tag">${avatarTypeLabel}</div>
        <div class="avatar-hair">${hairLengthLabel}</div>
        <div class="avatar-head">
            <div class="avatar-eyes">${eyeGlyph}</div>
            <div class="avatar-nose">${noseGlyph}</div>
            <div class="avatar-mouth">${mouthGlyph}</div>
            ${hatLabel && hatLabel !== "None"
                ? (hatImageSources.length > 0
                    ? `<div class="avatar-hat avatar-hat-image-wrap">${buildImageWithFallback(hatImageSources, "avatar-hat-image", hat?.label || "Hat")}</div>`
                    : `<div class="avatar-hat">${hatLabel}</div>`)
                : ""}
            ${glassesLabel && glassesLabel !== "None"
                ? (glassesImageSources.length > 0
                    ? `<div class="avatar-glasses avatar-glasses-image-wrap">${buildImageWithFallback(glassesImageSources, "avatar-glasses-image", glasses?.label || "Sunglasses")}</div>`
                    : `<div class="avatar-glasses">${glassesLabel}</div>`)
                : ""}
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
    const previewProfile = previewAvatar
        ? { ...profile, avatar: previewAvatar }
        : profile;

    if (avatarPreviewEl) {
        avatarPreviewEl.innerHTML = buildFigureHtml(previewProfile, "large");
    }

    if (cornerAvatarEl) {
        cornerAvatarEl.innerHTML = `<div class="shop-corner-title">Selected Avatar</div>${buildFigureHtml(profile, "large")}`;
    }
}

function animateAvatarPreview() {
    if (avatarPreviewEl) {
        avatarPreviewEl.classList.remove("avatar-preview-pop");
        void avatarPreviewEl.offsetWidth;
        avatarPreviewEl.classList.add("avatar-preview-pop");
    }

    if (cornerAvatarEl) {
        cornerAvatarEl.classList.remove("avatar-preview-pop");
        void cornerAvatarEl.offsetWidth;
        cornerAvatarEl.classList.add("avatar-preview-pop");
    }
}

function saveState(state) {
    const profileStore = getProfileStore();
    if (!profileStore) return null;

    const accountKey = resolveAccountKey(profileStore);
    const nextState = {
        ...state,
        accountKey: state?.accountKey && state.accountKey !== GUEST_ACCOUNT_KEY
            ? state.accountKey
            : accountKey
    };

    profileStore.setActiveAccountKey(nextState.accountKey);
    return profileStore.setAccountState(nextState);
}

function previewItem(category, itemId) {
    const profileStore = getProfileStore();
    if (!profileStore) return;

    const state = getCurrentState();
    const active = getActiveProfile(state);
    if (!active) return;

    const avatarKey = profileStore.SHOP_CATEGORY_TO_AVATAR_KEY[category];
    if (!avatarKey) return;

    const item = getCatalogItem(category, itemId);
    if (!item) return;

    previewAvatar = {
        ...active.avatar,
        [avatarKey]: itemId
    };

    renderAvatarPreview(active);
    animateAvatarPreview();
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
    previewAvatar = null;
    renderAll();
    animateAvatarPreview();
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
        previewItem(category, itemId);
        setStatus("Preview only. Not enough points to buy.", true);
        return;
    }

    previewAvatar = null;

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
    animateAvatarPreview();
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
    previewAvatar = null;
    renderAll();
    animateAvatarPreview();
    setStatus(`Preset selected: ${preset.name}.`);
}

function buildItemVisual(category, item) {
    if ((category === "glasses" || category === "hat") && item.imagePath) {
        return buildImageWithFallback([item.imagePath], "shop-card-thumb", item.label || "Accessory");
    }

    if (category === "avatarType") {
        const imageSources = getAvatarBaseImageSources(item.id);
        if (imageSources.length > 0) {
            return buildImageWithFallback(imageSources, "shop-card-thumb", item.label || "Avatar");
        }
    }

    if (item.color) {
        const swatchClass = category === "background" ? "shop-card-swatch shop-card-swatch-background" : "shop-card-swatch";
        return `<span class="${swatchClass}" style="background:${item.color}"></span>`;
    }

    const glyph = item.glyph || item.label || "*";
    return `<span class="shop-card-glyph">${glyph}</span>`;
}

function buildItemCardHtml(category, item, isActive, priceLabel, mode, options = {}) {
    const isLocked = Boolean(options.isLocked);
    const activeClass = isActive ? "shop-item-active" : "";
    const lockClass = isLocked ? "shop-item-locked" : "";
    const categoryClass = category === "background" ? "shop-item-bg" : "";
    const visual = buildItemVisual(category, item);
    const action = isLocked ? "preview" : mode;
    const nameLine = category === "background"
        ? `<span class="shop-item-bg-label">${item.label}</span>`
        : "";
    const lockedLabel = isLocked ? `<span class="shop-item-not-available">Not Available</span>` : "";
    return `<button type="button" class="shop-item-btn ${categoryClass} ${activeClass} ${lockClass}" title="${item.label}" data-action="${action}" data-category="${category}" data-id="${item.id}">
        ${visual}
        ${nameLine}
        <span class="shop-card-price">${priceLabel}</span>
        ${lockedLabel}
        ${isLocked ? '<span class="shop-lock-icon">🔒</span>' : ""}
    </button>`;
}

function getCategoryLabel(category) {
    return CATEGORY_LABELS[category]
        || category.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
}

function getCategoryIcon(category) {
    return CATEGORY_ICONS[category] || "•";
}

function renderCategoryTabs() {
    const profileStore = getProfileStore();
    if (!profileStore || !categoryTabsEl) return;

    const categories = Object.keys(profileStore.AVATAR_SHOP || {});
    if (activeCategory && !categories.includes(activeCategory)) {
        activeCategory = null;
    }

    categoryTabsEl.innerHTML = categories.map((category) => {
        const selected = category === activeCategory ? "tab-active" : "";
        const label = getCategoryLabel(category);
        const icon = getCategoryIcon(category);
        return `<button type="button" class="shop-tab-btn ${selected}" data-action="tab" data-category="${category}"><span class="shop-tab-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`;
    }).join("");

    if (categoryHeaderEl) {
        categoryHeaderEl.classList.toggle("hidden", !activeCategory);
    }

    if (selectedCategoryEl) {
        selectedCategoryEl.innerText = activeCategory
            ? `Selected: ${getCategoryLabel(activeCategory)}`
            : "Selected: -";
    }

    if (presetSectionEl) {
        presetSectionEl.classList.toggle("hidden", Boolean(activeCategory));
    }

    if (wardrobeSectionEl) {
        wardrobeSectionEl.classList.toggle("hidden", !activeCategory);
    }

    if (marketSectionEl) {
        marketSectionEl.classList.toggle("hidden", !activeCategory);
    }
}

function renderPresets(profile) {
    const profileStore = getProfileStore();
    if (!presetListEl || !profileStore || !profile) return;

    presetListEl.innerHTML = getVisiblePresets().map((preset) => {
        const isActive = profile.avatar?.presetId === preset.id;
        const avatarTypeId = preset.avatar?.avatarType || "";
        const avatarTypeItem = getCatalogItem("avatarType", avatarTypeId);
        const visual = avatarTypeItem
            ? buildItemVisual("avatarType", avatarTypeItem)
            : `<span class="shop-card-glyph">${preset.name.split(" ")[0]}</span>`;
        return `<button type="button" class="shop-item-btn ${isActive ? "shop-item-active" : ""}" data-action="preset" data-id="${preset.id}" title="${preset.name}">
            ${visual}
            <span class="shop-card-price">Free</span>
        </button>`;
    }).join("");
}

function renderWardrobe(profile) {
    const profileStore = getProfileStore();
    if (!wardrobeEl || !profileStore || !profile || !activeCategory) return;

    const avatarKey = profileStore.SHOP_CATEGORY_TO_AVATAR_KEY[activeCategory];
    const selectedId = profile.avatar?.[avatarKey];
    const owned = profile.wardrobe?.[activeCategory] || [];

    const visibleIds = new Set(getVisibleCatalogItems(activeCategory).map((item) => item.id));
    const cards = owned
        .filter((itemId) => visibleIds.has(itemId))
        .map((itemId) => {
        const item = getCatalogItem(activeCategory, itemId);
        if (!item) return "";
        return buildItemCardHtml(activeCategory, item, selectedId === item.id, "Owned", "equip");
    }).join("");

    if (wardrobeTitleEl) {
        const label = getCategoryLabel(activeCategory);
        wardrobeTitleEl.innerText = `Wardrobe - ${label}`;
    }

    wardrobeEl.innerHTML = cards || '<span class="results-empty">No owned items in this category.</span>';
}

function renderMarket(profile) {
    const profileStore = getProfileStore();
    if (!marketEl || !profileStore || !profile || !activeCategory) return;

    const owned = profile.wardrobe?.[activeCategory] || [];
    const points = profileStore.getPoints();
    const cards = getVisibleCatalogItems(activeCategory).map((item) => {
        if (owned.includes(item.id)) return "";
        const isLocked = Number(item.cost) > points;
        const currencyLabel = activeCategory === "background" ? "Gold" : "pts";
        return buildItemCardHtml(activeCategory, item, false, `${item.cost} ${currencyLabel}`, "buy", { isLocked });
    }).join("");

    if (marketTitleEl) {
        const label = getCategoryLabel(activeCategory);
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
    if (activeCategory) {
        renderWardrobe(active);
        renderMarket(active);
    } else {
        if (wardrobeEl) wardrobeEl.innerHTML = '<span class="results-empty">Choose a category to open your wardrobe.</span>';
        if (marketEl) marketEl.innerHTML = '<span class="results-empty">Choose a category to open the shop.</span>';
    }
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
            previewAvatar = null;
            renderAll();
        });
    }

    if (categoryBackBtn) {
        categoryBackBtn.addEventListener("click", () => {
            activeCategory = null;
            previewAvatar = null;
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
            const previewButton = event.target.closest("button[data-action='preview']");
            if (previewButton) {
                previewItem(previewButton.dataset.category || "", previewButton.dataset.id || "");
                setStatus("Preview only. Buy this item to equip it.");
                return;
            }

            const button = event.target.closest("button[data-action='buy']");
            if (!button) return;
            purchaseItem(button.dataset.category || "", button.dataset.id || "");
        });
    }
}

setupEvents();
renderAll();
