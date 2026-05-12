import { useEffect, useState } from "react";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";

const COUNTDOWN_INITIAL_SECONDS = 5 * 60;
const BRAND_GREEN = "rgb(77,122,31)";
const BRAND_RED = "rgb(185,28,28)";

const formatCountdown = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const Bd = () => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_INITIAL_SECONDS);

  useEffect(() => {
    document.title = "Última oportunidad: $10 OFF | CL FC";
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      <div
        className="w-full text-center py-3 px-4 font-bold text-sm sm:text-base"
        style={{ backgroundColor: "rgb(253,236,236)", color: BRAND_RED }}
      >
        ESTA OFERTA EXPIRA EN: {formatCountdown(secondsLeft)}
      </div>

      <div className="mx-auto w-full max-w-[420px] px-5 py-6 flex flex-col gap-6">
        <div className="flex justify-center -mb-3">
          <span
            className="inline-block font-bold text-[12px] sm:text-[13px] rounded-full"
            style={{
              backgroundColor: "rgb(254,243,199)",
              border: "1px solid rgba(245,158,11,0.4)",
              color: "rgb(146,64,14)",
              letterSpacing: "0.5px",
              padding: "6px 14px",
            }}
          >
            🎯 DESCUENTO EXCLUSIVO EN ESTA PÁGINA
          </span>
        </div>

        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-sm"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          <div className="font-extrabold text-2xl sm:text-3xl leading-tight">
            🔥 ¡DESCUENTO DE $10!
          </div>
          <div className="mt-2 text-base sm:text-lg text-white/85">
            Ahorra $10 y asegura tu acceso a CL FC ahora.
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
          <div
            className="absolute pointer-events-none"
            style={{
              top: "18px",
              right: "-34px",
              width: "140px",
              transform: "rotate(45deg)",
              backgroundColor: BRAND_GREEN,
              color: "rgb(255,255,255)",
              textAlign: "center",
              padding: "4px 0px",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: "rgba(0,0,0,0.15) 0px 2px 4px",
            }}
          >
            -$10
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="font-extrabold text-2xl text-neutral-900 leading-tight">
                CL FC
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Acceso vitalicio • Pago único
              </p>
            </div>
            <div className="bg-neutral-100 rounded-xl px-3 py-2 text-right">
              <div className="text-xs text-neutral-500 line-through leading-tight">
                De $ 14,90 por
              </div>
              <div className="font-extrabold text-2xl text-neutral-900 leading-tight">
                $ 9,90
              </div>
            </div>
          </div>
        </div>

        <a
          href={CHECKOUT_LINKS.funil_premium_offer}
          id="cta-checkout-bd-funil-premium-offer"
          className="cta-checkout block w-full text-center rounded-xl py-4 font-extrabold uppercase tracking-wide text-white text-base sm:text-lg shadow-sm hover:opacity-95 transition"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          Asegurar descuento de $10
        </a>

        <div className="border-t border-dashed border-neutral-300" />

        <div className="text-center space-y-2">
          <div className="font-bold text-base" style={{ color: BRAND_RED }}>
            ⚠️ ¡ATENCIÓN!
          </div>
          <p className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">
            Si entras a CL FC y no logras al menos triplicar tu banca…
          </p>
          <p className="text-neutral-900 text-sm sm:text-base leading-snug">
            Te devolvemos <span className="font-bold">cada peso</span> que pagaste. ¡Es 100% sin riesgo para ti! 💯
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="font-bold text-base text-neutral-900">
            🛡️ Garantía Total de 30 Días
          </div>
          <img
            src="/bd/guarantee-30d.svg"
            alt="Sello de Garantía 30 Días"
            className="w-[200px] h-[200px] object-contain"
          />
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        <p className="text-center text-xs text-neutral-500 pb-4">
          Pago 100% seguro • Acceso liberado por WhatsApp en minutos
        </p>
      </div>
    </div>
  );
};

export default Bd;
