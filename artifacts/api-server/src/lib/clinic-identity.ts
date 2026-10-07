import sharp from "sharp";
import { db, centersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEFAULT_CENTER_ID } from "./clinical-photos";

const MAX_LOGO_INPUT_BYTES = 300 * 1024;
const MAX_LOGO_SIDE = 256;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export class InvalidLogoError extends Error {}

/**
 * Validates an uploaded logo and returns it re-encoded as a PNG data URL of at
 * most 256 px. Only raster formats are accepted (never SVG, which can carry
 * scripts), and the image is fully decoded and re-encoded on the server, so
 * whatever the client claimed, what gets stored is a clean image without
 * metadata.
 */
export async function normalizeLogoDataUrl(dataUrl: string): Promise<string> {
  const match = DATA_URL.exec(dataUrl);
  if (!match) throw new InvalidLogoError("El logo debe ser una imagen PNG, JPG o WebP.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_LOGO_INPUT_BYTES) {
    throw new InvalidLogoError("El logo es demasiado pesado (máximo 300 KB).");
  }
  try {
    const png = await sharp(bytes, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize({ width: MAX_LOGO_SIDE, height: MAX_LOGO_SIDE, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    throw new InvalidLogoError("No pudimos leer esa imagen; prueba con otro archivo.");
  }
}

/** What a patient sees as "their clinic": the clinic's name and logo. */
export async function clinicIdentity(centerId: string | null | undefined): Promise<{ name: string; logoDataUrl: string | null }> {
  const id = centerId ?? DEFAULT_CENTER_ID;
  const [center] = await db.select({ name: centersTable.name, logoDataUrl: centersTable.logoDataUrl })
    .from(centersTable).where(eq(centersTable.id, id));
  return {
    name: center?.name ?? (id === DEFAULT_CENTER_ID ? "Centro principal" : id),
    logoDataUrl: center?.logoDataUrl ?? null,
  };
}
