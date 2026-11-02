// Serves the web build of the app (app.sotechy.shop): files from dist-web, and index.html for every
// other path so links like /product/123 open the app. Hashed bundles are cached for a year.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist-web", import.meta.url));
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

function send(res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  const hashed = /[\\/](_expo[\\/]static|assets)[\\/]/.test(file);
  res.writeHead(status, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : hashed ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  createReadStream(file).pipe(res);
}

// Links like app.sotechy.shop/store/… open the installed app instead of the browser once Android and
// iOS can check these. ANDROID_CERT_SHA256: the app's signing fingerprint(s), comma separated (Expo →
// Credentials, and Play Console → App signing). APPLE_TEAM_ID: the Apple developer team ID.
const APP_ID = "shop.sotechy.app";
const LINK_PATHS = ["/store/*", "/product/*", "/invite/*"];
const sha256 = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const teamId = (process.env.APPLE_TEAM_ID ?? "").trim();
const WELL_KNOWN = {
  "/.well-known/assetlinks.json": sha256.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: sha256 } }]
    : null,
  "/.well-known/apple-app-site-association": teamId ? { applinks: { details: [{ appIDs: [`${teamId}.${APP_ID}`], components: LINK_PATHS.map((p) => ({ "/": p })) }] } } : null,
};

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }
  const wellKnown = WELL_KNOWN[(req.url ?? "").split("?")[0]];
  if (wellKnown !== undefined) {
    res.writeHead(wellKnown ? 200 : 404, { "Content-Type": "application/json" });
    return res.end(wellKnown ? JSON.stringify(wellKnown) : "{}");
  }
  const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const file = normalize(join(root, path));
  // Never serve anything outside dist-web
  if (!file.startsWith(root)) {
    res.writeHead(400);
    return res.end();
  }
  if (existsSync(file) && statSync(file).isFile()) return send(res, file);
  // An app route: the app itself works out what to show
  send(res, join(root, "index.html"));
}).listen(port, () => console.log(`Sotechy web app on :${port}`));
