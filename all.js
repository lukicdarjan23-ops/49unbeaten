/* Forty Nine Unbeaten — the All Products page.

   Everything in the catalogue on one page, whatever its category. The
   heading, intro, hero band and the order the products come in are set in
   the CMS under "Strana Svi proizvodi". */
(function () {
  "use strict";

  var FNU = window.FNU || {};

  var DEFAULTS = {
    title: "All Products",
    intro: "",
    hero_image: "",
    hero_alt: "",
    hero_link: "#",
    order: "mixed"
  };

  /* Deal one product from each category in turn — Art, Apparel, Gifts,
     Art, … — until every category runs dry. The result is mixed from the
     first row down, and it is the same mix on every visit, so a piece
     someone spotted is still where they left it when they come back.
     Within a category the CMS order is kept, so dragging a product to the
     top of the list still moves it up the page. */
  function mixCategories(items) {
    var buckets = {};
    var order = [];

    items.forEach(function (item) {
      var key = String(item.category || "").trim().toLowerCase() || "other";
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(item);
    });

    var out = [];
    while (out.length < items.length) {
      var dealt = 0;
      order.forEach(function (key) {
        var next = buckets[key].shift();
        if (next) {
          out.push(next);
          dealt += 1;
        }
      });
      if (!dealt) break; /* every bucket empty — nothing left to deal */
    }

    return out;
  }

  /* Fisher-Yates. A fresh order on every visit, so nothing is stuck at the
     bottom of the page forever — at the cost of a page that never looks
     the same twice. */
  function shuffle(items) {
    var out = items.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = out[i];
      out[i] = out[j];
      out[j] = swap;
    }
    return out;
  }

  function sortProducts(items, order) {
    if (order === "random") return shuffle(items);
    if (order === "cms") return items.slice();
    return mixCategories(items);
  }

  function renderEmpty(grid) {
    grid.textContent = "";
    var empty = document.createElement("p");
    empty.className = "grid-empty";
    empty.textContent = "Nothing here yet — check back soon.";
    grid.appendChild(empty);
  }

  function init() {
    var get = FNU.fetchJson || function () { return Promise.resolve(null); };

    Promise.all([
      get("content/allproducts.json"),
      get("content/products.json")
    ]).then(function (results) {
      var page = Object.assign({}, DEFAULTS, results[0] || {});
      var products = (results[1] && results[1].items) || [];

      var heading = document.querySelector("[data-page-title]");
      if (heading) heading.textContent = page.title;
      document.title = page.title + " — Forty Nine Unbeaten";

      var intro = document.querySelector("[data-page-intro]");
      if (intro) {
        intro.textContent = page.intro || "";
        intro.hidden = !page.intro;
      }

      if (FNU.renderHero) {
        FNU.renderHero(document.querySelector(".hero"), page, "ph--hero-sm");
      }

      var grid = document.querySelector("[data-grid]");
      if (!grid) return;

      if (!products.length) {
        renderEmpty(grid);
        return;
      }

      if (FNU.renderProducts) {
        FNU.renderProducts(grid, sortProducts(products, page.order));
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
