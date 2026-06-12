import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Mail, Clock, GitBranch, Tag, Info } from "lucide-react";
import { CHANNELS, type ChannelKey } from "@/admin/lib/crm/channels";
import type { DelayUnit } from "@/admin/hooks/crm/useJourneyGraph";
import type { NodeMetrics } from "@/admin/lib/crm/journeyMetrics";
import { formatCLP } from "@/admin/components/revenue/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NodeData {
  channel: ChannelKey | null;
  content: Record<string, any>;
  config: Record<string, any>;
  delay_value: number | null;
  delay_unit: DelayUnit | null;
  label: string;
  metrics?: NodeMetrics;
}

const UNIT_LABEL: Record<DelayUnit, string> = {
  minute: "min",
  hour: "h",
  day: "dia(s)",
  week: "sem",
};

function MetricsFooter({ metrics }: { metrics?: NodeMetrics }) {
  if (!metrics || metrics.sent === 0) return null;
  const pct = Math.round(metrics.openRate * 100);
  return (
    <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span>Enviados: <b className="text-foreground">{metrics.sent}</b></span>
      <span className="flex items-center gap-0.5">
        Abertura: <b className="text-foreground">{pct}%</b>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-2.5 h-2.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[220px]">
              Estimativa (mock) até a integração de webhooks dos provedores.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
      {metrics.converted > 0 && (
        <span className="text-emerald-600 font-bold">
          💰 {metrics.converted} · {formatCLP(metrics.conversionValueCents / 100)}
        </span>
      )}
    </div>
  );
}

function Card({
  color,
  icon,
  title,
  subtitle,
  metrics,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  metrics?: NodeMetrics;
}) {
  const hasConv = (metrics?.converted ?? 0) > 0;
  return (
    <div
      className="rounded-xl border-2 bg-card shadow-md min-w-[200px] px-3 py-2.5 relative"
      style={{
        borderColor: hasConv ? "#10B981" : color,
        boxShadow: hasConv ? "0 0 0 3px rgba(16,185,129,0.25)" : undefined,
      }}
    >
      {hasConv && (
        <div className="absolute -top-2 -right-2 text-base">💰</div>
      )}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <MetricsFooter metrics={metrics} />
    </div>
  );
}

export function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <>
      <Card color="#10B981" icon={<Play className="w-3.5 h-3.5" />} title="Gatilho" subtitle={d.config?.trigger_type ?? "início"} metrics={d.metrics} />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export function MessageNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  const ch = d.channel ? CHANNELS[d.channel] : null;
  const color = ch?.color ?? "#60A5FA";
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color={color}
        icon={<Mail className="w-3.5 h-3.5" />}
        title="Mensagem"
        subtitle={ch?.label ?? "canal não definido"}
        metrics={d.metrics}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export function WaitNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  const v = d.delay_value;
  const u = d.delay_unit;
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#F59E0B"
        icon={<Clock className="w-3.5 h-3.5" />}
        title="Esperar"
        subtitle={v && u ? `${v} ${UNIT_LABEL[u]}` : "duração a definir"}
        metrics={d.metrics}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

const EVENT_LABEL: Record<string, string> = {
  opened: "Abriu",
  clicked: "Clicou",
  converted: "Converteu",
};

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  const ev = d.config?.event;
  const w = d.config?.window_hours;
  const subtitle = ev ? `${EVENT_LABEL[ev] ?? ev} em ${w ?? 72}h` : "ramificação";
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#A855F7"
        icon={<GitBranch className="w-3.5 h-3.5" />}
        title="Condição"
        subtitle={subtitle}
        metrics={d.metrics}
      />
      <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "30%" }} />
      <Handle id="no" type="source" position={Position.Bottom} style={{ left: "70%" }} />
      <div className="flex justify-between px-2 mt-1 text-[10px] font-bold text-muted-foreground">
        <span>sim</span>
        <span>não</span>
      </div>
    </>
  );
}

export function TagNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  const action = d.config?.action === "remove" ? "Remover" : "Marcar";
  const tag = d.config?.tag;
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#EC4899"
        icon={<Tag className="w-3.5 h-3.5" />}
        title="Tag"
        subtitle={tag ? `${action}: ${tag}` : "tag a definir"}
        metrics={d.metrics}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export { StageNode, STAGE_COLORS } from "./StageNode";
