import { createContext, useContext, useState, type ReactNode } from "react";

export type WsdkSelection = unknown;

export type PendingTip = {
  tipId: string | number;
  selections: WsdkSelection[];
} | null;

type Ctx = {
  pendingTip: PendingTip;
  setPendingTip: (t: PendingTip) => void;
  clearPendingTip: () => void;
};

const PendingTipContext = createContext<Ctx | undefined>(undefined);

export const PendingTipProvider = ({ children }: { children: ReactNode }) => {
  const [pendingTip, setPendingTip] = useState<PendingTip>(null);
  const clearPendingTip = () => setPendingTip(null);
  return (
    <PendingTipContext.Provider value={{ pendingTip, setPendingTip, clearPendingTip }}>
      {children}
    </PendingTipContext.Provider>
  );
};

export const usePendingTip = () => {
  const ctx = useContext(PendingTipContext);
  if (!ctx) throw new Error("usePendingTip must be used within PendingTipProvider");
  return ctx;
};
