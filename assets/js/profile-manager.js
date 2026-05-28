(function () {
    const ACCOUNT_STATE_PREFIX = "mathsAccountState:";
    const ACTIVE_ACCOUNT_KEY = "mathsActiveAccountKey";
    const GUEST_ACCOUNT_KEY = "guest";
    const DEFAULT_PROFILE_COUNT = 1;
    const MAX_PROFILE_COUNT = 2;
    const DEFAULT_RESULT_LIMIT = 100;
    const DEFAULT_POINTS = 0;

    const AVATAR_PRESETS = [
        {
            id: "starter-photo-one",
            name: "Photo Avatar 1",
            avatar: {
                avatarType: "type-photo-1",
                eye: "eyes-classic",
                eyeColor: "eye-color-brown",
                nose: "nose-small",
                mouth: "mouth-smile",
                skin: "skin-peach",
                hairColor: "hair-color-brown",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-sky",
                outfit: "outfit-sky"
            }
        },
        {
            id: "starter-photo-two",
            name: "Photo Avatar 2",
            avatar: {
                avatarType: "type-photo-2",
                eye: "eyes-happy",
                eyeColor: "eye-color-blue",
                nose: "nose-button",
                mouth: "mouth-grin",
                skin: "skin-golden",
                hairColor: "hair-color-black",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-forest",
                outfit: "outfit-emerald"
            }
        },
        {
            id: "starter-photo-three",
            name: "Photo Avatar 3",
            avatar: {
                avatarType: "type-photo-3",
                eye: "eyes-wink",
                eyeColor: "eye-color-green",
                nose: "nose-small",
                mouth: "mouth-smile",
                skin: "skin-peach",
                hairColor: "hair-color-brown",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-sunset",
                outfit: "outfit-pink"
            }
        },
        {
            id: "starter-photo-four",
            name: "Photo Avatar 4",
            avatar: {
                avatarType: "type-photo-4",
                eye: "eyes-happy",
                eyeColor: "eye-color-violet",
                nose: "nose-button",
                mouth: "mouth-grin",
                skin: "skin-golden",
                hairColor: "hair-color-black",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-neon",
                outfit: "outfit-violet"
            }
        },
        {
            id: "starter-photo-five",
            name: "Photo Avatar 5",
            avatar: {
                avatarType: "type-photo-5",
                eye: "eyes-classic",
                eyeColor: "eye-color-blue",
                nose: "nose-tiny",
                mouth: "mouth-cool",
                skin: "skin-bronze",
                hairColor: "hair-color-red",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-candy",
                outfit: "outfit-sport"
            }
        },
        {
            id: "starter-photo-six",
            name: "Photo Avatar 6",
            avatar: {
                avatarType: "type-photo-6",
                eye: "eyes-star",
                eyeColor: "eye-color-brown",
                nose: "nose-small",
                mouth: "mouth-wow",
                skin: "skin-deep",
                hairColor: "hair-color-black",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-forest",
                outfit: "outfit-emerald"
            }
        },
        {
            id: "starter-photo-seven",
            name: "Photo Avatar 7",
            avatar: {
                avatarType: "type-photo-7",
                eye: "eyes-classic",
                eyeColor: "eye-color-blue",
                nose: "nose-small",
                mouth: "mouth-smile",
                skin: "skin-peach",
                hairColor: "hair-color-brown",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-sky",
                outfit: "outfit-sky"
            }
        },
        {
            id: "starter-photo-eight",
            name: "Photo Avatar 8",
            avatar: {
                avatarType: "type-photo-8",
                eye: "eyes-happy",
                eyeColor: "eye-color-green",
                nose: "nose-button",
                mouth: "mouth-grin",
                skin: "skin-golden",
                hairColor: "hair-color-black",
                hairLength: "hair-length-none",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-neon",
                outfit: "outfit-violet"
            }
        },
        {
            id: "starter-girl",
            name: "Girl Starter",
            avatar: {
                avatarType: "type-girl",
                eye: "eyes-classic",
                eyeColor: "eye-color-brown",
                nose: "nose-small",
                mouth: "mouth-smile",
                skin: "skin-peach",
                hairColor: "hair-color-brown",
                hairLength: "hair-length-long",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-sky",
                outfit: "outfit-pink"
            }
        },
        {
            id: "starter-boy",
            name: "Boy Starter",
            avatar: {
                avatarType: "type-boy",
                eye: "eyes-happy",
                eyeColor: "eye-color-blue",
                nose: "nose-button",
                mouth: "mouth-grin",
                skin: "skin-golden",
                hairColor: "hair-color-black",
                hairLength: "hair-length-short",
                hat: "hat-none",
                glasses: "glasses-none",
                accessory: "acc-none",
                background: "bg-forest",
                outfit: "outfit-emerald"
            }
        },
        {
            id: "starter-dog",
            name: "Puppy Starter",
            avatar: {
                avatarType: "type-dog",
                eye: "eyes-wink",
                eyeColor: "eye-color-green",
                nose: "nose-paw",
                mouth: "mouth-wow",
                skin: "skin-fur-golden",
                hairColor: "hair-color-blonde",
                hairLength: "hair-length-none",
                hat: "hat-cap",
                glasses: "glasses-none",
                accessory: "acc-bandana",
                background: "bg-sunset",
                outfit: "outfit-sunset"
            }
        },
        {
            id: "starter-heroine",
            name: "Star Heroine",
            avatar: {
                avatarType: "type-girl",
                eye: "eyes-star",
                eyeColor: "eye-color-violet",
                nose: "nose-tiny",
                mouth: "mouth-cool",
                skin: "skin-bronze",
                hairColor: "hair-color-red",
                hairLength: "hair-length-medium",
                hat: "hat-crown",
                glasses: "glasses-round",
                accessory: "acc-star-pin",
                background: "bg-neon",
                outfit: "outfit-violet"
            }
        }
    ];

    const AVATAR_SHOP = {
        avatarType: [
            { id: "type-photo-1", label: "Photo Avatar 1", glyph: "Avatar 1", cost: 0 },
            { id: "type-photo-2", label: "Photo Avatar 2", glyph: "Avatar 2", cost: 0 },
            { id: "type-photo-3", label: "Photo Avatar 3", glyph: "Avatar 3", cost: 0 },
            { id: "type-photo-4", label: "Photo Avatar 4", glyph: "Avatar 4", cost: 0 },
            { id: "type-photo-5", label: "Photo Avatar 5", glyph: "Avatar 5", cost: 0 },
            { id: "type-photo-6", label: "Photo Avatar 6", glyph: "Avatar 6", cost: 0 },
            { id: "type-photo-7", label: "Photo Avatar 7", glyph: "Avatar 7", cost: 0 },
            { id: "type-photo-8", label: "Photo Avatar 8", glyph: "Avatar 8", cost: 0 },
            { id: "type-photo-9", label: "Photo Avatar 9", glyph: "Avatar 9", cost: 50 },
            { id: "type-photo-10", label: "Photo Avatar 10", glyph: "Avatar 10", cost: 65 },
            { id: "type-girl", label: "Girl", glyph: "Girl", cost: 0 },
            { id: "type-boy", label: "Boy", glyph: "Boy", cost: 10 },
            { id: "type-dog", label: "Dog", glyph: "Dog", cost: 40 }
        ],
        eyes: [
            { id: "eyes-classic", label: "Classic Eyes", glyph: "• •", cost: 0 },
            { id: "eyes-happy", label: "Happy Eyes", glyph: "^ ^", cost: 15 },
            { id: "eyes-wink", label: "Wink Eyes", glyph: "; •", cost: 20 },
            { id: "eyes-star", label: "Star Eyes", glyph: "★ ★", cost: 30 }
        ],
        eyeColor: [
            { id: "eye-color-brown", label: "Brown Eyes", color: "#6b3f21", cost: 0 },
            { id: "eye-color-blue", label: "Blue Eyes", color: "#2563eb", cost: 10 },
            { id: "eye-color-green", label: "Green Eyes", color: "#16a34a", cost: 15 },
            { id: "eye-color-violet", label: "Violet Eyes", color: "#7c3aed", cost: 30 }
        ],
        nose: [
            { id: "nose-small", label: "Small Nose", glyph: "ˇ", cost: 0 },
            { id: "nose-button", label: "Button Nose", glyph: "●", cost: 10 },
            { id: "nose-pointy", label: "Pointy Nose", glyph: "▲", cost: 25 },
            { id: "nose-tiny", label: "Tiny Nose", glyph: "•", cost: 20 },
            { id: "nose-paw", label: "Paw Nose", glyph: "▴", cost: 25 }
        ],
        mouth: [
            { id: "mouth-smile", label: "Smile", glyph: "⌣", cost: 0 },
            { id: "mouth-grin", label: "Grin", glyph: "◡", cost: 15 },
            { id: "mouth-cool", label: "Cool", glyph: "—", cost: 20 },
            { id: "mouth-wow", label: "Wow", glyph: "◯", cost: 25 }
        ],
        skin: [
            { id: "skin-peach", label: "Peach", color: "#f9c9a4", cost: 0 },
            { id: "skin-golden", label: "Golden", color: "#e3b07c", cost: 15 },
            { id: "skin-bronze", label: "Bronze", color: "#b87f56", cost: 20 },
            { id: "skin-deep", label: "Deep", color: "#7a4b2d", cost: 30 },
            { id: "skin-fur-golden", label: "Golden Fur", color: "#d6a86e", cost: 25 },
            { id: "skin-fur-brown", label: "Brown Fur", color: "#8b5e34", cost: 40 }
        ],
        hairColor: [
            { id: "hair-color-brown", label: "Brown Hair", color: "#6d4c41", cost: 0 },
            { id: "hair-color-black", label: "Black Hair", color: "#1f2937", cost: 10 },
            { id: "hair-color-blonde", label: "Blonde Hair", color: "#fbbf24", cost: 15 },
            { id: "hair-color-red", label: "Red Hair", color: "#dc2626", cost: 30 }
        ],
        hairLength: [
            { id: "hair-length-none", label: "No Hair", glyph: "No Hair", cost: 0 },
            { id: "hair-length-short", label: "Short Hair", glyph: "Short", cost: 5 },
            { id: "hair-length-medium", label: "Medium Hair", glyph: "Medium", cost: 10 },
            { id: "hair-length-long", label: "Long Hair", glyph: "Long", cost: 15 }
        ],
        hat: [
            { id: "hat-none", label: "No Hat", glyph: "None", cost: 0 },
            { id: "hat-cap", label: "Cap", glyph: "Cap", cost: 15 },
            { id: "hat-beanie", label: "Beanie", glyph: "Beanie", cost: 25 },
            { id: "hat-crown", label: "Crown", glyph: "Crown", cost: 30 },
            { id: "hat-photo-1", label: "Street Hat", glyph: "Street", imagePath: "assets/accessories/hat.png", cost: 35 },
            { id: "hat-photo-2", label: "Pro Hat", glyph: "Pro", imagePath: "assets/accessories/hat2.png", cost: 45 },
            { id: "hat-photo-3", label: "Legend Hat", glyph: "Legend", imagePath: "assets/accessories/hat3.png", cost: 55 }
        ],
        glasses: [
            { id: "glasses-none", label: "No Glasses", glyph: "None", cost: 0 },
            { id: "glasses-round", label: "Round Glasses", glyph: "Round", cost: 15 },
            { id: "glasses-square", label: "Square Glasses", glyph: "Square", cost: 25 },
            { id: "glasses-sun", label: "Sunglasses", glyph: "Sunglasses", imagePath: "assets/accessories/sunglasses.png", cost: 30 },
            { id: "glasses-sun-color", label: "Colorful Premium Sunglasses", glyph: "Colorful", imagePath: "assets/accessories/sunglasses.png", cost: 40 },
            { id: "glasses-sun-pro", label: "Mirror Sunglasses", glyph: "Mirror", imagePath: "assets/accessories/sunglasses2.png", cost: 50 },
            { id: "glasses-sun-elite", label: "Elite Sunglasses", glyph: "Elite", imagePath: "assets/accessories/sunglasses3.png", cost: 60 }
        ],
        accessory: [
            { id: "acc-none", label: "No Accessory", glyph: "None", cost: 0 },
            { id: "acc-star-pin", label: "Star Pin", glyph: "Star Pin", cost: 10 },
            { id: "acc-bandana", label: "Bandana", glyph: "Bandana", cost: 20 },
            { id: "acc-bow", label: "Bow", glyph: "Bow", cost: 15 },
            { id: "acc-scarf", label: "Scarf", glyph: "Scarf", cost: 30 }
        ],
        background: [
            { id: "bg-sky", label: "Sky", color: "linear-gradient(180deg,#e0f2fe 0%,#60a5fa 100%)", cost: 0 },
            { id: "bg-forest", label: "Forest", color: "linear-gradient(180deg,#dcfce7 0%,#22c55e 100%)", cost: 10 },
            { id: "bg-sunset", label: "Sunset", color: "linear-gradient(135deg,#fdba74 0%,#f97316 52%,#ef4444 100%)", cost: 20 },
            { id: "bg-neon", label: "Neon", color: "repeating-linear-gradient(135deg,rgba(255,255,255,0.24) 0 10px,rgba(255,255,255,0) 10px 20px),linear-gradient(135deg,#c4b5fd 0%,#7c3aed 100%)", cost: 30 },
            { id: "bg-candy", label: "Candy", color: "radial-gradient(circle at 20% 20%,rgba(255,255,255,0.72) 0 10%,transparent 11%),linear-gradient(135deg,#f9a8d4 0%,#ec4899 100%)", cost: 40 },
            { id: "bg-rainbow", label: "Rainbow", color: "linear-gradient(90deg,#ef4444 0%,#f59e0b 17%,#facc15 34%,#22c55e 51%,#06b6d4 68%,#3b82f6 84%,#8b5cf6 100%)", cost: 50 },
            { id: "bg-galaxy", label: "Galaxy", color: "radial-gradient(circle at 15% 20%,rgba(255,255,255,0.85) 0 2px,transparent 3px),radial-gradient(circle at 75% 35%,rgba(255,255,255,0.68) 0 1.5px,transparent 2.5px),linear-gradient(135deg,#0f172a 0%,#312e81 55%,#6d28d9 100%)", cost: 60 },
            { id: "bg-ocean", label: "Ocean", color: "repeating-linear-gradient(135deg,rgba(255,255,255,0.16) 0 12px,rgba(255,255,255,0) 12px 24px),linear-gradient(180deg,#67e8f9 0%,#0ea5e9 100%)", cost: 25 },
            { id: "bg-aurora", label: "Aurora", color: "radial-gradient(circle at 20% 20%,rgba(255,255,255,0.6) 0 3px,transparent 4px),radial-gradient(circle at 70% 30%,rgba(255,255,255,0.6) 0 2px,transparent 3px),linear-gradient(135deg,#34d399 0%,#06b6d4 40%,#8b5cf6 100%)", cost: 55 },
            { id: "bg-confetti", label: "Confetti", color: "repeating-radial-gradient(circle at 20% 20%,rgba(255,255,255,0.9) 0 2px,transparent 3px 14px),linear-gradient(135deg,#f472b6 0%,#fb7185 45%,#f59e0b 100%)", cost: 45 },
            { id: "bg-dots", label: "Polka Dots", color: "radial-gradient(circle at 15% 20%,rgba(255,255,255,0.88) 0 2px,transparent 3px),radial-gradient(circle at 55% 60%,rgba(255,255,255,0.88) 0 2px,transparent 3px),linear-gradient(135deg,#f9a8d4 0%,#c084fc 100%)", cost: 35 },
            { id: "bg-stripes", label: "Candy Stripes", color: "repeating-linear-gradient(45deg,rgba(255,255,255,0.3) 0 10px,rgba(255,255,255,0) 10px 20px),linear-gradient(135deg,#fde68a 0%,#f97316 100%)", cost: 35 },
            { id: "bg-lava", label: "Lava", color: "radial-gradient(circle at 25% 30%,rgba(255,255,255,0.35) 0 8%,transparent 9%),linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#f97316 100%)", cost: 55 },
            { id: "bg-royal", label: "Royal", color: "linear-gradient(145deg,#312e81 0%,#4f46e5 45%,#7c3aed 100%)", cost: 30 },
            { id: "bg-mint-grid", label: "Mint Grid", color: "repeating-linear-gradient(0deg,rgba(255,255,255,0.22) 0 1px,transparent 1px 18px),repeating-linear-gradient(90deg,rgba(255,255,255,0.22) 0 1px,transparent 1px 18px),linear-gradient(135deg,#34d399 0%,#10b981 100%)", cost: 40 },
            { id: "bg-night-city", label: "Night City", color: "linear-gradient(180deg,#0f172a 0%,#1e1b4b 55%,#334155 100%)", cost: 45 },
            { id: "bg-sakura", label: "Sakura", color: "radial-gradient(circle at 18% 28%,rgba(255,255,255,0.8) 0 2px,transparent 3px),radial-gradient(circle at 70% 64%,rgba(255,255,255,0.75) 0 2px,transparent 3px),linear-gradient(135deg,#fecdd3 0%,#f9a8d4 55%,#fb7185 100%)", cost: 35 },
            { id: "bg-citrus", label: "Citrus", color: "linear-gradient(120deg,#fde047 0%,#f59e0b 40%,#84cc16 100%)", cost: 20 }
        ],
        outfit: [
            { id: "outfit-sky", label: "Sky Hoodie", color: "#38bdf8", cost: 0 },
            { id: "outfit-emerald", label: "Emerald Hoodie", color: "#34d399", cost: 25 },
            { id: "outfit-violet", label: "Violet Hoodie", color: "#a78bfa", cost: 30 },
            { id: "outfit-sunset", label: "Sunset Hoodie", color: "#fb7185", cost: 30 },
            { id: "outfit-pink", label: "Pink Hoodie", color: "#f472b6", cost: 20 },
            { id: "outfit-sport", label: "Sport Jacket", color: "#60a5fa", cost: 25 }
        ]
    };

    const SHOP_CATEGORY_TO_AVATAR_KEY = {
        avatarType: "avatarType",
        eyes: "eye",
        eyeColor: "eyeColor",
        nose: "nose",
        mouth: "mouth",
        skin: "skin",
        hairColor: "hairColor",
        hairLength: "hairLength",
        hat: "hat",
        glasses: "glasses",
        accessory: "accessory",
        background: "background",
        outfit: "outfit"
    };

    function toText(value) {
        return String(value ?? "").trim();
    }

    function encodeKeyPart(value) {
        return encodeURIComponent(toText(value) || GUEST_ACCOUNT_KEY);
    }

    function safeParseJson(rawValue, fallbackValue) {
        if (!rawValue) return fallbackValue;

        try {
            return JSON.parse(rawValue);
        } catch {
            return fallbackValue;
        }
    }

    function normalizeProfileCount(value) {
        return Number(value) === 2 ? 2 : DEFAULT_PROFILE_COUNT;
    }

    function getPresetById(presetId) {
        return AVATAR_PRESETS.find((item) => item.id === presetId) || AVATAR_PRESETS[0];
    }

    function getDefaultAvatarByPreset(presetId) {
        const preset = getPresetById(presetId);
        return {
            presetId: preset.id,
            ...preset.avatar
        };
    }

    function getItemIdsByCategory(category) {
        return (AVATAR_SHOP[category] || []).map((item) => item.id);
    }

    function normalizeAvatar(avatarRaw) {
        const presetId = toText(avatarRaw?.presetId) || AVATAR_PRESETS[0].id;
        const base = getDefaultAvatarByPreset(presetId);

        const nextAvatar = {
            ...base,
            ...avatarRaw,
            presetId: getPresetById(presetId).id
        };

        Object.entries(SHOP_CATEGORY_TO_AVATAR_KEY).forEach(([category, avatarKey]) => {
            const allowed = getItemIdsByCategory(category);
            if (!allowed.includes(nextAvatar[avatarKey])) {
                nextAvatar[avatarKey] = base[avatarKey];
            }
        });

        return nextAvatar;
    }

    function normalizeWardrobe(wardrobeRaw, avatar) {
        const nextWardrobe = {};

        Object.entries(SHOP_CATEGORY_TO_AVATAR_KEY).forEach(([category, avatarKey]) => {
            const allowed = getItemIdsByCategory(category);
            const rawList = Array.isArray(wardrobeRaw?.[category]) ? wardrobeRaw[category] : [];
            const cleaned = rawList.filter((id) => allowed.includes(id));
            const selectedId = avatar[avatarKey];

            if (!cleaned.includes(selectedId)) cleaned.push(selectedId);
            nextWardrobe[category] = Array.from(new Set(cleaned));
        });

        return nextWardrobe;
    }

    function normalizeProfile(profileRaw, index, accountKey) {
        const avatar = normalizeAvatar(profileRaw?.avatar);
        const wardrobe = normalizeWardrobe(profileRaw?.wardrobe, avatar);

        return {
            id: toText(profileRaw?.id) || buildProfileId(accountKey, index),
            name: buildProfileName(profileRaw?.name, index, accountKey),
            avatar,
            wardrobe
        };
    }

    function buildProfileId(accountKey, index) {
        return `${toText(accountKey) || GUEST_ACCOUNT_KEY}-profile-${index + 1}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function buildProfileName(name, index, accountKey) {
        const trimmedName = toText(name);
        if (trimmedName) return trimmedName;

        if (toText(accountKey) === GUEST_ACCOUNT_KEY && index === 0) {
            return "Guest";
        }

        return `Profile ${index + 1}`;
    }

    function buildDefaultProfiles(accountKey, profileCount, profileNames) {
        return Array.from({ length: normalizeProfileCount(profileCount) }, (_, index) => {
            const preset = AVATAR_PRESETS[index % AVATAR_PRESETS.length];
            const avatar = getDefaultAvatarByPreset(preset.id);
            return {
                id: buildProfileId(accountKey, index),
                name: buildProfileName(profileNames?.[index], index, accountKey),
                avatar,
                wardrobe: normalizeWardrobe({}, avatar)
            };
        });
    }

    function buildDefaultAccountState(options = {}) {
        const accountKey = toText(options.accountKey) || GUEST_ACCOUNT_KEY;
        const email = toText(options.email);
        const profileCount = normalizeProfileCount(options.profileCount);
        const profiles = buildDefaultProfiles(accountKey, profileCount, options.profileNames);

        return {
            accountKey,
            email,
            profileCount: profiles.length,
            profiles,
            activeProfileId: profiles[0]?.id || "",
            updatedAt: new Date().toISOString()
        };
    }

    function normalizeAccountState(rawState, options = {}) {
        const fallbackAccountKey = toText(options.accountKey) || toText(rawState?.accountKey) || GUEST_ACCOUNT_KEY;
        const fallbackEmail = toText(options.email) || toText(rawState?.email);
        const requestedProfileCount = normalizeProfileCount(options.profileCount ?? rawState?.profileCount ?? rawState?.profiles?.length);
        const fallbackNames = Array.isArray(options.profileNames) && options.profileNames.length > 0
            ? options.profileNames
            : Array.isArray(rawState?.profiles)
                ? rawState.profiles.map((profile) => profile?.name)
                : [];

        const profiles = Array.isArray(rawState?.profiles) && rawState.profiles.length > 0
            ? rawState.profiles
                .slice(0, MAX_PROFILE_COUNT)
                .map((profile, index) => normalizeProfile({ ...profile, name: profile?.name || fallbackNames[index] }, index, fallbackAccountKey))
            : buildDefaultProfiles(fallbackAccountKey, requestedProfileCount, fallbackNames);

        const activeProfileId = toText(rawState?.activeProfileId) || profiles[0]?.id || "";
        const safeActiveProfileId = profiles.some((profile) => profile.id === activeProfileId) ? activeProfileId : profiles[0]?.id || "";

        return {
            accountKey: fallbackAccountKey,
            email: fallbackEmail,
            profileCount: profiles.length,
            profiles,
            activeProfileId: safeActiveProfileId,
            updatedAt: new Date().toISOString()
        };
    }

    function getActiveAccountKey() {
        return toText(localStorage.getItem(ACTIVE_ACCOUNT_KEY)) || GUEST_ACCOUNT_KEY;
    }

    function setActiveAccountKey(accountKey) {
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, toText(accountKey) || GUEST_ACCOUNT_KEY);
    }

    function getAccountStorageKey(accountKey = getActiveAccountKey()) {
        return `${ACCOUNT_STATE_PREFIX}${encodeKeyPart(accountKey)}`;
    }

    function loadAccountState(accountKey = getActiveAccountKey(), options = {}) {
        const resolvedAccountKey = toText(accountKey) || GUEST_ACCOUNT_KEY;
        const storageKey = getAccountStorageKey(resolvedAccountKey);
        const parsedState = safeParseJson(localStorage.getItem(storageKey), null);
        const normalizedState = normalizeAccountState(parsedState, { ...options, accountKey: resolvedAccountKey });

        if (!parsedState) {
            saveAccountState(normalizedState);
        }

        return normalizedState;
    }

    function saveAccountState(state) {
        const normalizedState = normalizeAccountState(state, state || {});
        const storageKey = getAccountStorageKey(normalizedState.accountKey);
        localStorage.setItem(storageKey, JSON.stringify(normalizedState));
        return normalizedState;
    }

    function setAccountState(state) {
        const normalizedState = saveAccountState(state);
        setActiveAccountKey(normalizedState.accountKey);
        return normalizedState;
    }

    function getActiveProfile(state = loadAccountState()) {
        const normalizedState = normalizeAccountState(state, state || {});
        const activeProfile = normalizedState.profiles.find((profile) => profile.id === normalizedState.activeProfileId)
            || normalizedState.profiles[0]
            || null;

        return {
            accountKey: normalizedState.accountKey,
            email: normalizedState.email,
            profileCount: normalizedState.profileCount,
            profiles: normalizedState.profiles,
            activeProfile,
            activeProfileId: activeProfile?.id || "",
            profileName: activeProfile?.name || "Player"
        };
    }

    function setActiveProfile(profileId, accountKey = getActiveAccountKey()) {
        const state = loadAccountState(accountKey);
        if (!state.profiles.some((profile) => profile.id === profileId)) {
            return getActiveProfile(state);
        }

        state.activeProfileId = profileId;
        saveAccountState(state);
        return getActiveProfile(state);
    }

    function setProfileName(newName, accountState, profileId = null) {
        if (!accountState.profiles) accountState.profiles = [];
        const targetId = profileId || accountState.activeProfileId || "profile-1";
        const profile = accountState.profiles.find((p) => p.id === targetId);
        if (profile) {
            profile.name = newName;
        }
        return saveAccountState(accountState);
    }

    function getCurrentProfileContext() {
        return getActiveProfile(loadAccountState());
    }

    function getScopedStorageKey(baseKey, options = {}) {
        const accountKey = toText(options.accountKey) || getActiveAccountKey();
        const profileId = toText(options.profileId) || getCurrentProfileContext().activeProfileId || "profile-1";
        return `mathsScope:${encodeKeyPart(accountKey)}:${encodeKeyPart(profileId)}:${toText(baseKey)}`;
    }

    function loadScopedJson(baseKey, fallbackValue, options = {}) {
        return safeParseJson(localStorage.getItem(getScopedStorageKey(baseKey, options)), fallbackValue);
    }

    function saveScopedJson(baseKey, value, options = {}) {
        localStorage.setItem(getScopedStorageKey(baseKey, options), JSON.stringify(value));
        return value;
    }

    function toWholePoints(value) {
        return Math.max(0, Math.round(Number(value) || 0));
    }

    function getPoints(options = {}) {
        const scopedKey = getScopedStorageKey("pointsBalance", options);
        const current = toWholePoints(localStorage.getItem(scopedKey));
        localStorage.setItem(scopedKey, String(current));
        return current;
    }

    function setPoints(value, options = {}) {
        const safeValue = toWholePoints(value);
        localStorage.setItem(getScopedStorageKey("pointsBalance", options), String(safeValue));
        return safeValue;
    }

    function addPoints(amount, options = {}) {
        const safeAmount = toWholePoints(amount);
        return setPoints(getPoints(options) + safeAmount, options);
    }

    function spendPoints(amount, options = {}) {
        const safeAmount = toWholePoints(amount);
        const balance = getPoints(options);
        if (balance < safeAmount) return false;
        setPoints(balance - safeAmount, options);
        return true;
    }

    function appendScopedHistory(baseKey, entry, options = {}) {
        const currentHistory = loadScopedJson(baseKey, [], options);
        const nextHistory = [entry, ...currentHistory].slice(0, DEFAULT_RESULT_LIMIT);
        saveScopedJson(baseKey, nextHistory, options);
        return nextHistory;
    }

    function getProfileHistory(options = {}) {
        return loadScopedJson("quizResults", [], options);
    }

    function saveProfileHistory(history, options = {}) {
        return saveScopedJson("quizResults", history, options);
    }

    function addProfileResult(result, options = {}) {
        return appendScopedHistory("quizResults", result, options);
    }

    function getAvatarBaseImageSources(avatarTypeId) {
        if (avatarTypeId === "type-photo-1") {
            return ["assets/image/avatar.png"];
        }
        if (avatarTypeId === "type-photo-7") {
            return ["assets/image/avatar7.png"];
        }
        if (avatarTypeId === "type-photo-8") {
            return ["assets/image/avatar8.png"];
        }
        if (avatarTypeId === "type-photo-9") {
            return ["assets/image/avatar9.png"];
        }
        if (avatarTypeId === "type-photo-10") {
            return ["assets/image/avatar10.png"];
        }
        if (avatarTypeId === "type-photo-2") {
            return ["assets/image/avatar2.png"];
        }
        if (avatarTypeId === "type-photo-3") {
            return ["assets/image/avatar3.png"];
        }
        if (avatarTypeId === "type-photo-4") {
            return ["assets/image/avatar4.png"];
        }
        if (avatarTypeId === "type-photo-5") {
            return ["assets/image/avatar5.png"];
        }
        if (avatarTypeId === "type-photo-6") {
            return ["assets/image/avatar6.png"];
        }
        return [];
    }

    window.MathsProfileStore = {
        DEFAULT_RESULT_LIMIT,
        buildDefaultAccountState,
        buildDefaultProfiles,
        getAccountStorageKey,
        getActiveAccountKey,
        setActiveAccountKey,
        loadAccountState,
        saveAccountState,
        setAccountState,
        getActiveProfile,
        getCurrentProfileContext,
        setActiveProfile,
        setProfileName,
        getScopedStorageKey,
        loadScopedJson,
        saveScopedJson,
        getPoints,
        setPoints,
        addPoints,
        spendPoints,
        appendScopedHistory,
        getProfileHistory,
        saveProfileHistory,
        addProfileResult,
        AVATAR_PRESETS,
        AVATAR_SHOP,
        SHOP_CATEGORY_TO_AVATAR_KEY,
        getDefaultAvatarByPreset,
        normalizeAvatar,
        normalizeWardrobe,
        getAvatarBaseImageSources
    };
})();