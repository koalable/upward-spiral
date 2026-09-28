// Builds everything from src/:
//   dist/cdn/<page>.js, dist/cdn/app.css → served free by jsDelivr from the GitHub repo
//   webflow/<page>/PAGE-HEAD.txt, PAGE-FOOTER.txt → the few lines each Webflow page needs
//   dist/preview-<page>.html → try a page offline with pretend data
//
// Release: commit and push dist/, then run `RELEASE=<commit sha> node build.mjs` and paste the Webflow boxes.
// A commit URL is cached forever by jsDelivr, so every release uses its new commit id.
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const REPO = "koalable/upward-spiral";
const RELEASE = process.env.RELEASE || "main";
const CDN = `https://cdn.jsdelivr.net/gh/${REPO}@${RELEASE}/dist/cdn`;
const LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css";
const INTER = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

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
};

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

// Offline previews (pretend data, every page in one bundle).
const previewApp = await bundle("src/entries/preview.js");
const links = Object.fromEntries(PAGES.map(([id]) => [id, `preview-${id}.html`]));
for (const [id, , title] of PAGES) {
  writeFileSync(`dist/preview-${id}.html`, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — preview</title>
<link rel="stylesheet" href="${LUCIDE}"><link rel="stylesheet" href="${INTER}"><style>body{margin:0}${css}</style></head><body><div id="wlc"></div>
<script>window.WLC_PAGE=${JSON.stringify(id)};window.WLC_CONFIG={pages:${JSON.stringify(links)}};</script><script>${previewApp}</script></body></html>`);
}
console.log(report);
