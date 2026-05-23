import { useState } from "react";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins, Infinity as InfinityIcon, Plus } from "lucide-react";
import { BuyCreditsModal } from "@/components/ia-tipster/BuyCreditsModal";

function formatResetDate(iso: string | null): string {
  if (!iso) return "segunda-feira";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "segunda-feira";
  }
}

function formatUntil(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch { return ""; }
}

export function CreditBalanceBadge() {
  const { balance, loading } = useCreditBalance();
  const [buyOpen, setBuyOpen] = useState(false);

  if (loading && !balance) {
    return (
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
        ...
      </span>
    );
  }
  if (!balance) return null;

  // Unlimited active state
  if (balance.unlimited_active) {
    const untilLabel = formatUntil(balance.unlimited_until);
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
        <InfinityIcon className="w-3 h-3" />
        Ilimitado{untilLabel ? ` até ${untilLabel}` : ""}
      </span>
    );
  }

  const total = balance.total_available;
  const weeklyRemaining = balance.weekly_remaining;
  const resetLabel = formatResetDate(balance.resets_at);

  let colorClasses = "text-primary bg-primary/10 hover:bg-primary/20";
  if (total === 0) {
    colorClasses = "text-destructive bg-destructive/10 hover:bg-destructive/20";
  } else if (weeklyRemaining === 0) {
    colorClasses = "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20";
  }

  const label =
    total === 0
      ? `0 créditos · Renova ${resetLabel}`
      : `${total} crédito${total === 1 ? "" : "s"}`;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${colorClasses}`}
          >
            <Coins className="w-3 h-3" />
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 text-xs space-y-2">
          <div className="font-semibold text-sm">Seus créditos</div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cota semanal</span>
            <span className="font-medium">
              {balance.weekly_remaining}/{balance.weekly_quota}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bônus</span>
            <span className="font-medium">{balance.extras_bonus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comprados</span>
            <span className="font-medium">{balance.extras_purchased}</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="text-muted-foreground">Próximo reset</span>
            <span className="font-medium">{resetLabel}</span>
          </div>
          <button
            onClick={() => setBuyOpen(true)}
            className="w-full mt-2 inline-flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" /> Comprar créditos
          </button>
        </PopoverContent>
      </Popover>
      <BuyCreditsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </>
  );
}
