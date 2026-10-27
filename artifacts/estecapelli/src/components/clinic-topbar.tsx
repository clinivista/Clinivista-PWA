import { useEffect, useRef, useState } from "react";
import { Bell, Check, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";
import { BrandLogo } from "@/components/brand-logo";
import { HOME_TEXT } from "@/lib/home-i18n";
import { NAV_TEXT } from "@/lib/phases-i18n";

type Props = {
  userName: string;
  roleLabel: string;
  search: string;
  /** Escribir (o Enter) lleva a Pacientes con el filtro aplicado. */
  onSearch: (value: string, submit: boolean) => void;
  /** En Pacientes la búsqueda ya está en sus filtros: aquí no se repite. */
  showSearch: boolean;
  /** En el celular el buscador va en una segunda fila (solo en Inicio). */
  showMobileSearch: boolean;
  helpUnread: number;
  onOpenSupport: () => void;
  onLogout: () => void;
  onOpenMenu: () => void;
  menuOpen: boolean;
};

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || "—";

/** Barra superior del dashboard de clínica: buscador, avisos de soporte y menú de la cuenta. */
export function ClinicTopbar({ userName, roleLabel, search, onSearch, showSearch, showMobileSearch, helpUnread, onOpenSupport, onLogout, onOpenMenu, menuOpen }: Props) {
  const { t, lang, setLang } = useLanguage();
  const text = HOME_TEXT[lang];
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [accountOpen]);

  const searchField = (testId: string, className: string) => (
    <form role="search" className={`relative ${className}`} onSubmit={(event) => { event.preventDefault(); onSearch(search, true); }}>
      <Search className="w-[18px] h-[18px] absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={search}
        onChange={(event) => onSearch(event.target.value, false)}
        placeholder={t.adminSearchPlaceholder}
        aria-label={text.searchLabel}
        className="w-full h-11 ps-11 pe-4 rounded-full bg-muted/70 border border-transparent text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:bg-muted focus:bg-card focus:border-primary/40"
        data-testid={testId}
      />
    </form>
  );

  return (
    <header className="shrink-0 z-30 bg-card/95 backdrop-blur border-b border-border" data-testid="clinic-topbar">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 h-16 md:h-[72px]">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t.adminMenuOpen}
          aria-expanded={menuOpen}
          className="md:hidden w-11 h-11 shrink-0 rounded-xl text-foreground hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <BrandLogo className="md:hidden h-9 w-9" />
        {showSearch ? searchField("topbar-search", "hidden md:block flex-1 max-w-md") : <span className="hidden md:block flex-1" />}
        <span className="flex-1 md:hidden" />

        <button
          type="button"
          onClick={onOpenSupport}
          aria-label={text.notifications(helpUnread)}
          className="relative w-11 h-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors md:ms-auto"
          data-testid="topbar-bell"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {helpUnread > 0 && (
            <span className="absolute top-1.5 end-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-card tabular-nums" aria-hidden="true" data-testid="topbar-unread">
              {helpUnread > 99 ? "99+" : helpUnread}
            </span>
          )}
        </button>

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label={`${text.userMenu}: ${userName}`}
            className="flex items-center gap-2.5 min-h-11 rounded-full sm:rounded-2xl ps-1 pe-1 sm:pe-3 py-1 hover:bg-muted transition-colors"
            data-testid="topbar-account"
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[hsl(var(--cd-teal))] text-sm font-bold text-white">
              {initialsOf(userName)}
            </span>
            <span className="hidden sm:block min-w-0 text-start">
              <span className="block max-w-[11rem] truncate text-sm font-semibold text-foreground">{userName}</span>
              <span className="block max-w-[11rem] truncate text-xs text-muted-foreground">{roleLabel}</span>
            </span>
            <ChevronDown className={`hidden sm:block w-4 h-4 text-muted-foreground transition-transform ${accountOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {accountOpen && (
            <div className="absolute end-0 top-full mt-2 w-64 rounded-2xl border border-border bg-popover shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150" data-testid="account-menu">
              <div className="px-4 py-3 border-b border-border sm:hidden">
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
              </div>
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{NAV_TEXT[lang].language}</p>
              <div className="max-h-60 overflow-y-auto pb-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    lang={l.code}
                    aria-pressed={lang === l.code}
                    onClick={() => { setLang(l.code as LangCode); setAccountOpen(false); }}
                    className={`w-full min-h-11 flex items-center gap-2.5 px-4 text-sm text-start hover:bg-muted transition-colors ${lang === l.code ? "font-semibold text-primary" : "text-foreground"}`}
                  >
                    <span aria-hidden="true">{l.flag}</span>
                    <span>{l.name}</span>
                    {lang === l.code && <Check className="w-4 h-4 ms-auto" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setAccountOpen(false); onLogout(); }}
                className="w-full min-h-12 flex items-center gap-2.5 px-4 border-t border-border text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </div>
      {showSearch && showMobileSearch && <div className="md:hidden px-3 sm:px-6 pb-3">{searchField("topbar-search-mobile", "w-full")}</div>}
    </header>
  );
}
