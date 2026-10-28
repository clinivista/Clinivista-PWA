import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Globe, Menu, X } from "lucide-react";
import { LANGS, type Copy, type LangCode } from "../i18n";
import { Logo } from "../Logo";

export type NavItem = { id: string; label: string };

/** Selector de idioma compacto (globo + código): un <select> nativo transparente encima, accesible. */
export function LangSelect({ lang, setLang, label, className = "" }: { lang: LangCode; setLang: (l: LangCode) => void; label: string; className?: string }) {
  return (
    <label className={`relative inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[#0A1F4D] hover:bg-[#EAF2FC] focus-within:ring-2 focus-within:ring-[#1D5FD8] ${className}`}>
      <Globe className="h-[18px] w-[18px]" aria-hidden="true" />
      <span aria-hidden="true">{lang.toUpperCase()}</span>
      <ChevronDown className="h-4 w-4" aria-hidden="true" />
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as LangCode)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}

export function Header({ t, lang, setLang, items, loginUrl }: { t: Copy; lang: LangCode; setLang: (l: LangCode) => void; items: NavItem[]; loginUrl: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(items[0]?.id ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sección visible: resalta su enlace (como «Inicio» en el diseño).
  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // Menú móvil: Escape lo cierra y devuelve el foco al botón; al abrir, el foco va al primer enlace.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, select, button")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const link = (item: NavItem, mobile = false) => (
    <a
      key={item.id}
      href={`#${item.id}`}
      onClick={() => setOpen(false)}
      aria-current={active === item.id ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-xl px-4 text-[15px] font-medium transition-colors ${mobile ? "w-full" : ""} ${active === item.id ? "bg-[#EAF2FC] text-[#1D5FD8]" : "text-[#0A1F4D] hover:bg-slate-100"}`}
    >
      {item.label}
    </a>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#inicio" className="shrink-0 rounded-lg" aria-label="Clinivista"><Logo size="lg" /></a>
        <nav className="hidden items-center gap-1 xl:flex" aria-label={t.menu}>{items.map((item) => link(item))}</nav>
        <div className="hidden items-center gap-2 md:flex">
          <LangSelect lang={lang} setLang={setLang} label={t.language} />
          <a href={loginUrl} className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-[#0A1F4D] hover:bg-slate-100">{t.login}</a>
          <a href="#contacto" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0B2D5B] px-5 text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-[#123b73]">
            {t.demo}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </a>
        </div>
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#0A1F4D] hover:bg-slate-100 xl:hidden"
          aria-label={open ? t.menuClose : t.menu}
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div id="menu-movil" ref={panelRef} className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg xl:hidden">
          <nav className="flex flex-col gap-1" aria-label={t.menu}>{items.map((item) => link(item, true))}</nav>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 md:hidden">
            <LangSelect lang={lang} setLang={setLang} label={t.language} />
            <a href={loginUrl} className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-[#0A1F4D] hover:bg-slate-100">{t.login}</a>
            <a href="#contacto" onClick={() => setOpen(false)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2D5B] px-5 text-[15px] font-semibold text-white">
              {t.demo}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
