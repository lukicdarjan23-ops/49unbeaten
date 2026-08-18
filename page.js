/* Forty Nine Unbeaten — simple content pages (contact, privacy, terms).

   Each page names its content file with data-page on <body>; the shape
   is the same for all three, so one script covers them. Anything the
   file doesn't provide just doesn't render. */
(function () {
  "use strict";

  function text(el, value) {
    if (!el) return;
    el.textContent = value || "";
    el.hidden = !value;
  }

  function renderSections(data) {
    var wrap = document.querySelector("[data-page-sections]");
    if (!wrap) return;

    var sections = Array.isArray(data.sections) ? data.sections : [];
    wrap.textContent = "";

    sections.forEach(function (section) {
      var block = document.createElement("section");
      block.className = "prose__block";

      if (section.heading) {
        var h = document.createElement("h2");
        h.className = "prose__heading";
        h.textContent = section.heading;
        block.appendChild(h);
      }

      /* Blank lines separate paragraphs, so the CMS field stays a plain
         textarea rather than needing markup. */
      String(section.body || "").split(/\n\s*\n/).forEach(function (para) {
        var trimmed = para.trim();
        if (!trimmed) return;
        var p = document.createElement("p");
        p.textContent = trimmed;
        block.appendChild(p);
      });

      wrap.appendChild(block);
    });
  }

  /* Ways onward from a page that is an end in itself — the 404 and the
     order confirmation. Listed in the CMS as label plus address. */
  function renderLinks(data) {
    var wrap = document.querySelector("[data-page-links]");
    if (!wrap) return;

    var links = Array.isArray(data.links) ? data.links : [];
    wrap.textContent = "";

    links.forEach(function (link) {
      if (!link || !link.label) return;
      var a = document.createElement("a");
      a.className = "page__link";
      a.href = link.href || "index.html";
      a.textContent = link.label;
      wrap.appendChild(a);
    });

    wrap.hidden = !wrap.childNodes.length;
  }

  /* Landing here means the payment provider sent the shopper back after a
     completed order, so the basket they just paid for should not still be
     sitting in the header. Gated on the provider's reference being in the
     address: someone who simply opens the page keeps their cart. */
  function clearPaidCart() {
    if (document.body.dataset.page !== "thanks") return;

    var params = new URLSearchParams(window.location.search);
    var paid = params.get("order") || params.get("token") || params.get("paymentId");
    if (!paid) return;

    if (window.FNU && window.FNU.cart && window.FNU.cart.clear) {
      window.FNU.cart.clear();
    }

    var ref = document.querySelector("[data-order-ref]");
    if (ref) {
      ref.textContent = paid;
      ref.hidden = false;
    }
  }

  function renderContacts(data) {
    var wrap = document.querySelector("[data-contact-methods]");
    if (!wrap) return;

    var methods = [
      { label: "Email", value: data.email, href: "mailto:" + data.email },
      {
        label: "WhatsApp",
        value: data.whatsapp,
        /* wa.me needs the number stripped of spaces, dashes and the + */
        href: "https://wa.me/" + String(data.whatsapp || "").replace(/[^0-9]/g, "")
      }
    ];

    wrap.textContent = "";
    methods.forEach(function (method) {
      if (!method.value) return;

      var row = document.createElement("a");
      row.className = "contact__row";
      row.href = method.href;
      if (method.label === "WhatsApp") {
        row.target = "_blank";
        row.rel = "noopener noreferrer";
      }

      var label = document.createElement("span");
      label.className = "contact__label";
      label.textContent = method.label;

      var value = document.createElement("span");
      value.className = "contact__value";
      value.textContent = method.value;

      row.appendChild(label);
      row.appendChild(value);
      wrap.appendChild(row);
    });
  }

  function apply(data) {
    if (!data) return;

    text(document.querySelector("[data-page-title]"), data.title);
    text(document.querySelector("[data-page-intro]"), data.intro);
    text(document.querySelector("[data-page-updated]"), data.updated);

    if (data.title) document.title = data.title + " — Forty Nine Unbeaten";

    renderSections(data);
    renderContacts(data);
    renderLinks(data);
  }

  function init() {
    var page = document.body.dataset.page;
    if (!page) return;

    clearPaidCart();

    var get = (window.FNU && window.FNU.fetchJson) ||
      function () { return Promise.resolve(null); };

    get("content/" + page + ".json").then(apply);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
