import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3.5 pb-4 pt-2" style={{ background: "#0a0b0e" }}>
      <div
        className="flex items-end gap-3 rounded-[22px] pl-[18px] pr-3 py-3"
        style={{
          border: "1px solid rgba(235,235,245,.12)",
          background: "rgba(235,235,245,.04)",
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Pregunta sobre un partido"
          rows={1}
          disabled={disabled}
          className="min-h-[24px] max-h-[120px] flex-1 resize-none border-0 bg-transparent p-0 text-[15px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ color: "#ECEAE4" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-40"
          style={{ background: "#ffffff" }}
        >
          <Send className="h-[18px] w-[18px]" style={{ color: "#14151a" }} />
        </button>
      </div>
    </div>
  );
}
