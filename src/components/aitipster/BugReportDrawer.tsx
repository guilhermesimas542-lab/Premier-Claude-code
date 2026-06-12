import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bug, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipCacheId: string;
}

const MAX_LENGTH = 1000;

export function BugReportDrawer({ open, onOpenChange, tipCacheId }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { data, error } = await invokeWithAuth("ai-report-bug", {
        body: { tip_cache_id: tipCacheId, message: trimmed },
      });
      if (error || (data as any)?.error) {
        const msg = error?.message || (data as any)?.error || "Error al enviar.";
        console.error("bug report error", msg);
        setErrorMsg("No pudimos enviar ahora. Inténtalo de nuevo en unos instantes.");
        return;
      }
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setMessage("");
        setSubmitted(false);
      }, 2200);
    } catch (err: any) {
      console.error("bug report error", err);
      setErrorMsg("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (submitting) return;
    if (!open) {
      setMessage("");
      setErrorMsg(null);
      setSubmitted(false);
    }
    onOpenChange(open);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Reportar un bug
          </DrawerTitle>
          <DrawerDescription>
            Cuéntanos qué pasó con este análisis. Leemos y ajustamos lo que esté torcido.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">
          {submitted ? (
            <div className="flex items-center gap-2 text-sm py-6 text-primary">
              <CheckCircle2 className="w-5 h-5" />
              Recibimos tu reporte. Vamos a analizarlo.
            </div>
          ) : (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Ej: La entrada principal recomendó Over 2.5, pero el partido ya estaba 3-0 cuando generé el análisis."
                rows={5}
                disabled={submitting}
                className="resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {message.length} / {MAX_LENGTH}
                </span>
                {errorMsg && (
                  <span className="text-[10px] text-destructive">{errorMsg}</span>
                )}
              </div>
            </>
          )}
        </div>

        <DrawerFooter>
          {!submitted && (
            <>
              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
              >
                {submitting ? "Enviando..." : "Enviar reporte"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
