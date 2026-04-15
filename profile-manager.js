(function () {
    const ACCOUNT_STATE_PREFIX = "mathsAccountState:";
    const ACTIVE_ACCOUNT_KEY = "mathsActiveAccountKey";
    const GUEST_ACCOUNT_KEY = "guest";
    const DEFAULT_PROFILE_COUNT = 1;
    const MAX_PROFILE_COUNT = 2;
    const DEFAULT_RESULT_LIMIT = 100;

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
        return Array.from({ length: normalizeProfileCount(profileCount) }, (_, index) => ({
            id: buildProfileId(accountKey, index),
            name: buildProfileName(profileNames?.[index], index, accountKey)
        }));
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
                .map((profile, index) => ({
                    id: toText(profile?.id) || buildProfileId(fallbackAccountKey, index),
                    name: buildProfileName(profile?.name || fallbackNames[index], index, fallbackAccountKey)
                }))
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
        getScopedStorageKey,
        loadScopedJson,
        saveScopedJson,
        appendScopedHistory,
        getProfileHistory,
        saveProfileHistory,
        addProfileResult
    };
})();