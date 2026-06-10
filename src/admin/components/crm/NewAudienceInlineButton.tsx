import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudienceBuilder } from "./AudienceBuilder";
import { useAudiences, type Audience, type NewAudiencePayload } from "../../hooks/crm/useAudiences";

interface Props {
  /** Disparado depois que a audiência for criada. Use pra auto-selecionar no formulário pai. */
  onCreated: (audience: Audience) => void;
  /** Texto do botão. Default "Nova audiência". */
  label?: string;
  /** Variante visual do botão. */
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default";
  className?: string;
}

/**
 * Botão "+ Nova audiência" reutilizável dentro de wizards (Schedule/Jornada).
 * Abre o AudienceBuilder em Dialog sobreposto SEM fechar o wizard pai,
 * pra não perder a configuração já feita.
 */
export function NewAudienceInlineButton({
  onCreated,
  label = "Nova audiência",
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { create, refresh } = useAudiences();

  const handleSave = async (payload: NewAudiencePayload): Promise<Audience | null> => {
    const created = await create(payload);
    if (created) {
      await refresh();
      onCreated(created);
    }
    return created;
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        {label}
      </Button>
      <AudienceBuilder
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        editing={null}
      />
    </>
  );
}
