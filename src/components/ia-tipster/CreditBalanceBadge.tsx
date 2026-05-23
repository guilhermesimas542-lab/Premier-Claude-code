import { useCreditBalance } from "@/hooks/useCreditBalance";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins } from "lucide-react";

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

export function CreditBalanceBadge() {
  const { balance, loading } = useCreditBalance();

  if (loading && !balance) {
    return (
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
        ...
      </span>
    );
  }

  if (!balance) {
    return null;
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
      </PopoverContent>
    </Popover>
  );
}
