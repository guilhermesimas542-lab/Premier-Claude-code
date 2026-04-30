import { useCallback, useEffect, useRef, useState, type RefObject, type Dispatch, type SetStateAction } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { BottomNav } from "@/components/BottomNav";

/**
 * Context exposto às rotas filhas (/sport/:sportId, /alavancagem, /odds-altas).
 * Permite que cada filho leia o ref do iframe e/ou troque a URL sem que o
 * iframe seja desmontado ao trocar de rota.
 */
export type SportOutletContext = {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeUrl: string;
  setIframeUrl: Dispatch<SetStateAction<string>>;
  isSportsbookReady: boolean;
  enqueueOrSendWsdk: (message: unknown) => void;
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
 *
 * Também centraliza:
 *  - listener de mensagens do iframe (iframeReady / iframeLoading)
 *  - estado isSportsbookReady
 *  - fila (tamanho 1) de mensagens WSDK pendentes para enviar quando ready
 */
const SportLayout = () => {
  const { house: userHouse } = useUserBettingHouse();
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSportsbookReady, setIsSportsbookReady] = useState(false);
  const pendingMessageRef = useRef<unknown | null>(null);

  // Inicializa a URL do iframe com a URL padrão da casa do usuário
  useEffect(() => {
    if (userHouse?.iframe_url) {
      setIframeUrl(userHouse.iframe_url);
    }
  }, [userHouse]);

  // Sempre que a URL do iframe muda, ele recarrega -> volta a não estar pronto.
  useEffect(() => {
    setIsSportsbookReady(false);
  }, [iframeUrl]);

  // Listener global de mensagens da Esportiva (vive no Layout para persistir
  // entre rotas filhas).
  useEffect(() => {
    const handleEsportivaMessage = (event: MessageEvent) => {
      if (event.origin !== ESPORTIVA_ORIGIN) return;
      console.log("[ESPORTIVA RESPONDEU]", event.data);
      if (event.data === "iframeReady") {
        setIsSportsbookReady(true);
      } else if (event.data === "iframeLoading") {
        setIsSportsbookReady(false);
      }
    };
    window.addEventListener("message", handleEsportivaMessage);
    return () => window.removeEventListener("message", handleEsportivaMessage);
  }, []);

  const enqueueOrSendWsdk = useCallback((message: unknown) => {
    const cw = iframeRef.current?.contentWindow;
    if (isSportsbookReady && cw) {
      cw.postMessage(message, ESPORTIVA_ORIGIN);
      toast.success("Tip adicionada ao bilhete!", {
        description: "Seleção enviada para o cupom de apostas",
      });
    } else {
      // Fila de tamanho 1: nova clica substitui mensagem pendente anterior.
      pendingMessageRef.current = message;
      toast("Aguarde o sportsbook carregar...", {
        description: "Sua seleção será enviada assim que o site estiver pronto",
      });
    }
  }, [isSportsbookReady]);

  // Flush da fila quando o iframe ficar pronto.
  useEffect(() => {
    if (!isSportsbookReady) return;
    const pending = pendingMessageRef.current;
    if (!pending) return;
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    cw.postMessage(pending, ESPORTIVA_ORIGIN);
    pendingMessageRef.current = null;
    toast.success("Tip adicionada ao bilhete!", {
      description: "Seleção enviada para o cupom de apostas",
    });
  }, [isSportsbookReady]);

  const ctx: SportOutletContext = {
    iframeRef,
    iframeUrl,
    setIframeUrl,
    isSportsbookReady,
    enqueueOrSendWsdk,
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
          <div className="w-full h-[1000px] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
            {iframeUrl ? (
              <iframe
                ref={iframeRef}
                src={iframeUrl}
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
