// Builds everything from src/:
//   dist/cdn/<page>.js, dist/cdn/app.css → served free by jsDelivr from the GitHub repo
//   webflow/<page>/PAGE-HEAD.txt, PAGE-FOOTER.txt → the few lines each Webflow page needs
//   dist/preview-<page>.html → try a page offline with pretend data
//
// Release: `node build.mjs`, commit and push, then clear jsDelivr's cache for dist/cdn/* at
//   https://purge.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/<file>
// The Webflow boxes load @main, so they never need editing for a release.
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";

const REPO = "koalable/upward-spiral";
const RELEASE = process.env.RELEASE || "main";
const CDN = `https://cdn.jsdelivr.net/gh/${REPO}@${RELEASE}/dist/cdn`;
const LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css";
const INTER = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";

const PAGES = [
  // id, Webflow slug, title
  ["checkin", "/challenge", "Check-in"],
  ["routines", "/challenge-routines", "Routines"],
  ["work", "/challenge-work", "Work"],
  ["progress", "/challenge-progress", "Progress"],
];
const FIREBASE = {
  apiKey: "AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ",
  authDomain: "upward-spiral-of-awesomeness.firebaseapp.com",
  projectId: "upward-spiral-of-awesomeness",
  appId: "1:445813281061:web:8982a5466586bce7828acc",
  messagingSenderId: "445813281061",
};
// Public key for web push (Firebase → Project settings → Cloud Messaging → Web Push certificates).
const VAPID_KEY = "BF-Bh-rXeeTNPsZLW8PPM-pu8T7fjI3tqR8My_rSmJFmu_cmdeKb-Ncg5ObwPmnqNBW5XIeFZqRnvINAFVCdsdw";

const bundle = async (entry) => (await esbuild.build({
  entryPoints: [entry], bundle: true, minify: true, format: "iife", target: ["es2019"], write: false, legalComments: "none",
})).outputFiles[0].text;

mkdirSync("dist/cdn", { recursive: true });
const css = (await esbuild.transform(readFileSync("src/ui.css", "utf8"), { loader: "css", minify: true })).code;
writeFileSync("dist/cdn/app.css", css);

const pageUrls = Object.fromEntries(PAGES.map(([id, slug]) => [id, slug]));
const report = { release: RELEASE, "app.css": css.length };
for (const [id] of PAGES) {
  const js = await bundle(`src/entries/${id}.js`);
  writeFileSync(`dist/cdn/${id}.js`, js);
  report[`${id}.js`] = js.length;
  mkdirSync(`webflow/${id}`, { recursive: true });
  writeFileSync(`webflow/${id}/PAGE-HEAD.txt`, [
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="${INTER}">`,
    `<link rel="stylesheet" href="${LUCIDE}">`,
    `<link rel="stylesheet" href="${CDN}/app.css">`,
  ].join("\n") + "\n");
  writeFileSync(`webflow/${id}/PAGE-FOOTER.txt`, [
    ...["app", "auth", "firestore"].map((m) => `<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-${m}-compat.js"></script>`),
    `<script>window.WLC_CONFIG={firebase:${JSON.stringify(FIREBASE)},pages:${JSON.stringify(pageUrls)}};if(!document.getElementById("wlc")){var d=document.createElement("div");d.id="wlc";document.body.appendChild(d)}</script>`,
    `<script src="${CDN}/${id}.js"></script>`,
  ].join("\n") + "\n");
}
writeFileSync("webflow/CODE-EMBED.txt", `<div id="wlc"></div>\n`);

// ---------- Home-screen app (app/) → Firebase Hosting at app.kstarr.com ----------
// Same code as the Webflow pages, served from our own site so it can be installed and send notifications.
// Pages: / (Check-in), /routines, /work, /progress. Deployed by .github/workflows/deploy-app.yml.
const APP_PAGES = { checkin: "/", routines: "/routines", work: "/work", progress: "/progress" };
rmSync("app", { recursive: true, force: true });
mkdirSync("app/js", { recursive: true });
const appJs = {};
for (const [id] of PAGES) appJs[id] = readFileSync(`dist/cdn/${id}.js`, "utf8");
const version = createHash("sha1").update(css + Object.values(appJs).join("")).digest("hex").slice(0, 10);
writeFileSync("app/app.css", css);
for (const [id, js] of Object.entries(appJs)) writeFileSync(`app/js/${id}.js`, js);
for (const f of ["icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]) copyFileSync(`app-src/${f}`, `app/${f}`);
writeFileSync("app/sw.js", readFileSync("app-src/sw.js", "utf8").replaceAll("__VERSION__", version).replace("__FIREBASE__", JSON.stringify(FIREBASE)));
writeFileSync("app/manifest.webmanifest", JSON.stringify({
  name: "Upward Spiral of Awesomeness", short_name: "Spiral", id: "/", start_url: "/", scope: "/",
  display: "standalone", background_color: "#09090b", theme_color: "#09090b",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
for (const [id, , title] of PAGES) {
  const file = id === "checkin" ? "app/index.html" : `app/${id}.html`;
  writeFileSync(file, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} · Spiral</title>
<meta name="theme-color" content="#09090b">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Spiral">
<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon-180.png"><link rel="icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${INTER}"><link rel="stylesheet" href="${LUCIDE}">
<link rel="stylesheet" href="/app.css?v=${version}">
<style>html,body{margin:0;background:#09090b}</style></head><body class="app"><div id="wlc"></div>
${["app", "auth", "firestore", "messaging", "functions"].map((m) => `<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-${m}-compat.js"></script>`).join("\n")}
<script>window.WLC_CONFIG={firebase:Object.assign(${JSON.stringify(FIREBASE)},{authDomain:location.hostname}),pages:${JSON.stringify(APP_PAGES)},app:true,vapidKey:${JSON.stringify(VAPID_KEY)}};
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});</script>
<script src="/js/${id}.js?v=${version}"></script></body></html>
`);
}
report.app = version;

// Notification server (functions/index.js): the pure planner bundled in, Firebase libraries left external.
await esbuild.build({
  entryPoints: ["functions/src/index.js"], bundle: true, platform: "node", format: "cjs", target: "node22",
  outfile: "functions/index.js", external: ["firebase-functions", "firebase-functions/*", "firebase-admin", "firebase-admin/*"], legalComments: "none",
});

// Offline previews (pretend data, every page in one bundle).
const previewApp = await bundle("src/entries/preview.js");
// preview-*.html: pretend-you with Ada and Bea. preview-rosa-*.html: Rosa, a pretend beta tester (see seedRosa).
for (const persona of ["", "rosa"]) {
  const pre = persona ? `preview-${persona}-` : "preview-";
  const links = Object.fromEntries(PAGES.map(([id]) => [id, `${pre}${id}.html`]));
  for (const [id, , title] of PAGES) {
    writeFileSync(`dist/${pre}${id}.html`, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — preview</title>
<link rel="stylesheet" href="${LUCIDE}"><link rel="stylesheet" href="${INTER}"><style>body{margin:0}${css}</style></head><body><div id="wlc"></div>
<script>window.WLC_PAGE=${JSON.stringify(id)};window.WLC_PERSONA=${JSON.stringify(persona)};window.WLC_CONFIG={pages:${JSON.stringify(links)}};</script><script>${previewApp}</script></body></html>`);
  }
}
console.log(report);
