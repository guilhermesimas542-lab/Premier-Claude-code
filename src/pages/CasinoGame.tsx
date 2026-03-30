import { ArrowLeft, Lightbulb, Plane, CircleDot, Gem, Dices } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { BottomNav } from "@/components/BottomNav";

type Phase = 'idle' | 'loading' | 'result';

interface GameConfig {
  name: string;
  subtitle: string;
  icon: React.ElementType;
  buttonColor: string;
  buttonGlow: string;
  urlField: keyof import("@/hooks/useUserBettingHouse").BettingHouseData;
}

const GAME_CONFIGS: Record<string, GameConfig> = {
  aviator: {
    name: "Aviator",
    subtitle: "Decole antes do crash! Multiplique seus ganhos",
    icon: Plane,
    buttonColor: "#DC2626",
    buttonGlow: "rgba(220, 38, 38, 0.5)",
    urlField: "aviator_url",
  },
  roleta: {
    name: "Roleta",
    subtitle: "Vermelho ou preto? Aposte e gire a sorte",
    icon: CircleDot,
    buttonColor: "#DC2626",
    buttonGlow: "rgba(220, 38, 38, 0.5)",
    urlField: "roleta_url",
  },
  mines: {
    name: "Mines",
    subtitle: "Desvie das bombas e acumule prêmios",
    icon: Gem,
    buttonColor: "#8B5CF6",
    buttonGlow: "rgba(139, 92, 246, 0.5)",
    urlField: "mines_url",
  },
  "football-studio": {
    name: "Football Studio",
    subtitle: "Casa ou Visitante? Aposte no resultado",
    icon: Dices,
    buttonColor: "#3B82F6",
    buttonGlow: "rgba(59, 130, 246, 0.5)",
    urlField: "football_studio_url",
  },
};

const LOADING_STEPS = [
  "Analisando o algoritmo",
  "Identificando o padrão",
  "Sinal encontrado",
];

const RouletteStrategies = [
  { type: 'colunas', strategyLabel: 'Colunas (1ª/2ª/3ª)', signal: () => { const cols = ['1ª', '2ª', '3ª']; const c1 = cols[Math.floor(Math.random() * 3)]; let c2 = cols[Math.floor(Math.random() * 3)]; while (c2 === c1) c2 = cols[Math.floor(Math.random() * 3)]; return `${c1} + ${c2} coluna`; }, tip: 'Colunas são as 3 colunas verticais. Selecione 2 colunas indicadas. Proteção até 02.' },
  { type: 'quadrantes', strategyLabel: 'Quadrantes (1º/2º/3º)', signal: () => { const quads = ['1º', '2º', '3º']; const q1 = quads[Math.floor(Math.random() * 3)]; let q2 = quads[Math.floor(Math.random() * 3)]; while (q2 === q1) q2 = quads[Math.floor(Math.random() * 3)]; return `${q1} + ${q2} quadrante`; }, tip: 'Quadrantes: 1º (1-12), 2º (13-24), 3º (25-36). Escolha 2 quadrantes. Proteção até 02.' },
  { type: 'par_impar', strategyLabel: 'Par/Ímpar', signal: () => Math.random() > 0.5 ? 'Par (Even)' : 'Ímpar (Odd)', tip: 'Aposte em Par ou Ímpar por 3 rodadas. Proteção até 02.' },
  { type: 'cor', strategyLabel: 'Vermelho/Preto', signal: () => Math.random() > 0.5 ? 'Vermelho' : 'Preto', tip: 'Aposte na cor indicada por 3 rodadas. Proteção até 02.' },
];

