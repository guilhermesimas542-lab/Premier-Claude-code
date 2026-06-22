import { useMemo, useState } from "react";
import {
  ArrowDown,
  Bell,
  Camera,
  CheckCircle2,
  Download,
  MessageCircle,
  MessageSquare,
  Music,
  Phone as PhoneIcon,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { useApplyCtaOverride, useCtaOverride } from "@/components/onboarding/cta-context";
import { usePwaInstall } from "@/components/onboarding/hooks/usePwaInstall";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IAB_LABELS, type IabType } from "@/lib/in-app-browser";
import { cn } from "@/lib/utils";
import clscoreLogo from "@/assets/clscore-logo.webp";

/**
 * Step 3 — Atalho do PREMIER na tela inicial.
 *
 * Fluxo:
 *  1. Lead clica o botão "Adicionar à tela inicial"
 *     - Android com prompt disponível → `beforeinstallprompt.prompt()` nativo
 *       + após aceite, pede permissão de notificação
 *     - iOS → abre painel com instruções "Compartilhar → Adicionar à Tela
 *       de Início" (sem caminho programático)
 *     - Dev / sem suporte → botão "Simular instalação" pra testar o fluxo
 *  2. Lead clica "Continuar" → popup de confirmação:
 *     - "Sim, adicionei" → goNext
 *     - "Ainda não" → fecha popup (lead pode clicar no botão de instalar de novo)
 */
export function Step3Shortcut() {
  const pwa = usePwaInstall();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [installClicked, setInstallClicked] = useState(false);
  const { goNext } = useCtaOverride();

  // CTA do NavBar é GATED — fica desabilitado até o lead clicar no botão
  // de instalar (intent signal). Depois libera "Continuar" que abre o popup
  // de confirmação "você adicionou o atalho?".
  const override = useMemo(
    () =>
      installClicked
        ? {
            label: "Continuar",
            onClick: () => setConfirmOpen(true),
          }
        : {
            label: "Agrega el acceso directo",
            disabled: true,
            progress: 0,
          },
    [installClicked],
  );
  useApplyCtaOverride(override);

  const handleInstall = () => {
    setInstallClicked(true);
    pwa.install();
  };

  return (
    <div className="relative flex min-h-full flex-col">
      <BackgroundGlow />

      <div className="relative z-10 flex flex-1 flex-col gap-4 px-5 pb-5 pt-2">
        <Header installed={pwa.installed} />

        <PhoneIllustration installed={pwa.installed} />

        <InstallSection
          installed={pwa.installed}
          notificationGranted={pwa.notificationGranted}
          onInstall={handleInstall}
        />
      </div>

      <IosInstructionsDialog
        open={pwa.iosInstructionsOpen}
        onClose={() => pwa.setIosInstructionsOpen(false)}
      />

      <OpenInBrowserDialog
        open={pwa.iabDialogOpen}
        iab={pwa.iab}
        platform={pwa.platform}
        onClose={() => pwa.setIabDialogOpen(false)}
        onTryEscape={pwa.tryEscapeIab}
      />

      <ConfirmInstallDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          goNext();
        }}
      />
    </div>
  );
}

/* ─────────────────── background ─────────────────── */

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-24 top-8 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #00FF87 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-24 top-1/2 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #00FF87 0%, transparent 70%)" }}
      />
    </div>
  );
}

/* ─────────────────── header ─────────────────── */

function Header({ installed }: { installed: boolean }) {
  return (
    <header className="text-center animate-fade-in-scale">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
          installed
            ? "border-[#00FF87]/50 bg-[#00FF87]/10 text-[#00FF87]"
            : "border-[#00FF87]/35 bg-[#00FF87]/10 text-[#00FF87]",
        )}
      >
        {installed ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Acceso directo instalado
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3" /> Acceso rápido a la app
          </>
        )}
      </span>

      <h2 className="mt-3 font-display text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-3xl">
        CLSCORE en tu celular.
      </h2>

      <p className="mt-2 max-w-xs mx-auto text-[13px] leading-snug text-white/75">
        Lo abres con un toque, sin tener que buscar.
      </p>
    </header>
  );
}

/* ─────────────────── ilustração CSS-only ─────────────────── */

/**
 * Apps "famosos" do celular, com o look das marcas reais (mas dessaturados
 * pra ficarem em segundo plano comparados ao Premier no centro).
 */
type FakeApp = {
  label: string;
  bg: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor?: string;
};

