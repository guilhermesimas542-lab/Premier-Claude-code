import { CHANNEL_LIST, type ChannelKey } from "../../../lib/crm/channels";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  onPick: (channel: ChannelKey) => void;
  onCancel: () => void;
}

/**
 * Modal/overlay simples pra escolher um canal ao adicionar step.
 * Mostra todos os 7 canais com aviso visual nos blocked/pending.
 */
export function ChannelPicker({ onPick, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Escolher canal</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione o canal pelo qual a mensagem deste passo será enviada.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHANNEL_LIST.map((c) => {
            const Icon = c.icon;
            const blocked = c.integrationStatus === "blocked";
            return (
              <button
                key={c.key}
                onClick={() => onPick(c.key)}
                className="text-left rounded-xl border border-border bg-card hover:border-border/80 hover:bg-muted/30 p-4 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${c.color}20`,
                      border: `1px solid ${c.color}50`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{c.label}</span>
                      {blocked && (
                        <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {c.provider}
                    </p>
                    {c.warning && (
                      <p className="text-[10px] text-yellow-500 mt-1.5 leading-tight">
                        {c.warning}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
