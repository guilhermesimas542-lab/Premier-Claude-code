import {
  ArrowRight,
  BadgeCheck,
  Compass,
  type LucideIcon,
  Rocket,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";

interface SummaryItem {
  /** Número exibido no badge à esquerda. */
  num: number;
  /** Título curto do step (1 linha). */
  title: string;
  /** Linha-suporte (1 frase, benefício — sem mencionar "vídeo", "telegram" etc). */
  hint: string;
}

interface Props {
  /** Nome do lead (vem do webhook). Se vazio, usa fallback discreto. */
  firstName?: string;
  /** Lista dos próximos passos — montada em `data/steps.tsx`. */
  items: SummaryItem[];
}

/**
 * Step 1 — Resumo do onboarding.
 *
 * Paleta usa **verde Matrix `#00FF87`** (descoberta/destrava) alternando
 * com **gold `#00FF87`** (premium/identidade) — pra ter respiro visual e
 * não ficar amarelo no app inteiro.
 *
 * Copy é benefício, não tarefa: nunca dizer "vídeo", "telegram", "criar conta"
 * — diminui retenção. Foco no que o lead ganha.
 */
export function Step1Summary({ firstName, items }: Props) {
  const name = firstName?.trim();

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <BackgroundGlow />

      <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-2">
        <Header name={name} />
        <ItemList items={items} />
      </div>
    </div>
  );
}

/* ─────────────────── background ─────────────────── */

function BackgroundGlow() {
  // Dois orbs radiais (verde + gold) + uma linha-trilha verde leve subindo
  // do rodapé pra dar "movimento" suave sem JS.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-24 top-8 h-72 w-72 rounded-full opacity-35 blur-3xl"
        style={{
          background: "radial-gradient(circle, #00FF87 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -right-24 top-1/3 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, #00FF87 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-40 w-[120%] -translate-x-1/2 opacity-30 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at bottom, rgba(0,255,135,0.35) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/* ─────────────────── header ─────────────────── */

function Header({ name }: { name?: string }) {
  return (
    <header className="mb-7 flex flex-col items-center text-center animate-fade-in-scale">
      <BrandMark />

      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#00FF87]/35 bg-[#00FF87]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FF87]">
        <Sparkles className="h-3 w-3" /> Partamos
      </span>

      <h1 className="mt-4 font-display text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-[34px]">
        Hola
        {name ? (
          <>
            ,{" "}
            <span
              style={{
                background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {name}
            </span>
          </>
        ) : null}
        .
      </h1>

      <p className="mt-3 max-w-xs text-sm leading-snug text-white/65">
        Ya creamos tu cuenta y estás dentro. En pocos minutos quedas listo
        para usar la app.
      </p>

      <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/70">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#00FF87] opacity-70" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[#00FF87]" />
        </span>
        ~3 minutos · todo dentro de la app
      </span>
    </header>
  );
}

function BrandMark() {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute inset-0 -m-2 rounded-3xl blur-xl"
        style={{
          background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
          opacity: 0.45,
        }}
      />
      <div
        className="relative grid h-16 w-16 place-items-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
          boxShadow: "0 8px 32px rgba(0,255,135,0.25)",
        }}
      >
        <Trophy className="h-7 w-7 text-[#0c1a2d]" strokeWidth={2.4} />
      </div>
    </div>
  );
}

/* ─────────────────── lista ─────────────────── */

const ICONS: LucideIcon[] = [Compass, Smartphone, BadgeCheck, Rocket];

function ItemList({ items }: { items: SummaryItem[] }) {
  return (
    <section className="flex-1">
      <ol className="space-y-2.5">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? Sparkles;
          // Todos os passos em verde Matrix (mesma identidade do CTA + ping).
          const accent = "#00FF87";

          return (
            <li
              key={item.num}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3 animate-slide-up"
              style={{
                animationDelay: `${80 + i * 70}ms`,
                animationFillMode: "both",
              }}
            >
              {/* Acento lateral colorido — linha vertical sutil */}
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full"
                style={{ background: accent, opacity: 0.85 }}
              />

              <span
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${accent}26 0%, ${accent}08 100%)`,
                  border: `1px solid ${accent}55`,
                  boxShadow: `0 0 16px ${accent}22`,
                }}
              >
                <Icon className="h-7 w-7" style={{ color: accent }} strokeWidth={2.2} />
                <span
                  className="absolute -bottom-1.5 -right-1.5 grid h-[22px] w-[22px] place-items-center rounded-full font-display text-[11px] font-extrabold leading-none"
                  style={{
                    background: "#0c1a2d",
                    color: accent,
                    border: `1.5px solid ${accent}99`,
                  }}
                >
                  {item.num}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] font-extrabold uppercase leading-tight tracking-tight text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-[13.5px] font-medium leading-[1.45] text-white/80">
                  {item.hint}
                </p>
              </div>

              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

