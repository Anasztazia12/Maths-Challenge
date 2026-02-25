if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fail to avoid affecting gameplay if SW registration is blocked.
    });
  });
}
