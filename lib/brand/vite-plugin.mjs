// Publica en la raíz de una app (según su BASE_PATH) los activos de marca de
// lib/brand/public: favicon, iconos de app/PWA, apple-touch-icon e imagen para
// redes. Opcionalmente agrega manifest.webmanifest. También inserta en el
// <head> los enlaces a esos archivos, con versión en la URL para que
// navegadores e iOS no sigan mostrando los íconos anteriores.
//
// Lo usan artifacts/estecapelli (app.clinivista.cl) y artifacts/homepage
// (clinivista.cl): los archivos viven una sola vez aquí.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
// Sube este valor cuando cambien los íconos (cache-busting).
export const BRAND_VERSION = "20261027";
const TYPES = { ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

/**
 * @param {{
 *   siteUrl?: string,            // origen público (para og:image absoluta)
 *   themeColor: string,
 *   manifest?: { name: string, shortName: string, description?: string, backgroundColor: string, themeColor: string },
 * }} options
 */
export function brandAssets(options) {
  let base = "/";
  const files = () => fs.readdirSync(PUBLIC).filter((name) => !name.startsWith("."));
  const v = (file) => `${base}${file}?v=${BRAND_VERSION}`;

  const manifestJson = () => {
    const m = options.manifest;
    return JSON.stringify({
      name: m.name,
      short_name: m.shortName,
      ...(m.description ? { description: m.description } : {}),
      lang: "es",
      start_url: base,
      scope: base,
      display: "standalone",
      background_color: m.backgroundColor,
      theme_color: m.themeColor,
      icons: [
        { src: v("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: v("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
        { src: v("icon-maskable-192.png"), sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: v("icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }, null, 2);
  };

  return {
    name: "clinivista-brand-assets",
    configResolved(config) { base = config.base.endsWith("/") ? config.base : `${config.base}/`; },

    // Desarrollo: servir los archivos desde lib/brand/public.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!url.startsWith(base)) return next();
        const name = url.slice(base.length);
        if (options.manifest && name === "manifest.webmanifest") {
          res.setHeader("Content-Type", TYPES[".webmanifest"]);
          res.end(manifestJson());
          return;
        }
        if (!files().includes(name)) return next();
        res.setHeader("Content-Type", TYPES[path.extname(name)] ?? "application/octet-stream");
        fs.createReadStream(path.join(PUBLIC, name)).pipe(res);
      });
    },

    // Build: copiar los archivos (y el manifest) a la raíz del sitio.
    generateBundle() {
      for (const name of files()) this.emitFile({ type: "asset", fileName: name, source: fs.readFileSync(path.join(PUBLIC, name)) });
      if (options.manifest) this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: manifestJson() });
    },

    // Enlaces del <head> (después del procesado de Vite, para que no los reescriba).
    transformIndexHtml: {
      order: "post",
      handler() {
        const og = options.siteUrl ? `${options.siteUrl.replace(/\/$/, "")}${v("clinivista-og.png")}` : v("clinivista-og.png");
        const tag = (tagName, attrs) => ({ tag: tagName, attrs, injectTo: "head" });
        return [
          tag("link", { rel: "icon", type: "image/svg+xml", href: v("favicon.svg") }),
          tag("link", { rel: "icon", type: "image/png", sizes: "32x32", href: v("favicon-32.png") }),
          tag("link", { rel: "icon", type: "image/png", sizes: "16x16", href: v("favicon-16.png") }),
          tag("link", { rel: "apple-touch-icon", sizes: "180x180", href: v("apple-touch-icon.png") }),
          ...(options.manifest ? [tag("link", { rel: "manifest", href: `${base}manifest.webmanifest` })] : []),
          tag("meta", { name: "theme-color", content: options.themeColor }),
          tag("meta", { property: "og:image", content: og }),
          tag("meta", { property: "og:image:width", content: "1200" }),
          tag("meta", { property: "og:image:height", content: "630" }),
          tag("meta", { name: "twitter:image", content: og }),
        ];
      },
    },
  };
}
