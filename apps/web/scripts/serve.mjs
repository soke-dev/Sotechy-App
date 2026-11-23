// Serves the landing page (sotechy.shop) from its static build in out/: /terms opens terms.html, a
// folder opens its index.html, anything else gets 404.html. Next's hashed bundles are cached for a year.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out", import.meta.url));
const port = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

const isFile = (f) => existsSync(f) && statSync(f).isFile();

function send(res, file, status = 200) {
  const ext = extname(file).toLowerCase();
  const hashed = /[\\/]_next[\\/]static[\\/]/.test(file);
  res.writeHead(status, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" || ext === ".txt" ? "no-cache" : hashed ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }
  let path;
  try {
    path = decodeURIComponent((req.url ?? "/").split("?")[0]);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const file = normalize(join(root, path));
  // Never serve anything outside out/
  if (!file.startsWith(root)) {
    res.writeHead(400);
    return res.end();
  }
  for (const f of [file, `${file.replace(/[\\/]$/, "")}.html`, join(file, "index.html")]) if (isFile(f)) return send(res, f);
  send(res, join(root, "404.html"), 404);
}).listen(port, () => console.log(`Sotechy landing page on :${port}`));
