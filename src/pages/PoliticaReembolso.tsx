import { useEffect } from "react";

const SUPPORT_WHATSAPP_LABEL = "(38) 99729-8728";
const SUPPORT_WHATSAPP_URL = "https://wa.me/5538997298728";
const OLIVE = "#4D7A1F";

export default function PoliticaReembolso() {
  useEffect(() => {
    document.title = "Política de Assinatura & Reembolso | Premier FC";
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[680px] px-5 py-10 flex flex-col gap-7">
        <header className="space-y-1">
          <h1 className="font-extrabold text-2xl sm:text-3xl leading-tight">
            Política de Assinatura &amp; Reembolso
          </h1>
          <p className="text-sm text-neutral-500">Premier FC</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            1. Como funciona a assinatura
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Você paga <strong>R$1 no primeiro mês</strong> e, a partir da
            primeira renovação, <strong>R$99 por mês</strong>, cobrados
            automaticamente no mesmo cartão. A cobrança se repete todo mês até
            você cancelar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            2. Cancelamento — a qualquer momento, sem multa
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Você pode cancelar quando quiser. Para não ser cobrado no próximo
            mês, cancele <strong>antes da data da próxima renovação</strong>.
            Seu acesso continua até o fim do período já pago.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            3. Garantia de 30 dias
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Se você não ficar satisfeito, devolvemos{" "}
            <strong>100% do valor pago</strong> se solicitado em até{" "}
            <strong>30 dias</strong> da contratação. Essa garantia já inclui o
            direito de arrependimento de 7 dias previsto no Código de Defesa do
            Consumidor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            4. Renovações já cobradas
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            As mensalidades de R$99 já cobradas não são reembolsáveis, pois o
            acesso do período já foi liberado. Ao cancelar,{" "}
            <strong>nenhuma cobrança futura</strong> acontece.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            5. Como pedir cancelamento ou reembolso
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Fale com a gente no WhatsApp{" "}
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: OLIVE }}>
              {SUPPORT_WHATSAPP_LABEL}
            </a>{" "}
            e informe o <strong>e-mail e o CPF</strong> usados na compra.
            Resolvemos rápido.
          </p>
        </section>

        <footer className="border-t border-neutral-200 pt-5 text-xs text-neutral-400">
          Premier FC • Pagamentos processados pela Payt.
        </footer>
      </div>
    </div>
  );
}