// ===== MINES =====
const MinesGame = ({ phase, stepIndex, result, onIdentifySignal, isButtonDisabled, buttonText, buttonColor, buttonGlow }: {
  phase: Phase; stepIndex: number; result: any;
  onIdentifySignal: () => void; isButtonDisabled: boolean;
  buttonText: string; buttonColor: string; buttonGlow: string;
}) => {
  const renderGrid = () => {
    const grid = [];
    for (let i = 0; i < 25; i++) {
      const hasStar = phase === 'result' && result?.starPositions?.includes(i);
      grid.push(
        <div
          key={i}
          className="w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] rounded-xl flex items-center justify-center text-base sm:text-lg transition-all duration-300"
          style={{
            background: hasStar ? 'linear-gradient(145deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
            border: hasStar ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: hasStar ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          {hasStar && '⭐'}
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="flex justify-center px-0">
      <div className="w-full max-w-[360px] sm:max-w-[420px] rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold text-white">Mines – IA</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/40">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-500">Online</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p className="text-[11px] text-gray-400 mb-0.5">Minas</p>
            <p className="text-[22px] sm:text-[26px] font-bold text-red-400">{phase === 'result' ? result?.mines : 'X'}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <p className="text-[11px] text-gray-400 mb-0.5">Proteções</p>
            <p className="text-[22px] sm:text-[26px] font-bold text-green-400">{phase === 'result' ? '02' : 'X'}</p>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <div className="grid grid-cols-5 gap-[10px] sm:gap-3">{renderGrid()}</div>
        </div>
        {phase === 'loading' && (
          <div className="text-center space-y-1 py-2">
            <p className="text-sm font-semibold text-white animate-pulse">{LOADING_STEPS[stepIndex]}</p>
            {stepIndex === 2 && <p className="text-xs text-gray-400">Prepare-se</p>}
          </div>
        )}
        <button
          onClick={onIdentifySignal}
          disabled={isButtonDisabled}
          className="w-full h-[52px] rounded-2xl text-base font-bold text-white transition-all duration-200 disabled:opacity-60"
          style={{
            background: isButtonDisabled ? '#374151' : `linear-gradient(135deg, ${buttonColor} 0%, ${buttonColor}cc 100%)`,
            boxShadow: isButtonDisabled ? 'none' : `0 0 15px ${buttonGlow}`,
          }}
        >
          {phase === 'loading' ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span>Processando...</span> : buttonText}
        </button>
      </div>
    </div>
  );
};

// ===== AVIATOR =====
const AviatorGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10 text-center">
        <p className="text-xs text-gray-400 mb-1">Entrada</p>
        <p className="text-xl font-bold text-white">{phase === 'result' ? result?.entryTime : '∞'}</p>
      </div>
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/30 text-center">
        <p className="text-xs text-gray-400 mb-1">Saída</p>
        <p className="text-xl font-bold text-green-500">{phase === 'result' ? `${result?.exitMultiplier}x` : '—'}</p>
      </div>
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-yellow-500/30 text-center">
        <p className="text-xs text-gray-400 mb-1">Proteções</p>
        <p className="text-xl font-bold text-yellow-500">{phase === 'result' ? 'Até 02' : '—'}</p>
      </div>
    </div>
    {phase === 'loading' && (
      <div className="text-center space-y-2 animate-pulse py-8">
        <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
        {stepIndex === 2 && <p className="text-sm text-gray-400">Prepare-se</p>}
      </div>
    )}
  </div>
);

// ===== ROLETA =====
const RouletteGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)' }}>
          <p className="text-xs text-gray-400 mb-1">Horário</p>
          <p className="text-2xl font-bold text-white">{phase === 'result' ? result?.time : currentTime}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p className="text-xs text-gray-400 mb-1">Estratégia</p>
          <p className="text-sm font-semibold text-white leading-tight">{phase === 'result' ? result?.strategyLabel : 'Aguardando...'}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, rgba(127, 29, 29, 0.3) 0%, rgba(153, 27, 27, 0.2) 100%)', border: '1px solid rgba(239, 68, 68, 0.5)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)' }}>
          <p className="text-xs text-gray-400 mb-1">Sinal</p>
          <p className="text-base font-bold text-red-400">{phase === 'result' ? result?.signal : '—'}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(34, 197, 94, 0.4)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.15)' }}>
          <p className="text-xs text-gray-400 mb-1">Proteções</p>
          <p className="text-xl font-bold text-green-400">{phase === 'result' ? 'Até 02' : '—'}</p>
        </div>
      </div>
      {phase === 'result' && result?.tip && (
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed"><span className="font-bold text-white">Dica:</span> {result.tip}</p>
        </div>
      )}
      {phase === 'loading' && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="animate-pulse space-y-2">
            <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
            {stepIndex === 2 && <p className="text-sm text-gray-400">Prepare-se</p>}
          </div>
        </div>
      )}
      {phase === 'idle' && (
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed"><span className="font-bold text-white">Dica:</span> Clique em "Identificar sinal" para a IA analisar o padrão.</p>
        </div>
      )}
    </div>
  );
};

