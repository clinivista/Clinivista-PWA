import { useEffect, useMemo, useState } from "react";
import { BookOpen, Info, LifeBuoy, Lightbulb, Loader2, MessageCircle, Search, TriangleAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language";
import { HELP_TEXT, loadManual, type HelpBlock, type HelpManual, type HelpSection } from "@/lib/help-i18n";
import { ChatThread } from "@/components/support-chat";

const CALLOUT = {
  note: { icon: Info, cls: "bg-sky-50 text-sky-900 border-sky-200" },
  tip: { icon: Lightbulb, cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  warn: { icon: TriangleAlert, cls: "bg-amber-50 text-amber-900 border-amber-200" },
} as const;

function Block({ block }: { block: HelpBlock }) {
  switch (block.t) {
    case "p": return <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>;
    case "h3": return <h4 className="pt-2 text-sm font-bold text-foreground">{block.text}</h4>;
    case "note": case "tip": case "warn": {
      const { icon: Icon, cls } = CALLOUT[block.t];
      return <div className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm ${cls}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><p>{block.text}</p></div>;
    }
    case "ul": return <ul className="list-disc space-y-1 ps-5 text-sm">{block.items.map((i, n) => <li key={n}>{i}</li>)}</ul>;
    case "legend": return (
      <div>
        <ol className="space-y-2">
          {block.items.map((item, n) => (
            <li key={n} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00A9A5] text-xs font-bold text-white">{n + 1}</span><span className="pt-0.5">{item}</span></li>
          ))}
        </ol>
        {block.caption && <p className="mt-2 text-xs italic text-muted-foreground">{block.caption}</p>}
      </div>
    );
    case "table": return (
      <div className="overflow-x-auto rounded-2xl border border-[#E8E4DE]">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F2EE] text-start"><tr>{block.head.map((h, n) => <th key={n} className="px-3 py-2 text-start font-bold">{h}</th>)}</tr></thead>
          <tbody>{block.rows.map((r, i) => <tr key={i} className="border-t border-[#E8E4DE]">{r.map((c, n) => <td key={n} className={`px-3 py-2 align-top ${n === 0 ? "font-semibold" : ""}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
}

const sectionText = (s: HelpSection) => [s.title, ...s.blocks.flatMap((b) => "text" in b ? [b.text] : "items" in b ? b.items : "rows" in b ? [...b.head, ...b.rows.flat()] : [])].join(" ").toLowerCase();

function ManualView() {
  const { lang } = useLanguage();
  const h = HELP_TEXT[lang];
  const [manual, setManual] = useState<HelpManual | null>(null);
  const [part, setPart] = useState<"staff" | "patient">("staff");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { let alive = true; setManual(null); void loadManual(lang).then((m) => alive && setManual(m)); return () => { alive = false; }; }, [lang]);

  const sections = useMemo(() => {
    const all = manual?.[part] ?? [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((s) => sectionText(s).includes(q)) : all;
  }, [manual, part, query]);
  const current = sections.find((s) => s.id === selected) ?? sections[0];

  if (!manual) return <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{h.loading}</div>;
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]" dir={lang === "ar" ? "rtl" : "ltr"}>
      <aside className="space-y-3">
        <div className="flex gap-1 rounded-full bg-[#F5F2EE] p-1">
          {(["staff", "patient"] as const).map((p) => (
            <button key={p} type="button" onClick={() => { setPart(p); setSelected(null); }} data-testid={`help-part-${p}`}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors ${part === p ? "bg-white shadow-sm text-[#007f7c]" : "text-muted-foreground"}`}>
              {p === "staff" ? h.partStaff : h.partPatient}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={h.search} aria-label={h.search}
            className="h-10 w-full rounded-full border border-[#E8E4DE] bg-white ps-9 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9A5]/40" />
        </div>
        <nav aria-label={h.sections} className="hidden max-h-[60vh] space-y-1 overflow-y-auto md:block">
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelected(s.id)}
              className={`flex w-full gap-2 rounded-2xl px-3 py-2 text-start text-sm transition-colors ${current?.id === s.id ? "bg-[#00A9A5]/10 font-bold text-[#007f7c]" : "hover:bg-[#F5F2EE]"}`}>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">{s.id}</span><span>{s.title}</span>
            </button>
          ))}
        </nav>
        <select className="h-10 w-full rounded-full border border-[#E8E4DE] bg-white px-3 text-sm md:hidden" aria-label={h.sections} value={current?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}
        </select>
      </aside>
      <article className="min-h-[300px] rounded-3xl bg-white p-5 shadow-sm md:p-8" data-testid="help-article">
        {current ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight"><span className="me-2 text-[#00A9A5]">{current.id}</span>{current.title}</h3>
            {current.blocks.map((b, n) => <Block key={n} block={b} />)}
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">{h.noResults}</p>}
      </article>
    </div>
  );
}

export function HelpPanel({ initialTab = "manual" }: { initialTab?: "manual" | "support" }) {
  const { lang } = useLanguage();
  const h = HELP_TEXT[lang];
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"manual" | "support">(initialTab);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : undefined}>
      <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00A9A5]/10 text-[#00A9A5]"><LifeBuoy className="h-6 w-6" /></div>
            <div><h2 className="text-xl font-bold tracking-tight">{h.title}</h2><p className="text-sm text-muted-foreground">{h.subtitle}</p></div>
          </div>
          <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setTab("manual")} data-testid="help-tab-manual" className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === "manual" ? "bg-[#00A9A5] text-white" : "text-muted-foreground"}`}><BookOpen className="h-4 w-4" />{h.tabManual}</button>
            <button type="button" onClick={() => setTab("support")} data-testid="help-tab-support" className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === "support" ? "bg-[#00A9A5] text-white" : "text-muted-foreground"}`}><MessageCircle className="h-4 w-4" />{h.tabSupport}</button>
          </div>
        </div>
        {tab === "manual" ? <ManualView /> : (
          <div className="space-y-3">
            <div><h3 className="font-bold">{h.chatTitle}</h3><p className="text-sm text-muted-foreground">{h.chatIntro}</p></div>
            <div className="h-[60vh]">
              <ChatThread onChanged={() => void queryClient.invalidateQueries({ queryKey: ["support-unread"] })} listUrl="/api/support/messages" postUrl="/api/support/messages" own="staff" dir={lang === "ar" ? "rtl" : "ltr"}
                labels={{ you: h.you, team: h.team, empty: h.chatEmpty, placeholder: h.chatPlaceholder, send: h.send, sendError: h.sendError, loadError: h.loadError, hint: h.hint }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
