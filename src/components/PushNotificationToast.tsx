import { useMemo, useState } from "react";
import { Bell, ExternalLink, X } from "lucide-react";

export type PushNotificationPayload = {
  title?: string | null;
  body?: string | null;
  image?: string | null;
  image_url?: string | null;
  url?: string | null;
  link_url?: string | null;
};

type Props = {
  payload: PushNotificationPayload;
  onClose: () => void;
};

export function PushNotificationToast({ payload, onClose }: Props) {
  const [imageVisible, setImageVisible] = useState(true);
  const imageUrl = payload.image || payload.image_url || "";
  const targetUrl = payload.url || payload.link_url || "";
  const title = (payload.title || "Premier Ultra").trim();
  const body = (payload.body || "Nova atualização disponível pra você.").trim();

  const canOpen = useMemo(() => targetUrl.trim().length > 0, [targetUrl]);

  const handleOpen = () => {
    if (!canOpen) return;
    onClose();
    window.location.assign(targetUrl);
  };

  return (
    <section
      className="w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-primary/40 bg-card text-card-foreground shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
      role="status"
      aria-live="polite"
    >
      <div className="relative bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.22),transparent_62%)] p-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition hover:text-foreground"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2 pr-9">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)]">
            <Bell className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-bold uppercase text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Nova mensagem
          </span>
        </div>

        {imageUrl && imageVisible && (
          <button
            type="button"
            onClick={handleOpen}
            disabled={!canOpen}
            className="mb-3 block w-full overflow-hidden rounded-xl border border-primary/25 bg-background/45 text-left disabled:cursor-default"
          >
            <img
              src={imageUrl}
              alt={title}
              className="max-h-56 w-full object-cover"
              loading="eager"
              onError={() => setImageVisible(false)}
            />
          </button>
        )}

        <button
          type="button"
          onClick={handleOpen}
          disabled={!canOpen}
          className="block w-full text-left disabled:cursor-default"
        >
          <h3 className="break-words pr-8 text-2xl font-black leading-[0.95] text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {title}
          </h3>
          {body && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{body}</p>}
        </button>

        {canOpen && (
          <button
            type="button"
            onClick={handleOpen}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] transition active:scale-[0.98]"
          >
            Abrir agora
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}