/* Forty Nine Unbeaten — homepage behaviour
   Content (hero image, footer text, product list) loads at runtime from
   content/settings.json and content/products.json — both edited through
   the CMS at /admin. The DEFAULT_* values below are a fallback so the
   page still renders if those files are missing or can't be fetched
   (e.g. opening index.html directly as a file:// URL blocks fetch —
   serve the folder over http, or view the hosted site, to see live
   CMS content). */
(function () {
  "use strict";

  var DEFAULT_SETTINGS = {
    hero_image: "",
    hero_alt: "Featured artwork",
    hero_link: "/originals-on-canvas",
    top_sellers_title: "Top Sellers",
    view_all_text: "View All",
    view_all_link: "/prints",
    instagram_url: "https://instagram.com",
    whatsapp_url: "https://wa.me/",
    sales_notice: "All sales final. No returns. Refund only in the event item not delivered or delivered damaged."
  };

  var DEFAULT_PRODUCTS = Array.from({ length: 12 }, function () {
    return {
      title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue",
      image: "", alt: "", sizes: ["S", "L"]
    };
  });

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
     Settings — hero, section head, footer
     ------------------------------------------------------------------ */

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

    var notice = document.querySelector("[data-sales-notice]");
    if (notice) notice.textContent = settings.sales_notice;
  }

  /* ------------------------------------------------------------------
     Product grid
     ------------------------------------------------------------------ */

  var PRODUCTS = [];

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

  /* The add button reveals a row of size boxes to its left; nothing
     reaches the cart until one of them is chosen. A product with no
     sizes configured keeps the plain one-click add. */
  function buildSizePicker(product) {
    var wrap = document.createElement("div");
    wrap.className = "sizes";

    var add = document.createElement("button");
    add.className = "card__add";
    add.type = "button";

    var glyph = document.createElement("span");
    glyph.className = "card__add-glyph";
    glyph.textContent = "+";
    glyph.setAttribute("aria-hidden", "true");
    add.appendChild(glyph);

    if (!product.sizes.length) {
      add.dataset.add = product.id;
      add.setAttribute("aria-label", "Add " + product.title + " to cart");
      wrap.appendChild(add);
      return wrap;
    }

    var options = document.createElement("div");
    options.className = "sizes__options";
    options.hidden = true;
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "Choose a size for " + product.title);

    product.sizes.forEach(function (size) {
      var opt = document.createElement("button");
      opt.className = "sizes__opt";
      opt.type = "button";
      opt.textContent = size;
      opt.dataset.add = product.id;
      opt.dataset.size = size;
      opt.setAttribute("aria-label", "Add " + product.title + ", size " + size + ", to cart");
      options.appendChild(opt);
    });

    add.dataset.toggle = "";
    add.setAttribute("aria-expanded", "false");
    add.setAttribute("aria-label", "Choose a size for " + product.title);

    wrap.appendChild(options);
    wrap.appendChild(add);
    return wrap;
  }

  function closePickers(except) {
    document.querySelectorAll(".card__add[aria-expanded='true']").forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute("aria-expanded", "false");
      var options = btn.parentNode.querySelector(".sizes__options");
      if (options) options.hidden = true;
    });
  }

  function togglePicker(button) {
    var open = button.getAttribute("aria-expanded") === "true";
    closePickers(button);

    var options = button.parentNode.querySelector(".sizes__options");
    if (!options) return;

    button.setAttribute("aria-expanded", String(!open));
    options.hidden = open;

    if (!open) {
      var first = options.querySelector(".sizes__opt");
      if (first) first.focus();
    }
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

    var foot = document.createElement("div");
    foot.className = "card__foot";

    var price = document.createElement("span");
    price.className = "card__price";
    price.textContent = money.format(product.price);

    foot.appendChild(price);
    foot.appendChild(buildSizePicker(product));

    body.appendChild(title);
    body.appendChild(type);
    body.appendChild(foot);

    card.appendChild(buildMedia(product));
    card.appendChild(body);

    return card;
  }

  function renderGrid() {
    var grid = document.querySelector("[data-grid]");
    if (!grid) return;

    var frag = document.createDocumentFragment();
    PRODUCTS.forEach(function (product) {
      frag.appendChild(buildCard(product));
    });

    grid.textContent = "";
    grid.appendChild(frag);
  }

  function applyProducts(raw) {
    var items = raw && Array.isArray(raw.items) && raw.items.length ? raw.items : DEFAULT_PRODUCTS;

    /* ids are index-based since the CMS stores a plain list — reordering
       or adding/removing items in the CMS resets any in-progress cart,
       which is fine for this front-end-only cart placeholder. */
    PRODUCTS = items.map(function (item, index) {
      /* The CMS list widget stores sizes as plain strings; tolerate
         objects too in case the field is ever given sub-fields. */
      var sizes = (Array.isArray(item.sizes) ? item.sizes : [])
        .map(function (size) {
          if (typeof size === "string") return size.trim();
          return size && size.size ? String(size.size).trim() : "";
        })
        .filter(Boolean);

      return {
        id: "product-" + index,
        title: item.title || "Untitled",
        type: item.type || "Print",
        price: Number(item.price) || 0,
        href: item.href || "#",
        image: item.image || "",
        alt: item.alt || "",
        sizes: sizes
      };
    });

    renderGrid();
  }

  /* ------------------------------------------------------------------
     Cart
     Client-side only — swap `save`/`load` for your storefront API.
     ------------------------------------------------------------------ */

  var STORAGE_KEY = "fnu.cart";

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function save(cart) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage unavailable (private mode, quota) — cart stays in memory */
    }
  }

  var cart = load();

  /* Cart keys are "<product id>::<size>" so the same print in two sizes
     is two line items. Sizeless products keep a bare product id. */
  var KEY_SEP = "::";

  function totals() {
    var count = 0;
    var value = 0;

    Object.keys(cart).forEach(function (key) {
      var qty = cart[key];
      var id = key.split(KEY_SEP)[0];
      var product = PRODUCTS.filter(function (p) { return p.id === id; })[0];
      if (!product || !qty) return;
      count += qty;
      value += qty * product.price;
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

    var widget = document.querySelector(".cart");
    if (!widget) return;
    widget.classList.remove("cart--bump");
    void widget.offsetWidth; /* restart the animation */
    widget.classList.add("cart--bump");
  }

  function addToCart(id, size) {
    var key = size ? id + KEY_SEP + size : id;
    cart[key] = (cart[key] || 0) + 1;
    save(cart);
    paintCart(true);
  }

  /* ------------------------------------------------------------------
     Wiring
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

  function initGrid() {
    var grid = document.querySelector("[data-grid]");
    if (!grid) return;

    grid.addEventListener("click", function (event) {
      var toggle = event.target.closest("[data-toggle]");
      if (toggle) {
        togglePicker(toggle);
        return;
      }

      var button = event.target.closest("[data-add]");
      if (!button) return;

      addToCart(button.dataset.add, button.dataset.size);
      closePickers();
    });

    /* Dismiss an open picker on outside click or Escape. */
    document.addEventListener("click", function (event) {
      if (event.target.closest(".sizes")) return;
      closePickers();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var open = document.querySelector(".card__add[aria-expanded='true']");
      if (!open) return;
      closePickers();
      open.focus();
    });
  }

  function init() {
    initMenu();
    initGrid();

    Promise.all([
      fetchJson("content/settings.json"),
      fetchJson("content/products.json")
    ]).then(function (results) {
      applySettings(results[0]);
      applyProducts(results[1]);
      paintCart(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
