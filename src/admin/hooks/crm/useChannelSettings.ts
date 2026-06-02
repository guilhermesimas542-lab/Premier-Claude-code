import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";

export interface ChannelSettings {
  id: string;
  channel: ChannelKey;
  provider: string;
  active: boolean;
  config: Record<string, any>;
  last_test_at: string | null;
  last_test_success: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lista das chaves de secret cadastradas no Vault para um canal.
 * O array `config.secrets_set` é mantido pelas RPCs crm_save/clear_channel_secret.
 */
export function getSavedSecrets(settings: ChannelSettings): string[] {
  const arr = settings.config?.secrets_set;
  if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string");
  return [];
}

export interface TestResult {
  success: boolean;
  message: string;
  tested_at: string;
}

/**
 * Hook pra gerenciar configurações dos 7 canais.
 *
 * Sub-fase 1.7: salvar config e testar conexão são MOCK — não valida
 * credenciais reais contra os providers. Em Pilar 4, testConnection vira
 * chamada real à API de cada provider.
 */
export function useChannelSettings() {
  const [items, setItems] = useState<ChannelSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyChannel, setBusyChannel] = useState<ChannelKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await (supabase as any)
      .from("crm_channel_settings")
      .select("*")
      .order("channel", { ascending: true });

    if (err) {
      console.error("[useChannelSettings] erro:", err);
      setError(err.message);
      toast.error(`Erro ao carregar configurações: ${err.message}`);
    } else {
      setItems((data ?? []) as ChannelSettings[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Atualiza config (e/ou notes) de um canal. */
  const updateConfig = useCallback(
    async (channel: ChannelKey, patch: Partial<Pick<ChannelSettings, "config" | "notes">>) => {
      setBusyChannel(channel);
      const { error: err } = await (supabase as any)
        .from("crm_channel_settings")
        .update(patch)
        .eq("channel", channel);
      setBusyChannel(null);
      if (err) {
        toast.error(`Erro ao salvar: ${err.message}`);
        return false;
      }
      toast.success("Configuração salva");
      await load();
      return true;
    },
    [load]
  );

  /** Toggle ativo/inativo. */
  const setActive = useCallback(
    async (channel: ChannelKey, active: boolean) => {
      setBusyChannel(channel);
      const { error: err } = await (supabase as any)
        .from("crm_channel_settings")
        .update({ active })
        .eq("channel", channel);
      setBusyChannel(null);
      if (err) {
        toast.error(`Erro: ${err.message}`);
        return false;
      }
      toast.success(active ? "Canal ativado" : "Canal desativado");
      await load();
      return true;
    },
    [load]
  );

  /**
   * Mock "testar conexão" — simula latência (400-800ms) e ~90% sucesso.
   * Grava resultado em last_test_at / last_test_success.
   * Em Pilar 4: substituir por chamada real à API do provider.
   */
  const testConnection = useCallback(
    async (channel: ChannelKey): Promise<TestResult> => {
      setBusyChannel(channel);
      // latência mock
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
      const success = Math.random() < 0.9;
      const now = new Date().toISOString();
      const result: TestResult = {
        success,
        message: success
          ? "Conexão simulada com sucesso (mock — sem chamada real ao provider)"
          : "Falha simulada (mock 10%) — em produção isso indicaria credencial inválida.",
        tested_at: now,
      };

      const { error: err } = await (supabase as any)
        .from("crm_channel_settings")
        .update({
          last_test_at: now,
          last_test_success: success,
        })
        .eq("channel", channel);

      if (err) {
        console.error("[useChannelSettings.test] erro ao gravar:", err);
      }

      setBusyChannel(null);
      if (success) toast.success(result.message);
      else toast.error(result.message);

      await load();
      return result;
    },
    [load]
  );

  /**
   * Salva uma API key sensível no Vault via RPC crm_save_channel_secret.
   * O valor NUNCA volta pra UI — apenas o nome da chave fica registrado em
   * config.secrets_set pra a UI saber que existe um secret cadastrado.
   */
  const saveSecret = useCallback(
    async (channel: ChannelKey, key: string, value: string) => {
      setBusyChannel(channel);
      const { error } = await (supabase as any).rpc("crm_save_channel_secret", {
        p_channel: channel,
        p_key: key,
        p_value: value,
      });
      setBusyChannel(null);
      if (error) {
        toast.error(`Erro ao salvar credencial: ${error.message}`);
        return false;
      }
      toast.success("Credencial salva no Vault");
      await load();
      return true;
    },
    [load]
  );

  /**
   * Remove uma credencial do Vault via RPC crm_clear_channel_secret.
   */
  const clearSecret = useCallback(
    async (channel: ChannelKey, key: string) => {
      setBusyChannel(channel);
      const { error } = await (supabase as any).rpc("crm_clear_channel_secret", {
        p_channel: channel,
        p_key: key,
      });
      setBusyChannel(null);
      if (error) {
        toast.error(`Erro ao remover credencial: ${error.message}`);
        return false;
      }
      toast.success("Credencial removida");
      await load();
      return true;
    },
    [load]
  );

  return {
    items,
    loading,
    error,
    busyChannel,
    refresh: load,
    updateConfig,
    setActive,
    testConnection,
    saveSecret,
    clearSecret,
  };
}
