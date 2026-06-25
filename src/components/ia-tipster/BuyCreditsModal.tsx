import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Coins, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";

interface CreditProduct {
  id: string;
  product_name: string;
  product_type: string;
  pricing: { price_brl?: number; credits_amount?: number; unlimited_days?: number } | null;
  checkout_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BuyCreditsModal({ open, onClose }: Props) {
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("products_catalog")
      .select("id, product_name, product_type, pricing, checkout_url")
      .in("product_type", ["ai_credit_pack", "ai_credit_unlimited"])
      .eq("active", true)
      .then(({ data }) => {
        setProducts(((data ?? []) as any[]) as CreditProduct[]);
        setLoading(false);
      });
  }, [open]);

  if (checkoutUrl) {
    return (
      <EmbeddedCheckout
        open
        url={checkoutUrl}
        onClose={() => {
          setCheckoutUrl(null);
          onClose();
        }}
      />
    );
  }

  const packs = products.filter((p) => p.product_type === "ai_credit_pack");
  const unlim = products.filter((p) => p.product_type === "ai_credit_unlimited");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="border-[#e9b949]/20 text-[#ECEAE4] max-w-md rounded-3xl [&>button]:text-[#9a9ca4]"
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%, rgba(233,185,73,0.14), rgba(233,185,73,0) 58%), linear-gradient(180deg, #16161c, #0c0d11)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center justify-center gap-2 text-[#e9c46a] text-[17px] font-extrabold tracking-tight"
          >
            <Coins className="w-4 h-4 text-[#e9c46a]" />
            Comprar créditos IA
          </DialogTitle>
          <DialogDescription className="text-center text-[12.5px] text-[#9a9ca4]">
            Elige un paquete o desbloquea acceso ilimitado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#e9b949]" />
          </div>
        ) : (
          <div className="space-y-1 pt-2">
            {packs.length > 0 && (
              <div className="space-y-2.5">
                <div
                  className="flex items-center gap-[7px] text-[9.5px] text-[#8a8c94] uppercase mb-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em" }}
                >
                  <Coins className="w-[13px] h-[13px] text-[#8a8c94]" /> Paquetes de créditos
                </div>
                {packs.map((p) => (
                  <ProductButton key={p.id} p={p} onBuy={(url) => setCheckoutUrl(url)} />
                ))}
              </div>
            )}
            {unlim.length > 0 && (
              <div className="space-y-2.5">
                <div
                  className="flex items-center gap-[7px] text-[9.5px] text-[#c9a56b] uppercase mb-1 pt-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em" }}
                >
                  <InfinityIcon className="w-[14px] h-[14px] text-[#c9a56b]" /> Acceso ilimitado
                </div>
                {unlim.map((p) => (
                  <ProductButton key={p.id} p={p} unlimited onBuy={(url) => setCheckoutUrl(url)} />
                ))}
              </div>
            )}
            {products.length === 0 && (
              <div className="text-sm text-[#9a9ca4] text-center py-6">
                Ningún paquete disponible por el momento.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductButton({
  p,
  unlimited = false,
  onBuy,
}: {
  p: CreditProduct;
  unlimited?: boolean;
  onBuy: (url: string) => void;
}) {
  const price = p.pricing?.price_brl ?? 0;
  const credits = p.pricing?.credits_amount;
  const days = p.pricing?.unlimited_days;
  const detail = credits ? `${credits} créditos` : days ? `${days} días ilimitados` : "";
  const disabled = !p.checkout_url;

  return (
    <button
      onClick={() => p.checkout_url && onBuy(p.checkout_url)}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/[0.05]"
      style={{
        border: unlimited
          ? "1px solid rgba(233,185,73,0.3)"
          : "1px solid rgba(235,235,245,0.1)",
        background: unlimited ? "rgba(233,185,73,0.05)" : "rgba(255,255,255,0.03)",
      }}
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold text-[#ECEAE4] truncate">
          {p.product_name}
        </span>
        <span className="block text-[11px] text-[#8a8c94] mt-0.5">{detail}</span>
      </span>
      <span
        className="text-[14px] font-bold text-[#e9c46a] whitespace-nowrap"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        ${price.toFixed(2).replace(".", ",")}
      </span>
    </button>
  );
}
