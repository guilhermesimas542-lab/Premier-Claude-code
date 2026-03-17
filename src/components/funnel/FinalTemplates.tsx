import { useState, useEffect } from "react";
import { Check, X, Gift, Users, Clock, TrendingDown } from "lucide-react";

export type FinalTemplateType =
  | "default"
  | "urgency"
  | "price_anchor"
  | "social_proof"
  | "scarcity_countdown"
  | "bonus_offer"
  | "plan_comparison";

export interface FinalConfig {
  subtitle?: string;
  button_text?: string;
  button_text_2?: string;
  button_text_color?: string;
  old_price?: string;
  new_price?: string;
  client_count?: number;
  testimonial_1?: string;
  client_name_1?: string;
  countdown_end?: string; // legacy, no longer used
  bonus_title?: string;
  bonus_description?: string;
  bonus_value?: string;
  comparison_items?: { text: string; included_current: boolean }[];
  header_current?: string;
  header_new?: string;
}

export interface BaseProps {
  title: string;
  benefits: string[];
  checkoutLink: string | null;
  checkoutLink2?: string | null;
  onCheckout: (url: string) => void;
  onClose: () => void;
  config: FinalConfig;
  buttonColor?: string | null;
}

/* ─── Shared pieces ─── */
const BenefitsList = ({ benefits }: { benefits: string[] }) => (
  <ul className="space-y-2">
    {benefits.map((b, i) => (
      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
        <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-primary/15">
          <Check className="w-3 h-3 text-primary" />
        </span>
        {b}
      </li>
    ))}
  </ul>
);

const CTAButton = ({ text, url, onClick, color }: { text: string; url: string | null; onClick: (u: string) => void; color?: string | null }) =>
  url ? (
    <button
      onClick={() => onClick(url)}
      className="block w-full py-4 text-center font-bold text-primary-foreground rounded-xl text-sm tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98] animate-[cta-pulse_2s_ease-in-out_infinite]"
      style={{
        backgroundColor: color || "hsl(var(--primary))",
        boxShadow: `0 0 20px ${color ? color + "4d" : "hsl(var(--primary) / 0.3)"}`,
      }}
    >
      {text || "QUERO ACESSAR AGORA →"}
    </button>
  ) : null;

/* ─── Template 1: Urgência Simples ─── */
export function TemplateUrgency({ title, benefits, checkoutLink, onCheckout, config, buttonColor }: BaseProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      <div className="flex justify-center">
        <div className="w-3/4 h-[2px] rounded-full bg-red-500 animate-pulse" />
      </div>
      <BenefitsList benefits={benefits} />
      <CTAButton text={config.button_text || "QUERO ACESSAR AGORA →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
    </div>
  );
}

/* ─── Template 2: Ancoragem de Preço ─── */
export function TemplatePriceAnchor({ title, benefits, checkoutLink, onCheckout, config, buttonColor }: BaseProps) {
  const oldNum = parseFloat((config.old_price || "0").replace(/[^\d.,]/g, "").replace(",", "."));
  const newNum = parseFloat((config.new_price || "0").replace(/[^\d.,]/g, "").replace(",", "."));
  const discount = oldNum > 0 ? Math.round(((oldNum - newNum) / oldNum) * 100) : 0;

  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      <div className="flex items-center justify-center gap-4 py-3">
        <span className="text-lg text-muted-foreground line-through">{config.old_price}</span>
        <span className="text-3xl font-extrabold text-primary">{config.new_price}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary">
            <TrendingDown className="w-3.5 h-3.5" /> Você economiza {discount}%!
          </span>
        </div>
      )}
      <BenefitsList benefits={benefits} />
      <CTAButton text={config.button_text || "GARANTIR DESCONTO →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
    </div>
  );
}

/* ─── Template 3: Prova Social ─── */
export function TemplateSocialProof({ title, benefits, checkoutLink, onCheckout, config, buttonColor }: BaseProps) {
  const count = config.client_count ?? 0;
  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      {count > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <Users className="w-4 h-4" />
          Junte-se a mais de {count.toLocaleString("pt-BR")} apostadores de sucesso!
        </div>
      )}
      {config.testimonial_1 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-sm italic text-foreground/80">"{config.testimonial_1}"</p>
          {config.client_name_1 && <p className="text-xs text-muted-foreground text-right">— {config.client_name_1}</p>}
        </div>
      )}
      <BenefitsList benefits={benefits} />
      <CTAButton text={config.button_text || "QUERO ACESSAR AGORA →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
    </div>
  );
}

