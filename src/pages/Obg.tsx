import { useEffect } from "react";
import { CircleCheck, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { useLinks } from "@/contexts/LinksContext";
import { SUPPORT_WHATSAPP_URL_FALLBACK } from "@/lib/userMock";

const Obg = () => {
  const { links } = useLinks();

  useEffect(() => {
    document.title = "¡Compra confirmada! | CL FC";
  }, []);

  const handleOpenSupport = () => {
    const url = "https://wa.me/5511965075328?text=Quiero%20mi%20acceso%20a%20Clscore";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex flex-col items-center gap-3 mt-2 sm:mt-6">
        <img
          src="/obg/premier-fc-logo.png"
          alt="CL FC"
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
        />
        <span className="text-xs tracking-[0.3em] text-primary font-semibold uppercase">
          CL FC
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center mt-8 sm:mt-10">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(0,255,127,0.25)]">
          <CircleCheck className="w-9 h-9 text-primary" />
        </div>

        <h1 className="font-['Barlow_Condensed'] font-extrabold text-3xl sm:text-4xl uppercase leading-tight">
          ¡Compra confirmada!
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-sm">
          Pago aprobado. Tu acceso a CL FC ya está en camino.
        </p>

        <section className="w-full mt-7 rounded-2xl border border-border bg-card/70 backdrop-blur p-5 sm:p-6 text-left">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-base sm:text-lg">
                Tu acceso llega por WhatsApp
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lo enviamos directo al número que usaste en la compra. Suele llegar en pocos minutos — no necesitas hacer nada.
              </p>
            </div>
          </div>

          <div className="my-5 h-px bg-border" />

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                ¿No quieres esperar?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mándanos un "hola" por WhatsApp y nuestro equipo libera tu acceso al instante (en horario comercial).
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleOpenSupport}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full mt-6 h-14 text-base font-bold uppercase tracking-wide bg-primary text-black hover:bg-primary/90 hover:text-black shadow-[0_0_25px_rgba(0,255,127,0.35)]"
        >
          <MessageCircle className="w-5 h-5 mr-1" />
          Quiero mi acceso ahora
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="w-4 h-4 text-primary/80" />
          Atención oficial CL FC • 100% seguro
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-muted-foreground mt-10 mb-2">
        © 2026 CL FC — Todos los derechos reservados
      </footer>
    </div>
  );
};

export default Obg;
