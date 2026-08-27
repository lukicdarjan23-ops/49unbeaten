/* Forty Nine Unbeaten — the deploy step.

   Everything the visitor sees is filled in by the browser after the page
   loads, except the handful of things a browser is too late for. Those are
   written into the files here, on every publish — including the ones the
   CMS triggers when you press Publish.

   Three jobs:

     1. Site-wide settings — the tab icon and the share card. Facebook,
        WhatsApp and the rest read the raw HTML and never run JavaScript,
        so an og:image set from script would not exist as far as they are
        concerned.

     2. A real page per product, at /products/<slug>/, carrying that
        product's own title, description and share card. Without this every
        product is one identical page to a search engine, and sharing a
        product link shows the generic site card.

     3. sitemap.xml, listing what actually exists right now — so adding a
        product in the CMS adds it to the sitemap, with nothing to remember.

   Netlify runs this in a throwaway copy of the repository, so nothing here
   is committed. Running it twice changes nothing the second time.

   Run it by hand with:  node tools/build.js
*/
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* A missing file is a fresh install and the defaults cover it. A file that
   exists but cannot be parsed is damage, and quietly carrying on would
   publish a site with no products at all. Stopping instead fails the
   deploy, which leaves the last good version of the site serving. */
function readJson(rel, fallback) {
  const full = path.join(ROOT, rel);

  if (!fs.existsSync(full)) {
    console.warn("build: " + rel + " is not there — using defaults");
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (err) {
    console.error(
      "build: " + rel + " is not valid JSON — " + err.message + "\n" +
      "       Stopping. The site already published stays up untouched."
    );
    process.exit(1);
  }
}

/* Pages that exist as committed files, and the address each is served at. */
const STANDING = [
  { file: "index.html", url: "/", priority: "1.0", freq: "weekly" },
  { file: "products/index.html", url: "/products/", priority: "0.9", freq: "weekly" },
  { file: "art/index.html", url: "/art/", priority: "0.8", freq: "weekly" },
  { file: "apparel/index.html", url: "/apparel/", priority: "0.8", freq: "weekly" },
  { file: "gifts/index.html", url: "/gifts/", priority: "0.8", freq: "weekly" },
  { file: "custom/index.html", url: "/custom/", priority: "0.9", freq: "monthly" },
  { file: "contact/index.html", url: "/contact/", priority: "0.5", freq: "yearly" },
  { file: "shipping/index.html", url: "/shipping/", priority: "0.5", freq: "yearly" },
  { file: "terms/index.html", url: "/terms/", priority: "0.3", freq: "yearly" },
  { file: "privacy/index.html", url: "/privacy/", priority: "0.3", freq: "yearly" },
  /* Reachable, but nothing to find in a search result. */
  { file: "cart/index.html", url: "/cart/", indexable: false },
  { file: "thanks/index.html", url: "/thanks/", indexable: false },
  { file: "404.html", url: "/404.html", indexable: false }
];

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* An uploaded path is stored as /images/uploads/…; a share card has to be
   a full address for the scrapers, so relative paths get the site added. */
function absolute(value, origin) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return origin + (trimmed.startsWith("/") ? trimmed : "/" + trimmed);
}

/* Replaces one attribute's value on the tag matched by `open`, leaving the
   rest of that tag — and every other tag — exactly as it was. */
function setAttr(html, open, attr, value) {
  const tag = new RegExp("(<" + open + "[^>]*\\s" + attr + '=")([^"]*)(")', "i");
  return tag.test(html) ? html.replace(tag, "$1" + value.replace(/\$/g, "$$$$") + "$3") : html;
}

function setTag(html, open, attr, value) {
  return setAttr(html, open, attr, escapeHtml(value));
}

/* ------------------------------------------------------------------
   1. Site-wide settings
   ------------------------------------------------------------------ */

