import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// jsdom no calcula estilos: se verifica que la lista desplegable tenga una altura máxima real (var(...) válido en Tailwind 4),
// de lo contrario en celulares pequeños la lista se sale de la pantalla y no se puede desplazar.
describe("lista desplegable (Select)", () => {
  const source = readFileSync(join(__dirname, "select.tsx"), "utf8");
  it("limita su altura al espacio disponible y a un máximo, y permite desplazarse", () => {
    expect(source).toContain("max-h-[min(var(--radix-select-content-available-height),22rem)]");
    expect(source).toContain("overflow-y-auto");
    expect(source).not.toMatch(/max-h-\[--radix/);
  });
});
