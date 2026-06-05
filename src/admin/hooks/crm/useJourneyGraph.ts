import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";

export type NodeType = "trigger" | "message" | "wait" | "condition" | "tag";
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
  data: {
    channel: ChannelKey | null;
    content: Record<string, any>;
    config: Record<string, any>;
    delay_value: number | null;
    delay_unit: DelayUnit | null;
    label: string;
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

    // Fallback: se TODOS os nós estão em (0,0) ou sem position, espalha vertical.
    const allAtOrigin = rows.every(
      (r) => !r.position || (r.position.x === 0 && r.position.y === 0)
    );

    const rfNodes: RFNode[] = rows.map((r, i) => {
      const pos = allAtOrigin
        ? { x: 0, y: i * 140 }
        : r.position ?? { x: 0, y: 0 };
      return {
        id: r.id,
        type: (r.node_type ?? "message") as NodeType,
        position: pos,
        data: {
          channel: r.channel,
          content: r.content ?? {},
          config: r.config ?? {},
          delay_value: r.delay_value,
          delay_unit: r.delay_unit,
          label: labelFor(r),
        },
      };
    });

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
      position: { x: number; y: number }
    ): Promise<string | null> => {
      if (!journeyId) return null;
      const { data, error } = await (supabase as any)
        .from("crm_journey_steps")
        .insert({
          journey_id: journeyId,
          node_type: nodeType,
          position,
          channel: null,
          content: {},
          config: {},
          step_order: null,
        })
        .select()
        .single();
      if (error) {
        toast.error(`Erro ao adicionar nó: ${error.message}`);
        return null;
      }
      const row = data as GraphNodeRow;
      setNodes((prev) => [
        ...prev,
        {
          id: row.id,
          type: nodeType,
          position,
          data: {
            channel: null,
            content: {},
            config: {},
            delay_value: null,
            delay_unit: null,
            label: labelFor({ node_type: nodeType, channel: null }),
          },
        },
      ]);
      return row.id;
    },
    [journeyId]
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

  return {
    nodes,
    edges,
    loading,
    refresh: load,
    addNode,
    updateNodePosition,
    removeNode,
    addEdge,
    removeEdge,
  };
}
