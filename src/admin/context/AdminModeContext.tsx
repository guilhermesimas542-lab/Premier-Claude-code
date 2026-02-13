import { createContext, useContext, useState, ReactNode } from "react";

type AdminMode = "futebol" | "cassino";

interface AdminModeContextType {
  mode: AdminMode;
  setMode: (mode: AdminMode) => void;
}

const AdminModeContext = createContext<AdminModeContextType | null>(null);

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdminMode>("futebol");
  return (
    <AdminModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const ctx = useContext(AdminModeContext);
  if (!ctx) throw new Error("useAdminMode must be used within AdminModeProvider");
  return ctx;
}
