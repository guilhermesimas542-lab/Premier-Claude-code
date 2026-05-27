import { Sparkles, Clock } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const IATipster = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 pb-24 relative overflow-hidden">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
        {/* Ícone */}
        <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,255,127,0.25)]">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>

        {/* Headline */}
        <h1 className="font-['Barlow_Condensed'] font-extrabold text-4xl sm:text-5xl uppercase leading-tight">
          IA Tipster
        </h1>

        {/* Badge "Em breve" */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary uppercase tracking-wider">
            Próximamente
          </span>
        </div>

        {/* Descrição */}
        <p className="mt-6 text-base text-muted-foreground max-w-sm leading-relaxed">
          Nuestro <span className="text-foreground font-semibold">tipster con inteligencia artificial</span> está en construcción.
          Pronto vas a poder generar análisis personalizados directamente desde la app.
        </p>

        <p className="mt-3 text-sm text-muted-foreground/70">
          ¡Estate atento! Te avisaremos cuando esté listo.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default IATipster;
