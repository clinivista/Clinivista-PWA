import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getGetDirectorCentersQueryKey, usePatchDirectorCenter, type DirectorCenterSummary } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { VIDEO_TEXT, type ClinicPlan } from "@/lib/video-i18n";

const PLANS: ClinicPlan[] = ["basic", "unlimited", "titanium"];

/** Supra-control: ver y cambiar el plan de una clínica (el servidor decide qué habilita cada uno). */
export function ClinicPlanSelect({ center }: { center: Pick<DirectorCenterSummary, "id" | "name" | "plan"> }) {
  const { lang } = useLanguage();
  const v = VIDEO_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const patch = usePatchDirectorCenter();
  const current = (center.plan ?? "basic") as ClinicPlan;
  const id = `plan-${center.id}`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 mt-3 border-t border-[#E8E4DE]" data-testid={`plan-${center.id}`}>
      <label htmlFor={id} className="text-sm font-semibold text-muted-foreground">{v.planLabel}</label>
      <select
        id={id}
        className="h-11 min-w-40 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
        value={current}
        disabled={patch.isPending}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const plan = event.target.value as ClinicPlan;
          patch.mutate({ id: center.id, data: { plan } }, {
            onSuccess: async () => {
              await queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
              toast({ title: center.name, description: v.planSaved(v.planNames[plan]) });
            },
            onError: () => toast({ variant: "destructive", title: center.name, description: v.planFailed }),
          });
        }}
      >
        {PLANS.map((plan) => <option key={plan} value={plan}>{v.planNames[plan]}</option>)}
      </select>
      {patch.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />}
      <p id={`${id}-hint`} className="basis-full text-xs text-muted-foreground">{v.planHint}</p>
    </div>
  );
}
