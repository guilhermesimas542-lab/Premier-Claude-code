import { Wrench } from "lucide-react";

interface Props {
  message?: string;
}

export function MaintenanceScreen({ message }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-lg">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Sistema en actualización</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message || "Estamos actualizando el sistema. El IA Tipster estará disponible pronto."}
        </p>
      </div>
    </div>
  );
}
