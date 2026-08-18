/* Writes the CMS's site-wide settings into the HTML at deploy time.

   Everything else on this site is filled in by the browser after the page
   loads, but two things can't be: the tab icon and the share card. Facebook,
   WhatsApp, Instagram and the rest read the raw HTML and never run any
   JavaScript, so an og:image set from script would simply not exist as far
   as they are concerned.

   Netlify runs this on every publish, including the ones Decap triggers when
   you press Publish in the CMS. The site's own files are rewritten in
   Netlify's throwaway copy of the repository, so nothing is committed and
   running it twice changes nothing the second time.

   Run it by hand with:  node tools/apply-settings.js
*/
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SETTINGS = path.join(ROOT, "content", "settings.json");

const DEFAULTS = {
  favicon: "/images/favicon.svg",
  apple_icon: "/images/apple-touch-icon.png",
  share_image: "/images/og-cover.png",
  site_name: "Forty Nine Unbeaten"
};

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
  } catch (err) {
    console.warn("apply-settings: no readable content/settings.json, keeping what's in the HTML");
    return null;
  }
}

/* An uploaded path is stored as /images/uploads/…; a share card has to be a
   full address for the scrapers, so relative paths get the site in front. */
function absolute(value, origin) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return origin + (trimmed.startsWith("/") ? trimmed : "/" + trimmed);
}

/* Replaces the value of one attribute on the tag matched by `open`, leaving
   the rest of the tag — and every other tag — untouched. */
function setAttr(html, open, attr, value) {
  const tag = new RegExp("(<" + open + "[^>]*\\s" + attr + "=\")([^\"]*)(\")", "i");
  if (!tag.test(html)) return { html: html, changed: false };
  let changed = false;
  const next = html.replace(tag, function (whole, before, current, after) {
    if (current === value) return whole;
    changed = true;
    return before + value + after;
  });
  return { html: next, changed: changed };
}

function main() {
  const settings = readSettings();
  if (!settings) return;

  const origin = String(settings.site_url || "https://49unbeaten.com").replace(/\/+$/, "");
  const favicon = String(settings.favicon || DEFAULTS.favicon).trim() || DEFAULTS.favicon;
  const apple = String(settings.apple_icon || DEFAULTS.apple_icon).trim() || DEFAULTS.apple_icon;
  const share = absolute(settings.share_image || DEFAULTS.share_image, origin);
  const siteName = String(settings.site_name || DEFAULTS.site_name).trim() || DEFAULTS.site_name;

  const pages = fs.readdirSync(ROOT).filter(function (name) {
    return name.endsWith(".html");
  });

  let touched = 0;
  pages.forEach(function (name) {
    const file = path.join(ROOT, name);
    let html = fs.readFileSync(file, "utf8");
    let changed = false;

    [
      ['link rel="icon"', "href", favicon],
      ['link rel="apple-touch-icon"', "href", apple],
      ['meta property="og:image"', "content", share],
      ['meta property="og:site_name"', "content", siteName]
    ].forEach(function (job) {
      const result = setAttr(html, job[0], job[1], job[2]);
      html = result.html;
      changed = changed || result.changed;
    });

    /* An SVG favicon is declared with a type; a PNG or ICO uploaded in its
       place must not keep claiming to be one. */
    const declared = /\.svg(\?|#|$)/i.test(favicon) ? ' type="image/svg+xml"' : "";
    const iconTag = /<link rel="icon"[^>]*>/i;
    if (iconTag.test(html)) {
      const rebuilt = '<link rel="icon" href="' + favicon + '"' + declared + ">";
      const before = html;
      html = html.replace(iconTag, rebuilt);
      changed = changed || html !== before;
    }

    if (changed) {
      fs.writeFileSync(file, html);
      touched += 1;
    }
  });

  console.log(
    "apply-settings: " + touched + " of " + pages.length + " pages rewritten\n" +
    "  favicon      " + favicon + "\n" +
    "  apple icon   " + apple + "\n" +
    "  share image  " + share + "\n" +
    "  site name    " + siteName
  );
}

main();
