import { useEffect, useRef, useState } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import { Lock, Palette, Pencil, Settings, Trash2, Unlock } from "lucide-react";
import { JOURNEY_PALETTE } from "@/admin/hooks/crm/useUnifiedWhiteboard";

interface StickNoteData {
  journeyId: string;
  title: string;
  color: string;
  onChangeTitle?: (journeyId: string, name: string) => void;
  onChangeColor?: (journeyId: string, color: string) => void;
  onResize?: (journeyId: string, w: number, h: number) => void;
  onOpenConfig?: (journeyId: string) => void;
  onDelete?: (journeyId: string, name: string) => void;
  onToggleLock?: (journeyId: string, val: boolean) => void;
  locked?: boolean;
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StickNoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StickNoteData;
  const color = d.color ?? "#60A5FA";
  const title = d.title ?? "Jornada sem nome";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [showPalette, setShowPalette] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { getNode } = useReactFlow();

  useEffect(() => setDraft(title), [title]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitTitle = () => {
    setEditing(false);
    if (draft.trim() && draft !== title) d.onChangeTitle?.(d.journeyId, draft.trim());
  };

  const handleResizeEnd = (_e: any, params: { width: number; height: number }) => {
    d.onResize?.(d.journeyId, Math.round(params.width), Math.round(params.height));
  };

  const node = getNode(id);
  const width = (node?.width ?? (node as any)?.measured?.width ?? 600) as number;

  return (
    <div
      className="relative h-full w-full rounded-2xl border-2"
      style={{
        background: hexToRgba(color, 0.08),
        borderColor: color,
        boxShadow: selected ? `0 0 0 2px ${color}55` : undefined,
        pointerEvents: "none",
      }}
    >
      {!d.locked && (
        <NodeResizer
          minWidth={400}
          minHeight={300}
          color={color}
          isVisible={true}
          onResizeEnd={handleResizeEnd}
          handleStyle={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: color,
            border: "2px solid white",
            pointerEvents: "all",
            opacity: selected ? 1 : 0.7,
            zIndex: 20,
          }}
          lineStyle={{
            borderWidth: 4,
            borderColor: "transparent",
            pointerEvents: "all",
          }}
        />
      )}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 rounded-t-2xl"
        style={{ background: hexToRgba(color, 0.22), pointerEvents: "all" }}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
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
            className="flex-1 bg-background/60 px-1.5 py-0.5 rounded text-sm font-bold outline-none border border-border"
            style={{ width: Math.max(width - 100, 100) }}
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="flex-1 text-left text-sm font-bold uppercase tracking-wider truncate"
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
          <Pencil className="w-3.5 h-3.5" style={{ color }} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowPalette((v) => !v); }}
            className="p-0.5 rounded hover:bg-background/40"
            title="Cor"
          >
            <Palette className="w-3.5 h-3.5" style={{ color }} />
          </button>
        <button
          onClick={(e) => { e.stopPropagation(); d.onOpenConfig?.(d.journeyId); }}
          className="p-0.5 rounded hover:bg-background/40"
          title="Configurar jornada"
        >
          <Settings className="w-3.5 h-3.5" style={{ color }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); d.onToggleLock?.(d.journeyId, !d.locked); }}
          className="p-0.5 rounded hover:bg-background/40"
          title={d.locked ? "Destravar jornada" : "Travar jornada"}
        >
          {d.locked
            ? <Lock className="w-3.5 h-3.5" style={{ color }} />
            : <Unlock className="w-3.5 h-3.5" style={{ color }} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); d.onDelete?.(d.journeyId, title); }}
          className="p-0.5 rounded hover:bg-background/40"
          title="Excluir jornada"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
          {showPalette && (
            <div
              className="absolute right-0 top-6 z-10 flex gap-1 p-1.5 rounded-md bg-popover border border-border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {JOURNEY_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => { d.onChangeColor?.(d.journeyId, c); setShowPalette(false); }}
                  className="w-4 h-4 rounded-sm border border-border"
                  style={{ background: c, outline: c === color ? "2px solid hsl(var(--foreground))" : "none" }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
