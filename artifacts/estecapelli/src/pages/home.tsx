import { Link } from "wouter";
import { ChevronRight, Activity, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <header className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Estecapelli</span>
        </div>
        <Link href="/admin/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          Acceso Equipo
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 mb-6 rounded-full bg-accent text-accent-foreground text-sm font-medium">
          Evaluación Médica Segura
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          El primer paso hacia tu <br className="hidden md:block" />
          <span className="text-primary">restauración capilar</span>
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Nuestra preevaluación digital nos permite entender tu caso antes de tu primera consulta. Es un proceso clínico, confidencial y rápido.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
          <Link href="/patient" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors gap-2 w-full sm:w-auto">
            Iniciar Preevaluación
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-gray-100 pt-12 text-left">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <span className="font-bold">1</span>
            </div>
            <h3 className="font-semibold text-lg text-foreground">Datos Personales</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Información básica sobre ti y tu historial de pérdida de cabello para orientar nuestro análisis.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <span className="font-bold">2</span>
            </div>
            <h3 className="font-semibold text-lg text-foreground">Registro Fotográfico</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              5 fotografías precisas guiadas paso a paso para evaluar tus zonas donantes y receptoras.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <span className="font-bold">3</span>
            </div>
            <h3 className="font-semibold text-lg text-foreground">Análisis Clínico</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nuestro equipo médico revisará tu caso para estructurar el plan a seguir en tu consulta.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-gray-100 bg-gray-50/50">
        <p className="max-w-md mx-auto px-6">
          Esta preevaluación no reemplaza una consulta médica ni entrega un diagnóstico automático.
        </p>
      </footer>
    </div>
  );
}