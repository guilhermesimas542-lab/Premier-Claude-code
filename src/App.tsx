import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { installGlobalErrorTracker } from "@/lib/errorTracker";
import { AnalyticsRouteTracker } from "@/components/AnalyticsRouteTracker";
import { GlobalPopups } from "@/components/GlobalPopups";
import { PushNotificationToast, type PushNotificationPayload } from "@/components/PushNotificationToast";

import Home from "./pages/Home";
import Sport from "./pages/Sport";
import SportLayout from "./pages/SportLayout";
import Login from "./pages/Login";

import IATipster from "./pages/IATipster";
import IATipsterPreview from "./pages/IATipsterPreview";

import UltimosGreens from "./pages/UltimosGreens";
import Support from "./pages/Support";
import Obrigado from "./pages/Obrigado";
import Backredirect from "./pages/Backredirect";
import Backredirect2 from "./pages/Backredirect2";
import Backredirect3 from "./pages/Backredirect3";
import Backredirect4 from "./pages/Backredirect4";
import PoliticaReembolso from "./pages/PoliticaReembolso";

import NotFound from "./pages/NotFound";
import { AdminGuard } from "./admin/components/AdminGuard";
import { AdminLayout } from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminVerify from "./admin/pages/AdminVerify";
import AdminDashboard from "./admin/pages/AdminDashboard";

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
import AdminFunnelAnalytics from "./admin/pages/AdminFunnelAnalytics";

import AdminBettingHouses from "./admin/pages/AdminBettingHouses";
import AdminDefaultLinks from "./admin/pages/AdminDefaultLinks";
import AdminPopups from "./admin/pages/AdminFunnelPopups";
import AdminTeams from "./admin/pages/AdminTeams";
import AdminPredictions from "./admin/pages/AdminPredictions";
import AdminCards from "./admin/pages/AdminCards";
import AdminPayCards from "./admin/pages/AdminPayCards";
import AdminErrors from "./admin/pages/AdminErrors";
import AdminFeedback from "./admin/pages/AdminFeedback";
import AdminIATipster from "./admin/pages/AdminIATipster";
import AdminCrmDashboard from "./admin/pages/crm/AdminCrmDashboard";
import AdminCrmSchedules from "./admin/pages/crm/AdminCrmSchedules";
import AdminCrmScheduleNew from "./admin/pages/crm/AdminCrmScheduleNew";
import AdminCrmScheduleEdit from "./admin/pages/crm/AdminCrmScheduleEdit";
import AdminCrmAudiences from "./admin/pages/crm/AdminCrmAudiences";
import AdminCrmJourneys from "./admin/pages/crm/AdminCrmJourneys";
import AdminCrmJourneyBuilder from "./admin/pages/crm/AdminCrmJourneyBuilder";
import AdminCrmJourneyDetail from "./admin/pages/crm/AdminCrmJourneyDetail";
import AdminCrmWhiteboardUnified from "./admin/pages/crm/AdminCrmWhiteboardUnified";
import AdminCrmWhiteboardSchedules from "./admin/pages/crm/AdminCrmWhiteboardSchedules";
import AdminBehavior from "./admin/pages/AdminBehavior";
import AdminCrmSettings from "./admin/pages/crm/AdminCrmSettings";
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
  crash: "fortune-tiger",
};

const App = () => {
  useEffect(() => {
    installGlobalErrorTracker();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "push-notification") return;
      const payload = (event.data.payload ?? {}) as PushNotificationPayload;
      toast.custom((toastId) => (
        <PushNotificationToast
          payload={payload}
          onClose={() => toast.dismiss(toastId)}
        />
      ), {
        duration: 12000,
        position: "top-center",
      });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
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
            <Route path="/ia-tipster" element={<IATipster />} />
            <Route path="/ia-tipster-preview" element={<IATipsterPreview />} />
            <Route path="/support" element={<Support />} />
            <Route path="/obrigado" element={<Obrigado />} />
            <Route path="/bd" element={<Backredirect />} />
            <Route path="/bd2" element={<Backredirect2 />} />
            <Route path="/bd3" element={<Backredirect3 />} />
            <Route path="/bd4" element={<Backredirect4 />} />
            <Route path="/politica-assinatura-reembolso" element={<PoliticaReembolso />} />
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/verify" element={<AdminVerify />} />
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              
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
              <Route path="funnel-analytics" element={<AdminFunnelAnalytics />} />
              <Route path="behavior" element={<AdminBehavior />} />
              <Route path="ranking" element={<AdminRanking />} />
              <Route path="default-links" element={<AdminDefaultLinks />} />
              <Route path="popups" element={<AdminPopups />} />
              <Route path="funis" element={<Navigate to="/admin/popups" replace />} />
              <Route path="cards" element={<AdminCards />} />
              <Route path="pay-cards" element={<AdminPayCards />} />
              <Route path="errors" element={<AdminErrors />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="ia-tipster" element={<AdminIATipster />} />
              <Route path="webhook" element={<AdminWebhook />} />
              {/* CRM — orquestrador multicanal */}
              <Route path="crm" element={<AdminCrmDashboard />} />
              <Route path="crm/schedules" element={<AdminCrmSchedules />} />
              <Route path="crm/schedules/new" element={<AdminCrmScheduleNew />} />
              <Route path="crm/schedules/:id/edit" element={<AdminCrmScheduleEdit />} />
              <Route path="crm/audiences" element={<AdminCrmAudiences />} />
              <Route path="crm/journeys" element={<AdminCrmJourneys />} />
              <Route path="crm/journeys/new" element={<AdminCrmJourneyBuilder />} />
              <Route path="crm/journeys/:id" element={<AdminCrmJourneyDetail />} />
              <Route path="crm/journeys/:id/edit" element={<AdminCrmJourneyBuilder />} />
              <Route path="crm/journeys/:id/whiteboard" element={<Navigate to="/admin/crm/whiteboard" replace />} />
              <Route path="crm/whiteboard" element={<AdminCrmWhiteboardUnified />} />
              <Route path="crm/whiteboard/schedules" element={<AdminCrmWhiteboardSchedules />} />
              <Route path="crm/whiteboard-legacy" element={<Navigate to="/admin/crm/whiteboard" replace />} />
              <Route path="crm/settings" element={<AdminCrmSettings />} />
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
