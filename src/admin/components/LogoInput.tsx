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
  const [statusText, setStatusText] = useState("Arraste, cole (Ctrl+V), ou clique para enviar o logo");
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  // Global paste listener - works when container is focused or contains focus
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      // Check if our container has focus or contains the focused element
      const container = containerRef.current;
      if (!container) return;
      
      const active = document.activeElement;
      if (active !== container && !container.contains(active)) return;

      const files = e.clipboardData?.files;
      if (files && files.length > 0 && files[0].type.startsWith("image/")) {
        e.preventDefault();
        uploadFile(files[0]);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [uploadFile]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-center cursor-pointer transition-all outline-none focus:ring-2 focus:ring-primary/50 ${
        isDragOver
          ? "border-primary bg-primary/10"
          : "border-border/50 hover:border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        containerRef.current?.focus();
        fileInputRef.current?.click();
      }}
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
