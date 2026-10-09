import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, FileText, Loader2, Lock, Mail, MessageCircle, Pencil, Trash2, Unlock } from "lucide-react";
import {
  getGetLeadDiagnosisQueryKey,
  getGetLeadResultsQueryKey,
  useDeliverLeadResults,
  useGetLeadResults,
  type ResultsDelivery,
  getGetLeadPhasesQueryKey,
  useCloseLeadDiagnosis,
  useDeleteLeadPhotoAnnotation,
  useGetLeadDiagnosis,
  useReopenLeadDiagnosis,
  useSaveLeadDiagnosis,
  useSaveLeadPhotoAnnotation,
  type DiagnosisPhoto,
  type DiagnosisState,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES, PHASES_TEXT, refreshLeadViews, viewLabel, type PhasesText } from "@/lib/phases-i18n";
import { useToast } from "@/hooks/use-toast";
import { PhotoAnnotator } from "@/components/photo-annotator";
import type { Stroke } from "@/lib/annotation";

const MAX_RESPONSE = 8000;
const NORWOOD_SCALES = ["I", "II", "IIA", "III", "III-V", "IIIA", "IV", "IVA", "V", "VA", "VI", "VII"];
const NORWOOD_INCONCLUSIVE = "No concluyente"; // stored value; shown translated

/** What the doctor records next to the edited photos: the Norwood scale (hair clinics) and comments. */
export type DiagnosisLeadData = {
  norwood: string | null | undefined;
  notes: string | null | undefined;
  showNorwood: boolean;
  onPatch: (data: { norwood?: string; notes?: string }) => void;
};

const actionLabel = (p: PhasesText, action: string) =>
  ({ saved: p.logSaved, closed: p.logClosed, reopened: p.logReopened } as Record<string, string>)[action] ?? action;
const channelLabel = (p: PhasesText, channel: string) => ({ email: p.channelEmail, whatsapp: p.channelWhatsapp } as Record<string, string>)[channel] ?? channel;
const deliveryLabel = (p: PhasesText, status: string) =>
  ({ sent: p.deliverySent, link: p.deliveryLink, failed: p.deliveryFailed } as Record<string, string>)[status] ?? status;

