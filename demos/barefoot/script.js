function openAR(leftPath, rightPath) {
  const overlay = document.getElementById("overlay");

  // Store paths globally so main.js can grab them after init
  window.SELECTED_LEFT_SHOE = leftPath;
  window.SELECTED_RIGHT_SHOE = rightPath;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  // Check if initAR exists (defined in main.js)
  if (typeof initAR === "function") {
    if (!window.AR_INITIALIZED) {
      setTimeout(() => {
        initAR();
        window.dispatchEvent(new Event("resize"));
      }, 200);
    } else {
      loadShoes(leftPath, rightPath);
    }
  } else {
    console.error(
      "Critical: initAR is not defined. Check if main.js is loading correctly.",
    );
  }
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
