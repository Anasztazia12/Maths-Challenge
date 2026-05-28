// PWA Install Handler
(function () {
  let feedbackTimerId = null;

  const installBtn = document.getElementById("menu-install-btn");
  if (!installBtn) return;
  const defaultButtonText = "Add to Home Screen";

  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);

  function isStandaloneMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function setInstallVisible(isVisible) {
    installBtn.hidden = !isVisible;
    installBtn.classList.toggle("hidden", !isVisible);
  }

  function setInstalledBadgeState(isInstalled) {
    if (isInstalled) {
      installBtn.hidden = false;
      installBtn.classList.remove("hidden");
      installBtn.textContent = "Installed ✓";
      installBtn.disabled = true;
      installBtn.setAttribute("aria-disabled", "true");
      installBtn.style.opacity = "0.85";
      installBtn.style.cursor = "default";
      installBtn.style.filter = "saturate(0.75)";
      return;
    }

    installBtn.textContent = defaultButtonText;
    installBtn.disabled = false;
    installBtn.removeAttribute("aria-disabled");
    installBtn.style.opacity = "";
    installBtn.style.cursor = "";
    installBtn.style.filter = "";
  }

  function getFeedbackEl() {
    let el = document.getElementById("install-feedback");
    if (el) return el;

    el = document.createElement("div");
    el.id = "install-feedback";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "16px";
    el.style.transform = "translateX(-50%)";
    el.style.zIndex = "1200";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "10px";
    el.style.fontSize = "13px";
    el.style.fontWeight = "700";
    el.style.background = "rgba(2, 6, 23, 0.9)";
    el.style.color = "#e2e8f0";
    el.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    el.style.maxWidth = "min(92vw, 520px)";
    el.style.textAlign = "center";
    el.style.boxShadow = "0 10px 28px rgba(2, 8, 23, 0.45)";
    el.style.display = "none";
    document.body.appendChild(el);
    return el;
  }

  function showFeedback(message, isError) {
    const feedbackEl = getFeedbackEl();
    feedbackEl.textContent = message;
    feedbackEl.style.display = "block";
    feedbackEl.style.background = isError ? "rgba(127, 29, 29, 0.92)" : "rgba(2, 6, 23, 0.92)";
    feedbackEl.style.borderColor = isError ? "rgba(248, 113, 113, 0.5)" : "rgba(148, 163, 184, 0.35)";

    if (feedbackTimerId) {
      clearTimeout(feedbackTimerId);
    }

    feedbackTimerId = window.setTimeout(() => {
      feedbackEl.style.display = "none";
    }, 3600);
  }

  setInstalledBadgeState(isStandaloneMode());
  setInstallVisible(true);

  installBtn.addEventListener("click", async () => {
    if (isStandaloneMode()) {
      setInstalledBadgeState(true);
      showFeedback("App is already installed on this device.", false);
      return;
    }

    if (isIos && isSafari) {
      showFeedback("On iPhone/iPad: Safari -> Share -> Add to Home Screen.", false);
      return;
    }

    if (!window.isSecureContext) {
      showFeedback("Install requires HTTPS (or localhost).", true);
      return;
    }

    showFeedback("Install prompt is not available yet. Use browser menu: Install app / Add to Home Screen.", false);
  });

  window.addEventListener("appinstalled", () => {
    setInstalledBadgeState(true);
    setInstallVisible(true);
    showFeedback("App installed successfully.", false);
  });
})();
