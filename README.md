# Forty Nine Unbeaten — homepage

Static homepage built to the supplied design: sticky header with centred
wordmark, full-bleed hero, a hairline-ruled "Top Sellers" grid, and a black
footer with the circular seal. Content (hero image, footer text, product
list) is editable through a CMS at `/admin` — no code editing required for
day-to-day updates. See [Editing content](#editing-content-cms) below.

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
| `index.html` | Page structure — header, hero, section, footer |
| `styles.css` | All styling, design tokens at the top of the file |
| `script.js` | Fetches `content/*.json`, renders the grid, cart, mobile menu |
| `content/settings.json` | Hero image/link, section heading, social links, footer notice |
| `content/products.json` | The "Top Sellers" product list |
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
   **Site Settings** and **Products** in the sidebar.

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

- **Layout.** Header and footer contents sit in a centred `--container`
  (860px); the hero and product grid are deliberately full-bleed, matching the
  design. Grid steps 4 → 3 → 2 columns at 1000px and 760px, and the cell
  hairlines are recalculated at each breakpoint so no stray rules appear on the
  last column or last row.
- **Sizes and pricing.** Each product carries a list of sizes, and each size
  sets its own price. Clicking `+` opens the size boxes; nothing is added
  until a size is chosen. At rest the card shows the cheapest size, prefixed
  with "from" only when the sizes differ in price, and hovering or focusing a
  size previews that size's exact price. A product with an empty size list
  falls back to one-click add at its base price.
- **Cart.** Client-side only, persisted to `localStorage` under `fnu.cart`, so
  the header count survives a reload. It is a front-end placeholder — wire
  `addToCart` in `script.js` to your storefront/checkout API for real orders.
  Keys are `<product id>::<size>`, so the same print in two sizes is two line
  items charged at their own prices. Product IDs are index-based (assigned by
  position in `content/products.json`), so reordering or adding/removing
  products in the CMS can reset an in-progress cart — acceptable for this
  placeholder, but worth knowing. A saved line whose size was later renamed or
  deleted in the CMS falls back to the product's base price rather than
  disappearing from the total.
- **Type.** Poppins from Google Fonts, with a Helvetica/Arial fallback stack if
  the font fails to load.
- **Accessibility.** Skip link, labelled nav landmarks, visible focus rings,
  Escape closes the mobile menu, and `prefers-reduced-motion` is respected.
