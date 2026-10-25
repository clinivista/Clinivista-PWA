import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Loader2, Smartphone } from "lucide-react";
import type { LeadPhase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language";
import { refreshLeadViews } from "@/lib/phases-i18n";
import { CAPTURE_TEXT } from "@/lib/capture-i18n";

type Session = { token: string; path: string; expiresAt: string };

/**
 * «Continuar en el celular»: abre un enlace corto para UNA fase, lo muestra como QR y,
 * mientras está abierto, consulta las fotos cada pocos segundos para que aparezcan aquí
 * a medida que se toman en el celular.
 */
export function CaptureHandoff({ leadId, phase }: { leadId: string; phase: LeadPhase }) {
  const { lang } = useLanguage();
  const c = CAPTURE_TEXT[lang];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = useCallback(async () => {
    setBusy(true);
    setError("");
    setSession(null);
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/phases/${encodeURIComponent(phase.id)}/capture-session`, { method: "POST", credentials: "include" });
      const data = (await response.json().catch(() => ({}))) as Partial<Session> & { error?: string };
      if (!response.ok || !data.token || !data.path || !data.expiresAt) throw new Error(data.error ?? c.failed);
      setSession({ token: data.token, path: data.path, expiresAt: data.expiresAt });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.failed);
    } finally {
      setBusy(false);
    }
  }, [leadId, phase.id, c.failed]);

  const link = session ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}${session.path}` : "";

  useEffect(() => {
    if (!link) { setQr(""); return; }
    let cancelled = false;
    void QRCode.toDataURL(link, { margin: 1, width: 260 }).then((url) => { if (!cancelled) setQr(url); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [link]);

  // Mientras el enlace está abierto, las fotos del celular aparecen solas.
  useEffect(() => {
    if (!open || !session) return;
    const timer = window.setInterval(() => { void refreshLeadViews(queryClient); }, 3000);
    return () => window.clearInterval(timer);
  }, [open, session, queryClient]);

  const close = async () => {
    if (session) await fetch(`/api/capture/${encodeURIComponent(session.token)}/finish`, { method: "POST" }).catch(() => undefined);
    setOpen(false);
    setSession(null);
    void refreshLeadViews(queryClient);
  };

  const taken = phase.views.filter((view) => view.photo).length;
  const minutes = session ? Math.max(1, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 60_000)) : 0;

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" data-testid={`handoff-${phase.id}`}
        onClick={() => { setOpen(true); void create(); }}>
        <Smartphone className="w-3.5 h-3.5 mr-1.5" />{c.button}
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) void close(); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.scan}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />{c.creating}</p>}
            {error && <p role="alert" className="text-sm text-destructive text-center">{error}</p>}
            {session && qr && <img src={qr} alt={c.title} width={260} height={260} className="rounded-2xl border border-[#E8E4DE]" data-testid="handoff-qr" />}
            {session && (
              <>
                <p className="text-sm font-semibold" data-testid="handoff-progress">{c.progress(taken, phase.views.length)}</p>
                <p className="text-xs text-muted-foreground">{c.expires(minutes)}</p>
                <p className="text-xs text-muted-foreground text-center">{c.orLink}</p>
                <Button type="button" size="sm" variant="outline" className="rounded-full"
                  onClick={() => { void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => undefined); }}>
                  {copied ? c.copied : c.copyLink}
                </Button>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {(error || session) && <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={busy} onClick={() => void create()}>{c.newLink}</Button>}
              <Button type="button" size="sm" className="rounded-full" onClick={() => void close()}>{c.close}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
