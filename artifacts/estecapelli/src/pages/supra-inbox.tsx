import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Headphones } from "lucide-react";
import { ChatThread } from "@/components/support-chat";

type Thread = { userId: string; userName: string; userEmail: string; centerName: string; lastMessage: string; lastSender: "staff" | "support"; lastAt: string; unread: number };

// Bandeja de soporte del panel de supra-control: una conversación por usuario de clínica.
export function SupraInbox() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Thread | null>(null);
  const { data } = useQuery({
    queryKey: ["support-threads"], refetchInterval: 8000, retry: false,
    queryFn: async () => {
      const response = await fetch("/api/support/threads", { credentials: "same-origin" });
      if (!response.ok) throw new Error("threads");
      return (await response.json()) as { threads: Thread[]; unread: number };
    },
  });
  const threads = data?.threads ?? [];
  const unread = data?.unread ?? 0;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["support-threads"] });

  return (
    <section className="mb-6 rounded-3xl bg-white shadow-sm" data-testid="supra-inbox">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
        <span className="flex items-center gap-3 font-bold"><Headphones className="h-5 w-5 text-[#00A9A5]" />Soporte (chat con clínicas)
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white" data-testid="inbox-unread">{unread} sin leer</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-[#E8E4DE] p-4 md:p-6">
          {active ? (
            <div className="space-y-3">
              <button type="button" onClick={() => { setActive(null); refresh(); }} className="flex items-center gap-2 text-sm font-semibold text-[#007f7c]"><ArrowLeft className="h-4 w-4" />Volver a las conversaciones</button>
              <p className="text-sm"><b>{active.userName}</b> · {active.centerName} · <span className="text-muted-foreground">{active.userEmail}</span></p>
              <div className="h-[55vh]">
                <ChatThread own="support" onChanged={refresh}
                  listUrl={`/api/support/threads/${encodeURIComponent(active.userId)}/messages`} postUrl={`/api/support/threads/${encodeURIComponent(active.userId)}/messages`}
                  labels={{ you: "Tú (soporte)", team: "", other: active.userName, empty: "Sin mensajes.", placeholder: "Escribe tu respuesta…", send: "Responder", sendError: "No se pudo enviar.", loadError: "No se pudo cargar.", hint: "Enter para enviar · Mayús+Enter para salto de línea" }} />
              </div>
            </div>
          ) : threads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay conversaciones de soporte.</p>
          ) : (
            <ul className="divide-y divide-[#E8E4DE]">
              {threads.map((t) => (
                <li key={t.userId}>
                  <button type="button" onClick={() => setActive(t)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#F5F2EE]/60" data-testid={`thread-${t.userId}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{t.userName} <span className="font-normal text-muted-foreground">· {t.centerName}</span></p>
                      <p className="truncate text-sm text-muted-foreground">{t.lastSender === "support" ? "Tú: " : ""}{t.lastMessage}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(t.lastAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}</span>
                    {t.unread > 0 && <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{t.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
