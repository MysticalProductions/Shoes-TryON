function openAR() {
  const overlay = document.getElementById("overlay");
  overlay.classList.add("active");

  document.body.style.overflow = "hidden";

  // Force resize so WebARRocks recalculates properly
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 200);
}

function closeAR() {
  const overlay = document.getElementById("overlay");
  overlay.classList.remove("active");

  document.body.style.overflow = "auto";
}
