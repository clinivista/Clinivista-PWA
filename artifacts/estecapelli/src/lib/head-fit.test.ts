import { describe, expect, it } from "vitest";
import { analyzeHeadFit, donorCropBox, findHead, GUIDE_OVAL, isolateAtOval, ovalForFrame } from "./head-fit";

const W = 96;
const H = 128;

/** Silueta sintética: elipse de cabeza + cuello + hombros. Coordenadas en proporciones del cuadro. */
function person(opts: { cx?: number; cy?: number; headW?: number; headH?: number; shoulders?: boolean } = {}) {
  const { cx = 0.5, cy = 0.45, headW = 0.4, headH = 0.5, shoulders = true } = opts;
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const px = x / W;
      const py = y / H;
      const inHead = ((px - cx) / (headW / 2)) ** 2 + ((py - cy) / (headH / 2)) ** 2 <= 1;
      const neckTop = cy + headH / 2 - 0.04;
      const inNeck = Math.abs(px - cx) <= headW * 0.2 && py >= neckTop && py <= neckTop + 0.12;
      const shoulderTop = neckTop + 0.1;
      const inShoulders = shoulders && py >= shoulderTop && Math.abs(px - cx) <= headW * 1.3;
      if (inHead || inNeck || inShoulders) mask[y * W + x] = 255;
    }
  }
  return mask;
}

describe("analyzeHeadFit", () => {
  it("says nobody when the silhouette is missing", () => {
    expect(analyzeHeadFit(new Uint8Array(W * H), W, H).status).toBe("none");
  });

  it("accepts a head that fills the oval and is centered, even with shoulders in the picture", () => {
    const fit = analyzeHeadFit(person({ headH: 0.62, headW: 0.5 }), W, H);
    expect(fit.status).toBe("ok");
    expect(fit.head!.h).toBeGreaterThan(0.5);
    expect(fit.head!.h).toBeLessThan(0.75);
  });

  it("measures only the head, not the shoulders", () => {
    const box = findHead(person({ headH: 0.5, headW: 0.4 }), W, H)!;
    expect((box.y1 - box.y0 + 1) / H).toBeLessThan(0.58);
  });

  it("asks to come closer when the head is small and to move away when it is too big", () => {
    expect(analyzeHeadFit(person({ headH: 0.3, headW: 0.24 }), W, H).status).toBe("closer");
    expect(analyzeHeadFit(person({ headH: 0.9, headW: 0.7, cy: 0.5 }), W, H).status).toBe("farther");
  });

  it("tells which way to move the phone: toward where the head appears", () => {
    const base = { headH: 0.62, headW: 0.5 };
    expect(analyzeHeadFit(person({ ...base, cx: 0.7 }), W, H).status).toBe("right");
    expect(analyzeHeadFit(person({ ...base, cx: 0.3 }), W, H).status).toBe("left");
    expect(analyzeHeadFit(person({ ...base, cy: 0.34 }), W, H).status).toBe("up");
    expect(analyzeHeadFit(person({ ...base, cy: 0.6 }), W, H).status).toBe("down");
  });

  it("flips left/right when the preview is a mirror (front camera)", () => {
    // en el cuadro la cabeza está a la derecha; en el espejo se ve a la izquierda
    const fit = analyzeHeadFit(person({ headH: 0.62, headW: 0.5, cx: 0.7 }), W, H, GUIDE_OVAL, true);
    expect(fit.status).toBe("left");
  });

  it("works without shoulders (top or back view): uses the head proportions", () => {
    const fit = analyzeHeadFit(person({ headH: 0.62, headW: 0.5, shoulders: false }), W, H);
    expect(fit.status).toBe("ok");
  });
});

describe("óvalo en cuadros horizontales", () => {
  it("is bigger for a landscape frame (top view) than for a portrait one", () => {
    const wide = ovalForFrame(400, 300);
    const tall = ovalForFrame(300, 400);
    expect(wide.ry).toBeGreaterThan(tall.ry);
    expect(wide.ry).toBeGreaterThanOrEqual(0.44);
  });
});

describe("zona donante frente al espejo", () => {
  // La persona real (grande, a un costado) y su reflejo (en el óvalo) salen en la misma imagen.
  function mirrorScene() {
    const mask = new Uint8Array(W * H);
    const blob = (cx: number, cy: number, rx: number, ry: number) => {
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        if (((x / W - cx) / rx) ** 2 + ((y / H - cy) / ry) ** 2 <= 1) mask[y * W + x] = 255;
      }
    };
    blob(0.5, 0.42, 0.17, 0.2); // reflejo de la nuca, dentro del óvalo
    blob(0.93, 0.7, 0.12, 0.28); // la persona real, pegada al borde
    return mask;
  }

  it("keeps only the silhouette that sits in the oval", () => {
    const only = isolateAtOval(mirrorScene(), W, H, GUIDE_OVAL)!;
    expect(only[Math.floor(H * 0.42) * W + Math.floor(W * 0.5)]).toBe(255);
    expect(only[Math.floor(H * 0.7) * W + Math.floor(W * 0.93)]).toBe(0);
    expect(isolateAtOval(new Uint8Array(W * H), W, H, GUIDE_OVAL)).toBeNull();
  });

  it("crops around the reflected head only, never the second reflection", () => {
    const only = isolateAtOval(mirrorScene(), W, H, GUIDE_OVAL)!;
    const box = donorCropBox(only, W, H)!;
    expect(box.x).toBeGreaterThan(0.2);
    expect(box.x + box.w).toBeLessThan(0.8); // la otra silueta empieza en x ≈ 0.81
    expect(box.y + box.h).toBeLessThanOrEqual(1);
    expect(donorCropBox(new Uint8Array(W * H), W, H)).toBeNull();
  });
});
