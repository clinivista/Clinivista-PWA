import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fallbackSrc, srcSet, type SiteImage } from "../images";
import type { LangCode } from "../i18n";

/** Foto responsive (AVIF → WebP → JPEG). Diferida salvo la del hero. */
export function Photo({ img, lang, sizes, className = "", style, eager = false, decorative = false }: {
  img: SiteImage; lang: LangCode; sizes: string; className?: string; style?: CSSProperties; eager?: boolean; decorative?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(img, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(img, "webp")} sizes={sizes} />
      <img
        src={fallbackSrc(img)}
        alt={decorative ? "" : img.alt[lang]}
        width={img.width}
        height={img.height}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        fetchPriority={eager ? "high" : undefined}
        className={className}
        style={style}
      />
    </picture>
  );
}

/** Etiqueta discreta sobre imágenes de rostros, piel o antes/después. */
export function IllustrativeTag({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`pointer-events-none absolute rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white ${className}`}>
      {label}
    </span>
  );
}

/**
 * Comparador antes/después sobre un díptico (un archivo, panel izquierdo «antes»
 * y derecho «después»). Cada panel se muestra completo con object-position,
 * sin recortar ni deformar el archivo. El deslizador es un input range nativo
 * (teclado y lectores de pantalla). El eje no se invierte en árabe.
 */
export function CompareSlider({ img, lang, before, after, label, tag, sizes }: {
  img: SiteImage; lang: LangCode; before: string; after: string; label: string; tag: string; sizes: string;
}) {
  const [pos, setPos] = useState(50);
  // Cada capa mide el doble de ancho que el marco (3:4): así muestra un panel entero del díptico (3:2).
  const layer = "absolute inset-y-0 h-full w-[200%] max-w-none select-none";
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100" dir="ltr">
      <Photo img={img} lang={lang} sizes={sizes} className={layer} style={{ left: "-100%" }} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden="true">
        <Photo img={img} lang={lang} sizes={sizes} className={layer} style={{ left: 0 }} decorative />
      </div>
      <span className="pointer-events-none absolute start-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#0A1F4D]">{before}</span>
      <span className="pointer-events-none absolute end-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#0A1F4D]">{after}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(event) => setPos(Number(event.target.value))}
        aria-label={label}
        aria-valuetext={`${before} ${pos} % · ${after} ${100 - pos} %`}
        className="peer absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
      />
      <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(10,31,77,0.15)]" style={{ left: `${pos}%` }} aria-hidden="true" />
      <span
        className="pointer-events-none absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0A1F4D] shadow-lg ring-[#1D5FD8] peer-focus-visible:ring-4"
        style={{ left: `${pos}%` }}
        aria-hidden="true"
      >
        <ChevronLeft className="h-4 w-4" /><ChevronRight className="-ms-1 h-4 w-4" />
      </span>
      <IllustrativeTag label={tag} className="bottom-2 start-2" />
    </div>
  );
}
