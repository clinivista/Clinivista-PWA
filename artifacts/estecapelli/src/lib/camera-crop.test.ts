import { describe, it, expect } from "vitest";
import { cropRectForVideo, frameFor, parseRatio } from "./camera-crop";

describe("encuadre con margen del cuadro de referencia", () => {
  it("lee la proporción de la vista y cae a 3:4 si no se entiende", () => {
    expect(parseRatio("4:3")).toEqual({ w: 4, h: 3 });
    expect(parseRatio("raro")).toEqual({ w: 3, h: 4 });
    expect(parseRatio(undefined)).toEqual({ w: 3, h: 4 });
  });

  it("el cuadro conserva la proporción y cabe en el visor", () => {
    const frame = frameFor({ width: 400, height: 600 }, { w: 3, h: 4 });
    expect(frame.width / frame.height).toBeCloseTo(3 / 4);
    expect(frame.width).toBeLessThanOrEqual(400);
    expect(frame.height).toBeLessThanOrEqual(600);
    const wide = frameFor({ width: 700, height: 400 }, { w: 4, h: 3 });
    expect(wide.width / wide.height).toBeCloseTo(4 / 3);
    expect(wide.height).toBeLessThanOrEqual(400);
  });

  it("recorta del video exactamente lo que se ve bajo el cuadro (object-fit: cover)", () => {
    // Visor 400x600, video horizontal 1600x900: se escala a 600 de alto (x0.6667) y se corta a los lados.
    const box = { width: 400, height: 600 };
    const video = { width: 1600, height: 900 };
    const frame = { width: 300, height: 400 };
    const crop = cropRectForVideo(box, video, frame, 0)!;
    const scale = 600 / 900;
    expect(crop.sw).toBeCloseTo(300 / scale, 0);
    expect(crop.sh).toBeCloseTo(400 / scale, 0);
    // El centro del cuadro es el centro del video.
    expect(crop.sx + crop.sw / 2).toBeCloseTo(800, 0);
    expect(crop.sy + crop.sh / 2).toBeCloseTo(450, 0);
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(1600);
  });

  it("es un acercamiento: el recorte es menor que el video completo", () => {
    const box = { width: 400, height: 600 };
    const video = { width: 1440, height: 2560 };
    const crop = cropRectForVideo(box, video, frameFor(box, { w: 3, h: 4 }))!;
    expect(crop.sw).toBeLessThan(video.width);
    expect(crop.sh).toBeLessThan(video.height);
  });

  it("deja un margen alrededor del cuadro para no cortar la zona evaluada", () => {
    const box = { width: 400, height: 600 };
    const video = { width: 1440, height: 2560 };
    const frame = frameFor(box, { w: 3, h: 4 });
    const tight = cropRectForVideo(box, video, frame, 0)!;
    const wide = cropRectForVideo(box, video, frame)!;
    expect(wide.sw).toBeGreaterThan(tight.sw);
    expect(wide.sh).toBeGreaterThan(tight.sh);
    // Contiene por completo la zona del cuadro y sigue dentro de la imagen.
    expect(wide.sx).toBeLessThanOrEqual(tight.sx);
    expect(wide.sy).toBeLessThanOrEqual(tight.sy);
    expect(wide.sx + wide.sw).toBeGreaterThanOrEqual(tight.sx + tight.sw);
    expect(wide.sy + wide.sh).toBeGreaterThanOrEqual(tight.sy + tight.sh);
    expect(wide.sx + wide.sw).toBeLessThanOrEqual(video.width);
    expect(wide.sy + wide.sh).toBeLessThanOrEqual(video.height);
  });

  it("si el margen no cabe en la imagen, la proporción del cuadro se mantiene", () => {
    const box = { width: 400, height: 600 };
    const video = { width: 1000, height: 1333 };
    const frame = { width: 380, height: 507 };
    const crop = cropRectForVideo(box, video, frame)!;
    expect(crop.sw / crop.sh).toBeCloseTo(380 / 507, 1);
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(video.width);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(video.height);
  });

  it("sin tamaños conocidos conserva la imagen completa", () => {
    expect(cropRectForVideo({ width: 0, height: 0 }, { width: 100, height: 100 }, { width: 10, height: 10 })).toBeNull();
    expect(cropRectForVideo({ width: 100, height: 100 }, { width: 0, height: 0 }, { width: 10, height: 10 })).toBeNull();
  });
});
