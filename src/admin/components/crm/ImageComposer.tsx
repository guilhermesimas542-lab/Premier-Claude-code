import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Upload, Sparkles, Trash2, ImageIcon, FileText, Save } from "lucide-react";
import {
  getCanvasSize,
  isImageSupportedChannel,
  type BannerChannelKey,
} from "../../lib/crm/bannerTemplates";
import type { ChannelKey } from "../../lib/crm/channels";
import { useImageTemplates, type ImageTemplate } from "../../hooks/crm/useImageTemplates";

interface Props {
  channel: ChannelKey;
  onGenerated: (url: string) => void;
  onClose: () => void;
}

type Tab = "model" | "upload" | "ai";

export function ImageComposer({ channel, onGenerated, onClose }: Props) {
  if (!isImageSupportedChannel(channel)) {
    return (
      <Backdrop onClose={onClose}>
        <div className="p-6 text-center text-sm text-muted-foreground">
          Esse canal não suporta imagens.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </Backdrop>
    );
  }

  return <ImageComposerInner channel={channel} onGenerated={onGenerated} onClose={onClose} />;
}

function ImageComposerInner({
  channel,
  onGenerated,
  onClose,
}: {
  channel: BannerChannelKey;
  onGenerated: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("model");
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [uploadingFromUpload, setUploadingFromUpload] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);

  const { items: templates, loading: loadingTemplates, create: createTemplate, remove: removeTemplate } =
    useImageTemplates();

  const size = getCanvasSize(channel);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setUploadedDataUrl(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Falha lendo o arquivo");
    reader.readAsDataURL(file);
  };

  async function uploadBlob(blob: Blob): Promise<string> {
    const path = `${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("crm-creatives")
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (error) throw error;
    const { data: signed, error: signErr } = await supabase.storage
      .from("crm-creatives")
      .createSignedUrl(path, 60 * 60 * 24 * 3650);
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "Falha gerando URL assinada");
    return signed.signedUrl;
  }

  const handleGenerateAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Descreva a imagem antes de gerar.");
      return;
    }
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-generate-image", {
        body: { prompt, channel },
      });
      if (error) {
        let detail = error.message;
        try {
          // @ts-ignore — context pode conter a resposta da edge function
          const body = await error.context?.json?.();
          detail = body?.detail || body?.error || detail;
        } catch {}
        toast.error(`Falha ao gerar: ${detail}`);
        return;
      }
      if (!data?.url) throw new Error("Resposta sem URL");
      setAiPreviewUrl(data.url);
      toast.success("Imagem gerada! Revise antes de anexar.");
    } catch (e: any) {
      console.error("[ImageComposer/AI]", e);
      toast.error(`Falha ao gerar: ${e?.message ?? String(e)}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAttachAi = () => {
    if (!aiPreviewUrl) return;
    onGenerated(aiPreviewUrl);
    toast.success("Imagem anexada!");
    onClose();
  };

  const handleAttachUpload = async () => {
    if (!uploadedDataUrl) return;
    setUploadingFromUpload(true);
    try {
      const resp = await fetch(uploadedDataUrl);
      const blob = await resp.blob();
      const url = await uploadBlob(blob);
      onGenerated(url);
      toast.success("Imagem anexada!");
      onClose();
    } catch (e: any) {
      console.error("[ImageComposer/upload]", e);
      toast.error(`Erro no upload: ${e?.message ?? String(e)}`);
    } finally {
      setUploadingFromUpload(false);
    }
  };

  const handleSaveImageTemplate = async (image_url: string) => {
    const name = window.prompt("Nome do modelo:");
    if (!name?.trim()) return;
    await createTemplate({ name, kind: "image", channel, image_url });
  };

  const handleSavePromptTemplate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Escreva o prompt antes de salvar.");
      return;
    }
    const name = window.prompt("Nome do modelo:");
    if (!name?.trim()) return;
    await createTemplate({ name, kind: "prompt", channel, prompt });
  };

  const handleSaveUploadedAsTemplate = async () => {
    if (!uploadedDataUrl) return;
    const name = window.prompt("Nome do modelo:");
    if (!name?.trim()) return;
    try {
      const resp = await fetch(uploadedDataUrl);
      const blob = await resp.blob();
      const url = await uploadBlob(blob);
      await createTemplate({ name, kind: "image", channel, image_url: url });
    } catch (e: any) {
      toast.error(`Erro salvando modelo: ${e?.message ?? String(e)}`);
    }
  };

  const handleUseTemplate = (tpl: ImageTemplate) => {
    if (tpl.kind === "image" && tpl.image_url) {
      onGenerated(tpl.image_url);
      toast.success(`Modelo "${tpl.name}" anexado!`);
      onClose();
      return;
    }
    if (tpl.kind === "prompt" && tpl.prompt) {
      setAiPrompt(tpl.prompt);
      setTab("ai");
      toast.success(`Prompt "${tpl.name}" carregado na aba IA.`);
    }
  };

  const handleRemoveTemplate = async (tpl: ImageTemplate) => {
    if (!window.confirm(`Excluir modelo "${tpl.name}"?`)) return;
    await removeTemplate(tpl.id);
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="w-[min(95vw,920px)] max-h-[90vh] overflow-hidden flex flex-col bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold">Criar imagem · {channel}</h2>
            <span className="text-[10px] text-muted-foreground ml-2">{size.w}×{size.h}px</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <TabButton active={tab === "model"} onClick={() => setTab("model")}>Modelos</TabButton>
          <TabButton active={tab === "ai"} onClick={() => setTab("ai")}>IA</TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>Upload</TabButton>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === "model" && (
            <ModelTab
              templates={templates}
              loading={loadingTemplates}
              onUse={handleUseTemplate}
              onRemove={handleRemoveTemplate}
            />
          )}

          {tab === "ai" && (
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="space-y-1">
                <Label>Descreva a imagem</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="banner de odds turbinadas pro jogo Flamengo x Palmeiras, com '2.50' em destaque e botão APOSTAR"
                  rows={4}
                />
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-300/90 leading-relaxed">
                Gerar custa ~US$ 0,04 por imagem. Revise o texto da imagem antes de
                anexar — IA pode errar palavras.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={aiGenerating || !aiPrompt.trim()}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Gerando...
                    </>
                  ) : aiPreviewUrl ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Gerar de novo
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Gerar com IA
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSavePromptTemplate}
                  disabled={!aiPrompt.trim()}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Salvar texto como modelo
                </Button>
              </div>

              {aiPreviewUrl && (
                <div className="space-y-2">
                  <img
                    src={aiPreviewUrl}
                    alt="Imagem gerada por IA"
                    className="w-full h-auto block rounded border border-border"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveImageTemplate(aiPreviewUrl)}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Salvar imagem como modelo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">
                  Suba uma imagem já pronta — vamos anexar direto, sem rasterizar.
                </p>
                <label className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-2 rounded border border-border cursor-pointer hover:bg-muted/30">
                  <Upload className="w-3 h-3" />
                  <span>Escolher arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {uploadedDataUrl && (
                <>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <img
                      src={uploadedDataUrl}
                      alt="Preview do upload"
                      className="w-full h-auto block"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSaveUploadedAsTemplate}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Salvar como modelo
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground">
            Recomendado: {size.w}×{size.h}px · upload em <code>crm-creatives</code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            {tab === "ai" && (
              <Button
                size="sm"
                onClick={handleAttachAi}
                disabled={!aiPreviewUrl}
              >
                Anexar esta imagem
              </Button>
            )}
            {tab === "upload" && (
              <Button
                size="sm"
                onClick={handleAttachUpload}
                disabled={!uploadedDataUrl || uploadingFromUpload}
              >
                {uploadingFromUpload ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Anexar imagem"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Backdrop>
  );
}

function ModelTab({
  templates,
  loading,
  onUse,
  onRemove,
}: {
  templates: ImageTemplate[];
  loading: boolean;
  onUse: (tpl: ImageTemplate) => void;
  onRemove: (tpl: ImageTemplate) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregando modelos...
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="text-center py-10 px-4">
        <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
          Você ainda não tem modelos. Gere uma imagem (aba IA) ou faça upload e salve aqui pra reusar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((tpl) => (
        <div
          key={tpl.id}
          className="rounded-lg border border-border bg-muted/10 overflow-hidden flex flex-col"
        >
          {tpl.kind === "image" && tpl.image_url ? (
            <div className="aspect-video bg-black/30 overflow-hidden">
              <img
                src={tpl.image_url}
                alt={tpl.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-video bg-black/30 p-3 overflow-hidden flex">
              <div className="flex-1 text-[11px] text-muted-foreground line-clamp-6 whitespace-pre-wrap leading-snug">
                {tpl.prompt}
              </div>
            </div>
          )}
          <div className="p-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate flex items-center gap-1">
                {tpl.kind === "image" ? (
                  <ImageIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{tpl.name}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tpl.kind === "image" ? "Imagem" : "Prompt IA"}
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onUse(tpl)}>
              Usar
            </Button>
            <button
              type="button"
              onClick={() => onRemove(tpl)}
              className="text-muted-foreground hover:text-red-400 p-1"
              title="Excluir modelo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
        active
          ? "border-emerald-400 text-emerald-400"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
