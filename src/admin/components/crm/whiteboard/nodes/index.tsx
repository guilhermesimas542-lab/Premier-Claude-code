import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Mail, Clock, GitBranch, Tag } from "lucide-react";
import { CHANNELS, type ChannelKey } from "@/admin/lib/crm/channels";

interface NodeData {
  channel: ChannelKey | null;
  content: Record<string, any>;
  config: Record<string, any>;
  label: string;
}

function Card({
  color,
  icon,
  title,
  subtitle,
  children,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border-2 bg-card shadow-md min-w-[180px] px-3 py-2.5"
      style={{ borderColor: color }}
    >
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
      {children}
    </div>
  );
}

export function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <>
      <Card color="#10B981" icon={<Play className="w-3.5 h-3.5" />} title="Gatilho" subtitle={d.config?.trigger_type ?? "início"} />
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
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export function WaitNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  const v = d.config?.delay_value;
  const u = d.config?.delay_unit;
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#F59E0B"
        icon={<Clock className="w-3.5 h-3.5" />}
        title="Esperar"
        subtitle={v && u ? `${v} ${u}` : "duração a definir"}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#A855F7"
        icon={<GitBranch className="w-3.5 h-3.5" />}
        title="Condição"
        subtitle={d.config?.expression ?? "ramificação"}
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
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        color="#EC4899"
        icon={<Tag className="w-3.5 h-3.5" />}
        title="Marcar usuário"
        subtitle={d.config?.tag ?? "tag a definir"}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}
