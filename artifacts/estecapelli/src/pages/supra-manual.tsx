import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { loadSupraManual, type HelpSection } from "@/lib/help-i18n";
import { Block, sectionText } from "@/pages/help-panel";

const DirectorBadge = () => <span className="ms-2 inline-flex items-center rounded-full bg-[#0B1F33] px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white" data-testid="director-only">Solo director</span>;

/** Manual del panel de supra-control (solo en español). */
export function SupraManual() {
  const [sections, setSections] = useState<HelpSection[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { let alive = true; void loadSupraManual().then((m) => alive && setSections(m)); return () => { alive = false; }; }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sections ?? []).filter((s) => !q || sectionText(s).includes(q));
  }, [sections, query]);
  const current = shown.find((s) => s.id === selected) ?? shown[0];

  if (!sections) return <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando…</div>;
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]" data-testid="supra-manual">
      <aside className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el manual…" aria-label="Buscar en el manual"
            className="h-10 w-full rounded-full border border-[#E8E4DE] bg-white ps-9 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9A5]/40" />
        </div>
        <nav aria-label="Secciones" className="hidden max-h-[60vh] space-y-1 overflow-y-auto md:block">
          {shown.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelected(s.id)} data-testid={`supra-manual-${s.key}`}
              className={`flex w-full gap-2 rounded-2xl px-3 py-2 text-start text-sm transition-colors ${current?.id === s.id ? "bg-[#00A9A5]/10 font-bold text-[#007f7c]" : "hover:bg-[#F5F2EE]"}`}>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">{s.id}</span><span>{s.title}{s.directorOnly && <DirectorBadge />}</span>
            </button>
          ))}
        </nav>
        <select className="h-10 w-full rounded-full border border-[#E8E4DE] bg-white px-3 text-sm md:hidden" aria-label="Secciones" value={current?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
          {shown.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}{s.directorOnly ? " (solo director)" : ""}</option>)}
        </select>
      </aside>
      <article className="min-h-[300px] rounded-3xl bg-white p-5 shadow-sm md:p-8" data-testid="supra-manual-article">
        {current ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight"><span className="me-2 text-[#00A9A5]">{current.id}</span>{current.title}{current.directorOnly && <DirectorBadge />}</h3>
            {current.blocks.map((b, n) => (
              <div key={n} className={b.directorOnly && !current.directorOnly ? "space-y-1" : undefined}>
                {b.directorOnly && !current.directorOnly && <DirectorBadge />}
                <Block block={b} />
              </div>
            ))}
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">No hay resultados.</p>}
      </article>
    </div>
  );
}
