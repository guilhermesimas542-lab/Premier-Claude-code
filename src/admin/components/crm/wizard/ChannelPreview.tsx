import { Mail, MessageSquare, MessageCircle, Send, Smartphone, Bell, X } from "lucide-react";
import type { ChannelKey } from "../../../lib/crm/channels";

/**
 * Preview fiel do conteúdo de um Schedule por canal.
 * Lê apenas state.content (subject/body/title/cta) e renderiza um mock visual
 * que comunica como a mensagem chega ao destinatário em cada plataforma.
 *
 * Variáveis suportadas (substituídas por exemplos):
 *   {nome}, {plano}, {dias_sem_login}, {data_cadastro}, {link}
 */

const SAMPLE_VARS: Record<string, string> = {
  nome: "Maria",
  plano: "Diamante",
  dias_sem_login: "7",
  data_cadastro: "12/03/2025",
  link: "https://premier.app/r/abc123",
};

function interpolate(text: string): string {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (_, k) => SAMPLE_VARS[k] ?? `{${k}}`);
}

function nowHHmm(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  channel: ChannelKey;
  content: Record<string, any>;
}

export function ChannelPreview({ channel, content }: Props) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Preview · {channelLabel(channel)}
        </span>
        <span className="text-[10px] text-muted-foreground italic">valores de exemplo</span>
      </div>

      {channel === "email" && <EmailPreview content={content} />}
      {channel === "sms" && <SmsPreview content={content} />}
      {channel === "whatsapp" && <WhatsAppPreview content={content} />}
      {(channel === "telegram_group" || channel === "telegram_x1") && (
        <TelegramPreview content={content} variant={channel} />
      )}
      {channel === "push" && <PushPreview content={content} />}
      {channel === "popup" && <PopupPreview content={content} />}

      {!content.image_url && <ImageHint channel={channel} />}
    </div>
  );
}

function channelLabel(c: ChannelKey): string {
  return {
    email: "Email",
    sms: "SMS",
    whatsapp: "WhatsApp",
    telegram_group: "Telegram (grupo)",
    telegram_x1: "Telegram (x1 broadcast)",
    push: "Push notification",
    popup: "Popup in-app",
  }[c];
}

// ---------- Email ----------
function EmailPreview({ content }: { content: Record<string, any> }) {
  const subject = interpolate(content.subject ?? "") || "(sem assunto)";
  const body = interpolate(content.body ?? "") || "(corpo vazio)";
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-white text-slate-900 shadow-sm">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Caixa de entrada
        </span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            P
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold truncate">Premier FC</div>
              <div className="text-[10px] text-slate-500 shrink-0">{nowHHmm()}</div>
            </div>
            <div className="text-[10px] text-slate-500 truncate">contato@premier.app</div>
          </div>
        </div>
        <div className="text-sm font-bold leading-tight">{subject}</div>
        {content.image_url && (
          <img
            src={content.image_url}
            alt="Banner do email"
            className="w-full h-auto rounded border border-slate-200 mt-1"
            style={{ maxHeight: 160, objectFit: "cover" }}
          />
        )}
        <div className="text-xs whitespace-pre-wrap text-slate-700 leading-relaxed border-t border-slate-100 pt-2">
          {body}
        </div>
      </div>
    </div>
  );
}

