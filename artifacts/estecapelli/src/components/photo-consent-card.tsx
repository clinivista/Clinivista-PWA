import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Copy, FileSignature, Link2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConsentDocument } from "@/components/consent-document";
import { LANGS, useLanguage, type LangCode } from "@/lib/language";
import { PHOTO_CONSENT_UI } from "@/lib/photo-consent-i18n";

type Consent = {
  id: string; method: "link" | "document" | "tablet"; status: "pending" | "granted" | "declined" | "revoked"; verifiedBy: string; textVersion: string;
  registeredByName: string; requestedByName: string; createdAt: string; grantedAt: string | null; revokedAt: string | null; revokeNote: string; hasFile: boolean; fileMime: string | null;
};
type Overview = { consents: Consent[]; hasEmail: boolean; email: string; language: string; currentVersion: string };
type ConsentText = { language: string; clinicName: string; clinicLogo: string | null; patientName: string; title: string; intro: string; points: string[]; checkbox: string };

const MAX_BYTES = 10 * 1024 * 1024;

/** Cuál es la autorización vigente: la última aceptada y no revocada; si no hay, la última pendiente. */
export function currentConsent(consents: Consent[]): Consent | null {
  return consents.find((item) => item.status === "granted") ?? consents.find((item) => item.status === "pending") ?? consents[0] ?? null;
}

export function SignaturePad({ onChange, label, clear }: { onChange: (dataUrl: string | null) => void; label: string; clear: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const touched = useRef(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width, y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height };
  };
  const context = () => canvas.current?.getContext?.("2d") ?? null;
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = context(); if (!ctx) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const { x, y } = point(event);
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#0A1F4D";
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = context(); if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y); ctx.stroke();
    touched.current = true;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (touched.current && canvas.current) onChange(canvas.current.toDataURL("image/png"));
  };
  const wipe = () => {
    const ctx = context(); const el = canvas.current;
    if (ctx && el) ctx.clearRect(0, 0, el.width, el.height);
    touched.current = false; onChange(null);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <canvas ref={canvas} width={600} height={220} data-testid="signature-pad" aria-label={label}
        className="w-full rounded-xl border-2 border-dashed border-border bg-white touch-none" style={{ touchAction: "none" }}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <Button type="button" variant="ghost" size="sm" onClick={wipe}>{clear}</Button>
    </div>
  );
}

export type ConsentMode = "link" | "doc" | "tablet";

