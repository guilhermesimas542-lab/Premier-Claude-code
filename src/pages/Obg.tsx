import { useEffect } from "react";
import { CircleCheck, Send, ShieldCheck } from "lucide-react";

const TELEGRAM_BOT_URL = "https://t.me/Clscore_bot?start=6a16457d978ba54070095b90";

const Obg = () => {
  useEffect(() => {
    document.title = "¡Compra aprobada! Falta 1 paso | CL Score";
  }, []);

  const handleOpenTelegram = () => {
    window.open(TELEGRAM_BOT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex flex-col items-center gap-3 mt-2 sm:mt-6">
        <img
          src="/obg/premier-fc-logo.png"
          alt="CL Score"
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
        />
        <span className="text-xs tracking-[0.3em] text-primary font-semibold uppercase">
          CL Score
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center mt-6 sm:mt-8">
        {/* Check icon */}
        <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(0,255,127,0.25)]">
          <CircleCheck className="w-8 h-8 text-primary" />
        </div>

        {/* Headline */}
        <h1 className="font-['Barlow_Condensed'] font-extrabold text-3xl sm:text-4xl uppercase leading-tight">
          ¡Compra aprobada! Falta 1 paso <span className="text-yellow-400">⚡</span>
        </h1>

        {/* Subtítulo */}
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-sm leading-relaxed">
          Tu acceso <span className="text-foreground font-semibold">no se libera automáticamente</span>. Para activarlo ahora, necesitas hablar con nuestro bot oficial en Telegram.
        </p>

        {/* Card explicativo */}
        <section className="w-full mt-7 rounded-2xl border border-border bg-card/70 backdrop-blur p-5 sm:p-6 text-left">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-[#3B9EFF] mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-base sm:text-lg leading-snug">
                Haz clic en el botón de abajo y rescata tu acceso en Telegram
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Serás redirigido a nuestro bot oficial en Telegram, donde tu acceso a la I.A será liberado de forma inmediata y automática. Sin este paso, tu cuenta no queda activa.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Telegram (azul) */}
        <button
          type="button"
          onClick={handleOpenTelegram}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full mt-6 h-14 text-base font-bold uppercase tracking-wide bg-[#3B9EFF] text-white hover:bg-[#2E8AE6] shadow-[0_0_25px_rgba(59,158,255,0.35)]"
        >
          <Send className="w-5 h-5 mr-1" />
          Rescatar acceso en Telegram
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="w-4 h-4 text-primary/80" />
          Bot oficial CL Score • Activación inmediata
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-muted-foreground mt-10 mb-2">
        © 2026 CL Score — Todos los derechos reservados
      </footer>
    </div>
  );
};

export default Obg;
