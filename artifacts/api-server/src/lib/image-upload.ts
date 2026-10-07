import type express from "express";
import sharp from "sharp";

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 20_000;
const MAX_IMAGE_PIXELS = 40_000_000;

function readImageDimensions(contentType: string, bytes: Buffer): { width: number; height: number } | null {
  if (contentType === "image/png") {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
      }
      offset += length;
    }
    return null;
  }
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8 ") {
    if (bytes.length < 30 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }
  return null;
}

// Fully decodes the image (not just its header) to reject truncated or
// corrupt payloads, and cross-checks the declared content type and the
// dimensions read from the header against what actually decoded.
//
// This used to shell out to ImageMagick's `identify` CLI. That's a system
// binary the deployment environment happened to have, but it's not a
// project dependency — anywhere it's missing (as on at least one
// contributor's machine), every photo upload silently fails here. `sharp`
// is already a real dependency (used for the technical derivative
// pipeline below) and decodes fully when asked for pixel data, so this
// switches to it and drops the external-binary dependency entirely.
async function fullyDecodeImage(
  contentType: string,
  bytes: Buffer,
  dimensions: { width: number; height: number },
): Promise<boolean> {
  const expectedFormat = contentType === "image/jpeg" ? "jpeg"
    : contentType === "image/png" ? "png" : "webp";
  try {
    const { info } = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS })
      .toBuffer({ resolveWithObject: true });
    return info.format === expectedFormat && info.width === dimensions.width && info.height === dimensions.height;
  } catch {
    return false;
  }
}

export type ParsedImage = { contentType: string; bytes: Buffer; width: number; height: number };

/** Validates raw bytes as a real, fully decodable JPEG/PNG/WebP within the size and pixel limits. */
export async function parseImageBytes(contentType: string, bytes: unknown): Promise<ParsedImage | null> {
  if (!ALLOWED_IMAGE_TYPES.has(contentType) || !Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
    return null;
  }
  const dimensions = readImageDimensions(contentType, bytes);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1
    || dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION
    || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
    || !(await fullyDecodeImage(contentType, bytes, dimensions))) return null;
  return { contentType, bytes, ...dimensions };
}

export async function parseImageRequest(req: express.Request): Promise<ParsedImage | null> {
  const contentType = req.headers["content-type"]?.split(";")[0]?.toLowerCase() ?? "";
  return parseImageBytes(contentType, req.body);
}

export function parseOptionalPixelDimension(value: string | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (!/^\d{1,5}$/.test(value)) return null;
  const numeric = Number(value);
  return numeric > 0 && numeric <= 20_000 ? numeric : null;
}

