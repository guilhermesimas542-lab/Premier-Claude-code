import { Progress } from "@/components/ui/progress";
import QuizOptionCard from "./QuizOptionCard";

interface QuizStepProps {
  questionText: string;
  options: string[];
  currentStep: number;
  totalSteps: number;
  onAnswer: (option: string) => void;
  buttonColor?: string | null;
}

export default function QuizStep({ questionText, options, currentStep, totalSteps, onAnswer, buttonColor }: QuizStepProps) {
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div>
      <div className="p-4 pb-0">
        <Progress value={progressValue} className="h-2 bg-zinc-800 [&>[data-state=complete]]:bg-primary [&>div]:bg-primary" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Etapa {currentStep} de {totalSteps}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-center mb-6">
          {questionText}
        </h3>

        <div className="space-y-3">
          {options.filter(Boolean).map((opt, i) => (
            <QuizOptionCard key={i} index={i} text={opt} onClick={() => onAnswer(opt)} buttonColor={buttonColor} />
          ))}
        </div>
      </div>
    </div>
  );
}
