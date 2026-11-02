// Copies brand-assets/ into each app. Run with `pnpm assets:sync` from the repo root.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => path.join(root, "brand-assets", ...p);
const dest = (...p) => path.join(root, "apps", ...p);

const targets = {
  logo: [dest("web/public/brand"), dest("admin/public/brand"), dest("merchant/public/brand"), dest("mobile/assets/brand")],
  "app-icon": [dest("mobile/assets")],
  images: [dest("web/public/images"), dest("mobile/assets/images")],
};

let copied = 0;
for (const [folder, outputs] of Object.entries(targets)) {
  if (!existsSync(src(folder))) continue;
  const files = readdirSync(src(folder)).filter((f) => !f.startsWith(".") && f !== "README.md");
  for (const out of outputs) {
    mkdirSync(out, { recursive: true });
    for (const file of files) {
      cpSync(src(folder, file), path.join(out, file), { recursive: true });
      copied++;
    }
  }
  if (files.length) console.log(`${folder}/ → ${outputs.map((o) => path.relative(root, o)).join(", ")}`);
}
console.log(copied ? `Copied ${copied} file(s).` : "Nothing to copy yet. Add files to brand-assets/ first.");