/** Contenido de cada vía (enlace, documento firmado, firma en pantalla). Lo usan la ficha y «Agregar paciente». */
export function PhotoConsentFlow({ leadId, patientName, phone, mode, initialChannel, autoStart, onDone }: {
  leadId: string; patientName: string; phone?: string; mode: ConsentMode; initialChannel?: "email" | "whatsapp" | "link"; autoStart?: boolean; onDone: () => void;
}) {
  const { lang: appLang } = useLanguage();
  const x = PHOTO_CONSENT_UI[appLang];
  const queryClient = useQueryClient();
  const key = ["/api/leads", leadId, "photo-consent"];
  const base = `/api/leads/${encodeURIComponent(leadId)}/photo-consent`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "link">(initialChannel ?? "whatsapp");
  const [linkLang, setLinkLang] = useState<LangCode>(appLang);
  const [created, setCreated] = useState<null | { url: string; emailSent: boolean; emailError: string; whatsappText: string }>(null);
  const [copied, setCopied] = useState(false);
  const [docLabel, setDocLabel] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [text, setText] = useState<ConsentText | null>(null);
  const [tabLang, setTabLang] = useState<LangCode>(appLang);
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const started = useRef(false);

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(base, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as Overview;
    },
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

  useEffect(() => {
    if (!data) return;
    const initial = (LANGS.some((item) => item.code === data.language) ? data.language : "es") as LangCode;
    setLinkLang(initial); setTabLang(initial);
    if (!initialChannel) setChannel(data.hasEmail ? "email" : "whatsapp");
  }, [data?.language, data?.hasEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== "tablet") return;
    let cancelled = false;
    fetch(`${base}/text?lang=${tabLang}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: ConsentText | null) => { if (!cancelled && body) setText(body); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [mode, tabLang, base]);

  const createLink = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${base}/request`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, language: linkLang }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) { setError(body?.error ?? x.failed); return; }
      setCreated(body); refresh();
    } catch { setError(x.failed); } finally { setBusy(false); }
  };

  // «Agregar paciente» ya eligió la vía: el enlace se crea (y el correo se envía) sin pedir otro clic.
  useEffect(() => {
    if (autoStart && mode === "link" && data && !started.current) { started.current = true; void createLink(); }
  }, [autoStart, mode, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setError(x.failed); }
  };

  const saveDocument = async () => {
    if (!docFile) return;
    if (docFile.size > MAX_BYTES) { setError(x.docFile); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${base}/document`, {
        method: "POST", credentials: "include", body: docFile,
        headers: { "Content-Type": docFile.type || "application/pdf", "X-Document-Label": encodeURIComponent(docLabel) },
      });
      if (!response.ok) { setError(x.failed); return; }
      refresh(); onDone();
    } catch { setError(x.failed); } finally { setBusy(false); }
  };

  const saveTablet = async () => {
    if (!accepted) { setError(x.tabNeedAccept); return; }
    if (!signature) { setError(x.tabNeedSign); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${base}/tablet`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: tabLang, accepted: true, signature }) });
      if (!response.ok) { setError(x.failed); return; }
      refresh(); onDone();
    } catch { setError(x.failed); } finally { setBusy(false); }
  };

  const digits = (phone ?? "").trim().startsWith("+") ? (phone ?? "").replace(/\D/g, "") : "";
  const whatsappHref = created ? `https://wa.me/${digits}?text=${encodeURIComponent(created.whatsappText)}` : "#";
  if (!data) return null;

  return (
    <>
      {mode === "link" && (
        <>
          <DialogHeader><DialogTitle>{x.linkTitle}</DialogTitle></DialogHeader>
          {!created ? (
            <div className="space-y-3 text-sm">
              <label className="block text-xs font-semibold">{x.language}
                <select value={linkLang} onChange={(event) => setLinkLang(event.target.value as LangCode)} className="mt-1 h-10 w-full rounded-xl border bg-white px-3 text-sm">
                  {LANGS.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.name}</option>)}
                </select>
              </label>
              <fieldset className="space-y-2">
                <label className={`flex items-center gap-2 ${data.hasEmail ? "" : "opacity-50"}`}><input type="radio" name="channel" checked={channel === "email"} disabled={!data.hasEmail} onChange={() => setChannel("email")} />{data.hasEmail ? x.chEmail(data.email) : x.chNoEmail}</label>
                <label className="flex items-center gap-2"><input type="radio" name="channel" checked={channel === "whatsapp"} onChange={() => setChannel("whatsapp")} />{x.chWhatsapp}</label>
                <label className="flex items-center gap-2"><input type="radio" name="channel" checked={channel === "link"} onChange={() => setChannel("link")} />{x.chCopy}</label>
              </fieldset>
              <p className="text-xs text-muted-foreground">{x.linkValid}</p>
              {!data.hasEmail && <p className="text-xs text-amber-800">{x.weak}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="w-full rounded-full" disabled={busy} onClick={createLink}>{busy ? x.saving : x.create}</Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {channel === "email" && <p role="status" className={created.emailSent ? "text-emerald-700" : "text-destructive"}>{created.emailSent ? x.emailSent : (created.emailError || x.emailFailed)}</p>}
              <Input readOnly value={created.url} dir="ltr" aria-label={x.copyLink} onFocus={(event) => event.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => copy(created.url)}><Copy className="w-4 h-4 me-1.5" />{copied ? x.copied : x.copyLink}</Button>
                {channel === "whatsapp" && <Button asChild className="rounded-xl"><a href={whatsappHref} target="_blank" rel="noreferrer">{x.openWhatsapp}</a></Button>}
              </div>
              <p className="text-xs text-muted-foreground">{patientName} · {x.linkValid}</p>
              <Button variant="ghost" className="w-full" onClick={onDone}>{x.close}</Button>
            </div>
          )}
        </>
      )}
      {mode === "doc" && (
        <>
          <DialogHeader><DialogTitle>{x.docTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block text-xs font-semibold">{x.docLabel}
              <Input value={docLabel} maxLength={120} onChange={(event) => setDocLabel(event.target.value)} className="mt-1 rounded-xl" />
            </label>
            <label className="block text-xs font-semibold">{x.docFile}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-testid="consent-doc-file" className="mt-1 block w-full text-sm"
                onChange={(event) => setDocFile(event.target.files?.[0] ?? null)} />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full rounded-full" disabled={busy || !docFile} onClick={saveDocument}>{busy ? x.saving : x.docSave}</Button>
          </div>
        </>
      )}
      {mode === "tablet" && (
        <>
          <DialogHeader><DialogTitle>{x.tabTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <select aria-label={x.language} value={tabLang} onChange={(event) => setTabLang(event.target.value as LangCode)} className="h-10 w-full rounded-xl border bg-white px-3 text-sm">
              {LANGS.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.name}</option>)}
            </select>
            {text && (
              <div data-testid="tablet-text" dir={tabLang === "ar" ? "rtl" : "ltr"}>
                <ConsentDocument lang={tabLang} clinicName={text.clinicName} clinicLogo={text.clinicLogo} patientName={text.patientName || patientName}
                  title={text.title} intro={text.intro} points={text.points}>
                  <label className="flex items-start gap-3 rounded-2xl border p-3 cursor-pointer">
                    <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} aria-label={text.checkbox} />
                    <span className="text-sm font-semibold">{text.checkbox}</span>
                  </label>
                  <SignaturePad label={x.tabSign} clear={x.tabClear} onChange={setSignature} />
                </ConsentDocument>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full rounded-full" disabled={busy || !text} onClick={saveTablet}>{busy ? x.saving : x.tabSave}</Button>
          </div>
        </>
      )}
    </>
  );
}

