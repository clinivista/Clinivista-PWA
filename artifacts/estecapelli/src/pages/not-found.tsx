import { Link } from "wouter";
import { SearchX } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/language";
import { SYSTEM_TEXT } from "@/lib/system-pages-i18n";

export default function NotFound() {
  const { lang } = useLanguage();
  const text = SYSTEM_TEXT[lang];
  return (
    <div className="cv-page min-h-[100dvh] w-full flex items-center justify-center p-6" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="not-found">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_44px_-18px_rgba(10,31,77,0.25)] ring-1 ring-slate-200/70" role="alert">
        <BrandLogo variant="logo-sin-lema" alt="Clinivista" className="mx-auto mb-5 h-8" />
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3FE] text-[#0B4FC4]" aria-hidden="true"><SearchX className="h-7 w-7" /></span>
        <h1 className="text-2xl font-bold text-[#0A1F4D]">{text.notFoundTitle}</h1>
        <p className="mt-2 text-[15px] text-[#4A5F82]">{text.notFoundDesc}</p>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0B63E5] px-6 font-semibold text-white hover:bg-[#0A55C4]" data-testid="not-found-home">{text.goHome}</Link>
      </div>
    </div>
  );
}
