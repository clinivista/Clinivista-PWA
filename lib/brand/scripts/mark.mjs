import { G, cPath, planes } from "./geometry.mjs";

// Colores medidos en la referencia (muestras dentro de cada plano).
export const COLORS = {
  stripTop: "#5CCBFE", stripMid: "#36BAFC", stripBottom: "#0A90FD",
  ribbonTop: "#43A0FE", ribbonMid: "#1A84FE", ribbonLow: "#067AFD", ribbonBottom: "#0262F7",
  panelTopA: "#72DBFA", panelTopB: "#3DC3FA",
  panelBotA: "#0B9DFB", panelBotB: "#0080F4",
  pupilCore: "#001A4D", pupilMid: "#00215C", pupilRim: "#1A55A0",
  navy: "#061C4A", blue: "#0A6DFE", tagline: "#5B6B85",
  // Versión para fondo oscuro (lámina, «Versión en oscuro»): «Clini» blanco,
  // «vista» celeste y lema gris claro; el isotipo no cambia.
  darkClini: "#FFFFFF", darkVista: "#4BA9F5", darkTagline: "#C5D0E0",
};

/**
 * Isotipo en color. `id` prefija los ids internos (varios logos en una página).
 * `lens` = color del disco (blanco; en la versión monocroma, el fondo).
 */
export function markColor(id = "cv", { lens = "#FFFFFF" } = {}) {
  const p = planes();
  const { disk, pupil, highlight } = G;
  return {
    defs: `
    <clipPath id="${id}-c"><path d="${cPath()}"/></clipPath>
    <linearGradient id="${id}-strip" gradientUnits="userSpaceOnUse" x1="0" y1="85" x2="0" y2="250">
      <stop offset="0" stop-color="${COLORS.stripTop}"/><stop offset=".3" stop-color="${COLORS.stripMid}"/><stop offset="1" stop-color="${COLORS.stripBottom}"/>
    </linearGradient>
    <linearGradient id="${id}-ribbon" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="350">
      <stop offset="0" stop-color="${COLORS.ribbonTop}"/><stop offset=".25" stop-color="${COLORS.ribbonMid}"/><stop offset=".62" stop-color="${COLORS.ribbonLow}"/><stop offset="1" stop-color="${COLORS.ribbonBottom}"/>
    </linearGradient>
    <radialGradient id="${id}-shade" gradientUnits="userSpaceOnUse" cx="${disk.x}" cy="${disk.y + 30}" r="125">
      <stop offset=".55" stop-color="#0030BE" stop-opacity=".45"/><stop offset="1" stop-color="#0030BE" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-pt" gradientUnits="userSpaceOnUse" x1="237" y1="63" x2="360" y2="175">
      <stop offset="0" stop-color="${COLORS.panelTopA}"/><stop offset="1" stop-color="${COLORS.panelTopB}"/>
    </linearGradient>
    <linearGradient id="${id}-pb" gradientUnits="userSpaceOnUse" x1="237" y1="255" x2="330" y2="367">
      <stop offset="0" stop-color="${COLORS.panelBotA}"/><stop offset="1" stop-color="${COLORS.panelBotB}"/>
    </linearGradient>
    <radialGradient id="${id}-pupil" gradientUnits="userSpaceOnUse" cx="${pupil.x - 8}" cy="${pupil.y + 8}" r="${pupil.r + 10}" fx="${pupil.x - 12}" fy="${pupil.y + 12}">
      <stop offset="0" stop-color="${COLORS.pupilCore}"/><stop offset=".72" stop-color="${COLORS.pupilMid}"/><stop offset="1" stop-color="${COLORS.pupilRim}"/>
    </radialGradient>`,
    body: `
    <g clip-path="url(#${id}-c)">
      <rect x="0" y="0" width="480" height="440" fill="url(#${id}-ribbon)"/>
      <rect x="0" y="0" width="480" height="440" fill="url(#${id}-shade)"/>
      <path d="${p.lightStrip}" fill="url(#${id}-strip)"/>
      <path d="${p.topRight}" fill="url(#${id}-pt)"/>
      <path d="${p.bottomRight}" fill="url(#${id}-pb)"/>
    </g>
    <circle cx="${disk.x}" cy="${disk.y}" r="${disk.r}" fill="${lens}"/>
    <circle cx="${pupil.x}" cy="${pupil.y}" r="${pupil.r}" fill="url(#${id}-pupil)"/>
    <circle cx="${highlight.x}" cy="${highlight.y}" r="${highlight.r}" fill="#FFFFFF"/>`,
  };
}

/** Isotipo de una tinta (monocromo): la lente queda calada (transparente) y el brillo, calado en la pupila. */
export function markMono(ink) {
  const { pupil: p, highlight: h } = G;
  const circle = (c) => `M ${c.x - c.r} ${c.y} a ${c.r} ${c.r} 0 1 0 ${2 * c.r} 0 a ${c.r} ${c.r} 0 1 0 ${-2 * c.r} 0 Z`;
  return {
    defs: "",
    body: `
    <path d="${cPath()}" fill="${ink}"/>
    <path d="${circle(p)} ${circle(h)}" fill="${ink}" fill-rule="evenodd"/>`,
  };
}

/** Caja visible del isotipo (esquinas redondeadas y puntas de los brazos incluidas). */
export const MARK_BOX = { x: 98, y: 69, w: 258, h: 292 };
