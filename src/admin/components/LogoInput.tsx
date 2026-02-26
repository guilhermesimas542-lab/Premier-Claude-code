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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPreview(currentPreview || null);
  }, [currentPreview]);

  const handleFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsUploading(true);
    setPreview(URL.createObjectURL(file));

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("team_logos")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setPreview(null);
      return;
    }

    const { data } = supabase.storage.from("team_logos").getPublicUrl(fileName);
    onUploadComplete(data.publicUrl);
    setIsUploading(false);
  }, [onUploadComplete]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current) return;
      if (e.clipboardData?.files?.[0]) handleFile(e.clipboardData.files[0]);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [handleFile]);

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
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Enviando...</span>
        </div>
      ) : preview ? (
        <img src={preview} alt="Preview" className="h-full w-full object-contain p-2" />
      ) : (
        <p className="text-xs text-muted-foreground px-4">
          Arraste e solte, cole (Ctrl+V), ou clique para enviar o logo
        </p>
      )}
    </div>
  );
}
