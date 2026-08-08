let progressFrame;

const updateProgress = () => {
  if (progressFrame) return;

  progressFrame = window.requestAnimationFrame(() => {
    const progress = document.querySelector(".reading-progress__bar");
    const page = document.documentElement;
    const total = page.scrollHeight - page.clientHeight;

    if (progress) {
      progress.style.transform = `scaleX(${total > 0 ? page.scrollTop / total : 0})`;
    }

    progressFrame = undefined;
  });
};

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress, { passive: true });

document$.subscribe(() => {
  if (!document.querySelector(".reading-progress")) {
    const meter = document.createElement("div");
    meter.className = "reading-progress";
    meter.setAttribute("aria-hidden", "true");
    meter.innerHTML = '<span class="reading-progress__bar"></span>';
    document.body.prepend(meter);
  }

  document.querySelectorAll("[data-copy-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  updateProgress();
});
