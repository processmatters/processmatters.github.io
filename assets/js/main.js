(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isExpanded));
      nav.dataset.open = String(!isExpanded);
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      navToggle.setAttribute("aria-expanded", "false");
      nav.dataset.open = "false";
    });
  }

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();

