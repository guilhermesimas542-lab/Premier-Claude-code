import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudienceBuilder } from "./AudienceBuilder";
import type { Audience, NewAudiencePayload } from "../../hooks/crm/useAudiences";

interface Props {
  /** Função create vinda do useAudiences do componente pai (pra reusar a instância do hook). */
  create: (payload: NewAudiencePayload) => Promise<Audience | null>;
  /** Refresh da lista de audiências do pai, pra dropdown ficar em dia. */
  refresh: () => Promise<void> | void;
  /** Disparado depois de criar — use pra auto-selecionar a audiência nova. */
  onCreated: (audience: Audience) => void;
  label?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default";
  className?: string;
}

/**
 * Botão "+ Nova audiência" reutilizável dentro de wizards/sheets (Schedule, Jornada).
 * Abre o AudienceBuilder em Dialog sobreposto SEM fechar o wizard pai,
 * pra não perder a configuração já em andamento.
 */
export function NewAudienceInlineButton({
  create,
  refresh,
  onCreated,
  label = "Nova audiência",
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

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
