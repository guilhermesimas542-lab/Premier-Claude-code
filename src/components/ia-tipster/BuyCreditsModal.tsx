import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#00FF7F]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Comprar créditos IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Escolha um pacote ou desbloqueie acesso ilimitado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#00FF7F]" />
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {packs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase text-white/50 tracking-wide flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Pacotes de créditos
                </div>
                {packs.map((p) => (
                  <ProductButton key={p.id} p={p} onBuy={(url) => setCheckoutUrl(url)} />
                ))}
              </div>
            )}
            {unlim.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase text-white/50 tracking-wide flex items-center gap-1 pt-2">
                  <InfinityIcon className="w-3 h-3" /> Acesso ilimitado
                </div>
                {unlim.map((p) => (
                  <ProductButton key={p.id} p={p} onBuy={(url) => setCheckoutUrl(url)} />
                ))}
              </div>
            )}
            {products.length === 0 && (
              <div className="text-sm text-white/60 text-center py-6">
                Nenhum pacote disponível no momento.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductButton({ p, onBuy }: { p: CreditProduct; onBuy: (url: string) => void }) {
  const price = p.pricing?.price_brl ?? 0;
  const credits = p.pricing?.credits_amount;
  const days = p.pricing?.unlimited_days;
  const detail = credits ? `${credits} créditos` : days ? `${days} dias ilimitados` : "";
  const disabled = !p.checkout_url;

  return (
    <Button
      onClick={() => p.checkout_url && onBuy(p.checkout_url)}
      disabled={disabled}
      className="w-full justify-between bg-[#00FF7F]/10 hover:bg-[#00FF7F]/20 text-white border border-[#00FF7F]/40 py-6"
    >
      <div className="text-left">
        <div className="font-semibold text-sm">{p.product_name}</div>
        <div className="text-xs text-white/60">{detail}</div>
      </div>
      <div className="text-[#00FF7F] font-bold">
        R$ {price.toFixed(2).replace(".", ",")}
      </div>
    </Button>
  );
}
