import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";

export type NodeType = "trigger" | "message" | "wait" | "condition" | "tag" | "stage";
export type DelayUnit = "minute" | "hour" | "day" | "week";

export interface GraphNodeRow {
  id: string;
  journey_id: string;
  node_type: NodeType;
  position: { x: number; y: number } | null;
  channel: ChannelKey | null;
  content: Record<string, any>;
  config: Record<string, any>;
  step_order: number | null;
  delay_value: number | null;
  delay_unit: DelayUnit | null;
  parent_step_id: string | null;
}

export interface GraphEdgeRow {
  id: string;
  journey_id: string;
  source_step_id: string;
  target_step_id: string;
  branch: string | null;
  condition: Record<string, any> | null;
}

export interface RFNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  parentId?: string;
  zIndex?: number;
  style?: Record<string, any>;
  data: {
    channel: ChannelKey | null;
    content: Record<string, any>;
    config: Record<string, any>;
    delay_value: number | null;
    delay_unit: DelayUnit | null;
    label: string;
    title?: string;
    color?: string;
  };
}

export interface RFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: { condition: Record<string, any> | null };
}

export interface UpdateNodeFields {
  channel?: ChannelKey | null;
  content?: Record<string, any>;
  config?: Record<string, any>;
  delay_value?: number | null;
  delay_unit?: DelayUnit | null;
}

function labelFor(row: { node_type: NodeType; channel: ChannelKey | null }): string {
  switch (row.node_type) {
    case "trigger":
      return "Gatilho";
    case "message":
      return row.channel ? `Mensagem · ${row.channel}` : "Mensagem";
    case "wait":
      return "Esperar";
    case "condition":
      return "Condição";
    case "tag":
      return "Marcar usuário";
    case "stage":
      return "Etapa";
    default:
      return row.node_type;
  }
}

