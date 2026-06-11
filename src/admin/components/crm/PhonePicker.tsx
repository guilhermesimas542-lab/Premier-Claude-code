import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";
import { normalizeBrazilMobile } from "../../lib/crm/normalizePhone";

/**
 * Input de telefones que normaliza automaticamente para o formato SMS Dev
 * (55 + DDD + 9 + 8 dígitos = 13 dígitos). Aceita colar lista (vírgula, ponto-e-vírgula,
 * quebra de linha, espaço) e gera um chip por número válido.
 */
export function PhonePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (phones: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const addFromDraft = () => {
    const parts = draft
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const set = new Set(selected);
    const newErrors: string[] = [];
    for (const p of parts) {
      const r = normalizeBrazilMobile(p);
      if (r.ok) {
        set.add(r.phone);
      } else {
        newErrors.push(`${p} (${r.reason})`);
      }
    }
    onChange(Array.from(set));
    setDraft("");
    setErrors(newErrors);
  };

  const remove = (phone: string) => {
    onChange(selected.filter((p) => p !== phone));
  };

  // Formata pra exibir: 55 71 98137-9776
  const fmt = (p: string) => {
    if (p.length !== 13) return p;
    return `${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, 9)}-${p.slice(9)}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromDraft();
            }
          }}
          placeholder="(71) 98137-9776 — ou cole vários separados por vírgula/linha"
          className="text-xs h-8"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFromDraft}
          disabled={!draft.trim()}
        >
          Adicionar
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-[10px] text-destructive flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-0.5">Não normalizados:</div>
            {errors.join("; ")}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 border border-primary/30 text-foreground"
            >
              {fmt(p)}
              <button
                type="button"
                onClick={() => remove(p)}
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

      <p className="text-[10px] text-muted-foreground">
        Formato final salvo: <code>55DDDNNNNNNNNN</code> (13 dígitos, padrão SMS Dev).
      </p>
    </div>
  );
}
