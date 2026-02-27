import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizOptionCardProps {
  index: number;
  text: string;
  onClick: () => void;
}

export default function QuizOptionCard({ index, text, onClick }: QuizOptionCardProps) {
  const letter = String.fromCharCode(65 + index);

  // Split on " — " (em dash) or " - " (hyphen) for primary/secondary text
  const separatorMatch = text.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  const primaryText = separatorMatch ? separatorMatch[1].trim() : text;
  const secondaryText = separatorMatch ? separatorMatch[2].trim() : null;

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full py-4 sm:py-6 text-left border border-white/15 hover:border-primary hover:bg-primary/10 transition-all duration-300 h-auto whitespace-normal bg-transparent"
    >
      <div className="flex items-center justify-start w-full">
        {/* Letter circle */}
        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0 mr-3">
          {letter}
        </span>

        {/* Text */}
        <span className="text-sm sm:text-base font-medium text-left flex-1">
          {secondaryText ? (
            <>
              <span className="font-semibold">{primaryText}</span>
              <span className="text-muted-foreground"> — {secondaryText}</span>
            </>
          ) : (
            primaryText
          )}
        </span>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
      </div>
    </Button>
  );
}
