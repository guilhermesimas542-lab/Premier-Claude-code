import { useState } from "react";
import { UserPlus, FastForward, Zap, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJourneyMockOps } from "../../../hooks/crm/useJourneyMockOps";
import type { Journey } from "../../../hooks/crm/useJourneys";
import type { JourneyStep } from "../../../hooks/crm/useJourneySteps";

interface Props {
  journey: Journey;
  steps: JourneyStep[];
  onChanged: () => void;
}

const COUNT_OPTIONS = [1, 5, 10, 50, 100];

/**
 * Painel mock no detalhe da jornada — simula triggers manualmente.
 * (Sub-fase 2.5: substitui o que seria webhook de cadastro/upgrade/job de churn em prod.)
 */
export function MockTriggerPanel({ journey, steps, onChanged }: Props) {
  const { busy, enrollLeads, processSteps } = useJourneyMockOps();
  const [count, setCount] = useState(1);

  const isActive = journey.status === "active";
  const hasSteps = steps.length > 0;

  const handleEnroll = async () => {
    const r = await enrollLeads(journey, steps, count);
    if (r) onChanged();
  };

  const handleProcess = async (forceNow: boolean) => {
    const r = await processSteps(journey, steps, { forceNow });
    if (r) onChanged();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-foreground">Triggers mock</h2>
          <p className="text-xs text-muted-foreground">
            Simula a entrada de leads (em produção viriam via webhook de cadastro,
            upgrade ou job de churn) e avança os passos pendentes.
          </p>
        </div>
      </div>

      {!isActive && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            A jornada está como{" "}
            <strong>{journey.status === "paused" ? "pausada" : journey.status}</strong>.
            Você pode inscrever leads mesmo assim para testar, mas em produção só
            jornadas ativas receberiam novos leads.
          </p>
        </div>
      )}

      {!hasSteps && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            Esta jornada não tem passos. Inscrever leads vai marcá-los como completados
            instantaneamente. Adicione passos primeiro.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
        {/* Inscrever leads */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Inscrever leads (mock)
          </Label>
          <div className="flex gap-2">
            <Select
              value={String(count)}
              onValueChange={(v) => setCount(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "lead" : "leads"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleEnroll}
              disabled={busy !== null}
              className="flex-1"
            >
              {busy === "enroll" ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Inscrever
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sorteia leads da audiência da jornada e cria enrollments ativos.
          </p>
        </div>

        {/* Processar passos */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Avançar passos
          </Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleProcess(false)}
              disabled={busy !== null}
              className="flex-1"
            >
              {busy === "process" ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FastForward className="w-3.5 h-3.5 mr-1.5" />
              )}
              Processar pendentes
            </Button>
            <Button
              variant="outline"
              onClick={() => handleProcess(true)}
              disabled={busy !== null}
              className="flex-1"
              title="Ignora delay — útil pra testes"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Forçar agora
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            "Processar pendentes" respeita o delay. "Forçar agora" ignora — todos
            enrollments ativos avançam um passo.
          </p>
        </div>
      </div>
    </section>
  );
}
