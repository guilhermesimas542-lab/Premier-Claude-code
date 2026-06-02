import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AiTipsterKillSwitchCard() {
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("ai_tipster_settings" as any)
      .select("is_enabled, disabled_message")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      setEnabled(!!(data as any).is_enabled);
      setMessage((data as any).disabled_message ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    const { error } = await supabase
      .from("ai_tipster_settings" as any)
      .update({ is_enabled: next, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      toast.error("Falha ao atualizar status");
      setEnabled(!next);
    } else {
      toast.success(next ? "IA Tipster ativada" : "IA Tipster desativada");
    }
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_tipster_settings" as any)
      .update({ disabled_message: message, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error("Falha ao salvar mensagem");
    else toast.success("Mensagem salva");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
          <span className={enabled ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
            {enabled ? "Ativo" : "Desativado"}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Mensagem exibida quando desativado:</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            disabled={loading}
          />
          <Button onClick={handleSaveMessage} disabled={saving || loading} size="sm">
            {saving ? "Salvando..." : "Salvar mensagem"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Quando desativado, todos os clientes veem a mensagem acima. Chat e Ao Vivo ficam
          inacessíveis simultaneamente. Mudanças refletem em até 60s no cliente.
        </p>
      </CardContent>
    </Card>
  );
}
