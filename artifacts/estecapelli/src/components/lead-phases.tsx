import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Loader2, Lock, Trash2, Upload } from "lucide-react";
import {
  useDeleteLeadPhasePhoto,
  useGetLeadPhases,
  type LeadPhase,
  type LeadPhaseView,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DiagnosisPanel, type DiagnosisLeadData } from "@/components/diagnosis-panel";
import { useLanguage } from "@/lib/language";
import { PHASES_TEXT, phaseName, refreshLeadViews, viewLabel } from "@/lib/phases-i18n";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 2400;

/** Phone cameras take big pictures: scale them down (JPEG) so they fit the 10 MB limit. */
async function prepareImage(file: File, tooBig: string): Promise<Blob> {
  if (file.size <= 2 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) return blob;
  } catch {
    /* fall through: send the original if it is small enough */
  }
  if (file.size > MAX_BYTES) throw new Error(tooBig);
  return file;
}

function ViewSlot({ leadId, phase, view, disabled, onExpand }: {
  leadId: string;
  phase: LeadPhase;
  view: LeadPhaseView;
  disabled: boolean;
  onExpand: (url: string) => void;
}) {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const p = PHASES_TEXT[lang];
  const label = viewLabel(view, phase.key, lang, t);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const remove = useDeleteLeadPhasePhoto();
  const photoUrl = view.photo ? `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(view.photo.id)}` : null;
  const refresh = () => refreshLeadViews(queryClient);

  const upload = async (file: File | undefined, source: "camera" | "upload", input: HTMLInputElement) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = await prepareImage(file, p.photoTooBig);
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/views/${encodeURIComponent(view.id)}/photo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": body.type || "image/jpeg", "x-photo-source": source },
        body,
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? p.cantSavePhoto);
      }
      await refresh();
    } catch (error) {
      toast({ variant: "destructive", title: p.photoNotSaved, description: error instanceof Error ? error.message : p.tryAgain });
    } finally {
      setBusy(false);
      input.value = "";
    }
  };

  return (
    <div className="rounded-2xl bg-[#F5F2EE] overflow-hidden flex flex-col">
      {photoUrl ? (
        <button type="button" onClick={() => onExpand(photoUrl)} aria-label={p.viewPhoto(label)}>
          <img src={photoUrl} alt={label} className="w-full h-32 object-cover" />
        </button>
      ) : (
        <div className="w-full h-32 flex items-center justify-center text-muted-foreground/50">
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-8 h-8" />}
        </div>
      )}
      <div className="p-2.5 flex flex-col gap-2">
        <span className="text-xs font-bold text-center text-muted-foreground break-words">
          {label}{!view.required && p.optional}
        </span>
        {!disabled && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            <input
              ref={cameraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              aria-label={p.takeAria(label)}
              onChange={(event) => upload(event.target.files?.[0], "camera", event.target)}
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label={p.chooseAria(label)}
              onChange={(event) => upload(event.target.files?.[0], "upload", event.target)}
            />
            <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" disabled={busy}
              onClick={() => cameraRef.current?.click()}>
              <Camera className="w-3.5 h-3.5 mr-1.5" />{view.photo ? p.repeat : p.takePhoto}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" disabled={busy}
              onClick={() => inputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />{p.upload}
            </Button>
            {view.photo && (
              <Button type="button" size="icon" variant="ghost" className="rounded-full h-8 w-8 text-destructive" disabled={busy || remove.isPending}
                aria-label={p.removeAria(label)}
                onClick={() => {
                  if (!view.photo || !window.confirm(p.confirmRemovePhoto(label))) return;
                  remove.mutate({ id: leadId, photoId: view.photo.id }, {
                    onSuccess: () => { void refresh(); },
                    onError: () => toast({ variant: "destructive", title: p.cantRemovePhoto }),
                  });
                }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      <span className="sr-only">{phaseName(phase, lang)}</span>
    </div>
  );
}

// El proceso del paciente fase por fase: la pre-evaluación la toma el paciente;
// las siguientes las registra el personal, en orden (cada una se abre al
// completar la anterior).
export function LeadPhases({ leadId, onExpand, diagnosisLead }: { leadId: string; onExpand: (url: string) => void; diagnosisLead?: DiagnosisLeadData }) {
  const { lang } = useLanguage();
  const p = PHASES_TEXT[lang];
  const { data, isLoading, isError } = useGetLeadPhases(leadId);
  const phases = data?.phases ?? [];

  return (
    <div className="bg-white p-6 rounded-[1.75rem] shadow-sm">
      <h3 className="text-lg font-extrabold text-foreground mb-1">{p.title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{p.subtitle}</p>
      {isLoading && <p className="text-sm text-muted-foreground">{p.loading}</p>}
      {isError && <p className="text-sm text-destructive">{p.loadError}</p>}
      <ol className="flex flex-col gap-4">
        {phases.map((phase, index) => {
          const taken = phase.views.filter((view) => view.photo).length;
          const previous = phases[index - 1];
          return (
            <li key={phase.id} className="rounded-2xl border border-[#E8E4DE] p-4" aria-label={p.phaseAria(index + 1, phaseName(phase, lang))}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">{index + 1}</span>
                <h4 className="font-bold text-foreground min-w-0 break-words">{phaseName(phase, lang)}</h4>
                <span className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  {phase.complete ? <CheckCircle2 className="w-4 h-4 text-primary" /> : !phase.enabled ? <Lock className="w-4 h-4" /> : null}
                  {phase.kind === "diagnosis" ? (phase.complete ? p.closed : p.open) : `${taken}/${phase.views.length}`}
                </span>
              </div>
              {phase.patientCaptured ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {p.patientTakes}{phase.complete ? p.patientDone : p.patientPending}
                </p>
              ) : !phase.enabled ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {p.opensAfter(previous ? phaseName(previous, lang) : "")}
                </p>
              ) : phase.kind === "diagnosis" ? (
                <DiagnosisPanel leadId={leadId} onExpand={onExpand} lead={diagnosisLead} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {phase.views.map((view) => (
                    <ViewSlot key={view.id} leadId={leadId} phase={phase} view={view} disabled={false} onExpand={onExpand} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
