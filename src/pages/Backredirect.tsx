import { useEffect, useState } from "react";
import formasPagamento from "@/assets/formas-pagamento.png";
import seloGarantia from "@/assets/selo-garantia-30.png";

const CHECKOUT_URL = "[URL_CHECKOUT_DESCONTO]";

const OLIVE = "#4D7A1F";
const RED_BG = "#FDECEC";
const RED_TEXT = "#B91C1C";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Backredirect() {
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  useEffect(() => {
    document.title = "Última chance: R$10 OFF | Premier FC";
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
          ESSA OFERTA EXPIRA EM: {pad(mm)}:{pad(ss)}
        </div>
      )}

      <div className="mx-auto w-full max-w-[420px] px-5 py-6 flex flex-col gap-6">
        {/* 2) HEADLINE BANNER */}
        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-sm"
          style={{ backgroundColor: OLIVE }}
        >
          <div className="font-extrabold text-2xl sm:text-3xl leading-tight">
            🔥 DESCONTO DE R$10!
          </div>
          <div className="mt-2 text-base sm:text-lg text-white/85">
            Economize R$10 e garanta seu acesso ao PremierFC agora.
          </div>
        </div>

        {/* 3) OFFER CARD */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="font-extrabold text-2xl text-neutral-900 leading-tight">
                Premier FC
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Acesso vitalício • Pagamento único
              </p>
            </div>
            <div className="bg-neutral-100 rounded-xl px-3 py-2 text-right">
              <div className="text-xs text-neutral-500 line-through leading-tight">
                De R$ 37,90 por
              </div>
              <div className="font-extrabold text-2xl text-neutral-900 leading-tight">
                R$ 27,90
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
          Garantir desconto de R$10
        </a>

        {/* 5) PAYMENT METHODS */}
        <div className="flex justify-center">
          <img
            src={formasPagamento}
            alt="Formas de pagamento à vista: Mastercard, Elo, Visa, American Express, Boleto Bancário e Pix"
            className="w-full max-w-[277px] h-auto"
          />
        </div>

        {/* 6) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 7) GUARANTEE BLOCK */}
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

        {/* 8) GUARANTEE SEAL */}
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

        {/* 6b) DASHED DIVIDER */}
        <div className="border-t border-dashed border-neutral-300" />

        {/* 9) FOOTER MICRO-COPY */}
        <p className="text-center text-xs text-neutral-500 pb-4">
          Pagamento 100% seguro • Acesso liberado no WhatsApp em minutos
        </p>
      </div>
    </div>
  );
}
