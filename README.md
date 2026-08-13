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
| `styles.css` | All styling for both pages, design tokens at the top |
| `script.js` | Shared: cart store, header cart readout, mobile menu, homepage grid |
| `product.js` | Product page only: variants, quantity, add to cart |
| `content/settings.json` | Hero image/link, section heading, social links, footer notice |
| `content/products.json` | The "Top Sellers" product list |
| `content/product.json` | The product page — variants, prices, notes, panels |
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
  so the header count survives a reload and is shared across both pages. It is
  a front-end placeholder — wire `FNU.cart.add` in `script.js` to your
  storefront/checkout API for real orders. Each line stores its own price at
  the time it was added, so the header total never depends on looking a
  product back up.
- **One product page.** `product.html` renders whichever product is in
  `content/product.json`. A real catalogue needs either one folder per product
  (`prints/the-statue/index.html`) or a small build step — worth deciding
  before adding the second product.
- **Type.** Poppins from Google Fonts, with a Helvetica/Arial fallback stack if
  the font fails to load.
- **Accessibility.** Skip link, labelled nav landmarks, visible focus rings,
  Escape closes the mobile menu, and `prefers-reduced-motion` is respected.
