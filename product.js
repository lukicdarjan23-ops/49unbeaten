/* Forty Nine Unbeaten — product page.
   Content comes from content/product.json (edited in the CMS); the
   DEFAULTS below keep the page rendering if that file can't be
   fetched. Relies on window.FNU from script.js for the cart store. */
(function () {
  "use strict";

  var FNU = window.FNU || {};
  var money = FNU.money || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  var DEFAULTS = {
    title: "The Statue",
    ship_note: "Ships worldwide",
    /* One image per material, shared by every size of that material. A
       variant points at one of these by its group name. */
    media: [
      { group: "Print", image: "", alt: "" },
      { group: "Canvas", image: "", alt: "" }
    ],
    crumbs: [
      { label: "Home", href: "index.html" },
      { label: "Art", href: "/art" },
      { label: "Prints", href: "/prints" }
    ],
    variants: [
      { label: "Print 8x10", price: 49, group: "Print", note: "Printed on thick matte paper. Frame not included." },
      { label: "Print 16x20", price: 89, group: "Print", note: "Printed on thick matte paper. Frame not included." },
      { label: "Canvas 8x10", price: 89, group: "Canvas", note: "Stretched over a wood frame, ready to hang, no framing needed.", selected: true },
      { label: "Canvas 16x20", price: 149, group: "Canvas", note: "Stretched over a wood frame, ready to hang, no framing needed." }
    ],
    notes: [
      "Ships in 2 business days",
      "Made to order, no returns. Full refund if it shows up damaged or never shows up."
    ],
    panels: [
      { title: "Quick Specs", body: "Museum-quality poster printed on thick matte paper. Giclée print with archival inks. Sizes in inches." },
      { title: "Shipping and delivery", body: "Made to order and dispatched within 2 business days. Shipped worldwide in a rigid tube or a flat mailer, tracked." }
    ],
    showcase_image: "",
    showcase_alt: ""
  };

  var product = DEFAULTS;
  var variants = [];
  var selected = 0;

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */

  function renderCrumbs() {
    var nav = document.querySelector("[data-crumbs]");
    if (!nav) return;

    nav.textContent = "";
    product.crumbs.forEach(function (crumb, index) {
      if (index) {
        var sep = document.createElement("span");
        sep.className = "crumbs__sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "/";
        nav.appendChild(sep);
      }
      var link = document.createElement("a");
      link.href = crumb.href || "#";
      link.textContent = crumb.label;
      nav.appendChild(link);
    });
  }

  /* Fills a container rather than replacing it, so the same slot can be
     re-rendered each time the selected variant changes material. */
  function renderMedia(hook, image, alt, className, fallbackText) {
    var slot = document.querySelector(hook);
    if (!slot) return;

    slot.textContent = "";

    if (image) {
      var img = document.createElement("img");
      img.className = className;
      img.src = image;
      img.alt = alt || "";
      img.decoding = "async";
      slot.appendChild(img);
      return;
    }

    var box = document.createElement("span");
    box.className = "ph " + className;
    box.setAttribute("aria-hidden", "true");
    box.textContent = fallbackText;
    slot.appendChild(box);
  }

  function mediaFor(variant) {
    var group = (variant && variant.group) || "";
    var match = product.media.filter(function (entry) {
      return entry.group && group && entry.group.toLowerCase() === group.toLowerCase();
    })[0];
    return match || product.media[0] || { image: "", alt: "", group: "" };
  }

  function renderVariants() {
    var wrap = document.querySelector("[data-variants]");
    if (!wrap) return;

    wrap.textContent = "";
    variants.forEach(function (variant, index) {
      var btn = document.createElement("button");
      btn.className = "variant";
      btn.type = "button";
      btn.textContent = variant.label;
      btn.dataset.variant = String(index);
      /* Radio semantics: one of the set is always chosen, and only the
         selected one stays in the tab order. */
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.tabIndex = -1;
      wrap.appendChild(btn);
    });
  }

  function renderNotes() {
    var wrap = document.querySelector("[data-product-notes]");
    if (!wrap) return;

    wrap.textContent = "";
    product.notes.forEach(function (text) {
      var p = document.createElement("p");
      p.className = "note";
      p.textContent = text;
      wrap.appendChild(p);
    });
  }

  function renderPanels() {
    var wrap = document.querySelector("[data-product-panels]");
    if (!wrap) return;

    wrap.textContent = "";
    product.panels.forEach(function (panel) {
      var details = document.createElement("details");
      details.className = "panel";

      var summary = document.createElement("summary");
      summary.className = "panel__head";
      summary.textContent = panel.title;

      var body = document.createElement("div");
      body.className = "panel__body";
      body.textContent = panel.body;

      details.appendChild(summary);
      details.appendChild(body);
      wrap.appendChild(details);
    });
  }

  /* ------------------------------------------------------------------
     Selection
     ------------------------------------------------------------------ */

  function select(index) {
    if (index < 0 || index >= variants.length) return;
    selected = index;

    var variant = variants[selected];

    document.querySelectorAll("[data-variant]").forEach(function (btn) {
      var on = Number(btn.dataset.variant) === selected;
      btn.classList.toggle("variant--selected", on);
      btn.setAttribute("aria-checked", String(on));
      btn.tabIndex = on ? 0 : -1;
    });

    var price = document.querySelector("[data-product-price]");
    if (price) price.textContent = money.format(variant.price);

    var note = document.querySelector("[data-variant-note]");
    if (note) {
      note.textContent = variant.note || "";
      note.hidden = !variant.note;
    }

    var media = mediaFor(variant);
    renderMedia(
      "[data-product-media]", media.image, media.alt, "ph--product",
      /* Name the group while the real photo is still a placeholder, so
         the swap is visible before any image is uploaded. */
      media.group ? media.group.toLowerCase() + " img" : "img"
    );
  }

  function quantity() {
    var input = document.querySelector("[data-qty-input]");
    if (!input) return 1;
    var value = Math.round(Number(input.value) || 1);
    return Math.min(99, Math.max(1, value));
  }

  function setQuantity(value) {
    var input = document.querySelector("[data-qty-input]");
    if (!input) return;
    input.value = String(Math.min(99, Math.max(1, Math.round(value) || 1)));
  }

  /* ------------------------------------------------------------------
     Wiring
     ------------------------------------------------------------------ */

  function initVariants() {
    var wrap = document.querySelector("[data-variants]");
    if (!wrap) return;

    wrap.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-variant]");
      if (!btn) return;
      select(Number(btn.dataset.variant));
    });

    /* Arrow keys move between options, as a radio group should. */
    wrap.addEventListener("keydown", function (event) {
      var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();

      var step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
      var next = (selected + step + variants.length) % variants.length;
      select(next);

      var btn = wrap.querySelector('[data-variant="' + next + '"]');
      if (btn) btn.focus();
    });
  }

  function initQuantity() {
    document.querySelectorAll("[data-qty]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setQuantity(quantity() + Number(btn.dataset.qty));
      });
    });

    var input = document.querySelector("[data-qty-input]");
    if (input) {
      input.addEventListener("change", function () { setQuantity(quantity()); });
    }
  }

  function initAddToCart() {
    var btn = document.querySelector("[data-add-to-cart]");
    if (!btn || !FNU.cart) return;

    btn.addEventListener("click", function () {
      var variant = variants[selected];
      if (!variant) return;

      var qty = quantity();
      FNU.cart.add({
        key: slug(product.title) + "::" + slug(variant.label),
        price: variant.price,
        qty: qty,
        title: product.title,
        variant: variant.label
      });

      var status = document.querySelector("[data-cart-status]");
      if (status) {
        status.textContent = "Added " + qty + " × " + product.title +
          ", " + variant.label + ", to cart.";
      }
    });
  }

  function apply(raw) {
    product = Object.assign({}, DEFAULTS, raw || {});

    if (!Array.isArray(product.crumbs) || !product.crumbs.length) {
      product.crumbs = DEFAULTS.crumbs;
    }
    if (!Array.isArray(product.notes)) product.notes = [];
    if (!Array.isArray(product.panels)) product.panels = [];
    if (!Array.isArray(product.media) || !product.media.length) {
      product.media = DEFAULTS.media;
    }

    variants = (Array.isArray(product.variants) ? product.variants : [])
      .map(function (variant) {
        return {
          label: String(variant.label || "").trim(),
          price: Number(variant.price) || 0,
          group: variant.group || "",
          note: variant.note || "",
          selected: !!variant.selected
        };
      })
      .filter(function (variant) { return variant.label; });

    if (!variants.length) variants = DEFAULTS.variants.slice();

    var title = document.querySelector("[data-product-title]");
    if (title) title.textContent = product.title;
    document.title = product.title + " — Forty Nine Unbeaten";

    var ship = document.querySelector("[data-product-ship]");
    if (ship) {
      ship.textContent = product.ship_note || "";
      ship.hidden = !product.ship_note;
    }

    renderCrumbs();
    renderMedia("[data-showcase-media]", product.showcase_image, product.showcase_alt, "ph--showcase", "img");
    renderVariants();
    renderNotes();
    renderPanels();

    var preferred = 0;
    variants.forEach(function (variant, index) {
      if (variant.selected) preferred = index;
    });
    select(preferred);
  }

  function init() {
    if (!document.querySelector("[data-variants]")) return;

    initVariants();
    initQuantity();
    initAddToCart();

    var get = FNU.fetchJson || function () { return Promise.resolve(null); };
    get("content/product.json").then(apply);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
