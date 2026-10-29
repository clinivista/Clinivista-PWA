import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Loader2, MessageCircle, Share2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { INTEGRATIONS_TEXT, INTEGRATION_CATEGORIES, INTEGRATION_NAMES, type IntegrationCategory } from "@/lib/integrations-i18n";

type Catalog = { catalog: Array<{ id: string; category: string }>; requested: string[] };

const CATEGORY_ICON: Record<IntegrationCategory, LucideIcon> = { redes: Share2, agenda: CalendarDays, mensajeria: MessageCircle };
const KEY = ["/api/clinic/integrations"];

// «Integraciones disponibles» del panel de la clínica: catálogo de redes sociales, sistemas de agenda y mensajería.
// Todavía no se conecta ninguna; la clínica pide las que le interesan y supra-control ve la lista en su ficha.
export function IntegrationsPanel() {
  const { lang } = useLanguage();
  const x = INTEGRATIONS_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/integrations", { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as Catalog;
    },
  });

  const toggle = async (id: string, requested: boolean) => {
    setBusyId(id);
    const name = INTEGRATION_NAMES[id] ?? id;
    try {
      const response = await fetch(`/api/clinic/integrations/${encodeURIComponent(id)}/request`, { method: requested ? "DELETE" : "PUT", credentials: "include" });
      const body = (await response.json().catch(() => null)) as Catalog | null;
      if (!response.ok || !body) throw new Error();
      queryClient.setQueryData(KEY, body);
      toast({ title: requested ? x.toastCancelled(name) : x.toastRequested(name) });
    } catch {
      toast({ variant: "destructive", title: x.cantSave, description: x.tryAgain });
    } finally {
      setBusyId(null);
    }
  };

  const requested = new Set(data?.requested ?? []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="integrations-panel">
      <header className="bg-white border-b border-[#E8E4DE] p-4 sm:p-6 md:px-10 shrink-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{x.title}</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1 max-w-3xl">{x.intro}</p>
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col gap-6 max-w-4xl">
        {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {x.loading}</p>}
        {isError && <p role="alert" className="text-sm text-red-700">{x.loadError}</p>}
        {data && INTEGRATION_CATEGORIES.map((category) => {
          const items = data.catalog.filter((item) => item.category === category);
          if (items.length === 0) return null;
          const Icon = CATEGORY_ICON[category];
          return (
            <section key={category} aria-label={x.categories[category]} data-testid={`integrations-${category}`} className="flex flex-col gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Icon className="w-5 h-5" aria-hidden="true" /> {x.categories[category]}</h2>
                <p className="text-sm text-muted-foreground">{x.categoryHints[category]}</p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => {
                  const name = INTEGRATION_NAMES[item.id] ?? item.id;
                  const isRequested = requested.has(item.id);
                  const busy = busyId === item.id;
                  return (
                    <li key={item.id} data-testid={`integration-${item.id}`} className="flex flex-col gap-3 rounded-[1.5rem] bg-white shadow-sm p-5">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F2EE] text-base font-extrabold text-foreground">{name.charAt(0)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{name}</p>
                          <p className="text-xs font-semibold text-muted-foreground">{x.comingSoon}</p>
                        </div>
                        {isRequested && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800" data-testid={`integration-${item.id}-requested`}>
                            <Check className="w-3 h-3" aria-hidden="true" /> {x.requested}
                          </span>
                        )}
                      </div>
                      {isRequested && <p className="text-xs text-muted-foreground">{x.requestedNote}</p>}
                      <Button
                        variant={isRequested ? "outline" : "default"}
                        className="rounded-full h-10 font-bold"
                        disabled={busy}
                        aria-label={`${isRequested ? x.cancelRequest : x.request}: ${name}`}
                        onClick={() => void toggle(item.id, isRequested)}
                      >
                        {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                        {isRequested ? x.cancelRequest : x.request}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
