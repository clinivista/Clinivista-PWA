interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
}

// Marca en verde y azul con fondo transparente: se ve igual sobre fondos claros y oscuros.
export function BrandLogo({ className = "", imageClassName = "", alt = "Clinivista" }: BrandLogoProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <img src="/clinivista-logo.png" alt={alt} className={`h-full w-full object-contain ${imageClassName}`} />
    </span>
  );
}
