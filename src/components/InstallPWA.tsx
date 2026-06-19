import { useEffect, useRef, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

// Tipos do beforeinstallprompt (não vêm no DOM lib padrão)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/(CriOS|FxiOS|EdgiOS)/.test(ua);
}

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

async function markUserInstalled() {
  try {
    const user = mockGetUser();
    if (!user?.id) return;
    // só atualiza se ainda for false — idempotente
    const { data } = await supabase
      .from("users")
      .select("app_installed")
      .eq("id", user.id)
      .maybeSingle();
    if (data && data.app_installed === true) return;
    await supabase.from("users").update({ app_installed: true }).eq("id", user.id);
  } catch (err) {
    console.warn("No se pudo marcar app_installed:", err);
  }
}

interface InstallPWAProps {
  variant?: "card" | "inline";
}

export default function InstallPWA({ variant = "card" }: InstallPWAProps) {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosOpen, setIosOpen] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (installed) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setHasPrompt(false);
      deferredRef.current = null;
      markUserInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Se abriu standalone, marca instalado retroativamente
    if (isStandalone()) {
      setInstalled(true);
      markUserInstalled();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  // Já instalado ou dispensado há pouco → não mostra
  if (installed) return null;
  if (isDismissedRecently()) return null;

  // Sem prompt nativo e não é iOS → navegador não suporta install (Firefox desktop etc)
  if (!hasPrompt && !ios) return null;

  const handleInstall = async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice.outcome === "accepted") {
        markUserInstalled();
      }
    } catch (err) {
      console.warn("Error en prompt de instalación:", err);
    } finally {
      deferredRef.current = null;
      setHasPrompt(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setHasPrompt(false);
    setIosOpen(false);
  };

  const buttonLabel = ios ? "Cómo instalar la app" : "Instalar aplicación";
  const handleClick = ios ? () => setIosOpen((v) => !v) : handleInstall;

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
        style={{ background: "#1B6CFE", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
      >
        <Download className="w-4 h-4" />
        {buttonLabel}
      </button>
    );
  }

  return (
    <section
      className="rounded-2xl p-4 sm:p-5 space-y-3 relative"
      style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}
    >
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute top-2 right-2 p-1 rounded-md text-white/60 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(27,108,254,0.15)", border: "1px solid rgba(27,108,254,0.4)" }}
        >
          <Download className="w-5 h-5" style={{ color: "#1B6CFE" }} />
        </div>
        <div>
          <h3
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#FFFFFF",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            Instalá CL Score
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white"
        style={{ background: "#1B6CFE", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
      >
        <Download className="w-4 h-4" />
        {buttonLabel}
      </button>

      {ios && iosOpen && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#E2E8F0", lineHeight: 1.5 }}>
            En iPhone/iPad seguí estos pasos:
          </p>
          <ol style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#CBD5E1", lineHeight: 1.6 }} className="list-decimal pl-5 space-y-1">
            <li className="flex items-start gap-2">
              <span>
                Tocá <Share className="inline w-4 h-4 align-middle" /> <strong>Compartir</strong> en la barra de Safari
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>
                Elegí <Plus className="inline w-4 h-4 align-middle" /> <strong>Agregar a pantalla de inicio</strong>
              </span>
            </li>
            <li>Confirmá tocando <strong>Agregar</strong></li>
          </ol>
        </div>
      )}
    </section>
  );
}
