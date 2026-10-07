// La identidad de la clínica tal como la ve el paciente: su logo (o, si aún no
// subió uno, sus iniciales) junto a su nombre. Reemplaza a la marca de la
// plataforma en la vista del paciente.
type ClinicBadgeProps = {
  name: string;
  logoDataUrl: string | null;
  className?: string;
};

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "·";
}

export function ClinicBadge({ name, logoDataUrl, className = "" }: ClinicBadgeProps) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      {logoDataUrl ? (
        <img
          src={logoDataUrl}
          alt={`Logo de ${name}`}
          className="h-12 w-12 shrink-0 rounded-xl object-contain bg-white"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary font-extrabold text-lg inline-flex items-center justify-center"
        >
          {initialsOf(name)}
        </span>
      )}
      <span className="font-bold text-foreground text-base leading-tight truncate">{name}</span>
    </div>
  );
}
