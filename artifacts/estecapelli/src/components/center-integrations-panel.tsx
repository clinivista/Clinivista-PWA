import { useQuery } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { INTEGRATION_NAMES } from "@/lib/integrations-i18n";

type Request = { integration: string; requestedByName: string; requestedByEmail: string; createdAt: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

/** Supra-control: integraciones que la clínica pidió desde «Integraciones disponibles». Solo español. */
export function CenterIntegrationsPanel({ centerId }: { centerId: string }) {
  const { data } = useQuery({
    queryKey: ["/api/director/centers", centerId, "integrations"],
    queryFn: async () => {
      const response = await fetch(`/api/director/centers/${encodeURIComponent(centerId)}/integrations`, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as { requests: Request[] };
    },
  });
  if (!data || !Array.isArray(data.requests)) return null;

  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-[#E8E4DE]" data-testid={`integrations-requested-${centerId}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Plug className="w-4 h-4" /> Integraciones solicitadas
        {data.requests.length > 0 && <span className="ms-2 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">{data.requests.length}</span>}
      </p>
      {data.requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">La clínica aún no ha pedido ninguna integración.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {data.requests.map((request) => (
            <li key={request.integration} data-testid={`requested-${request.integration}`}>
              <span className="font-bold">{INTEGRATION_NAMES[request.integration] ?? request.integration}</span>
              <span className="text-muted-foreground"> · {request.requestedByName || request.requestedByEmail || "—"} · {fmt(request.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
