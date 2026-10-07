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

const MAX_PHASES = 12;
const MAX_VIEWS = 12;

type DraftView = { uid: string; id?: string; label: string; hasPhotos: boolean };
type DraftPhase = { uid: string; id?: string; name: string; patientCaptured: boolean; views: DraftView[] };

let counter = 0;
const nextUid = () => `n${++counter}`;

function toDraft(protocol: ClinicProtocol): DraftPhase[] {
  return protocol.phases.map((phase) => ({
    uid: phase.id,
    id: phase.id,
    name: phase.name,
    patientCaptured: phase.patientCaptured,
    views: phase.views.map((view) => ({ uid: view.id, id: view.id, label: view.label, hasPhotos: view.hasPhotos })),
  }));
}

const payload = (phases: DraftPhase[]) =>
  phases.map((phase) => ({
    ...(phase.id ? { id: phase.id } : {}),
    name: phase.name.trim(),
    views: phase.views.map((view) => ({ ...(view.id ? { id: view.id } : {}), label: view.label.trim() })),
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
  const { data, isLoading, isError } = useGetClinicProtocol();
  const save = useUpdateClinicProtocol();
  const [draft, setDraft] = useState<DraftPhase[] | null>(null);

  useEffect(() => {
    if (data && draft === null) setDraft(toDraft(data));
  }, [data, draft]);

  const canEdit = data?.canEdit === true;
  const dirty = useMemo(
    () => Boolean(data && draft && JSON.stringify(payload(draft)) !== JSON.stringify(payload(toDraft(data)))),
    [data, draft],
  );

  const updatePhase = (index: number, change: (phase: DraftPhase) => DraftPhase) =>
    setDraft((prev) => (prev ? prev.map((phase, i) => (i === index ? change(phase) : phase)) : prev));

  const handleSave = () => {
    if (!draft) return;
    save.mutate(
      { data: { phases: payload(draft) } },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetClinicProtocolQueryKey(), saved);
          setDraft(toDraft(saved));
          toast({ title: "Fases guardadas", description: "Los pacientes nuevos ya verán estas fotografías." });
        },
        onError: (error) => {
          const detail = (error as { data?: { error?: string } | null }).data?.error;
          toast({ variant: "destructive", title: "No pudimos guardar las fases", description: detail ?? "Inténtalo de nuevo." });
        },
      },
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <header className="bg-white border-b border-[#E8E4DE] p-4 sm:p-6 md:px-10 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Fases</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Define las fases de registro y seguimiento de tu clínica y las fotografías de cada una.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className="rounded-full h-12 px-5 font-bold flex-1 md:flex-none"
              disabled={!dirty || save.isPending}
              onClick={() => data && setDraft(toDraft(data))}
            >
              Descartar cambios
            </Button>
            <Button className="rounded-full h-12 px-6 font-bold flex-1 md:flex-none" disabled={!dirty || save.isPending} onClick={handleSave}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar fases"}
            </Button>
          </div>
        )}
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col gap-4 max-w-4xl">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {isError && <p className="text-sm text-destructive">No pudimos cargar las fases.</p>}
        {data && !canEdit && (
          <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-4">
            Solo el representante legal de la clínica puede cambiar las fases. Aquí puedes verlas.
          </p>
        )}
        {canEdit && (
          <p className="text-sm text-muted-foreground">
            Puedes cambiar la configuración cuando quieras: las fotografías que ya existen no se borran, solo dejan de pedirse.
            La primera fase es la pre-evaluación que el paciente toma desde el enlace de la clínica; las demás las registra el personal, en orden.
          </p>
        )}

        {draft?.map((phase, phaseIndex) => (
          <section key={phase.uid} className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-3" aria-label={`Fase ${phaseIndex + 1}`}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-extrabold flex items-center justify-center">
                {phaseIndex + 1}
              </span>
              <Input
                aria-label={`Nombre de la fase ${phaseIndex + 1}`}
                className="h-10 rounded-full bg-[#F5F2EE] font-bold min-w-0"
                value={phase.name}
                maxLength={60}
                disabled={!canEdit}
                onChange={(event) => updatePhase(phaseIndex, (p) => ({ ...p, name: event.target.value }))}
              />
              {canEdit && !phase.patientCaptured && (
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label="Subir fase" disabled={phaseIndex <= 1}
                    onClick={() => setDraft((prev) => (prev ? move(prev, phaseIndex, phaseIndex - 1) : prev))}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Bajar fase" disabled={phaseIndex >= draft.length - 1}
                    onClick={() => setDraft((prev) => (prev ? move(prev, phaseIndex, phaseIndex + 1) : prev))}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Eliminar fase ${phase.name || phaseIndex + 1}`} className="text-destructive"
                    onClick={() => {
                      const withPhotos = phase.views.some((view) => view.hasPhotos);
                      if (withPhotos && !window.confirm("Esta fase tiene fotografías guardadas. Se ocultará, pero las fotografías no se borran. ¿Continuar?")) return;
                      setDraft((prev) => (prev ? prev.filter((_, i) => i !== phaseIndex) : prev));
                    }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              {phase.patientCaptured ? "La toma el paciente desde el enlace de la clínica." : "La registra el personal de la clínica."}
              {" "}{phase.views.length} {phase.views.length === 1 ? "fotografía" : "fotografías"}.
            </p>

            <ul className="flex flex-col gap-2">
              {phase.views.map((view, viewIndex) => (
                <li key={view.uid} className="flex items-center gap-2">
                  <span className="shrink-0 w-6 text-xs text-muted-foreground text-right">{viewIndex + 1}</span>
                  <Input
                    aria-label={`Fotografía ${viewIndex + 1} de ${phase.name || `fase ${phaseIndex + 1}`}`}
                    className="h-9 rounded-full bg-[#F5F2EE] min-w-0"
                    value={view.label}
                    maxLength={60}
                    disabled={!canEdit}
                    onChange={(event) => updatePhase(phaseIndex, (p) => ({
                      ...p,
                      views: p.views.map((v, i) => (i === viewIndex ? { ...v, label: event.target.value } : v)),
                    }))}
                  />
                  {canEdit && (
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" aria-label="Subir fotografía" disabled={viewIndex === 0}
                        onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: move(p.views, viewIndex, viewIndex - 1) }))}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Bajar fotografía" disabled={viewIndex === phase.views.length - 1}
                        onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: move(p.views, viewIndex, viewIndex + 1) }))}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Quitar fotografía ${view.label || viewIndex + 1}`} className="text-destructive"
                        disabled={phase.views.length <= 1}
                        onClick={() => {
                          if (view.hasPhotos && !window.confirm("Esta fotografía ya tiene imágenes guardadas. Dejará de pedirse, pero las imágenes no se borran. ¿Continuar?")) return;
                          updatePhase(phaseIndex, (p) => ({ ...p, views: p.views.filter((_, i) => i !== viewIndex) }));
                        }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && phase.views.length < MAX_VIEWS && (
              <Button variant="outline" size="sm" className="self-start rounded-full"
                onClick={() => updatePhase(phaseIndex, (p) => ({ ...p, views: [...p.views, { uid: nextUid(), label: "", hasPhotos: false }] }))}>
                <Plus className="w-4 h-4 mr-1.5" /> Agregar fotografía
              </Button>
            )}
          </section>
        ))}

        {canEdit && draft && draft.length < MAX_PHASES && (
          <Button variant="outline" className="rounded-full h-12 font-bold self-start"
            onClick={() => setDraft((prev) => (prev ? [...prev, { uid: nextUid(), name: "", patientCaptured: false, views: [{ uid: nextUid(), label: "", hasPhotos: false }] }] : prev))}>
            <Plus className="w-4 h-4 mr-2" /> Agregar fase
          </Button>
        )}
      </div>
    </div>
  );
}
