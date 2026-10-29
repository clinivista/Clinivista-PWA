import { useState } from "react";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { CONTRACT_TEXT } from "@/lib/contract-i18n";
import { useClinicContract } from "@/lib/clinic-contract";
import { PlanContractDialog } from "@/components/plan-contract-dialog";

/** Aviso (sin bloqueo) cuando el contrato de servicio vigente aún no fue aceptado; abre «Mi plan y contrato» en la pestaña del contrato. */
export function ContractNotice() {
  const { lang } = useLanguage();
  const text = CONTRACT_TEXT[lang];
  const [open, setOpen] = useState(false);
  const { data } = useClinicContract();
  if (!data || !data.enabled || data.accepted) return null;
  return (
    <>
      <div
        role="status"
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6 md:px-8"
        data-testid="contract-notice"
      >
        <FileSignature className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">{text.pending}</p>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full bg-card" onClick={() => setOpen(true)}>{text.review}</Button>
      </div>
      {open && <PlanContractDialog open onOpenChange={setOpen} initialTab="contract" />}
    </>
  );
}
