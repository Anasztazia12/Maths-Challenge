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

    // ---------- Body clothes (kid characters only) ----------

    // Body landmarks of the 8 kid pictures, as fractions of the picture box.
    // neck = top of the collar, shL/shR = outer shoulder (sleeve) edges, slv = sleeve bottom,
    // tL/tR = torso sides, hem = bottom of the top / waist, low = bottom of shorts or skirt,
    // lowL/lowR = widest point of whatever the kid wears below the waist.
    const KID_BODIES = {
        "type-photo-1": { neck: 0.54, shL: 0.425, shR: 0.57, slv: 0.585, tL: 0.445, tR: 0.545, hem: 0.62, low: 0.665, lowL: 0.445, lowR: 0.545 },
        "type-photo-2": { neck: 0.535, shL: 0.43, shR: 0.565, slv: 0.58, tL: 0.445, tR: 0.55, hem: 0.605, low: 0.645, lowL: 0.44, lowR: 0.555 },
        "type-photo-3": { neck: 0.53, shL: 0.43, shR: 0.57, slv: 0.58, tL: 0.45, tR: 0.545, hem: 0.605, low: 0.645, lowL: 0.435, lowR: 0.565 },
        "type-photo-4": { neck: 0.505, shL: 0.404, shR: 0.589, slv: 0.6, tL: 0.432, tR: 0.564, hem: 0.625, low: 0.665, lowL: 0.43, lowR: 0.565 },
        "type-photo-5": { neck: 0.49, shL: 0.389, shR: 0.611, slv: 0.593, tL: 0.418, tR: 0.586, hem: 0.632, low: 0.686, lowL: 0.42, lowR: 0.585 },
        "type-photo-6": { neck: 0.49, shL: 0.396, shR: 0.603, slv: 0.586, tL: 0.429, tR: 0.571, hem: 0.621, low: 0.671, lowL: 0.43, lowR: 0.575 },
        "type-photo-7": { neck: 0.515, shL: 0.425, shR: 0.571, slv: 0.555, tL: 0.445, tR: 0.555, hem: 0.585, low: 0.668, lowL: 0.415, lowR: 0.585 },
        "type-photo-8": { neck: 0.5, shL: 0.404, shR: 0.593, slv: 0.564, tL: 0.436, tR: 0.564, hem: 0.604, low: 0.657, lowL: 0.435, lowR: 0.565 }
    };

    // Each outfit: a top, an optional bottom, and small details.
    const CLOTHES_STYLES = {
        "clothes-blue-tee": { top: { color: "#3b82f6", shade: "#1d4ed8" }, bottom: { type: "pants", color: "#1e3a8a", seam: "#60a5fa" } },
        "clothes-pink-tee": { top: { color: "#f472b6", shade: "#db2777", heart: true }, bottom: { type: "skirt", color: "#be185d", pleats: true } },
        "clothes-blue-hoodie": { top: { color: "#2563eb", shade: "#1e40af", long: true, hood: true, pocket: true }, bottom: { type: "pants", color: "#334155", seam: "#64748b" } },
        "clothes-pink-hoodie": { top: { color: "#ec4899", shade: "#be185d", long: true, hood: true, pocket: true }, bottom: { type: "pants", color: "#6b21a8", seam: "#a855f7" } },
        "clothes-summer-dress": { top: { color: "#fde047", shade: "#eab308", dots: "#f97316" }, bottom: { type: "skirt", color: "#facc15", dots: "#f97316", flare: 0.03 } },
        "clothes-school-boy": { top: { color: "#f8fafc", shade: "#cbd5e1", collar: "#ffffff", tie: "#b91c1c", buttons: true }, bottom: { type: "pants", color: "#1f2937", seam: "#475569" } },
        "clothes-school-girl": { top: { color: "#f8fafc", shade: "#cbd5e1", collar: "#ffffff", bow: "#b91c1c" }, bottom: { type: "skirt", color: "#1e3a8a", pleats: true } },
        "clothes-football": { top: { color: "#2563eb", shade: "#1d4ed8", number: "10", stripe: "#ffffff" }, bottom: { type: "shorts", color: "#f8fafc", seam: "#2563eb" } },
        "clothes-sport-pink": { top: { color: "#f472b6", shade: "#db2777", number: "7", stripe: "#ffffff" }, bottom: { type: "skirt", color: "#f8fafc", pleats: true, trim: "#f472b6" } },
        "clothes-basketball": { top: { color: "#f97316", shade: "#c2410c", number: "23", trim: "#111827", stripe: "#111827" }, bottom: { type: "shorts", color: "#111827", seam: "#f97316" } },
        "clothes-party-suit": { top: { color: "#1e3a8a", shade: "#172554", long: true, blazer: "#f8fafc", bowtie: "#dc2626" }, bottom: { type: "pants", color: "#172554", seam: "#1e40af" } },
        "clothes-party-dress": { top: { color: "#f472b6", shade: "#db2777", puff: true, sparkle: true, belt: "#fbbf24" }, bottom: { type: "skirt", color: "#f472b6", sparkle: true, flare: 0.035, layer: "#fbcfe8" } },
        "clothes-princess": { top: { color: "#c084fc", shade: "#9333ea", puff: true, trim: "#fbbf24", sparkle: true, belt: "#fbbf24" }, bottom: { type: "skirt", color: "#c084fc", flare: 0.045, layer: "#f5d0fe", trim: "#fbbf24", sparkle: true } }
    };

    function f(value) {
        return (value * 100).toFixed(2);
    }

    function buildTop(style, b, cx) {
        const t = style.top;
        const neckW = (b.tR - b.tL) * 0.24;
        const shY = b.neck + (b.slv - b.neck) * 0.2;
        const outL = b.shL - 0.006;
        const outR = b.shR + 0.006;
        const puff = t.puff ? 0.008 : 0;
        const parts = [];

        // Long sleeves reach down the arms.
        if (t.long) {
            const cuffY = b.hem - 0.008;
            parts.push(`<path d="M ${f(outL)} ${f(b.slv - 0.02)} L ${f(b.tL + 0.004)} ${f(b.slv - 0.01)} L ${f(b.tL - 0.002)} ${f(cuffY)} L ${f(outL + 0.006)} ${f(cuffY)} Z" fill="${t.color}" stroke="rgba(0,0,0,0.45)" stroke-width="0.35"/>`);
            parts.push(`<path d="M ${f(outR)} ${f(b.slv - 0.02)} L ${f(b.tR - 0.004)} ${f(b.slv - 0.01)} L ${f(b.tR + 0.002)} ${f(cuffY)} L ${f(outR - 0.006)} ${f(cuffY)} Z" fill="${t.color}" stroke="rgba(0,0,0,0.45)" stroke-width="0.35"/>`);
            parts.push(`<path d="M ${f(outL + 0.004)} ${f(cuffY - 0.006)} L ${f(b.tL - 0.001)} ${f(cuffY - 0.006)} M ${f(outR - 0.004)} ${f(cuffY - 0.006)} L ${f(b.tR + 0.001)} ${f(cuffY - 0.006)}" stroke="${t.shade}" stroke-width="0.8"/>`);
        }

        const tee = `M ${f(cx - neckW)} ${f(b.neck)}
            Q ${f(cx)} ${f(b.neck + (b.slv - b.neck) * 0.35)} ${f(cx + neckW)} ${f(b.neck)}
            L ${f(b.shR - 0.012)} ${f(shY)}
            Q ${f(outR + puff)} ${f(shY + 0.004)} ${f(outR + puff)} ${f(b.slv)}
            L ${f(b.tR + 0.004)} ${f(b.slv + 0.004)}
            L ${f(b.tR + 0.006)} ${f(b.hem)}
            L ${f(b.tL - 0.006)} ${f(b.hem)}
            L ${f(b.tL - 0.004)} ${f(b.slv + 0.004)}
            L ${f(outL - puff)} ${f(b.slv)}
            Q ${f(outL - puff)} ${f(shY + 0.004)} ${f(b.shL + 0.012)} ${f(shY)} Z`;
        parts.push(`<path d="${tee}" fill="${t.color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.4" stroke-linejoin="round"/>`);

        // Soft shading down one side.
        parts.push(`<path d="M ${f(b.tR - 0.012)} ${f(b.slv)} L ${f(b.tR + 0.005)} ${f(b.slv + 0.004)} L ${f(b.tR + 0.006)} ${f(b.hem - 0.002)} L ${f(b.tR - 0.01)} ${f(b.hem - 0.002)} Z" fill="${t.shade}" opacity="0.45"/>`);

        const midY = (b.slv + b.hem) / 2;
        if (t.hood) {
            parts.push(`<path d="M ${f(cx - neckW - 0.012)} ${f(b.neck + 0.004)} Q ${f(cx)} ${f(b.neck + 0.03)} ${f(cx + neckW + 0.012)} ${f(b.neck + 0.004)}" fill="none" stroke="${t.shade}" stroke-width="1.4" stroke-linecap="round"/>`);
            parts.push(`<path d="M ${f(cx - 0.008)} ${f(b.neck + 0.012)} L ${f(cx - 0.009)} ${f(b.neck + 0.03)} M ${f(cx + 0.008)} ${f(b.neck + 0.012)} L ${f(cx + 0.009)} ${f(b.neck + 0.03)}" stroke="#f8fafc" stroke-width="0.5" stroke-linecap="round"/>`);
        }
        if (t.pocket) {
            parts.push(`<path d="M ${f(cx - 0.03)} ${f(b.hem - 0.004)} L ${f(cx - 0.024)} ${f(midY + 0.004)} L ${f(cx + 0.024)} ${f(midY + 0.004)} L ${f(cx + 0.03)} ${f(b.hem - 0.004)}" fill="${t.shade}" stroke="rgba(0,0,0,0.35)" stroke-width="0.3"/>`);
        }
        if (t.collar) {
            parts.push(`<path d="M ${f(cx - neckW - 0.004)} ${f(b.neck - 0.002)} L ${f(cx)} ${f(b.neck + 0.018)} L ${f(cx - neckW + 0.01)} ${f(b.neck + 0.02)} Z M ${f(cx + neckW + 0.004)} ${f(b.neck - 0.002)} L ${f(cx)} ${f(b.neck + 0.018)} L ${f(cx + neckW - 0.01)} ${f(b.neck + 0.02)} Z" fill="${t.collar}" stroke="rgba(0,0,0,0.45)" stroke-width="0.3"/>`);
        }
        if (t.buttons) {
            [0.3, 0.55, 0.8].forEach((k) => {
                parts.push(`<circle cx="${f(cx)}" cy="${f(b.neck + 0.02 + (b.hem - b.neck - 0.025) * k)}" r="0.45" fill="#94a3b8"/>`);
            });
        }
        if (t.tie) {
            const tieTop = b.neck + 0.016;
            parts.push(`<path d="M ${f(cx - 0.006)} ${f(tieTop)} L ${f(cx + 0.006)} ${f(tieTop)} L ${f(cx + 0.009)} ${f(b.hem - 0.01)} L ${f(cx)} ${f(b.hem - 0.002)} L ${f(cx - 0.009)} ${f(b.hem - 0.01)} Z" fill="${t.tie}" stroke="rgba(0,0,0,0.4)" stroke-width="0.3"/>`);
        }
        if (t.bow) {
            const y = b.neck + 0.02;
            parts.push(`<path d="M ${f(cx)} ${f(y)} L ${f(cx - 0.018)} ${f(y - 0.01)} L ${f(cx - 0.018)} ${f(y + 0.01)} Z M ${f(cx)} ${f(y)} L ${f(cx + 0.018)} ${f(y - 0.01)} L ${f(cx + 0.018)} ${f(y + 0.01)} Z" fill="${t.bow}"/><circle cx="${f(cx)}" cy="${f(y)}" r="0.6" fill="${t.bow}"/>`);
        }
        if (t.blazer) {
            // Open jacket over a white shirt with a bow tie.
            parts.push(`<path d="M ${f(cx - neckW)} ${f(b.neck)} L ${f(cx)} ${f(b.hem - 0.01)} L ${f(cx + neckW)} ${f(b.neck)} Q ${f(cx)} ${f(b.neck + 0.012)} ${f(cx - neckW)} ${f(b.neck)} Z" fill="${t.blazer}"/>`);
            parts.push(`<path d="M ${f(cx - neckW)} ${f(b.neck)} L ${f(cx - 0.004)} ${f(midY)} M ${f(cx + neckW)} ${f(b.neck)} L ${f(cx + 0.004)} ${f(midY)}" stroke="${t.shade}" stroke-width="1"/>`);
            parts.push(`<circle cx="${f(cx + 0.012)} " cy="${f(midY + 0.012)}" r="0.5" fill="#fbbf24"/>`);
        }
        if (t.bowtie) {
            const y = b.neck + 0.012;
            parts.push(`<path d="M ${f(cx)} ${f(y)} L ${f(cx - 0.02)} ${f(y - 0.011)} L ${f(cx - 0.02)} ${f(y + 0.011)} Z M ${f(cx)} ${f(y)} L ${f(cx + 0.02)} ${f(y - 0.011)} L ${f(cx + 0.02)} ${f(y + 0.011)} Z" fill="${t.bowtie}" stroke="rgba(0,0,0,0.4)" stroke-width="0.3"/>`);
        }
        if (t.stripe) {
            parts.push(`<path d="M ${f(b.shL + 0.006)} ${f(b.slv - 0.006)} L ${f(b.tL + 0.002)} ${f(b.slv - 0.004)} M ${f(b.shR - 0.006)} ${f(b.slv - 0.006)} L ${f(b.tR - 0.002)} ${f(b.slv - 0.004)}" stroke="${t.stripe}" stroke-width="0.9"/>`);
        }
        if (t.trim) {
            parts.push(`<path d="M ${f(cx - neckW)} ${f(b.neck)} Q ${f(cx)} ${f(b.neck + (b.slv - b.neck) * 0.35)} ${f(cx + neckW)} ${f(b.neck)}" fill="none" stroke="${t.trim}" stroke-width="0.9"/>`);
        }
        if (t.number) {
            const size = (b.hem - b.slv) * 100 * 1.15;
            parts.push(`<text x="${f(cx)}" y="${f(midY + 0.004)}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" stroke="rgba(0,0,0,0.45)" stroke-width="0.3">${t.number}</text>`);
        }
        if (t.heart) {
            const y = midY;
            parts.push(`<path d="M ${f(cx)} ${f(y + 0.012)} C ${f(cx - 0.02)} ${f(y)} ${f(cx - 0.012)} ${f(y - 0.014)} ${f(cx)} ${f(y - 0.005)} C ${f(cx + 0.012)} ${f(y - 0.014)} ${f(cx + 0.02)} ${f(y)} ${f(cx)} ${f(y + 0.012)} Z" fill="#fdf2f8"/>`);
        }
        if (t.dots) {
            [[-0.025, 0.3], [0.02, 0.45], [-0.01, 0.7], [0.028, 0.8]].forEach(([dx, k]) => {
                parts.push(`<circle cx="${f(cx + dx)}" cy="${f(b.slv + (b.hem - b.slv) * k)}" r="0.6" fill="${t.dots}"/>`);
            });
        }
        if (t.sparkle) {
            [[-0.028, 0.35], [0.024, 0.6], [0.004, 0.25]].forEach(([dx, k]) => {
                parts.push(`<circle cx="${f(cx + dx)}" cy="${f(b.slv + (b.hem - b.slv) * k)}" r="0.45" fill="#ffffff" opacity="0.9"/>`);
            });
        }
        if (t.belt) {
            parts.push(`<rect x="${f(b.tL - 0.006)}" y="${f(b.hem - 0.009)}" width="${f(b.tR - b.tL + 0.012)}" height="${f(0.009)}" fill="${t.belt}" stroke="rgba(0,0,0,0.35)" stroke-width="0.25"/>`);
        }
        return parts.join("");
    }

    function buildBottom(style, b, cx) {
        const bt = style.bottom;
        if (!bt) return "";
        const waist = b.hem - 0.008;
        const parts = [];

        if (bt.type === "skirt") {
            const flare = bt.flare || 0.022;
            const hemY = b.low + 0.006;
            const left = Math.min(b.lowL, b.tL) - flare;
            const right = Math.max(b.lowR, b.tR) + flare;
            if (bt.layer) {
                parts.push(`<path d="M ${f(b.tL - 0.004)} ${f(waist)} L ${f(b.tR + 0.004)} ${f(waist)} L ${f(right + 0.006)} ${f(hemY + 0.006)} Q ${f(cx)} ${f(hemY + 0.018)} ${f(left - 0.006)} ${f(hemY + 0.006)} Z" fill="${bt.layer}" stroke="rgba(0,0,0,0.35)" stroke-width="0.3"/>`);
            }
            parts.push(`<path d="M ${f(b.tL - 0.006)} ${f(waist)} L ${f(b.tR + 0.006)} ${f(waist)} L ${f(right)} ${f(hemY)} Q ${f(cx)} ${f(hemY + 0.012)} ${f(left)} ${f(hemY)} Z" fill="${bt.color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.4" stroke-linejoin="round"/>`);
            if (bt.pleats) {
                [-0.66, -0.33, 0, 0.33, 0.66].forEach((k) => {
                    const topX = cx + k * (b.tR - b.tL) * 0.5;
                    const botX = cx + k * (right - left) * 0.5;
                    parts.push(`<path d="M ${f(topX)} ${f(waist + 0.004)} L ${f(botX)} ${f(hemY + 0.004)}" stroke="rgba(0,0,0,0.25)" stroke-width="0.35"/>`);
                });
            }
            if (bt.trim) {
                parts.push(`<path d="M ${f(right - 0.002)} ${f(hemY - 0.004)} Q ${f(cx)} ${f(hemY + 0.008)} ${f(left + 0.002)} ${f(hemY - 0.004)}" fill="none" stroke="${bt.trim}" stroke-width="0.8"/>`);
            }
            if (bt.dots) {
                [[-0.035, 0.4], [0.03, 0.55], [0, 0.8], [-0.015, 0.25]].forEach(([dx, k]) => {
                    parts.push(`<circle cx="${f(cx + dx)}" cy="${f(waist + (hemY - waist) * k)}" r="0.6" fill="${bt.dots}"/>`);
                });
            }
            if (bt.sparkle) {
                [[-0.03, 0.5], [0.028, 0.7], [0.006, 0.35], [-0.012, 0.85]].forEach(([dx, k]) => {
                    parts.push(`<circle cx="${f(cx + dx)}" cy="${f(waist + (hemY - waist) * k)}" r="0.45" fill="#ffffff" opacity="0.9"/>`);
                });
            }
            return parts.join("");
        }

        // Shorts end where the kid's own shorts or skirt end; trousers go down to the shoes.
        const bottomY = bt.type === "pants" ? b.low + 0.014 : b.low + 0.004;
        const left = Math.min(b.lowL, b.tL) - 0.008;
        const right = Math.max(b.lowR, b.tR) + 0.008;
        const crotch = waist + (bottomY - waist) * (bt.type === "pants" ? 0.35 : 0.5);
        parts.push(`<path d="M ${f(b.tL - 0.006)} ${f(waist)} L ${f(b.tR + 0.006)} ${f(waist)} L ${f(right)} ${f(bottomY)} L ${f(cx + 0.004)} ${f(bottomY)} L ${f(cx)} ${f(crotch)} L ${f(cx - 0.004)} ${f(bottomY)} L ${f(left)} ${f(bottomY)} Z" fill="${bt.color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.4" stroke-linejoin="round"/>`);
        if (bt.seam) {
            parts.push(`<path d="M ${f(right - 0.006)} ${f(waist + 0.01)} L ${f(right - 0.004)} ${f(bottomY - 0.002)} M ${f(left + 0.006)} ${f(waist + 0.01)} L ${f(left + 0.004)} ${f(bottomY - 0.002)}" stroke="${bt.seam}" stroke-width="0.6"/>`);
        }
        return parts.join("");
    }

    function buildBodyClothes(clothesId, avatarType, anchor) {
        const style = CLOTHES_STYLES[clothesId];
        const body = KID_BODIES[avatarType];
        if (!style || !body) return "";
        const cx = anchor.cx;
        // The bottom goes under the top so the shirt hangs over the waistband.
        return `<svg class="av-svg is-front" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${buildBottom(style, body, cx)}${buildTop(style, body, cx)}</svg>`;
    }

    function fitsClothes(avatarType) {
        return Boolean(KID_BODIES[avatarType]);
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
            buildBodyClothes(avatar?.clothes, avatar?.avatarType, anchor),
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
        fitsClothes,
        getCatalogItem,
        ITEM_EMOJI,
        ACCESSORY_BOUNDS
    };
})();