const FAKE_APPS: FakeApp[] = [
  {
    label: "Cámara",
    bg: "linear-gradient(135deg,#3a3a3a 0%,#1c1c1e 100%)",
    Icon: Camera,
    iconColor: "#f5f5f5",
  },
  {
    label: "Instagram",
    bg: "linear-gradient(135deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)",
    Icon: Camera,
    iconColor: "#ffffff",
  },
  {
    label: "Facebook",
    bg: "linear-gradient(135deg,#1877f2 0%,#0a5dc2 100%)",
    Icon: FacebookGlyph,
    iconColor: "#ffffff",
  },
  {
    label: "WhatsApp",
    bg: "linear-gradient(135deg,#25d366 0%,#128c7e 100%)",
    Icon: MessageCircle,
    iconColor: "#ffffff",
  },
  {
    label: "Mensajes",
    bg: "linear-gradient(135deg,#34c759 0%,#1ea945 100%)",
    Icon: MessageSquare,
    iconColor: "#ffffff",
  },
  {
    label: "Teléfono",
    bg: "linear-gradient(135deg,#30d158 0%,#0d8a2c 100%)",
    Icon: PhoneIcon,
    iconColor: "#ffffff",
  },
  // [6] = Premier (placeholder na posição central abaixo)
  {
    label: "Calc",
    bg: "linear-gradient(135deg,#ff9500 0%,#cc7700 100%)",
    Icon: CalcGlyph,
    iconColor: "#ffffff",
  },
  {
    label: "Spotify",
    bg: "linear-gradient(135deg,#1ed760 0%,#1aa54a 100%)",
    Icon: Music,
    iconColor: "#000000",
  },
];

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.7v3.1h2.6V22h3.2z" />
    </svg>
  );
}

function CalcGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <rect x="8" y="5" width="8" height="3" rx="0.5" fill="#1a1a1a" />
      <circle cx="9" cy="11" r="1" fill="#1a1a1a" />
      <circle cx="12" cy="11" r="1" fill="#1a1a1a" />
      <circle cx="15" cy="11" r="1" fill="#1a1a1a" />
      <circle cx="9" cy="14" r="1" fill="#1a1a1a" />
      <circle cx="12" cy="14" r="1" fill="#1a1a1a" />
      <circle cx="15" cy="14" r="1" fill="#1a1a1a" />
      <circle cx="9" cy="17" r="1" fill="#1a1a1a" />
      <circle cx="12" cy="17" r="1" fill="#1a1a1a" />
      <circle cx="15" cy="17" r="1" fill="#1a1a1a" />
    </svg>
  );
}

