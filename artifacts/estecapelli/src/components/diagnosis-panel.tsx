import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import {
  getGetLeadDiagnosisQueryKey,
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
import { useToast } from "@/hooks/use-toast";
import { PhotoAnnotator } from "@/components/photo-annotator";
import type { Stroke } from "@/lib/annotation";

const MAX_RESPONSE = 8000;
const ACTION_LABEL: Record<string, string> = { saved: "Guardó un borrador", closed: "Cerró el diagnóstico", reopened: "Reabrió el diagnóstico" };

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "";

// Fase de diagnóstico: el médico dibuja sobre las fotos que tomó el paciente
// (la original nunca se toca), escribe la respuesta y cierra el diagnóstico.
// Cerrado queda en solo lectura; se puede reabrir y queda registrado.
export function DiagnosisPanel({ leadId, onExpand }: { leadId: string; onExpand: (url: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetLeadDiagnosis(leadId);
  const save = useSaveLeadDiagnosis();
  const close = useCloseLeadDiagnosis();
  const reopen = useReopenLeadDiagnosis();
  const markup = useSaveLeadPhotoAnnotation();
  const removeMarkup = useDeleteLeadPhotoAnnotation();
  const [text, setText] = useState("");
  const [marking, setMarking] = useState<DiagnosisPhoto | null>(null);

  useEffect(() => {
    if (data) setText(data.responseText);
  }, [data?.responseText, data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (state: DiagnosisState) => {
    queryClient.setQueryData(getGetLeadDiagnosisQueryKey(leadId), state);
    void queryClient.invalidateQueries({ queryKey: getGetLeadPhasesQueryKey(leadId) });
  };
  const fail = (title: string) => (error: unknown) => {
    const detail = (error as { data?: { error?: string } | null }).data?.error;
    toast({ variant: "destructive", title, description: detail ?? "Inténtalo de nuevo." });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground mt-3">Cargando…</p>;
  if (isError || !data) return <p className="text-sm text-destructive mt-3">No pudimos cargar el diagnóstico.</p>;

  const closed = data.status === "closed";
  const editable = data.canEdit && !closed;
  const busy = save.isPending || close.isPending || reopen.isPending;
  const photoUrl = (photo: DiagnosisPhoto) => `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photo.photoId)}`;
  const shownUrl = (photo: DiagnosisPhoto) =>
    photo.hasAnnotation ? `${photoUrl(photo)}/annotation?v=${encodeURIComponent(photo.annotationUpdatedAt ?? "")}` : photoUrl(photo);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        {closed ? <Lock className="w-4 h-4 text-primary" /> : <Pencil className="w-4 h-4 text-muted-foreground" />}
        <span className="font-semibold">
          {closed ? `Cerrado${data.closedByName ? ` por ${data.closedByName}` : ""} · ${when(data.closedAt)}` : "En borrador"}
        </span>
      </div>

      {!data.readyToDiagnose && (
        <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-3">
          El paciente aún no completa su pre-evaluación; el diagnóstico se podrá cerrar cuando la termine.
        </p>
      )}
      {!data.canEdit && (
        <p className="text-sm text-muted-foreground">Solo el médico puede editar el diagnóstico. Aquí puedes verlo.</p>
      )}

      {data.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.photos.map((photo) => (
            <div key={photo.photoId} className="rounded-2xl bg-[#F5F2EE] overflow-hidden flex flex-col">
              <button type="button" onClick={() => onExpand(shownUrl(photo))} aria-label={`Ver ${photo.label}`}>
                <img src={shownUrl(photo)} alt={photo.label} className="w-full h-32 object-cover" />
              </button>
              <div className="p-2.5 flex flex-col gap-2">
                <span className="text-xs font-bold text-center text-muted-foreground break-words">
                  {photo.label}{photo.hasAnnotation && " · con dibujo"}
                </span>
                {photo.note && <p className="text-xs text-foreground whitespace-pre-wrap break-words">{photo.note}</p>}
                {editable && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs"
                      aria-label={`${photo.hasAnnotation ? "Editar dibujo de" : "Anotar"} ${photo.label}`}
                      onClick={() => setMarking(photo)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />{photo.hasAnnotation ? "Editar dibujo" : "Anotar"}
                    </Button>
                    {photo.hasAnnotation && (
                      <Button type="button" size="icon" variant="ghost" className="rounded-full h-8 w-8 text-destructive"
                        aria-label={`Quitar dibujo de ${photo.label}`}
                        onClick={() => {
                          if (!window.confirm(`¿Quitar el dibujo de «${photo.label}»? La foto original no se toca.`)) return;
                          removeMarkup.mutate({ id: leadId, photoId: photo.photoId }, {
                            onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetLeadDiagnosisQueryKey(leadId) }); },
                            onError: fail("No pudimos quitar el dibujo"),
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

      <div className="flex flex-col gap-2">
        <label htmlFor={`diagnosis-text-${leadId}`} className="text-sm font-semibold text-foreground">Respuesta para el paciente</label>
        <Textarea
          id={`diagnosis-text-${leadId}`}
          value={text}
          maxLength={MAX_RESPONSE}
          readOnly={!editable}
          rows={6}
          placeholder={editable ? "Escribe el diagnóstico y la recomendación del equipo médico." : ""}
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
                  onSuccess: (state) => { apply(state); toast({ title: "Borrador guardado" }); },
                  onError: fail("No pudimos guardar el borrador"),
                })}>
                {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar borrador"}
              </Button>
              <Button type="button" className="rounded-full font-bold" disabled={busy || !text.trim() || !data.readyToDiagnose}
                onClick={() => {
                  if (!window.confirm("Al cerrar el diagnóstico queda en solo lectura y se abre la fase siguiente. Podrás reabrirlo si hace falta. ¿Cerrar?")) return;
                  close.mutate({ id: leadId, data: { responseText: text } }, {
                    onSuccess: (state) => { apply(state); toast({ title: "Diagnóstico cerrado" }); },
                    onError: fail("No pudimos cerrar el diagnóstico"),
                  });
                }}>
                {close.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Cerrar diagnóstico</>}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" className="rounded-full" disabled={busy}
              onClick={() => {
                if (!window.confirm("Reabrir el diagnóstico permite editarlo y vuelve a bloquear las fases siguientes hasta cerrarlo de nuevo. Queda registrado. ¿Reabrir?")) return;
                reopen.mutate({ id: leadId }, {
                  onSuccess: (state) => { apply(state); toast({ title: "Diagnóstico reabierto" }); },
                  onError: fail("No pudimos reabrir el diagnóstico"),
                });
              }}>
              {reopen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Unlock className="w-4 h-4 mr-1.5" />Reabrir diagnóstico</>}
            </Button>
          )}
        </div>
      )}

      {data.events.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold">Registro ({data.events.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {[...data.events].reverse().map((event, index) => (
              <li key={`${event.createdAt}-${index}`}>
                {when(event.createdAt)} · {ACTION_LABEL[event.action] ?? event.action}{event.actorName ? ` · ${event.actorName}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {marking && (
        <PhotoAnnotator
          photoUrl={photoUrl(marking)}
          label={marking.label}
          initialStrokes={marking.strokes as Stroke[]}
          saving={markup.isPending}
          onClose={() => setMarking(null)}
          onSave={(strokes, image) => markup.mutate({ id: leadId, photoId: marking.photoId, data: { image, strokes } }, {
            onSuccess: (state) => { apply(state); setMarking(null); toast({ title: "Dibujo guardado" }); },
            onError: fail("No pudimos guardar el dibujo"),
          })}
        />
      )}
    </div>
  );
}
