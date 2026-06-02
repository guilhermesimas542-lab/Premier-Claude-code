import { useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Upload, Sparkles } from "lucide-react";
import {
  BANNER_TEMPLATES,
  getTemplate,
  getCanvasSize,
  isImageSupportedChannel,
  type BannerValues,
  type BannerChannelKey,
} from "../../lib/crm/bannerTemplates";
import type { ChannelKey } from "../../lib/crm/channels";

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
  const [templateKey, setTemplateKey] = useState<string>(BANNER_TEMPLATES[0].key);
  const template = useMemo(() => getTemplate(templateKey), [templateKey]);
  const [values, setValues] = useState<BannerValues>(template.defaults);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>(() => {
    const parts = [template.defaults.title, template.defaults.subtitle, template.defaults.cta]
      .filter(Boolean)
      .join(" — ");
    return parts ? `banner com "${parts}"` : "";
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // When user switches template, reset to template defaults
  const switchTemplate = (k: string) => {
    setTemplateKey(k);
    setValues({ ...getTemplate(k).defaults, bg_image_url: values.bg_image_url });
  };

  const size = getCanvasSize(channel);
  // Preview is scaled down to fit the modal
  const PREVIEW_MAX_W = 360;
  const previewScale = Math.min(1, PREVIEW_MAX_W / size.w);

  const handleFile = (file: File, mode: "bg" | "direct") => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (mode === "bg") {
        setValues((v) => ({ ...v, bg_image_url: url }));
        toast.success("Imagem carregada como fundo do banner");
      } else {
        setUploadedDataUrl(url);
      }
    };
    reader.onerror = () => toast.error("Falha lendo o arquivo");
    reader.readAsDataURL(file);
  };

  async function uploadBlob(blob: Blob): Promise<string> {
    const path = `${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("crm-creatives")
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("crm-creatives").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Falha pegando URL pública");
    return data.publicUrl;
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
      if (error) throw error;
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

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Aba IA: imagem já está hospedada no bucket — só passa a URL adiante
      if (tab === "ai" && aiPreviewUrl) {
        toast.success("Imagem anexada!");
        onGenerated(aiPreviewUrl);
        onClose();
        return;
      }

      // Aba upload com imagem pronta = anexa direto, sem rasterizar
      if (tab === "upload" && uploadedDataUrl) {
        // Converte dataURL -> Blob
        const resp = await fetch(uploadedDataUrl);
        const blob = await resp.blob();
        const url = await uploadBlob(blob);
        toast.success("Imagem anexada!");
        onGenerated(url);
        onClose();
        return;
      }



      // Aba modelo: rasteriza o node
      const node = previewRef.current;
      if (!node) {
        toast.error("Preview não está pronto.");
        return;
      }
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: size.w,
        height: size.h,
        windowWidth: size.w,
        windowHeight: size.h,
      });
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob retornou null"))),
          "image/png",
          0.95
        )
      );
      const url = await uploadBlob(blob);
      toast.success("Banner gerado e anexado!");
      onGenerated(url);
      onClose();
    } catch (e: any) {
      console.error("[ImageComposer]", e);
      toast.error(`Erro ao gerar imagem: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const TemplateRender = template.render;

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
          <TabButton active={tab === "model"} onClick={() => setTab("model")}>Modelo</TabButton>
          <TabButton active={tab === "ai"} onClick={() => setTab("ai")}>IA</TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>Upload</TabButton>
        </div>

        <div className="flex-1 overflow-auto grid md:grid-cols-2 gap-4 p-4">
          {/* Form */}
          <div className="space-y-3">
            {tab === "model" && (
              <>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {BANNER_TEMPLATES.map((t) => (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => switchTemplate(t.key)}
                        className={`text-left rounded-md border px-3 py-2 transition ${
                          templateKey === t.key
                            ? "border-emerald-400 bg-emerald-400/5"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div className="text-xs font-semibold">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground">{t.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {template.fields.map((f) => {
                  const val = values[f.key] ?? "";
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label>{f.label}</Label>
                        <Textarea
                          value={val}
                          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          rows={2}
                        />
                      </div>
                    );
                  }
                  if (f.type === "color") {
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label>{f.label}</Label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={val || "#00FF7F"}
                            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                            className="h-9 w-12 rounded border border-border bg-transparent"
                          />
                          <Input
                            value={val}
                            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                            placeholder="#00FF7F"
                          />
                        </div>
                      </div>
                    );
                  }
                  if (f.type === "image") {
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label>{f.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={val}
                            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                            placeholder="https://..."
                            className="flex-1"
                          />
                          <label className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-border cursor-pointer hover:bg-muted/30">
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file, "bg");
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1">
                      <Label>{f.label}</Label>
                      <Input
                        value={val}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {tab === "upload" && (
              <div className="space-y-3">
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
                        if (file) handleFile(file, "direct");
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                {uploadedDataUrl && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <img
                      src={uploadedDataUrl}
                      alt="Preview do upload"
                      className="w-full h-auto block"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Preview {Math.round(previewScale * 100)}% · {size.w}×{size.h}
            </div>
            <div className="rounded-lg border border-border bg-black/30 p-3 overflow-auto">
              {tab === "model" ? (
                <div
                  style={{
                    width: size.w * previewScale,
                    height: size.h * previewScale,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                      width: size.w,
                      height: size.h,
                    }}
                  >
                    {/* O nó realmente capturado: tamanho real */}
                    <div ref={previewRef}>
                      <TemplateRender values={values} width={size.w} height={size.h} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {uploadedDataUrl
                    ? "Imagem pronta acima — será anexada como está."
                    : "Selecione um arquivo pra anexar."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground">
            Recomendado: {size.w}×{size.h}px · upload em <code>crm-creatives</code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading || (tab === "upload" && !uploadedDataUrl)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar e anexar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Backdrop>
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
