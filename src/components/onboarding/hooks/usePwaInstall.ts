import { useCallback, useEffect, useState } from "react";

import {
  detectInAppBrowser,
  tryRedirectToChromeAndroid,
  type IabType,
} from "@/lib/in-app-browser";

/**
 * Adapter de instalação PWA + permissão de notificação.
 *
 * Caminhos por plataforma:
 *
 * - **Android (Chrome/Edge/Brave)**: captura `beforeinstallprompt`, exibe o
 *   prompt nativo no clique. Após aceite, dispara `requestNotificationPermission`.
 *
 * - **iOS Safari**: navegador não expõe instalação programática. Retornamos
 *   `mode: "ios"` e a UI mostra instruções "Compartilhar → Adicionar à Tela
 *   de Início". Web Push só funciona depois que o lead instalar manualmente
 *   (suportado a partir de iOS 16.4).
 *
 * - **Desktop/outros**: prompt pode disparar em Chrome; senão `mode: "unsupported"`.
 *
 * ⚠️ Pré-requisitos pra `beforeinstallprompt` disparar em produção:
 *    1. Site servido sob HTTPS (ou localhost)
 *    2. Manifest.json válido com `start_url`, `display`, `icons`
 *    3. Service Worker registrado
 *  O app prod (premierfcapp.com) precisa atender esses 3.
 */

type Platform = "android" | "ios" | "desktop" | "unknown";
type InstallMode = "prompt" | "ios" | "iab-blocked" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePwaInstall() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [iab, setIab] = useState<IabType>(null);
  const [forceIab, setForceIab] = useState(false); // dev override
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
  const [iabDialogOpen, setIabDialogOpen] = useState(false);

  // ──────────────── plataforma + IAB ────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
      setPlatform("ios");
    } else if (/Android/i.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
    setIab(detectInAppBrowser());
  }, []);

  // ──────────────── captura do beforeinstallprompt ────────────────
  useEffect(() => {
    function handle(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handle);
    return () => window.removeEventListener("beforeinstallprompt", handle);
  }, []);

  // ──────────────── detecção de já instalado ────────────────
  useEffect(() => {
    function handle() {
      setInstalled(true);
    }
    window.addEventListener("appinstalled", handle);

    // Já está rodando como PWA standalone?
    if (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setInstalled(true);
    }

    return () => window.removeEventListener("appinstalled", handle);
  }, []);

  // ──────────────── notificação ────────────────
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      setNotificationGranted(true);
      return true;
    }
    if (Notification.permission === "denied") return false;
    try {
      const result = await Notification.requestPermission();
      const granted = result === "granted";
      setNotificationGranted(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  // ──────────────── modo efetivo ────────────────
  // IAB (Instagram/FB/TikTok…) tem prioridade absoluta — fluxo de install
  // só faz sentido depois que o lead sair do webview do app de rede social.
  const inIab = forceIab || iab !== null;
  const mode: InstallMode =
    inIab
      ? "iab-blocked"
      : platform === "ios"
        ? "ios"
        : deferredPrompt
          ? "prompt"
          : platform === "android" || platform === "desktop"
            ? "unsupported"
            : "unsupported";

  // ──────────────── ação principal ────────────────
  const install = useCallback(async () => {
    if (mode === "iab-blocked") {
      setIabDialogOpen(true);
      return;
    }
    if (mode === "ios") {
      setIosInstructionsOpen(true);
      // Notificação no iOS só funciona após adicionar à Home — pedimos depois.
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          await requestNotificationPermission();
        }
        setDeferredPrompt(null);
      } catch {
        // se falhar, continua — sem bloquear o lead
      }
    }
  }, [deferredPrompt, mode, requestNotificationPermission]);

  /** Tenta abrir no Chrome (Android). No iOS, função é noop — só instrução. */
  const tryEscapeIab = useCallback(() => {
    if (platform === "android") {
      tryRedirectToChromeAndroid();
    }
    // iOS: sem caminho programático. UI mostra instruções manuais.
  }, [platform]);

  /** Usado no dev — finge que o install funcionou pra testar o fluxo. */
  const simulateInstall = useCallback(async () => {
    setInstalled(true);
    await requestNotificationPermission();
  }, [requestNotificationPermission]);

  return {
    platform,
    iab,
    mode,
    installed,
    notificationGranted,
    iosInstructionsOpen,
    setIosInstructionsOpen,
    iabDialogOpen,
    setIabDialogOpen,
    install,
    tryEscapeIab,
    simulateInstall,
    requestNotificationPermission,
    /** Dev-only: força modo IAB pra testar o fluxo sem estar no Instagram. */
    simulateIab: () => setForceIab(true),
    clearIabSimulation: () => setForceIab(false),
    forcedIab: forceIab,
  };
}
