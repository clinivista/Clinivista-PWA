import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { CONSULT_TYPES_TEXT, fillTools } from "@/lib/tools-i18n";
import { CONSULT_TYPES_KEY, useConsultTypes, type ConsultTypes } from "@/lib/consult-types";

async function send(url: string, method: "POST" | "PATCH" | "DELETE", fallbackError: string, body?: unknown): Promise<ConsultTypes & { id?: string }> {
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as ConsultTypes & { id?: string; error?: string };
  if (!response.ok) throw new Error(data.error ?? fallbackError);
  return data;
}

// «Tipos de consulta» de un centro de dermatología: cada tipo tiene sus propias
// etapas y fotos (se editan debajo, en esta misma pantalla). Todo el personal los
// ve; solo el representante legal los activa, crea, renombra, desactiva o elimina (solo si aún no tiene registros).
export function ConsultTypesBar({ typeId, onSelect }: { typeId: string; onSelect: (id: string) => void }) {
  const { data } = useConsultTypes();
  const { lang } = useLanguage();
  const x = CONSULT_TYPES_TEXT[lang];
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
      toast({ variant: "destructive", title: x.saveFail, description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-3" aria-label={x.title} data-testid="consult-types-bar">
      <div>
        <h2 className="text-base font-extrabold text-foreground">{x.title}</h2>
        <p className="text-sm text-muted-foreground">
          {x.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={x.tabsAria}>
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
              {type.name}{type.active ? "" : x.inactive}
            </button>
          );
        })}
      </div>

      {canEdit && current && !current.isBase && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#F5F2EE] p-3">
          {renaming !== null ? (
            <>
              <Input aria-label={x.renameAria} className="h-9 rounded-full max-w-xs" value={renaming} maxLength={60} onChange={(event) => setRenaming(event.target.value)} />
              <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void run(() => send(`/api/clinic/consult-types/${encodeURIComponent(current.id)}`, "PATCH", x.saveFail, { name: renaming }), x.nameUpdated).then(() => setRenaming(null))}>{x.saveName}</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRenaming(null)}>{x.cancel}</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRenaming(current.name)}>{x.rename}</Button>
              <Button size="sm" variant="outline" className="rounded-full" disabled={busy} data-testid="toggle-consult-type"
                onClick={() => void run(() => send(`/api/clinic/consult-types/${encodeURIComponent(current.id)}`, "PATCH", x.saveFail, { active: !current.active }), current.active ? x.deactivated : x.activated)}>
                {current.active ? x.deactivate : x.activate}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full text-destructive" disabled={busy || current.patientCount > 0} data-testid="delete-consult-type"
                onClick={() => {
                  if (!window.confirm(fillTools(x.confirmDelete, { name: current.name }))) return;
                  void run(() => send(`/api/clinic/consult-types/${encodeURIComponent(current.id)}`, "DELETE", x.saveFail), x.deleted).then(() => onSelect(""));
                }}>
                {x.delete}
              </Button>
              {current.patientCount > 0 && (
                <span className="text-xs text-muted-foreground" data-testid="delete-consult-type-blocked">
                  {fillTools(current.patientCount === 1 ? x.cantDeleteOne : x.cantDeleteMany, { n: current.patientCount })}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {current.active ? x.activeNote : x.inactiveNote}
              </span>
            </>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 border-t border-[#E8E4DE] pt-3">
          {data.templates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{x.templates}</span>
              {data.templates.map((template) => (
                <Button key={template.key} size="sm" variant="outline" className="rounded-full" disabled={busy} data-testid={`enable-template-${template.key}`}
                  onClick={() => void run(() => send("/api/clinic/consult-types", "POST", x.saveFail, { templateKey: template.key }), fillTools(x.templateOn, { name: template.name }), true)}>
                  <Plus className="w-4 h-4 me-1" />{template.name}
                </Button>
              ))}
            </div>
          )}
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim().length < 2) return;
              void run(() => send("/api/clinic/consult-types", "POST", x.saveFail, { name: newName }), x.created, true).then(() => setNewName(""));
            }}
          >
            <Input aria-label={x.newAria} placeholder={x.newPlaceholder} className="h-9 rounded-full max-w-xs" value={newName} maxLength={60} onChange={(event) => setNewName(event.target.value)} />
            <Button type="submit" size="sm" className="rounded-full" disabled={busy || newName.trim().length < 2}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : x.create}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
