import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface MarketPrediction {
  id: string;
  prediction: string;
  market: string;
  market_explanation: string | null;
}

interface Props {
  value: string;
  onChange: (prediction: string, market: string, explanation: string) => void;
}

export function PredictionAutocomplete({ value, onChange }: Props) {
  const [allPredictions, setAllPredictions] = useState<MarketPrediction[]>([]);
  const [filtered, setFiltered] = useState<MarketPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carrega predictions de 2 fontes:
    // 1. market_predictions (fonte oficial, editável)
    // 2. content_entries.condition_to_win (histórico — pega palpites usados que nunca foram salvos formalmente)
    // Deduplica case-insensitive, priorizando market_predictions (que tem market/explanation).
    const load = async () => {
      const [mpRes, ceRes] = await Promise.all([
        supabase.from("market_predictions").select("*").order("prediction"),
        supabase
          .from("content_entries")
          .select("condition_to_win, market, category_explanation")
          .not("condition_to_win", "is", null)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const mp = (mpRes.data as MarketPrediction[]) ?? [];
      const seen = new Set(mp.map((p) => (p.prediction || "").trim().toLowerCase()));

      const fromHistory: MarketPrediction[] = [];
      for (const row of (ceRes.data ?? []) as Array<{
        condition_to_win: string | null;
        market: string | null;
        category_explanation: string | null;
      }>) {
        const pred = (row.condition_to_win || "").trim();
        if (!pred) continue;
        const key = pred.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        fromHistory.push({
          id: `history-${key}`,
          prediction: pred,
          market: (row.market || "").trim() || "Otro",
          market_explanation: (row.category_explanation || row.market || "").trim() || null,
        });
      }

      const merged = [...mp, ...fromHistory].sort((a, b) =>
        a.prediction.localeCompare(b.prediction, "es", { sensitivity: "base" }),
      );
      setAllPredictions(merged);
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val, "", "");
    if (val.length > 0) {
      const lower = val.toLowerCase();
      setFiltered(allPredictions.filter(p => p.prediction.toLowerCase().includes(lower)).slice(0, 8));
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleSelect = (item: MarketPrediction) => {
    onChange(item.prediction, item.market, item.market_explanation ?? "");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs text-muted-foreground">Palpite *</label>
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { if (value.length > 0 && filtered.length > 0) setOpen(true); }}
        placeholder="Ex: Mais de 1.5 gols"
        className="bg-muted/30 border-border"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm transition-colors"
            >
              <span className="font-medium">{item.prediction}</span>
              <span className="text-muted-foreground ml-2 text-xs">({item.market})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
