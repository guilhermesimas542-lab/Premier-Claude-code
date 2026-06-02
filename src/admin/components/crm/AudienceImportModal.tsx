import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Loader2, CheckCircle2, Mail, Phone, AlertTriangle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  parseImportText,
  summarizeParse,
  IMPORT_LIMIT_MAX,
  type ImportParseResult,
} from "../../lib/crm/audiencesImport";
import { useAudiences } from "../../hooks/crm/useAudiences";
import { useAudienceMembers } from "../../hooks/crm/useAudienceMembers";

type Mode = "create" | "update";
type UpdateStrategy = "replace" | "append";

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: Mode;
  audience?: { id: string; name: string; description: string | null } | null;
  /** Chamado depois da audiência criada + membros inseridos. */
  onCreated?: (audienceId: string) => void;
  /** Chamado depois da audiência atualizada. */
  onUpdated?: (audienceId: string) => void;
}

const SAMPLE = `joao@exemplo.com.br
maria@exemplo.com.br, 11999998888
+5511988887777
contato@premier.app;5521988887766`;

/**
 * Modal de importação/atualização de lista estática de emails/telefones.
 *
 * Modo "create": cria nova audiência kind='static_list' e insere membros.
 * Modo "update": atualiza nome/descrição da audiência existente e:
 *   - "replace" → apaga membros antigos e insere os novos
 *   - "append" → só insere (dedup por unique constraint via onConflict)
 */
export function AudienceImportModal({
  open,
  onClose,
  mode = "create",
  audience = null,
  onCreated,
  onUpdated,
}: Props) {
  const { create, update } = useAudiences();
  // Em modo update, opera sobre a audience.id; em create, ainda não temos id.
  const { bulkInsert, clearAll } = useAudienceMembers(mode === "update" ? audience?.id ?? null : null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [strategy, setStrategy] = useState<UpdateStrategy>("replace");

  // Pré-preenche nome/descrição no modo update sempre que abrir
  useEffect(() => {
    if (!open) return;
    if (mode === "update" && audience) {
      setName(audience.name ?? "");
      setDescription(audience.description ?? "");
      setText("");
      setStrategy("replace");
    } else {
      setName("");
      setDescription("");
      setText("");
    }
  }, [open, mode, audience]);

  const parse: ImportParseResult = useMemo(() => parseImportText(text), [text]);
  const summary = summarizeParse(parse);

  const isUpdate = mode === "update" && !!audience;
  const canSubmit = name.trim().length > 0 && parse.rows.length > 0 && !working;

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) { toast.error("Arquivo muito grande (máx. 8MB)."); return; }
    try {
      const content = await file.text();
      setText((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));
      if (!isUpdate && !name.trim()) {
        setName(file.name.replace(/\.(csv|txt)$/i, "").slice(0, 100));
      }
      toast.success(`"${file.name}" carregado.`);
    } catch { toast.error("Não consegui ler o arquivo."); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setWorking(true);

    if (isUpdate && audience) {
      const ok = await update(audience.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      if (!ok) { setWorking(false); return; }

      if (strategy === "replace") {
        const cleared = await clearAll(audience.id);
        if (!cleared) { setWorking(false); return; }
      }

      const r = await bulkInsert(audience.id, parse.rows);
      setWorking(false);
      if (!r) {
        toast.error("Não foi possível inserir os membros.");
        return;
      }

      const matchInfo =
        r.matched_users > 0
          ? ` · ${r.matched_users.toLocaleString("pt-BR")} já cadastrados`
          : "";
      const dupInfo =
        r.duplicates_in_db > 0
          ? ` · ${r.duplicates_in_db.toLocaleString("pt-BR")} duplicados ignorados`
          : "";
      toast.success(
        `Lista "${name.trim()}" atualizada com ${r.inserted.toLocaleString("pt-BR")} novos contatos${matchInfo}${dupInfo}.`
      );

      onUpdated?.(audience.id);
      onClose();
      return;
    }

    // Create
    const created = await create({
      name: name.trim(),
      description: description.trim() || null,
      kind: "static_list",
      filters: {},
    });

    if (!created) {
      setWorking(false);
      return;
    }

    const r = await bulkInsert(created.id, parse.rows);
    setWorking(false);

    if (!r) {
      toast.error(
        "Audiência criada mas não foi possível inserir os membros. Tente importar de novo pelo detalhe."
      );
      onClose();
      return;
    }

    const matchInfo =
      r.matched_users > 0
        ? ` · ${r.matched_users.toLocaleString("pt-BR")} já cadastrados`
        : "";
    toast.success(
      `Lista "${created.name}" criada com ${r.inserted.toLocaleString("pt-BR")} contatos${matchInfo}.`
    );

    setName("");
    setDescription("");
    setText("");
    onCreated?.(created.id);
    onClose();
  };

  if (!open) return null;

  const headerTitle = isUpdate ? "Atualizar lista" : "Importar lista";
  const submitLabel = isUpdate ? "Atualizar lista" : "Criar lista";

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between gap-3 z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{headerTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cole emails ou telefones — um por linha. Aceita até{" "}
                {IMPORT_LIMIT_MAX.toLocaleString("pt-BR")} contatos por lista.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Header info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome da lista *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Black Friday clientes ativos"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto interno"
                maxLength={200}
              />
            </div>
          </div>

          {/* Estratégia de update */}
          {isUpdate && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Como atualizar
              </Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as UpdateStrategy)}
                className="gap-2"
              >
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="replace" id="strategy-replace" className="mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Substituir tudo</div>
                    <div className="text-muted-foreground">
                      Apaga os contatos atuais e usa só os desta importação.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="append" id="strategy-append" className="mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Adicionar aos existentes</div>
                    <div className="text-muted-foreground">
                      Mantém os atuais e adiciona os novos (duplicados são ignorados).
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Emails e/ou telefones</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="w-3.5 h-3.5 mr-1.5" />
                Carregar CSV/TXT
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SAMPLE}
              rows={12}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground italic">
              1 contato por linha. Pode misturar email e telefone, ou ter duas
              colunas separadas por vírgula. Telefone BR ganha prefixo 55
              automaticamente.
            </p>
          </div>

          {/* Preview do parse */}
          {text.trim().length > 0 && (
            <div
              className={`rounded-xl border p-3 ${
                parse.rows.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-yellow-500/30 bg-yellow-500/5"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {parse.rows.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold text-foreground mb-0.5">
                    {parse.rows.length > 0
                      ? `${parse.rows.length.toLocaleString("pt-BR")} contatos prontos pra importar`
                      : "Nenhum contato válido"}
                  </p>
                  <p className="text-muted-foreground">{summary}</p>
                  {parse.warnings.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 list-disc pl-4 text-muted-foreground">
                      {parse.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}

                  {/* Breakdown email vs phone */}
                  {parse.rows.length > 0 && (
                    <div className="mt-2 flex gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {parse.rows.filter((r) => r.email).length} emails
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {parse.rows.filter((r) => r.phone).length} telefones
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-end gap-2 bg-muted/10">
          <Button variant="ghost" onClick={onClose} disabled={working}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {working ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
