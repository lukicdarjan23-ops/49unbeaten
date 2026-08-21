/* Forty Nine Unbeaten — product page.

   Which product to show comes from the address: /products/<slug>/.
   All products live in the one catalogue, content/products.json, so
   adding a product in the CMS is enough — no new page needed. The
   DEFAULTS below keep the page rendering if the file can't be fetched.
   Relies on window.FNU from script.js for the cart store. */
(function () {
  "use strict";

  var FNU = window.FNU || {};
  var money = FNU.money || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  var DEFAULTS = {
    slug: "the-statue",
    title: "The Statue",
    ship_note: "Ships worldwide",
    /* One image per material, shared by every size of that material. A
       variant points at one of these by its group name. */
    media: [
      { group: "Canvas", image: "", alt: "" },
      { group: "Poster", image: "", alt: "" }
    ],
    variants: [
      { type: "Canvas", size: "8x10", price: 89, note: "Stretched over a wood frame, ready to hang, no framing needed.", selected: true },
      { type: "Canvas", size: "16x20", price: 149, note: "Stretched over a wood frame, ready to hang, no framing needed." },
      { type: "Poster", size: "8x10", price: 49, note: "Printed on thick matte paper. Frame not included." },
      { type: "Poster", size: "16x20", price: 89, note: "Printed on thick matte paper. Frame not included." }
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

  /* Art is a matrix: every entry in variants[] is one material in one size.
     The page shows it as two choices — material first, then the sizes that
     material comes in — so these are derived from that one list rather
     than kept as a second copy of it. */
  var variants = [];
  var artTypes = [];
  var artSizes = [];
  var selectedType = 0;
  var selectedArtSize = 0;

  /* Apparel products pick a size and a colour separately rather than
     one flat list of variants. Which layout a product uses follows its
     Category: Apparel gets sizes + colours, everything else gets the
     Size and Type list. */
  var sizes = [];
  var colors = [];
  var selectedSize = 0;
  var selectedColor = 0;
  var isApparel = false;

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* Which product this page is for. The address is /products/<slug>/; the
     old ?p=<slug> form is still read so a link shared before the change
     keeps working even if it reaches this script directly. */
  function wantedSlug() {
    var match = /\/products\/([^\/]+)\/?$/.exec(window.location.pathname);
    if (match) return decodeURIComponent(match[1]);
    return new URLSearchParams(window.location.search).get("p");
  }

  /* One row of the art matrix: a material in a size, at a price.

     Entries written before the page split the choice in two carry a single
     "Canvas 16x20" label and a separate group instead, so those are read
     apart here rather than needing every existing product re-entered. */
  function readArtRow(raw) {
    var row = raw || {};
    var type = String(row.type || row.group || "").trim();
    var size = String(row.size || "").trim();

    if (!size && row.label) {
      var label = String(row.label).trim();
      /* "Canvas 16x20" — the material is the part the group already named,
         so what is left is the size. */
      size = type && label.toLowerCase().indexOf(type.toLowerCase()) === 0
        ? label.slice(type.length).trim()
        : label;
    }
    if (!type && row.label) type = String(row.label).trim().split(/\s+/)[0];

    return {
      type: type,
      size: size,
      price: Number(row.price) || 0,
      note: row.note || "",
      selected: !!row.selected
    };
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

  /* One button per option, with radio semantics: one of the set is always
     chosen, and only the chosen one stays in the tab order. */
  function renderChoices(hook, attr, labels) {
    var wrap = document.querySelector(hook);
    if (!wrap) return;

    wrap.textContent = "";
    labels.forEach(function (label, index) {
      var btn = document.createElement("button");
      btn.className = "variant variant--size";
      btn.type = "button";
      btn.textContent = label;
      btn.setAttribute(attr, String(index));
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.tabIndex = -1;
      wrap.appendChild(btn);
    });
  }

  function renderArtTypes() {
    renderChoices("[data-art-types]", "data-art-type", artTypes);
  }

  function renderArtSizes() {
    renderChoices("[data-art-sizes]", "data-art-size", artSizes.map(function (row) {
      return row.size;
    }));
  }

  function renderSizes() {
    var wrap = document.querySelector("[data-sizes]");
    if (!wrap) return;

    wrap.textContent = "";
    sizes.forEach(function (size, index) {
      var btn = document.createElement("button");
      btn.className = "variant variant--size";
      btn.type = "button";
      btn.textContent = size.label;
      btn.dataset.size = String(index);
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.tabIndex = -1;
      wrap.appendChild(btn);
    });
  }

  /* Black or white, whichever stands out on the given shirt colour.
     Relative luminance per WCAG, so mid greens and navies land the right
     way round instead of on a naive average of the channels. */
  function readableInk(hex) {
    var match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!match) return "#000";

    var value = match[1];
    if (value.length === 3) {
      value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }

    var channel = function (start) {
      var c = parseInt(value.slice(start, start + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    var luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
    return luminance > 0.4 ? "#000" : "#fff";
  }

  function renderColors() {
    var wrap = document.querySelector("[data-colors]");
    if (!wrap) return;

    wrap.textContent = "";
    colors.forEach(function (color, index) {
      var btn = document.createElement("button");
      btn.className = "swatch";
      btn.type = "button";
      btn.dataset.color = String(index);
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", color.label);
      btn.title = color.label;
      btn.tabIndex = -1;

      var dot = document.createElement("span");
      dot.className = "swatch__dot";
      dot.style.background = color.hex || "#ccc";
      btn.appendChild(dot);

      /* Drawn rather than a text glyph so its colour can be flipped to
         whichever of black or white shows up on this shirt. */
      var check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      check.setAttribute("class", "swatch__check");
      check.setAttribute("viewBox", "0 0 24 24");
      check.setAttribute("aria-hidden", "true");
      check.setAttribute("focusable", "false");

      var tick = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tick.setAttribute("d", "M4 12.5 9.5 18 20 6.5");
      tick.setAttribute("fill", "none");
      tick.setAttribute("stroke", readableInk(color.hex));
      tick.setAttribute("stroke-width", "2.6");
      tick.setAttribute("stroke-linecap", "round");
      tick.setAttribute("stroke-linejoin", "round");
      check.appendChild(tick);
      btn.appendChild(check);

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

  /* ------------------------------------------------------------------
     Size guide

     A ruler link under the options opens a panel from the side holding
     the measurements table. Every word of it — the link, the heading, the
     column names, the note — comes from the CMS.
     ------------------------------------------------------------------ */

  var COLUMN_KEYS = ["chest", "length", "sleeve"];

  function guideRows() {
    var guide = product.size_guide || {};
    return (Array.isArray(guide.rows) ? guide.rows : []).filter(function (row) {
      return row && String(row.label || "").trim();
    });
  }

  function buildGuideTable(guide, rows) {
    /* A column the shop left blank on every row is dropped, so a t-shirt
       measured by chest and length shows no empty Sleeve column. */
    /* The CMS groups the column names in their own block; older entries
       have them loose on the guide itself. */
    var heads = guide.columns || guide;
    var fallback = { label: "Size", chest: "Chest", length: "Length", sleeve: "Sleeve" };

    var columns = [{ key: "label", head: heads.col_size || fallback.label }];
    COLUMN_KEYS.forEach(function (key) {
      var used = rows.some(function (row) { return String(row[key] || "").trim(); });
      if (used) columns.push({ key: key, head: heads["col_" + key] || fallback[key] });
    });

    var table = document.createElement("table");
    table.className = "sizes-table";

    var headRow = document.createElement("tr");
    columns.forEach(function (column) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = column.head;
      headRow.appendChild(th);
    });

    var thead = document.createElement("thead");
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      columns.forEach(function (column, index) {
        var cell = document.createElement(index ? "td" : "th");
        if (!index) cell.scope = "row";
        cell.textContent = String(row[column.key] || "").trim() || "—";
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  var guideDrawer = null;
  var guideOpener = null;

  function closeGuide() {
    if (!guideDrawer || guideDrawer.hidden) return;

    guideDrawer.classList.remove("is-open");
    document.body.classList.remove("has-drawer");

    var panel = guideDrawer.querySelector(".drawer__panel");
    var done = function () { guideDrawer.hidden = true; };
    if (panel) {
      panel.addEventListener("transitionend", done, { once: true });
    } else {
      done();
    }

    if (guideOpener) guideOpener.focus();
  }

  function openGuide() {
    if (!guideDrawer) return;

    guideDrawer.hidden = false;
    void guideDrawer.offsetWidth; /* let the transition run from closed */
    guideDrawer.classList.add("is-open");
    document.body.classList.add("has-drawer");

    var close = guideDrawer.querySelector(".drawer__close");
    if (close) close.focus();
  }

  function renderSizeGuide() {
    /* One link sits under the shirt sizes and one under the art sizes, so
       it lands directly beneath whichever size picker the product shows.
       Only the visible group's link is ever on screen. */
    var openers = [].slice.call(document.querySelectorAll("[data-guide-open]"));
    if (!openers.length) return;

    if (guideDrawer) {
      guideDrawer.remove();
      guideDrawer = null;
    }

    var guide = product.size_guide || {};
    var rows = guideRows();

    /* No measurements entered, no link — an art print shouldn't offer one. */
    openers.forEach(function (opener) {
      opener.hidden = !rows.length;
      var linkText = opener.querySelector("[data-guide-link-text]");
      if (linkText) linkText.textContent = guide.link_text || "Size guide";
    });

    if (!rows.length) return;

    guideDrawer = document.createElement("div");
    guideDrawer.className = "drawer drawer--guide";
    guideDrawer.hidden = true;

    var scrim = document.createElement("div");
    scrim.className = "drawer__scrim";
    scrim.addEventListener("click", closeGuide);

    var panel = document.createElement("aside");
    panel.className = "drawer__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", guide.title || "Size guide");

    var head = document.createElement("div");
    head.className = "drawer__head";

    var heading = document.createElement("h2");
    heading.className = "drawer__title";
    heading.textContent = guide.title || "Size guide";

    var close = document.createElement("button");
    close.className = "drawer__close";
    close.type = "button";
    close.setAttribute("aria-label", "Close size guide");
    close.textContent = "×";
    close.addEventListener("click", closeGuide);

    head.appendChild(heading);
    head.appendChild(close);

    var body = document.createElement("div");
    body.className = "drawer__body";

    if (guide.intro) {
      var intro = document.createElement("p");
      intro.className = "guide__intro";
      intro.textContent = guide.intro;
      body.appendChild(intro);
    }

    if (guide.table_title) {
      var caption = document.createElement("h3");
      caption.className = "guide__caption";
      caption.textContent = guide.table_title;
      body.appendChild(caption);
    }

    body.appendChild(buildGuideTable(guide, rows));

    if (guide.note) {
      var note = document.createElement("p");
      note.className = "sizes-table__note";
      note.textContent = guide.note;
      body.appendChild(note);
    }

    panel.appendChild(head);
    panel.appendChild(body);
    guideDrawer.appendChild(scrim);
    guideDrawer.appendChild(panel);
    document.body.appendChild(guideDrawer);

    openers.forEach(function (opener) {
      opener.addEventListener("click", function () {
        /* Focus returns to the link that was actually used. */
        guideOpener = opener;
        openGuide();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeGuide();
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

  function paintChoice(attr, className, index) {
    document.querySelectorAll("[" + attr + "]").forEach(function (btn) {
      var on = Number(btn.getAttribute(attr)) === index;
      btn.classList.toggle(className, on);
      btn.setAttribute("aria-checked", String(on));
      btn.tabIndex = on ? 0 : -1;
    });
  }

  /* Choosing a material swaps the picture and rebuilds the size row, since
     a canvas and a poster need not come in the same sizes. The size already
     chosen is kept if the new material also offers it. */
  function selectType(index) {
    if (index < 0 || index >= artTypes.length) return;

    var wanted = artSizes[selectedArtSize] && artSizes[selectedArtSize].size;
    selectedType = index;
    paintChoice("data-art-type", "variant--selected", selectedType);

    var type = artTypes[selectedType];
    artSizes = variants.filter(function (row) { return row.type === type; });
    renderArtSizes();

    var keep = 0;
    artSizes.forEach(function (row, i) {
      if (row.size === wanted) keep = i;
    });
    /* Nothing carried over, so fall back to whichever row the shop marked
       as the one to open on. */
    if (!wanted || !artSizes.some(function (row) { return row.size === wanted; })) {
      artSizes.forEach(function (row, i) { if (row.selected) keep = i; });
    }
    selectArtSize(keep);

    var media = mediaFor({ group: type });
    renderMedia(
      "[data-product-media]", media.image, media.alt, "ph--product",
      /* Name the group while the real photo is still a placeholder, so
         the swap is visible before any image is uploaded. */
      media.group ? media.group.toLowerCase() + " img" : "img"
    );
  }

  function selectArtSize(index) {
    if (index < 0 || index >= artSizes.length) return;
    selectedArtSize = index;
    paintChoice("data-art-size", "variant--selected", selectedArtSize);

    var row = artSizes[selectedArtSize];

    var price = document.querySelector("[data-product-price]");
    if (price) price.textContent = money.format(row.price);

    var note = document.querySelector("[data-variant-note]");
    if (note) {
      note.textContent = row.note || "";
      note.hidden = !row.note;
    }
  }

  function selectSize(index) {
    if (index < 0 || index >= sizes.length) return;
    selectedSize = index;

    document.querySelectorAll("[data-size]").forEach(function (btn) {
      var on = Number(btn.dataset.size) === selectedSize;
      btn.classList.toggle("variant--selected", on);
      btn.setAttribute("aria-checked", String(on));
      btn.tabIndex = on ? 0 : -1;
    });

    var price = document.querySelector("[data-product-price]");
    if (price) price.textContent = money.format(sizes[selectedSize].price);
  }

  function selectColor(index) {
    if (index < 0 || index >= colors.length) return;
    selectedColor = index;

    var color = colors[selectedColor];

    document.querySelectorAll("[data-color]").forEach(function (btn) {
      var on = Number(btn.dataset.color) === selectedColor;
      btn.classList.toggle("swatch--selected", on);
      btn.setAttribute("aria-checked", String(on));
      btn.tabIndex = on ? 0 : -1;
    });

    var name = document.querySelector("[data-color-name]");
    if (name) name.textContent = color.label;

    /* Colours map to the same media groups the art products use, so the
       photo swaps with the colour. */
    var media = mediaFor(color);
    renderMedia(
      "[data-product-media]", media.image, media.alt, "ph--product",
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

  /* Click to choose, arrow keys to move, only the chosen one in the tab
     order. Every option row on the page uses it. */
  function initGroup(hook, attr, choose, count) {
    var wrap = document.querySelector(hook);
    if (!wrap) return;

    wrap.addEventListener("click", function (event) {
      var btn = event.target.closest("[" + attr + "]");
      if (!btn) return;
      choose(Number(btn.getAttribute(attr)));
    });

    wrap.addEventListener("keydown", function (event) {
      var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();

      var total = count();
      if (!total) return;

      var step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
      var current = Number(document.activeElement.getAttribute(attr)) || 0;
      var next = (current + step + total) % total;

      choose(next);
      var btn = wrap.querySelector("[" + attr + '="' + next + '"]');
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
      var qty = quantity();
      var base = product.slug || slug(product.title);
      var line;

      if (isApparel) {
        var size = sizes[selectedSize];
        var color = colors[selectedColor];
        if (!size || !color) return;
        line = {
          key: base + "::" + slug(size.label) + "::" + slug(color.label),
          price: size.price,
          variant: size.label + " / " + color.label
        };
      } else {
        var row = artSizes[selectedArtSize];
        if (!row) return;
        line = {
          key: base + "::" + slug(row.type) + "::" + slug(row.size),
          price: row.price,
          variant: row.type + " " + row.size
        };
      }

      FNU.cart.add({
        key: line.key,
        price: line.price,
        qty: qty,
        title: product.title,
        variant: line.variant,
        image: mediaFor(isApparel
          ? colors[selectedColor]
          : { group: artTypes[selectedType] }).image
      });

      var status = document.querySelector("[data-cart-status]");
      if (status) {
        status.textContent = "Added " + qty + " × " + product.title +
          ", " + line.variant + ", to cart.";
      }
    });
  }

  function apply(raw) {
    product = Object.assign({}, DEFAULTS, raw || {});

    /* Always derived from the product's own category — an apparel item
       must not end up filed under Art. */
    var category = String(product.category || "").trim();
    product.crumbs = [{ label: "Home", href: "/" }];
    if (category) {
      product.crumbs.push({ label: category, href: "/" + category.toLowerCase() + "/" });
    }
    if (!Array.isArray(product.notes)) product.notes = [];
    if (!Array.isArray(product.panels)) product.panels = [];
    if (!Array.isArray(product.media) || !product.media.length) {
      product.media = DEFAULTS.media;
    }

    isApparel = String(product.category || "").toLowerCase() === "apparel";

    sizes = (Array.isArray(product.sizes) ? product.sizes : [])
      .map(function (size) {
        return {
          label: String(size.label || "").trim(),
          price: Number(size.price) || 0,
          selected: !!size.selected
        };
      })
      .filter(function (size) { return size.label; });

    colors = (Array.isArray(product.colors) ? product.colors : [])
      .map(function (color) {
        return {
          label: String(color.label || "").trim(),
          hex: color.hex || "",
          group: color.group || color.label || "",
          selected: !!color.selected
        };
      })
      .filter(function (color) { return color.label; });

    variants = (Array.isArray(product.variants) ? product.variants : [])
      .map(readArtRow)
      .filter(function (row) { return row.type && row.size; });

    if (!variants.length && !isApparel) variants = DEFAULTS.variants.map(readArtRow);

    /* The material choices, in the order the shop listed them. */
    artTypes = [];
    variants.forEach(function (row) {
      if (artTypes.indexOf(row.type) === -1) artTypes.push(row.type);
    });
    /* An apparel product with no sizes or colours entered yet would have
       nothing to buy, so fall back to the art layout rather than showing
       an empty panel. */
    if (isApparel && (!sizes.length || !colors.length)) {
      isApparel = false;
      if (!variants.length) {
        variants = DEFAULTS.variants.map(readArtRow);
        artTypes = [];
        variants.forEach(function (row) {
          if (artTypes.indexOf(row.type) === -1) artTypes.push(row.type);
        });
      }
    }

    var title = document.querySelector("[data-product-title]");
    if (title) title.textContent = product.title;
    document.title = product.title + " — Forty Nine Unbeaten";

    var ship = document.querySelector("[data-product-ship]");
    if (ship) {
      ship.textContent = product.ship_note || "";
      ship.hidden = !product.ship_note;
    }

    if (product.title) {
      var last = product.crumbs[product.crumbs.length - 1];
      if (!last || last.label !== product.title) {
        product.crumbs = product.crumbs.concat([{ label: product.title, href: "#" }]);
      }
    }

    renderCrumbs();
    renderMedia("[data-showcase-media]", product.showcase_image, product.showcase_alt, "ph--showcase", "img");
    renderNotes();
    renderPanels();
    renderSizeGuide();

    var artPanel = document.querySelector("[data-art-options]");
    var apparelPanel = document.querySelector("[data-apparel-options]");
    if (artPanel) artPanel.hidden = isApparel;
    if (apparelPanel) apparelPanel.hidden = !isApparel;

    function preferredIndex(list) {
      var found = 0;
      list.forEach(function (entry, index) { if (entry.selected) found = index; });
      return found;
    }

    if (isApparel) {
      renderSizes();
      renderColors();
      selectSize(preferredIndex(sizes));
      selectColor(preferredIndex(colors));
    } else {
      renderArtTypes();
      /* Opens on the material carrying the shop's default row. */
      var openOn = 0;
      variants.forEach(function (row) {
        if (row.selected) openOn = Math.max(0, artTypes.indexOf(row.type));
      });
      selectType(openOn);
    }
  }

  function init() {
    if (!document.querySelector("[data-art-types]")) return;

    initGroup("[data-art-types]", "data-art-type", selectType, function () { return artTypes.length; });
    initGroup("[data-art-sizes]", "data-art-size", selectArtSize, function () { return artSizes.length; });
    initGroup("[data-sizes]", "data-size", selectSize, function () { return sizes.length; });
    initGroup("[data-colors]", "data-color", selectColor, function () { return colors.length; });
    initQuantity();
    initAddToCart();

    var get = FNU.fetchJson || function () { return Promise.resolve(null); };

    get("/content/products.json").then(function (raw) {
      var items = (raw && Array.isArray(raw.items)) ? raw.items : [];
      var wanted = wantedSlug();

      /* Fall back to the first product when the address has no slug or
         names one that no longer exists, so the page always renders. */
      var found = wanted && items.filter(function (item) {
        return item.slug === wanted;
      })[0];

      apply(found || items[0] || null);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
