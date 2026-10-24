import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Status = { available: boolean; monthlyQuota: number; used: number; remaining: number; advancedEnabled: boolean; inputTokens: number; outputTokens: number };

/** Supra-control: cuota mensual de transcripciones de una clínica y si puede reintentar con el modelo avanzado. Solo español. */
export function CenterTranscription({ centerId }: { centerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["/api/director/centers", centerId, "transcription"];
  const url = `/api/director/centers/${encodeURIComponent(centerId)}/transcription`;
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as Status;
    },
  });
  const [quota, setQuota] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) { setQuota(String(data.monthlyQuota)); setAdvanced(data.advancedEnabled); }
  }, [data?.monthlyQuota, data?.advancedEnabled]);
  if (!data || typeof data.monthlyQuota !== "number") return null;

  const parsed = Number(quota);
  const valid = quota.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000;
  const dirty = valid && (parsed !== data.monthlyQuota || advanced !== data.advancedEnabled);

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyQuota: parsed, advancedEnabled: advanced }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? "");
      }
      queryClient.setQueryData(key, await response.json());
      toast({ title: "Transcripción actualizada" });
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos guardar", description: error instanceof Error && error.message ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-[#E8E4DE]" data-testid={`transcription-settings-${centerId}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><ScanText className="w-4 h-4" /> Transcripción de documentos</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label htmlFor={`transcription-quota-${centerId}`} className="text-sm text-muted-foreground">Cuota mensual:</label>
        <Input
          id={`transcription-quota-${centerId}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={100000}
          className="h-10 rounded-full w-28"
          value={quota}
          onChange={(event) => setQuota(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="h-4 w-4 accent-[#2A9D8F]" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
          Reintento con modelo avanzado (cuenta 2)
        </label>
        <Button variant="outline" className="rounded-full h-10 font-semibold" disabled={!dirty || busy} onClick={save}>
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Este mes: {data.used} de {data.monthlyQuota} usadas ({data.remaining} disponibles). Tokens enviados {data.inputTokens.toLocaleString("es-CL")} · recibidos {data.outputTokens.toLocaleString("es-CL")}.
        {!data.available && " Falta definir ANTHROPIC_API_KEY en el servidor: la transcripción automática está apagada."}
      </p>
    </div>
  );
}
