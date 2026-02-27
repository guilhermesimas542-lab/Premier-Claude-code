import { Lock, Anchor, Gift, Crown, Zap, ArrowUpCircle } from "lucide-react";

const PLAN_CONFIG: Record<string, { label: string; borderColor: string; bgColor: string; icon?: any }> = {
  basic: { label: "BÁSICO", borderColor: "border-emerald-500", bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
  basico: { label: "BÁSICO", borderColor: "border-emerald-500", bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
  pro: { label: "PRO", borderColor: "border-orange-500", bgColor: "bg-gradient-to-r from-orange-500 to-orange-600" },
  ultra: { label: "ULTRA", borderColor: "border-purple-500", bgColor: "bg-purple-600" },
  alavancagem: { label: "ALAVANCAGEM", borderColor: "border-blue-500", bgColor: "bg-gradient-to-r from-teal-600 to-emerald-700", icon: Anchor },
  desaltas: { label: "ODDS ALTAS", borderColor: "border-red-500", bgColor: "bg-gradient-to-r from-amber-600 to-orange-700", icon: Zap },
  odds_altas: { label: "ODDS ALTAS", borderColor: "border-red-500", bgColor: "bg-gradient-to-r from-amber-600 to-orange-700", icon: Zap },
  vitalicio: { label: "VITALÍCIO", borderColor: "border-yellow-400", bgColor: "bg-gradient-to-r from-yellow-500 to-amber-600", icon: Crown },
  login_aquisicao: { label: "AQUISIÇÃO", borderColor: "border-cyan-400", bgColor: "bg-gradient-to-r from-cyan-500 to-blue-600" },
  upgrade_basico: { label: "↑ BÁSICO", borderColor: "border-emerald-500", bgColor: "bg-emerald-600", icon: ArrowUpCircle },
  upgrade_pro: { label: "↑ PRO", borderColor: "border-orange-500", bgColor: "bg-orange-600", icon: ArrowUpCircle },
  upgrade_ultra: { label: "↑ ULTRA", borderColor: "border-purple-500", bgColor: "bg-purple-600", icon: ArrowUpCircle },
  suporte_upgrade: { label: "SUPORTE", borderColor: "border-sky-500", bgColor: "bg-sky-600", icon: ArrowUpCircle },
};

interface Props {
  plan: string;
  onClick?: () => void;
}

export function PayCardMiniaturePreview({ plan, onClick }: Props) {
  const key = plan.toLowerCase();
  const config = PLAN_CONFIG[key] || { label: plan.toUpperCase(), borderColor: "border-gray-500", bgColor: "bg-gray-600" };
  const IconComponent = config.icon || Gift;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border-2 ${config.borderColor} overflow-hidden ${onClick ? "cursor-pointer hover:ring-2 hover:ring-white/30 transition-all" : ""}`}
      style={{ width: 90, height: 58, backgroundImage: "url('/images/futsal-arena.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0" style={{ backgroundColor: "black", mixBlendMode: "saturation" }} />

      {/* Badge */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -6 }}>
        <div className={`${config.bgColor} text-white rounded-full font-extrabold uppercase shadow`} style={{ fontSize: 5, padding: "1px 5px", whiteSpace: "nowrap" }}>
          {config.label}
        </div>
      </div>

      {/* Center icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 z-10">
        <IconComponent className="w-3 h-3 text-white/40" />
        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
          <Lock className="w-2.5 h-2.5 text-black" />
        </div>
        <span className="text-[5px] text-emerald-400 font-bold">Adquira já</span>
      </div>
    </div>
  );
}
