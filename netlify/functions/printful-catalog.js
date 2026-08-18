/* Lists what is in the connected Printful store.

   Used by the helper page at /admin/printful/ to show, for each product,
   its Printful id, every size and colour, what Printful charges for it, and
   the mockup image — so the shop is set up from real numbers rather than
   copied by hand out of the Printful dashboard.

   Only someone logged into the CMS can call it. It is read-only, but the
   costs are nobody else's business.
*/
"use strict";

const { storeProducts, costLookup, readOption, PrintfulError } = require("./_printful");

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
    const cost = costLookup();
    const products = await storeProducts();

    const shaped = [];
    for (const entry of products) {
      const product = entry.sync_product || {};
      const variants = Array.isArray(entry.sync_variants) ? entry.sync_variants : [];

      const rows = [];
      for (const variant of variants) {
        const catalogVariantId = (variant.product && variant.product.variant_id) || variant.variant_id;
        rows.push({
          variant_id: variant.id,
          catalog_variant_id: catalogVariantId || null,
          name: variant.name || "",
          size: readOption(variant, "size"),
          color: readOption(variant, "color"),
          /* What Printful charges you, and what you told Printful you sell
             it for. The site's own price is set in the CMS, not here. */
          cost: await cost(catalogVariantId),
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