/* ─── Template 4: Escassez com Contador (fixed 10 min) ─── */
function useCountdown10Min() {
  const [remaining, setRemaining] = useState({ m: 10, s: 0, expired: false });
  const [endTime] = useState(() => Date.now() + 10 * 60 * 1000);

  useEffect(() => {
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setRemaining({ m: 0, s: 0, expired: true }); return; }
      setRemaining({
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return remaining;
}

export function TemplateScarcityCountdown({ title, benefits, checkoutLink, onCheckout, config, buttonColor }: BaseProps) {
  const cd = useCountdown10Min();
  const unit = (n: number, l: string) => (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold text-primary tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="text-[10px] text-muted-foreground uppercase">{l}</span>
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      <div className="flex items-center justify-center gap-3 py-2">
        <Clock className="w-5 h-5 text-red-400 animate-pulse" />
        {cd.expired ? (
          <span className="text-sm font-bold text-red-400">Oferta expirada!</span>
        ) : (
          <div className="flex gap-3">
            {unit(cd.m, "min")}
            <span className="text-xl font-bold text-muted-foreground self-start mt-0.5">:</span>
            {unit(cd.s, "seg")}
          </div>
        )}
      </div>
      <p className="text-xs text-center text-muted-foreground">Esta oferta exclusiva termina em breve...</p>
      <BenefitsList benefits={benefits} />
      <CTAButton text={config.button_text || "GARANTIR AGORA →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
    </div>
  );
}

/* ─── Template 5: Oferta de Bônus ─── */
export function TemplateBonusOffer({ title, benefits, checkoutLink, onCheckout, config, buttonColor }: BaseProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      <BenefitsList benefits={benefits} />
      {config.bonus_title && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary">
            <Gift className="w-4 h-4" /> + BÔNUS EXCLUSIVO HOJE
          </div>
          <p className="text-sm font-bold text-foreground">{config.bonus_title}</p>
          {config.bonus_description && <p className="text-xs text-foreground/70">{config.bonus_description}</p>}
          {config.bonus_value && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground line-through">{config.bonus_value}</span>
              <span className="text-xs font-bold text-primary">Grátis hoje</span>
            </div>
          )}
        </div>
      )}
      <CTAButton text={config.button_text || "QUERO TUDO AGORA →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
    </div>
  );
}

/* ─── Template 6: Comparativo de Planos ─── */
export function TemplatePlanComparison({ title, benefits, checkoutLink, checkoutLink2, onCheckout, config, buttonColor }: BaseProps) {
  const items = config.comparison_items ?? benefits.map((b) => ({ text: b, included_current: false }));
  return (
    <div className="p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground leading-snug">{title}</h2>
        {config.subtitle && <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>}
      </div>
      <div className="rounded-lg border border-border overflow-hidden text-xs">
        <div className="grid grid-cols-[1fr,80px,80px] bg-muted/40 text-muted-foreground font-semibold">
          <div className="px-3 py-2">Recurso</div>
          <div className="px-2 py-2 text-center">{config.header_current ?? "Atual"}</div>
          <div className="px-2 py-2 text-center text-primary">{config.header_new ?? "Novo"}</div>
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr,80px,80px] border-t border-border">
            <div className="px-3 py-2 text-foreground/80">{item.text}</div>
            <div className="px-2 py-2 flex justify-center items-center">
              {item.included_current ? (
                <Check className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <X className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
            <div className="px-2 py-2 flex justify-center items-center">
              <Check className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        ))}
      </div>
      <CTAButton text={config.button_text || "FAZER UPGRADE →"} url={checkoutLink} onClick={onCheckout} color={buttonColor} />
      {checkoutLink2 && (
        <button
          onClick={() => onCheckout(checkoutLink2)}
          className="block w-full py-3 text-center font-bold text-white rounded-xl text-sm tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            marginTop: "12px",
            border: "1.5px solid rgba(255,255,255,0.3)",
            background: "transparent",
          }}
        >
          {(config as any).button_text_2 || "Basic — R$27"}
        </button>
      )}
    </div>
  );
}

/* ─── Dispatcher ─── */
export function renderFinalTemplate(
  template: FinalTemplateType,
  props: BaseProps
) {
  switch (template) {
    case "urgency":
      return <TemplateUrgency {...props} />;
    case "price_anchor":
      return <TemplatePriceAnchor {...props} />;
    case "social_proof":
      return <TemplateSocialProof {...props} />;
    case "scarcity_countdown":
      return <TemplateScarcityCountdown {...props} />;
    case "bonus_offer":
      return <TemplateBonusOffer {...props} />;
    case "plan_comparison":
      return <TemplatePlanComparison {...props} />;
    default:
      return null;
  }
}
