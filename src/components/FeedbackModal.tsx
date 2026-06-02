import { useState, useRef } from "react";
import { X, ImagePlus, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "bug", label: "🐛 Bug" },
  { key: "sugestao", label: "💡 Sugerencia" },
  { key: "duvida", label: "❓ Duda" },
  { key: "outro", label: "📝 Otro" },
] as const;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export default function FeedbackModal({ isOpen, onClose, userId, userEmail }: FeedbackModalProps) {
  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const canSubmit = category && message.trim().length >= 10 && !submitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      let screenshot_url: string | null = null;

      if (screenshotFile) {
        const ext = screenshotFile.name.split(".").pop() || "png";
        const path = `feedback/${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback_screenshots")
          .upload(path, screenshotFile, { contentType: screenshotFile.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("feedback_screenshots")
          .getPublicUrl(path);
        screenshot_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("user_feedback" as any).insert({
        user_id: userId,
        email: userEmail,
        category,
        message: message.trim(),
        screenshot_url,
      } as any);

      if (error) throw error;

      toast.success("Feedback enviado! Obrigado.");
      setCategory("");
      setMessage("");
      removeScreenshot();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al enviar feedback. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: "#0D1929", border: "1.5px solid rgba(255,255,255,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: "#00FF7F" }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>
              Enviar Feedback
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category pills */}
        <div>
          <p className="text-xs mb-2" style={{ color: "#94A3B8" }}>Categoria</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: category === c.key ? "rgba(0,255,127,0.15)" : "rgba(255,255,255,0.05)",
                  border: category === c.key ? "1.5px solid rgba(0,255,127,0.5)" : "1.5px solid rgba(255,255,255,0.15)",
                  color: category === c.key ? "#00FF7F" : "#94A3B8",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="text-xs mb-2" style={{ color: "#94A3B8" }}>Mensaje</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe con detalle..."
            rows={4}
            className="w-full rounded-xl p-3 text-sm resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <p className="text-[10px] mt-1" style={{ color: message.trim().length < 10 ? "#94A3B8" : "#00FF7F" }}>
            {message.trim().length}/10 caracteres mínimos
          </p>
        </div>

        {/* Screenshot */}
        <div>
          <p className="text-xs mb-2" style={{ color: "#94A3B8" }}>Screenshot (opcional)</p>
          {screenshotPreview ? (
            <div className="relative inline-block">
              <img
                src={screenshotPreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg"
                style={{ border: "1.5px solid rgba(255,255,255,0.15)" }}
              />
              <button
                onClick={removeScreenshot}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                color: "#94A3B8",
              }}
            >
              <ImagePlus className="w-4 h-4" />
              Anexar imagem
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: canSubmit ? "linear-gradient(135deg, #00FF7F, #00CC66)" : "rgba(255,255,255,0.05)",
            color: canSubmit ? "#000000" : "#94A3B8",
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 4px 15px rgba(0,255,127,0.25)" : "none",
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Feedback"}
        </button>
      </div>
    </div>
  );
}
