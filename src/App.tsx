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
import NotFound from "./pages/NotFound";

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
          <Route path="/bonus" element={<Bonus />} />
          <Route path="/cassino" element={<Casino />} />
          {/* Nova rota de sinais IA */}
          <Route path="/cassino/jogo/:slug" element={<CasinoSignalGame />} />
          {/* Rota legado para compatibilidade - redireciona para nova estrutura */}
          <Route 
            path="/cassino/:gameId" 
            element={<CasinoGame />} 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
