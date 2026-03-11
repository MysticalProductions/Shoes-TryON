function openAR(modelPath) {
  const overlay = document.getElementById("overlay");

  // Store the single right-shoe model path globally
  window.SELECTED_SHOE_MODEL = modelPath;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  if (!window.AR_INITIALIZED) {
    setTimeout(() => {
      if (typeof initAR === "function") {
        initAR(); // Defined in main.js
        window.dispatchEvent(new Event("resize"));
      }
    }, 200);
  } else {
    // If already initialized, just swap the model
    if (typeof loadShoe === "function") {
      loadShoe(modelPath);
    }
  }
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
