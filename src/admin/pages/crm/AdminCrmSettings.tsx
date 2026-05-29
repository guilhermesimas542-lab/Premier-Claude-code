import { useState, useEffect } from "react";
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Activity,
  ExternalLink,
  ShieldCheck,
  Lock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useChannelSettings,
  type ChannelSettings,
  getSavedSecrets,
} from "../../hooks/crm/useChannelSettings";
import { CHANNELS, CHANNEL_LIST, type ChannelKey } from "../../lib/crm/channels";
import {
  CHANNEL_CONFIG_SCHEMAS,
  type ConfigField,
} from "../../lib/crm/channelConfigSchemas";

export default function AdminCrmSettings() {
  const {
    items,
    loading,
    busyChannel,
    updateConfig,
    setActive,
    testConnection,
    saveSecret,
    clearSecret,
  } = useChannelSettings();
  const [expanded, setExpanded] = useState<ChannelKey | null>(null);

  // Indexa por canal pra acesso O(1)
  const settingsByChannel = new Map<ChannelKey, ChannelSettings>(
    items.map((s) => [s.channel, s])
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure cada canal de envio. <strong>Modo mock-first:</strong> credenciais não
          são validadas contra os providers reais ainda — quando rolar Pilar 4, o botão
          "Testar conexão" fará chamada real.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {CHANNEL_LIST.map((c) => {
            const settings = settingsByChannel.get(c.key);
            if (!settings) {
              return (
                <div
                  key={c.key}
                  className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <p className="text-sm text-destructive">
                    Canal <strong>{c.label}</strong> sem seed em <code>crm_channel_settings</code>.
                  </p>
                </div>
              );
            }
            return (
              <ChannelCard
                key={c.key}
                channelKey={c.key}
                settings={settings}
                expanded={expanded === c.key}
                onToggleExpand={() => setExpanded((x) => (x === c.key ? null : c.key))}
                busy={busyChannel === c.key}
                onUpdate={(patch) => updateConfig(c.key, patch)}
                onSetActive={(v) => setActive(c.key, v)}
                onTest={() => testConnection(c.key)}
                onSaveSecret={(k, v) => saveSecret(c.key, k, v)}
                onClearSecret={(k) => clearSecret(c.key, k)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Card por canal
// ============================================================

function ChannelCard({
  channelKey,
  settings,
  expanded,
  onToggleExpand,
  busy,
  onUpdate,
  onSetActive,
  onTest,
  onSaveSecret,
  onClearSecret,
}: {
  channelKey: ChannelKey;
  settings: ChannelSettings;
  expanded: boolean;
  onToggleExpand: () => void;
  busy: boolean;
  onUpdate: (patch: { config?: Record<string, any>; notes?: string }) => Promise<boolean>;
  onSetActive: (v: boolean) => Promise<boolean>;
  onTest: () => Promise<unknown>;
  onSaveSecret: (key: string, value: string) => Promise<boolean>;
  onClearSecret: (key: string) => Promise<boolean>;
}) {
  const c = CHANNELS[channelKey];
  const schema = CHANNEL_CONFIG_SCHEMAS[channelKey];
  const Icon = c.icon;
  const savedSecrets = getSavedSecrets(settings);

  // Estado local do form (commit no Salvar). Sensíveis NUNCA entram aqui.
  const [draftConfig, setDraftConfig] = useState<Record<string, any>>(() => {
    const cfg = { ...(settings.config ?? {}) };
    // Strip secrets_set do draft pra não voltar como JSON modificado
    delete cfg.secrets_set;
    // E qualquer campo password que apareça por engano
    for (const f of CHANNEL_CONFIG_SCHEMAS[channelKey].fields) {
      if (f.type === "password") delete cfg[f.key];
    }
    return cfg;
  });
  const [draftNotes, setDraftNotes] = useState<string>(settings.notes ?? "");

  // Sincroniza quando o settings mudar (após save / reload)
  useEffect(() => {
    const cfg = { ...(settings.config ?? {}) };
    delete cfg.secrets_set;
    for (const f of schema.fields) {
      if (f.type === "password") delete cfg[f.key];
    }
    setDraftConfig(cfg);
    setDraftNotes(settings.notes ?? "");
  }, [settings.config, settings.notes, schema.fields]);

  // Comparação ignora chaves que ficam no Vault (secrets_set + password fields)
  const baselineConfig = (() => {
    const cfg = { ...(settings.config ?? {}) };
    delete cfg.secrets_set;
    for (const f of schema.fields) {
      if (f.type === "password") delete cfg[f.key];
    }
    return cfg;
  })();
  const isDirty =
    JSON.stringify(draftConfig) !== JSON.stringify(baselineConfig) ||
    draftNotes !== (settings.notes ?? "");

  const handleSave = async () => {
    // Preserva secrets_set vindo do banco (gerenciado pelas RPCs do Vault).
    const mergedConfig = {
      ...draftConfig,
      ...(savedSecrets.length > 0 ? { secrets_set: savedSecrets } : {}),
    };
    await onUpdate({ config: mergedConfig, notes: draftNotes });
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header colapsado */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/20"
        onClick={onToggleExpand}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${c.color}20`, border: `1px solid ${c.color}50` }}
        >
          <Icon className="w-5 h-5" style={{ color: c.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">{c.label}</span>
            <span className="text-[11px] text-muted-foreground">via {c.provider}</span>
            <StatusPill
              active={settings.active}
              lastTestSuccess={settings.last_test_success}
              integrationStatus={c.integrationStatus}
            />
          </div>
          {settings.last_test_at && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Último teste: {formatRel(settings.last_test_at)}
              {settings.last_test_success === false && " · falhou"}
            </p>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {settings.active ? "Ativo" : "Inativo"}
          </span>
          <Switch
            checked={settings.active}
            disabled={busy}
            onCheckedChange={(v) => onSetActive(v)}
          />
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-border p-5 space-y-4 bg-muted/10">
          {/* Provider hint */}
          {schema.providerHint && (
            <div className="rounded-lg border border-muted/50 bg-card/50 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-foreground">{schema.providerHint}</p>
                {schema.docsUrl && (
                  <a
                    href={schema.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary inline-flex items-center gap-1 mt-1.5 hover:underline"
                  >
                    Documentação <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {c.warning && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">{c.warning}</p>
            </div>
          )}

          {/* Campos sensíveis (Vault) — renderizados separados em cima */}
          {schema.fields.some((f) => f.type === "password") && (
            <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-3 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Credenciais (Vault cifrado)
                </p>
              </div>
              {schema.fields
                .filter((f) => f.type === "password")
                .map((field) => (
                  <SecretField
                    key={field.key}
                    field={field}
                    busy={busy}
                    saved={savedSecrets.includes(field.key)}
                    onSave={(val) => onSaveSecret(field.key, val)}
                    onClear={() => onClearSecret(field.key)}
                  />
                ))}
              <p className="text-[10px] text-muted-foreground italic">
                Credenciais são cifradas no Supabase Vault e nunca retornam pra essa tela.
                Pra trocar, salve um novo valor.
              </p>
            </div>
          )}

          {/* Campos de configuração não-sensíveis */}
          <div className="grid sm:grid-cols-2 gap-3">
            {schema.fields
              .filter((f) => f.type !== "password")
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={draftConfig[field.key] ?? ""}
                  onChange={(v) => setDraftConfig((d) => ({ ...d, [field.key]: v }))}
                />
              ))}
          </div>

          {/* Notas internas */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Notas internas
            </Label>
            <Textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Observações sobre essa configuração (responsável, contrato, contato do provider…)"
              rows={2}
            />
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={busy}
              title="Testa conexão simulada (mock)"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5 mr-1.5" />
              )}
              Testar conexão
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty || busy}>
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
      {field.hint && (
        <p className="text-[10px] text-muted-foreground italic">{field.hint}</p>
      )}
    </div>
  );
}

/**
 * Campo sensível (API key etc): 2 estados.
 *   - Cadastrado: mostra "••••••• cadastrado" + botão Substituir/Remover
 *   - Vazio: input + botão Salvar no Vault
 *
 * O valor real NUNCA volta pra UI — só fica no Vault, lido pela edge function.
 */
function SecretField({
  field,
  busy,
  saved,
  onSave,
  onClear,
}: {
  field: ConfigField;
  busy: boolean;
  saved: boolean;
  onSave: (value: string) => Promise<boolean>;
  onClear: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(!saved);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setEditing(!saved);
    setDraft("");
  }, [saved]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setWorking(true);
    const ok = await onSave(draft.trim());
    setWorking(false);
    if (ok) setDraft("");
  };

  const handleClear = async () => {
    if (!confirm(`Remover ${field.label} do Vault?`)) return;
    setWorking(true);
    await onClear();
    setWorking(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {saved && !editing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-foreground font-mono">••••••••••••</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider ml-1">
              Cadastrado no Vault
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={busy || working}
          >
            Substituir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={busy || working}
            className="text-destructive hover:text-destructive"
            aria-label="Remover credencial"
          >
            {working ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={field.placeholder}
            className="flex-1 font-mono text-xs"
            autoComplete="new-password"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!draft.trim() || busy || working}
          >
            {working ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            )}
            Salvar
          </Button>
          {saved && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setDraft("");
              }}
              disabled={busy || working}
            >
              Cancelar
            </Button>
          )}
        </div>
      )}

      {field.hint && (
        <p className="text-[10px] text-muted-foreground italic">{field.hint}</p>
      )}
    </div>
  );
}

function StatusPill({
  active,
  lastTestSuccess,
  integrationStatus,
}: {
  active: boolean;
  lastTestSuccess: boolean | null;
  integrationStatus: "active" | "config_needed" | "blocked";
}) {
  // Prioridade: blocked > inativo > teste recente
  if (integrationStatus === "blocked") {
    return <Pill color="#94A3B8" icon={XCircle} label="Bloqueado" />;
  }
  if (!active) {
    return <Pill color="#94A3B8" icon={XCircle} label="Inativo" />;
  }
  if (lastTestSuccess === true) {
    return <Pill color="#22C55E" icon={CheckCircle2} label="Testado" />;
  }
  if (lastTestSuccess === false) {
    return <Pill color="#EF4444" icon={XCircle} label="Falha no teste" />;
  }
  return <Pill color="#FACC15" icon={AlertCircle} label="Não testado" />;
}

function Pill({
  color,
  icon: Icon,
  label,
}: {
  color: string;
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
      style={{
        background: `${color}20`,
        border: `1px solid ${color}50`,
        color,
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function formatRel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}
