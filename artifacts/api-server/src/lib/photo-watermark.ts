import sharp from "sharp";
import { BRAND_MARK_PNG_B64 } from "./brand-mark";
import { logger } from "./logger";

/** Photos smaller than this are left as they are: the logo would be a few pixels. */
const MIN_SIDE = 160;
/** Longest side kept for the stored photo (phones take much bigger pictures). */
const MAX_SIDE = 2400;
const LOGO_SHARE = 0.12; // logo size, as a share of the photo's shorter side
const CELL_SHARE = 0.26; // distance between logos
const OPACITY = 0.3;

export type BrandedPhoto = { bytes: Buffer; contentType: string; width: number; height: number };

function logoBytes(logoDataUrl: string | null | undefined): Buffer {
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(logoDataUrl ?? "");
  return Buffer.from(match ? match[1] : BRAND_MARK_PNG_B64, "base64");
}

/**
 * The clinic's logo repeated over the whole photo as a faint watermark
 * (staggered rows), flattened into the stored picture. Honors the camera's
 * rotation and caps the size. The photo's pixels are not retouched otherwise.
 * If anything fails the original is returned: a patient is never blocked by this.
 */
export async function applyClinicWatermark(
  photo: { bytes: Buffer; contentType: string; width: number; height: number },
  logoDataUrl: string | null | undefined,
): Promise<BrandedPhoto> {
  try {
    const oriented = await sharp(photo.bytes, { failOn: "none" }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = oriented.info;
    const side = Math.min(width, height);
    if (side < MIN_SIDE) return photo;

    const logoSize = Math.max(24, Math.round(side * LOGO_SHARE));
    const cell = Math.max(logoSize + 8, Math.round(side * CELL_SHARE));
    const logo = await sharp(logoBytes(logoDataUrl)).ensureAlpha()
      .resize({ width: logoSize, height: logoSize, fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .linear([1, 1, 1, OPACITY], [0, 0, 0, 0])
      .png().toBuffer({ resolveWithObject: true });

    // One repeating tile of 2x2 cells with the logo on the diagonal: rows end up staggered.
    const tileSize = cell * 2;
    const at = (cellX: number, cellY: number) => ({
      input: logo.data,
      left: Math.round(cellX * cell + (cell - logo.info.width) / 2),
      top: Math.round(cellY * cell + (cell - logo.info.height) / 2),
    });
    const tile = await sharp({ create: { width: tileSize, height: tileSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([at(0, 0), at(1, 1)]).png().toBuffer();

    const bytes = await sharp(oriented.data)
      .composite([{ input: tile, tile: true, left: 0, top: 0 }])
      .jpeg({ quality: 90, mozjpeg: false }).toBuffer();
    return { bytes, contentType: "image/jpeg", width, height };
  } catch (error) {
    logger.warn({ err: error }, "Could not apply the clinic watermark; keeping the photo as taken");
    return photo;
  }
}
