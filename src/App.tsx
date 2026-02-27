import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Sport from "./pages/Sport";
import Login from "./pages/Login";
import Bonus from "./pages/Bonus";
import Casino from "./pages/Casino";
import CasinoGame from "./pages/CasinoGame";
import CasinoSignalGame from "./pages/CasinoSignalGame";
import UltimosGreens from "./pages/UltimosGreens";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "./admin/components/AdminGuard";
import { AdminLayout } from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminVerify from "./admin/pages/AdminVerify";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminBanners from "./admin/pages/AdminBanners";
import AdminTipsCreate from "./admin/pages/AdminTipsCreate";
import AdminTipsList from "./admin/pages/AdminTipsList";
import AdminClientsManage from "./admin/pages/AdminClientsManage";
import AdminNotifications from "./admin/pages/AdminNotifications";
import AdminAnalytics from "./admin/pages/AdminAnalytics";
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
import { Navigate } from "react-router-dom";
import { FunnelPopupProvider } from "./context/FunnelPopupContext";

const queryClient = new QueryClient();

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
      <FunnelPopupProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/sport/:sportId" element={<Sport />} />
            <Route path="/alavancagem" element={<Sport />} />
            <Route path="/odds-altas" element={<Sport />} />
            <Route path="/bonus" element={<Bonus />} />
            <Route path="/ultimos-greens" element={<UltimosGreens />} />
            <Route path="/cassino" element={<Casino />} />
            <Route path="/support" element={<Support />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cassino/jogo/:slug" element={<CasinoSignalGame />} />
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
              <Route path="clients" element={<AdminClientsManage />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="analytics/events" element={<AdminEventsPage />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="default-links" element={<AdminDefaultLinks />} />
              <Route path="popups" element={<AdminPopups />} />
              <Route path="funis" element={<Navigate to="/admin/popups" replace />} />
              <Route path="cards" element={<AdminCards />} />
              {/* Cassino placeholders */}
              <Route path="cassino" element={<AdminCassinoPlaceholder />} />
              <Route path="cassino/analytics" element={<AdminCassinoPlaceholder />} />
              <Route path="cassino/revenue" element={<AdminCassinoPlaceholder />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FunnelPopupProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
