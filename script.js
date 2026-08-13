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
      image: "", alt: "",
      sizes: [{ label: "S", price: 89 }, { label: "L", price: 129 }]
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

  /* Price display. The resting value is stashed on the element so
     hovering a size can preview that size's price and restore after,
     without re-deriving it from the product list. */

  function paintRestingPrice(priceEl) {
    priceEl.textContent = "";
    if (priceEl.dataset.restFrom === "1") {
      var from = document.createElement("span");
      from.className = "card__price-from";
      from.textContent = "from ";
      priceEl.appendChild(from);
    }
    priceEl.appendChild(document.createTextNode(priceEl.dataset.restPrice));
  }

  function previewPrice(priceEl, amount) {
    priceEl.textContent = money.format(amount);
  }

  function resetPrices(root) {
    (root || document).querySelectorAll(".card__price[data-rest-price]")
      .forEach(paintRestingPrice);
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
      opt.textContent = size.label;
      opt.dataset.add = product.id;
      opt.dataset.size = size.label;
      opt.dataset.price = String(size.price);
      /* The price is only shown visually on hover, so the label has to
         carry it for anyone not using a pointer. */
      opt.setAttribute(
        "aria-label",
        "Add " + product.title + ", size " + size.label +
        ", " + money.format(size.price) + ", to cart"
      );
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
    resetPrices();
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
    price.dataset.restPrice = money.format(product.displayPrice);
    price.dataset.restFrom = product.hasRange ? "1" : "0";
    paintRestingPrice(price);

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
      var base = Number(item.price) || 0;

      /* Sizes carry their own price. A bare string (the earlier content
         format) inherits the product's base price. */
      var sizes = (Array.isArray(item.sizes) ? item.sizes : [])
        .map(function (size) {
          if (typeof size === "string") {
            var text = size.trim();
            return text ? { label: text, price: base } : null;
          }
          if (!size) return null;
          var label = String(size.label || size.size || "").trim();
          if (!label) return null;
          var price = Number(size.price);
          return { label: label, price: price > 0 ? price : base };
        })
        .filter(Boolean);

      /* At rest a card shows the cheapest size, prefixed with "from"
         only when the sizes actually differ in price. */
      var prices = sizes.map(function (s) { return s.price; });
      var low = prices.length ? Math.min.apply(null, prices) : base;
      var high = prices.length ? Math.max.apply(null, prices) : base;

      return {
        id: "product-" + index,
        title: item.title || "Untitled",
        type: item.type || "Print",
        price: base,
        href: item.href || "#",
        image: item.image || "",
        alt: item.alt || "",
        sizes: sizes,
        displayPrice: low,
        hasRange: high > low
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

  /* Price for one unit of a cart line. A line whose size no longer
     exists (the size was renamed or removed in the CMS after it was
     added) falls back to the product's base price rather than
     vanishing from the total. */
  function unitPrice(id, label) {
    var product = PRODUCTS.filter(function (p) { return p.id === id; })[0];
    if (!product) return null;
    if (!label) return product.price;

    var size = product.sizes.filter(function (s) { return s.label === label; })[0];
    return size ? size.price : product.price;
  }

  function totals() {
    var count = 0;
    var value = 0;

    Object.keys(cart).forEach(function (key) {
      var qty = cart[key];
      if (!qty) return;

      var parts = key.split(KEY_SEP);
      var price = unitPrice(parts[0], parts[1]);
      if (price === null) return;

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

    /* Preview a size's price in place of the resting "from" figure. */
    function previewFrom(target) {
      var opt = target.closest && target.closest(".sizes__opt");
      if (!opt) return;
      var priceEl = opt.closest(".card").querySelector(".card__price");
      if (priceEl) previewPrice(priceEl, Number(opt.dataset.price));
    }

    grid.addEventListener("mouseover", function (e) { previewFrom(e.target); });
    grid.addEventListener("focusin", function (e) { previewFrom(e.target); });

    grid.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(".sizes__opt")) resetPrices();
    });
    grid.addEventListener("focusout", function (e) {
      if (e.target.closest && e.target.closest(".sizes__opt")) resetPrices();
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
