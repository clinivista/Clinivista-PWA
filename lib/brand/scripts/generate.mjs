// Genera los activos de marca de Clinivista («Clinical Premium») en lib/brand.
//
//   BRAND_FONT=/ruta/Outfit[wght].ttf node lib/brand/scripts/generate.mjs
//
// · svg/: logos e isotipo construidos a mano (geometry.mjs) y textos en trazados.
// · public/: favicon, iconos de app/PWA, apple-touch-icon y la imagen para redes;
//   el plugin de Vite (../vite-plugin.mjs) los publica en la raíz de cada app.
// sharp ya es dependencia del servidor: se usa desde ahí.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { markColor, markMono, COLORS, MARK_BOX } from "./mark.mjs";
import { TYPE, textPaths } from "./text.mjs";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [new URL("../../../artifacts/api-server/", import.meta.url).pathname] }));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const word = textPaths(TYPE.word);
const tag = textPaths(TYPE.tag);
// Caja del logo horizontal: del isotipo (x 98) al final del wordmark (x 1032).
const LOCKUP = { x: MARK_BOX.x, y: MARK_BOX.y, w: TYPE.word.box[2] - MARK_BOX.x, h: MARK_BOX.h };

const svgDoc = ({ viewBox, title, defs = "", body }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}">\n  <title>${title}</title>\n  <defs>${defs}\n  </defs>${body}\n</svg>\n`;
const vb = (b) => `${b.x} ${b.y} ${b.w} ${b.h}`;

function lockup({ tone, tagline }) {
  const mono = tone === "black" || tone === "white";
  const ink = tone === "white" ? "#FFFFFF" : "#000000";
  const m = mono ? markMono(ink) : markColor("cv");
  const [clini, vista, lema] = mono ? [ink, ink, ink]
    : tone === "dark" ? [COLORS.darkClini, COLORS.darkVista, COLORS.darkTagline]
      : [COLORS.navy, COLORS.blue, COLORS.tagline];
  const body = `${m.body}
  <path d="${word.parts[0]}" fill="${clini}"/>
  <path d="${word.parts[1]}" fill="${vista}"/>${tagline ? `\n  <path d="${tag.parts[0]}" fill="${lema}"/>` : ""}`;
  return svgDoc({ viewBox: vb(LOCKUP), title: tagline ? "Clinivista — Registro fotográfico clínico" : "Clinivista", defs: m.defs, body });
}

function isotipo(tone, box = MARK_BOX) {
  const m = tone === "black" ? markMono("#000000") : tone === "white" ? markMono("#FFFFFF") : markColor("cv");
  return svgDoc({ viewBox: vb(box), title: "Clinivista", defs: m.defs, body: m.body });
}

// Caja cuadrada centrada en el isotipo (favicon e iconos).
const square = (pad) => {
  const side = Math.max(MARK_BOX.w, MARK_BOX.h) * (1 + 2 * pad);
  return { x: MARK_BOX.x + MARK_BOX.w / 2 - side / 2, y: MARK_BOX.y + MARK_BOX.h / 2 - side / 2, w: side, h: side };
};

const SVGS = {
  "clinivista-logo.svg": lockup({ tone: "color", tagline: true }),
  "clinivista-logo-sin-lema.svg": lockup({ tone: "color", tagline: false }),
  "clinivista-logo-oscuro.svg": lockup({ tone: "dark", tagline: true }),
  "clinivista-logo-oscuro-sin-lema.svg": lockup({ tone: "dark", tagline: false }),
  "clinivista-logo-mono-negro.svg": lockup({ tone: "black", tagline: true }),
  "clinivista-logo-mono-blanco.svg": lockup({ tone: "white", tagline: true }),
  "clinivista-isotipo.svg": isotipo("color"),
  "clinivista-isotipo-mono-negro.svg": isotipo("black"),
  "clinivista-isotipo-mono-blanco.svg": isotipo("white"),
};
for (const [name, svg] of Object.entries(SVGS)) fs.writeFileSync(path.join(ROOT, "svg", name), svg);

// favicon.svg: isotipo en una caja cuadrada con un margen mínimo.
const favicon = isotipo("color", square(0.02));
fs.writeFileSync(path.join(ROOT, "public", "favicon.svg"), favicon);

const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(ROOT, "public", file));

/** Isotipo sobre un fondo (blanco por defecto). `scale` = alto del isotipo / lado; `radius` = esquina del fondo (0–0.5). */
function tile({ scale, radius = 0, background = "#FFFFFF" }) {
  const side = MARK_BOX.h / scale;
  const box = { x: MARK_BOX.x + MARK_BOX.w / 2 - side / 2, y: MARK_BOX.y + MARK_BOX.h / 2 - side / 2, w: side, h: side };
  const m = markColor("cv");
  const bg = `<rect x="${box.x}" y="${box.y}" width="${side}" height="${side}" rx="${side * radius}" fill="${background}"/>`;
  return svgDoc({ viewBox: vb(box), title: "Clinivista", defs: m.defs, body: `\n  ${bg}${m.body}` });
}

await png(favicon, 32, "favicon.png");
await png(favicon, 32, "favicon-32.png");
await png(favicon, 16, "favicon-16.png");
// Ícono de la app (como «App / Favicon» de la lámina): isotipo sobre una placa blanca redondeada.
await png(tile({ scale: 0.64, radius: 0.225 }), 192, "icon-192.png");
await png(tile({ scale: 0.64, radius: 0.225 }), 512, "icon-512.png");
// iOS redondea solo: placa blanca completa.
await png(tile({ scale: 0.62 }), 180, "apple-touch-icon.png");
// Maskable: fondo completo y el isotipo dentro de la zona segura (círculo del 80 %).
await png(tile({ scale: 0.5 }), 192, "icon-maskable-192.png");
await png(tile({ scale: 0.5 }), 512, "icon-maskable-512.png");
// Nombre histórico del logo (enlaces externos antiguos): ahora el isotipo nuevo.
await png(isotipo("color", square(0.04)), 512, "clinivista-logo.png");

// Imagen para redes (1200×630): logo con lema centrado sobre un fondo claro.
{
  const W = 1200, H = 630, logoW = 860;
  const s = logoW / LOCKUP.w, logoH = LOCKUP.h * s;
  const m = markColor("cv");
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${m.defs}
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EBF4FF"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g transform="translate(${(W - logoW) / 2} ${(H - logoH) / 2}) scale(${s}) translate(${-LOCKUP.x} ${-LOCKUP.y})">${m.body}
    <path d="${word.parts[0]}" fill="${COLORS.navy}"/><path d="${word.parts[1]}" fill="${COLORS.blue}"/><path d="${tag.parts[0]}" fill="${COLORS.tagline}"/>
  </g>
</svg>`;
  await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(path.join(ROOT, "public", "clinivista-og.png"));
}
console.log("Activos generados en", ROOT);
