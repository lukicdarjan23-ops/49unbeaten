/* Forty Nine Unbeaten — homepage behaviour */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Product data
     Placeholder catalogue. Give an item an `image` (and `alt`) and the
     card renders a real <img> instead of the grey "img" block.
     ------------------------------------------------------------------ */

  var PRODUCTS = [
    { id: "statue-01", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-02", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-03", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-04", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-05", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-06", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-07", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-08", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-09", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-10", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-11", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" },
    { id: "statue-12", title: "The Statue", type: "Print", price: 89, href: "/prints/the-statue" }
  ];

  var money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  /* ------------------------------------------------------------------
     Product grid
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

    var add = document.createElement("button");
    add.className = "card__add";
    add.type = "button";
    add.dataset.add = product.id;
    add.setAttribute("aria-label", "Add " + product.title + " to cart");
    add.textContent = "+";

    foot.appendChild(price);
    foot.appendChild(add);

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

  function totals() {
    var count = 0;
    var value = 0;

    Object.keys(cart).forEach(function (id) {
      var qty = cart[id];
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

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
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
    renderGrid();

    var grid = document.querySelector("[data-grid]");
    if (!grid) return;

    grid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-add]");
      if (!button) return;
      addToCart(button.dataset.add);
    });
  }

  function init() {
    initGrid();
    initMenu();
    paintCart(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
