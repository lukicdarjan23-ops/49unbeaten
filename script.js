/* Forty Nine Unbeaten — shared site behaviour.
   Holds the cart store (used by the product page), the header cart
   readout and the mobile menu, plus the homepage product grid. Each
   part no-ops when its markup isn't on the page, so both index.html
   and product.html load this same file. */
(function () {
  "use strict";

  var money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  function fetchJson(path) {
    return fetch(path, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function () {
        return null; /* missing file, offline, or blocked fetch — caller falls back to defaults */
      });
  }

  /* ------------------------------------------------------------------
     Cart store

     Lines are keyed by product + variant and carry their own price, so
     the header total never has to look anything up. Client-side only —
     swap load/save for your storefront API for real orders.
     ------------------------------------------------------------------ */

  var STORAGE_KEY = "fnu.cart.v2";
  var lines = {};
  var listeners = [];

  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { fn(); }); }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (err) {
      /* storage unavailable (private mode, quota) — cart stays in memory */
    }
  }

  function totals() {
    var count = 0;
    var value = 0;

    Object.keys(lines).forEach(function (key) {
      var line = lines[key];
      if (!line) return;
      var qty = Number(line.qty) || 0;
      var price = Number(line.price) || 0;
      count += qty;
      value += qty * price;
    });

    return { count: count, value: value };
  }

  function paintCart(bump) {
    var sums = totals();

    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(sums.count);
    });
    document.querySelectorAll("[data-cart-total]").forEach(function (el) {
      el.textContent = money.format(sums.value);
    });

    if (!bump) return;

    document.querySelectorAll(".cart").forEach(function (widget) {
      widget.classList.remove("cart--bump");
      void widget.offsetWidth; /* restart the animation */
      widget.classList.add("cart--bump");
    });
  }

  /* Insertion order is preserved for string keys, so the cart lists in
     the order things were added. */
  function items() {
    return Object.keys(lines).map(function (key) {
      var line = lines[key] || {};
      return {
        key: key,
        qty: Number(line.qty) || 0,
        price: Number(line.price) || 0,
        title: line.title || "",
        variant: line.variant || "",
        image: line.image || ""
      };
    }).filter(function (line) { return line.qty > 0; });
  }

  function setQty(key, qty) {
    if (!lines[key]) return;
    var next = Math.round(Number(qty) || 0);

    if (next < 1) {
      delete lines[key];
    } else {
      lines[key].qty = Math.min(99, next);
    }

    save();
    paintCart(false);
    emit();
  }

  function removeLine(key) {
    if (!lines[key]) return;
    delete lines[key];
    save();
    paintCart(false);
    emit();
  }

  function addLine(item) {
    if (!item || !item.key) return;

    var qty = Math.max(1, Math.round(Number(item.qty) || 1));
    var existing = lines[item.key];

    lines[item.key] = {
      qty: Math.min(99, (existing ? Number(existing.qty) || 0 : 0) + qty),
      price: Number(item.price) || 0,
      title: item.title || "",
      variant: item.variant || "",
      image: item.image || ""
    };

    save();
    paintCart(true);
    emit();
  }

  lines = load();

  window.FNU = {
    money: money,
    fetchJson: fetchJson,
    renderProducts: renderProducts,
    cart: {
      add: addLine,
      items: items,
      setQty: setQty,
      remove: removeLine,
      totals: totals,
      paint: paintCart,
      onChange: onChange
    }
  };

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */

  function initMenu() {
    var burger = document.querySelector(".burger");
    var nav = document.getElementById("site-nav");
    if (!burger || !nav) return;

    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (burger.getAttribute("aria-expanded") !== "true") return;
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Menu");
      nav.classList.remove("is-open");
      burger.focus();
    });
  }

  /* ------------------------------------------------------------------
     Homepage: hero, section head, footer text
     ------------------------------------------------------------------ */

  var DEFAULT_SETTINGS = {
    hero_image: "",
    hero_alt: "Featured artwork",
    hero_link: "/art",
    top_sellers_title: "Top Sellers",
    view_all_text: "View All",
    view_all_link: "/art",
    instagram_url: "https://instagram.com",
    whatsapp_url: "https://wa.me/",
    sales_notice: "All sales final. No returns. Refund only in the event item not delivered or delivered damaged."
  };

  var DEFAULT_PRODUCTS = Array.from({ length: 12 }, function (_, index) {
    return {
      slug: index ? "the-statue-" + (index + 1) : "the-statue",
      title: "The Statue", type: "Print", price: 89, image: "", alt: ""
    };
  });

  function applySettings(raw) {
    var settings = Object.assign({}, DEFAULT_SETTINGS, raw || {});

    var heroLink = document.querySelector("[data-hero-link]");
    var heroMedia = document.querySelector("[data-hero-media]");
    if (heroLink) heroLink.href = settings.hero_link;
    if (heroMedia) {
      if (settings.hero_image) {
        var img = document.createElement("img");
        img.className = "ph--hero";
        img.src = settings.hero_image;
        img.alt = settings.hero_alt || "";
        img.loading = "eager";
        img.decoding = "async";
        heroMedia.replaceWith(img);
      } else {
        heroMedia.textContent = "img";
      }
    }

    var title = document.querySelector("[data-top-sellers-title]");
    if (title) title.textContent = settings.top_sellers_title;

    var viewAll = document.querySelector("[data-view-all-link]");
    if (viewAll) {
      viewAll.textContent = settings.view_all_text;
      viewAll.href = settings.view_all_link;
    }

    var instagram = document.querySelector('[data-social="instagram"]');
    if (instagram && settings.instagram_url) instagram.href = settings.instagram_url;

    var whatsapp = document.querySelector('[data-social="whatsapp"]');
    if (whatsapp && settings.whatsapp_url) whatsapp.href = settings.whatsapp_url;

    document.querySelectorAll("[data-sales-notice]").forEach(function (el) {
      el.textContent = settings.sales_notice;
    });
  }

  /* ------------------------------------------------------------------
     Homepage product grid

     Cards are links through to the product page — buying happens there,
     so no add-to-cart control lives on the card.
     ------------------------------------------------------------------ */

  function buildMedia(product) {
    var link = document.createElement("a");
    link.className = "card__media";
    link.href = product.href;
    link.tabIndex = -1;
    link.setAttribute("aria-hidden", "true");

    if (product.image) {
      var img = document.createElement("img");
      img.className = "ph--card";
      img.src = product.image;
      img.alt = product.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      link.appendChild(img);
    } else {
      var box = document.createElement("span");
      box.className = "ph ph--card";
      box.textContent = "img";
      link.appendChild(box);
    }

    return link;
  }

  /* The card shows the default variant's price — the one ticked in the
     CMS, or the first if none is. */
  function cardPrice(item) {
    var variants = Array.isArray(item.variants) ? item.variants : [];
    if (!variants.length) return Number(item.price) || 0;
    var chosen = variants.filter(function (v) { return v.selected; })[0] || variants[0];
    return Number(chosen.price) || 0;
  }

  function productHref(item) {
    return item.slug ? "product.html?p=" + encodeURIComponent(item.slug) : "product.html";
  }

  function buildCard(product) {
    var card = document.createElement("article");
    card.className = "card";

    var body = document.createElement("div");
    body.className = "card__body";

    var title = document.createElement("h3");
    title.className = "card__title";

    var titleLink = document.createElement("a");
    titleLink.href = product.href;
    titleLink.textContent = product.title;
    title.appendChild(titleLink);

    var type = document.createElement("p");
    type.className = "card__type";
    type.textContent = product.type;

    var price = document.createElement("p");
    price.className = "card__price";
    price.textContent = money.format(product.price);

    body.appendChild(title);
    body.appendChild(type);
    body.appendChild(price);

    card.appendChild(buildMedia(product));
    card.appendChild(body);

    return card;
  }

  /* Shared by the homepage and the category pages, which pass an
     already-filtered list. */
  function renderProducts(grid, items) {
    if (!grid) return;

    var frag = document.createDocumentFragment();
    (items || []).forEach(function (item) {
      frag.appendChild(buildCard({
        title: item.title || "Untitled",
        type: item.type || "Print",
        price: cardPrice(item),
        href: productHref(item),
        image: item.image || "",
        alt: item.alt || ""
      }));
    });

    grid.textContent = "";
    grid.appendChild(frag);
  }

  function applyProducts(raw) {
    var items = raw && Array.isArray(raw.items) && raw.items.length
      ? raw.items
      : DEFAULT_PRODUCTS;

    /* The homepage grid is the shop's pick, ticked per product in the
       CMS. With nothing ticked it shows everything, so the page is never
       empty by accident. */
    var featured = items.filter(function (item) { return item.featured; });
    renderProducts(document.querySelector("[data-grid]"), featured.length ? featured : items);
  }

  /* ------------------------------------------------------------------
     Wiring
     ------------------------------------------------------------------ */

  function init() {
    initMenu();
    paintCart(false);

    /* Category pages carry [data-grid] too but filter it themselves. */
    if (!document.querySelector("[data-grid]") || document.body.dataset.category) return;

    Promise.all([
      fetchJson("content/settings.json"),
      fetchJson("content/products.json")
    ]).then(function (results) {
      applySettings(results[0]);
      applyProducts(results[1]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
