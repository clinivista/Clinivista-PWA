import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import {
  getGetClinicProtocolQueryKey,
  useGetClinicProtocol,
  useUpdateClinicProtocol,
  type ClinicProtocol,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ConsultTypesBar } from "./consult-types-bar";
import { useLanguage } from "@/lib/language";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import { PHASES_PANEL_TEXT, fillText } from "@/lib/phases-panel-i18n";
import { phaseName, viewLabel } from "@/lib/phases-i18n";
import type { AppTranslations, LangCode } from "@/lib/language";

const MAX_PHASES = 12;
const MAX_VIEWS = 12;

// rawLabel/rawName son los nombres guardados; label/name lo que se ve (traducido si es el nombre por defecto).
type DraftView = { uid: string; id?: string; rawLabel: string; shownLabel: string; label: string; hasPhotos: boolean; document: boolean; measure: boolean; video: boolean };
type DraftPhase = { uid: string; id?: string; rawName: string; shownName: string; name: string; patientCaptured: boolean; diagnosis?: boolean; views: DraftView[] };

let counter = 0;
const nextUid = () => `n${++counter}`;

function toDraft(protocol: ClinicProtocol, lang: LangCode, t: AppTranslations): DraftPhase[] {
  return protocol.phases.map((phase) => ({
    uid: phase.id,
    id: phase.id,
    rawName: phase.name,
    shownName: phaseName(phase, lang),
    name: phaseName(phase, lang),
    patientCaptured: phase.patientCaptured,
    diagnosis: phase.kind === "diagnosis",
    views: phase.views.map((view) => ({ uid: view.id, id: view.id, rawLabel: view.label, shownLabel: viewLabel(view, phase.key, lang, t), label: viewLabel(view, phase.key, lang, t), hasPhotos: view.hasPhotos, document: view.document, measure: view.measure, video: view.video === true })),
  }));
}

