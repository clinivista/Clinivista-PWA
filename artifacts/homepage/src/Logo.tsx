import { useId } from "react";

/** Marca de Clinivista: una "C" en degradé celeste-azul con un punto central. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6" y1="8" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1fc2ee" />
          <stop offset="1" stopColor="#1d56cc" />
        </linearGradient>
      </defs>
      <path d="M38.5 12.5A19 19 0 1 0 38.5 35.5" fill="none" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round" />
      <circle cx="26" cy="24" r="4.6" fill="#1d56cc" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <LogoMark className={size === "lg" ? "h-11 w-11" : "h-9 w-9"} />
      <span className={`font-extrabold tracking-tight text-[#0c2d6b] ${size === "lg" ? "text-3xl" : "text-2xl"}`}>Clinivista</span>
    </span>
  );
}
