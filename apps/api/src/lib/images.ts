// Uploaded photos are kept in the database, so they're shrunk on the way in.
import sharp from "sharp";

/**
 * At most `maxSide` px on the longest side, as WebP: turned the right way up, and with the phone's
 * hidden details (location, camera) removed. GIFs (often animated) and anything that can't be read
 * are kept as they came.
 */
export async function compressImage(data: Buffer, type: string, filename: string, maxSide = 1600) {
  if (type === "image/gif") return { data, type, filename };
  try {
    const out = await sharp(data, { failOn: "none" })
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { data: out, type: "image/webp", filename: `${filename.replace(/\.[a-z0-9]+$/i, "")}.webp`.slice(0, 200) };
  } catch {
    return { data, type, filename };
  }
}
