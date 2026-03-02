function openAR() {
  const overlay = document.getElementById("overlay");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    initAR();
    window.dispatchEvent(new Event("resize"));
  }, 200);
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  document.body.style.overflow = "auto";
  overlay.classList.remove("active");
}
