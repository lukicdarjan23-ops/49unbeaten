/* Lists what is in the connected Printful store.

   Used by the helper page at /admin/printful/ to show, for each product,
   its Printful id, every size and colour, what Printful charges for it, and
   the mockup image — so the shop is set up from real numbers rather than
   copied by hand out of the Printful dashboard.

   Only someone logged into the CMS can call it. It is read-only, but the
   costs are nobody else's business.
*/
"use strict";

const { storeProducts, catalogLookup, readOption, PrintfulError } = require("./_printful");

/* Printful's raw classification is shouted — POSTER, CANVAS, T_SHIRT.
   Turn it into the wording the shop actually uses on the site. */
const TYPE_WORDS = {
  POSTER: "Print",
  CANVAS: "Canvas",
  FRAMED_POSTER: "Framed print",
  "T-SHIRT": "T-shirt",
  T_SHIRT: "T-shirt"
};

function friendlyType(raw) {
  const key = String(raw || "").trim().toUpperCase();
  if (!key) return "";
  if (TYPE_WORDS[key]) return TYPE_WORDS[key];
  /* Anything unmapped is still worth showing, just tidied. */
  const words = key.replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function reply(status, payload) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(payload)
  };
}

exports.handler = async function (event, context) {
  /* Netlify fills clientContext.user in when the request carries a valid
     Identity token. No user, no answer. */
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return reply(401, { error: "Log in to the CMS first." });
  }

  try {
    const lookup = catalogLookup();
    const products = await storeProducts();

    const shaped = [];
    for (const entry of products) {
      const product = entry.sync_product || {};
      const variants = Array.isArray(entry.sync_variants) ? entry.sync_variants : [];

      const rows = [];
      for (const variant of variants) {
        const catalogVariantId = (variant.product && variant.product.variant_id) || variant.variant_id;
        const catalog = await lookup(catalogVariantId);
        rows.push({
          variant_id: variant.id,
          catalog_variant_id: catalogVariantId || null,
          name: variant.name || "",
          size: readOption(variant, "size"),
          color: readOption(variant, "color"),
          /* What the shop's own listing calls this: Print or Canvas for a
             picture, the garment for apparel. Read from Printful's
             classification, with its model name as the fallback. */
          kind: friendlyType(catalog.type) || catalog.product,
          /* What Printful charges you, and what you told Printful you sell
             it for. The site's own price is set in the CMS, not here. */
          cost: catalog.cost,
          retail: variant.retail_price == null ? null : Number(variant.retail_price),
          currency: variant.currency || "USD",
          image: (variant.files || []).filter(function (f) { return f.type === "preview"; })[0]?.preview_url
            || (variant.product && variant.product.image) || "",
          available: variant.availability_status !== "discontinued"
        });
      }

      shaped.push({
        printful_product_id: product.id,
        name: product.name || "",
        thumbnail: product.thumbnail_url || "",
        /* Which pair of columns this product wants. Apparel is the only
           thing with a colour per variant; a poster or a canvas has a
           material and a dimension instead. */
        layout: rows.some(function (r) { return r.color; }) ? "apparel" : "flat",
        variant_count: rows.length,
        variants: rows
      });
    }

    return reply(200, { products: shaped });
  } catch (err) {
    if (err instanceof PrintfulError) {
      return reply(err.status >= 400 && err.status < 600 ? err.status : 502, {
        error: err.message,
        detail: err.body || null
      });
    }
    return reply(500, { error: "Unexpected failure: " + err.message });
  }
};
