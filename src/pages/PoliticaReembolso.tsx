import { useEffect } from "react";

const SUPPORT_WHATSAPP_LABEL = "(38) 99729-8728";
const SUPPORT_WHATSAPP_URL = "https://wa.me/5538997298728";
const OLIVE = "#4D7A1F";

export default function PoliticaReembolso() {
  useEffect(() => {
    document.title = "Política de Suscripción & Reembolso | CL Score";
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[680px] px-5 py-10 flex flex-col gap-7">
        <header className="space-y-1">
          <h1 className="font-extrabold text-2xl sm:text-3xl leading-tight">
            Política de Suscripción &amp; Reembolso
          </h1>
          <p className="text-sm text-neutral-500">CL Score</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            1. Cómo funciona la suscripción
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Pagas <strong>$1 el primer mes</strong> y, a partir de la
            primera renovación, <strong>$99 por mes</strong>, cobrados
            automáticamente en la misma tarjeta. El cobro se repite cada mes hasta
            que canceles.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            2. Cancelación — en cualquier momento, sin penalización
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Puedes cancelar cuando quieras. Para que no se te cobre el próximo
            mes, cancela <strong>antes de la fecha de la próxima renovación</strong>.
            Tu acceso continúa hasta el final del período ya pagado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            3. Garantía de 30 días
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Si no quedas satisfecho, devolvemos{" "}
            <strong>100% del importe pagado</strong> si lo solicitas dentro de{" "}
            <strong>30 días</strong> desde la contratación. Esta garantía ya incluye el
            derecho de retracto previsto en la normativa de protección al
            consumidor de Chile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            4. Renovaciones ya cobradas
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Las mensualidades de $99 ya cobradas no son reembolsables, pues el
            acceso del período ya fue liberado. Al cancelar,{" "}
            <strong>no se produce ningún cobro futuro</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-lg" style={{ color: OLIVE }}>
            5. Cómo pedir cancelación o reembolso
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            Habla con nosotros por WhatsApp{" "}
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: OLIVE }}>
              {SUPPORT_WHATSAPP_LABEL}
            </a>{" "}
            e indica el <strong>correo electrónico y el documento de identidad</strong> usados en la compra.
            Lo resolvemos rápido.
          </p>
        </section>

        <footer className="border-t border-neutral-200 pt-5 text-xs text-neutral-400">
          CL Score • Pagos procesados por Payt.
        </footer>
      </div>
    </div>
  );
}
