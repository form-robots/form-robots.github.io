// Small enhancements; the page works without them.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Top bar: show the wordmark once the hero scrolls away, and track the current section.
  const topbar = document.querySelector(".topbar");
  const hero = document.querySelector(".hero");
  if (topbar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      topbar.classList.toggle("is-stuck", !entry.isIntersecting);
    }, { rootMargin: "-56px 0px 0px 0px" }).observe(hero);

    const links = [...topbar.querySelectorAll("nav a")];
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle("is-active", a === byId.get(entry.target.id)));
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  // Overview video: play button and chapters.
  const video = document.getElementById("overview");
  if (video) {
    const player = video.closest(".player");
    const chapters = [...document.querySelectorAll(".chapters button")];
    const seek = (t) => {
      const go = () => {
        video.currentTime = t;
        video.play();
      };
      if (video.readyState >= 1) go();
      else {
        video.addEventListener("loadedmetadata", go, { once: true });
        video.preload = "metadata";
        video.load();
      }
    };
    // Native controls stay off until playback starts, so they don't cover the poster.
    video.controls = false;
    player.querySelector(".play").addEventListener("click", () => video.play());
    video.addEventListener("play", () => {
      player.classList.add("is-started");
      video.controls = true;
    });
    chapters.forEach((button) => button.addEventListener("click", () => seek(Number(button.dataset.t))));
    video.addEventListener("timeupdate", () => {
      let current = chapters[0];
      for (const button of chapters) if (Number(button.dataset.t) <= video.currentTime + 0.05) current = button;
      chapters.forEach((button) => button.setAttribute("aria-current", String(button === current)));
    });
  }

  // Result clips: muted loops that play while visible; click to pause or resume.
  const clips = [...document.querySelectorAll("video.clip")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    clips.forEach((clip) => { clip.controls = true; });
  } else {
    const watcher = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting && !target.dataset.paused) target.play().catch(() => { target.controls = true; });
        else if (!isIntersecting) target.pause();
      }
    }, { threshold: 0.25 });
    clips.forEach((clip) => {
      clip.muted = true;
      watcher.observe(clip);
      clip.addEventListener("click", () => {
        if (clip.paused) {
          delete clip.dataset.paused;
          clip.play();
        } else {
          clip.dataset.paused = "1";
          clip.pause();
        }
      });
    });
  }

  // Copy buttons for code blocks.
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = document.getElementById(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = "Copied";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = "Press Ctrl+C";
      }
      setTimeout(() => { button.textContent = "Copy"; }, 1800);
    });
  });
})();
