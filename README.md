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

## Files

| File | Contents |
| --- | --- |
| `index.html` | Homepage — header, hero, product grid, footer |
| `product.html` | Product page — image, variants, quantity, add to cart |
| `art.html`, `apparel.html`, `gifts.html` | Category pages — 260px hero, then the product grid |
| `cart.html` | Cart page — lines, quantities, subtotal, checkout |
| `contact.html` | Contact — email and WhatsApp |
| `privacy.html`, `terms.html` | Legal pages, rendered from JSON |
| `styles.css` | All styling for both pages, design tokens at the top |
| `script.js` | Shared: cart store, header cart readout, mobile menu, homepage grid |
| `product.js` | Product page only: variants, quantity, add to cart |
| `cart.js` | Cart drawer (injected on every page) and the cart page |
| `category.js` | Category pages — hero and the category-filtered grid |
| `page.js` | Contact and legal pages (picks its file from `data-page` on `<body>`) |
| `content/settings.json` | Hero image/link, section heading, social links, footer notice |
| `content/products.json` | The product catalogue, each item tagged with a Category |
| `content/categories.json` | Category headings and hero images |
| `content/product.json` | The product page — images per material, variants, prices, panels |
| `content/contact.json` | Contact email and WhatsApp number |
| `content/privacy.json`, `content/terms.json` | Legal page copy |
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
  `cart.html`, so middle-click and no-JS both still work. Both surfaces render
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
- **Only one product page, and the CMS cannot add more.** `product.html`
  renders whichever single product sits in `content/product.json`, so every
  card currently links to the same page. Adding a second product needs one of:
  a folder collection plus `product.html?p=<slug>` (no build step, uglier
  URLs), or a static site generator (clean URLs, better for search, adds
  tooling). Worth deciding before the catalogue grows.
- **Type.** Poppins from Google Fonts, with a Helvetica/Arial fallback stack if
  the font fails to load.
- **Accessibility.** Skip link, labelled nav landmarks, visible focus rings,
  Escape closes the mobile menu, and `prefers-reduced-motion` is respected.
