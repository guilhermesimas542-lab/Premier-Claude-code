import { useEffect, useState } from "react";
import formasPagamento from "@/assets/formas-pagamento.png";
import seloGarantia from "@/assets/selo-garantia-30.png";

const CHECKOUT_URL = "https://go.centerpag.com/PPU38CQBPB3";

const OLIVE = "#4D7A1F";
const RED_BG = "#FDECEC";
const RED_TEXT = "#B91C1C";

const BENEFITS = [
  "20 cuotas exclusivas todos los días",
  "Acceso inmediato al IA Tipster para crear cuotas personalizadas",
  "Liberación inmediata del mercado Odds Safe, Pro y Ultra",
  "Cuotas aumentadas en todos los partidos del fin de semana",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Backredirect2() {
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  useEffect(() => {
    document.title = "Última oportunidad: acceso por $990 | CL Score";
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
      {secondsLeft > 0 && (
        <div
          className="w-full text-center py-3 px-4 font-bold text-sm sm:text-base"
          style={{ backgroundColor: RED_BG, color: RED_TEXT }}
        >
          PROMOCIÓN EXPIRA EN: {pad(mm)}:{pad(ss)}
        </div>
      )}

      <div className="mx-auto w-full max-w-[420px] px-5 py-6 flex flex-col gap-6">
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
            🏆 OFERTA EXCLUSIVA
          </span>
        </div>

        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-sm"
          style={{ backgroundColor: OLIVE }}
        >
          <div className="font-extrabold text-lg sm:text-xl leading-tight whitespace-nowrap">
            TU ÚLTIMA OPORTUNIDAD ⏱️
          </div>
          <div className="mt-2 text-base sm:text-lg text-white/85">
            Si cierras esta página, pierdes todos los beneficios exclusivos de la promoción.
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 space-y-3 shadow-sm">
          <div className="font-bold text-sm text-neutral-900 text-center">
            Beneficios exclusivos de la promoción
          </div>
          <ul className="space-y-2 text-sm text-neutral-700">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="text-[#4D7A1F] font-bold">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2 text-white font-bold text-xs sm:text-sm"
            style={{ backgroundColor: OLIVE }}
          >
            <span
              className="rounded-md px-2 py-[2px] text-[11px] font-bold"
              style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
            >
              Precio
            </span>
            <span>🔥 SOLO POR HOY</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="font-extrabold text-xl text-neutral-900 leading-tight">
                CL Score — Mensual
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Solo Tarjeta de Crédito
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-2xl leading-tight" style={{ color: OLIVE }}>
                $990
              </div>
              <div className="text-xs text-neutral-500">El primer mes</div>
            </div>
          </div>
        </div>

        <a
          href={CHECKOUT_URL}
          className="block w-full text-center rounded-xl py-4 font-extrabold uppercase tracking-wide text-white text-base sm:text-lg shadow-sm hover:opacity-95 transition"
          style={{ backgroundColor: OLIVE }}
        >
          Asegurar acceso por $990
        </a>

        <div className="flex justify-center">
          <img
            src={formasPagamento}
            alt="Formas de pago"
            className="w-full max-w-[262px] h-auto"
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-xs sm:text-sm text-neutral-700 leading-relaxed shadow-sm">
          <p>
            Aprovecha tu oferta introductoria de CL Score por $990 hoy, luego $19.990 al mes, a menos que canceles. Cancela en cualquier momento.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        <div className="text-center space-y-2">
          <div className="font-bold text-base" style={{ color: RED_TEXT }}>
            ⚠️ ¡ATENCIÓN!
          </div>
          <p className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">
            Si entras en CL Score y no logras al menos triplicar tu banca…
          </p>
          <p className="text-neutral-900 text-sm sm:text-base leading-snug">
            Te devolvemos <span className="font-bold">cada peso</span> que pagaste. Es 100% sin riesgo para ti. 💯
          </p>
        </div>

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

        <div className="border-t border-dashed border-neutral-300" />

        <p className="text-center text-xs text-neutral-500 pb-4">
          Pago 100% seguro • Acceso liberado en Telegram en minutos
        </p>
      </div>
    </div>
  );
}
