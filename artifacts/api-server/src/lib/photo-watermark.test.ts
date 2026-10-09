import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { applyClinicWatermark } from "./photo-watermark";

const solid = (width: number, height: number, color = { r: 120, g: 130, b: 140 }) =>
  sharp({ create: { width, height, channels: 3, background: color } }).jpeg().toBuffer();

const logoDataUrl = async () =>
  `data:image/png;base64,${(await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()).toString("base64")}`;

async function pixels(bytes: Buffer) {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  return { data, ...info };
}

describe("marca de agua con el logo de la clínica", () => {
  it("repite el logo por toda la foto y conserva el tamaño", async () => {
    const original = await solid(1200, 900);
    const out = await applyClinicWatermark({ bytes: original, contentType: "image/jpeg", width: 1200, height: 900 }, await logoDataUrl());
    expect(out.contentType).toBe("image/jpeg");
    expect([out.width, out.height]).toEqual([1200, 900]);
    const meta = await sharp(out.bytes).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 900, "jpeg"]);

    // The logo is red: its pixels are redder than the grey background; and it shows in every quarter of the photo.
    const px = await pixels(out.bytes);
    const reddish = (x0: number, y0: number, x1: number, y1: number) => {
      let count = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * px.width + x) * px.channels;
        if (px.data[i] - px.data[i + 2] > 25) count++;
      }
      return count;
    };
    for (const [x0, y0] of [[0, 0], [600, 0], [0, 450], [600, 450]]) expect(reddish(x0, y0, x0 + 600, y0 + 450)).toBeGreaterThan(300);
    // ...but most of the photo is untouched (a faint mark, not a cover).
    expect(reddish(0, 0, 1200, 900)).toBeLessThan(1200 * 900 * 0.25);
  });

  it("sin logo de la clínica usa la marca de Clinivista, y con un logo dañado no falla", async () => {
    const original = await solid(800, 600);
    const base = { bytes: original, contentType: "image/jpeg", width: 800, height: 600 };
    const without = await applyClinicWatermark(base, null);
    expect(without.bytes.equals(original)).toBe(false);
    const broken = await applyClinicWatermark(base, "data:image/png;base64,AAAA");
    expect([broken.width, broken.height]).toEqual([800, 600]);
  });

  it("reduce las fotos enormes y deja intactas las diminutas", async () => {
    const big = await applyClinicWatermark({ bytes: await solid(4000, 3000), contentType: "image/jpeg", width: 4000, height: 3000 }, null);
    expect(Math.max(big.width, big.height)).toBe(2400);
    const tiny = await solid(50, 50);
    const out = await applyClinicWatermark({ bytes: tiny, contentType: "image/jpeg", width: 50, height: 50 }, null);
    expect(out.bytes.equals(tiny)).toBe(true);
  });

  it("devuelve la foto tal cual si no se puede procesar", async () => {
    const junk = Buffer.from("no es una imagen");
    const out = await applyClinicWatermark({ bytes: junk, contentType: "image/jpeg", width: 10, height: 10 }, null);
    expect(out.bytes.equals(junk)).toBe(true);
  });
});
