import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language";
import { HELP_TEXT } from "@/lib/help-i18n";
import { SUPPORT_TICKET_TEXT } from "@/lib/support-i18n";
import { ChatThread } from "@/components/support-chat";

type Attendant = { id: string; name: string };
export type TicketSummary = {
  id: string; number: number; subject: string; status: "waiting" | "attending" | "resolved" | "closed";
  createdAt: string; closedAt: string | null; rating: number | null; ratingComment: string; attendants: Attendant[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "error");
  return data as T;
}

export function Stars({ value, onChange, label, size = "h-7 w-7" }: { value: number; onChange?: (n: number) => void; label: (n: number) => string; size?: string }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={label(value)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={label(n)} aria-pressed={value >= n} data-testid={`star-${n}`}
          className={onChange ? "transition-transform hover:scale-110" : "cursor-default"}>
          <Star className={`${size} ${value >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: TicketSummary["status"] }) {
  const { lang } = useLanguage();
  const t = SUPPORT_TICKET_TEXT[lang];
  const map = {
    waiting: { text: t.statusWaiting, cls: "bg-amber-100 text-amber-800" },
    attending: { text: t.statusAttending, cls: "bg-sky-100 text-sky-800" },
    resolved: { text: t.statusResolved, cls: "bg-emerald-100 text-emerald-800" },
    closed: { text: t.statusClosed, cls: "bg-slate-100 text-slate-600" },
  } as const;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${map[status].cls}`} data-testid="ticket-status">{map[status].text}</span>;
}

/**
 * Soporte con tickets (lado de la clínica): un ticket activo a la vez con inicio, desarrollo y cierre
 * (valoración); los cerrados quedan en el historial y el chat vuelve a estar limpio.
 */
export function SupportTickets({ onChanged }: { onChanged?: () => void }) {
  const { lang } = useLanguage();
  const t = SUPPORT_TICKET_TEXT[lang];
  const h = HELP_TEXT[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<TicketSummary | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["support-tickets"], refetchInterval: 8000, refetchIntervalInBackground: false,
    queryFn: () => api<{ active: TicketSummary | null; history: TicketSummary[] }>("/api/support/tickets"),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    onChanged?.();
  };
  const fail = (e: unknown) => setError((e as Error).message && (e as Error).message !== "error" ? (e as Error).message : t.openError);

  const labels = { you: h.you, team: h.team, empty: h.chatEmpty, placeholder: h.chatPlaceholder, send: h.send, sendError: h.sendError, loadError: h.loadError, hint: h.hint, system: t.system };
  const active = data?.active ?? null;

  const create = async () => {
    setBusy(true); setError(null);
    try {
      await api("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject: subject.trim(), body: message.trim(), language: lang }) });
      setSubject(""); setMessage("");
      await refresh();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const rate = async () => {
    if (!active || rating < 1) return;
    setBusy(true); setError(null);
    try {
      await api(`/api/support/tickets/${active.id}/rating`, { method: "POST", body: JSON.stringify({ rating, comment: comment.trim() }) });
      setRating(0); setComment("");
      await refresh();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const attendants = (ticket: TicketSummary) => ticket.attendants.length > 0 && (
    <p className="text-xs text-muted-foreground">{t.attendedBy}: {ticket.attendants.map((a) => a.name).join(", ")}</p>
  );

  if (isLoading) return <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  // Un ticket del historial: conversación completa en solo lectura.
  if (viewing) {
    return (
      <div className="space-y-3" dir={dir}>
        <button type="button" onClick={() => setViewing(null)} className="flex items-center gap-2 text-sm font-semibold text-[#007f7c]"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t.back}</button>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{t.ticket(viewing.number)} · {viewing.subject}</h3><StatusBadge status="closed" />
        </div>
        {attendants(viewing)}
        {viewing.rating ? <div className="flex items-center gap-2 text-sm"><span className="font-semibold">{t.yourRating}:</span><Stars value={viewing.rating} label={t.stars} size="h-5 w-5" />{viewing.ratingComment && <span className="text-muted-foreground">· {viewing.ratingComment}</span>}</div> : <p className="text-sm text-muted-foreground">{t.noRating}</p>}
        <div className="h-[55vh]">
          <ChatThread own="staff" readOnly dir={dir} listUrl={`/api/support/tickets/${viewing.id}/messages`} postUrl="" labels={labels} />
        </div>
        <p className="text-xs text-muted-foreground">{t.closedNote}</p>
      </div>
    );
  }

  if (active) {
    const resolved = active.status === "resolved";
    return (
      <div className="space-y-3" dir={dir}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{t.ticket(active.number)} · {active.subject}</h3><StatusBadge status={active.status} />
        </div>
        {attendants(active)}
        <div className="h-[60vh]">
          <ChatThread own="staff" dir={dir} readOnly={resolved} onChanged={() => void refresh()}
            listUrl={`/api/support/tickets/${active.id}/messages`} postUrl={`/api/support/tickets/${active.id}/messages`} labels={labels}
            footer={resolved ? (
              <div className="space-y-3" data-testid="ticket-rating">
                <p className="font-bold">{t.rateTitle}</p>
                <p className="text-xs text-muted-foreground">{t.rateHint}</p>
                <Stars value={rating} onChange={setRating} label={t.stars} />
                <Input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t.commentPh} aria-label={t.commentPh} className="h-11 rounded-2xl" />
                {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
                <Button type="button" disabled={busy || rating < 1} onClick={() => void rate()} className="rounded-full font-semibold" data-testid="ticket-rate-send">
                  {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t.rateSend}
                </Button>
              </div>
            ) : undefined} />
        </div>
      </div>
    );
  }

  // Sin ticket activo: el chat está limpio y listo para uno nuevo.
  const history = data?.history ?? [];
  return (
    <div className="space-y-5" dir={dir}>
      <div className="space-y-3 rounded-3xl bg-white p-4 shadow-sm md:p-6" data-testid="ticket-new">
        <div><h3 className="font-bold">{t.newTitle}</h3><p className="text-sm text-muted-foreground">{t.newIntro}</p></div>
        <label className="block text-sm font-semibold" htmlFor="ticket-subject">{t.subject}</label>
        <Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder={t.subjectPh} className="h-11 rounded-2xl" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} placeholder={t.messagePh} aria-label={t.messagePh}
          className="w-full resize-none rounded-2xl border border-[#E8E4DE] bg-[#F5F2EE] px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9A5]/40" />
        {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
        <Button type="button" disabled={busy || subject.trim().length < 3 || !message.trim()} onClick={() => void create()} className="rounded-full font-semibold" data-testid="ticket-create">
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{busy ? t.opening : t.open}
        </Button>
      </div>
      <div className="space-y-2" data-testid="ticket-history">
        <h3 className="font-bold">{t.historyTitle}</h3>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">{t.historyEmpty}</p> : (
          <ul className="divide-y divide-[#E8E4DE] rounded-3xl bg-white shadow-sm">
            {history.map((ticket) => (
              <li key={ticket.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{t.ticket(ticket.number)} · {ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ticket.closedAt ?? ticket.createdAt).toLocaleDateString()}</p>
                </div>
                {ticket.rating ? <Stars value={ticket.rating} label={t.stars} size="h-4 w-4" /> : null}
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setViewing(ticket)}>{t.view}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
