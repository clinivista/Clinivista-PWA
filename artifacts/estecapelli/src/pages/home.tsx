import { Link } from "wouter";
import { ChevronRight, Activity, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white font-sans selection:bg-primary/20">
      <div className="relative min-h-[100dvh] flex flex-col">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80" 
            alt="Clínica Capilar" 
            className="w-full h-full object-cover object-top"
          />
          {/* Dark Navy Overlay (70-85% opacity) */}
          <div className="absolute inset-0 bg-[#0B1F33]/85 bg-gradient-to-t from-[#0B1F33] via-[#0B1F33]/80 to-[#0B1F33]/60 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1F33]/60 via-transparent to-[#0B1F33]"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 lg:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">Estecapelli</span>
          </div>
          <Link href="/admin/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            Acceso Equipo
          </Link>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full pb-20">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 flex flex-col items-center">
            <div className="inline-flex items-center justify-center px-5 py-2 mb-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-semibold shadow-2xl">
              <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
              Evaluación Médica Confidencial
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight">
              El primer paso hacia tu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#3D8DFF]">restauración capilar</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Nuestra preevaluación digital nos permite entender tu caso de forma precisa antes de tu primera consulta presencial.
            </p>

            <Link href="/patient" className="group inline-flex items-center justify-center h-14 px-10 rounded-full bg-primary text-white text-lg font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(0,169,165,0.4)] gap-3 w-full sm:w-auto">
              Iniciar Preevaluación
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </main>
      </div>

      {/* Info Steps */}
      <div className="bg-white py-24 px-6 relative z-20 -mt-8 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(11,31,51,0.5)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">¿Cómo funciona?</h2>
            <p className="text-muted-foreground text-lg">Un proceso clínico diseñado para tu comodidad y privacidad</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            <div className="flex flex-col gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <span className="font-bold text-xl">1</span>
              </div>
              <h3 className="font-bold text-xl text-foreground">Datos Personales</h3>
              <p className="text-muted-foreground leading-relaxed">
                Información básica sobre ti y tu historial de pérdida de cabello para orientar nuestro análisis médico inicial.
              </p>
            </div>
            <div className="flex flex-col gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <span className="font-bold text-xl">2</span>
              </div>
              <h3 className="font-bold text-xl text-foreground">Registro Fotográfico</h3>
              <p className="text-muted-foreground leading-relaxed">
                5 fotografías precisas guiadas paso a paso para evaluar tus zonas donantes y receptoras desde tu celular.
              </p>
            </div>
            <div className="flex flex-col gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <span className="font-bold text-xl">3</span>
              </div>
              <h3 className="font-bold text-xl text-foreground">Análisis Clínico</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nuestro equipo médico revisará tu caso confidencialmente para estructurar el plan a seguir en tu consulta.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-10 text-center border-t border-gray-100 bg-gray-50/80 mt-auto">
        <p className="max-w-xl mx-auto px-6 text-sm text-muted-foreground/80 leading-relaxed">
          Esta preevaluación es un filtro preliminar y no reemplaza una consulta médica presencial, ni entrega un diagnóstico automático.
        </p>
      </footer>
    </div>
  );
}
