import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || "—";

type Props = {
  testId: string;
  menu: { open: boolean; label: string; onOpen: () => void; testId?: string };
  search: {
    value: string;
    placeholder: string;
    label: string;
    /** Escribir (submit = false) o Enter (submit = true). */
    onSearch: (value: string, submit: boolean) => void;
    show: boolean;
    /** En el celular el buscador va en una segunda fila. */
    showMobile: boolean;
  };
  bell: { count: number; label: string; onClick: () => void };
  account: { name: string; role: string; label: string; content: (close: () => void) => ReactNode };
};

/** Barra superior de los dashboards (clínica y supra-control): buscador, campana y menú de la cuenta. */
export function DashboardTopbar({ testId, menu, search, bell, account }: Props) {
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

  const searchField = (fieldTestId: string, className: string) => (
    <form role="search" className={`relative ${className}`} onSubmit={(event) => { event.preventDefault(); search.onSearch(search.value, true); }}>
      <Search className="w-[18px] h-[18px] absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={search.value}
        onChange={(event) => search.onSearch(event.target.value, false)}
        placeholder={search.placeholder}
        aria-label={search.label}
        className="w-full h-11 ps-11 pe-4 rounded-full bg-muted/70 border border-transparent text-[15px] text-foreground placeholder:text-muted-foreground transition-colors hover:bg-muted focus:bg-card focus:border-primary/40"
        data-testid={fieldTestId}
      />
    </form>
  );

  return (
    <header className="shrink-0 z-30 bg-card/95 backdrop-blur border-b border-border" data-testid={testId}>
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 h-16 md:h-[72px]">
        <button
          type="button"
          onClick={menu.onOpen}
          aria-label={menu.label}
          aria-expanded={menu.open}
          className="md:hidden w-11 h-11 shrink-0 rounded-xl text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          data-testid={menu.testId}
        >
          <Menu className="w-6 h-6" />
        </button>
        <BrandLogo className="md:hidden h-9 w-9" />
        {search.show ? searchField("topbar-search", "hidden md:block flex-1 max-w-md") : <span className="hidden md:block flex-1" />}
        <span className="flex-1 md:hidden" />

        <button
          type="button"
          onClick={bell.onClick}
          aria-label={bell.label}
          className="relative w-11 h-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors md:ms-auto"
          data-testid="topbar-bell"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {bell.count > 0 && (
            <span className="absolute top-1.5 end-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-card tabular-nums" aria-hidden="true" data-testid="topbar-unread">
              {bell.count > 99 ? "99+" : bell.count}
            </span>
          )}
        </button>

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label={`${account.label}: ${account.name}`}
            className="flex items-center gap-2.5 min-h-11 rounded-full sm:rounded-2xl ps-1 pe-1 sm:pe-3 py-1 hover:bg-muted transition-colors"
            data-testid="topbar-account"
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[hsl(var(--cd-teal))] text-sm font-bold text-white">
              {initialsOf(account.name)}
            </span>
            <span className="hidden sm:block min-w-0 text-start">
              <span className="block max-w-[11rem] truncate text-sm font-semibold text-foreground">{account.name}</span>
              <span className="block max-w-[11rem] truncate text-xs text-muted-foreground">{account.role}</span>
            </span>
            <ChevronDown className={`hidden sm:block w-4 h-4 text-muted-foreground transition-transform ${accountOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {accountOpen && (
            <div className="absolute end-0 top-full mt-2 w-64 rounded-2xl border border-border bg-popover shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150" data-testid="account-menu">
              <div className="px-4 py-3 border-b border-border sm:hidden">
                <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                <p className="text-xs text-muted-foreground truncate">{account.role}</p>
              </div>
              {account.content(() => setAccountOpen(false))}
            </div>
          )}
        </div>
      </div>
      {search.show && search.showMobile && <div className="md:hidden px-3 sm:px-6 pb-3">{searchField("topbar-search-mobile", "w-full")}</div>}
    </header>
  );
}
