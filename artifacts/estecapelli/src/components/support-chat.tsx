import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ChatMessage = { id: string; sender: "staff" | "support"; body: string; createdAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "error");
  return data as T;
}

/**
 * Conversación en línea (consulta cada 5 s mientras está abierta).
 * `own` indica de qué lado está quien mira: "staff" (clínica) o "support" (supra-control).
 */
export function ChatThread({ listUrl, postUrl, own, labels, dir, onChanged }: {
  listUrl: string; postUrl: string; own: "staff" | "support"; dir?: "rtl" | "ltr"; onChanged?: () => void;
  labels: { you: string; team: string; empty: string; placeholder: string; send: string; sendError: string; loadError: string; hint: string; other?: string };
}) {
  const queryClient = useQueryClient();
  const key = ["support-thread", listUrl];
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: key, queryFn: () => api<{ messages: ChatMessage[] }>(`${listUrl}${listUrl.includes("?") ? "&" : "?"}markRead=1`),
    refetchInterval: 5000, refetchIntervalInBackground: false,
  });
  const messages = data?.messages ?? [];
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  useEffect(() => { onChanged?.(); }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      await api(postUrl, { method: "POST", body: JSON.stringify({ body }) });
      setText("");
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError((e as Error).message && (e as Error).message !== "error" ? (e as Error).message : labels.sendError);
    } finally { setSending(false); }
  };

  return (
    <div className="flex h-full min-h-[360px] flex-col rounded-3xl bg-white shadow-sm overflow-hidden" dir={dir}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6" data-testid="support-messages">
        {isLoading && <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {isError && <p className="py-8 text-center text-sm text-red-600">{labels.loadError}</p>}
        {!isLoading && !isError && messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{labels.empty}</p>}
        {messages.map((m) => {
          const mine = m.sender === own;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="mb-1 px-2 text-[11px] font-semibold text-muted-foreground">
                {mine ? labels.you : own === "staff" ? labels.team : (labels.other ?? "")} · {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </span>
              <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-[#00A9A5] text-white" : "bg-[#F5F2EE] text-foreground"}`}>{m.body}</p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-[#E8E4DE] p-3 md:p-4">
        {error && <p className="mb-2 text-sm font-semibold text-red-600" role="alert">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2} placeholder={labels.placeholder} aria-label={labels.placeholder}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-[#E8E4DE] bg-[#F5F2EE] px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A9A5]/40"
          />
          <Button type="button" onClick={() => void send()} disabled={sending || !text.trim()} className="h-12 rounded-full px-5 font-semibold" data-testid="support-send">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4 rtl:rotate-180" />{labels.send}</>}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{labels.hint}</p>
      </div>
    </div>
  );
}
