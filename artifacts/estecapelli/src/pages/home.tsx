import { useState } from "react";
import { Link } from "wouter";
import { Activity, ChevronDown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";

export default function Home() {
  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  return (
    <div className="min-h-screen font-sans bg-[#F5F2EE]" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* ── Sticky Nav ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1F33]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">Clinivista</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-colors"
              >
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 text-left transition-colors ${lang === l.code ? "text-primary font-semibold bg-primary/5" : "text-gray-700"}`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span>{l.name}</span>
                      {lang === l.code && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/admin/login">
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent text-xs px-4 h-8 rounded-full">
                {t.teamAccess}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#0B1F33]">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80"
          alt="Modern clinical setting"
          className="absolute inset-0 w-full h-full object-cover opacity-20 select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1F33]/60 via-[#0B1F33]/40 to-[#0B1F33]/80" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-semibold uppercase tracking-widest mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00A9A5] animate-pulse" />
            {t.tagline}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05] mb-6">
            {t.heroTitle}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A9A5] via-[#4F9CF9] to-[#A78BFA]">
              {t.heroAccent}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed font-light mb-10">
            {t.heroSub}
          </p>
          <Link href="/patient">
            <Button className="h-14 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl shadow-primary/30 group">
              {t.startCTA}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="bg-[#F5F2EE] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-5 py-2 mb-5 rounded-full bg-[#00A9A5]/15 text-[#00A9A5] text-xs font-bold uppercase tracking-widest">
              {t.processLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1F33] mb-4 tracking-tight">
              {t.howTitle}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">{t.howSub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-1.5 bg-gradient-to-r from-[#00A9A5] to-[#00A9A5]/30" />
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#00A9A5]/10 flex items-center justify-center group-hover:bg-[#00A9A5]/20 transition-colors">
                    <span className="text-[#00A9A5] font-black text-lg">01</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#F5F2EE] flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#0B1F33] mb-3">{t.step1Title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{t.step1Desc}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group md:-translate-y-3">
              <div className="h-1.5 bg-gradient-to-r from-[#4F9CF9] to-[#4F9CF9]/30" />
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#4F9CF9]/10 flex items-center justify-center group-hover:bg-[#4F9CF9]/20 transition-colors">
                    <span className="text-[#4F9CF9] font-black text-lg">02</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#F5F2EE] flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#0B1F33] mb-3">{t.step2Title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm mb-4">{t.step2Desc}</p>
                <div className="flex flex-wrap gap-2">
                  {t.step2Tags.map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full bg-[#4F9CF9]/10 text-[#4F9CF9] font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-1.5 bg-gradient-to-r from-[#A78BFA] to-[#A78BFA]/30" />
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#A78BFA]/10 flex items-center justify-center group-hover:bg-[#A78BFA]/20 transition-colors">
                    <span className="text-[#A78BFA] font-black text-lg">03</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#F5F2EE] flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#0B1F33] mb-3">{t.step3Title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{t.step3Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why standardize ───────────────────────────────────────────── */}
      <section className="bg-[#F5F2EE] py-16 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1F33] mb-4 tracking-tight">{t.whyTitle}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[t.why1, t.why2, t.why3].map((text, i) => (
              <div key={i} className="bg-white rounded-[1.75rem] p-7 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-[#00A9A5]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-[#00A9A5]" />
                </div>
                <p className="text-[#0B1F33] font-medium leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "5", label: t.statPositions, color: "text-[#00A9A5]", ring: "ring-[#00A9A5]/20", bg: "bg-[#00A9A5]/8" },
              { value: "4–6", label: t.statMinutes, color: "text-[#4F9CF9]", ring: "ring-[#4F9CF9]/20", bg: "bg-[#4F9CF9]/8" },
              { value: "100%", label: t.statEncrypted, color: "text-[#A78BFA]", ring: "ring-[#A78BFA]/20", bg: "bg-[#A78BFA]/8" },
              { value: "24h", label: t.statResponse, color: "text-[#F59E0B]", ring: "ring-[#F59E0B]/20", bg: "bg-[#F59E0B]/8" },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-[1.75rem] p-6 text-center shadow-sm ring-1 ${s.ring} hover:-translate-y-1 transition-transform`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${s.bg} mb-3`}>
                  <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F33] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/15 text-white/70 text-xs font-semibold uppercase tracking-widest mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00A9A5] animate-pulse" />
            {t.tagline}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">{t.howTitle}</h2>
          <p className="text-white/60 mb-10 leading-relaxed">{t.howSub}</p>
          <Link href="/patient">
            <Button className="h-13 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/30 group">
              {t.startCTA}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-[#F5F2EE] border-t border-[#E8E4DE] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <Link href="/">
                <div className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#0B1F33] text-base leading-tight">Clinivista</div>
                    <div className="text-xs text-gray-400 font-medium">{t.footerProtocol}</div>
                  </div>
                </div>
              </Link>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 font-medium">
                <span className="hover:text-gray-600 cursor-pointer transition-colors">{t.footerPrivacy}</span>
                <span className="hover:text-gray-600 cursor-pointer transition-colors">{t.footerTerms}</span>
                <Link href="/admin/login">
                  <span className="hover:text-gray-600 cursor-pointer transition-colors">{t.teamAccess}</span>
                </Link>
              </div>
            </div>

            <div className="border-t border-[#F5F2EE] pt-6">
              <p className="text-xs text-gray-400 leading-relaxed max-w-2xl mb-3">{t.footerLegal}</p>
              <p className="text-xs text-gray-400">© {new Date().getFullYear()} Clinivista. {t.footerRights}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
