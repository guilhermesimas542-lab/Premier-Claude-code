import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface LogoInputProps {
  onUploadComplete: (url: string) => void;
  currentPreview?: string | null;
}

export function LogoInput({ onUploadComplete, currentPreview }: LogoInputProps) {
  const [preview, setPreview] = useState<string | null>(currentPreview || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusText, setStatusText] = useState("Arraste e solte, cole (Ctrl+V), ou clique para enviar o logo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPreview(currentPreview || null);
  }, [currentPreview]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setStatusText("Arquivo inválido. Use PNG, JPG ou WebP.");
      return;
    }
    setIsUploading(true);
    setStatusText("Enviando...");
    setPreview(URL.createObjectURL(file));

    const ext = file.name.split(".").pop() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("team_logos")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      setStatusText("Erro no upload. Tente novamente.");
      setIsUploading(false);
      setPreview(null);
      return;
    }

    const { data } = supabase.storage.from("team_logos").getPublicUrl(fileName);
    onUploadComplete(data.publicUrl);
    setIsUploading(false);
    setStatusText("Logo enviado com sucesso!");
  }, [onUploadComplete]);

  const fetchImageAsFile = useCallback(async (url: string) => {
    try {
      setStatusText("Buscando imagem da web...");
      setIsUploading(true);
      const response = await fetch(url);
      const blob = await response.blob();
      const name = url.substring(url.lastIndexOf("/") + 1).split("?")[0] || "logo.png";
      const file = new File([blob], name, { type: blob.type });
      await uploadFile(file);
    } catch (e) {
      console.error("Failed to fetch image from URL:", e);
      setStatusText("Não foi possível buscar a imagem. Tente salvar o arquivo primeiro.");
      setIsUploading(false);
      setPreview(null);
    }
  }, [uploadFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Local files first
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
      return;
    }

    // 2. Extract image URL from dropped HTML (drag from browser)
    const html = e.dataTransfer.getData("text/html");
    if (html) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const img = tempDiv.querySelector("img");
      if (img?.src) {
        await fetchImageAsFile(img.src);
        return;
      }
    }

    // 3. Plain text URL
    const textUrl = e.dataTransfer.getData("text/plain");
    if (textUrl && (textUrl.startsWith("http://") || textUrl.startsWith("https://"))) {
      await fetchImageAsFile(textUrl);
      return;
    }

    setStatusText("Não foi possível processar o item arrastado.");
  }, [uploadFile, fetchImageAsFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current) return;
      if (e.clipboardData?.files?.[0]) uploadFile(e.clipboardData.files[0]);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [uploadFile]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-center cursor-pointer transition-all outline-none ${
        isDragOver
          ? "border-primary bg-primary/10"
          : "border-border/50 hover:border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{statusText}</span>
        </div>
      ) : preview ? (
        <img src={preview} alt="Preview" className="h-full w-full object-contain p-2" />
      ) : (
        <p className="text-xs text-muted-foreground px-4">{statusText}</p>
      )}
    </div>
  );
}
