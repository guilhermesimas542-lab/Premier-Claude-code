import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Sport from "./pages/Sport";
import Login from "./pages/Login";
import Bonus from "./pages/Bonus";
import Casino from "./pages/Casino";
import CasinoGame from "./pages/CasinoGame";
import CasinoSignalGame from "./pages/CasinoSignalGame";
import UltimosGreens from "./pages/UltimosGreens";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "./admin/components/AdminGuard";
import { AdminLayout } from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminBanners from "./admin/pages/AdminBanners";
import AdminTipsCreate from "./admin/pages/AdminTipsCreate";
import AdminTipsImport from "./admin/pages/AdminTipsImport";
import AdminTipsList from "./admin/pages/AdminTipsList";
import AdminClientsManage from "./admin/pages/AdminClientsManage";
import AdminNotifications from "./admin/pages/AdminNotifications";
import AdminAnalytics from "./admin/pages/AdminAnalytics";

const queryClient = new QueryClient();

// Mapeamento de IDs antigos para slugs novos
const LEGACY_GAME_MAP: Record<string, string> = {
  av8: "aviator",
  roleta: "roleta",
  slots: "mines",
  crash: "fortune-tiger",
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/sport/:sportId" element={<Sport />} />
          {/* Rotas especiais - redirecionam para sport com filtro */}
          <Route path="/alavancagem" element={<Sport />} />
          <Route path="/odds-altas" element={<Sport />} />
          <Route path="/bonus" element={<Bonus />} />
          <Route path="/ultimos-greens" element={<UltimosGreens />} />
          <Route path="/cassino" element={<Casino />} />
          {/* Rota de Suporte/Configurações */}
          <Route path="/support" element={<Support />} />
          {/* Nova rota de sinais IA */}
          <Route path="/cassino/jogo/:slug" element={<CasinoSignalGame />} />
          {/* Rota legado para compatibilidade - redireciona para nova estrutura */}
          <Route 
            path="/cassino/:gameId" 
            element={<CasinoGame />} 
          />
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="tips/create" element={<AdminTipsCreate />} />
            <Route path="tips/import" element={<AdminTipsImport />} />
            <Route path="tips/list" element={<AdminTipsList />} />
            <Route path="clients" element={<AdminClientsManage />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
