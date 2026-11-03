import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PhotoConsentFlow, SignaturePad } from "@/components/photo-consent-card";
import { ConsentDocument } from "@/components/consent-document";
import { PHOTO_CONSENT_UI } from "@/lib/photo-consent-i18n";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { formatRut } from "@/lib/rut";
import { refreshLeadViews } from "@/lib/phases-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";
import { CONSULT_TEXT } from "@/lib/consult-types-i18n";
import { selectableTypes, useConsultTypes } from "@/lib/consult-types";

type ConsentWay = "" | "done" | "email" | "whatsapp" | "tablet";
type SignText = { language: string; clinicName: string; clinicLogo: string | null; title: string; intro: string; points: string[]; checkbox: string };
const EMPTY = { name: "", documentId: "", phone: "", email: "", city: "" };

/** El personal (médico o administrativo) registra a un paciente que atiende en la clínica. */
export function AddPatientDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (leadId: string) => void;
}) {
  const { lang } = useLanguage();
  const s = STAFF_FLOW_TEXT[lang];
  const c = CONSULT_TEXT[lang];
  const { data: consultData } = useConsultTypes();
  const types = selectableTypes(consultData);
  const [consultTypeId, setConsultTypeId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [way, setWay] = useState<ConsentWay>("");
  const [signing, setSigning] = useState(false);
  const [signText, setSignText] = useState<SignText | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [sendPortal, setSendPortal] = useState(false);
  const [next, setNext] = useState<null | { leadId: string; way: "email" | "whatsapp"; name: string; phone: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: key === "documentId" ? formatRut(event.target.value) : event.target.value }));
  const canSave = way !== "" && form.name.trim().length > 1 && form.documentId.trim().length > 3 && form.phone.trim().length > 5 && !busy;

  const resetAll = () => {
    setForm(EMPTY); setConsultTypeId(""); setWay(""); setSendPortal(false); setSigning(false); setSignText(null); setAccepted(false); setSignature(null);
  };

  // «Firmar en pantalla»: se muestra el documento (con el nombre y logo de la clínica) antes de guardar la ficha.
  const goSign = async () => {
    setError("");
    setSigning(true);
    try {
      const response = await fetch(`/api/clinic/photo-consent-text?lang=${lang}`, { credentials: "include" });
      if (!response.ok) throw new Error();
      setSignText((await response.json()) as SignText);
    } catch {
      setSigning(false);
      setError(s.cantCreate);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (way === "tablet" && !signing) { await goSign(); return; }
    if (way === "tablet" && (!accepted || !signature)) return;
    setBusy(true);
    setError("");
    setDuplicateId(null);
    try {
      const consentFields = way === "done" ? { consentConfirmed: true }
        : way === "tablet" ? { consentMode: "tablet", consentAccepted: true, consentSignature: signature }
          : { consentMode: "pending" };
      const response = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language: lang, ...consentFields, ...(types.length > 1 && consultTypeId ? { consultTypeId } : {}), sendPortalAccess: sendPortal && !!form.email.trim() }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; leadId?: string; lead?: { id: string } } | null;
      if (!response.ok || !body?.lead) {
        setError(body?.error ?? s.cantCreate);
        if (response.status === 409 && body?.leadId) { setDuplicateId(body.leadId); setSigning(false); }
        return;
      }
      toast({ title: s.created, description: s.createdDesc });
      await refreshLeadViews(queryClient);
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      const saved = form;
      const chosen = way;
      resetAll();
      if (chosen === "email" || chosen === "whatsapp") {
        // Segundo paso: la ficha ya está guardada; el consentimiento se envía al paciente.
        setNext({ leadId: body.lead.id, way: chosen, name: saved.name.trim(), phone: saved.phone.trim() });
        return;
      }
      onOpenChange(false);
      onCreated(body.lead.id);
    } catch {
      setError(s.cantCreate);
    } finally {
      setBusy(false);
    }
  };

  const finishNext = () => {
    const id = next?.leadId;
    setNext(null);
    onOpenChange(false);
    if (id) onCreated(id);
  };
  const ways: { id: Exclude<ConsentWay, "">; label: string; disabled?: boolean }[] = [
    { id: "done", label: s.consentDone },
    { id: "tablet", label: s.photoTablet },
    { id: "email", label: form.email.trim() ? s.photoEmail : s.photoEmailMissing, disabled: !form.email.trim() },
    { id: "whatsapp", label: s.photoWhatsapp },
  ];
  const pu = PHOTO_CONSENT_UI[lang];

  if (next) {
    return (
      <Dialog open={open} onOpenChange={(value) => { if (!value) finishNext(); }}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[92dvh] overflow-y-auto" data-testid="add-patient-photo-step">
          <p className="text-sm text-muted-foreground">{s.photoStep}</p>
          <PhotoConsentFlow leadId={next.leadId} patientName={next.name} phone={next.phone}
            mode="link" initialChannel={next.way}
            autoStart={next.way === "email"} onDone={finishNext} />
          <Button type="button" variant="ghost" className="rounded-full" onClick={finishNext}>{pu.close}</Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (signing) {
    return (
      <Dialog open={open} onOpenChange={(value) => { if (!busy && !value) { setSigning(false); onOpenChange(false); } }}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[92dvh] overflow-y-auto" data-testid="add-patient-sign-step">
          <DialogHeader><DialogTitle>{pu.tabTitle}</DialogTitle></DialogHeader>
          {signText && (
            <ConsentDocument lang={lang} clinicName={signText.clinicName} clinicLogo={signText.clinicLogo} patientName={form.name.trim()}
              title={signText.title} intro={signText.intro} points={signText.points}>
              <label className="flex items-start gap-3 rounded-2xl border p-3 cursor-pointer">
                <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} aria-label={signText.checkbox} />
                <span className="text-sm font-semibold">{signText.checkbox}</span>
              </label>
              <SignaturePad label={pu.tabSign} clear={pu.tabClear} onChange={setSignature} />
            </ConsentDocument>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => setSigning(false)}>{s.back}</Button>
            <Button type="button" className="rounded-full" disabled={busy || !signText || !accepted || !signature} onClick={(event) => void submit(event as unknown as React.FormEvent)}>
              {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{busy ? s.saving : s.signSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
          {types.length > 1 && (
            <label className="block text-sm font-semibold">{c.typeLabel}
              <select
                value={consultTypeId || types.find((type) => type.isBase)?.id || ""}
                onChange={(event) => setConsultTypeId(event.target.value)}
                data-testid="add-consult-type"
                className="mt-1 h-11 w-full rounded-2xl border border-input bg-background px-3 text-base"
              >
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </label>
          )}
          {form.email.trim() && (
            <div className="flex items-start gap-3">
              <Checkbox id="add-portal" checked={sendPortal} onCheckedChange={(value) => setSendPortal(value === true)} className="mt-0.5" />
              <label htmlFor="add-portal" className="text-sm">{s.sendPortal}</label>
            </div>
          )}
          <fieldset className="space-y-2 rounded-2xl border border-[#E8E4DE] bg-[#F5F2EE] p-3" data-testid="add-consent-way">
            <legend className="px-1 text-sm font-semibold">{s.consentGroup}</legend>
            <p className="text-xs text-muted-foreground">{s.consentGroupHelp}</p>
            {ways.map((item) => (
              <label key={item.id} className={`flex items-center gap-2 text-sm ${item.disabled ? "opacity-50" : ""}`}>
                <input type="radio" name="consent-way" value={item.id} checked={way === item.id} disabled={item.disabled} onChange={() => setWay(item.id)} />
                {item.label}
              </label>
            ))}
            {(way === "email" || way === "whatsapp") && <p className="text-xs font-semibold text-amber-800">{s.consentPendingNote}</p>}
            {way === "done" && <p className="text-xs text-muted-foreground">{s.consentHelp}</p>}
          </fieldset>
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
              {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{busy ? s.saving : way === "tablet" ? s.continueSign : s.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
