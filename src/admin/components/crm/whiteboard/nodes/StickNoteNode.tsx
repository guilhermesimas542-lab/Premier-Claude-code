import { type NodeProps } from "@xyflow/react";

interface StickNoteData {
  journeyId: string;
  title: string;
  color: string;
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StickNoteNode({ data, selected }: NodeProps) {
  const d = data as unknown as StickNoteData;
  const color = d.color ?? "#60A5FA";
  return (
    <div
      className="relative h-full w-full rounded-2xl border-2"
      style={{
        background: hexToRgba(color, 0.08),
        borderColor: color,
        boxShadow: selected ? `0 0 0 2px ${color}55` : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-2 rounded-t-2xl"
        style={{ background: hexToRgba(color, 0.22) }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-sm font-bold uppercase tracking-wider truncate"
          style={{ color }}
        >
          {d.title || "Jornada sem nome"}
        </span>
      </div>
    </div>
  );
}