// ===== FOOTBALL STUDIO =====
const FootballStudioGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isCasa = result?.signal === 'CASA';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)' }}>
          <p className="text-xs text-gray-400 mb-1">Horário</p>
          <p className="text-2xl font-bold text-white">{phase === 'result' ? result?.time : currentTime}</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(34, 197, 94, 0.4)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.15)' }}>
          <p className="text-xs text-gray-400 mb-1">Proteções</p>
          <p className="text-xl font-bold text-green-400">{phase === 'result' ? 'Até 02' : '—'}</p>
        </div>
      </div>
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: phase === 'result' ? isCasa ? 'linear-gradient(145deg, rgba(185, 28, 28, 0.4) 0%, rgba(127, 29, 29, 0.3) 100%)' : 'linear-gradient(145deg, rgba(30, 64, 175, 0.4) 0%, rgba(29, 78, 216, 0.3) 100%)' : 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)',
          border: phase === 'result' ? isCasa ? '2px solid rgba(239, 68, 68, 0.6)' : '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: phase === 'result' ? isCasa ? '0 0 30px rgba(239, 68, 68, 0.35)' : '0 0 30px rgba(59, 130, 246, 0.35)' : 'none',
        }}
      >
        <p className="text-xs text-gray-400 mb-2">SINAL</p>
        {phase === 'result' ? (
          <div className="inline-block px-8 py-3 rounded-xl text-2xl font-bold text-white" style={{ background: isCasa ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', boxShadow: isCasa ? '0 4px 15px rgba(220, 38, 38, 0.4)' : '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
            {result?.signal}
          </div>
        ) : (
          <p className="text-xl font-bold text-gray-500">—</p>
        )}
      </div>
      {phase === 'result' && (
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed"><span className="font-bold text-white">Dica:</span> Siga o lado indicado por até 02 proteções.</p>
        </div>
      )}
      {phase === 'loading' && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="animate-pulse space-y-2">
            <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
            {stepIndex === 2 && <p className="text-sm text-gray-400">Prepare-se</p>}
          </div>
        </div>
      )}
      {phase === 'idle' && (
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'linear-gradient(145deg, #0b0f14 0%, #131920 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed"><span className="font-bold text-white">Dica:</span> Clique em "Identificar sinal" para a IA indicar CASA ou VISITANTE.</p>
        </div>
      )}
    </div>
  );
};

