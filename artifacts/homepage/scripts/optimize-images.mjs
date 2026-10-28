// Optimiza las fotografías del sitio comercial (solo cambia tamaño y formato:
// sin recortes, sin retoques; se conserva la composición original).
//
//   SRC=/ruta/a/fotografias node artifacts/homepage/scripts/optimize-images.mjs
//
// SRC es la carpeta «fotografias/» del ZIP entregado por el usuario (no se
// versiona). Escribe AVIF + WebP en varios anchos y un JPEG de respaldo en
// artifacts/homepage/public/images/. sharp ya es dependencia del servidor.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [new URL("../../api-server/", import.meta.url).pathname] }));
const SRC = process.env.SRC;
if (!SRC) throw new Error("Define SRC con la carpeta fotografias/ del ZIP.");
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/images");
fs.mkdirSync(OUT, { recursive: true });

// archivo original → nombre publicado, anchos y ancho del JPEG de respaldo.
const PLAN = [
  ["01-hero.png", "hero-profesional", [800, 1200, 1774], 1200],
  ["02-rostros-comparativa.png", "rostros-comparativa", [768, 1536], 1024],
  ["06-piel-comparativa.png", "piel-comparativa", [768, 1536], 1024],
  ["03-dermatologia.png", "dermatologia", [160, 320], 320],
  ["04-tricologia.png", "tricologia", [160, 320], 320],
  ["05-cirugia-plastica.png", "cirugia-plastica", [160, 320], 320],
];

for (const [file, name, widths, fallback] of PLAN) {
  const input = path.join(SRC, file);
  for (const w of widths) {
    const resized = () => sharp(input).resize({ width: w, withoutEnlargement: true });
    await resized().avif({ quality: 55, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.avif`));
    await resized().webp({ quality: 78, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  await sharp(input).resize({ width: fallback, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
  console.log("ok", name);
}
