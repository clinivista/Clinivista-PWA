import { Check, LogOut } from "lucide-react";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";
import { HOME_TEXT } from "@/lib/home-i18n";
import { NAV_TEXT } from "@/lib/phases-i18n";
import { DashboardTopbar, initialsOf } from "@/components/dashboard/topbar";

export { initialsOf };

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

/** Barra superior del dashboard de clínica: buscador, avisos de soporte y menú de la cuenta (idioma y salir). */
export function ClinicTopbar({ userName, roleLabel, search, onSearch, showSearch, showMobileSearch, helpUnread, onOpenSupport, onLogout, onOpenMenu, menuOpen }: Props) {
  const { t, lang, setLang } = useLanguage();
  const text = HOME_TEXT[lang];
  return (
    <DashboardTopbar
      testId="clinic-topbar"
      menu={{ open: menuOpen, label: t.adminMenuOpen, onOpen: onOpenMenu }}
      search={{ value: search, placeholder: t.adminSearchPlaceholder, label: text.searchLabel, onSearch, show: showSearch, showMobile: showMobileSearch }}
      bell={{ count: helpUnread, label: text.notifications(helpUnread), onClick: onOpenSupport }}
      account={{
        name: userName,
        role: roleLabel,
        label: text.userMenu,
        content: (close) => (
          <>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{NAV_TEXT[lang].language}</p>
            <div className="max-h-60 overflow-y-auto pb-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={lang === l.code}
                  onClick={() => { setLang(l.code as LangCode); close(); }}
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
              onClick={() => { close(); onLogout(); }}
              className="w-full min-h-12 flex items-center gap-2.5 px-4 border-t border-border text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              {t.logout}
            </button>
          </>
        ),
      }}
    />
  );
}
