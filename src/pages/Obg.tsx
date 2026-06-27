import { useEffect } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/premier-logo-custom.png";

const TELEGRAM_URL = "https://t.me/Clscore_bot?start=6a16457d978ba54070095b90";

export default function Obg() {
  useEffect(() => {
    document.title = "¡Compra confirmada! | CL Score";
  }, []);

  const handleTelegram = () => {
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex flex-col items-center gap-3 mt-2 sm:mt-6">
        <img src={logoImg} alt="CL Score" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
        <span className="text-xs tracking-[0.3em] text-primary font-semibold uppercase">
          CL Score
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center mt-8 sm:mt-10">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(233,185,73,0.25)]">
          <CheckCircle2 className="w-9 h-9 text-primary" />
        </div>

        <h1 className="font-['Barlow_Condensed'] font-extrabold text-3xl sm:text-4xl uppercase leading-tight">
          ¡Compra aprobada! Falta 1 paso ⚡
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-sm">
          Tu acceso <span className="text-foreground font-semibold">no se libera automáticamente</span>. Para activarlo ahora, necesitas hablar con nuestro bot oficial en Telegram.
        </p>

        <section className="w-full mt-7 rounded-2xl border p-5 sm:p-6 text-left" style={{ borderColor: "rgba(0,136,204,0.35)", background: "rgba(0,136,204,0.08)" }}>
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#0088cc" }} />
            <div>
              <h2 className="font-semibold text-base sm:text-lg text-foreground">
                Haz clic en el botón de abajo y rescata tu acceso en Telegram
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Serás redirigido a nuestro bot oficial en Telegram, donde tu acceso a la I.A será liberado de forma inmediata y automática. Sin este paso, tu cuenta no queda activa.
              </p>
            </div>
          </div>
        </section>

        <Button
          onClick={handleTelegram}
          className="w-full mt-6 h-14 text-base font-bold uppercase tracking-wide text-white hover:text-white"
          style={{
            background: "#0088cc",
            boxShadow: "0 0 25px rgba(0,136,204,0.45)",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 mr-1" fill="currentColor" aria-hidden="true">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
          </svg>
          Rescatar acceso en Telegram
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="w-4 h-4 text-primary/80" />
          Bot oficial CL Score • Activación inmediata
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-muted-foreground mt-10 mb-2">
        © {new Date().getFullYear()} CL Score — Todos los derechos reservados
      </footer>
    </div>
  );
}
