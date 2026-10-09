import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { useStaffReset } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { LanguagePicker } from "@/components/language-picker";
import { useLanguage } from "@/lib/language";
import { STAFF_RESET_TEXT } from "@/lib/staff-reset-i18n";

// Enlace del correo "Olvidé mi clave": el personal elige una contraseña nueva.
export default function StaffReset() {
  const { lang } = useLanguage();
  const text = STAFF_RESET_TEXT[lang];
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const reset = useStaffReset();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mismatch = again.length > 0 && password !== again;

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <BrandLogo className="h-16 w-16 rounded-2xl" />
          <LanguagePicker label="Language" />
        </div>
        <h1 className="text-2xl font-bold">{text.resetTitle}</h1>
        {done ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-4">
            <p role="status">{text.done}</p>
            <Link href="/admin/login"><Button className="rounded-full font-bold w-full">{text.goLogin}</Button></Link>
          </div>
        ) : (
          <form className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              reset.mutate({ data: { token, password } }, {
                onSuccess: () => setDone(true),
                onError: () => setError(text.invalid),
              });
            }}>
            <label className="text-sm font-bold" htmlFor="staff-new-password">{text.newPassword}</label>
            <Input id="staff-new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-2xl" />
            <p className="text-xs text-muted-foreground">{text.minLength}</p>
            <label className="text-sm font-bold" htmlFor="staff-repeat-password">{text.repeatPassword}</label>
            <Input id="staff-repeat-password" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className="h-12 rounded-2xl" />
            {mismatch && <p role="alert" className="text-sm text-destructive">{text.mismatch}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error} <Link href="/admin/login" className="underline">{text.forgotLink}</Link></p>}
            <Button type="submit" className="rounded-full font-bold" disabled={reset.isPending || password.length < 8 || password !== again || !token}>
              {reset.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.save}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
