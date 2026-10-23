import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ChevronDown, Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/components/support-chat";
import { Stars } from "@/components/support-tickets";

export const OPEN_SUPPORT_INBOX_EVENT = "clinivista:open-support-inbox";

type Status = "waiting" | "attending" | "resolved" | "closed";
type Ticket = {
  id: string; number: number; subject: string; status: Status; createdAt: string; lastActivityAt: string; closedAt: string | null;
  rating: number | null; ratingComment: string; attendants: { id: string; name: string }[];
  requesterName: string; requesterEmail: string; requesterPhone: string; centerName: string; lastMessage: string; lastSender: string; unread: number;
};
type Queue = { counts: { waiting: number; attending: number; resolved: number }; tickets: Ticket[] };

const STATUS = {
  waiting: { text: "En espera", cls: "bg-amber-100 text-amber-800" },
  attending: { text: "En atención", cls: "bg-sky-100 text-sky-800" },
  resolved: { text: "Resuelto · esperando valoración", cls: "bg-emerald-100 text-emerald-800" },
  closed: { text: "Cerrado", cls: "bg-slate-100 text-slate-600" },
} as const;

export function ago(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

const Badge = ({ status }: { status: Status }) => <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[status].cls}`}>{STATUS[status].text}</span>;

// Bandeja de soporte de supra-control: cola compartida de tickets (cualquiera puede atender) e historial valorado.
export function SupraInbox() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"open" | "history">("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      setOpen(true); setTab("open");
      const id = (event as CustomEvent<{ ticketId?: string }>).detail?.ticketId;
      if (id) setActiveId(id);
    };
    window.addEventListener(OPEN_SUPPORT_INBOX_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_INBOX_EVENT, onOpen);
  }, []);

  const { data } = useQuery({
    queryKey: ["support-queue", tab], refetchInterval: 8000, retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/support/queue?view=${tab}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("queue");
      return (await response.json()) as Queue;
    },
  });
  const tickets = data?.tickets ?? [];
  const counts = data?.counts ?? { waiting: 0, attending: 0, resolved: 0 };
  const unread = tab === "open" ? tickets.reduce((n, ticket) => n + ticket.unread, 0) : 0;
  const active = tickets.find((ticket) => ticket.id === activeId) ?? null;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["support-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["support-alerts"] });
  };

  const resolve = async () => {
    if (!active) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/support/queue/${active.id}/resolve`, { method: "POST", credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((body as { error?: string }).error ?? "No se pudo resolver el ticket.");
      setConfirming(false);
      refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section className="mb-6 rounded-3xl bg-white shadow-sm" data-testid="supra-inbox">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
        <span className="flex flex-wrap items-center gap-3 font-bold"><Headphones className="h-5 w-5 text-[#00A9A5]" />Soporte (tickets de las clínicas)
          {counts.waiting > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white" data-testid="inbox-waiting">{counts.waiting} en espera</span>}
          {counts.attending > 0 && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">{counts.attending} en atención</span>}
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white" data-testid="inbox-unread">{unread} sin leer</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-[#E8E4DE] p-4 md:p-6">
          {active ? (
            <div className="space-y-3">
              <button type="button" onClick={() => { setActiveId(null); setConfirming(false); refresh(); }} className="flex items-center gap-2 text-sm font-semibold text-[#007f7c]"><ArrowLeft className="h-4 w-4" />Volver a los tickets</button>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">Ticket #{active.number} · {active.subject}</h3><Badge status={active.status} />
              </div>
              <p className="text-sm"><b>{active.requesterName}</b> · {active.centerName} · <span className="text-muted-foreground">{active.requesterEmail}{active.requesterPhone ? ` · ${active.requesterPhone}` : ""}</span></p>
              <p className="text-xs text-muted-foreground" data-testid="ticket-attendants">
                {active.attendants.length > 0 ? `Atendido por: ${active.attendants.map((a) => a.name).join(", ")}` : "Aún nadie lo atiende: puedes tomarlo respondiendo."}
              </p>
              {active.status === "closed" && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">Valoración:</span>
                  {active.rating ? <Stars value={active.rating} label={(n) => `${n} de 5`} size="h-5 w-5" /> : <span className="text-muted-foreground">sin valoración</span>}
                  {active.ratingComment && <span className="text-muted-foreground">· “{active.ratingComment}”</span>}
                </div>
              )}
              <div className="h-[55vh]">
                <ChatThread own="support" onChanged={refresh} readOnly={active.status === "resolved" || active.status === "closed"}
                  listUrl={`/api/support/queue/${active.id}/messages`} postUrl={`/api/support/queue/${active.id}/messages`}
                  labels={{ you: "Tú (soporte)", team: "", other: active.requesterName, system: "Mensaje automático", empty: "Sin mensajes.", placeholder: "Escribe tu respuesta…", send: "Responder", sendError: "No se pudo enviar.", loadError: "No se pudo cargar.", hint: "Enter para enviar · Mayús+Enter para salto de línea" }} />
              </div>
              {(active.status === "waiting" || active.status === "attending") && (
                <div className="flex flex-wrap items-center gap-2">
                  {!confirming ? (
                    <Button type="button" variant="outline" className="rounded-full font-semibold" onClick={() => setConfirming(true)} data-testid="ticket-resolve"><CheckCircle2 className="mr-2 h-4 w-4" />Marcar como resuelto</Button>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">El usuario recibirá un aviso y deberá valorar la atención para cerrar el ticket.</span>
                      <Button type="button" className="rounded-full font-semibold" disabled={busy} onClick={() => void resolve()} data-testid="ticket-resolve-confirm">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sí, resolver</Button>
                      <Button type="button" variant="outline" className="rounded-full font-semibold" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</Button>
                    </>
                  )}
                  {error && <span className="text-sm font-semibold text-red-600" role="alert">{error}</span>}
                </div>
              )}
              {active.status === "resolved" && <p className="text-sm text-muted-foreground">Resuelto. Esperando que el usuario valore la atención para cerrarlo.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1 rounded-full bg-[#F5F2EE] p-1 w-fit">
                <button type="button" onClick={() => setTab("open")} data-testid="inbox-tab-open" className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === "open" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>Abiertos</button>
                <button type="button" onClick={() => setTab("history")} data-testid="inbox-tab-history" className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === "history" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>Historial</button>
              </div>
              {tickets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{tab === "open" ? "No hay tickets abiertos." : "Aún no hay tickets cerrados."}</p>
              ) : (
                <ul className="divide-y divide-[#E8E4DE]">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setActiveId(t.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#F5F2EE]/60" data-testid={`ticket-${t.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">#{t.number} · {t.subject} <span className="font-normal text-muted-foreground">· {t.requesterName} · {t.centerName}</span></p>
                          <p className="truncate text-sm text-muted-foreground">
                            {t.attendants.length > 0 ? `Atiende: ${t.attendants.map((a) => a.name).join(", ")} · ` : ""}{t.lastSender === "support" ? "Tú: " : ""}{t.lastMessage}
                          </p>
                        </div>
                        {tab === "history" && t.rating ? <Stars value={t.rating} label={(n) => `${n} de 5`} size="h-4 w-4" /> : <Badge status={t.status} />}
                        <span className="shrink-0 text-xs text-muted-foreground">{ago(tab === "history" ? t.closedAt ?? t.lastActivityAt : t.status === "waiting" ? t.createdAt : t.lastActivityAt)}</span>
                        {t.unread > 0 && <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{t.unread}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
