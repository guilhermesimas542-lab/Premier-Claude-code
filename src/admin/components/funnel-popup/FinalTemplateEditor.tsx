import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Check } from "lucide-react";
import type { FinalTemplateType, FinalConfig } from "@/components/funnel/FinalTemplates";
import type { PopupFormState } from "./types";

export const FINAL_TEMPLATES: { value: FinalTemplateType; label: string; desc: string }[] = [
  { value: "default", label: "✅ Estándar", desc: "Título, beneficios y botón" },
  { value: "urgency", label: "🔴 Urgencia Simple", desc: "Línea pulsante + urgencia" },
  { value: "price_anchor", label: "💰 Anclaje de Precio", desc: "Precio tachado + descuento" },
  { value: "social_proof", label: "👥 Prueba Social", desc: "Testimonio + nº de clientes" },
  { value: "scarcity_countdown", label: "⏰ Escasez con Contador", desc: "Contador regresivo" },
  { value: "bonus_offer", label: "🎁 Oferta de Bono", desc: "Bono exclusivo" },
  { value: "plan_comparison", label: "📊 Comparativo de Planes", desc: "Tabla actual vs nuevo" },
];

interface Props {
  form: PopupFormState;
  onChange: (form: PopupFormState) => void;
}

export default function FinalTemplateEditor({ form, onChange }: Props) {
  const template = (form as any).final_template as FinalTemplateType || "default";
  const config: FinalConfig = (form as any).final_config || {};

  const setTemplate = (v: FinalTemplateType) => onChange({ ...form, final_template: v } as any);
  const setConfig = (patch: Partial<FinalConfig>) =>
    onChange({ ...form, final_config: { ...config, ...patch } } as any);

  return (
    <div className="space-y-3">
      {/* Template selector */}
      <div>
        <Label className="text-gray-500 text-[11px]">Template de la Pantalla Final</Label>
        <Select value={template} onValueChange={(v) => setTemplate(v as FinalTemplateType)}>
          <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FINAL_TEMPLATES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <div>
                  <div>{t.label}</div>
                  <div className="text-[10px] text-gray-500">{t.desc}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subtitle — shared by all non-default templates (except plan_comparison which manages its own order) */}
      {template !== "default" && template !== "plan_comparison" && (
        <div>
          <Label className="text-gray-500 text-[11px]">Subtítulo</Label>
          <Input
            placeholder="Subtítulo opcional"
            value={config.subtitle || ""}
            onChange={(e) => setConfig({ subtitle: e.target.value })}
            className="bg-gray-800 border-gray-700 text-sm"
          />
        </div>
      )}

      {/* Button text — shared by all non-default (except plan_comparison) */}
      {template !== "default" && template !== "plan_comparison" && (
        <div>
          <Label className="text-gray-500 text-[11px]">Texto del Botón</Label>
          <Input
            placeholder="QUIERO ACCEDER AHORA →"
            value={config.button_text || ""}
            onChange={(e) => setConfig({ button_text: e.target.value })}
            className="bg-gray-800 border-gray-700 text-sm"
          />
        </div>
      )}

      {/* ─── Urgency: Anchor Note ─── */}
      {template === "urgency" && (
        <div>
          <Label className="text-gray-500 text-[11px]">Nota de Anclaje (opcional)</Label>
          <Input
            placeholder="Ej: Producto aislado: $47 — Bundle: $37"
            value={(config as any).anchor_note || ""}
            onChange={(e) => setConfig({ anchor_note: e.target.value } as any)}
            className="bg-gray-800 border-gray-700 text-sm"
          />
        </div>
      )}

      {/* ─── Price Anchor fields ─── */}
      {template === "price_anchor" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-gray-500 text-[11px]">Precio Anterior</Label>
            <Input placeholder="$ 97,00" value={config.old_price || ""} onChange={(e) => setConfig({ old_price: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
          <div>
            <Label className="text-gray-500 text-[11px]">Precio Nuevo</Label>
            <Input placeholder="$ 47,00" value={config.new_price || ""} onChange={(e) => setConfig({ new_price: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
        </div>
      )}

      {/* ─── Social Proof fields ─── */}
      {template === "social_proof" && (
        <>
          <div>
            <Label className="text-gray-500 text-[11px]">Número de Clientes</Label>
            <Input type="number" placeholder="5487" value={config.client_count ?? ""} onChange={(e) => setConfig({ client_count: parseInt(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
          <div>
            <Label className="text-gray-500 text-[11px]">Testimonio</Label>
            <Textarea placeholder="Texto del testimonio..." value={config.testimonial_1 || ""} onChange={(e) => setConfig({ testimonial_1: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" rows={2} />
          </div>
          <div>
            <Label className="text-gray-500 text-[11px]">Nombre del Cliente</Label>
            <Input placeholder="Juan M." value={config.client_name_1 || ""} onChange={(e) => setConfig({ client_name_1: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
        </>
      )}

      {/* ─── Scarcity Countdown: fixed 10min, no config needed ─── */}
      {template === "scarcity_countdown" && (
        <p className="text-[10px] text-gray-500 italic">El contador comienza en 10:00 minutos automáticamente al mostrar el pop-up.</p>
      )}

      {/* ─── Bonus Offer fields ─── */}
      {template === "bonus_offer" && (
        <>
          <div>
            <Label className="text-gray-500 text-[11px]">Título del Bono</Label>
            <Input placeholder="Acceso al Add-on Apalancamiento" value={config.bonus_title || ""} onChange={(e) => setConfig({ bonus_title: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
          <div>
            <Label className="text-gray-500 text-[11px]">Descripción del Bono</Label>
            <Textarea placeholder="Descripción..." value={config.bonus_description || ""} onChange={(e) => setConfig({ bonus_description: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" rows={2} />
          </div>
          <div>
            <Label className="text-gray-500 text-[11px]">Valor del Bono</Label>
            <Input placeholder="(Vale $ 49,90)" value={config.bonus_value || ""} onChange={(e) => setConfig({ bonus_value: e.target.value })} className="bg-gray-800 border-gray-700 text-sm" />
          </div>
        </>
      )}

      {/* ─── Plan Comparison fields ─── */}
      {template === "plan_comparison" && (
        <div className="space-y-3">
          {/* 1. Subtítulo */}
          <div>
            <Label className="text-gray-500 text-[11px]">Subtítulo</Label>
            <Input
              placeholder="Subtítulo opcional"
              value={config.subtitle || ""}
              onChange={(e) => setConfig({ subtitle: e.target.value })}
              className="bg-gray-800 border-gray-700 text-sm"
            />
          </div>

          {/* 2. Coluna Atual / Coluna Novo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-500 text-[11px]">Columna Actual</Label>
              <Input
                placeholder="Actual"
                value={config.header_current || ""}
                onChange={(e) => setConfig({ header_current: e.target.value })}
                className="bg-gray-800 border-gray-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-gray-500 text-[11px]">Columna Nuevo</Label>
              <Input
                placeholder="Nuevo"
                value={config.header_new || ""}
                onChange={(e) => setConfig({ header_new: e.target.value })}
                className="bg-gray-800 border-gray-700 text-xs"
              />
            </div>
          </div>

          {/* 3. Itens Comparativos */}
          <div>
            <Label className="text-gray-500 text-[11px]">Ítems Comparativos</Label>
            <p className="text-[10px] text-gray-600 mb-1">Cada ítem se puede marcar como incluido (✓) o no (✗) en el plan actual.</p>
            {(config.comparison_items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <Input
                  placeholder={`Recurso ${i + 1}`}
                  value={item.text}
                  onChange={(e) => {
                    const arr = [...(config.comparison_items || [])];
                    arr[i] = { ...arr[i], text: e.target.value };
                    setConfig({ comparison_items: arr });
                  }}
                  className="bg-gray-800 border-gray-700 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const arr = [...(config.comparison_items || [])];
                    arr[i] = { ...arr[i], included_current: !arr[i].included_current };
                    setConfig({ comparison_items: arr });
                  }}
                  className={`shrink-0 w-7 h-7 rounded border flex items-center justify-center text-xs transition-colors ${item.included_current ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}
                  title={item.included_current ? "Incluido en el plan actual" : "No incluido en el plan actual"}
                >
                  {item.included_current ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const arr = (config.comparison_items || []).filter((_, j) => j !== i);
                    setConfig({ comparison_items: arr });
                  }}
                  className="text-gray-500 hover:text-red-400 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setConfig({ comparison_items: [...(config.comparison_items || []), { text: "", included_current: false }] })}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1.5"
            >
              <Plus className="w-3 h-3" /> Añadir Ítem
            </button>
          </div>

          {/* 4. Nota de Ancoragem */}
          <div>
            <Label className="text-gray-500 text-[11px]">Nota de Anclaje (opcional)</Label>
            <Input
              placeholder="Ej: Menos de $1,57 al día"
              value={(config as any).anchor_note || ""}
              onChange={(e) => setConfig({ anchor_note: e.target.value } as any)}
              className="bg-gray-800 border-gray-700 text-xs"
            />
          </div>

          {/* 5. Cor do Texto dos Botões */}
          <div>
            <Label className="text-gray-500 text-[11px]">Color del Texto de los Botones</Label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border border-gray-700 shrink-0 cursor-pointer overflow-hidden">
                <input
                  type="color"
                  value={config.button_text_color || "#000000"}
                  onChange={(e) => setConfig({ button_text_color: e.target.value })}
                  className="w-10 h-10 -m-1 cursor-pointer"
                />
              </div>
              <Input
                placeholder="#000000"
                value={config.button_text_color || ""}
                onChange={(e) => setConfig({ button_text_color: e.target.value })}
                className="bg-gray-800 border-gray-700 text-xs flex-1"
              />
              {config.button_text_color && (
                <button type="button" onClick={() => setConfig({ button_text_color: undefined })} className="text-gray-500 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">Aplicado al texto de los botones CTA. Vacío = color por defecto.</p>
          </div>

          {/* 5. Texto do Botão Principal */}
          <div>
            <Label className="text-gray-500 text-[11px]">Texto del Botón Principal</Label>
            <Input
              placeholder="MEJORAR PLAN →"
              value={config.button_text || ""}
              onChange={(e) => setConfig({ button_text: e.target.value })}
              className="bg-gray-800 border-gray-700 text-xs"
            />
          </div>

          {/* 6. Link de Checkout Principal */}
          <div>
            <Label className="text-gray-500 text-[11px]">Link de Checkout Principal</Label>
            <Input
              placeholder="https://lastlink.com/..."
              value={form.checkout_link || ""}
              onChange={(e) => onChange({ ...form, checkout_link: e.target.value })}
              className="bg-gray-800 border-gray-700 text-xs"
            />
          </div>

          {/* 7. Texto do Botão Secundário */}
          <div>
            <Label className="text-gray-500 text-[11px]">Texto del Botón Secundario</Label>
            <Input
              placeholder="Basic — $27"
              value={config.button_text_2 || ""}
              onChange={(e) => setConfig({ button_text_2: e.target.value })}
              className="bg-gray-800 border-gray-700 text-xs"
            />
          </div>

          {/* 8. Link de Checkout Secundário */}
          <div>
            <Label className="text-gray-500 text-[11px]">Link de Checkout Secundario</Label>
            <Input
              placeholder="https://lastlink.com/..."
              value={form.checkout_link_2 || ""}
              onChange={(e) => onChange({ ...form, checkout_link_2: e.target.value })}
              className="bg-gray-800 border-gray-700 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
