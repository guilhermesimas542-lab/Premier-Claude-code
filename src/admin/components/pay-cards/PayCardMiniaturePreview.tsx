import { Lock, Anchor, Gift } from "lucide-react";

const PLAN_CONFIG: Record<string, { label: string; borderColor: string; bgColor: string }> = {
  basic: { label: "BÁSICO", borderColor: "border-[#22C55E]", bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
  pro: { label: "PRO", borderColor: "border-[#F59E0B]", bgColor: "bg-gradient-to-r from-orange-500 to-orange-600" },
  ultra: { label: "ULTRA", borderColor: "border-[#A855F7]", bgColor: "bg-[#9333EA]" },
  alavancagem: { label: "ALAVANCAGEM", borderColor: "border-[#3B82F6]", bgColor: "bg-gradient-to-r from-teal-600 to-emerald-700" },
  desaltas: { label: "ODDS ALTAS", borderColor: "border-[#EF4444]", bgColor: "bg-gradient-to-r from-amber-600 to-orange-700" },
  vitalicio: { label: "VITALÍCIO", borderColor: "border-[#FFD700]", bgColor: "bg-gradient-to-r from-yellow-500 to-amber-600" },
};

interface Props {
  plan: string;
}

export function PayCardMiniaturePreview({ plan }: Props) {
  const config = PLAN_CONFIG[plan.toLowerCase()] || PLAN_CONFIG["basic"];
  const isSpecial = ["alavancagem", "desaltas"].includes(plan.toLowerCase());
  const IconComponent = plan.toLowerCase() === "alavancagem" ? Anchor : Gift;

  return (
    <div
      className={`relative rounded-lg border-2 ${config.borderColor} overflow-hidden`}
      style={{ width: 90, height: 58, backgroundImage: "url('/images/futsal-arena.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Saturation overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: "black", mixBlendMode: "saturation" }} />

      {/* Badge */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -6 }}>
        <div className={`${config.bgColor} text-white rounded-full font-extrabold uppercase shadow`} style={{ fontSize: 5, padding: "1px 5px", whiteSpace: "nowrap" }}>
          {config.label}
        </div>
      </div>

      {/* Lock */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 z-10">
        {isSpecial && <IconComponent className="w-3 h-3 text-white/40" />}
        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
          <Lock className="w-2.5 h-2.5 text-black" />
        </div>
        <span className="text-[5px] text-emerald-400 font-bold">Adquira já</span>
      </div>
    </div>
  );
}
