# Forty Nine Unbeaten — homepage

Static homepage built to the supplied design: sticky header with centred
wordmark, full-bleed hero, a hairline-ruled "Top Sellers" grid, and a black
footer with the circular seal.

No build step and no dependencies — open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
```

## Files

| File | Contents |
| --- | --- |
| `index.html` | Page structure — header, hero, section, footer |
| `styles.css` | All styling, design tokens at the top of the file |
| `script.js` | Product data, grid rendering, cart, mobile menu |

## Swapping in real content

**Products.** Edit the `PRODUCTS` array in `script.js`. Add an `image` (and an
`alt`) to any entry and the card renders a real lazy-loaded `<img>` instead of
the grey `img` placeholder:

```js
{
  id: "statue-01",
  title: "The Statue",
  type: "Print",
  price: 89,
  href: "/prints/the-statue",
  image: "/img/the-statue.jpg",
  alt: "The Statue, monochrome print"
}
```

**Hero.** Replace `<span class="ph ph--hero">img</span>` in `index.html` with an
`<img>`. Its aspect ratio (`1200 / 310`) lives on `.ph--hero` in `styles.css`.

**Logo.** The header wordmark and the footer seal are set in type as a stand-in.
Drop in the real logo artwork when it's available — the header mark is
`.logo` in `index.html`, the seal is the inline `<svg class="seal">`.

## Notes

- **Layout.** Header and footer contents sit in a centred `--container`
  (860px); the hero and product grid are deliberately full-bleed, matching the
  design. Grid steps 4 → 3 → 2 columns at 1000px and 760px, and the cell
  hairlines are recalculated at each breakpoint so no stray rules appear on the
  last column or last row.
- **Cart.** Client-side only, persisted to `localStorage` under `fnu.cart`, so
  the header count survives a reload. It is a front-end placeholder — wire
  `addToCart` in `script.js` to your storefront/checkout API for real orders.
- **Type.** Poppins from Google Fonts, with a Helvetica/Arial fallback stack if
  the font fails to load.
- **Accessibility.** Skip link, labelled nav landmarks, visible focus rings,
  Escape closes the mobile menu, and `prefers-reduced-motion` is respected.
