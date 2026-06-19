import type { PropsWithChildren } from "react";

/**
 * Mock visual descartável da Home do app de produção.
 * Só serve pra eu enxergar como o OnboardingModal fica sobreposto ao app.
 * Quando o componente onboarding for plugado no app real, este mock vai pra lixeira.
 *
 * Espelha de longe a estrutura do `Home.tsx` + `AppHeader.tsx` + `BottomNav.tsx`
 * (header com pílulas → entradas → grid de acesso rápido → últimos greens → bottom nav).
 */
export function AppMockShell({ children }: PropsWithChildren) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background text-foreground">
      <MockHeader />
      <main className="flex-1 px-4 pt-3 pb-24">
        <MockEntries />
        <MockQuickAccess />
        <MockLastGreens />
      </main>
      <MockBottomNav />
      {children}
    </div>
  );
}

function MockHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur"
      style={{
        background: "rgba(11,22,40,0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg font-display text-base font-extrabold uppercase"
          style={{ background: "linear-gradient(135deg,#1a2d4a,#0b1628)", color: "#F2C84B" }}
        >
          P
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
            CLSCORE
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">in-app</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MockPill tone="telegram" label="Telegram" />
        <MockPill tone="lifetime" label="Vitalicio" />
      </div>
    </header>
  );
}

function MockPill({ tone, label }: { tone: "telegram" | "lifetime"; label: string }) {
  const styles =
    tone === "telegram"
      ? { borderColor: "rgba(0,255,127,0.4)", color: "#00FF87" }
      : { borderColor: "rgba(242,200,75,0.5)", color: "#F2C84B" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={styles}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: styles.color }} />
      {label}
    </span>
  );
}

function MockEntries() {
  return (
    <section className="mb-5">
      <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Entradas
      </h2>
      <div className="grid gap-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-3 text-card-foreground"
            style={{ background: "var(--gradient-card)" }}
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Primera Chile · hoy 19:30</span>
              <span style={{ color: "#00FF87" }}>● en vivo pronto</span>
            </div>
            <p className="mt-1 font-display text-base font-bold uppercase">Colo-Colo × U. de Chile</p>
            <p className="text-xs text-muted-foreground">Más de 2.5 goles · cuota 1.85</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockQuickAccess() {
  const items = [
    { label: "Fútbol", glow: true },
    { label: "Casino" },
    { label: "Cuotas Altas" },
    { label: "Apalancamiento" },
  ];
  return (
    <section className="mb-5">
      <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Acceso rápido
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className={`aspect-square rounded-xl border bg-card p-3 ${it.glow ? "animate-card-highlight-pulse" : ""}`}
            style={{
              borderColor: it.glow ? "rgba(0,255,127,0.5)" : "rgba(255,255,255,0.06)",
              background: "var(--gradient-card)",
            }}
          >
            <p className="font-display text-sm font-extrabold uppercase">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockLastGreens() {
  return (
    <section>
      <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Últimos aciertos
      </h2>
      <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
        Mock placeholder.
      </div>
    </section>
  );
}

function MockBottomNav() {
  const items = [
    { label: "Tips", active: true },
    { label: "IA Tipster" },
    { label: "Perfil" },
  ];
  // (Tips e Perfil são iguais ou aceitáveis em ES; mantidos.)
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20"
      style={{
        height: 64,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(11,22,40,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-4">
        {items.map((item) => (
          <button
            key={item.label}
            className="relative grid place-items-center rounded-xl px-4 py-2"
            style={{ background: item.active ? "rgba(224,179,65,0.12)" : undefined }}
          >
            <span
              className="font-display text-[10px] font-bold uppercase tracking-wider"
              style={{ color: item.active ? "#F2C84B" : "#E0B341" }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
