interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
}

export function BrandLogo({ className = "", imageClassName = "", alt = "Clinivista" }: BrandLogoProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#050609] shadow-[0_0_18px_rgba(91,76,245,0.18)] ${className}`}>
      <img src="/clinivista-logo.png" alt={alt} className={`h-full w-full object-contain ${imageClassName}`} />
    </span>
  );
}