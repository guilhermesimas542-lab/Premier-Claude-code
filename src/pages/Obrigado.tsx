import { useEffect } from "react";
import { CheckCircle2, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLinks } from "@/contexts/LinksContext";
import { SUPPORT_WHATSAPP_URL_FALLBACK } from "@/lib/userMock";
import logoImg from "@/assets/premier-logo-custom.png";

const WA_MESSAGE = encodeURIComponent(
  "Olá! Acabei de finalizar minha compra no app Premier FC e quero liberar meu acesso agora. 🚀"
);

export default function Obrigado() {
  const { links } = useLinks();

  useEffect(() => {
    document.title = "Compra confirmada | Premier FC";
  }, []);

  const waUrl = "https://api.whatsapp.com/send?phone=5518976007112&text=Quero%20meu%20acesso%20ao%20Premier!";

  const handleWhatsApp = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-8 sm:py-12 relative overflow-hidden">
      {/* subtle glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex flex-col items-center gap-3 mt-2 sm:mt-6">
        <img src={logoImg} alt="Premier FC" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
        <span className="text-xs tracking-[0.3em] text-primary font-semibold uppercase">
          Premier FC
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center mt-8 sm:mt-10">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(0,255,127,0.25)]">
          <CheckCircle2 className="w-9 h-9 text-primary" />
        </div>

        <h1 className="font-['Barlow_Condensed'] font-extrabold text-3xl sm:text-4xl uppercase leading-tight">
          Parabéns! Sua compra foi aprovada ✅
        </h1>

        <section className="w-full mt-7 rounded-2xl border border-border bg-card/70 backdrop-blur p-5 sm:p-6 text-left">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-base sm:text-lg">
                Clique no botão abaixo para receber seu acesso no WhatsApp
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Seu acesso à I.A não aparece nesta página. Para ativá-lo, clique no botão verde abaixo: você será redirecionado para o WhatsApp, onde receberá seu link de acesso de forma imediata e automática.
              </p>
            </div>
          </div>
        </section>

        <Button
          onClick={handleWhatsApp}
          className="w-full mt-6 h-14 text-base font-bold uppercase tracking-wide bg-primary text-black hover:bg-primary/90 hover:text-black shadow-[0_0_25px_rgba(0,255,127,0.35)]"
        >
          <MessageCircle className="w-5 h-5 mr-1" />
          Ativar minha conta no WhatsApp
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="w-4 h-4 text-primary/80" />
          Atendimento oficial Premier FC • 100% seguro
        </div>
      </main>

      <footer className="relative z-10 text-[11px] text-muted-foreground mt-10 mb-2">
        © {new Date().getFullYear()} Premier FC — Todos os direitos reservados
      </footer>
    </div>
  );
}
