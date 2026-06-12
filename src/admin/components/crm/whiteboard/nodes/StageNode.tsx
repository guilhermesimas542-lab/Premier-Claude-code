import { useEffect, useRef, useState } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import { Layers, Palette, Pencil } from "lucide-react";
import type { StageMetrics } from "@/admin/lib/crm/journeyMetrics";
import { formatCLP } from "@/admin/components/revenue/constants";

export const STAGE_COLORS = [
  "#4D7A1F",
  "#2563EB",
  "#DC2626",
  "#D97706",
  "#7C3AED",
  "#0EA5E9",
  "#DB2777",
  "#475569",
];

interface StageData {
  title?: string;
  color?: string;
  stageMetrics?: StageMetrics;
  onChangeTitle?: (id: string, title: string) => void;
  onChangeColor?: (id: string, color: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onUngroup?: (id: string) => void;
}

export function StageNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StageData;
  const color = d.color ?? STAGE_COLORS[0];
  const title = d.title ?? "Etapa";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [showPalette, setShowPalette] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { getNode } = useReactFlow();

  useEffect(() => setDraft(title), [title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitTitle = () => {
    setEditing(false);
    if (draft.trim() && draft !== title) d.onChangeTitle?.(id, draft.trim());
  };

  const handleResizeEnd = (_e: any, params: { width: number; height: number }) => {
    d.onResize?.(id, Math.round(params.width), Math.round(params.height));
  };

  // Cor com alpha pro fundo (semi-transparente). Aceita hex #RRGGBB.
  const bg = hexToRgba(color, 0.12);

  const node = getNode(id);
  const width = (node?.width ?? node?.measured?.width ?? 320) as number;

  const sm = d.stageMetrics;
  const hasConv = !!sm && sm.convertedCount > 0;

  return (
    <div
      className="relative h-full w-full rounded-2xl border-2"
      style={{
        background: bg,
        borderColor: hasConv ? "#22C55E" : color,
        boxShadow: hasConv
          ? "0 0 0 2px rgba(34,197,94,0.35), 0 0 18px rgba(34,197,94,0.25)"
          : selected ? `0 0 0 2px ${color}55` : undefined,
      }}
    >
      <NodeResizer
        minWidth={180}
        minHeight={140}
        color={color}
        isVisible={selected}
        onResizeEnd={handleResizeEnd}
        handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
      />

      {/* Header do stage */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-2 px-2.5 py-1.5 rounded-t-2xl"
        style={{ background: hexToRgba(color, 0.25) }}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setDraft(title); setEditing(false); }
            }}
            className="flex-1 bg-background/60 px-1.5 py-0.5 rounded text-xs font-bold outline-none border border-border"
            style={{ width: Math.max(width - 90, 80) }}
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="flex-1 text-left text-xs font-bold uppercase tracking-wider truncate"
            style={{ color }}
            title="Clique pra renomear"
          >
            {title}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}
          className="p-0.5 rounded hover:bg-background/40"
          title="Renomear"
        >
          <Pencil className="w-3 h-3" style={{ color }} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowPalette((v) => !v); }}
            className="p-0.5 rounded hover:bg-background/40"
            title="Cor"
          >
            <Palette className="w-3 h-3" style={{ color }} />
          </button>
          {showPalette && (
            <div
              className="absolute right-0 top-5 z-10 flex gap-1 p-1.5 rounded-md bg-popover border border-border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {STAGE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { d.onChangeColor?.(id, c); setShowPalette(false); }}
                  className="w-4 h-4 rounded-sm border border-border"
                  style={{ background: c, outline: c === color ? "2px solid hsl(var(--foreground))" : "none" }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {sm && (
        <div
          className="absolute bottom-0 left-0 right-0 px-2.5 py-1 rounded-b-2xl text-[10px] font-medium flex flex-wrap gap-x-2 gap-y-0.5"
          style={{
            background: hasConv ? "rgba(34,197,94,0.18)" : hexToRgba(color, 0.18),
            color: hasConv ? "#16A34A" : color,
          }}
        >
          <span>Entraram: <b>{sm.leadsEntered}</b></span>
          <span>Conv: <b>{sm.convertedCount}</b>{sm.conversionValueCents > 0 ? ` (${formatCLP(sm.conversionValueCents / 100)})` : ""}</span>
          <span>Taxa: <b>{(sm.conversionRate * 100).toFixed(1)}%</b></span>
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
