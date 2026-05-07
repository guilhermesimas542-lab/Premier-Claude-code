import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { installGlobalErrorTracker } from "@/lib/errorTracker";
import { AnalyticsRouteTracker } from "@/components/AnalyticsRouteTracker";
import { GlobalPopups } from "@/components/GlobalPopups";

import Home from "./pages/Home";
import Sport from "./pages/Sport";
import SportLayout from "./pages/SportLayout";
import Login from "./pages/Login";

import Casino from "./pages/Casino";
import CasinoGame from "./pages/CasinoGame";

import UltimosGreens from "./pages/UltimosGreens";
import Support from "./pages/Support";
import Obrigado from "./pages/Obrigado";
import Backredirect from "./pages/Backredirect";

import NotFound from "./pages/NotFound";
import { AdminGuard } from "./admin/components/AdminGuard";
import { AdminLayout } from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminVerify from "./admin/pages/AdminVerify";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminBanners from "./admin/pages/AdminBanners";
import AdminTipsCreate from "./admin/pages/AdminTipsCreate";
import AdminTipsList from "./admin/pages/AdminTipsList";
import AdminTipsAnalytics from "./admin/pages/AdminTipsAnalytics";
import AdminClientsManage from "./admin/pages/AdminClientsManage";
import AdminClientsCreate from "./admin/pages/AdminClientsCreate";
import AdminNotifications from "./admin/pages/AdminNotifications";
import AdminAnalytics from "./admin/pages/AdminAnalytics";
import AdminRanking from "./admin/pages/AdminRanking";
import AdminEventsPage from "./admin/pages/AdminEventsPage";
import AdminOverview from "./admin/pages/AdminOverview";
import AdminRevenue from "./admin/pages/AdminRevenue";
import AdminCassinoPlaceholder from "./admin/pages/AdminCassinoPlaceholder";
import AdminBettingHouses from "./admin/pages/AdminBettingHouses";
import AdminDefaultLinks from "./admin/pages/AdminDefaultLinks";
import AdminPopups from "./admin/pages/AdminFunnelPopups";
import AdminTeams from "./admin/pages/AdminTeams";
import AdminPredictions from "./admin/pages/AdminPredictions";
import AdminCards from "./admin/pages/AdminCards";
import AdminPayCards from "./admin/pages/AdminPayCards";
import AdminErrors from "./admin/pages/AdminErrors";
import AdminFeedback from "./admin/pages/AdminFeedback";
import AdminWebhook from "./admin/pages/AdminWebhook";
import AdminNaoAcessou from "./admin/pages/AdminNaoAcessou";
import AdminClientesFree from "./admin/pages/AdminClientesFree";
import { Navigate } from "react-router-dom";
import { FunnelPopupProvider } from "./context/FunnelPopupContext";

import { GamificationProvider } from "./contexts/GamificationContext";
import { LinksProvider } from "./contexts/LinksContext";
import { PendingTipProvider } from "./contexts/PendingTipContext";

const queryClient = new QueryClient();

const LEGACY_GAME_MAP: Record<string, string> = {
  av8: "aviator",
  roleta: "roleta",
  slots: "mines",
  crash: "fortune-tiger",
};

const App = () => {
  useEffect(() => {
    installGlobalErrorTracker();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GamificationProvider>
      <LinksProvider>
      <FunnelPopupProvider>
      <PendingTipProvider>
        <BrowserRouter>
          <AnalyticsRouteTracker />
          <GlobalPopups />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route element={<SportLayout />}>
              <Route path="/sport/:sportId" element={<Sport />} />
            </Route>
            <Route path="/alavancagem" element={<Navigate to="/sport/1?tab=alavancagem" replace />} />
            <Route path="/odds-altas" element={<Navigate to="/sport/1" replace />} />
            
            <Route path="/ultimos-greens" element={<UltimosGreens />} />
            <Route path="/cassino" element={<Casino />} />
            <Route path="/support" element={<Support />} />
            <Route path="/obrigado" element={<Obrigado />} />
            <Route path="/bd" element={<Backredirect />} />
            
            
            <Route path="/cassino/:gameId" element={<CasinoGame />} />
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/verify" element={<AdminVerify />} />
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="betting-houses" element={<AdminBettingHouses />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="predictions" element={<AdminPredictions />} />
              <Route path="tips/create" element={<AdminTipsCreate />} />
              <Route path="tips/list" element={<AdminTipsList />} />
              <Route path="tips/analytics" element={<AdminTipsAnalytics />} />
              <Route path="clients" element={<AdminClientsManage />} />
              <Route path="clients/nao-acessou" element={<AdminNaoAcessou />} />
              <Route path="clients/free" element={<AdminClientesFree />} />
              <Route path="clients/create" element={<AdminClientsCreate />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="analytics/events" element={<AdminEventsPage />} />
              <Route path="ranking" element={<AdminRanking />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="default-links" element={<AdminDefaultLinks />} />
              <Route path="popups" element={<AdminPopups />} />
              <Route path="funis" element={<Navigate to="/admin/popups" replace />} />
              <Route path="cards" element={<AdminCards />} />
              <Route path="pay-cards" element={<AdminPayCards />} />
              <Route path="errors" element={<AdminErrors />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="webhook" element={<AdminWebhook />} />
              {/* Cassino placeholders */}
              <Route path="cassino" element={<AdminCassinoPlaceholder />} />
              <Route path="cassino/analytics" element={<AdminCassinoPlaceholder />} />
              <Route path="cassino/revenue" element={<AdminCassinoPlaceholder />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PendingTipProvider>
      </FunnelPopupProvider>
      </LinksProvider>
      </GamificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
