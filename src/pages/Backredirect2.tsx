import { useEffect, useState } from "react";
import formasPagamento from "@/assets/formas-pagamento.png";
import seloGarantia from "@/assets/selo-garantia-30.png";

// TODO: confirmar o link de checkout do R$1
const CHECKOUT_URL = "https://checkout.payt.com.br/302d147f60a7fd78aee674bdea8f4240";

const OLIVE = "#4D7A1F";
const RED_BG = "#FDECEC";
const RED_TEXT = "#B91C1C";

const BENEFITS = [
  "20 odds por dia nos jogos da Copa",
  "Acesso imediato ao IA Tipster para criar odds personalizadas",
  "Liberação imediata do mercado de Odds Safe, Pró e Ultra",
  "Odds aumentadas em todos os jogos da Copa",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Backredirect2() {
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  useEffect(() => {
    document.title = "Última chance: acesso por R$1 | Premier FC";
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
          PROMOÇÃO DA COPA EXPIRA EM: {pad(mm)}:{pad(ss)}
        </div>
      )}

      <div className="mx-auto w-full max-w-[420px] px-5 py-6 flex flex-col gap-6">
        {/* 2) CONTEXT CHIP */}
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
            🏆 OFERTA EXCLUSIVA DA COPA
          </span>
        </div>

        {/* 3) HEADLINE BANNER */}
        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-sm"
          style={{ backgroundColor: OLIVE }}
        >
          <div className="font-extrabold text-lg sm:text-xl leading-tight whitespace-nowrap">
            SUA ÚLTIMA OPORTUNIDADE ⏱️
          </div>
          <div className="mt-2 text-base sm:text-lg text-white/85">
            Se fechar essa página você perde todos os benefícios exclusivos da nossa promoção de Copa.
          </div>
        </div>

        {/* 4) BENEFITS BOX */}
        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 space-y-3 shadow-sm">
          <div className="font-bold text-sm text-neutral-900 text-center">
            Benefícios exclusivos da promoção
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

        {/* 5) OFFER CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
          {/* Diagonal ribbon */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "14px",
              right: "-38px",
              width: "120px",
              transform: "rotate(45deg)",
              backgroundColor: OLIVE,
              color: "#fff",
              textAlign: "center",
              padding: "3px 0",
              fontWeight: 700,
              fontSize: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            SÓ R$1
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center flex-1">
              <h1 className="font-extrabold text-2xl text-neutral-900 leading-tight text-center">
                Premier FC
              </h1>
            </div>
            <div className="bg-neutral-100 rounded-xl px-3 py-2 text-center">
              <div className="font-extrabold text-2xl text-neutral-900 leading-tight">
                R$ 1,00
              </div>
            </div>
          </div>
        </div>


        {/* 6) CTA */}
        <a
          href={CHECKOUT_URL}
          className="block w-full text-center rounded-xl py-4 font-extrabold uppercase tracking-wide text-white text-base sm:text-lg shadow-sm hover:opacity-95 transition"
          style={{ backgroundColor: OLIVE }}
        >
          Garantir acesso por R$1
        </a>

        {/* 7) PAYMENT METHODS */}
        <div className="flex justify-center">
          <img
            src={formasPagamento}
            alt="Formas de pagamento à vista: Mastercard, Elo, Visa, American Express, Boleto Bancário e Pix"
            className="w-full max-w-[262px] h-auto"
          />
        </div>


        {/* 9) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 10) GUARANTEE BLOCK */}
        <div className="text-center space-y-2">
          <div className="font-bold text-base" style={{ color: RED_TEXT }}>
            ⚠️ ATENÇÃO!
          </div>
          <p className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">
            Se você entrar no Premier FC e não conseguir pelo menos triplicar sua banca…
          </p>
          <p className="text-neutral-900 text-sm sm:text-base leading-snug">
            Vamos devolver <span className="font-bold">cada centavo</span> que você pagou. É 100% sem risco pra você! 💯
          </p>
        </div>

        {/* 11) GUARANTEE SEAL */}
        <div className="flex flex-col items-center gap-3">
          <div className="font-bold text-base text-neutral-900">
            🛡️ Garantia Total de 30 Dias
          </div>
          <img
            src={seloGarantia}
            alt="Selo de Garantia 30 Dias"
            className="w-[200px] h-[200px] object-contain"
          />
        </div>

        {/* 12) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 13) FOOTER MICRO-COPY */}
        <p className="text-center text-xs text-neutral-500 pb-4">
          Pagamento 100% seguro • Acesso liberado no WhatsApp em minutos
        </p>
      </div>
    </div>
  );
}
