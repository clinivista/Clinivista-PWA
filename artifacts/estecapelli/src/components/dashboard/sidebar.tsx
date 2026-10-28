import type { ReactNode } from "react";
import { Link } from "wouter";
import { CircleHelp, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

// Menú lateral azul marino compartido por el dashboard de clínica y supra-control.

/** Botón del menú: el activo va en azul (texto blanco 5.2:1). */
export const navItemClass = (active: boolean) =>
  `relative w-full justify-start gap-3 rounded-xl h-12 [&_svg]:size-5 px-4 font-medium text-[15px] transition-colors hover:text-white ${active
    ? "bg-[#2563EB] text-white hover:bg-[#2563EB] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)]"
    : "bg-transparent text-white/75 hover:bg-white/10"}`;

/** Contenedor del menú: cajón en el celular, columna fija desde md. */
export const sidebarClass = (open: boolean) =>
  `cd-nav fixed inset-y-0 start-0 w-72 max-w-[85vw] z-50 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"} md:static md:translate-x-0 md:rtl:translate-x-0 md:max-w-none md:w-64 lg:w-[272px] md:z-30 bg-[hsl(var(--cd-nav))] bg-gradient-to-b from-[hsl(var(--cd-nav))] to-[hsl(212_70%_9%)] text-white flex-shrink-0 flex flex-col md:min-h-[100dvh] shadow-2xl md:shadow-none overflow-y-auto`;

export function SidebarOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="md:hidden fixed inset-0 bg-[hsl(var(--cd-nav)/0.6)] backdrop-blur-sm z-40" onClick={onClose} />;
}

/** Logo, nombre y subtítulo; en el celular, el botón para cerrar el menú. */
export function SidebarBrand({ tagline, closeLabel, onClose }: { tagline: string; closeLabel: string; onClose: () => void }) {
  return (
    <div className="px-5 pt-6 pb-5 flex items-center justify-between gap-3">
      <Link href="/" className="flex flex-col items-start gap-1.5 min-w-0 rounded-xl group">
        <BrandLogo variant="logo-sin-lema" tone="dark" className="h-10 group-hover:scale-[1.02] transition-transform origin-left" />
        <span className="block max-w-full text-[11px] text-white/70 truncate">{tagline}</span>
      </Link>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="md:hidden w-11 h-11 shrink-0 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/75 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export function SidebarSectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-1 text-[11px] font-semibold text-white/60 uppercase tracking-[0.14em] mb-2">{children}</p>;
}

/** Tarjeta de identidad del menú («Mi clínica», la cuenta del usuario): imagen o inicial, nombre y detalles. */
export function SidebarIdentityCard({ testId, image, initial, title, subtitle, badge, onClick, label }: {
  testId: string; image?: string | null; initial: string; title: string; subtitle?: ReactNode; badge?: ReactNode;
  /** Si se puede tocar (p. ej. abre «Mi cuenta»). */
  onClick?: () => void; label?: string;
}) {
  const body = (
    <>
      {image ? (
        <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1" />
      ) : (
        <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center text-lg font-bold">{initial}</span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-semibold break-words leading-snug">{title}</span>
        {subtitle && <span className="block text-xs text-white/70 mt-0.5">{subtitle}</span>}
        {badge}
      </span>
    </>
  );
  const shape = "flex items-center gap-3 rounded-2xl bg-white/[0.07] border border-white/10 p-3";
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={label} className={`w-full min-h-11 text-start hover:bg-white/[0.12] transition-colors ${shape}`} data-testid={testId}>{body}</button>
  ) : (
    <div className={shape} data-testid={testId}>{body}</div>
  );
}

export function SidebarBadge({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span className="mt-1.5 inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90 ring-1 ring-inset ring-white/15" data-testid={testId}>
      {children}
    </span>
  );
}

/** Tarjeta «¿Necesitas ayuda?» al pie del menú. */
export function SidebarHelpCard({ title, desc, onClick, testId }: { title: string; desc: string; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-11 flex items-center gap-3 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 p-3 text-start transition-colors"
      data-testid={testId}
    >
      <CircleHelp className="w-6 h-6 shrink-0 text-white/85" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-white/70">{desc}</span>
      </span>
    </button>
  );
}

/** Contador rojo junto a un ítem del menú (avisos de soporte, tickets en espera). */
export function NavCount({ count, testId }: { count: number; testId: string }) {
  if (count <= 0) return null;
  return <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white" data-testid={testId}>{count}</span>;
}
