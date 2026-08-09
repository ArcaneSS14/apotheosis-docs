let progressFrame;
let dustScene;

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

const createAmbientDust = (host) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = [];
  let width = 0;
  let height = 0;
  let frame;
  let lastTime = performance.now();
  let dustColor = "213, 173, 107";

  canvas.className = "ambient-dust";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);

  const resetParticle = (particle, initial = false) => {
    particle.x = Math.random() * width;
    particle.y = Math.random() * height;
    particle.radius = .6 + Math.random() * 1.65;
    particle.vx = (Math.random() - .5) * 2.4;
    particle.vy = -2.5 - Math.random() * 6.5;
    particle.life = 6 + Math.random() * 9;
    particle.age = initial ? Math.random() * particle.life : 0;
    particle.opacity = .13 + Math.random() * .24;
  };

  const refreshDustColor = () => {
    dustColor = getComputedStyle(document.body)
      .getPropertyValue("--ap-dust-rgb")
      .trim() || dustColor;
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    refreshDustColor();

    const desiredCount = Math.min(72, Math.max(28, Math.round(width * height / 23000)));
    while (particles.length < desiredCount) {
      const particle = {};
      resetParticle(particle, true);
      particles.push(particle);
    }
    particles.length = desiredCount;
  };

  const draw = (time) => {
    const delta = Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;

      if (particle.age >= particle.life || particle.y < -8) {
        resetParticle(particle);
        particle.y = height + 8;
      }

      const progress = particle.age / particle.life;
      const alpha = Math.sin(Math.PI * progress) * particle.opacity;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${dustColor}, ${alpha})`;
      context.fill();
    });

    frame = window.requestAnimationFrame(draw);
  };

  const start = () => {
    if (!frame && !reducedMotion.matches && !document.hidden) {
      lastTime = performance.now();
      frame = window.requestAnimationFrame(draw);
    }
  };

  const stop = () => {
    window.cancelAnimationFrame(frame);
    frame = undefined;
    context.clearRect(0, 0, width, height);
  };

  const handleVisibility = () => document.hidden ? stop() : start();
  const handleMotionPreference = () => reducedMotion.matches ? stop() : start();
  const colorObserver = new MutationObserver(refreshDustColor);

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", handleMotionPreference);
  colorObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"]
  });
  resize();
  start();

  return () => {
    stop();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", handleVisibility);
    reducedMotion.removeEventListener("change", handleMotionPreference);
    colorObserver.disconnect();
    canvas.remove();
  };
};

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

  dustScene?.();
  const main = document.querySelector(".md-main");
  dustScene = main ? createAmbientDust(main) : undefined;

  updateProgress();
});
