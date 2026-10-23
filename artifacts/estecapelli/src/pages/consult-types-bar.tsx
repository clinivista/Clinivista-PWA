import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CONSULT_TYPES_KEY, useConsultTypes, type ConsultTypes } from "@/lib/consult-types";

async function send(url: string, method: "POST" | "PATCH", body: unknown): Promise<ConsultTypes & { id?: string }> {
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as ConsultTypes & { id?: string; error?: string };
  if (!response.ok) throw new Error(data.error ?? "No pudimos guardar el cambio.");
  return data;
}

// «Tipos de consulta» de un centro de dermatología: cada tipo tiene sus propias
// etapas y fotos (se editan debajo, en esta misma pantalla). Todo el personal los
// ve; solo el representante legal los activa, crea, renombra o desactiva.
export function ConsultTypesBar({ typeId, onSelect }: { typeId: string; onSelect: (id: string) => void }) {
  const { data } = useConsultTypes();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);

  if (!data?.enabled) return null;
  const base = data.types.find((type) => type.isBase);
  const current = data.types.find((type) => type.id === (typeId || base?.id)) ?? base;
  const canEdit = data.canEdit;

  const run = async (action: () => Promise<ConsultTypes & { id?: string }>, success: string, select?: boolean) => {
    setBusy(true);
    try {
      const next = await action();
      queryClient.setQueryData(CONSULT_TYPES_KEY, { enabled: next.enabled, canEdit: next.canEdit, types: next.types, templates: next.templates });
      toast({ title: success });
      if (select && next.id) onSelect(next.id);
    } catch (error) {
      toast({ variant: "destructive", title: "No pudimos guardar el cambio", description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-3" aria-label="Tipos de consulta" data-testid="consult-types-bar">
      <div>
        <h2 className="text-base font-extrabold text-foreground">Tipos de consulta</h2>
        <p className="text-sm text-muted-foreground">
          Cada tipo tiene sus propias etapas y fotografías. Al agregar un paciente, el personal elige el tipo de consulta.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipos de consulta de la clínica">
        {data.types.map((type) => {
          const selected = type.id === current?.id;
          return (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`consult-type-${type.id}`}
              onClick={() => onSelect(type.isBase ? "" : type.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-white border-[#E8E4DE] hover:bg-[#F5F2EE]"} ${type.active ? "" : "opacity-60"}`}
            >
              {type.name}{type.active ? "" : " (desactivado)"}
            </button>
          );
        })}
      </div>

      {canEdit && current && !current.isBase && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#F5F2EE] p-3">
          {renaming !== null ? (
            <>
              <Input aria-label="Nuevo nombre del tipo" className="h-9 rounded-full max-w-xs" value={renaming} maxLength={60} onChange={(event) => setRenaming(event.target.value)} />
              <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void run(() => send(`/api/clinic/consult-types/${encodeURIComponent(current.id)}`, "PATCH", { name: renaming }), "Nombre actualizado").then(() => setRenaming(null))}>Guardar nombre</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRenaming(null)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRenaming(current.name)}>Cambiar nombre</Button>
              <Button size="sm" variant="outline" className="rounded-full" disabled={busy} data-testid="toggle-consult-type"
                onClick={() => void run(() => send(`/api/clinic/consult-types/${encodeURIComponent(current.id)}`, "PATCH", { active: !current.active }), current.active ? "Tipo desactivado" : "Tipo activado")}>
                {current.active ? "Desactivar" : "Activar"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {current.active ? "Desactivarlo solo evita elegirlo para pacientes nuevos; los pacientes que ya lo tienen no cambian." : "No se puede elegir para pacientes nuevos."}
              </span>
            </>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 border-t border-[#E8E4DE] pt-3">
          {data.templates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Activar una plantilla:</span>
              {data.templates.map((template) => (
                <Button key={template.key} size="sm" variant="outline" className="rounded-full" disabled={busy} data-testid={`enable-template-${template.key}`}
                  onClick={() => void run(() => send("/api/clinic/consult-types", "POST", { templateKey: template.key }), `Se activó «${template.name}»`, true)}>
                  <Plus className="w-4 h-4 mr-1" />{template.name}
                </Button>
              ))}
            </div>
          )}
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim().length < 2) return;
              void run(() => send("/api/clinic/consult-types", "POST", { name: newName }), "Tipo creado", true).then(() => setNewName(""));
            }}
          >
            <Input aria-label="Nombre del nuevo tipo" placeholder="Crear un tipo propio…" className="h-9 rounded-full max-w-xs" value={newName} maxLength={60} onChange={(event) => setNewName(event.target.value)} />
            <Button type="submit" size="sm" className="rounded-full" disabled={busy || newName.trim().length < 2}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear tipo"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
