/**
 * Shared animation utilities for the NoCode Academy funnel.
 * Keeps every page feeling consistent without duplicating logic.
 */
(function () {
  // --- Scroll-reveal: fade + rise elements marked [data-animate] into view --
  function initScrollReveal() {
    var targets = document.querySelectorAll("[data-animate]");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("nca-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("nca-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach(function (el) { observer.observe(el); });
  }

  // --- Emoji confetti burst, e.g. on successful form submit / payment -------
  window.ncaConfetti = function (originEl) {
    var emojis = ["🎉", "✨", "🚀", "🎊", "⭐"];
    var rect = originEl ? originEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + (window.scrollY || window.pageYOffset || 0);

    for (var i = 0; i < 14; i++) {
      var span = document.createElement("span");
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      span.className = "nca-confetti-piece";
      var dx = (Math.random() - 0.5) * 260;
      var dur = 900 + Math.random() * 700;
      span.style.left = originX + "px";
      span.style.top = originY + "px";
      span.style.setProperty("--dx", dx + "px");
      span.style.setProperty("--dur", dur + "ms");
      document.body.appendChild(span);
      (function (el, duration) {
        setTimeout(function () { el.remove(); }, duration + 50);
      })(span, dur);
    }
  };

  // --- Button press micro-interaction: brief scale-down + emoji pop ---------
  function initButtonPress() {
    document.querySelectorAll("[data-bounce]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.classList.remove("nca-pop");
        // Force reflow so the animation can re-trigger on repeated clicks.
        void btn.offsetWidth;
        btn.classList.add("nca-pop");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initScrollReveal();
    initButtonPress();
  });
})();
