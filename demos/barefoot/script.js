/**
 * Opens the AR overlay and initializes the engine
 * @param {string} modelPath - Path to the right-shoe GLB model
 */
function openAR(modelPath) {
  const overlay = document.getElementById("overlay");

  // Store the model path globally for main.js to access during startThree
  window.SELECTED_SHOE_MODEL = modelPath;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  // If AR is not yet initialized, start the process
  if (!window.AR_INITIALIZED) {
    setTimeout(() => {
      // initAR is defined in main.js
      if (typeof initAR === "function") {
        initAR();
        window.dispatchEvent(new Event("resize"));
      }
    }, 200);
  } else {
    // If already running, just swap the model
    if (typeof loadShoe === "function") {
      loadShoe(modelPath);
    }
  }
}

/**
 * Closes the AR overlay
 */
function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
