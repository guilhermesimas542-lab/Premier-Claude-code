import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { mockGetUser } from "@/mocks/user";

const STORAGE_KEY = "push_subscribed_v2";

type Status = "unsupported" | "denied" | "subscribed" | "default" | "subscribing";

function detectStatus(userId?: string): Status {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  if (
    Notification.permission === "granted" &&
    userId &&
    localStorage.getItem(STORAGE_KEY) === userId
  ) {
    return "subscribed";
  }
  return "default";
}

interface EnablePushButtonProps {
  variant?: "card" | "inline";
}

export default function EnablePushButton({ variant = "card" }: EnablePushButtonProps) {
  const { subscribe, subscribing } = usePushNotifications();
  const [status, setStatus] = useState<Status>("default");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const user = mockGetUser();
    setUserId(user?.id);
    setEmail(user?.email);
    setStatus(detectStatus(user?.id));
  }, []);

  // Atualiza status quando subscribing termina
  useEffect(() => {
    if (subscribing) {
      setStatus("subscribing");
      return;
    }
    setStatus(detectStatus(userId));
  }, [subscribing, userId]);

  if (status === "unsupported") return null;
  // Já ativo → não mostra nada
  if (status === "subscribed") {
    if (variant === "inline") return null;
    return (
      <section
        className="rounded-2xl p-4 sm:p-5 flex items-center gap-3"
        style={{ background: "#112236", border: "1.5px solid rgba(34,197,94,0.40)", borderRadius: 16 }}
      >
        <BellRing className="w-5 h-5" style={{ color: "#22C55E" }} />
        <div>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "#FFFFFF",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            Notificaciones activas
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>
            Te avisamos cuando salga un tip nuevo
          </p>
        </div>
      </section>
    );
  }

  const handleClick = async () => {
    if (status === "denied") return; // botão fica desabilitado
    await subscribe(userId, email);
    setStatus(detectStatus(userId));
  };

  const label =
    status === "subscribing"
      ? "Activando..."
      : status === "denied"
      ? "Bloqueadas — habilitalas en ajustes del navegador"
      : "Activar notificaciones";

  const Icon =
    status === "subscribing" ? Loader2 : status === "denied" ? BellOff : Bell;

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        disabled={status === "denied" || status === "subscribing"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white disabled:opacity-60"
        style={{ background: status === "denied" ? "#475569" : "#1B6CFE", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
      >
        <Icon className={`w-4 h-4 ${status === "subscribing" ? "animate-spin" : ""}`} />
        {label}
      </button>
    );
  }

  return (
    <section
      className="rounded-2xl p-4 sm:p-5 space-y-3"
      style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(27,108,254,0.15)", border: "1px solid rgba(27,108,254,0.4)" }}
        >
          <Bell className="w-5 h-5" style={{ color: "#1B6CFE" }} />
        </div>
        <div>
          <h3
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#FFFFFF",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            Notificaciones
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>
            Recibí los tips y greens al instante
          </p>
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={status === "denied" || status === "subscribing"}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white disabled:opacity-60"
        style={{
          background: status === "denied" ? "#475569" : "#1B6CFE",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
        }}
      >
        <Icon className={`w-4 h-4 ${status === "subscribing" ? "animate-spin" : ""}`} />
        {label}
      </button>

      {status === "denied" && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
          Habilitá las notificaciones en los ajustes del navegador y volvé a esta pantalla.
        </p>
      )}
    </section>
  );
}
