/* Forty Nine Unbeaten — shared site behaviour.
   Holds the cart store (used by the product page), the header cart
   readout and the mobile menu, plus the homepage product grid. Each
   part no-ops when its markup isn't on the page, so the homepage
   and a product page load this same file. */
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

  /* Emptied wholesale once an order is paid for. */
  function clearLines() {
    lines = {};
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
    renderHero: renderHero,
    cart: {
      add: addLine,
      items: items,
      setQty: setQty,
      remove: removeLine,
      clear: clearLines,
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
    logo_header: "",
    logo_header_alt: "Forty Nine Unbeaten",
    logo_footer: "",
    logo_footer_alt: "Forty Nine Unbeaten",
    hero_image: "",
    hero_alt: "Featured artwork",
    hero_text: "",
    hero_link: "/art/",
    top_sellers_title: "Top Sellers",
    view_all_text: "View All",
    view_all_link: "/products/",
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

  /* Uploaded logos replace the typeset wordmark and the drawn seal.

     Both versions sit in the HTML from the start — the uploaded one
     visible, the drawn one hidden — so the real logo is painted with the
     first frame and nothing flickers while settings.json loads. This only
     steps in when the CMS says something different: a newly uploaded file
     swaps the src, an emptied field brings the drawn version back. */
  function swapLogo(img, fallback, src, alt) {
    var wanted = String(src || "");

    if (!wanted) {
      if (img) img.hidden = true;
      if (fallback) fallback.hidden = false;
      return;
    }

    if (fallback) fallback.hidden = true;
    if (!img) return;
    img.hidden = false;
    /* getAttribute, not .src — the property is resolved to an absolute URL
       and would never match the stored path. */
    if (img.getAttribute("src") !== wanted) img.setAttribute("src", wanted);
    if (alt != null && img.getAttribute("alt") !== alt) img.setAttribute("alt", alt);
  }

  function applyLogos(settings) {
    document.querySelectorAll("a.logo").forEach(function (logo) {
      swapLogo(
        logo.querySelector("[data-logo-img]"),
        logo.querySelector("[data-logo-fallback]"),
        settings.logo_header,
        settings.logo_header_alt
      );
    });

    document.querySelectorAll(".footer__brand").forEach(function (brand) {
      swapLogo(
        brand.querySelector("[data-seal-img]"),
        brand.querySelector("[data-seal-fallback]"),
        settings.logo_footer,
        settings.logo_footer_alt
      );
    });
  }

  /* ------------------------------------------------------------------
     Category links

     Art / Apparel / Gifts are listed in the CMS. Delete one there and its
     link disappears from the header and the footer; add it back and the
     link returns. The pages themselves stay in place, and category.js
     sends anyone who lands on a removed one back to the homepage.
     ------------------------------------------------------------------ */

  function applyCategoryLinks(raw) {
    var items = raw && Array.isArray(raw.items) ? raw.items : null;
    if (!items) return; /* file missing — leave the built-in links alone */

    var live = {};
    items.forEach(function (item) {
      var slug = String(item && item.slug || "").trim().toLowerCase();
      if (slug) live[slug] = item.title || slug;
    });

    document.querySelectorAll("[data-nav]").forEach(function (link) {
      var slug = link.dataset.nav;
      link.hidden = !live[slug];
      if (live[slug]) link.textContent = live[slug];
    });
  }

  /* Fills a hero band from whichever record owns it: the homepage's from
     settings.json, a listing page's from its own file. Shared so the two
     don't drift apart. `scope` is the section that owns the band, which
     keeps the homepage hero off the pages that have one of their own. */
  function renderHero(scope, source, className) {
    if (!scope) return;

    var link = scope.querySelector("[data-hero-link]");
    var slot = scope.querySelector("[data-hero-media]");
    var caption = scope.querySelector("[data-hero-text]");

    /* A hero with nowhere to go shouldn't behave like a link — clicking it
       would only jump the page to the top, and a keyboard lands on it for
       nothing. Left as an <a> in the markup and demoted here, so the one
       that does have a destination keeps working without JavaScript. */
    if (link) {
      var target = String(source.hero_link || "").trim();
      if (target && target !== "#") {
        link.href = target;
        link.removeAttribute("aria-hidden");
        link.removeAttribute("tabindex");
      } else {
        link.removeAttribute("href");
      }
    }

    if (caption) {
      caption.textContent = source.hero_text || "";
      caption.hidden = !source.hero_text;
    }

    if (!slot) return;

    if (!source.hero_image) {
      /* The grey box says "img" to show a picture belongs here — but not
         underneath a caption, where the two words sit on top of each
         other. */
      slot.textContent = source.hero_text ? "" : "img";
      return;
    }

    var img = document.createElement("img");
    img.className = className;
    img.src = source.hero_image;
    img.alt = source.hero_alt || "";
    img.loading = "eager";
    img.decoding = "async";
    slot.replaceWith(img);
  }

  function applySettings(raw) {
    var settings = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    applyLogos(settings);

    renderHero(document.querySelector("[data-site-hero]"), settings, "ph--hero");

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

  /* The card shows the default option's price — the one ticked in the CMS,
     or the first if none is. Art is priced by variant, apparel by shirt
     size; a card has to read whichever list the product carries. */
  function cardPrice(item) {
    var options = [];
    if (Array.isArray(item.variants) && item.variants.length) {
      options = item.variants;
    } else if (Array.isArray(item.sizes) && item.sizes.length) {
      options = item.sizes;
    }

    if (!options.length) return Number(item.price) || 0;
    var chosen = options.filter(function (v) { return v.selected; })[0] || options[0];
    return Number(chosen.price) || 0;
  }

  function productHref(item) {
    /* One folder per product: /products/<slug>/. No file extension, so
       the address stays valid whatever the site is built with later. */
    return item.slug ? "/products/" + encodeURIComponent(item.slug) + "/" : "/products/";
  }

  function buildCard(product) {
    var card = document.createElement("article");
    card.className = "card";

    var body = document.createElement("div");
    body.className = "card__body";

    /* Card titles sit under the homepage's h2 section heading, so h3 is
       right there — but the listing pages lead with an h1 and would jump a
       level. Each grid says which it wants. */
    var title = document.createElement(product.heading || "h3");
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

    var heading = grid.dataset.cardHeading === "h2" ? "h2" : "h3";
    var frag = document.createDocumentFragment();
    (items || []).forEach(function (item) {
      frag.appendChild(buildCard({
        title: item.title || "Untitled",
        type: item.type || "Print",
        price: cardPrice(item),
        href: productHref(item),
        image: item.image || "",
        alt: item.alt || "",
        heading: heading
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

    /* Only the homepage's own grid, named outright. The category pages and
       All Products carry a [data-grid] too and fill it themselves — left
       to a looser test, both scripts would write to the same grid and the
       slower one would win. */
    var isHomeGrid = !!document.querySelector("[data-grid][data-home-grid]");

    fetchJson("/content/categories.json").then(applyCategoryLinks);

    fetchJson("/content/settings.json").then(function (settings) {
      applySettings(settings);
      /* Everything the CMS supplies is in place — let the held text show.
         fetchJson resolves null rather than rejecting, so this runs even
         when the file is missing and the defaults are what's on screen. */
      document.documentElement.classList.remove("cms-loading");

      if (!isHomeGrid) return;
      fetchJson("/content/products.json").then(applyProducts);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
