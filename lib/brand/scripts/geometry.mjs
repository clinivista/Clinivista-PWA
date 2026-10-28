// Geometría del isotipo «Clinical Premium», construida a mano a partir de las
// medidas tomadas sobre identidad-aprobada.png (coordenadas en píxeles de la
// lámina; el logo grande ocupa x 98–376, y 63–367).
//
//  · Hexágono de vértice superior: lados verticales y lados a 30° (pendiente
//    tan 30°), esquinas de 120° redondeadas con radio 44.
//  · Disco blanco (la lente) de radio 75 con centro (237, 217).
//  · Abertura: cuña de 60° (±30°) con vértice en el centro del disco: el
//    «campo visual» de la cámara. Las puntas de los brazos (60°) llevan radio
//    15 y la unión cuña–disco, radio 8.
//  · Pupila concéntrica de radio 39,5 y brillo de radio 9,5 desplazado
//    (+17,3, −13,1) hacia arriba a la derecha.
//  · Planos tonales: dos paneles a la derecha del eje vertical del disco
//    (cian claro arriba, azul vivo abajo) y, a la izquierda, una franja clara
//    exterior y una «cinta» más oscura que abraza la lente.

export const G = {
  cx: 237, // eje vertical del hexágono y del disco
  top: 63, bottom: 367, left: 98, right: 376,
  corner: 42, tip: 15, joint: 10,
  disk: { x: 237, y: 217, r: 75 },
  pupil: { x: 237, y: 217, r: 39.5 },
  highlight: { x: 254.3, y: 203.9, r: 9.5 },
  half: Math.PI / 6, // semiángulo de la abertura (30°)
};

const T30 = Math.tan(Math.PI / 6);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => mul(a, 1 / len(a));
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const f = (n) => Number(n.toFixed(2));
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/** Esquina entre dos rectas (entrando por a→v, saliendo v→b) redondeada con radio r. */
function corner(a, v, b, r) {
  const d1 = norm(sub(a, v)), d2 = norm(sub(b, v));
  const theta = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2)))); // ángulo interior
  const t = r / Math.tan(theta / 2);
  const p1 = add(v, mul(d1, t)), p2 = add(v, mul(d2, t));
  const sweep = cross(sub(v, a), sub(b, v)) > 0 ? 1 : 0; // giro horario en pantalla = 1
  return { p1, p2, arc: `A ${f(r)} ${f(r)} 0 0 ${sweep} ${pt(p2)}` };
}

function lineIntersect(p, d, q, e) {
  const t = cross(sub(q, p), e) / cross(d, e);
  return add(p, mul(d, t));
}

/** Contorno de la C: hexágono redondeado menos (disco ∪ cuña), con todos los empalmes. */
export function cPath(g = G) {
  const { cx, top, bottom, left, right, corner: R, tip, joint } = g;
  const C0 = [g.disk.x, g.disk.y], rD = g.disk.r;
  const ul = [left, top + (cx - left) * T30], ll = [left, bottom - (cx - left) * T30];
  const vTop = [cx, top], vBot = [cx, bottom];
  // Rectas de los lados superior derecho e inferior derecho del hexágono.
  const upR = { p: vTop, d: norm([right - cx, (right - cx) * T30]) };
  const loR = { p: vBot, d: norm([right - cx, -(right - cx) * T30]) };
  // Bordes de la cuña (desde el centro del disco).
  const uW = [Math.cos(g.half), -Math.sin(g.half)], lW = [Math.cos(g.half), Math.sin(g.half)];
  const tipU = lineIntersect(upR.p, upR.d, C0, uW);
  const tipL = lineIntersect(loR.p, loR.d, C0, lW);

  // Empalme recta (borde de la cuña) – círculo (disco), del lado del brazo.
  function jointFillet(w, nSide) {
    const n = nSide; // normal hacia el brazo
    const s = Math.sqrt((rD + joint) ** 2 - joint ** 2);
    const F = add(add(C0, mul(w, s)), mul(n, joint));
    const onLine = add(C0, mul(w, s));
    const onCircle = add(C0, mul(norm(sub(F, C0)), rD));
    return { F, onLine, onCircle };
  }
  const jU = jointFillet(uW, [-Math.sin(g.half), -Math.cos(g.half)]);
  const jL = jointFillet(lW, [-Math.sin(g.half), Math.cos(g.half)]);

  const cTop = corner(ul, vTop, tipU, R);
  const cTipU = corner(vTop, tipU, C0, tip);
  const cTipL = corner(C0, tipL, vBot, tip);
  const cBot = corner(tipL, vBot, ll, R);
  const cLL = corner(vBot, ll, ul, R);
  const cUL = corner(ll, ul, vTop, R);

  return [
    `M ${pt(cTop.p1)}`, cTop.arc,
    `L ${pt(cTipU.p1)}`, cTipU.arc,
    `L ${pt(jU.onLine)}`,
    // empalme convexo del brazo superior hacia el disco
    `A ${joint} ${joint} 0 0 1 ${pt(jU.onCircle)}`,
    // disco: por arriba, la izquierda y abajo (arco mayor, antihorario en pantalla)
    `A ${rD} ${rD} 0 1 0 ${pt(jL.onCircle)}`,
    `A ${joint} ${joint} 0 0 1 ${pt(jL.onLine)}`,
    `L ${pt(cTipL.p1)}`, cTipL.arc,
    `L ${pt(cBot.p1)}`, cBot.arc,
    `L ${pt(cLL.p1)}`, cLL.arc,
    `L ${pt(cUL.p1)}`, cUL.arc,
    "Z",
  ].join(" ");
}

/** Planos tonales (se recortan con la silueta de la C). */
export function planes(g = G) {
  const C0 = [g.disk.x, g.disk.y];
  const sx = g.cx - 1.5; // los paneles derechos empiezan en x ≈ 235,5 (medido)
  const out = 40; // margen fuera de la silueta
  const rD = g.disk.r, rT = 18, rB = 12; // encuentro de cada panel con la lente
  const big = { x0: g.left - out, x1: g.right + out, y0: g.top - out, y1: g.bottom + out };
  return {
    // Panel superior derecho: borde izquierdo vertical que se curva hacia la lente.
    topRight: `M ${sx} ${big.y0} V ${C0[1] - rD - rT} A ${rT} ${rT} 0 0 0 ${sx + rT} ${C0[1] - rD} V ${C0[1]} H ${big.x1} V ${big.y0} Z`,
    // Panel inferior derecho: arriba se curva hacia la lente y, cerca del
    // vértice inferior, su borde se abre suavemente hacia la izquierda.
    bottomRight: `M ${sx} ${C0[1] + rD + rB} A ${rB} ${rB} 0 0 1 ${sx + rB} ${C0[1] + rD} V ${C0[1]} H ${big.x1} V ${big.y1} H 190 L 200 ${g.bottom + 7} Q ${sx} 352 ${sx} 340 Z`,
    // Franja clara exterior (arriba a la izquierda): curva desde el borde
    // superior hasta la lente y recta a −47° hasta el borde izquierdo.
    lightStrip: `M 212 ${big.y0} L 212 72 Q 162 116 172 190 L 175 186.3 L 60 309.4 L ${big.x0} 309.4 L ${big.x0} ${big.y0} Z`,
  };
}
