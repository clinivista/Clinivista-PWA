import { describe, it, expect } from "vitest";
import { FIT, MAX_ZOOM, clampView, zoomAt } from "./zoom-view";

const content = { width: 300, height: 400 };
const viewport = { width: 400, height: 500 };

describe("zoom del editor de fotos", () => {
  it("limita el zoom entre 1x y el máximo", () => {
    expect(zoomAt(FIT, 0.2, { x: 0, y: 0 }, content, viewport).zoom).toBe(1);
    expect(zoomAt(FIT, 50, { x: 0, y: 0 }, content, viewport).zoom).toBe(MAX_ZOOM);
  });

  it("al acercar desde el centro no desplaza la foto", () => {
    expect(zoomAt(FIT, 2, { x: 0, y: 0 }, content, viewport)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it("mantiene bajo el dedo el punto que se acerca", () => {
    // Con zoom 4 la foto (1200x1600) cubre el visor; el punto a 100 px a la derecha del centro sigue ahí.
    const next = zoomAt({ zoom: 2, x: 0, y: 0 }, 4, { x: 100, y: 0 }, content, viewport);
    expect(next.zoom).toBe(4);
    expect(next.x).toBe(-100);
  });

  it("no deja huecos: la foto no se despega de los bordes del visor", () => {
    const view = clampView({ zoom: 2, x: 9999, y: -9999 }, content, viewport);
    expect(view.x).toBe((300 * 2 - 400) / 2);
    expect(view.y).toBe(-(400 * 2 - 500) / 2);
  });

  it("si la foto sigue cabiendo en el visor, queda centrada", () => {
    expect(clampView({ zoom: 1, x: 80, y: 80 }, content, viewport)).toEqual({ zoom: 1, x: 0, y: 0 });
  });
});
