# Brand assets

Put Sotechy's logo and images here, then run from the repo root:

```bash
pnpm assets:sync
```

That copies everything into the apps that need it, and you commit the result.

| Folder | What to put in it | Copied to |
| --- | --- | --- |
| `logo/` | `light-logo-small.png` (wordmark, used by the website, admin and app home screen) and `sotechylogo.png` (bag mark). Add a white version for dark backgrounds when you have one. | `apps/web/public/brand/`, `apps/admin/public/brand/`, `apps/mobile/assets/brand/` |
| `app-icon/` | `icon.png` (1024×1024, no transparency), `splash-icon.png`, `favicon.png` (48×48), `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` | `apps/mobile/assets/` (replaces Expo's placeholder icons) |
| `images/` | Banners, hero images, category images, branch photos | `apps/web/public/images/`, `apps/mobile/assets/images/` |

Keep the exact file names in `app-icon/`, because `apps/mobile/app.json` refers to them. They are generated from `logo/sotechylogo.png` (the bag mark). That file is only 104×97px, so the icons are upscaled and slightly soft. Add a high-resolution or SVG bag mark and regenerate them before the App Store release.

If you rename a logo file, update the places that use it: `apps/web/src/app/page.tsx`, the admin layout and login page, and `apps/mobile/src/app/(tabs)/index.tsx`.

Product photos don't go here. They are uploaded per product, and for now are set as image URLs in Admin → Products.
