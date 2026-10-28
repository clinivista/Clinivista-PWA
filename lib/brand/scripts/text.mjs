// Wordmark y lema convertidos a trazados (Outfit, SIL OFL 1.1), con la caja
// de cada texto ajustada a la medida en la referencia.
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
// fontkit ya es dependencia del servidor (PDF): se usa desde ahí, sin sumar dependencias.
const fk = require(require.resolve("@pdf-lib/fontkit", { paths: [new URL("../../../artifacts/api-server/", import.meta.url).pathname] }));

// Outfit variable (SIL OFL 1.1): https://github.com/google/fonts/tree/main/ofl/outfit
// No se versiona la fuente: el logo queda en trazados y no depende de ella.
const FONT = process.env.BRAND_FONT;
if (!FONT) throw new Error("Define BRAND_FONT con la ruta a Outfit[wght].ttf (google/fonts, ofl/outfit).");
const base = fk.create(fs.readFileSync(FONT));

export const TYPE = {
  word: { text: "Clinivista", split: 5, wght: 660, tracking: -38, box: [390, 146, 1032, 269] },
  tag: { text: "REGISTRO FOTOGRÁFICO CLÍNICO", wght: 550, tracking: 345, box: [395, 300, 1030, 324] },
};

const r2 = (n) => Number(n.toFixed(2));

/** Trazado de un texto con su caja en unidades de la fuente (sin escalar). */
function layout(spec) {
  const font = base.getVariation({ wght: spec.wght });
  const run = font.layout(spec.text);
  let x = 0; const glyphs = [];
  run.glyphs.forEach((g, i) => { glyphs.push({ path: g.path, x }); x += run.positions[i].xAdvance + spec.tracking * font.unitsPerEm / 1000; });
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const { path, x: gx } of glyphs) { const b = path.bbox; if (!isFinite(b.minX)) continue; x0 = Math.min(x0, gx + b.minX); x1 = Math.max(x1, gx + b.maxX); y0 = Math.min(y0, b.minY); y1 = Math.max(y1, b.maxY); }
  return { glyphs, box: { x0, y0, x1, y1 } };
}

/**
 * Trazados absolutos (sin transform) del texto ajustado a `box` [x0, y0, x1, y1]:
 * escala uniforme por el ancho, alineado arriba a la izquierda.
 * Devuelve un trazado por tramo (para dar dos colores al wordmark).
 */
export function textPaths(spec, box = spec.box) {
  const { glyphs, box: b } = layout(spec);
  const s = (box[2] - box[0]) / (b.x1 - b.x0);
  const toSvg = (list) => list.map(({ path, x }) => path.transform(s, 0, 0, -s, box[0] + (x - b.x0) * s, box[1] + b.y1 * s).toSVG()).join("")
    .replace(/-?\d+\.\d+/g, (m) => String(r2(Number(m))));
  const parts = spec.split ? [glyphs.slice(0, spec.split), glyphs.slice(spec.split)] : [glyphs];
  return { parts: parts.map(toSvg), height: (b.y1 - b.y0) * s, scale: s };
}