function PhoneIllustration({ installed }: { installed: boolean }) {
  // 9 slots no grid 3x3. Posição central da última linha (índice 7) é o Premier.
  // Os outros 8 são apps "famosos" do celular, com look real mas dessaturados.
  const slots = [
    FAKE_APPS[0], FAKE_APPS[1], FAKE_APPS[2],
    FAKE_APPS[3], FAKE_APPS[4], FAKE_APPS[5],
    FAKE_APPS[6], "premier" as const, FAKE_APPS[7],
  ];

  return (
    <div className="flex justify-center">
      <div
        className="relative w-[240px] rounded-[40px] border border-white/15 bg-gradient-to-b from-[#0b1626] to-[#060d1e] p-3 shadow-2xl"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 40px rgba(0,255,135,0.1)",
        }}
      >
        {/* Notch */}
        <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-white/20" />

        {/* Tela */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#0a1525] to-[#04091a] p-3.5 ring-1 ring-white/5">
          <p className="mb-2.5 text-center font-display text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
            Pantalla de inicio
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {slots.map((slot, i) => {
              if (slot === "premier") {
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "relative grid h-12 w-12 place-items-center overflow-hidden rounded-[14px]",
                        // Pulso só de escala + glow — opacidade fica 100% sempre.
                        !installed && "animate-premier-app-pulse",
                      )}
                      style={{
                        // Fundo branco pra contrastar com a logo preta do CLSCORE.
                        background: "#ffffff",
                        boxShadow: installed
                          ? "0 0 18px rgba(0,255,135,0.7)"
                          : undefined,
                      }}
                    >
                      {/* Borda em gradiente verde pra manter ícone destacado */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[14px]"
                        style={{
                          border: "1.5px solid transparent",
                          backgroundImage:
                            "linear-gradient(#ffffff,#ffffff), linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
                          backgroundOrigin: "border-box",
                          backgroundClip: "padding-box, border-box",
                        }}
                      />
                      <img
                        src={clscoreLogo}
                        alt="CLSCORE"
                        className="relative h-8 w-8 object-contain"
                        draggable={false}
                      />
                    </div>
                    <span className="h-1 w-7 rounded bg-[#00FF87]/70" />
                  </div>
                );
              }

              const { Icon, iconColor, bg } = slot;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-[14px] opacity-50 grayscale-[0.35]"
                    style={{ background: bg }}
                  >
                    <Icon
                      className="h-6 w-6"
                      strokeWidth={2.2}
                      // @ts-expect-error style nem todos lucides aceitam
                      style={{ color: iconColor }}
                    />
                  </div>
                  <span className="h-1 w-6 rounded bg-white/15" />
                </div>
              );
            })}
          </div>

          {!installed && (
            <div className="mt-3 flex items-center justify-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#00FF87]/85">
              <ArrowDown className="h-3 w-3 animate-bounce" /> descargando
            </div>
          )}
          {installed && (
            <div className="mt-3 flex items-center justify-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#00FF87]">
              <CheckCircle2 className="h-3 w-3" /> listo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── seção do botão de instalar ─────────────────── */

function InstallSection({
  installed,
  notificationGranted,
  onInstall,
}: {
  installed: boolean;
  notificationGranted: boolean;
  onInstall: () => void;
}) {
  if (installed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[#00FF87]/40 bg-[#00FF87]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#00FF87]">
          <CheckCircle2 className="h-3.5 w-3.5" /> acceso directo agregado
        </div>
        {notificationGranted && (
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <Bell className="h-3 w-3" /> notificaciones activadas
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onInstall}
        className="group relative h-14 w-full max-w-[240px] overflow-hidden rounded-full border-0 px-4 font-display text-[12px] font-extrabold uppercase tracking-wider text-[#0c1a2d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
          boxShadow: "0 0 28px rgba(0,255,135,0.32), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative inline-flex items-center gap-2">
          <Download className="h-4 w-4" strokeWidth={2.4} />
          Agregar a la pantalla de inicio
        </span>
      </button>

      <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
        <PlatformBadge icon={<AppleGlyph />} label="iOS" />
        <span className="text-white/20">·</span>
        <PlatformBadge icon={<AndroidGlyph />} label="Android" />
      </div>

      {/* iOS: instruções aparecem em modal disparado pelo onInstall (não inline). */}
    </div>
  );
}

function PlatformBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-white/70">{icon}</span>
      {label}
    </span>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M16.36 12.97c-.02-1.96 1.6-2.9 1.67-2.95-.91-1.33-2.33-1.51-2.84-1.53-1.21-.12-2.36.71-2.98.71-.62 0-1.57-.69-2.58-.67-1.33.02-2.55.77-3.23 1.96-1.38 2.39-.35 5.92.98 7.85.66.95 1.45 2.01 2.49 1.97 1-.04 1.38-.65 2.59-.65 1.21 0 1.55.65 2.61.63 1.08-.02 1.76-.96 2.42-1.92.76-1.1 1.07-2.17 1.09-2.22-.02-.01-2.09-.8-2.11-3.18zM14.46 6.52c.55-.66.92-1.59.82-2.51-.79.03-1.74.53-2.31 1.19-.51.58-.96 1.51-.84 2.42.88.07 1.78-.45 2.33-1.1z" />
    </svg>
  );
}

function AndroidGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M6 18c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 003 0V19h2v3.5a1.5 1.5 0 003 0V19h1c.55 0 1-.45 1-1V8H6v10zm-3-7.5a1.5 1.5 0 011.5-1.5A1.5 1.5 0 016 10.5v6a1.5 1.5 0 01-1.5 1.5A1.5 1.5 0 013 16.5v-6zm16.5-1.5A1.5 1.5 0 0121 10.5v6a1.5 1.5 0 01-1.5 1.5 1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5zM15.53 2.16l1.3-1.3a.25.25 0 00-.35-.35l-1.32 1.32A5.07 5.07 0 0012 1c-.86 0-1.66.21-2.36.58L8.32.51a.25.25 0 00-.35.35l1.3 1.3A4.93 4.93 0 006 6.5V7h12v-.5c0-1.93-1.1-3.6-2.47-4.34zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  );
}

/* ─────────────────── dialog "no iPhone, faça assim" ─────────────────── */

function IosInstructionsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-1/2 z-[60] m-0 grid w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border border-[#00FF87]/40 bg-[#112236] p-0 text-white shadow-2xl animate-popup-pop-in [&>button]:hidden"
      >
        <div className="px-5 pb-3 pt-6 text-center">
          <div
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
              boxShadow: "0 0 24px rgba(0,255,135,0.35)",
            }}
          >
            <Smartphone className="h-6 w-6 text-[#0c1a2d]" strokeWidth={2.4} />
          </div>
          <h3 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
            En iPhone, hazlo así
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/70">
            Apple no permite instalar solo. En 3 toques queda listo.
          </p>
        </div>

        <div className="border-t border-white/[0.06] bg-[#0c1a2d] px-5 py-4">
          <ol className="space-y-2.5 text-[12.5px] leading-snug text-white/80">
            <li className="flex items-start gap-2">
              <IosStepBadge num={1} />
              <span>
                Toca el icono <Share className="inline h-3.5 w-3.5 -translate-y-0.5" /> de
                compartir de Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <IosStepBadge num={2} />
              <span>Desplázate y elige "Agregar a pantalla de inicio".</span>
            </li>
            <li className="flex items-start gap-2">
              <IosStepBadge num={3} />
              <span>Toca "Agregar" en la esquina superior derecha.</span>
            </li>
          </ol>
        </div>

        <div className="border-t border-white/[0.06] bg-[#0c1a2d] p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-full border border-white/15 text-[12.5px] font-semibold uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IosStepBadge({ num }: { num: number }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#00FF87]/20 text-[10px] font-extrabold text-[#00FF87]">
      {num}
    </span>
  );
}

/* ─────────────────── dialog "abra no navegador" (IAB) ─────────────────── */

function OpenInBrowserDialog({
  open,
  iab,
  platform,
  onClose,
  onTryEscape,
}: {
  open: boolean;
  iab: IabType;
  platform: "android" | "ios" | "desktop" | "unknown";
  onClose: () => void;
  onTryEscape: () => void;
}) {
  const appLabel = iab ? IAB_LABELS[iab] : "red social";
  const isAndroid = platform === "android";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-1/2 z-[60] m-0 grid w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border border-amber-400/40 bg-[#112236] p-0 text-white shadow-2xl [&>button]:hidden"
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg,#fbbf24 0%,#f97316 100%)",
              boxShadow: "0 0 24px rgba(251,191,36,0.35)",
            }}
          >
            <Smartphone className="h-6 w-6 text-[#1a1206]" strokeWidth={2.4} />
          </div>

          <h3 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
            Abre en el navegador
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/70">
            Estás dentro de {appLabel}. Para guardar el acceso directo de
            CLSCORE en tu celular, abre esta pantalla en el navegador del
            dispositivo primero.
          </p>
        </div>

        {/* Instrucciones específicas por plataforma. */}
        <div className="border-t border-white/[0.06] bg-[#0c1a2d] px-5 py-4">
          {isAndroid ? (
            <ol className="space-y-2 text-[12.5px] leading-snug text-white/80">
              <li className="flex items-start gap-2">
                <Badge num={1} />
                <span>Toca "Abrir en Chrome" aquí abajo.</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge num={2} />
                <span>
                  Si no funciona, toca el menú (⋮) de {appLabel} y elige
                  "Abrir en el navegador".
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-2 text-[12.5px] leading-snug text-white/80">
              <li className="flex items-start gap-2">
                <Badge num={1} />
                <span>
                  Toca el menú <span className="font-bold">⋯</span> (esquina
                  superior derecha).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Badge num={2} />
                <span>Elige "Abrir en Safari".</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge num={3} />
                <span>Vuelve a este onboarding y toca en agregar acceso directo.</span>
              </li>
            </ol>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4 pt-0">
          {isAndroid && (
            <button
              type="button"
              onClick={onTryEscape}
              className="h-11 w-full rounded-full font-display text-sm font-extrabold uppercase tracking-wider text-[#1a1206] transition-transform hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg,#fbbf24 0%,#f97316 100%)",
                boxShadow: "0 4px 16px rgba(251,191,36,0.3)",
              }}
            >
              Abrir en Chrome
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-full border border-white/15 text-[12.5px] font-semibold uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ num }: { num: number }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/20 text-[10px] font-extrabold text-amber-300">
      {num}
    </span>
  );
}

/* ─────────────────── popup de confirmação ─────────────────── */

function ConfirmInstallDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-1/2 z-[60] m-0 grid w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border border-[#00FF87]/40 bg-[#112236] p-0 text-white shadow-2xl [&>button]:hidden"
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
               style={{
                 background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
                 boxShadow: "0 0 24px rgba(0,255,135,0.35)",
               }}>
            <CheckCircle2 className="h-6 w-6 text-[#0c1a2d]" strokeWidth={2.4} />
          </div>

          <h3 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
            ¿Agregaste el acceso directo?
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/65">
            Confirma que CLSCORE ya quedó guardado en tu celular para que
            sigamos.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 w-full rounded-full font-display text-sm font-extrabold uppercase tracking-wider text-[#0c1a2d] transition-transform hover:scale-[1.01]"
            style={{
              background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
              boxShadow: "0 4px 16px rgba(0,255,135,0.25)",
            }}
          >
            Sí, lo agregué
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-full border border-white/15 text-[12.5px] font-semibold uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            Aún no
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
