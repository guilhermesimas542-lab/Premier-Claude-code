import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export function DeletableEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    selected,
    markerEnd,
    style,
  } = props;
  const [hover, setHover] = useState(false);
  const { deleteElements } = useReactFlow();
  const cutMode = Boolean((props.data as any)?.cutMode);
  const onCutEdge = (props.data as any)?.onCutEdge as ((edgeId: string) => void) | undefined;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const visible = hover || selected;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: visible ? 2.5 : 1.5,
          stroke: visible ? "hsl(var(--primary))" : (style?.stroke ?? "#94a3b8"),
        }}
      />
      {/* Hit area mais largo pra facilitar selecionar a edge */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: "stroke", cursor: cutMode ? "crosshair" : "pointer" }}
        onPointerDown={(e) => {
          if (cutMode) e.stopPropagation();
        }}
        onPointerUp={(e) => {
          if (cutMode) e.stopPropagation();
        }}
        onClick={(e) => {
          if (!cutMode || !onCutEdge) return;
          e.stopPropagation();
          onCutEdge(id);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="flex items-center gap-1 nodrag nopan"
        >
          {label && (
            <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-bold uppercase text-foreground shadow-sm">
              {label}
            </span>
          )}
          {visible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onCutEdge) {
                  onCutEdge(id);
                  return;
                }
                void deleteElements({ edges: [{ id }] });
              }}
              className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              title="Remover conexão"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
