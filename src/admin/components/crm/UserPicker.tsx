import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PickedUser {
  id: string;
  email: string;
  main_tier: string | null;
}

/**
 * Busca usuários por email com dropdown multi-seleção.
 * Usado em ScheduleWizard (AdHocFilters) e AudienceBuilder.
 */
export function UserPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<PickedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const missing = selectedIds.filter(
      (id) => !selectedUsers.some((u) => u.id === id)
    );
    if (missing.length === 0) {
      setSelectedUsers((prev) => prev.filter((u) => selectedIds.includes(u.id)));
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("users")
        .select("id, email, main_tier")
        .in("id", missing);
      if (data) {
        setSelectedUsers((prev) => {
          const merged = [...prev, ...(data as PickedUser[])];
          return merged.filter((u) => selectedIds.includes(u.id));
        });
      }
    })();
  }, [selectedIds]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      let q: any = (supabase as any)
        .from("users")
        .select("id, email, main_tier")
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(20);
      if (query.trim()) {
        q = q.ilike("email", `%${query.trim()}%`);
      }
      const { data } = await q;
      if (!cancelled) {
        setResults((data ?? []) as PickedUser[]);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (u: PickedUser) => {
    if (selectedSet.has(u.id)) {
      onChange(selectedIds.filter((id) => id !== u.id));
    } else {
      onChange([...selectedIds, u.id]);
      setSelectedUsers((prev) =>
        prev.some((p) => p.id === u.id) ? prev : [...prev, u]
      );
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por email..."
          className="pl-7 h-8 text-xs"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              Nenhum lead encontrado.
            </div>
          ) : (
            results.map((u) => {
              const active = selectedSet.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between gap-2 ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="truncate flex-1">
                    <span className="text-foreground">{u.email}</span>
                    {u.main_tier && (
                      <span className="ml-2 text-[10px] text-muted-foreground uppercase">
                        {u.main_tier}
                      </span>
                    )}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 border border-primary/30 text-foreground"
            >
              {u.email}
              <button
                type="button"
                onClick={() => toggle(u)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted-foreground hover:text-destructive underline ml-1"
          >
            limpar tudo
          </button>
        </div>
      )}
    </div>
  );
}
