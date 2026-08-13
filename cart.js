/* Forty Nine Unbeaten — cart drawer and cart page.

   The drawer is injected into every page so the header cart can open it
   anywhere; the cart page reuses the same line rendering. Both read
   window.FNU.cart from script.js and re-render on its onChange.

   Checkout is deliberately not wired: taking payment needs a provider
   (Stripe, Snipcart, …). Replace startCheckout() with the real call. */
(function () {
  "use strict";

  var FNU = window.FNU || {};
  var cart = FNU.cart;
  var money = FNU.money || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  if (!cart) return;

  var drawer = null;
  var lastFocus = null;

  /* ------------------------------------------------------------------
     Line rendering — shared by the drawer and the cart page
     ------------------------------------------------------------------ */

  function buildThumb(line) {
    var wrap = document.createElement("div");
    wrap.className = "line__thumb";

    if (line.image) {
      var img = document.createElement("img");
      img.src = line.image;
      img.alt = "";
      img.loading = "lazy";
      wrap.appendChild(img);
    } else {
      wrap.classList.add("line__thumb--empty");
      wrap.textContent = "img";
    }

    return wrap;
  }

  function buildStepper(line) {
    var qty = document.createElement("div");
    qty.className = "qty qty--sm";

    var less = document.createElement("button");
    less.className = "qty__btn";
    less.type = "button";
    less.textContent = "−";
    less.dataset.step = "-1";
    less.dataset.key = line.key;
    less.setAttribute("aria-label", "Decrease quantity of " + line.title + ", " + line.variant);

    var count = document.createElement("span");
    count.className = "qty__count";
    count.textContent = String(line.qty);

    var more = document.createElement("button");
    more.className = "qty__btn";
    more.type = "button";
    more.textContent = "+";
    more.dataset.step = "1";
    more.dataset.key = line.key;
    more.setAttribute("aria-label", "Increase quantity of " + line.title + ", " + line.variant);

    qty.appendChild(less);
    qty.appendChild(count);
    qty.appendChild(more);
    return qty;
  }

  function buildLine(line) {
    var row = document.createElement("li");
    row.className = "line";

    var body = document.createElement("div");
    body.className = "line__body";

    var title = document.createElement("p");
    title.className = "line__title";
    title.textContent = line.title;

    var variant = document.createElement("p");
    variant.className = "line__variant";
    variant.textContent = line.variant;

    var controls = document.createElement("div");
    controls.className = "line__controls";
    controls.appendChild(buildStepper(line));

    var remove = document.createElement("button");
    remove.className = "line__remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.dataset.remove = line.key;
    remove.setAttribute("aria-label", "Remove " + line.title + ", " + line.variant + ", from cart");
    controls.appendChild(remove);

    body.appendChild(title);
    body.appendChild(variant);
    body.appendChild(controls);

    var price = document.createElement("p");
    price.className = "line__price";
    price.textContent = money.format(line.price * line.qty);
    /* Only worth showing the unit price once it differs from the line total. */
    if (line.qty > 1) {
      var each = document.createElement("span");
      each.className = "line__each";
      each.textContent = money.format(line.price) + " each";
      price.appendChild(each);
    }

    row.appendChild(buildThumb(line));
    row.appendChild(body);
    row.appendChild(price);
    return row;
  }

  function buildEmpty(message) {
    var wrap = document.createElement("div");
    wrap.className = "cart-empty";

    var p = document.createElement("p");
    p.textContent = message;

    var link = document.createElement("a");
    link.className = "cart-empty__link";
    link.href = "index.html";
    link.textContent = "Browse the shop";

    wrap.appendChild(p);
    wrap.appendChild(link);
    return wrap;
  }

  function renderLines(target, emptyMessage) {
    var lines = cart.items();
    target.textContent = "";

    if (!lines.length) {
      target.appendChild(buildEmpty(emptyMessage));
      return 0;
    }

    var list = document.createElement("ul");
    list.className = "lines";
    lines.forEach(function (line) { list.appendChild(buildLine(line)); });
    target.appendChild(list);
    return lines.length;
  }

  /* Quantity and remove clicks work the same in both places. */
  function wireLineControls(root) {
    root.addEventListener("click", function (event) {
      var step = event.target.closest("[data-step]");
      if (step) {
        var current = cart.items().filter(function (l) { return l.key === step.dataset.key; })[0];
        if (current) cart.setQty(step.dataset.key, current.qty + Number(step.dataset.step));
        return;
      }

      var remove = event.target.closest("[data-remove]");
      if (remove) cart.remove(remove.dataset.remove);
    });
  }

  function startCheckout(notice) {
    /* No payment provider is connected yet — say so rather than
       pretending an order was placed. */
    if (!notice) return;
    notice.textContent =
      "Checkout isn't connected yet. Wire startCheckout() in cart.js to your " +
      "payment provider (Stripe, Snipcart) to take payment.";
    notice.hidden = false;
  }

  /* ------------------------------------------------------------------
     Drawer
     ------------------------------------------------------------------ */

  function buildDrawer() {
    var root = document.createElement("div");
    root.className = "drawer";
    root.hidden = true;
    root.innerHTML =
      '<div class="drawer__scrim" data-drawer-close></div>' +
      '<aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Cart">' +
        '<div class="drawer__head">' +
          '<h2 class="drawer__title">Cart</h2>' +
          '<button class="drawer__close" type="button" aria-label="Close cart" data-drawer-close>×</button>' +
        '</div>' +
        '<div class="drawer__body" data-drawer-lines></div>' +
        '<div class="drawer__foot" data-drawer-foot>' +
          '<div class="sum">' +
            '<span>Subtotal</span>' +
            '<span data-cart-total>$0.00</span>' +
          '</div>' +
          '<p class="sum__note">Shipping and any duties are calculated at checkout.</p>' +
          '<button class="btn-cart" type="button" data-checkout>Checkout</button>' +
          '<p class="sum__notice" data-checkout-notice hidden></p>' +
          '<a class="sum__link" href="cart.html">View full cart</a>' +
        '</div>' +
      '</aside>';

    document.body.appendChild(root);
    return root;
  }

  function focusables() {
    return Array.prototype.filter.call(
      drawer.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;

    drawer.hidden = false;
    void drawer.offsetWidth; /* let the transition run from the closed state */
    drawer.classList.add("is-open");
    document.body.classList.add("has-drawer");

    renderDrawer();
    var close = drawer.querySelector(".drawer__close");
    if (close) close.focus();
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;

    drawer.classList.remove("is-open");
    document.body.classList.remove("has-drawer");

    var panel = drawer.querySelector(".drawer__panel");
    var done = function () { drawer.hidden = true; };
    /* Wait for the slide-out so the panel doesn't vanish mid-transition. */
    if (panel && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.addEventListener("transitionend", done, { once: true });
      window.setTimeout(done, 400); /* fallback if transitionend never fires */
    } else {
      done();
    }

    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderDrawer() {
    if (!drawer || drawer.hidden) return;

    var count = renderLines(
      drawer.querySelector("[data-drawer-lines]"),
      "Your cart is empty."
    );

    var foot = drawer.querySelector("[data-drawer-foot]");
    if (foot) foot.hidden = !count;

    var notice = drawer.querySelector("[data-checkout-notice]");
    if (notice) notice.hidden = true;

    if (cart.paint) cart.paint(false);
  }

  function initDrawer() {
    drawer = buildDrawer();
    wireLineControls(drawer);

    drawer.addEventListener("click", function (event) {
      if (event.target.closest("[data-drawer-close]")) closeDrawer();
      if (event.target.closest("[data-checkout]")) {
        startCheckout(drawer.querySelector("[data-checkout-notice]"));
      }
    });

    document.addEventListener("keydown", function (event) {
      if (drawer.hidden) return;

      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      /* Keep tabbing inside the panel while it's modal. */
      if (event.key !== "Tab") return;
      var list = focusables();
      if (!list.length) return;

      var first = list[0];
      var last = list[list.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* The header cart stays a real link to cart.html; JS upgrades it to
       open the drawer instead. */
    document.querySelectorAll("a.cart").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
        event.preventDefault();
        openDrawer();
      });
    });

    cart.onChange(renderDrawer);
    window.FNU.openCart = openDrawer;
  }

  /* ------------------------------------------------------------------
     Cart page
     ------------------------------------------------------------------ */

  function renderPage() {
    var target = document.querySelector("[data-cart-lines]");
    if (!target) return;

    var count = renderLines(target, "Your cart is empty.");

    var summary = document.querySelector("[data-cart-summary]");
    if (summary) summary.hidden = !count;

    if (cart.paint) cart.paint(false);
  }

  function initPage() {
    var target = document.querySelector("[data-cart-lines]");
    if (!target) return;

    wireLineControls(target);

    var summary = document.querySelector("[data-cart-summary]");
    if (summary) {
      summary.addEventListener("click", function (event) {
        if (!event.target.closest("[data-checkout]")) return;
        startCheckout(summary.querySelector("[data-checkout-notice]"));
      });
    }

    cart.onChange(renderPage);
    renderPage();
  }

  function init() {
    initDrawer();
    initPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
