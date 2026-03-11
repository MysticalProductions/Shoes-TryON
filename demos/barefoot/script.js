function openAR(leftPath, rightPath) {
  const overlay = document.getElementById("overlay");

  // Store both paths globally for the initAR process
  window.SELECTED_LEFT_SHOE = leftPath;
  window.SELECTED_RIGHT_SHOE = rightPath;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  if (!window.AR_INITIALIZED) {
    setTimeout(() => {
      initAR();
      window.dispatchEvent(new Event("resize"));
    }, 200);
  } else {
    // If already initialized, call the dual loader
    loadShoes(leftPath, rightPath);
  }
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