export function useJourneyGraph(journeyId: string | null) {
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!journeyId) {
      setNodes([]);
      setEdges([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [nodesRes, edgesRes] = await Promise.all([
      (supabase as any)
        .from("crm_journey_steps")
        .select("*")
        .eq("journey_id", journeyId)
        .order("step_order", { ascending: true, nullsFirst: false }),
      (supabase as any)
        .from("crm_journey_edges")
        .select("*")
        .eq("journey_id", journeyId),
    ]);

    if (nodesRes.error) {
      toast.error(`Erro ao carregar nós: ${nodesRes.error.message}`);
      setLoading(false);
      return;
    }
    if (edgesRes.error) {
      toast.error(`Erro ao carregar ligações: ${edgesRes.error.message}`);
      setLoading(false);
      return;
    }

    const rows = (nodesRes.data ?? []) as GraphNodeRow[];

    // Fallback: se TODOS os nós (não-stage) estão em (0,0), espalha vertical.
    const nonStage = rows.filter((r) => r.node_type !== "stage");
    const allAtOrigin = nonStage.length > 0 && nonStage.every(
      (r) => !r.position || (r.position.x === 0 && r.position.y === 0)
    );

    const mapped: RFNode[] = rows.map((r, i) => {
      const isStage = r.node_type === "stage";
      const pos = !isStage && allAtOrigin
        ? { x: 0, y: i * 140 }
        : r.position ?? { x: 0, y: 0 };
      const cfg = r.config ?? {};
      const node: RFNode = {
        id: r.id,
        type: (r.node_type ?? "message") as NodeType,
        position: pos,
        data: {
          channel: r.channel,
          content: r.content ?? {},
          config: cfg,
          delay_value: r.delay_value,
          delay_unit: r.delay_unit,
          label: labelFor(r),
          title: cfg.title,
          color: cfg.color,
        },
      };
      if (r.parent_step_id) node.parentId = r.parent_step_id;
      if (isStage) {
        node.zIndex = 0;
        node.style = {
          width: cfg.width ?? 360,
          height: cfg.height ?? 220,
        };
      } else {
        node.zIndex = 1;
      }
      return node;
    });

    // React Flow exige pai ANTES do filho pra posição relativa funcionar.
    const stages = mapped.filter((n) => n.type === "stage");
    const rest = mapped.filter((n) => n.type !== "stage");
    const rfNodes = [...stages, ...rest];

    const rfEdges: RFEdge[] = ((edgesRes.data ?? []) as GraphEdgeRow[]).map(
      (e) => ({
        id: e.id,
        source: e.source_step_id,
        target: e.target_step_id,
        label: e.branch ?? "",
        data: { condition: e.condition },
      })
    );

    setNodes(rfNodes);
    setEdges(rfEdges);
    setLoading(false);
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  const addNode = useCallback(
    async (
      nodeType: NodeType,
      position: { x: number; y: number },
      opts?: { config?: Record<string, any>; parent_step_id?: string | null }
    ): Promise<string | null> => {
      if (!journeyId) return null;
      const isStage = nodeType === "stage";
      const defaultConfig = isStage
        ? { title: "Etapa", color: "#4D7A1F", width: 360, height: 220 }
        : {};
      const config = { ...defaultConfig, ...(opts?.config ?? {}) };
      const { data, error } = await (supabase as any)
        .from("crm_journey_steps")
        .insert({
          journey_id: journeyId,
          node_type: nodeType,
          position,
          channel: null,
          content: {},
          config,
          step_order: null,
          parent_step_id: opts?.parent_step_id ?? null,
        })
        .select()
        .single();
      if (error) {
        toast.error(`Erro ao adicionar nó: ${error.message}`);
        return null;
      }
      const row = data as GraphNodeRow;
      setNodes((prev) => {
        const next: RFNode = {
          id: row.id,
          type: nodeType,
          position,
          data: {
            channel: null,
            content: {},
            config,
            delay_value: null,
            delay_unit: null,
            label: labelFor({ node_type: nodeType, channel: null }),
            title: config.title,
            color: config.color,
          },
          zIndex: isStage ? 0 : 1,
          ...(isStage ? { style: { width: config.width, height: config.height } } : {}),
          ...(opts?.parent_step_id ? { parentId: opts.parent_step_id } : {}),
        };
        // stages devem vir antes dos filhos
        return isStage ? [next, ...prev] : [...prev, next];
      });
      return row.id;
    },
    [journeyId]
  );

  const setNodeParent = useCallback(
    async (
      nodeId: string,
      parentId: string | null,
      position: { x: number; y: number }
    ) => {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ parent_step_id: parentId, position })
        .eq("id", nodeId);
      if (error) {
        toast.error(`Erro ao agrupar: ${error.message}`);
        return;
      }
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, position, parentId: parentId ?? undefined }
            : n
        )
      );
    },
    []
  );

  const updateNodePosition = useCallback(
    async (id: string, position: { x: number; y: number }) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, position } : n))
      );
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ position })
        .eq("id", id);
      if (error) toast.error(`Erro ao salvar posição: ${error.message}`);
    },
    []
  );

  const removeNode = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from("crm_journey_steps")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`Erro ao remover nó: ${error.message}`);
      return;
    }
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const addEdge = useCallback(
    async (source: string, target: string, branch?: string) => {
      if (!journeyId) return;
      const { data, error } = await (supabase as any)
        .from("crm_journey_edges")
        .insert({
          journey_id: journeyId,
          source_step_id: source,
          target_step_id: target,
          branch: branch ?? null,
        })
        .select()
        .single();
      if (error) {
        toast.error(`Erro ao ligar nós: ${error.message}`);
        return;
      }
      const row = data as GraphEdgeRow;
      setEdges((prev) => [
        ...prev,
        {
          id: row.id,
          source: row.source_step_id,
          target: row.target_step_id,
          label: row.branch ?? "",
          data: { condition: row.condition },
        },
      ]);
    },
    [journeyId]
  );

  const removeEdge = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from("crm_journey_edges")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`Erro ao remover ligação: ${error.message}`);
      return;
    }
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateNode = useCallback(
    async (id: string, fields: UpdateNodeFields) => {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update(fields)
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao salvar nó: ${error.message}`);
        return;
      }
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const nextConfig =
            fields.config !== undefined ? fields.config : n.data.config;
          const merged: RFNode = {
            ...n,
            data: {
              ...n.data,
              ...(fields.channel !== undefined ? { channel: fields.channel } : {}),
              ...(fields.content !== undefined ? { content: fields.content } : {}),
              ...(fields.config !== undefined ? { config: fields.config, title: fields.config?.title, color: fields.config?.color } : {}),
              ...(fields.delay_value !== undefined ? { delay_value: fields.delay_value } : {}),
              ...(fields.delay_unit !== undefined ? { delay_unit: fields.delay_unit } : {}),
            },
          };
          merged.data.label = labelFor({ node_type: n.type, channel: merged.data.channel });
          if (n.type === "stage" && fields.config !== undefined) {
            merged.style = {
              ...(n.style ?? {}),
              width: nextConfig?.width ?? n.style?.width ?? 360,
              height: nextConfig?.height ?? n.style?.height ?? 220,
            };
          }
          return merged;
        })
      );
    },
    []
  );

  const updateEdgeBranch = useCallback(
    async (id: string, branch: string | null) => {
      const { error } = await (supabase as any)
        .from("crm_journey_edges")
        .update({ branch })
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao salvar ramo: ${error.message}`);
        return;
      }
      setEdges((prev) =>
        prev.map((e) => (e.id === id ? { ...e, label: branch ?? "" } : e))
      );
    },
    []
  );

  return {
    nodes,
    edges,
    loading,
    refresh: load,
    addNode,
    updateNode,
    updateNodePosition,
    removeNode,
    addEdge,
    removeEdge,
    updateEdgeBranch,
  };
}
