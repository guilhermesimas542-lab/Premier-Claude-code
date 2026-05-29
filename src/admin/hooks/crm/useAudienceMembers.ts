import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ImportedRow } from "../../lib/crm/audiencesImport";

export interface AudienceMember {
  id: string;
  audience_id: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface BulkInsertResult {
  inserted: number;
  matched_users: number;
  failed: number;
  /** Linhas que falharam por conflito (já existem). */
  duplicates_in_db: number;
}

/**
 * Hook CRUD para membros de uma audiência estática.
 *
 * O insert em lote faz duas coisas:
 *   1) tenta dar match com `users` pelo email/phone — preenchendo `user_id`
 *      quando achar, o que enriquece os dados pra disparo posterior
 *   2) usa `onConflict: ignore` no Supabase pra que dedupe via UNIQUE
 *      parciais do banco passe sem explodir
 */
export function useAudienceMembers(audienceId: string | null) {
  const [items, setItems] = useState<AudienceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!audienceId) {
      setItems([]);
      setCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error, count: total } = await (supabase as any)
      .from("crm_audience_members")
      .select("*", { count: "exact" })
      .eq("audience_id", audienceId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[useAudienceMembers] load:", error);
      toast.error(`Erro ao carregar membros: ${error.message}`);
    } else {
      setItems((data ?? []) as AudienceMember[]);
      setCount(total ?? (data?.length ?? 0));
    }
    setLoading(false);
  }, [audienceId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Insere lista de linhas importadas. Faz match com `users` em batch antes
   * do insert, depois insere em chunks de 500.
   */
  const bulkInsert = useCallback(
    async (
      targetAudienceId: string,
      rows: ImportedRow[]
    ): Promise<BulkInsertResult | null> => {
      if (rows.length === 0) {
        toast.error("Lista vazia — nada pra importar.");
        return null;
      }

      // 1) Match com users em batch
      const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
      const phones = rows.map((r) => r.phone).filter((p): p is string => !!p);

      const userByEmail = new Map<string, string>();
      const userByPhone = new Map<string, string>();

      if (emails.length > 0) {
        const { data: usersByEmail } = await (supabase as any)
          .from("users")
          .select("id, email")
          .in("email", emails);
        for (const u of (usersByEmail ?? []) as Array<{ id: string; email: string }>) {
          if (u.email) userByEmail.set(u.email.toLowerCase(), u.id);
        }
      }

      if (phones.length > 0) {
        const { data: usersByPhone } = await (supabase as any)
          .from("users")
          .select("id, phone")
          .in("phone", phones);
        for (const u of (usersByPhone ?? []) as Array<{ id: string; phone: string }>) {
          if (u.phone) userByPhone.set(u.phone, u.id);
        }
      }

      // 2) Monta os inserts
      let matchedUsers = 0;
      const payload = rows.map((r) => {
        let userId: string | null = null;
        if (r.email && userByEmail.has(r.email)) {
          userId = userByEmail.get(r.email)!;
        } else if (r.phone && userByPhone.has(r.phone)) {
          userId = userByPhone.get(r.phone)!;
        }
        if (userId) matchedUsers++;
        return {
          audience_id: targetAudienceId,
          email: r.email,
          phone: r.phone,
          user_id: userId,
          metadata: { source: r.source.slice(0, 200) },
        };
      });

      // 3) Insert em chunks
      const CHUNK = 500;
      let inserted = 0;
      let failed = 0;
      let duplicatesInDb = 0;

      for (let i = 0; i < payload.length; i += CHUNK) {
        const slice = payload.slice(i, i + CHUNK);
        const { data, error } = await (supabase as any)
          .from("crm_audience_members")
          .upsert(slice, { onConflict: "audience_id,email", ignoreDuplicates: true })
          .select("id");

        if (error) {
          // Se UPSERT por email falhar pq alguns têm só phone, refaz como insert simples
          // tentando o outro UNIQUE — fallback minimalista
          const { error: err2 } = await (supabase as any)
            .from("crm_audience_members")
            .insert(slice);
          if (err2) {
            console.error("[useAudienceMembers.bulkInsert]", err2);
            failed += slice.length;
            continue;
          }
          inserted += slice.length;
        } else {
          const insertedNow = data?.length ?? 0;
          inserted += insertedNow;
          duplicatesInDb += slice.length - insertedNow;
        }
      }

      await load();
      return {
        inserted,
        matched_users: matchedUsers,
        failed,
        duplicates_in_db: duplicatesInDb,
      };
    },
    [load]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_audience_members")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao remover: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const clearAll = useCallback(
    async (targetAudienceId: string): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_audience_members")
        .delete()
        .eq("audience_id", targetAudienceId);
      if (error) {
        toast.error(`Erro ao limpar lista: ${error.message}`);
        return false;
      }
      toast.success("Lista esvaziada");
      await load();
      return true;
    },
    [load]
  );

  return { items, count, loading, refresh: load, bulkInsert, remove, clearAll };
}
