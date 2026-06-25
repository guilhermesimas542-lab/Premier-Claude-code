import { useEffect, useState } from "react";
import formasPagamento from "@/assets/formas-pagamento.png";
import seloGarantia from "@/assets/selo-garantia-30.png";

const CHECKOUT_URL = "https://checkout.payt.com.br/ec06d836e4341be94f25752d62d9db0f";

const OLIVE = "#4D7A1F";
const RED_BG = "#FDECEC";
const RED_TEXT = "#B91C1C";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Backredirect3() {
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  useEffect(() => {
    document.title = "Última oportunidad: $10 OFF | CL Score";
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* 1) URGENCY BAR */}
      {secondsLeft > 0 && (
        <div
          className="w-full text-center py-3 px-4 font-bold text-sm sm:text-base"
          style={{ backgroundColor: RED_BG, color: RED_TEXT }}
        >
          ESTA OFERTA EXPIRA EN: {pad(mm)}:{pad(ss)}
        </div>
      )}

      <div className="mx-auto w-full max-w-[420px] px-5 py-6 flex flex-col gap-6">
        {/* 2a) CONTEXT CHIP */}
        <div className="flex justify-center -mb-3">
          <span
            className="inline-block font-bold text-[12px] sm:text-[13px] rounded-full"
            style={{
              backgroundColor: "#FEF3C7",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#92400E",
              letterSpacing: "0.5px",
              padding: "6px 14px",
            }}
          >
            🎯 DESCUENTO EXCLUSIVO EN ESTA PÁGINA
          </span>
        </div>

        {/* 2) HEADLINE BANNER */}
        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-sm"
          style={{ backgroundColor: OLIVE }}
        >
          <div className="font-extrabold text-2xl sm:text-3xl leading-tight">
            🔥 ¡DESCUENTO DE $10!
          </div>
          <div className="mt-2 text-base sm:text-lg text-white/85">
            Ahorra $10 y asegura tu acceso a CL Score ahora.
          </div>
        </div>

        {/* 3) OFFER CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
          {/* Diagonal ribbon */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "18px",
              right: "-34px",
              width: "140px",
              transform: "rotate(45deg)",
              backgroundColor: OLIVE,
              color: "#fff",
              textAlign: "center",
              padding: "4px 0",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            -$10
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="font-extrabold text-2xl text-neutral-900 leading-tight ml-[8px]">
                CL Score
              </h1>
            </div>
            <div className="bg-neutral-100 rounded-xl px-3 py-2 text-right">
              <div className="text-xs text-neutral-500 line-through leading-tight">
                De $ 39,90 por
              </div>
              <div className="font-extrabold text-2xl text-neutral-900 leading-tight">
                $ 29,90
              </div>
            </div>
          </div>
        </div>

        {/* 4) CTA */}
        <a
          href={CHECKOUT_URL}
          className="block w-full text-center rounded-xl py-4 font-extrabold uppercase tracking-wide text-white text-base sm:text-lg shadow-sm hover:opacity-95 transition"
          style={{ backgroundColor: OLIVE }}
        >
          Asegurar descuento de $10
        </a>

        {/* 5) PAYMENT METHODS */}
        <div className="flex justify-center">
          <img
            src={formasPagamento}
            alt="Formas de pago: Mastercard, Visa, American Express"
            className="w-full max-w-[262px] h-auto"
          />
        </div>

        {/* 6) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 7) GUARANTEE BLOCK */}
        <div className="text-center space-y-2">
          <div className="font-bold text-base" style={{ color: RED_TEXT }}>
            ⚠️ ¡ATENCIÓN!
          </div>
          <p className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">
            Si entras en CL Score y no logras al menos triplicar tu banca…
          </p>
          <p className="text-neutral-900 text-sm sm:text-base leading-snug">
            Te devolvemos <span className="font-bold">cada centavo</span> que pagaste. ¡Es 100% sin riesgo para ti! 💯
          </p>
        </div>

        {/* 8) GUARANTEE SEAL */}
        <div className="flex flex-col items-center gap-3">
          <div className="font-bold text-base text-neutral-900">
            🛡️ Garantía Total de 30 Días
          </div>
          <img
            src={seloGarantia}
            alt="Sello de Garantía 30 Días"
            className="w-[200px] h-[200px] object-contain"
          />

        </div>

        {/* 6b) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 9) FOOTER MICRO-COPY */}
        <p className="text-center text-xs text-neutral-500 pb-4">
          Pago 100% seguro • Acceso liberado en Telegram en minutos
        </p>
      </div>
    </div>
  );
}
