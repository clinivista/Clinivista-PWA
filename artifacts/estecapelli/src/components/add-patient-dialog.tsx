import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { formatRut } from "@/lib/rut";
import { refreshLeadViews } from "@/lib/phases-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";

const EMPTY = { name: "", documentId: "", phone: "", email: "", city: "" };

/** El personal (médico o administrativo) registra a un paciente que atiende en la clínica. */
export function AddPatientDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (leadId: string) => void;
}) {
  const { lang } = useLanguage();
  const s = STAFF_FLOW_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [sendPortal, setSendPortal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: key === "documentId" ? formatRut(event.target.value) : event.target.value }));
  const canSave = consent && form.name.trim().length > 1 && form.documentId.trim().length > 3 && form.phone.trim().length > 5 && !busy;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDuplicateId(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language: lang, consentConfirmed: consent, sendPortalAccess: sendPortal && !!form.email.trim() }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; leadId?: string; lead?: { id: string } } | null;
      if (!response.ok || !body?.lead) {
        setError(body?.error ?? s.cantCreate);
        if (response.status === 409 && body?.leadId) setDuplicateId(body.leadId);
        return;
      }
      toast({ title: s.created, description: s.createdDesc });
      await refreshLeadViews(queryClient);
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setForm(EMPTY);
      setConsent(false);
      setSendPortal(false);
      onOpenChange(false);
      onCreated(body.lead.id);
    } catch {
      setError(s.cantCreate);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="rounded-3xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{s.addTitle}</DialogTitle>
          <DialogDescription>{s.addIntro}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">{s.fName}
            <Input value={form.name} onChange={set("name")} maxLength={100} autoComplete="off" className="mt-1 h-11 rounded-2xl" />
          </label>
          <label className="block text-sm font-semibold">{s.fRut}
            <Input value={form.documentId} onChange={set("documentId")} maxLength={14} autoComplete="off" inputMode="text" className="mt-1 h-11 rounded-2xl" />
          </label>
          <label className="block text-sm font-semibold">{s.fPhone}
            <Input value={form.phone} onChange={set("phone")} maxLength={30} type="tel" autoComplete="off" className="mt-1 h-11 rounded-2xl" />
          </label>
          <label className="block text-sm font-semibold">{s.fEmail}
            <Input value={form.email} onChange={set("email")} maxLength={120} type="email" autoComplete="off" className="mt-1 h-11 rounded-2xl" />
          </label>
          <label className="block text-sm font-semibold">{s.fCity}
            <Input value={form.city} onChange={set("city")} maxLength={80} autoComplete="off" className="mt-1 h-11 rounded-2xl" />
          </label>
          {form.email.trim() && (
            <div className="flex items-start gap-3">
              <Checkbox id="add-portal" checked={sendPortal} onCheckedChange={(value) => setSendPortal(value === true)} className="mt-0.5" />
              <label htmlFor="add-portal" className="text-sm">{s.sendPortal}</label>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-2xl bg-[#F5F2EE] p-3">
            <Checkbox id="add-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
            <label htmlFor="add-consent" className="text-sm">
              <span className="font-semibold">{s.consent}</span>
              <span className="block text-xs text-muted-foreground mt-1">{s.consentHelp}</span>
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}{" "}
              {duplicateId && (
                <button type="button" className="underline font-semibold" onClick={() => { onOpenChange(false); onCreated(duplicateId); }}>{s.openRecord}</button>
              )}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => onOpenChange(false)}>{s.cancel}</Button>
            <Button type="submit" className="rounded-full" disabled={!canSave}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{busy ? s.saving : s.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
