import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPEN_SUPPORT_INBOX_EVENT, ago } from "@/pages/supra-inbox";

type AlertItem = { id: string; number: number; subject: string; createdAt: string; requesterName: string; centerName: string };
type Alerts = { waiting: number; items: AlertItem[] };

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch { /* sin audio disponible: el aviso visual basta */ }
}

/**
 * Aviso para los directores: tickets de soporte esperando atención. Banner destacado en el panel,
 * sonido y notificación del navegador (mientras la página esté abierta) cuando entra uno nuevo.
 */
export function SupportAlerts() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const seen = useRef<Set<string> | null>(null);
  const { data } = useQuery({
    queryKey: ["support-alerts"], refetchInterval: 8000, retry: false,
    queryFn: async () => {
      const response = await fetch("/api/support/alerts", { credentials: "same-origin" });
      if (!response.ok) throw new Error("alerts");
      return (await response.json()) as Alerts;
    },
  });
  const waiting = data?.waiting ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.items.map((item) => item.id));
    if (seen.current) {
      const fresh = data.items.filter((item) => !seen.current!.has(item.id));
      if (fresh.length > 0) {
        beep();
        if (permission === "granted") {
          const first = fresh[0]!;
          try {
            new Notification(fresh.length > 1 ? `${fresh.length} tickets nuevos en espera` : `Nuevo ticket #${first.number} en espera`, {
              body: fresh.length > 1 ? "Entra al panel de supra-control para atenderlos." : `${first.requesterName} · ${first.centerName}: ${first.subject}`,
              tag: "clinivista-support",
            });
          } catch { /* algunos navegadores móviles no permiten Notification() directo */ }
        }
      }
    }
    seen.current = ids;
  }, [data, permission]);

  useEffect(() => {
    const original = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = waiting > 0 ? `(${waiting}) ${original}` : original;
    return () => { document.title = original; };
  }, [waiting]);

  if (waiting === 0 && permission !== "default") return null;

  return (
    <div className="px-6 pt-4" data-testid="support-alerts">
      {waiting > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">
          <div className="flex flex-wrap items-center gap-3">
            <BellRing className="h-5 w-5 shrink-0 animate-pulse" />
            <p className="min-w-0 flex-1 font-bold" data-testid="support-alert-count">
              {waiting === 1 ? "1 ticket de soporte espera atención" : `${waiting} tickets de soporte esperan atención`}
            </p>
            <Button type="button" size="sm" className="rounded-full font-semibold" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_INBOX_EVENT, { detail: { ticketId: items[0]?.id } }))} data-testid="support-alert-open">
              Atender ahora
            </Button>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {items.slice(0, 3).map((item) => (
              <li key={item.id} className="truncate">#{item.number} · {item.subject} — {item.requesterName} ({item.centerName}) · {ago(item.createdAt)}</li>
            ))}
          </ul>
        </div>
      )}
      {permission === "default" && (
        <button type="button" onClick={() => void Notification.requestPermission().then(setPermission)}
          className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#007f7c]" data-testid="support-alert-enable">
          <Bell className="h-4 w-4" />Activar avisos del navegador para tickets nuevos
        </button>
      )}
    </div>
  );
}
