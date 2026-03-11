import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import type { AdminUser } from "../types";

const UPSELL_BADGES = [
  { key: "alavancagem", letter: "A", activeColor: "bg-blue-500 text-white", title: "Alavancagem" },
  { key: "desaltas", letter: "O", activeColor: "bg-yellow-500 text-white", title: "Odds Altas" },
  { key: "acesso_vitalicio", letter: "V", activeColor: "bg-purple-500 text-white", title: "Vitalício" },
  { key: "live_telegram", letter: "L", activeColor: "bg-green-500 text-white", title: "Live" },
];

const TIER_COLORS: Record<string, string> = {
  free: "text-[#94A3B8]",
  basic: "text-[#60A5FA]",
  pro: "text-[#00E87A]",
  ultra: "text-[#7C3AED]",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Básico",
  pro: "Pro",
  ultra: "Ultra",
};

interface LastEvent {
  event_name: string;
  created_at: string;
}

interface ClientProfileData extends AdminUser {
  activeKeys: string[];
  lastEvent: LastEvent | null;
}

interface ClientProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "—";

const fmtDatetime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export function ClientProfileModal({ userId, onClose }: ClientProfileModalProps) {
  const [data, setData] = useState<ClientProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }

    const load = async () => {
      setLoading(true);
      setData(null);

      const [userRes, entRes, evRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase.from("entitlements").select("product_key").eq("user_id", userId).eq("status", "active"),
        supabase.from("events").select("event_name, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      ]);

      if (!userRes.data) { setLoading(false); return; }

      const activeKeys = (entRes.data ?? []).map((e) => e.product_key as string);
      const lastEvent = evRes.data?.[0] ?? null;

      setData({ ...(userRes.data as unknown as AdminUser), activeKeys, lastEvent });
      setLoading(false);
    };

    load();
  }, [userId]);

  const allActive = data ? UPSELL_BADGES.every(({ key }) => data.activeKeys.includes(key)) : false;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Perfil do Cliente</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4 text-sm">
            {/* Email & Tier */}
            <div className="space-y-2">
              <Row label="Email" value={data.email} />
              <Row label="Telefone" value={data.phone ?? "—"} />
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Plano</span>
                <span className={`font-semibold capitalize ${TIER_COLORS[data.main_tier] ?? "text-gray-300"}`}>
                  {TIER_LABELS[data.main_tier] ?? data.main_tier}
                </span>
              </div>
            </div>

            {/* Upsells */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Produtos (Upsell)</p>
              <div className="flex gap-1.5 flex-wrap">
                {UPSELL_BADGES.map(({ key, letter, activeColor, title }) => {
                  const active = data.activeKeys.includes(key);
                  const colorClass = active
                    ? allActive ? "bg-green-500 text-white" : activeColor
                    : "bg-gray-700 text-gray-500";
                  return (
                    <span
                      key={key}
                      title={title}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold select-none ${colorClass}`}
                    >
                      {letter}
                    </span>
                  );
                })}
                {data.activeKeys.length === 0 && (
                  <span className="text-gray-600 text-xs">Nenhum produto ativo</span>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="border-t border-white/10 pt-3 space-y-2">
              <Row label="Primeiro Acesso" value={fmt(data.created_at)} />
              <Row label="Último Acesso" value={fmt(data.last_seen_at)} />
            </div>

            {/* Last Event */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs text-gray-500 mb-1">Último Evento</p>
              {data.lastEvent ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                    {data.lastEvent.event_name}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {fmtDatetime(data.lastEvent.created_at)}
                  </span>
                </div>
              ) : (
                <span className="text-gray-600 text-xs">Nenhum evento registrado</span>
              )}
            </div>
          </div>
        )}

        {!loading && !data && userId && (
          <p className="text-gray-500 text-sm text-center py-4">Usuário não encontrado</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-200 text-xs text-right break-all">{value}</span>
    </div>
  );
}