function applySettings(html, site) {
  let out = html;

  out = setTag(out, 'meta property="og:image"', "content", site.share);
  out = setTag(out, 'meta property="og:site_name"', "content", site.name);
  out = setTag(out, 'link rel="apple-touch-icon"', "href", site.apple);

  /* An SVG icon is declared with a type; a PNG uploaded in its place must
     not go on claiming to be one. */
  const declared = /\.svg(\?|#|$)/i.test(site.favicon) ? ' type="image/svg+xml"' : "";
  out = out.replace(
    /<link rel="icon"[^>]*>/i,
    '<link rel="icon" href="' + escapeHtml(site.favicon) + '"' + declared + ">"
  );

  return out;
}

/* ------------------------------------------------------------------
   2. One page per product
   ------------------------------------------------------------------ */

function firstPrice(product) {
  const list = (product.variants && product.variants.length)
    ? product.variants
    : (product.sizes || []);
  if (!list.length) return null;
  const chosen = list.filter((v) => v.selected)[0] || list[0];
  return Number(chosen.price) || null;
}

/* What a search result and a shared link will say about this product. */
function productSummary(product) {
  const bits = [];
  if (product.type) bits.push(product.type);
  if (product.category) bits.push(product.category.toLowerCase());

  const price = firstPrice(product);
  const opening = bits.length
    ? product.title + " — " + bits.join(", ") + " from Forty Nine Unbeaten."
    : product.title + " from Forty Nine Unbeaten.";

  return price
    ? opening + " From $" + price + ", made to order and shipped worldwide."
    : opening + " Made to order and shipped worldwide.";
}

function productImage(product, origin) {
  const media = (product.media || []).filter((m) => m && m.image)[0];
  return absolute(product.image || (media && media.image) || "", origin);
}

function buildProductPages(template, products, site) {
  const written = [];
  const seen = new Set();

  products.forEach((product) => {
    const slug = String(product.slug || "").trim();
    if (!slug) {
      console.warn("build: skipping a product with no slug — " + (product.title || "untitled"));
      return;
    }
    if (seen.has(slug)) {
      console.warn('build: skipping duplicate slug "' + slug + '"');
      return;
    }
    seen.add(slug);

    const url = site.origin + "/products/" + slug + "/";
    const title = (product.title || "Product") + " — " + site.name;
    const summary = productSummary(product);
    const image = productImage(product, site.origin) || site.share;

    let html = template;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
    html = setTag(html, 'meta name="description"', "content", summary);
    html = setTag(html, 'link rel="canonical"', "href", url);
    html = setTag(html, 'meta property="og:title"', "content", title);
    html = setTag(html, 'meta property="og:description"', "content", summary);
    html = setTag(html, 'meta property="og:url"', "content", url);
    html = setTag(html, 'meta property="og:image"', "content", image);
    html = html.replace(/<meta property="og:type" content="[^"]*">/i,
      '<meta property="og:type" content="product">');

    /* The visible title too, so the page reads correctly before the script
       has fetched anything — and for a reader with JavaScript switched off. */
    html = html.replace(
      /(<h1 class="product__title" data-product-title>)[\s\S]*?(<\/h1>)/i,
      "$1" + escapeHtml(product.title || "Product") + "$2"
    );

    const dir = path.join(ROOT, "products", slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    written.push("/products/" + slug + "/");
  });

  return written;
}

/* A slug renamed or a product deleted in the CMS leaves its folder behind
   in a working copy. Netlify starts from a clean checkout so it never sees
   one, but a local run should not accumulate dead pages. */
function pruneProductPages(keep) {
  const base = path.join(ROOT, "products");
  if (!fs.existsSync(base)) return [];

  const alive = new Set(keep.map((u) => u.split("/")[2]));
  const removed = [];

  fs.readdirSync(base, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isDirectory() || alive.has(entry.name)) return;
    fs.rmSync(path.join(base, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  });

  return removed;
}

/* ------------------------------------------------------------------
   3. Sitemap
   ------------------------------------------------------------------ */

function buildSitemap(productUrls, categories, site) {
  const live = new Set(
    categories.map((c) => "/" + String(c.slug || "").trim().toLowerCase() + "/")
  );

  const rows = STANDING
    .filter((page) => page.indexable !== false)
    /* A category deleted in the CMS redirects to the homepage; it has no
       business being offered to a search engine. */
    .filter((page) => !["/art/", "/apparel/", "/gifts/"].includes(page.url) || live.has(page.url))
    .map((page) => ({ url: page.url, priority: page.priority, freq: page.freq }))
    .concat(productUrls.map((url) => ({ url: url, priority: "0.7", freq: "monthly" })));

  const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  rows.forEach((row) => {
    xml.push("  <url>",
      "    <loc>" + site.origin + row.url + "</loc>",
      "    <changefreq>" + row.freq + "</changefreq>",
      "    <priority>" + row.priority + "</priority>",
      "  </url>");
  });

  xml.push("</urlset>");
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml.join("\n") + "\n");
  return rows.length;
}

/* ------------------------------------------------------------------ */

function main() {
  const settings = readJson("content/settings.json", {});
  const origin = String(settings.site_url || "https://49unbeaten.com").replace(/\/+$/, "");

  const site = {
    origin: origin,
    name: String(settings.site_name || "Forty Nine Unbeaten").trim() || "Forty Nine Unbeaten",
    favicon: String(settings.favicon || "").trim() || "/images/favicon.svg",
    apple: String(settings.apple_icon || "").trim() || "/images/apple-touch-icon.png",
    share: absolute(settings.share_image || "/images/og-cover.png", origin)
  };

  const products = (readJson("content/products.json", {}).items) || [];
  const categories = (readJson("content/categories.json", {}).items) || [];

  /* Product pages first: they are stamped from the template before the
     site-wide pass, so they get the same icon and share card as the rest. */
  const template = read("product.html");
  const productUrls = buildProductPages(template, products, site);
  const pruned = pruneProductPages(productUrls);

  /* The standing pages are committed files. Stamping the CMS's icons into
     them is a deploy-time act, so it only happens on Netlify — a local run
     would otherwise leave the working tree dirty with output that must
     never be committed. Generated product pages are always stamped; they
     are gitignored, so there is nothing to dirty. */
  const onNetlify = !!process.env.NETLIFY;
  const generated = productUrls.map((u) => "products" + u.slice("/products".length) + "index.html");
  const pages = onNetlify ? STANDING.map((p) => p.file).concat(generated) : generated;

  let touched = 0;
  pages.forEach((file) => {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      console.warn("build: expected page missing — " + file);
      return;
    }
    const before = fs.readFileSync(full, "utf8");
    const after = applySettings(before, site);
    if (after !== before) {
      fs.writeFileSync(full, after);
      touched += 1;
    }
  });

  const urls = buildSitemap(productUrls, categories, site);

  console.log([
    "build:",
    "  product pages  " + productUrls.length + (pruned.length ? "  (removed " + pruned.join(", ") + ")" : ""),
    "  sitemap urls   " + urls,
    "  icons/share    " + touched + " page(s) rewritten" +
      (onNetlify ? "" : "  (local run — committed pages left alone)"),
    "  favicon        " + site.favicon,
    "  share image    " + site.share
  ].join("\n"));
}

main();
