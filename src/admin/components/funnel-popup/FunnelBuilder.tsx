import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, GripVertical } from "lucide-react";
import type { FunnelQuestion, PopupFormState } from "./types";

interface Props {
  form: PopupFormState;
  onChange: (form: PopupFormState) => void;
}

export default function FunnelBuilder({ form, onChange }: Props) {
  const update = (questions: FunnelQuestion[]) => onChange({ ...form, questions });

  const addQuestion = () => {
    update([...form.questions, { text: "", options: ["", ""] }]);
  };

  const removeQuestion = (qi: number) => {
    update(form.questions.filter((_, i) => i !== qi));
  };

  const setQuestionText = (qi: number, text: string) => {
    const q = [...form.questions];
    q[qi] = { ...q[qi], text };
    update(q);
  };

  const setOption = (qi: number, oi: number, value: string) => {
    const q = [...form.questions];
    const opts = [...q[qi].options];
    opts[oi] = value;
    q[qi] = { ...q[qi], options: opts };
    update(q);
  };

  const addOption = (qi: number) => {
    const q = [...form.questions];
    q[qi] = { ...q[qi], options: [...q[qi].options, ""] };
    update(q);
  };

  const removeOption = (qi: number, oi: number) => {
    const q = [...form.questions];
    q[qi] = { ...q[qi], options: q[qi].options.filter((_, i) => i !== oi) };
    update(q);
  };

  return (
    <div className="space-y-3 p-3 rounded-xl" style={{ background: "rgba(0,255,0,0.03)", border: "1px dashed rgba(0,255,0,0.15)" }}>
      <p className="text-xs font-semibold text-white">
        Funil de Perguntas <span className="text-gray-500 font-normal">(opcional)</span>
      </p>

      {form.questions.map((q, qi) => (
        <div key={qi} className="space-y-2 p-3 rounded-lg bg-black/20 border border-white/5 relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-green-400 flex items-center gap-1">
              <GripVertical className="w-3 h-3 text-gray-600" />
              Pergunta {qi + 1}
            </span>
            <button
              type="button"
              onClick={() => removeQuestion(qi)}
              className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remover
            </button>
          </div>

          <Input
            placeholder={`Texto da pergunta ${qi + 1}`}
            value={q.text}
            onChange={(e) => setQuestionText(qi, e.target.value)}
            className="bg-gray-800 border-gray-700 text-sm"
          />

          <Label className="text-gray-500 text-[10px]">Opções</Label>
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <Input
                placeholder={`Opção ${oi + 1}`}
                value={opt}
                onChange={(e) => setOption(qi, oi, e.target.value)}
                className="bg-gray-800 border-gray-700 text-xs flex-1"
              />
              {q.options.length > 1 && (
                <button type="button" onClick={() => removeOption(qi, oi)} className="text-gray-500 hover:text-red-400 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => addOption(qi)}
            className="text-[11px] text-green-400 hover:text-green-300 flex items-center gap-1 mt-1"
          >
            <Plus className="w-3 h-3" /> Adicionar Opção
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addQuestion}
        className="w-full border-dashed border-green-600/30 text-green-400 hover:text-green-300 hover:bg-green-900/20"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Pergunta
      </Button>
    </div>
  );
}
