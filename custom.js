/* Forty Nine Unbeaten — the custom order page.

   Every word, price and option comes from content/custom.json, so the shop
   changes what it offers without touching this file.

   The order of the form is deliberate: what the buyer gets and how long it
   takes, then the photograph while the reason they came is still on their
   mind, then what it becomes and what that costs, and only then the tedious
   part — the address. The full price sits immediately above the button.

   Payment is not connected yet. The button validates, gathers everything
   and says so plainly rather than pretending an order was placed. */
(function () {
  "use strict";

  var FNU = window.FNU || {};
  var money = FNU.money || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  var DEFAULTS = {
    title: "Custom Order",
    lede: "",
    steps: [],
    timing: "",
    photo_help: "",
    rights: [],
    variants: [],
    shipping_label: "Shipping",
    shipping_text: "Included",
    submit: "Pay and order",
    reassure: ""
  };

  var content = DEFAULTS;
  var types = [];
  var sizes = [];
  var rights = [];
  var selectedType = 0;
  var selectedSize = 0;
  var selectedRights = 0;
  var photo = null;

  var form = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function text(hook, value) {
    var node = document.querySelector(hook);
    if (!node) return;
    node.textContent = value || "";
    node.hidden = !value;
  }

  /* ------------------------------------------------------------------
     Choices — the same two-step material/size pattern as a product page
     ------------------------------------------------------------------ */

  function renderChoices(hook, attr, labels, className) {
    var wrap = document.querySelector(hook);
    if (!wrap) return;

    wrap.textContent = "";
    labels.forEach(function (label, index) {
      var btn = document.createElement("button");
      btn.className = className;
      btn.type = "button";
      btn.setAttribute(attr, String(index));
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.tabIndex = -1;

      if (typeof label === "string") {
        btn.textContent = label;
      } else {
        btn.appendChild(el("span", "choice__label", label.label));
        if (label.note) btn.appendChild(el("span", "choice__note", label.note));
      }

      wrap.appendChild(btn);
    });
  }

  function paint(attr, className, index) {
    document.querySelectorAll("[" + attr + "]").forEach(function (btn) {
      var on = Number(btn.getAttribute(attr)) === index;
      btn.classList.toggle(className, on);
      btn.setAttribute("aria-checked", String(on));
      btn.tabIndex = on ? 0 : -1;
    });
  }

  function selectType(index) {
    if (index < 0 || index >= types.length) return;

    var wanted = sizes[selectedSize] && sizes[selectedSize].size;
    selectedType = index;
    paint("data-custom-type", "variant--selected", selectedType);

    var type = types[selectedType];
    sizes = content.variants.filter(function (row) { return row.type === type; });
    renderChoices("[data-custom-sizes]", "data-custom-size",
      sizes.map(function (row) { return row.size; }), "variant variant--size");

    var keep = 0;
    sizes.forEach(function (row, i) {
      if (row.size === wanted) keep = i;
    });
    if (!sizes.some(function (row) { return row.size === wanted; })) {
      sizes.forEach(function (row, i) { if (row.selected) keep = i; });
    }
    selectSize(keep);
  }

  function selectSize(index) {
    if (index < 0 || index >= sizes.length) return;
    selectedSize = index;
    paint("data-custom-size", "variant--selected", selectedSize);
    text("[data-custom-note]", sizes[selectedSize].note);
    paintSummary();
  }

  function selectRights(index) {
    if (index < 0 || index >= rights.length) return;
    selectedRights = index;
    paint("data-custom-rights-choice", "choice--selected", selectedRights);
    paintSummary();
  }

  /* ------------------------------------------------------------------
     Price
     ------------------------------------------------------------------ */

  function total() {
    var base = (sizes[selectedSize] && Number(sizes[selectedSize].price)) || 0;
    var adjust = (rights[selectedRights] && Number(rights[selectedRights].surcharge)) || 0;
    return Math.max(0, base + adjust);
  }

  function paintSummary() {
    var row = sizes[selectedSize];
    var right = rights[selectedRights];

    var what = [types[selectedType], row && row.size].filter(Boolean).join(" ");
    text("[data-summary-what]", what ? "Custom piece — " + what : "Custom piece");

    var line = document.querySelector("[data-summary-price]");
    if (line) line.textContent = row ? money.format(total()) : "—";

    /* The exclusivity choice moves the price, so it has to be visible in
       the summary rather than only in the option itself. */
    var note = document.querySelector("[data-summary-shipping-label]");
    if (note) note.textContent = content.shipping_label || "Shipping";
    text("[data-summary-shipping]", content.shipping_text || "");

    var sum = document.querySelector("[data-summary-total]");
    if (sum) sum.textContent = row ? money.format(total()) : "—";

    var button = document.querySelector("[data-custom-submit]");
    if (button && row) {
      button.textContent = (content.submit || "Pay and order") + " — " + money.format(total());
    }

    if (right && right.label) {
      var whatEl = document.querySelector("[data-summary-what]");
      if (whatEl) whatEl.textContent += " · " + right.label;
    }
  }

  /* ------------------------------------------------------------------
     Photograph
     ------------------------------------------------------------------ */

  var MAX_BYTES = 25 * 1024 * 1024;

  function initPhoto() {
    var input = document.querySelector("[data-photo-input]");
    var label = document.querySelector("[data-drop-text]");
    var preview = document.querySelector("[data-photo-preview]");
    if (!input) return;

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      showError("photo", "");

      if (!file) {
        photo = null;
        if (label) label.textContent = "Choose a photograph";
        if (preview) { preview.hidden = true; preview.removeAttribute("src"); }
        return;
      }

      if (!/^image\//.test(file.type)) {
        photo = null;
        input.value = "";
        showError("photo", "That is not an image. JPG or PNG, please.");
        return;
      }

      if (file.size > MAX_BYTES) {
        photo = null;
        input.value = "";
        showError("photo", "That file is over 25 MB. Try exporting it a little smaller.");
        return;
      }

      photo = file;
      if (label) label.textContent = file.name;
      if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      }
    });
  }

  /* ------------------------------------------------------------------
     Validation and submit
     ------------------------------------------------------------------ */

  function showError(name, message) {
    var node = document.querySelector('[data-error="' + name + '"]');
    if (!node) return;
    node.textContent = message || "";
    node.hidden = !message;

    var field = document.getElementById("custom-" + name);
    if (field) field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  var REQUIRED = [
    { name: "name", message: "We need a name for the parcel." },
    { name: "email", message: "We need an email to send the confirmation to." },
    { name: "address", message: "Street and number, please." },
    { name: "city", message: "Which city?" },
    { name: "zip", message: "Postcode, please." },
    { name: "country", message: "Which country?" }
  ];

  function validate() {
    var problems = [];

    if (!photo) {
      showError("photo", "Choose the photograph you would like painted.");
      problems.push("photo");
    }

    REQUIRED.forEach(function (rule) {
      var field = document.getElementById("custom-" + rule.name);
      var value = field ? String(field.value || "").trim() : "";
      if (!value) {
        showError(rule.name, rule.message);
        problems.push(rule.name);
        return;
      }
      if (rule.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        showError(rule.name, "That email address doesn't look right.");
        problems.push(rule.name);
        return;
      }
      showError(rule.name, "");
    });

    return problems;
  }

  function initSubmit() {
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var problems = validate();
      var formError = document.querySelector("[data-form-error]");

      if (problems.length) {
        if (formError) {
          formError.textContent = problems.length === 1
            ? "One thing still needs filling in — it is marked above."
            : problems.length + " things still need filling in — they are marked above.";
          formError.hidden = false;
        }
        /* Send them to the first thing that needs attention rather than
           leaving them to hunt for it. */
        var first = document.querySelector('[data-error="' + problems[0] + '"]');
        var target = first && first.closest(".field");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (formError) formError.hidden = true;

      /* Everything is in hand. Payment is the piece that is not connected
         yet, so say that rather than implying an order exists. */
      var status = document.querySelector("[data-custom-status]");
      if (status) status.textContent = "Details complete. Payment is not connected yet.";
      if (formError) {
        formError.textContent =
          "Everything is filled in correctly — but payment isn't connected yet, " +
          "so this order can't be placed. Write to us and we'll take it from there.";
        formError.hidden = false;
      }
    });
  }

  /* ------------------------------------------------------------------
     Wiring
     ------------------------------------------------------------------ */

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

      var size = count();
      if (!size) return;

      var step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
      var current = Number(document.activeElement.getAttribute(attr)) || 0;
      var next = (current + step + size) % size;
      choose(next);

      var btn = wrap.querySelector("[" + attr + '="' + next + '"]');
      if (btn) btn.focus();
    });
  }

  function apply(raw) {
    content = Object.assign({}, DEFAULTS, raw || {});

    document.title = content.title + " — Forty Nine Unbeaten";
    text("[data-custom-title]", content.title);
    text("[data-custom-lede]", content.lede);
    text("[data-custom-timing]", content.timing);
    text("[data-custom-photo-help]", content.photo_help);
    text("[data-custom-reassure]", content.reassure);

    var steps = document.querySelector("[data-custom-steps]");
    if (steps) {
      steps.textContent = "";
      (content.steps || []).forEach(function (step) {
        steps.appendChild(el("li", "steps__item", step));
      });
      steps.hidden = !(content.steps || []).length;
    }

    /* Materials, in the order the shop listed them. */
    content.variants = Array.isArray(content.variants) ? content.variants : [];
    types = [];
    content.variants.forEach(function (row) {
      if (row.type && types.indexOf(row.type) === -1) types.push(row.type);
    });

    rights = Array.isArray(content.rights) ? content.rights : [];

    renderChoices("[data-custom-types]", "data-custom-type", types, "variant variant--size");
    renderChoices("[data-custom-rights]", "data-custom-rights-choice", rights, "choice");

    var openType = 0;
    content.variants.forEach(function (row) {
      if (row.selected) openType = Math.max(0, types.indexOf(row.type));
    });
    var openRights = 0;
    rights.forEach(function (row, i) { if (row.selected) openRights = i; });

    selectType(openType);
    selectRights(openRights);
  }

  function init() {
    form = document.querySelector("[data-custom-form]");
    if (!form) return;

    initGroup("[data-custom-types]", "data-custom-type", selectType, function () { return types.length; });
    initGroup("[data-custom-sizes]", "data-custom-size", selectSize, function () { return sizes.length; });
    initGroup("[data-custom-rights]", "data-custom-rights-choice", selectRights, function () { return rights.length; });
    initPhoto();
    initSubmit();

    var get = FNU.fetchJson || function () { return Promise.resolve(null); };
    get("/content/custom.json").then(apply);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