// ===== MAIN =====
const CasinoGame = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { house, loading: houseLoading } = useUserBettingHouse();

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<any>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const gameConfig = gameId ? GAME_CONFIGS[gameId] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) navigate("/login");
    // Navigation achievement
    const achMap: Record<string, string> = { aviator: 'open_aviator', roleta: 'open_roleta', mines: 'open_mines', 'football-studio': 'open_football_studio' };
    const achId = gameId ? achMap[gameId] : null;
    if (achId) {
      (async () => {
        const { mockGetUser } = await import("@/mocks/user");
        const user = mockGetUser();
        if (!user) return;
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: u } = await supabase.from('users').select('id').eq('email', user.email).maybeSingle();
        if (u?.id) await supabase.from('user_achievements').insert({ user_id: u.id, achievement_id: achId } as any).select();
      })();
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [navigate, gameId]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const generateResult = useCallback(() => {
    const now = new Date();
    switch (gameId) {
      case 'mines': {
        const mines = [3, 4, 5][Math.floor(Math.random() * 3)];
        const starCount = Math.floor(Math.random() * 4) + 3;
        const starPositions: number[] = [];
        while (starPositions.length < starCount) {
          const pos = Math.floor(Math.random() * 25);
          if (!starPositions.includes(pos)) starPositions.push(pos);
        }
        return { mines, starPositions };
      }
      case 'aviator': {
        const entryTime = new Date(now.getTime() + 60000);
        const exitMultiplier = (1.50 + Math.random() * 0.15).toFixed(2);
        return { entryTime: entryTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), exitMultiplier };
      }
      case 'roleta': {
        const strategy = RouletteStrategies[Math.floor(Math.random() * RouletteStrategies.length)];
        const minutesAdd = Math.random() > 0.5 ? 1 : 2;
        const time = new Date(now.getTime() + minutesAdd * 60000);
        return { time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), signal: strategy.signal(), strategyLabel: strategy.strategyLabel, tip: strategy.tip };
      }
      case 'football-studio': {
        const signal = Math.random() > 0.5 ? 'CASA' : 'VISITANTE';
        return { time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), signal };
      }
      default: return {};
    }
  }, [gameId]);

  const handleIdentifySignal = useCallback(() => {
    if (cooldown > 0 || phase === 'loading') return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('loading');
    setStepIndex(0);
    setResult(null);
    const totalMs = 5000 + Math.random() * 5000;
    const step1 = totalMs * 0.25;
    const step2 = totalMs * 0.25;
    const t1 = setTimeout(() => setStepIndex(1), step1);
    const t2 = setTimeout(() => setStepIndex(2), step1 + step2);
    const t3 = setTimeout(() => { setPhase('result'); setResult(generateResult()); setCooldown(30); }, totalMs);
    timersRef.current.push(t1, t2, t3);
  }, [cooldown, phase, generateResult]);

  if (!gameConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#000000" }}>
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold" style={{ color: "#00FF00" }}>Jogo não encontrado</h1>
          <p style={{ color: "#00AA00" }}>O jogo solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/cassino")} style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#00FF00" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Cassino
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = gameConfig.icon;
  const gameUrl = house ? (house[gameConfig.urlField] as string | null) : null;
  const buttonText = phase === 'result' ? (cooldown > 0 ? `Novo sinal (${cooldown}s)` : 'Novo sinal') : 'Identificar sinal';
  const isButtonDisabled = phase === 'loading' || cooldown > 0;

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: "#000000" }}>
      <AppHeader
        showTelegramPill={false}
        showVitalicioPill={false}
        leftContent={
          <span className="font-bold text-white text-sm">
            {gameConfig.name}
          </span>
        }
      />


      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Game IA panels */}
        {gameId === 'mines' && (
          <MinesGame phase={phase} stepIndex={stepIndex} result={result} onIdentifySignal={handleIdentifySignal} isButtonDisabled={isButtonDisabled} buttonText={buttonText} buttonColor={gameConfig.buttonColor} buttonGlow={gameConfig.buttonGlow} />
        )}
        {gameId === 'aviator' && <AviatorGame phase={phase} stepIndex={stepIndex} result={result} />}
        {gameId === 'roleta' && <RouletteGame phase={phase} stepIndex={stepIndex} result={result} />}
        {gameId === 'football-studio' && <FootballStudioGame phase={phase} stepIndex={stepIndex} result={result} />}

        {/* Identify signal button (not mines, which has its own) */}
        {gameId !== 'mines' && (
          <Button
            onClick={handleIdentifySignal}
            disabled={isButtonDisabled}
            className="w-full py-6 text-lg font-bold transition-all duration-200"
            style={{
              background: isButtonDisabled ? '#374151' : `linear-gradient(135deg, ${gameConfig.buttonColor} 0%, ${gameConfig.buttonColor}cc 100%)`,
              boxShadow: isButtonDisabled ? 'none' : `0 0 20px ${gameConfig.buttonGlow}`,
            }}
          >
            {phase === 'loading' ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span>Processando...</span> : buttonText}
          </Button>
        )}

        {/* iFrame */}
        {houseLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Carregando jogo...</p>
            </div>
          </div>
        ) : gameUrl ? (
          <section className="w-full">
            <div className="w-full rounded-xl overflow-hidden" style={{ background: "rgba(0,10,0,0.4)", border: "1px solid rgba(0,255,0,0.15)", height: "1000px" }}>
              <iframe
                key={gameId}
                src={gameUrl}
                title={gameConfig.name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: "rgba(0,10,0,0.4)", border: "1px solid rgba(0,255,0,0.1)" }}>
            <IconComponent className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#00FF00" }} />
            <p className="text-sm text-gray-500">Link não configurado pelo administrador.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CasinoGame;
