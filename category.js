/* Forty Nine Unbeaten — category pages (Art, Apparel, Gifts).

   Each page names its category with data-category on <body>. Products
   come from the single catalogue in content/products.json and are
   filtered by their Category field, so a product is entered once and
   shows up wherever it belongs. Hero and heading come from
   content/categories.json. */
(function () {
  "use strict";

  var FNU = window.FNU || {};

  function renderHero(category) {
    var link = document.querySelector("[data-hero-link]");
    var slot = document.querySelector("[data-hero-media]");

    if (link) link.href = category.hero_link || "#";
    if (!slot) return;

    if (category.hero_image) {
      var img = document.createElement("img");
      img.className = "ph--hero-sm";
      img.src = category.hero_image;
      img.alt = category.hero_alt || "";
      img.loading = "eager";
      img.decoding = "async";
      slot.replaceWith(img);
    } else {
      slot.textContent = "img";
    }
  }

  function renderEmpty(grid, name) {
    grid.textContent = "";
    var empty = document.createElement("p");
    empty.className = "grid-empty";
    empty.textContent = "Nothing in " + name + " yet — check back soon.";
    grid.appendChild(empty);
  }

  function init() {
    var name = document.body.dataset.category;
    if (!name) return;

    var get = FNU.fetchJson || function () { return Promise.resolve(null); };

    Promise.all([
      get("content/categories.json"),
      get("content/products.json")
    ]).then(function (results) {
      var categories = (results[0] && results[0].items) || [];
      var products = (results[1] && results[1].items) || [];

      var category = categories.filter(function (entry) {
        return entry.slug && entry.slug.toLowerCase() === name.toLowerCase();
      })[0] || { title: name };

      var heading = document.querySelector("[data-category-title]");
      if (heading) heading.textContent = category.title || name;
      document.title = (category.title || name) + " — Forty Nine Unbeaten";

      var intro = document.querySelector("[data-category-intro]");
      if (intro) {
        intro.textContent = category.intro || "";
        intro.hidden = !category.intro;
      }

      renderHero(category);

      var matches = products.filter(function (item) {
        return (item.category || "").toLowerCase() === name.toLowerCase();
      });

      var grid = document.querySelector("[data-grid]");
      if (!grid) return;

      if (!matches.length) {
        renderEmpty(grid, category.title || name);
        return;
      }

      if (FNU.renderProducts) FNU.renderProducts(grid, matches);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
