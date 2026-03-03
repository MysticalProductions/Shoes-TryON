function openAR(modelPath) {
  const overlay = document.getElementById("overlay");
  window.SELECTED_SHOE_MODEL = modelPath;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  if (!window.AR_INITIALIZED) {
    setTimeout(() => {
      initAR();
      window.dispatchEvent(new Event("resize"));
    }, 200);
  } else {
    loadShoe(modelPath);
  }
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
