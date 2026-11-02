import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Clock, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DataRightsDialog } from "@/components/data-rights-dialog";
import { useLanguage } from "@/lib/language";
import { EVALUATION_EDIT_TEXT } from "@/lib/evaluation-edit-i18n";

type Addition = { id: string; note: string; status: "pending" | "incorporated" | "dismissed"; createdAt: string; fileCount: number };
const MAX_FILES = 4;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// Pantalla del paciente cuando la clínica ya empezó a revisar su evaluación: no se pueden cambiar
// las fotos ni los datos enviados, pero sí mandar información adicional (nota y hasta 4 fotos) que
// no reemplaza nada y que la clínica revisa. Corregir un dato de la ficha es el derecho de rectificación.
export function LockedEvaluation({ token }: { token: string }) {
  const { lang } = useLanguage();
  const x = EVALUATION_EDIT_TEXT[lang];
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "toomany" | "empty">("idle");
  const [additions, setAdditions] = useState<Addition[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const base = `/api/patients/${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${base}/edit-state`);
      if (response.ok) setAdditions(((await response.json()) as { additions: Addition[] }).additions ?? []);
    } catch { /* la lista es solo informativa */ }
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const choose = (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter((file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES);
    setFiles(picked.slice(0, MAX_FILES));
    if (state !== "idle") setState("idle");
  };

  const send = async () => {
    if (!note.trim() && files.length === 0) { setState("empty"); return; }
    setState("sending");
    try {
      const created = await fetch(`${base}/additions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      if (created.status === 429) { setState("toomany"); return; }
      const body = (await created.json().catch(() => null)) as { id?: string } | null;
      if (!created.ok || !body?.id) { setState("error"); return; }
      for (const file of files) {
        const uploaded = await fetch(`${base}/additions/${encodeURIComponent(body.id)}/files`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        if (!uploaded.ok) { setState("error"); void load(); return; }
      }
      setNote(""); setFiles([]);
      if (input.current) input.current.value = "";
      setState("sent");
      void load();
    } catch {
      setState("error");
    }
  };

  const statusText = { pending: x.pending, incorporated: x.incorporated, dismissed: x.dismissed };
  const message = state === "error" ? x.error : state === "toomany" ? x.tooMany : state === "empty" ? x.needSomething : null;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm" data-testid="locked-evaluation">
      <div className="h-1.5 bg-gradient-to-r from-primary to-[#4F9CF9]" />
      <div className="p-6 md:p-10 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{x.lockedTitle}</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{x.lockedDesc}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="addition-note" className="text-sm font-semibold text-foreground">{x.noteLabel}</label>
          <Textarea id="addition-note" value={note} maxLength={1000} placeholder={x.notePlaceholder} onChange={(event) => { setNote(event.target.value); if (state !== "idle") setState("idle"); }} className="rounded-2xl min-h-[96px]" />
          <input ref={input} type="file" accept={ACCEPTED.join(",")} multiple className="sr-only" aria-label={x.addPhotos} data-testid="addition-files" onChange={(event) => choose(event.target.files)} />
          <Button type="button" variant="outline" className="rounded-full" onClick={() => input.current?.click()}>
            <ImagePlus className="w-4 h-4 me-2" />{x.addPhotos}
          </Button>
          {files.length > 0 && <p className="text-xs text-muted-foreground">{x.photosChosen(files.length)}</p>}
          {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          {state === "sent" && (
            <p role="status" className="text-sm text-primary font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>{x.sentTitle}. {x.sentDesc}</span>
            </p>
          )}
          <Button type="button" className="w-full h-12 rounded-full font-bold" disabled={state === "sending"} onClick={send}>
            {state === "sending" ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{x.sending}</> : x.send}
          </Button>
        </div>

        {additions.length > 0 && (
          <div className="space-y-2" data-testid="addition-list">
            <h2 className="text-sm font-bold text-foreground">{x.yourSends}</h2>
            <ul className="space-y-2">
              {additions.map((item) => (
                <li key={item.id} className="rounded-2xl bg-[#F5F2EE] p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString(lang, { dateStyle: "medium" })}
                    {item.fileCount > 0 ? ` · ${x.photos(item.fileCount)}` : ""} · <span className="font-semibold">{statusText[item.status]}</span>
                  </p>
                  {item.note && <p className="mt-1 whitespace-pre-wrap break-words">{item.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">{x.rectifyHint}</p>
        <DataRightsDialog token={token} />
        <Link href="/paciente"><Button variant="ghost" className="w-full rounded-full text-sm text-muted-foreground">{x.goAccount}</Button></Link>
      </div>
    </div>
  );
}
