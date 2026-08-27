/* Forty Nine Unbeaten — search, and the promo band.

   Search is a panel that drops from the top over a dimmed page, opened by
   the header button. It looks through the same catalogue the shop pages
   read, matching on name, type and category.

   The promo band above the footer is filled from content/promo.json here
   too, since both are small and both belong to every page rather than to
   one of them. */
(function () {
  "use strict";

  var FNU = window.FNU || {};
  var money = FNU.money || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  /* ------------------------------------------------------------------
     Promo band
     ------------------------------------------------------------------ */

  function applyPromo(data) {
    var band = document.querySelector("[data-promo]");
    if (!band) return;

    var promo = data || {};
    var title = String(promo.title || "").trim();
    var body = String(promo.body || "").trim();

    /* Nothing written, nothing shown — an empty black band above the
       footer would look like a fault. */
    if (!title && !body) return;

    var titleEl = band.querySelector("[data-promo-title]");
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.hidden = !title;
    }

    var bodyEl = band.querySelector("[data-promo-body]");
    if (bodyEl) {
      bodyEl.textContent = body;
      bodyEl.hidden = !body;
    }

    var btn = band.querySelector("[data-promo-btn]");
    if (btn) {
      btn.textContent = promo.button || "Custom Order";
      btn.href = promo.button_link || "/custom/";
    }

    var media = band.querySelector("[data-promo-media]");
    if (media && promo.image) {
      var img = document.createElement("img");
      img.src = promo.image;
      img.alt = promo.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
    } else if (media) {
      /* No picture yet: a dark ground so the white words still read. */
      media.style.background = "#2a2a2a";
    }

    band.hidden = false;
  }

  /* ------------------------------------------------------------------
     Search
     ------------------------------------------------------------------ */

  var panel = null;
  var input = null;
  var results = null;
  var catalogue = null;
  var opener = null;

  function priceOf(item) {
    var list = (item.variants && item.variants.length) ? item.variants : (item.sizes || []);
    if (!list.length) return Number(item.price) || 0;
    var chosen = list.filter(function (row) { return row.selected; })[0] || list[0];
    return Number(chosen.price) || 0;
  }

  /* Everything worth typing to find a piece: its name, what it is, and
     which part of the shop it lives in. */
  function haystack(item) {
    return [item.title, item.type, item.category, item.slug]
      .concat((item.variants || []).map(function (v) { return v.type + " " + v.size; }))
      .concat((item.colors || []).map(function (c) { return c.label; }))
      .join(" ")
      .toLowerCase();
  }

  function matches(items, query) {
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    return items.filter(function (item) {
      var text = haystack(item);
      /* Every word has to appear somewhere — "statue canvas" should not
         return every canvas in the shop. */
      return words.every(function (word) { return text.indexOf(word) !== -1; });
    });
  }

  function renderResults(items, query) {
    results.textContent = "";

    var empty = document.querySelector("[data-search-empty]");
    if (empty) {
      empty.hidden = !(query && !items.length);
      empty.textContent = 'Nothing matches "' + query + '".';
    }

    items.slice(0, 8).forEach(function (item) {
      var li = document.createElement("li");

      var link = document.createElement("a");
      link.className = "search__hit";
      link.href = item.slug ? "/products/" + encodeURIComponent(item.slug) + "/" : "/products/";

      if (item.image) {
        var img = document.createElement("img");
        img.className = "search__thumb";
        img.src = item.image;
        img.alt = "";
        img.loading = "lazy";
        link.appendChild(img);
      } else {
        link.appendChild(document.createElement("span")).className = "search__thumb";
      }

      var text = document.createElement("span");
      var name = document.createElement("span");
      name.className = "search__name";
      name.textContent = item.title || "Untitled";
      var meta = document.createElement("span");
      meta.className = "search__meta";
      meta.textContent = [item.type, item.category].filter(Boolean).join(" · ");

      text.appendChild(name);
      text.appendChild(document.createElement("br"));
      text.appendChild(meta);
      link.appendChild(text);

      var price = document.createElement("span");
      price.className = "search__price";
      price.textContent = money.format(priceOf(item));
      link.appendChild(price);

      li.appendChild(link);
      results.appendChild(li);
    });
  }

  function runSearch() {
    var query = input.value.trim();
    if (!catalogue) return;
    renderResults(matches(catalogue, query), query);
  }

  function closeSearch() {
    if (!panel || panel.hidden) return;
    panel.classList.remove("is-open");
    document.body.classList.remove("has-drawer");

    var box = panel.querySelector(".search__panel");
    var done = function () { panel.hidden = true; };
    if (box) {
      box.addEventListener("transitionend", done, { once: true });
    } else {
      done();
    }

    if (opener) opener.focus();
  }

  function openSearch() {
    if (!panel) return;
    panel.hidden = false;
    void panel.offsetWidth; /* let the transition run from the closed state */
    panel.classList.add("is-open");
    document.body.classList.add("has-drawer");
    input.focus();
    input.select();

    /* Fetched the first time it is opened, not on every page load. */
    if (catalogue) return;
    var get = FNU.fetchJson || function () { return Promise.resolve(null); };
    get("/content/products.json").then(function (raw) {
      catalogue = (raw && Array.isArray(raw.items)) ? raw.items : [];
      runSearch();
    });
  }

  function buildSearch() {
    var root = document.createElement("div");
    root.className = "search";
    root.hidden = true;
    root.innerHTML =
      '<div class="search__scrim" data-search-close></div>' +
      '<div class="search__panel" role="dialog" aria-modal="true" aria-label="Search">' +
        '<div class="search__field">' +
          '<input class="search__input" type="search" autocomplete="off" ' +
            'placeholder="Search" aria-label="Search products" data-search-input>' +
          '<button class="search__close" type="button" aria-label="Close search" data-search-close>×</button>' +
        '</div>' +
        '<ul class="search__results" data-search-results></ul>' +
        '<p class="search__empty" data-search-empty hidden></p>' +
      '</div>';

    document.body.appendChild(root);
    return root;
  }

  function initSearch() {
    var buttons = [].slice.call(document.querySelectorAll("[data-search-open]"));
    if (!buttons.length) return;

    panel = buildSearch();
    input = panel.querySelector("[data-search-input]");
    results = panel.querySelector("[data-search-results]");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        opener = btn;
        openSearch();
      });
    });

    panel.querySelectorAll("[data-search-close]").forEach(function (btn) {
      btn.addEventListener("click", closeSearch);
    });

    input.addEventListener("input", runSearch);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSearch();
    });
  }

  function init() {
    initSearch();

    var get = FNU.fetchJson || function () { return Promise.resolve(null); };
    if (document.querySelector("[data-promo]")) get("/content/promo.json").then(applyPromo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
