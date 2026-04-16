// PWA Install Handler
(function () {
  let deferredPrompt = null;

  // Capture the beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (event) => {
    // Prevent the automatic install prompt
    event.preventDefault();
    deferredPrompt = event;
    
    // Show the install button
    const installBtn = document.getElementById("menu-install-btn");
    if (installBtn) {
      installBtn.classList.remove("hidden");
    }
  });

  // Handle install button click
  const installBtn = document.getElementById("menu-install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        // Trigger the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user choice
        const { outcome } = await deferredPrompt.userChoice;
        
        // Clear the saved prompt
        deferredPrompt = null;
        
        // Hide the button
        installBtn.classList.add("hidden");
      }
    });
  }

  // Handle app installed event
  window.addEventListener("appinstalled", () => {
    console.log("✅ App installed successfully!");
    const installBtn = document.getElementById("menu-install-btn");
    if (installBtn) {
      installBtn.classList.add("hidden");
    }
  });
})();
