# @workspace/brand — identidad «Clinical Premium» de Clinivista

Fuente única de la marca para la app (`artifacts/estecapelli`, app.clinivista.cl)
y el sitio comercial (`artifacts/homepage`, clinivista.cl). La referencia
aprobada está en `attached_assets/identidad-clinical-premium/identidad-aprobada.png`.

## Archivos

| Archivo | Uso |
|---|---|
| `svg/clinivista-logo.svg` | Logo horizontal con lema, fondo claro |
| `svg/clinivista-logo-sin-lema.svg` | Logo horizontal sin lema, fondo claro |
| `svg/clinivista-logo-oscuro.svg` / `-oscuro-sin-lema.svg` | Fondo oscuro (p. ej. el menú azul marino #0B1F33): «Clini» blanco, «vista» celeste |
| `svg/clinivista-logo-mono-negro.svg` / `-mono-blanco.svg` | Una tinta (negro o blanco), lente calada |
| `svg/clinivista-isotipo.svg` (+ `-mono-negro`, `-mono-blanco`) | Isotipo solo |
| `public/favicon.svg`, `favicon.png` (32), `favicon-32.png`, `favicon-16.png` | Pestaña del navegador |
| `public/apple-touch-icon.png` (180) | iOS (pantalla de inicio) |
| `public/icon-192.png`, `icon-512.png` | PWA (`purpose: any`, placa blanca redondeada) |
| `public/icon-maskable-192.png`, `icon-maskable-512.png` | PWA (`purpose: maskable`, isotipo dentro de la zona segura del 80 %) |
| `public/clinivista-og.png` (1200×630) | Vista previa en redes y mensajería |
| `public/clinivista-logo.png` (512) | Nombre histórico del logo: ahora el isotipo nuevo (enlaces externos antiguos) |

En React se importan como URL (Vite les pone hash, así que no hay caché vieja):
`import logo from "@workspace/brand/svg/clinivista-logo.svg"`. En la app,
`components/brand-logo.tsx` (`variant`: `isotipo` | `logo` | `logo-sin-lema`;
`tone`: `light` | `dark`).

`vite-plugin.mjs` publica `public/` en la raíz de cada app según su
`BASE_PATH`, agrega `manifest.webmanifest` (solo la app) e inserta en el
`<head>` los enlaces a favicon, apple-touch-icon, manifest, `theme-color` y
`og:image`/`twitter:image`, con `?v=BRAND_VERSION` para que navegadores e iOS
no sigan usando los íconos anteriores. Sube `BRAND_VERSION` si cambian.

## Construcción (hecha a mano sobre la referencia, sin vectorizar el PNG)

Medidas tomadas en píxeles de la lámina (logo grande en x 98–376, y 63–367);
ver `scripts/geometry.mjs`.

- **C geométrica**: hexágono de vértice superior con lados verticales y lados a
  30° (pendiente tan 30°, medida 0,577), esquinas de 120° con radio 42.
- **Lente**: disco blanco de radio 75 con centro (237, 217) (ajuste por mínimos
  cuadrados, residuos < 0,6 px). **Pupila** concéntrica de radio 39,5, azul
  marino con brillo en el borde; **brillo** blanco de radio 9,5 desplazado
  (+17,3, −13,1).
- **Abertura** («campo visual de una cámara»): cuña de 60° (±30°) con vértice en
  el centro de la lente; puntas de los brazos con radio 15 y unión con la lente
  con radio 10.
- **Planos tonales**: a la derecha del eje de la lente, un panel cian claro
  (#72DBFA → #3DC3FA) arriba y uno azul vivo (#0B9DFB → #0080F4) abajo, ambos
  con su encuentro redondeado con la lente; a la izquierda, una franja clara
  exterior (#5CCBFE → #0A90FD) y una «cinta» más oscura que abraza la lente
  (#43A0FE → #0262F7, con sombra radial hacia la lente).
- **Colores del texto**: «Clini» #061C4A, «vista» #0A6DFE, lema #5B6B85
  (medidos en la referencia; las muestras de paleta de la lámina son
  orientativas).

## Tipografía

**Outfit** (Rodrigo Fuenzalida, SIL Open Font License 1.1) para el wordmark
(peso 660, interletrado −0,038 em) y el lema (peso 550, interletrado
+0,345 em, mayúsculas). Se eligió midiendo, no a ojo: se renderizó
«Clinivista» con 16 candidatas geométricas (Outfit, Plus Jakarta Sans,
Montserrat, Poppins, Figtree, Urbanist, Lexend, Manrope, Sora, Red Hat Display…)
y se comparó píxel a píxel (IoU) con la referencia a igual alto: Outfit ganó
(0,77) con el mismo ancho (±0,5 %) y la misma altura (124 vs. 123 px). En el
lema Outfit y Montserrat empatan (0,56); se usa Outfit para que la marca tenga
una sola familia. Coinciden la «a» de dos pisos, la «t» de remate plano, los
puntos redondos y la «C» casi circular.

Los textos están convertidos a trazados: los SVG no dependen de ninguna fuente.
Diferencias residuales conocidas: el ojo inferior de la «a» y la abertura de la
«C» de Outfit difieren unos píxeles de la referencia.

## Regenerar

```bash
# Outfit[wght].ttf: https://github.com/google/fonts/tree/main/ofl/outfit (no se versiona)
BRAND_FONT=/ruta/Outfit[wght].ttf node lib/brand/scripts/generate.mjs
```

Usa `sharp` y `@pdf-lib/fontkit`, que ya son dependencias de `artifacts/api-server`.
