import { useParams } from "react-router-dom";
import { ScheduleWizard } from "../../components/crm/wizard/ScheduleWizard";

/**
 * Página route da edição de Schedule.
 * Rota: /admin/crm/schedules/:id/edit
 * Reusa o ScheduleWizard com editingId — carrega o schedule e permite atualizar.
 */
export default function AdminCrmScheduleEdit() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScheduleWizard editingId={id} />;
}
