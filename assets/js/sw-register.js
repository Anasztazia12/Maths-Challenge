if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update();

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (sessionStorage.getItem("swReloaded") === "1") return;
          sessionStorage.setItem("swReloaded", "1");
          window.location.reload();
        });
      })
      .catch(() => {
        // Silent fail to avoid affecting gameplay if SW registration is blocked.
      });
  });
}
