import { useEffect } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/premier-logo-custom.png";

const TELEGRAM_URL = "https://t.me/SavelFC_PremierBot?start=6a134ea22fe5dd3f3001a122";

export default function Obrigado() {
  useEffect(() => {
    document.title = "Compra confirmada | Premier FC";
  }, []);

  const handleTelegram = () => {
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex flex-col items-center gap-3 mt-2 sm:mt-6">
        <img src={logoImg} alt="Premier FC" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
        <span className="text-xs tracking-[0.3em] text-primary font-semibold uppercase">
          Premier FC
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center mt-8 sm:mt-10">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(234, 192, 100,0.25)]">
          <CheckCircle2 className="w-9 h-9 text-primary" />
        </div>

        <h1 className="font-['Barlow_Condensed'] font-extrabold text-3xl sm:text-4xl uppercase leading-tight">
          Compra aprovada! Falta 1 passo ⚡
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-sm">
          Seu acesso <span className="text-foreground font-semibold">não é liberado automaticamente</span>. Para ativar agora, você precisa falar com nosso bot oficial no Telegram.
        </p>

        <section className="w-full mt-7 rounded-2xl border p-5 sm:p-6 text-left" style={{ borderColor: "rgba(0,136,204,0.35)", background: "rgba(0,136,204,0.08)" }}>
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#0088cc" }} />
            <div>
              <h2 className="font-semibold text-base sm:text-lg text-foreground">
                Clique no botão abaixo e resgate seu acesso no Telegram
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Você será redirecionado para o nosso bot oficial no Telegram, onde seu acesso à I.A será liberado de forma imediata e automática. Sem esse passo, sua conta não fica ativa.
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
          Resgatar acesso no Telegram
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="w-4 h-4 text-primary/80" />
          Bot oficial Premier FC • Liberação imediata
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-muted-foreground mt-10 mb-2">
        © {new Date().getFullYear()} Premier FC — Todos os direitos reservados
      </footer>
    </div>
  );
}
