import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { DUPLICATE_HELP_TEXT } from "@/lib/duplicate-help-i18n";

/** What to do after "ya existe una evaluación": the way back is the patient account. */
export function DuplicateHelp({ className = "" }: { className?: string }) {
  const { lang } = useLanguage();
  const h = DUPLICATE_HELP_TEXT[lang] ?? DUPLICATE_HELP_TEXT.es;
  return (
    <div data-testid="duplicate-help" className={`rounded-2xl border bg-card p-4 text-sm space-y-2 ${className}`}>
      <p className="font-semibold">{h.title}</p>
      <ol className="list-decimal ps-5 space-y-1 text-muted-foreground">
        <li>{h.step1}</li>
        <li>{h.step2}</li>
        <li>{h.step3}</li>
      </ol>
      <Button asChild className="w-full rounded-full mt-2">
        <Link href="/paciente">{h.button}</Link>
      </Button>
    </div>
  );
}
