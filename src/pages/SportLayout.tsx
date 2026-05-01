import { useEffect, useRef, useState, type RefObject, type Dispatch, type SetStateAction } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { BottomNav } from "@/components/BottomNav";
import { usePendingTip } from "@/contexts/PendingTipContext";

/**
 * Context exposto às rotas filhas (/sport/:sportId, /alavancagem, /odds-altas).
 * Permite que cada filho leia o ref do iframe e/ou troque a URL sem que o
 * iframe seja desmontado ao trocar de rota.
 */
export type SportOutletContext = {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeUrl: string;
  setIframeUrl: Dispatch<SetStateAction<string>>;
};

/** Hook tipado para os filhos consumirem o context. */
export function useSportOutletContext(): SportOutletContext {
  return useOutletContext<SportOutletContext>();
}

const ESPORTIVA_ORIGIN = "https://esportiva.bet.br";

/**
 * Layout pai persistente para as rotas de tips esportivas.
 * Monta o iframe da casa de apostas UMA ÚNICA VEZ e o mantém vivo enquanto
 * o usuário navega entre /sport/:sportId, /alavancagem e /odds-altas.
 */
const SportLayout = () => {
  const { house: userHouse } = useUserBettingHouse();
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoadedRef = useRef(false);
  const { pendingTip, clearPendingTip } = usePendingTip();

  // Inicializa a URL do iframe com a URL padrão da casa do usuário
  useEffect(() => {
    if (userHouse?.iframe_url) {
      setIframeUrl(userHouse.iframe_url);
    }
  }, [userHouse]);

  // Reseta flag de "já carregou" sempre que a URL muda
  useEffect(() => {
    iframeLoadedRef.current = false;
  }, [iframeUrl]);

  // Listener de debug — registra mensagens vindas da Esportiva para entendermos
  // o protocolo (ex.: iframeReady, iframeLoading, etc.).
  useEffect(() => {
    const handleEsportivaMessage = (event: MessageEvent) => {
      if (event.origin !== ESPORTIVA_ORIGIN) return;
      console.log("[ESPORTIVA RESPONDEU]", event.data);
    };
    window.addEventListener("message", handleEsportivaMessage);
    return () => window.removeEventListener("message", handleEsportivaMessage);
  }, []);

  // Envia o pendingTip para o iframe e limpa o estado
  const flushPendingTip = () => {
    if (!pendingTip) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      { type: "wsdk-toggle-selections", data: { selections: pendingTip.selections } },
      ESPORTIVA_ORIGIN
    );
    toast.success("Tip adicionada ao bilhete!");
    clearPendingTip();
  };

  // Se o iframe já carregou antes (usuário volta à rota) e há pendente: envia após 500ms
  useEffect(() => {
    if (!pendingTip || !iframeLoadedRef.current) return;
    const t = setTimeout(flushPendingTip, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTip]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    if (pendingTip) setTimeout(flushPendingTip, 500);
  };

  const ctx: SportOutletContext = {
    iframeRef,
    iframeUrl,
    setIframeUrl,
  };

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full pb-20 md:pb-0 relative bg-navy-dark">
      {/* Conteúdo específico da rota filha (header, tabs, carrossel, modais) */}
      <Outlet context={ctx} />

      {/* Iframe persistente — vive aqui no pai, sobrevive a trocas de rota */}
      <section id="bet-iframe-section" className="w-full mt-2 max-w-7xl mx-auto px-4">
        {userHouse?.open_in_new_tab ? (
          <a
            href={iframeUrl || userHouse.iframe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 text-primary font-semibold hover:from-primary/30 hover:to-primary/20 transition-colors"
          >
            Abrir site de apostas ↗
          </a>
        ) : (
          <div className="w-full h-[600px] sm:h-[calc(100vh-300px)] md:h-[calc(100vh-280px)] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
            {iframeUrl ? (
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                onLoad={handleIframeLoad}
                title="Bet Site"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            )}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default SportLayout;
