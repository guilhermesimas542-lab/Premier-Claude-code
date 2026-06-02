import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";

export type ImageTemplateKind = "image" | "prompt";

export interface ImageTemplate {
  id: string;
  name: string;
  kind: ImageTemplateKind;
  channel: ChannelKey | null;
  image_url: string | null;
  prompt: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateImageTemplateInput {
  name: string;
  kind: ImageTemplateKind;
  channel?: ChannelKey | null;
  image_url?: string | null;
  prompt?: string | null;
}

export function useImageTemplates() {
  const [items, setItems] = useState<ImageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const list = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("crm_image_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST205") {
        console.error("[useImageTemplates.list]", error);
      }
      setItems([]);
    } else {
      setItems((data ?? []) as ImageTemplate[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  const create = useCallback(
    async (input: CreateImageTemplateInput): Promise<ImageTemplate | null> => {
      const name = (input.name || "").trim();
      if (!name) {
        toast.error("Dê um nome ao modelo.");
        return null;
      }
      if (input.kind === "image" && !input.image_url) {
        toast.error("URL da imagem obrigatória.");
        return null;
      }
      if (input.kind === "prompt" && !input.prompt?.trim()) {
        toast.error("Texto do prompt obrigatório.");
        return null;
      }

      const { data, error } = await (supabase as any)
        .from("crm_image_templates")
        .insert({
          name: name.slice(0, 120),
          kind: input.kind,
          channel: input.channel ?? null,
          image_url: input.image_url ?? null,
          prompt: input.prompt ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Erro ao salvar modelo: ${error.message}`);
        return null;
      }
      toast.success(`Modelo "${name}" salvo`);
      await list();
      return data as ImageTemplate;
    },
    [list]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_image_templates")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao excluir modelo: ${error.message}`);
        return false;
      }
      toast.success("Modelo excluído");
      await list();
      return true;
    },
    [list]
  );

  return { items, loading, refresh: list, create, remove };
}
