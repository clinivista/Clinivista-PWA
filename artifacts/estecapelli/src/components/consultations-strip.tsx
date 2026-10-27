import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { CONSULT_TEXT } from "@/lib/consult-types-i18n";
import { selectableTypes, useConsultTypes } from "@/lib/consult-types";
import { refreshLeadViews } from "@/lib/phases-i18n";

type Consultation = { id: string; typeName: string; status: string; createdAt: string; isMain: boolean };

/** Consultas de la ficha de un paciente (dermatología): cambiar de una a otra y agregar una nueva. */
export function ConsultationsStrip({ leadId, onOpen }: { leadId: string; onOpen: (leadId: string) => void }) {
  const { lang } = useLanguage();
  const c = CONSULT_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: consultData } = useConsultTypes();
  const types = selectableTypes(consultData);
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["lead-consultations", leadId],
    enabled: Boolean(consultData?.enabled),
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/consultations`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("consultations");
      return (await response.json()) as { currentId: string; consultations: Consultation[] };
    },
  });

  if (!consultData?.enabled || !data) return null;

  const add = async () => {
    const chosen = typeId || types.find((type) => type.isBase)?.id || "";
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/consultations`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultTypeId: chosen }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; lead?: { id: string } } | null;
      if (!response.ok || !body?.lead) { setError(body?.error ?? c.cantAddConsult); return; }
      toast({ title: c.consultAdded });
      await refreshLeadViews(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["lead-consultations"] });
      setOpen(false);
      setTypeId("");
      onOpen(body.lead.id);
    } catch {
      setError(c.cantAddConsult);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0 px-6 md:px-8 py-3 bg-white border-t border-[#E8E4DE]" data-testid="consultations-strip">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">{c.consultsTitle}</p>
      <div className="flex flex-wrap items-center gap-2">
        {data.consultations.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === data.currentId ? "true" : undefined}
            data-testid={`consultation-${item.id}`}
            onClick={() => item.id !== data.currentId && onOpen(item.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border ${item.id === data.currentId ? "bg-primary text-primary-foreground border-primary" : "bg-white border-[#E8E4DE] hover:bg-[#F5F2EE]"}`}
          >
            {item.typeName || c.generalConsult}
          </button>
        ))}
        <Button type="button" variant="outline" size="sm" className="rounded-full font-semibold" data-testid="add-consultation" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 me-1.5" />{c.addConsult}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{c.addConsult}</DialogTitle>
            <DialogDescription>{c.addConsultIntro}</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-semibold">{c.chooseType}
            <select
              value={typeId || types.find((type) => type.isBase)?.id || ""}
              onChange={(event) => setTypeId(event.target.value)}
              data-testid="consultation-type"
              className="mt-1 h-11 w-full rounded-2xl border border-input bg-background px-3 text-base"
            >
              {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => setOpen(false)}>{c.cancel}</Button>
            <Button type="button" className="rounded-full" disabled={busy} onClick={() => void add()} data-testid="consultation-add-confirm">
              {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{busy ? c.adding : c.addConsultBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
