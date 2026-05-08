import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTodayInChile } from "@/lib/timezone";

interface BadgeCounts {
  clients: number;
  tips: number;
  errors: number;
  feedback: number;
}

const POLL_INTERVAL = 30_000;

export function useAdminBadges(adminEmail: string | null) {
  const [counts, setCounts] = useState<BadgeCounts>({ clients: 0, tips: 0, errors: 0, feedback: 0 });
  const emailRef = useRef(adminEmail);
  emailRef.current = adminEmail;

  const fetchCounts = useCallback(async () => {
    const email = emailRef.current;
    if (!email) return;

    try {
      // Fetch admin_last_seen for this admin
      const { data: lastSeenRows } = await supabase
        .from("admin_last_seen" as any)
        .select("section, last_seen_at")
        .eq("admin_email", email);

      const lastSeenMap: Record<string, string> = {};
      if (lastSeenRows) {
        for (const r of lastSeenRows as any[]) {
          lastSeenMap[r.section] = r.last_seen_at;
        }
      }

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // 1. Clients new
      const clientsSince = lastSeenMap["clients"] || yesterday;
      const { count: clientsCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("created_at", clientsSince);

      // 2. Tips today (informational)
      const today = getTodayInChile();
      const { count: tipsCount } = await supabase
        .from("content_entries")
        .select("id", { count: "exact", head: true })
        .eq("date", today);

      // 3. Errors new
      const errorsSince = lastSeenMap["errors"] || yesterday;
      const { count: errorsCount } = await supabase
        .from("app_errors")
        .select("id", { count: "exact", head: true })
        .gt("created_at", errorsSince);

      // 4. Feedback with status = 'novo'
      const { count: feedbackCount } = await supabase
        .from("user_feedback")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo");

      setCounts({
        clients: clientsCount ?? 0,
        tips: tipsCount ?? 0,
        errors: errorsCount ?? 0,
        feedback: feedbackCount ?? 0,
      });
    } catch (e) {
      console.error("useAdminBadges fetch error", e);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchCounts]);

  const markSeen = useCallback(async (section: string) => {
    const email = emailRef.current;
    if (!email) return;
    await (supabase.from("admin_last_seen" as any) as any).upsert(
      { admin_email: email, section, last_seen_at: new Date().toISOString() },
      { onConflict: "admin_email,section" }
    );
    // Refresh counts after marking
    fetchCounts();
  }, [fetchCounts]);

  return { counts, markSeen, refresh: fetchCounts };
}
