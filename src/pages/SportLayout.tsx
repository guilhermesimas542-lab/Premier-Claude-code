import { useEffect, useRef, useState, type RefObject, type Dispatch, type SetStateAction, type SyntheticEvent } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { BottomNav } from "@/components/BottomNav";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
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

// Origem aceita: derivada do iframe.src atual + sufixos esportiva.bet(.br)
function getExpectedOrigin(iframeEl: HTMLIFrameElement | null): string | null {
  const src = iframeEl?.src;
  if (!src) return null;
  try { return new URL(src).origin; } catch { return null; }
}

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
      const expected = getExpectedOrigin(iframeRef.current);
      const isFromEsportiva =
        event.origin === expected ||
        event.origin.endsWith("esportiva.bet.br") ||
        event.origin.endsWith("esportiva.bet");
      if (!isFromEsportiva) return;
      console.log("[ESPORTIVA RESPONDEU]", { origin: event.origin, data: event.data });
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
      "*"
    );
    toast.success("¡Tip añadido al ticket!");
    clearPendingTip();
  };

  // Se o iframe já carregou antes (usuário volta à rota) e há pendente: envia após 500ms
  useEffect(() => {
    if (!pendingTip || !iframeLoadedRef.current) return;
    const t = setTimeout(flushPendingTip, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTip]);

  const handleIframeLoad = (e: SyntheticEvent<HTMLIFrameElement>) => {
    iframeLoadedRef.current = true;
    const iframe = e.currentTarget;
    let effective_href: string;
    try {
      effective_href = iframe.contentWindow?.location.href ?? "(no contentWindow)";
    } catch (err) {
      effective_href = "(cross-origin: " + (err as Error).message + ")";
    }
    console.log("[IFRAME LOADED]", { src_attr: iframe.src, title: iframe.title, effective_href });
    if (pendingTip) setTimeout(flushPendingTip, 500);
  };

  const ctx: SportOutletContext = {
    iframeRef,
    iframeUrl,
    setIframeUrl,
  };

  // Heurística pro mercado Chile: enquanto a integração com sportsbook chileno não
  // está pronta, o iframe_url pode vir vazio ou apontando pra mesma origem do app
  // (gera "header duplicado" + trava scroll no mobile, pois o iframe captura toques).
  // Esconde a seção nesses casos. Quando a casa de apostas estiver integrada de
  // verdade, iframe_url aponta pra outra origem e a seção volta a aparecer.
  const isSameOriginIframe = (() => {
    if (!iframeUrl) return false;
    try {
      return new URL(iframeUrl, window.location.href).origin === window.location.origin;
    } catch {
      return true;
    }
  })();
  const shouldHideIframeSection = !iframeUrl || isSameOriginIframe;

  return (
    <div className="min-h-screen md:min-h-0 md:h-[100dvh] md:flex md:flex-col overflow-x-hidden w-full max-w-full pb-20 md:pb-16 relative bg-navy-dark" style={{ backgroundColor: "#0a0f08" }}>
      {/* Conteúdo específico da rota filha (header, tabs, carrossel, modais) */}
      <div className="md:flex-shrink-0">
        <Outlet context={ctx} />
      </div>

      {/* Iframe persistente — vive aqui no pai, sobrevive a trocas de rota.
          Renderiza apenas quando houver casa de apostas integrada (URL externa). */}
      {!shouldHideIframeSection && (
        <section id="bet-iframe-section" className="w-full mt-2 max-w-7xl mx-auto px-2 sm:px-4 md:flex-1 md:min-h-0 md:flex md:flex-col md:items-center">
          {userHouse?.open_in_new_tab ? (
            <a
              href={iframeUrl || userHouse.iframe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 text-primary font-semibold hover:from-primary/30 hover:to-primary/20 transition-colors"
            >
              Abrir sitio de apuestas ↗
            </a>
          ) : (
            <div className="w-full mb-2 h-[calc(100dvh-124px-env(safe-area-inset-bottom,0px))] min-h-[480px] md:h-auto md:mb-0 md:flex-1 md:min-h-0 md:max-w-[480px] md:w-full bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                onLoad={handleIframeLoad}
                title="Bet Site"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </section>
      )}

      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

export default SportLayout;