// ---------- SMS ----------
function SmsPreview({ content }: { content: Record<string, any> }) {
  const raw = interpolate(content.body ?? "");
  const text = `Premier FC: ${raw || "(mensagem vazia)"}`;
  const len = text.length;
  const segments = Math.max(1, Math.ceil(len / 160));
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-slate-900/40 border border-slate-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Mensagem
          </span>
        </div>
        <div className="flex">
          <div className="max-w-[85%] bg-slate-200 text-slate-900 rounded-2xl rounded-tl-sm px-3 py-2 text-xs whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 pl-2">{nowHHmm()}</div>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">
          {len} caracteres · <strong>{segments}</strong> SMS ({segments * 160} cobertos)
        </span>
        {len > 160 && (
          <span className="text-yellow-500 font-semibold">
            Acima de 160 → cobra como {segments} SMS
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- WhatsApp ----------
function WhatsAppPreview({ content }: { content: Record<string, any> }) {
  const text = interpolate(content.body ?? "") || "(mensagem vazia)";
  return (
    <div
      className="rounded-2xl p-3 border border-emerald-900/30"
      style={{
        background:
          "repeating-linear-gradient(45deg, rgba(15,67,52,0.25) 0 4px, rgba(15,67,52,0.4) 4px 8px)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
          WhatsApp · Premier FC
        </span>
      </div>
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs whitespace-pre-wrap break-words text-slate-900 shadow"
          style={{ background: "#DCF8C6" }}
        >
          {text}
          <div className="text-[9px] text-slate-500 text-right mt-1">{nowHHmm()} ✓✓</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Telegram ----------
function TelegramPreview({
  content,
  variant,
}: {
  content: Record<string, any>;
  variant: "telegram_group" | "telegram_x1";
}) {
  const text = interpolate(content.body ?? "") || "(mensagem vazia)";
  const sub =
    variant === "telegram_group"
      ? "Enviado pro grupo do Telegram"
      : "Broadcast pros assinantes do bot (SendPulse)";
  return (
    <div className="rounded-2xl p-3 border border-sky-900/30 bg-slate-900/60">
      <div className="flex items-center gap-2 mb-2">
        <Send className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
          Telegram · {variant === "telegram_group" ? "Grupo" : "x1 broadcast"}
        </span>
      </div>
      <div className="flex">
        <div
          className="max-w-[90%] rounded-2xl rounded-tl-sm px-3 py-2 text-xs whitespace-pre-wrap break-words text-white shadow"
          style={{ background: "#2B5278" }}
        >
          {content.image_url && (
            <img
              src={content.image_url}
              alt="Foto"
              className="w-full h-auto rounded mb-1.5 max-w-[260px]"
              style={{ objectFit: "cover" }}
            />
          )}
          {text}
          <div className="text-[9px] text-sky-200/80 text-right mt-1">{nowHHmm()}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground italic mt-1.5 pl-1">{sub}</div>
    </div>
  );
}

// ---------- Push ----------
function PushPreview({ content }: { content: Record<string, any> }) {
  const title = interpolate(content.title ?? "") || "(sem título)";
  const body = interpolate(content.body ?? "") || "(sem mensagem)";
  return (
    <div className="rounded-2xl bg-slate-900/40 border border-slate-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Notificação · agora
        </span>
      </div>
      <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-2.5 flex items-start gap-2">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold truncate">
              Premier FC
            </div>
            <div className="text-[9px] text-slate-500 shrink-0">agora</div>
          </div>
          <div className="text-xs font-bold text-white truncate">{title}</div>
          <div className="text-[11px] text-slate-300 line-clamp-2 whitespace-pre-wrap">{body}</div>
        </div>
      </div>
      {content.image_url && (
        <img
          src={content.image_url}
          alt="Banner do push"
          className="mt-2 w-full h-auto rounded-lg border border-slate-700"
          style={{ maxHeight: 180, objectFit: "cover" }}
        />
      )}
    </div>
  );
}

// ---------- Popup ----------
function PopupPreview({ content }: { content: Record<string, any> }) {
  const title = interpolate(content.title ?? "") || "(sem título)";
  const body = interpolate(content.body ?? "") || "(sem descrição)";
  const cta = interpolate(content.cta ?? "") || "Continuar";
  return (
    <div className="rounded-xl p-4 border border-slate-700 bg-black/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative max-w-sm mx-auto rounded-2xl border border-emerald-500/30 bg-[#112236] p-5 shadow-2xl">
        <button
          className="absolute top-2 right-2 text-slate-400 hover:text-white"
          aria-label="Fechar (preview)"
          type="button"
          disabled
        >
          <X className="w-4 h-4" />
        </button>
        <div className="space-y-2 text-center">
          {content.image_url && (
            <img
              src={content.image_url}
              alt="Banner do popup"
              className="w-full h-auto rounded-lg border border-emerald-500/20"
              style={{ maxHeight: 220, objectFit: "cover" }}
            />
          )}
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{body}</p>
          <button
            type="button"
            disabled
            className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-400 text-slate-900"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Image hint ----------
function ImageHint({ channel }: { channel: ChannelKey }) {
  const hints: Partial<Record<ChannelKey, { dims: string; note?: string }>> = {
    push: { dims: "1024×512 px", note: "imagem grande (modo expandido Android)" },
    popup: { dims: "1080×1350 px", note: "banner vertical centralizado" },
    email: { dims: "largura máx. 600 px", note: "header/imagem inline" },
  };
  const h = hints[channel];
  if (!h) return null;
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 p-2 text-[10px] text-muted-foreground">
      <span className="font-bold text-foreground/80 uppercase tracking-wider">Imagem:</span>{" "}
      recomendado <strong className="text-foreground">{h.dims}</strong>
      {h.note && <> — {h.note}</>}. Upload em breve.
    </div>
  );
}