// «Autorización para fotografías»: la clínica deja constancia de que el paciente autoriza las fotos clínicas,
// por enlace (con código al correo), con el documento firmado o con firma en pantalla.
export function PhotoConsentCard({ leadId, patientName, phone }: { leadId: string; patientName: string; phone?: string }) {
  const { lang: appLang } = useLanguage();
  const x = PHOTO_CONSENT_UI[appLang];
  const queryClient = useQueryClient();
  const key = ["/api/leads", leadId, "photo-consent"];
  const base = `/api/leads/${encodeURIComponent(leadId)}/photo-consent`;
  const [dialog, setDialog] = useState<null | ConsentMode>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data, isError } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(base, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as Overview;
    },
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });
  const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(appLang, { dateStyle: "medium" }) : "");

  const revoke = async (id: string) => {
    const note = window.prompt(x.revokeNote) ?? null;
    if (note === null) return;
    await fetch(`${base}/${encodeURIComponent(id)}/revoke`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    refresh();
  };

  if (isError || !data) return null;
  const current = currentConsent(data.consents);
  const label = !current ? x.none : current.status === "granted" ? x.granted : current.status === "pending" ? x.pending : current.status === "declined" ? x.rejected : x.revoked;
  const tone = current?.status === "granted" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60";
  const fileUrl = (id: string) => `${base}/${encodeURIComponent(id)}/file`;

  return (
    <section className={`mx-5 md:mx-8 my-3 rounded-2xl border p-4 text-sm space-y-3 ${tone}`} data-testid="photo-consent">
      <div>
        <h3 className="font-bold text-foreground flex items-center gap-2"><Camera className="w-4 h-4" />{x.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{x.subtitle}</p>
      </div>
      <p className="font-semibold" data-testid="photo-consent-status">{label}</p>
      {current && current.status === "granted" && (
        <p className="text-xs text-muted-foreground">
          {x.methods[current.method]} · {x.verified[current.verifiedBy as keyof typeof x.verified] ?? ""} · {x.registeredBy(current.registeredByName || current.requestedByName, dateOf(current.grantedAt))}
          {current.method === "link" && current.verifiedBy === "link" ? <span className="block font-semibold text-amber-800">{x.weak}</span> : null}
        </p>
      )}
      {current?.hasFile && <a className="text-xs text-primary underline" href={fileUrl(current.id)} target="_blank" rel="noreferrer">{x.viewFile}</a>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setDialog("link")}><Link2 className="w-3.5 h-3.5 me-1.5" />{x.actLink}</Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setDialog("doc")}><FileSignature className="w-3.5 h-3.5 me-1.5" />{x.actDoc}</Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setDialog("tablet")}><PenLine className="w-3.5 h-3.5 me-1.5" />{x.actTablet}</Button>
        {current?.status === "granted" && <Button size="sm" variant="ghost" className="rounded-xl text-red-700" onClick={() => revoke(current.id)}>{x.revoke}</Button>}
        {data.consents.length > 1 && <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowHistory((value) => !value)}>{x.history}</Button>}
      </div>
      {showHistory && (
        <ul className="space-y-1 text-xs" data-testid="photo-consent-history">
          {data.consents.map((item) => (
            <li key={item.id} className="rounded-lg bg-white p-2 border">
              {x.methods[item.method]} · {item.status === "granted" ? x.granted : item.status === "pending" ? x.pending : item.status === "declined" ? x.rejected : x.revoked} · {dateOf(item.grantedAt ?? item.createdAt)}
              {item.revokeNote ? ` · ${item.revokeNote}` : ""}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          {dialog && <PhotoConsentFlow key={dialog} leadId={leadId} patientName={patientName} phone={phone} mode={dialog} onDone={() => setDialog(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
