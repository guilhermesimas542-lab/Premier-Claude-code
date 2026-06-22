/**
 * Dots de progresso no topo do modal — mesmo padrão visual usado em
 * `IATipsterOnboardingModal` no app de produção.
 */
export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4 pb-3">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <span
            key={idx}
            className="rounded-full transition-all duration-300"
            style={{
              width: active ? 22 : 8,
              height: 8,
              background: done
                ? "#00FF87"
                : active
                  ? "#00FF87"
                  : "rgba(234,192,100,0.25)",
            }}
          />
        );
      })}
    </div>
  );
}
