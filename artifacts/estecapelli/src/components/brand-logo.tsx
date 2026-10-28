import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import logo from "@workspace/brand/svg/clinivista-logo.svg";
import logoSinLema from "@workspace/brand/svg/clinivista-logo-sin-lema.svg";
import logoOscuro from "@workspace/brand/svg/clinivista-logo-oscuro.svg";
import logoOscuroSinLema from "@workspace/brand/svg/clinivista-logo-oscuro-sin-lema.svg";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
  /** «isotipo» (cuadrado, por defecto), logo horizontal con lema o sin lema. */
  variant?: "isotipo" | "logo" | "logo-sin-lema";
  /** Fondo sobre el que va: en «dark» el wordmark es claro (el menú azul marino, por ejemplo). */
  tone?: "light" | "dark";
}

// Proporciones de los SVG de lib/brand (evitan saltos de diseño mientras cargan).
const SIZE = { isotipo: [258, 292], logo: [934, 292] } as const;

/** Marca Clinivista «Clinical Premium» (SVG de lib/brand). La identidad propia de cada clínica es aparte. */
export function BrandLogo({ className = "", imageClassName = "", alt = "Clinivista", variant = "isotipo", tone = "light" }: BrandLogoProps) {
  const src = variant === "isotipo" ? isotipo
    : variant === "logo" ? (tone === "dark" ? logoOscuro : logo)
      : (tone === "dark" ? logoOscuroSinLema : logoSinLema);
  const [width, height] = variant === "isotipo" ? SIZE.isotipo : SIZE.logo;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        className={`${variant === "isotipo" ? "h-full w-full" : "h-full w-auto max-w-full"} object-contain ${imageClassName}`}
      />
    </span>
  );
}
