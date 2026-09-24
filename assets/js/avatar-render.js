// Draws a profile avatar (picture + hat, glasses, extra and background) the same way on every page.
(function () {
    // Where the head sits in each avatar picture, as fractions of the picture box.
    // fig = visible figure bounds [x0, y0, x1, y1]; cx/eye = face centre; headW = head width; top = top of head.
    const AVATAR_ANCHORS = {
        "type-photo-1": { fig: [0.341, 0.254, 0.646, 0.703], cx: 0.494, eye: 0.443, headW: 0.29, top: 0.344 },
        "type-photo-2": { fig: [0.346, 0.263, 0.658, 0.703], cx: 0.502, eye: 0.448, headW: 0.296, top: 0.351 },
        "type-photo-3": { fig: [0.315, 0.286, 0.684, 0.71], cx: 0.5, eye: 0.451, headW: 0.295, top: 0.371 },
        "type-photo-4": { fig: [0.347, 0.243, 0.639, 0.736], cx: 0.493, eye: 0.425, headW: 0.277, top: 0.327 },
        "type-photo-5": { fig: [0.348, 0.205, 0.653, 0.769], cx: 0.5, eye: 0.408, headW: 0.29, top: 0.301 },
        "type-photo-6": { fig: [0.271, 0.206, 0.729, 0.764], cx: 0.5, eye: 0.401, headW: 0.275, top: 0.301 },
        "type-photo-7": { fig: [0.342, 0.253, 0.665, 0.724], cx: 0.504, eye: 0.427, headW: 0.307, top: 0.333 },
        "type-photo-8": { fig: [0.34, 0.216, 0.655, 0.717], cx: 0.498, eye: 0.401, headW: 0.299, top: 0.301 },
        "type-photo-9": { fig: [0.062, 0.084, 0.949, 0.907], cx: 0.461, eye: 0.389, headW: 0.4, top: 0.249 },
        "type-photo-10": { fig: [0.025, 0.012, 0.973, 0.912], cx: 0.594, eye: 0.39, headW: 0.33, top: 0.237 },
        // The monsters are 200 x 220 SVGs.
        "type-monster-1": { ratio: 1.1, fig: [0.1, 0.05, 0.9, 0.93], cx: 0.5, eye: 0.445, headW: 0.6, top: 0.127 },
        "type-monster-2": { ratio: 1.1, fig: [0.12, 0.1, 0.88, 0.93], cx: 0.5, eye: 0.409, headW: 0.62, top: 0.173 },
        "type-monster-3": { ratio: 1.1, fig: [0.1, 0.03, 0.9, 0.93], cx: 0.505, eye: 0.491, headW: 0.55, top: 0.191 },
        "type-monster-4": { ratio: 1.1, fig: [0.02, 0.1, 0.98, 0.93], cx: 0.5, eye: 0.477, headW: 0.62, top: 0.25 },
        "type-robot": { ratio: 1.1, fig: [0.08, 0.03, 0.92, 0.93], cx: 0.5, eye: 0.364, headW: 0.48, top: 0.218 },
        "type-alien": { ratio: 1.1, fig: [0.2, 0.03, 0.8, 0.93], cx: 0.5, eye: 0.432, headW: 0.5, top: 0.209 },
        "type-fantasy": { ratio: 1.1, fig: [0.15, 0.06, 0.85, 0.93], cx: 0.5, eye: 0.477, headW: 0.52, top: 0.255 },
        "type-superhero": { ratio: 1.1, fig: [0.07, 0.17, 0.93, 0.93], cx: 0.5, eye: 0.355, headW: 0.33, top: 0.209 }
    };
    const DEFAULT_ANCHOR = { fig: [0.3, 0.2, 0.7, 0.75], cx: 0.5, eye: 0.42, headW: 0.3, top: 0.3 };

    // Visible part of each accessory picture (the PNGs have a lot of empty space).
    const ACCESSORY_BOUNDS = {
        "assets/accessories/hat.png": [0.242, 0.221, 0.753, 0.632],
        "assets/accessories/hat2.png": [0.201, 0.268, 0.799, 0.629],
        "assets/accessories/hat3.png": [0.126, 0.282, 0.874, 0.585],
        "assets/accessories/sunglasses.png": [0.197, 0.364, 0.785, 0.555],
        "assets/accessories/sunglasses2.png": [0.146, 0.355, 0.854, 0.604],
        "assets/accessories/sunglasses3.png": [0.106, 0.352, 0.896, 0.595]
    };

    // Items without artwork of their own are drawn with an emoji.
    const ITEM_EMOJI = {
        "hat-cap": "🧢",
        "hat-crown": "👑",
        "hat-beanie": "🧶",
        "glasses-round": "👓",
        "glasses-square": "👓",
        "acc-star-pin": "⭐",
        "acc-bow": "🎀",
        "acc-scarf": "🧣",
        "acc-bandana": "🎗️"
    };

    // Size (relative to head width) and how far each emoji hat sinks onto the head.
    const EMOJI_HAT_FIT = {
        "hat-cap": { scale: 0.8, sink: 0.2 },
        "hat-crown": { scale: 0.55, sink: 0.1 },
        "hat-beanie": { scale: 0.75, sink: 0.22 }
    };

    // The old hoodies were colour swatches that never showed on picture avatars: they count as "no outfit".
    const LEGACY_OUTFIT_IDS = new Set(["outfit-sky", "outfit-emerald", "outfit-violet", "outfit-sunset", "outfit-pink", "outfit-sport"]);

    const CAPE_STYLES = {
        "outfit-cape-red": { stops: ["#f87171", "#b91c1c"], collar: "#7f1d1d" },
        "outfit-cape-royal": { stops: ["#a78bfa", "#5b21b6"], collar: "#fbbf24" },
        "outfit-cape-gold": { stops: ["#fde68a", "#d97706"], collar: "#92400e" },
        "outfit-cape-galaxy": { stops: ["#4338ca", "#0f172a"], collar: "#a5b4fc", stars: true }
    };

    function getProfileStore() {
        return window.MathsProfileStore || null;
    }

    function getCatalogItem(category, itemId) {
        return (getProfileStore()?.AVATAR_SHOP?.[category] || []).find((item) => item.id === itemId) || null;
    }

    function getBaseImage(avatarTypeId) {
        const sources = getProfileStore()?.getAvatarBaseImageSources?.(avatarTypeId) || [];
        return sources[0] || "assets/image/avatar.png";
    }

    function pct(value) {
        return `${(value * 100).toFixed(2)}%`;
    }

    function buildImageOverlay(src, bounds, anchor, ratio, kind) {
        const [bx0, by0, bx1, by1] = bounds;
        const visibleW = anchor.headW * (kind === "hat" ? (src.endsWith("hat3.png") ? 1.3 : 1.12) : 0.86);
        const size = visibleW / (bx1 - bx0); // square image size, as a fraction of box width
        const sizeH = size / ratio; // the same size as a fraction of box height
        const left = anchor.cx - visibleW / 2 - bx0 * size;
        let top;
        if (kind === "hat") {
            const visibleH = (by1 - by0) * sizeH;
            const bottom = anchor.top + visibleH * 0.3;
            top = bottom - by1 * sizeH;
        } else {
            top = anchor.eye - ((by0 + by1) / 2) * sizeH;
        }
        return `<img class="av-layer" src="${src}" alt="" style="left:${pct(left)};top:${pct(top)};width:${pct(size)}">`;
    }

    function buildEmojiOverlay(item, anchor, ratio, kind) {
        const emoji = ITEM_EMOJI[item.id];
        if (!emoji) return "";
        let y;
        let scale;
        let anchorClass = "";
        if (kind === "hat") {
            // Sits on top of the head: the emoji's bottom edge rests just below the top of the head.
            const fit = EMOJI_HAT_FIT[item.id] || { scale: 0.7, sink: 0.15 };
            scale = fit.scale;
            y = anchor.top + (anchor.headW * fit.sink) / ratio;
            anchorClass = " is-hat";
        } else if (kind === "glasses") {
            scale = 0.62;
            y = anchor.eye;
        } else {
            scale = 0.3;
            y = anchor.eye + (anchor.headW * 0.42) / ratio;
        }
        const fontSize = anchor.headW * 100 * scale;
        return `<span class="av-emoji${anchorClass}" style="left:${pct(anchor.cx)};top:${pct(y)};font-size:${fontSize.toFixed(2)}cqw">${emoji}</span>`;
    }

    // Neck line of the figure (just under the chin), as a fraction of box height.
    function getNeckY(anchor, ratio) {
        return anchor.eye + (anchor.headW * (anchor.ratio ? 0.55 : 0.27)) / ratio;
    }

    // Drawn in a 100 x 100 SVG stretched over the picture box, so x/y are percentages of the box.
    function buildClothes(outfitId, anchor, ratio) {
        const empty = { back: "", front: "" };
        if (!outfitId || LEGACY_OUTFIT_IDS.has(outfitId)) return empty;
        const cx = anchor.cx * 100;
        const neck = getNeckY(anchor, ratio) * 100;
        const head = anchor.headW * 100;
        const svg = (body, cls) => `<svg class="av-svg ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;

        const cape = CAPE_STYLES[outfitId];
        if (cape) {
            const bottom = Math.min(99, (anchor.fig[3] - (anchor.fig[3] - anchor.fig[1]) * 0.1) * 100);
            const topHalf = head * (anchor.ratio ? 0.42 : 0.5);
            const bottomHalf = head * (anchor.ratio ? 0.85 : 0.72);
            const wave = (bottom - neck) * 0.06;
            const gradientId = `cape-${outfitId}-${Math.round(cx * 10)}-${Math.round(neck * 10)}`;
            const stars = cape.stars
                ? [[-0.4, 0.35], [0.3, 0.5], [-0.15, 0.75], [0.5, 0.8], [0.05, 0.3]].map(([dx, dy]) =>
                    `<circle cx="${(cx + dx * bottomHalf).toFixed(2)}" cy="${(neck + dy * (bottom - neck)).toFixed(2)}" r="0.7" fill="#e0e7ff"/>`).join("")
                : "";
            const back = svg(`
                <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="${cape.stops[0]}"/><stop offset="1" stop-color="${cape.stops[1]}"/>
                </linearGradient></defs>
                <path d="M ${cx - topHalf} ${neck}
                    Q ${cx - bottomHalf * 0.9} ${neck + (bottom - neck) * 0.45} ${cx - bottomHalf} ${bottom}
                    Q ${cx - bottomHalf * 0.5} ${bottom - wave} ${cx} ${bottom}
                    Q ${cx + bottomHalf * 0.5} ${bottom - wave} ${cx + bottomHalf} ${bottom}
                    Q ${cx + bottomHalf * 0.9} ${neck + (bottom - neck) * 0.45} ${cx + topHalf} ${neck} Z"
                    fill="url(#${gradientId})" stroke="rgba(0,0,0,0.35)" stroke-width="0.5"/>
                ${stars}`, "is-back");
            // On the round monster bodies a collar strap reads as a belt, so they only get the clasp.
            const collar = anchor.ratio ? "" : `
                <path d="M ${cx - topHalf * 0.8} ${neck - 1} Q ${cx} ${neck + head * 0.1} ${cx + topHalf * 0.8} ${neck - 1}"
                    fill="none" stroke="${cape.collar}" stroke-width="${(head * 0.06).toFixed(2)}" stroke-linecap="round"/>`;
            const front = svg(`${collar}
                <circle cx="${cx}" cy="${neck + head * 0.03}" r="${(head * 0.05).toFixed(2)}" fill="#fbbf24" stroke="#92400e" stroke-width="0.4"/>`, "is-front");
            return { back, front };
        }

        const u = head / 10; // one tenth of the head width
        if (outfitId === "outfit-bowtie") {
            return { back: "", front: svg(`
                <path d="M ${cx} ${neck + u * 0.6} L ${cx - u * 2.4} ${neck - u * 0.6} L ${cx - u * 2.4} ${neck + u * 1.8} Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.4"/>
                <path d="M ${cx} ${neck + u * 0.6} L ${cx + u * 2.4} ${neck - u * 0.6} L ${cx + u * 2.4} ${neck + u * 1.8} Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.4"/>
                <rect x="${cx - u * 0.6}" y="${neck - u * 0.1}" width="${u * 1.2}" height="${u * 1.4}" rx="${u * 0.3}" fill="#991b1b"/>`, "is-front") };
        }
        if (outfitId === "outfit-tie") {
            return { back: "", front: svg(`
                <path d="M ${cx - u * 0.9} ${neck - u * 0.2} L ${cx + u * 0.9} ${neck - u * 0.2} L ${cx + u * 0.6} ${neck + u * 1.2} L ${cx - u * 0.6} ${neck + u * 1.2} Z" fill="#1d4ed8"/>
                <path d="M ${cx - u * 0.6} ${neck + u * 1.2} L ${cx + u * 0.6} ${neck + u * 1.2} L ${cx + u * 1.1} ${neck + u * 4.6} L ${cx} ${neck + u * 5.6} L ${cx - u * 1.1} ${neck + u * 4.6} Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="0.4"/>
                <path d="M ${cx - u * 0.8} ${neck + u * 2.4} L ${cx + u * 0.9} ${neck + u * 2.0} M ${cx - u * 0.9} ${neck + u * 3.6} L ${cx + u * 1.0} ${neck + u * 3.2}" stroke="#93c5fd" stroke-width="${(u * 0.35).toFixed(2)}"/>`, "is-front") };
        }
        if (outfitId === "outfit-medal") {
            const medalY = neck + u * 3.6;
            return { back: "", front: svg(`
                <path d="M ${cx - u * 2.2} ${neck - u * 0.4} L ${cx - u * 0.5} ${medalY} M ${cx + u * 2.2} ${neck - u * 0.4} L ${cx + u * 0.5} ${medalY}" stroke="#2563eb" stroke-width="${(u * 0.9).toFixed(2)}" stroke-linecap="round"/>
                <circle cx="${cx}" cy="${medalY + u * 1.1}" r="${(u * 1.6).toFixed(2)}" fill="#fbbf24" stroke="#b45309" stroke-width="0.6"/>
                <circle cx="${cx}" cy="${medalY + u * 1.1}" r="${(u * 1.0).toFixed(2)}" fill="none" stroke="#fde68a" stroke-width="0.5"/>`, "is-front") };
        }
        return empty;
    }

    function buildOverlay(category, itemId, anchor, ratio) {
        const item = getCatalogItem(category, itemId);
        if (!item || /-none$/.test(item.id)) return "";
        const kind = category === "hat" ? "hat" : category === "glasses" ? "glasses" : "accessory";
        if (item.imagePath && ACCESSORY_BOUNDS[item.imagePath]) {
            return buildImageOverlay(item.imagePath, ACCESSORY_BOUNDS[item.imagePath], anchor, ratio, kind);
        }
        return buildEmojiOverlay(item, anchor, ratio, kind);
    }

    // options.layers: draw hat/glasses/extra (default true)
    // options.background: draw the avatar background (default true)
    // options.fill: how much of the stage the figure fills; options.centerY: vertical centre.
    function buildAvatarHtml(avatar, options = {}) {
        const showLayers = options.layers !== false;
        const showBackground = options.background !== false;
        const anchor = AVATAR_ANCHORS[avatar?.avatarType] || DEFAULT_ANCHOR;
        const ratio = anchor.ratio || 1;
        const [fx0, fy0, fx1, fy1] = anchor.fig;
        const fill = options.fill || 0.8;
        // Scale the picture so the figure fills the stage, then centre it.
        const scale = Math.min((fill * 0.82) / (fx1 - fx0), fill / ((fy1 - fy0) * ratio));
        const left = 0.5 - scale * ((fx0 + fx1) / 2);
        const top = (options.centerY || 0.55) - scale * ((fy0 + fy1) / 2) * ratio;
        const background = showBackground ? getCatalogItem("background", avatar?.background)?.color : "";

        const clothes = showLayers ? buildClothes(avatar?.outfit, anchor, ratio) : { back: "", front: "" };
        const layers = showLayers ? [
            clothes.front,
            buildOverlay("accessory", avatar?.accessory, anchor, ratio),
            buildOverlay("glasses", avatar?.glasses, anchor, ratio),
            buildOverlay("hat", avatar?.hat, anchor, ratio)
        ].join("") : "";

        return `<div class="av-stage${showBackground ? "" : " is-bare"}"${background ? ` style="--av-bg:${background}"` : ""}>
            <div class="av-box" style="left:${pct(left)};top:${pct(top)};width:${pct(scale)};aspect-ratio:1 / ${ratio}">
                ${clothes.back}
                <img class="av-base" src="${getBaseImage(avatar?.avatarType)}" alt="">
                ${layers}
            </div>
        </div>`;
    }

    window.MathsAvatar = {
        buildAvatarHtml,
        LEGACY_OUTFIT_IDS,
        getCatalogItem,
        ITEM_EMOJI,
        ACCESSORY_BOUNDS
    };
})();