// Cierre del diagnóstico: el equipo envía el PDF al paciente por el canal que
// eligió (o el otro). Correo lo envía el servidor; WhatsApp abre el chat con el
// mensaje listo, sin pasar por la API de Meta.
function ResultsDelivery_({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const { lang } = useLanguage();
  const p = PHASES_TEXT[lang];
  const when = whenIn(lang);
  const queryClient = useQueryClient();
  const { data } = useGetLeadResults(leadId);
  const deliver = useDeliverLeadResults();
  const [last, setLast] = useState<ResultsDelivery | null>(null);
  if (!data) return null;
  const send = (channel: "email" | "whatsapp") =>
    deliver.mutate({ id: leadId, data: { channel } }, {
      onSuccess: (result) => {
        setLast(result);
        void queryClient.invalidateQueries({ queryKey: getGetLeadResultsQueryKey(leadId) });
        toast({ title: channel === "email" ? p.emailSentToast : p.whatsappReadyToast });
      },
      onError: (error) => {
        void queryClient.invalidateQueries({ queryKey: getGetLeadResultsQueryKey(leadId) });
        toast({ variant: "destructive", title: p.cantSendResults, description: (error as { data?: { error?: string } | null }).data?.error ?? p.tryAgain });
      },
    });
  const preferred = (channel: "email" | "whatsapp") => data.preferredChannel === channel;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4" data-testid="results-delivery">
      <p className="text-sm font-bold">{p.sendTitle}</p>
      <p className="text-xs text-muted-foreground">
        {p.sendIntro}
        {data.preferredChannel ? (data.preferredChannel === "email" ? p.chosenEmail : p.chosenWhatsapp) : p.noChoice}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-full" asChild>
          <a href={`/api/leads/${encodeURIComponent(leadId)}/results/pdf`} target="_blank" rel="noreferrer"><FileText className="w-4 h-4 mr-1.5" />{p.viewPdf}</a>
        </Button>
        <Button type="button" variant={preferred("email") ? "default" : "outline"} className="rounded-full" disabled={deliver.isPending || !data.email} onClick={() => send("email")}
          title={data.email ? undefined : p.noEmailTitle}>
          <Mail className="w-4 h-4 mr-1.5" />{p.sendEmail}
        </Button>
        <Button type="button" variant={preferred("whatsapp") ? "default" : "outline"} className="rounded-full" disabled={deliver.isPending || !data.phone} onClick={() => send("whatsapp")}>
          <MessageCircle className="w-4 h-4 mr-1.5" />{p.sendWhatsapp}
        </Button>
        {deliver.isPending && <Loader2 className="w-4 h-4 animate-spin self-center" />}
      </div>
      {!data.emailConfigured && <p className="text-xs text-amber-700">{p.emailNotConfigured}</p>}
      {last?.whatsappUrl && (
        <Button type="button" className="rounded-full self-start" asChild>
          <a href={last.whatsappUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1.5" />{p.openWhatsapp}</a>
        </Button>
      )}
      {data.deliveries.length > 0 && (
        <ul className="text-xs text-muted-foreground flex flex-col gap-1">
          {data.deliveries.map((delivery) => (
            <li key={delivery.id}>
              {when(delivery.createdAt)} · {channelLabel(p, delivery.channel)} → {delivery.recipient} · {deliveryLabel(p, delivery.status)}
              {delivery.createdByName ? ` · ${delivery.createdByName}` : ""}{delivery.error ? ` (${delivery.error})` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const whenIn = (lang: keyof typeof DATE_LOCALES) => (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(DATE_LOCALES[lang], { dateStyle: "medium", timeStyle: "short" }) : "";

// Fase de diagnóstico: el médico dibuja sobre las fotos que tomó el paciente
// (la original nunca se toca), escribe la respuesta y cierra el diagnóstico.
// Cerrado queda en solo lectura; se puede reabrir y queda registrado.
export function DiagnosisPanel({ leadId, onExpand, lead }: { leadId: string; onExpand: (url: string) => void; lead?: DiagnosisLeadData }) {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const p = PHASES_TEXT[lang];
  const when = whenIn(lang);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetLeadDiagnosis(leadId);
  const save = useSaveLeadDiagnosis();
  const close = useCloseLeadDiagnosis();
  const reopen = useReopenLeadDiagnosis();
  const markup = useSaveLeadPhotoAnnotation();
  const removeMarkup = useDeleteLeadPhotoAnnotation();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [marking, setMarking] = useState<DiagnosisPhoto | null>(null);

  useEffect(() => setNotes(lead?.notes ?? ""), [lead?.notes]);

  useEffect(() => {
    if (data) setText(data.responseText);
  }, [data?.responseText, data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (state: DiagnosisState) => {
    queryClient.setQueryData(getGetLeadDiagnosisQueryKey(leadId), state);
    void queryClient.invalidateQueries({ queryKey: getGetLeadPhasesQueryKey(leadId) });
    void refreshLeadViews(queryClient); // closing or reopening the diagnosis moves the patient to another status
  };
  const fail = (title: string) => (error: unknown) => {
    const detail = (error as { data?: { error?: string } | null }).data?.error;
    toast({ variant: "destructive", title, description: detail ?? p.tryAgain });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground mt-3">{p.loadingDiagnosis}</p>;
  if (isError || !data) return <p className="text-sm text-destructive mt-3">{p.diagnosisError}</p>;

  const closed = data.status === "closed";
  const editable = data.canEdit && !closed;
  const busy = save.isPending || close.isPending || reopen.isPending;
  const labelOf = (photo: DiagnosisPhoto) => viewLabel({ key: photo.viewKey, label: photo.label }, undefined, lang, t);
  const photoUrl = (photo: DiagnosisPhoto) => `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photo.photoId)}`;
  const shownUrl = (photo: DiagnosisPhoto) =>
    photo.hasAnnotation ? `${photoUrl(photo)}/annotation?v=${encodeURIComponent(photo.annotationUpdatedAt ?? "")}` : photoUrl(photo);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        {closed ? <Lock className="w-4 h-4 text-primary" /> : <Pencil className="w-4 h-4 text-muted-foreground" />}
        <span className="font-semibold">
          {closed ? p.closedBy(data.closedByName, when(data.closedAt)) : p.draft}
        </span>
      </div>

      {!data.readyToDiagnose && (
        <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-3">
          {p.notReady}
        </p>
      )}
      {!data.canEdit && (
        <p className="text-sm text-muted-foreground">{p.onlyDoctor}</p>
      )}

      {data.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.photos.map((photo) => (
            <div key={photo.photoId} className="rounded-2xl bg-[#F5F2EE] overflow-hidden flex flex-col">
              <button type="button" onClick={() => onExpand(shownUrl(photo))} aria-label={p.viewPhoto(labelOf(photo))}>
                <img src={shownUrl(photo)} alt={labelOf(photo)} className="w-full h-32 object-cover" />
              </button>
              <div className="p-2.5 flex flex-col gap-2">
                <span className="text-xs font-bold text-center text-muted-foreground break-words">
                  {labelOf(photo)}{photo.hasAnnotation && p.withDrawing}
                </span>
                {photo.note && <p className="text-xs text-foreground whitespace-pre-wrap break-words">{photo.note}</p>}
                {editable && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs"
                      aria-label={p.annotateAria(photo.hasAnnotation, labelOf(photo))}
                      onClick={() => setMarking(photo)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />{photo.hasAnnotation ? p.editDrawing : p.annotate}
                    </Button>
                    {photo.hasAnnotation && (
                      <Button type="button" size="icon" variant="ghost" className="rounded-full h-8 w-8 text-destructive"
                        aria-label={p.removeDrawingAria(labelOf(photo))}
                        onClick={() => {
                          if (!window.confirm(p.confirmRemoveDrawing(labelOf(photo)))) return;
                          removeMarkup.mutate({ id: leadId, photoId: photo.photoId }, {
                            onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetLeadDiagnosisQueryKey(leadId) }); },
                            onError: fail(p.cantRemoveDrawing),
                          });
                        }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lead && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
          {lead.showNorwood && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">{t.adminNorwood}</label>
              <Select value={lead.norwood || NORWOOD_INCONCLUSIVE} disabled={!editable} onValueChange={(value) => lead.onPatch({ norwood: value })}>
                <SelectTrigger className="h-11 bg-[#F5F2EE] rounded-2xl font-semibold border-[#E8E4DE]" aria-label={t.adminNorwood}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {NORWOOD_SCALES.map((scale) => <SelectItem key={scale} value={scale}>{scale}</SelectItem>)}
                  <SelectItem value={NORWOOD_INCONCLUSIVE}>{p.norwoodInconclusive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor={`diagnosis-notes-${leadId}`} className="text-sm font-semibold text-foreground">{t.adminNotesLabel}</label>
            <Textarea
              id={`diagnosis-notes-${leadId}`}
              value={notes}
              readOnly={!editable}
              rows={4}
              placeholder={editable ? t.adminNotesPlaceholder : ""}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => { if (editable && notes !== (lead.notes ?? "")) lead.onPatch({ notes }); }}
              className="rounded-2xl bg-[#F5F2EE]"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`diagnosis-text-${leadId}`} className="text-sm font-semibold text-foreground">{p.responseLabel}</label>
        <Textarea
          id={`diagnosis-text-${leadId}`}
          value={text}
          maxLength={MAX_RESPONSE}
          readOnly={!editable}
          rows={6}
          placeholder={editable ? p.responsePlaceholder : ""}
          onChange={(event) => setText(event.target.value)}
          className="rounded-2xl bg-[#F5F2EE]"
        />
        {editable && <span className="text-xs text-muted-foreground self-end">{text.length}/{MAX_RESPONSE}</span>}
      </div>

      {data.canEdit && (
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <>
              <Button type="button" variant="outline" className="rounded-full" disabled={busy || text === data.responseText}
                onClick={() => save.mutate({ id: leadId, data: { responseText: text } }, {
                  onSuccess: (state) => { apply(state); toast({ title: p.draftSaved }); },
                  onError: fail(p.cantSaveDraft),
                })}>
                {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : p.saveDraft}
              </Button>
              <Button type="button" className="rounded-full font-bold" disabled={busy || !text.trim() || !data.readyToDiagnose}
                onClick={() => {
                  if (!window.confirm(p.confirmClose)) return;
                  close.mutate({ id: leadId, data: { responseText: text } }, {
                    onSuccess: (state) => { apply(state); toast({ title: p.diagnosisClosed }); },
                    onError: fail(p.cantClose),
                  });
                }}>
                {close.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" />{p.closeDiagnosis}</>}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" className="rounded-full" disabled={busy}
              onClick={() => {
                if (!window.confirm(p.confirmReopen)) return;
                reopen.mutate({ id: leadId }, {
                  onSuccess: (state) => { apply(state); toast({ title: p.reopened }); },
                  onError: fail(p.cantReopen),
                });
              }}>
              {reopen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4 mr-1.5" />{p.reopen}</>}
            </Button>
          )}
        </div>
      )}

      {closed && <ResultsDelivery_ leadId={leadId} />}

      {data.events.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold">{p.log(data.events.length)}</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {[...data.events].reverse().map((event, index) => (
              <li key={`${event.createdAt}-${index}`}>
                {when(event.createdAt)} · {actionLabel(p, event.action)}{event.actorName ? ` · ${event.actorName}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {marking && (
        <PhotoAnnotator
          photoUrl={photoUrl(marking)}
          label={labelOf(marking)}
          initialStrokes={marking.strokes as Stroke[]}
          saving={markup.isPending}
          onClose={() => setMarking(null)}
          onSave={(strokes, image) => markup.mutate({ id: leadId, photoId: marking.photoId, data: { image, strokes } }, {
            onSuccess: (state) => { apply(state); setMarking(null); toast({ title: p.drawingSaved }); },
            onError: fail(p.cantSaveDrawing),
          })}
        />
      )}
    </div>
  );
}