const payload = (phases: DraftPhase[]) =>
  phases.map((phase) => ({
    ...(phase.id ? { id: phase.id } : {}),
    // Un nombre por defecto que no se tocó se guarda tal como estaba, sin la traducción.
    name: (phase.name === phase.shownName ? phase.rawName : phase.name).trim(),
    // The diagnosis phase has no photo list: the doctor marks up the patient's photos.
    views: phase.diagnosis ? [] : phase.views.map((view) => ({ ...(view.id ? { id: view.id } : {}), label: (view.label === view.shownLabel ? view.rawLabel : view.label).trim(), document: view.document, measure: view.measure, video: view.video })),
  }));

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// "Fases" del panel de una clínica: el representante legal define cuántas
// fases tiene su proceso, cómo se llaman y qué fotografías pide cada una. La
// primera (pre-evaluación) la toma el paciente; las demás, el personal.
export function PhasesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeId, setTypeId] = useState("");
  const params = typeId ? { typeId } : undefined;
  const { data, isLoading, isError } = useGetClinicProtocol(params);
  const save = useUpdateClinicProtocol();
  const { lang, t } = useLanguage();
  const v = VIDEO_TEXT[lang];
  const x = PHASES_PANEL_TEXT[lang];
  // El servidor decide: la casilla solo refleja si el plan de la clínica incluye video.
  const videoEnabled = data?.features?.includes("video") === true;
  const [draft, setDraft] = useState<DraftPhase[] | null>(null);

  useEffect(() => { setDraft(null); }, [typeId, lang]);

  useEffect(() => {
    if (data && draft === null) setDraft(toDraft(data, lang, t));
  }, [data, draft, lang, t]);

  const canEdit = data?.canEdit === true;
  const dirty = useMemo(
    () => Boolean(data && draft && JSON.stringify(payload(draft)) !== JSON.stringify(payload(toDraft(data, lang, t)))),
    [data, draft, lang, t],
  );

  const updatePhase = (index: number, change: (phase: DraftPhase) => DraftPhase) =>
    setDraft((prev) => (prev ? prev.map((phase, i) => (i === index ? change(phase) : phase)) : prev));

  const handleSave = () => {
    if (!draft) return;
    save.mutate(
      { data: { phases: payload(draft) }, params },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetClinicProtocolQueryKey(params), saved);
          setDraft(toDraft(saved, lang, t));
          toast({ title: x.savedTitle, description: x.savedDesc });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: x.saveFailTitle, description: detail ?? x.tryAgain });
        },
      },
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="bg-white border-b border-[#E8E4DE] p-4 sm:p-6 md:px-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{x.title}</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {x.subtitle}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className="rounded-full h-12 px-5 font-bold flex-1 md:flex-none"
              disabled={!dirty || save.isPending}
              onClick={() => data && setDraft(toDraft(data, lang, t))}
            >
              {x.discard}
            </Button>
            <Button className="rounded-full h-12 px-6 font-bold flex-1 md:flex-none" disabled={!dirty || save.isPending} onClick={handleSave}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : x.saveBtn}
            </Button>
          </div>
        )}
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col gap-4 max-w-4xl">
        <ConsultTypesBar typeId={typeId} onSelect={setTypeId} />
        {isLoading && <p className="text-sm text-muted-foreground">{x.loading}</p>}
        {isError && <p className="text-sm text-destructive">{x.loadError}</p>}
        {data && !canEdit && (
          <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-4">
            {x.readOnly}
          </p>
        )}
        {canEdit && (
          <p className="text-sm text-muted-foreground">
            {x.intro}
            {" "}{v.phasesHint}
          </p>
        )}
        {data && !videoEnabled && draft?.some((phase) => phase.views.some((view) => view.video)) && (
          <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-4" role="status" data-testid="video-plan-lost">{v.lostPlanWarning}</p>
        )}

        {draft?.map((phase, phaseIndex) => (
          <section key={phase.uid} className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-3" aria-label={fillText(x.phaseAria, { n: phaseIndex + 1 })}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-extrabold flex items-center justify-center">
                {phaseIndex + 1}
              </span>
              <Input
                aria-label={fillText(x.phaseNameAria, { n: phaseIndex + 1 })}
                className="h-10 rounded-full bg-[#F5F2EE] font-bold min-w-0"
                value={phase.name}
                maxLength={60}
                disabled={!canEdit}
                onChange={(event) => updatePhase(phaseIndex, (p) => ({ ...p, name: event.target.value }))}
              />
              {canEdit && !phase.patientCaptured && (
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label={x.moveUpPhase} disabled={phaseIndex <= 1}
                    onClick={() => setDraft((prev) => (prev ? move(prev, phaseIndex, phaseIndex - 1) : prev))}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={x.moveDownPhase} disabled={phaseIndex >= draft.length - 1}
                    onClick={() => setDraft((prev) => (prev ? move(prev, phaseIndex, phaseIndex + 1) : prev))}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  {!phase.diagnosis && <Button variant="ghost" size="icon" aria-label={fillText(x.deletePhase, { name: phase.name || phaseIndex + 1 })} className="text-destructive"
                    onClick={() => {
                      const withPhotos = phase.views.some((view) => view.hasPhotos);
                      if (withPhotos && !window.confirm(x.confirmDeletePhase)) return;
                      setDraft((prev) => (prev ? prev.filter((_, i) => i !== phaseIndex) : prev));
                    }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              {phase.diagnosis
                ? x.diagnosisNote
                : <>
                  {phase.patientCaptured ? x.patientTakes : x.staffRecords}
                  {" "}{phase.views.length} {phase.views.length === 1 ? x.photoOne : x.photoMany}.
                </>}
            </p>

            {!phase.diagnosis && <ul className="flex flex-col gap-2">
              {phase.views.map((view, viewIndex) => (
                <li key={view.uid} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="shrink-0 w-6 text-xs text-muted-foreground text-end">{viewIndex + 1}</span>
                  <Input
                    aria-label={fillText(x.photoAria, { i: viewIndex + 1, name: phase.name || fillText(x.phaseFallback, { n: phaseIndex + 1 }) })}
                    className="h-9 rounded-full bg-[#F5F2EE] min-w-0"
                    value={view.label}
                    maxLength={60}
                    disabled={!canEdit}
                    onChange={(event) => updatePhase(phaseIndex, (p) => ({
                      ...p,
                      views: p.views.map((v, i) => (i === viewIndex ? { ...v, label: event.target.value } : v)),
                    }))}
                  />
                  <label className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground" title={x.docTitle}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2A9D8F]"
                      aria-label={fillText(x.docAria, { label: view.label || fillText(x.photoFallback, { i: viewIndex + 1 }) })}
                      checked={view.document}
                      disabled={!canEdit}
                      onChange={(event) => updatePhase(phaseIndex, (p) => ({
                        ...p,
                        views: p.views.map((v, i) => (i === viewIndex ? { ...v, document: event.target.checked, video: event.target.checked ? false : v.video } : v)),
                      }))}
                    />
                    {x.docLabel}
                  </label>
                  <label className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground" title={x.measureTitle}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2A9D8F]"
                      aria-label={fillText(x.measureAria, { label: view.label || fillText(x.photoFallback, { i: viewIndex + 1 }) })}
                      checked={view.measure}
                      disabled={!canEdit}
                      onChange={(event) => updatePhase(phaseIndex, (p) => ({
                        ...p,
                        views: p.views.map((v, i) => (i === viewIndex ? { ...v, measure: event.target.checked, video: event.target.checked ? false : v.video } : v)),
                      }))}
                    />
                    {x.measureLabel}
                  </label>
                  {(() => {
                    // Sin el plan solo se puede desmarcar una vista que ya era video, nunca marcar una nueva.
                    const locked = !canEdit || (!videoEnabled && !view.video);
                    return (
                      <label className={`shrink-0 flex items-center gap-1.5 text-xs font-medium ${locked && canEdit ? "text-muted-foreground/70" : "text-muted-foreground"}`} title={videoEnabled ? v.checkboxTitle : v.onlyTitanium}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#2A9D8F]"
                          aria-label={v.checkboxAria(view.label || `${viewIndex + 1}`)}
                          aria-describedby={!videoEnabled && canEdit ? `video-plan-${view.uid}` : undefined}
                          checked={view.video}
                          disabled={locked}
                          data-testid="video-checkbox"
                          onChange={(event) => updatePhase(phaseIndex, (p) => ({
                            ...p,
                            views: p.views.map((item, i) => (i === viewIndex
                              ? { ...item, video: event.target.checked, ...(event.target.checked ? { document: false, measure: false } : {}) }
                              : item)),
                          }))}
                        />
                        {v.checkbox}
                        {!videoEnabled && canEdit && <span id={`video-plan-${view.uid}`} className="text-[11px] text-muted-foreground/80">({v.onlyTitanium})</span>}
                      </label>
                    );
                  })()}
                  {canEdit && (
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" aria-label={x.moveUpPhoto} disabled={viewIndex === 0}
                        onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: move(p.views, viewIndex, viewIndex - 1) }))}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={x.moveDownPhoto} disabled={viewIndex === phase.views.length - 1}
                        onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: move(p.views, viewIndex, viewIndex + 1) }))}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={fillText(x.removePhoto, { label: view.label || viewIndex + 1 })} className="text-destructive"
                        disabled={phase.views.length <= 1}
                        onClick={() => {
                          if (view.hasPhotos && !window.confirm(x.confirmRemovePhoto)) return;
                          updatePhase(phaseIndex, (p) => ({ ...p, views: p.views.filter((_, i) => i !== viewIndex) }));
                        }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>}
            {canEdit && !phase.diagnosis && phase.views.length < MAX_VIEWS && (
              <Button variant="outline" size="sm" className="self-start rounded-full"
                onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: [...p.views, { uid: nextUid(), rawLabel: "", shownLabel: "", label: "", hasPhotos: false, document: false, measure: false, video: false }] }))}>
                <Plus className="w-4 h-4 me-1.5" /> {x.addPhoto}
              </Button>
            )}
          </section>
        ))}

        {canEdit && draft && draft.length < MAX_PHASES && (
          <Button variant="outline" className="rounded-full h-12 font-bold self-start"
            onClick={() => setDraft((prev) => (prev ? [...prev, { uid: nextUid(), rawName: "", shownName: "", name: "", patientCaptured: false, views: [{ uid: nextUid(), rawLabel: "", shownLabel: "", label: "", hasPhotos: false, document: false, measure: false, video: false }] }] : prev))}>
            <Plus className="w-4 h-4 me-2" /> {x.addPhase}
          </Button>
        )}
      </div>
    </div>
  );
}
