import { useId } from "react";

/** Marca de Clinivista: visor fotográfico en verde y azul, con fondo transparente. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  const id = useId();
  const g = `${id}g`, b = `${id}b`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2fd39b" /><stop offset="1" stopColor="#10a37f" /></linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8df5" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
      </defs>
      <path d="M92 20H60A40 40 0 0 0 20 60V140A40 40 0 0 0 60 180H92" stroke={`url(#${g})`} strokeWidth="14" />
      <path d="M108 20H140A40 40 0 0 1 180 60V140A40 40 0 0 1 140 180H108" stroke={`url(#${b})`} strokeWidth="14" />
      <path d="M50 80V66q0-8 8-8H72M50 120v14q0 8 8 8H72" stroke={`url(#${g})`} strokeWidth="7" />
      <path d="M150 80V66q0-8-8-8H128M150 120v14q0 8-8 8H128" stroke={`url(#${b})`} strokeWidth="7" />
      <circle cx="100" cy="100" r="23" stroke={`url(#${g})`} strokeWidth="9" />
      <circle cx="100" cy="100" r="9" stroke={`url(#${b})`} strokeWidth="7" />
      <path d="M100 44v14M93 51h14" stroke="#14b8c4" strokeWidth="6" />
      {[30, 41, 52, 63].map((x) => <circle key={x} cx={x} cy="100" r="3" fill={`url(#${g})`} stroke="none" />)}
      {[137, 148, 159, 170].map((x) => <circle key={x} cx={x} cy="100" r="3" fill={`url(#${b})`} stroke="none" />)}
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
