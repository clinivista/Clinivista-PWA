import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import logoSinLema from "@workspace/brand/svg/clinivista-logo-sin-lema.svg";

// Marca Clinivista «Clinical Premium»: los SVG viven en lib/brand (compartidos con la app).

/** Isotipo: C geométrica con la lente. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={isotipo} alt="" aria-hidden="true" width={258} height={292} className={`${className} object-contain`} />;
}

/** Logo horizontal (isotipo + «Clinivista»). */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center" dir="ltr">
      <img src={logoSinLema} alt="Clinivista" width={934} height={292} className={`${size === "lg" ? "h-12" : "h-10"} w-auto`} />
    </span>
  );
}
