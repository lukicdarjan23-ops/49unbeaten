# Forty Nine Unbeaten

Static storefront built to the supplied designs: a homepage (sticky header
with centred wordmark, full-bleed hero, hairline-ruled "Top Sellers" grid,
black footer with the circular seal) and a product page (split image / buy
panel, variant picker, quantity, cart). Content is editable through a CMS at
`/admin` — no code editing required for day-to-day updates. See
[Editing content](#editing-content-cms) below.

No build step and no dependencies. To preview locally, the content files are
loaded with `fetch()`, which browsers block on a plain `file://` page, so
serve the folder instead of double-clicking `index.html`:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Addresses

Every page is a folder, so nothing on the site ends in `.html`. That is how
shops are normally addressed, and it means the addresses stay valid if the
site is ever rebuilt on something else.

| Address | Page |
| --- | --- |
| `/` | Homepage |
| `/products/` | Every product, whatever the category |
| `/products/<slug>/` | One product. Generated at deploy time, one per entry in the catalogue |
| `/art/`, `/apparel/`, `/gifts/` | Category pages |
| `/cart/`, `/contact/`, `/shipping/`, `/terms/`, `/privacy/`, `/thanks/` | Standing pages |
| `/404.html` | Served by Netlify for anything that isn't a real address |

The `.html` addresses these replaced are 301-redirected in `netlify.toml`,
so nothing shared before the change breaks.

A product's slug **is** its address. Change one after the site is indexed
and the old address dies — the CMS says so on the field.

## Files

| File | Contents |
| --- | --- |
| `index.html` | Homepage — header, hero, product grid, footer |
| `product.html` | The template every product page is stamped from. Redirected away, never served |
| `products/index.html` | All Products — the whole catalogue on one page |
| `art/`, `apparel/`, `gifts/` | Category pages — 260px hero, then the product grid |
| `cart/`, `contact/`, `shipping/`, `terms/`, `privacy/`, `thanks/` | The standing pages |
| `404.html` | Page not found |
| `tools/build.js` | The deploy step — see below |
| `styles.css` | All styling, design tokens at the top |
| `script.js` | Shared: cart store, header cart readout, mobile menu, logos, hero, homepage grid |
| `product.js` | Product page: variants, sizes, colours, size guide, add to cart |
| `cart.js` | Cart drawer (injected on every page) and the cart page |
| `category.js` | Category pages — hero and the category-filtered grid |
| `all.js` | All Products — the whole catalogue, ordered as the CMS says |
| `page.js` | Contact, legal, thank-you and 404 (picks its file from `data-page` on `<body>`) |
| `content/settings.json` | Icons, share card, logos, hero, section heading, social links, footer notice |
| `content/products.json` | The whole catalogue — one entry per product, holding both its card and its full product page |
| `content/categories.json` | Category headings and hero images |
| `content/allproducts.json` | All Products page — heading, hero, and the order products come in |
| `content/contact.json` | Contact email and WhatsApp number |
| `content/shipping.json` | Shipping and returns copy |
| `content/thanks.json`, `content/notfound.json` | Order confirmation and page-not-found copy |
| `content/privacy.json`, `content/terms.json` | Legal page copy |

## The deploy step

`node tools/build.js`, run by Netlify on every publish including the ones
the CMS triggers. Everything else on this site is filled in by the browser;
this handles the three things a browser is too late for.

1. **Icons and the share card.** Facebook, WhatsApp and the rest read the
   raw HTML and never run JavaScript, so these have to be in the file.
2. **A page per product** at `/products/<slug>/`, carrying that product's
   own title, description and share card. Without it every product is one
   identical page to a search engine.
3. **`sitemap.xml`**, listing what exists right now — so a product added in
   the CMS is in the sitemap with nothing to remember.

Product folders are generated, not committed; `.gitignore` keeps them out.
Run the script locally before testing, or those pages won't be there.

If `products.json` or `settings.json` exists but isn't valid JSON, the
script stops with a non-zero exit. That fails the deploy on purpose — a
failed deploy leaves the last good version of the site serving, which beats
publishing a shop with no products in it.

| `admin/` | The Decap CMS admin panel (`/admin`) — see below |
| `netlify.toml` | Tells Netlify to serve the repo root as-is (no build step) |

## Editing content (CMS)

The site is wired to [Decap CMS](https://decapcms.org/) (formerly Netlify
CMS), hosted at `/admin` on the live site. It gives you a login-protected
page with real forms — text fields, an image picker/uploader, add/remove
buttons for products — no GitHub or code knowledge needed. Saving in the CMS
commits the change straight to this repo, which redeploys the site
automatically.

**One-time setup (do this once, in your own Netlify account):**

1. Sign in at [netlify.com](https://app.netlify.com) (free), **Add new site
   → Import an existing project**, and connect it to this GitHub repo.
   Leave the build command blank and publish directory as `.` — `netlify.toml`
   already sets this.
2. In the new site's dashboard: **Site configuration → Identity → Enable
   Identity**.
3. Still under Identity → **Registration**, set it to **Invite only** (so
   random people can't self-register as editors).
4. Under Identity → **Services**, enable **Git Gateway**. This is what lets
   the CMS commit to GitHub on your behalf without you creating a GitHub
   token.
5. Back in Identity, **Invite users** and send yourself an invite to the
   email you want to log in with. Accept it from the email you receive —
   it'll ask you to set a password.
6. Visit `https://<your-site>.netlify.app/admin` and log in. You'll see
   **Site Settings**, **Products** and **Product Page** in the sidebar.

After that, editing is just: go to `/admin`, log in, change the field,
**Publish**. The live site updates within a minute or two.

**If you rename the branch** this repo deploys from (currently
`claude/homepage-build-h289yn`), update the `branch:` value in
`admin/config.yml` to match — the CMS commits to whatever branch is set
there.

**Editing without the CMS** still works if you'd rather not set up Netlify —
open `content/settings.json` or `content/products.json` directly on
GitHub.com (pencil icon → edit → commit) or send me the change and I'll push
it. Both files are validated at read time, so a mistake there just falls back
to the site's built-in defaults instead of breaking the page.

## Notes

- **Layout.** The footer's contents sit in a centred `--container` (860px);
  the header runs edge to edge with a 40px inset, and the hero and product
  grid are full-bleed, matching the design. Grid steps 4 → 3 → 2 columns at 1000px and 760px, and the cell
  hairlines are recalculated at each breakpoint so no stray rules appear on the
  last column or last row.
- **Buying happens on the product page.** Homepage cards carry no add-to-cart
  control — the whole card links through to `product.html`, where the variant
  is chosen. Each variant in `content/product.json` sets its own price and its
  own note (framed / not framed), and exactly one is marked `selected` as the
  default the page opens on.
- **Cart.** Client-side only, persisted to `localStorage` under `fnu.cart.v2`,
  so it survives a reload and is shared by every page. Each line stores its
  own price, title, variant and image at the time it was added, so nothing
  has to be looked back up. The store is `window.FNU.cart`
  (`add`, `items`, `setQty`, `remove`, `totals`, `onChange`).
- **Drawer and cart page.** `cart.js` injects the drawer into every page and
  upgrades the header cart link to open it; the link still points at
  `/cart/`, so middle-click and no-JS both still work. Both surfaces render
  the same line component and re-render from `cart.onChange`.
- **Checkout is not connected.** The button is real but `startCheckout()` in
  `cart.js` only explains that no payment provider is wired up. A static site
  cannot take card details itself — point it at Stripe Checkout, Snipcart or
  similar. Until then the cart cannot produce an order, and nothing tracks
  stock, shipping cost or tax.
- **Product images follow the material.** `content/product.json` holds one
  image per group (Print, Canvas) and each variant names its group, so both
  sizes of a material share one photo and switching material swaps it. The
  image sits in a fixed 540px square box with `object-fit: contain`, so
  switching never shifts the layout. While a group's image is still empty the
  placeholder reads "print img" / "canvas img" so the swap is visible before
  any upload.
- **The legal pages are drafts, not legal advice.** `content/privacy.json`
  and `content/terms.json` are written around what this shop actually does
  (made to order, ships worldwide, all sales final) but every `[SQUARE
  BRACKET]` is a real detail only you can supply — business name, address,
  jurisdiction, payment and fulfilment providers, retention periods. Fill
  those in and have someone qualified review both pages before taking money.
- **One catalogue, tagged by category.** `content/products.json` is the single
  product list and each item carries a Category (Art / Apparel / Gifts). The
  homepage grid shows the lot; each category page filters to its own. A
  product is entered once. A category with nothing in it shows a short empty
  message rather than a bare grid.
- **Products are added from the CMS.** `content/products.json` holds every
  product, each with its own slug, card fields and full product-page content
  (images per material, variants, notes, panels). `product.html?p=<slug>`
  looks the product up by slug, so adding an entry in the CMS gives that
  product a working page with no new files and no build step. A slug that
  doesn't match anything falls back to the first product rather than
  rendering an empty page.
- **URLs carry a query string** (`product.html?p=the-statue`) rather than
  being folders (`/prints/the-statue`). That is the trade for having no build
  step. If search ranking matters later, a static site generator would give
  clean paths — but it adds tooling.
- **Type.** Poppins from Google Fonts, with a Helvetica/Arial fallback stack if
  the font fails to load.
- **Accessibility.** Skip link, labelled nav landmarks, visible focus rings,
  Escape closes the mobile menu, and `prefers-reduced-motion` is respected.
