import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DispatchResult {
  success: boolean;
  dry_run: boolean;
  mock?: boolean;
  schedule_id: string;
  channel: string;
  broadcast: boolean;
  reach: number;
  delivered: number;
  failed: number;
  opened?: number;
  clicked?: number;
  final_status: string;
}

/**
 * Hook pra invocar a edge function `crm-process-schedule`.
 *
 * Sub-fase 1.6b: mock providers (default). Edge function simula latência,
 * 95% delivered, taxas realistas de open (40%) e click (8%).
 * Em Pilar 4: dryRun=false vai pra providers reais.
 */
export function useDispatchSchedule() {
  const [dispatching, setDispatching] = useState<string | null>(null);

  const dispatch = useCallback(
    async (
      scheduleId: string,
      opts: { dryRun?: boolean } = {}
    ): Promise<DispatchResult | null> => {
      setDispatching(scheduleId);
      try {
        const { data, error } = await supabase.functions.invoke<DispatchResult>(
          "crm-process-schedule",
          {
            body: {
              schedule_id: scheduleId,
              dry_run: opts.dryRun ?? true,
            },
          }
        );
        if (error) {
          console.error("[useDispatchSchedule] erro:", error, "data:", data);
          const detail =
            (data as any)?.error || (data as any)?.details || error.message || "desconhecido";
          toast.error(`Erro no disparo: ${detail}`);
          return null;
        }
        if (!data) {
          toast.error("Erro no disparo: resposta vazia");
          return null;
        }
        const result = data as DispatchResult;
        const prefix = result.mock || result.dry_run ? "[MOCK] " : "";

        if (result.broadcast) {
          if (result.delivered > 0) {
            toast.success(`${prefix}Broadcast enviado via ${result.channel}`);
          } else {
            toast.error(
              `${prefix}Broadcast falhou via ${result.channel} (canal bloqueado ou erro do provider)`
            );
          }
        } else {
          const engagement =
            (result.opened ?? 0) > 0 || (result.clicked ?? 0) > 0
              ? ` · ${result.opened ?? 0} aberturas · ${result.clicked ?? 0} cliques`
              : "";

          if (result.delivered === 0 && result.failed > 0) {
            toast.error(
              `${prefix}Disparo falhou: 0 entregues, ${result.failed} falhas`
            );
          } else {
            toast.success(
              `${prefix}Disparo concluído: ${result.delivered} entregues de ${result.reach}` +
                (result.failed > 0 ? ` · ${result.failed} falhas` : "") +
                engagement
            );
          }
        }
        return result;
      } catch (e: any) {
        console.error("[useDispatchSchedule] exception:", e);
        toast.error(`Erro: ${e.message ?? String(e)}`);
        return null;
      } finally {
        setDispatching(null);
      }
    },
    []
  );

  return { dispatch, dispatching };
}
