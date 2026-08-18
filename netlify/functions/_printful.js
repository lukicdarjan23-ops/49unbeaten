/* Shared helper for talking to Printful.

   The token lives in a Netlify environment variable and never leaves the
   server. Nothing here may be imported by anything the browser loads.
*/
"use strict";

const API = "https://api.printful.com";

class PrintfulError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "PrintfulError";
    this.status = status;
    this.body = body;
  }
}

function token() {
  const value = process.env.PRINTFUL_TOKEN;
  if (!value) {
    throw new PrintfulError(
      "PRINTFUL_TOKEN is not set. Add it in Netlify under Project configuration → " +
      "Environment variables, then redeploy.",
      500
    );
  }
  return value;
}

/* One call to Printful. Throws with the response body attached, because the
   useful part of a Printful failure is always in the body — a wrong token
   and a wrong store both come back as a bare 401 otherwise. */
async function call(path, options) {
  const opts = options || {};

  /* Read the token before the request, so a missing one is reported as the
     configuration mistake it is rather than as a network failure. */
  const bearer = token();
  let response;

  try {
    response = await fetch(API + path, {
      method: opts.method || "GET",
      headers: Object.assign(
        {
          "Authorization": "Bearer " + bearer,
          "Content-Type": "application/json"
        },
        opts.headers || {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  } catch (err) {
    throw new PrintfulError("Could not reach Printful: " + err.message, 502);
  }

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (err) {
    /* Printful returned something that isn't JSON — an outage page, usually.
       Keep the first part of it; it is what explains the failure. */
    throw new PrintfulError(
      "Printful returned a non-JSON response (HTTP " + response.status + ")",
      502,
      text.slice(0, 400)
    );
  }

  if (!response.ok) {
    const detail = (parsed && (parsed.error || parsed.result)) || null;
    const message = (detail && (detail.message || detail)) || ("HTTP " + response.status);
    throw new PrintfulError("Printful: " + message, response.status, parsed);
  }

  return parsed && parsed.result !== undefined ? parsed.result : parsed;
}

/* Every product in the connected store, with its variants. Printful returns
   the list and the variants separately, so this walks the list. */
async function storeProducts() {
  const list = await call("/store/products");
  const products = Array.isArray(list) ? list : [];

  const detailed = [];
  for (const entry of products) {
    const full = await call("/store/products/" + entry.id);
    detailed.push(full);
  }
  return detailed;
}

/* What Printful charges you for one catalogue variant. Cached per call so a
   product with five sizes of the same garment doesn't ask five times. */
function costLookup() {
  const seen = new Map();

  return async function cost(catalogVariantId) {
    if (!catalogVariantId) return null;
    if (seen.has(catalogVariantId)) return seen.get(catalogVariantId);

    let price = null;
    try {
      const info = await call("/products/variant/" + catalogVariantId);
      const raw = info && info.variant && info.variant.price;
      price = raw == null ? null : Number(raw);
    } catch (err) {
      /* A missing cost should not sink the whole listing. */
      price = null;
    }

    seen.set(catalogVariantId, price);
    return price;
  };
}

/* Printful puts a variant's size and colour in `options` on some products,
   on the nested `product` on others, and for posters and prints only inside
   the variant's name — "Enhanced Matte Paper Poster - 12″×18″". Read
   whichever of the three is actually there.

   The name is the least reliable of the three, so it is only consulted
   last, and only for the half of "Colour / Size" that can be told apart
   with confidence. Whatever cannot be read stays empty; the caller shows
   the full name alongside, so nothing is lost either way. */
function readOption(variant, wanted) {
  const options = Array.isArray(variant.options) ? variant.options : [];
  const match = options.filter(function (o) {
    return String(o.id || "").toLowerCase() === wanted;
  })[0];
  if (match && match.value) return String(match.value);

  const product = variant.product || {};
  if (wanted === "size" && product.size) return String(product.size);
  if (wanted === "color" && product.color) return String(product.color);

  return fromName(variant.name, wanted);
}

/* "<product> - <colour> / <size>" for garments, "<product> - <size>" for
   flat goods. Only the two-part form names a colour; a single trailing part
   is a size, since that is the form posters and prints take. */
function fromName(name, wanted) {
  const text = String(name || "");
  const dash = text.lastIndexOf(" - ");
  if (dash === -1) return "";

  const tail = text.slice(dash + 3).trim();
  if (!tail) return "";

  const parts = tail.split("/").map(function (p) { return p.trim(); }).filter(Boolean);
  if (parts.length >= 2) return wanted === "color" ? parts[0] : parts[parts.length - 1];
  return wanted === "size" ? parts[0] : "";
}

module.exports = { call, storeProducts, costLookup, readOption, PrintfulError };
