import { ArrowLeft, Wifi } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

// Tipos
type Phase = 'idle' | 'loading' | 'result';

interface GameConfig {
  name: string;
  buttonColor: string;
  buttonGlow: string;
}

// Configurações por jogo
const GAME_CONFIGS: Record<string, GameConfig> = {
  aviator: { name: "Aviator", buttonColor: "#DC2626", buttonGlow: "rgba(220, 38, 38, 0.5)" },
  roleta: { name: "Roleta", buttonColor: "#DC2626", buttonGlow: "rgba(220, 38, 38, 0.5)" },
  mines: { name: "Mines", buttonColor: "#8B5CF6", buttonGlow: "rgba(139, 92, 246, 0.5)" },
  "fortune-tiger": { name: "Fortune Tiger", buttonColor: "#FF4500", buttonGlow: "rgba(255, 69, 0, 0.5)" },
};

// Loading steps
const LOADING_STEPS = [
  "Analisando o algoritmo",
  "Identificando o padrão",
  "Sinal encontrado",
];

// ===== MINES =====
const MinesGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  const renderGrid = () => {
    const grid = [];
    for (let i = 0; i < 25; i++) {
      const hasStar = phase === 'result' && result?.starPositions?.includes(i);
      grid.push(
        <div
          key={i}
          className="aspect-square rounded-lg flex items-center justify-center text-xl transition-all duration-300"
          style={{
            background: hasStar 
              ? 'linear-gradient(145deg, #FFD700 0%, #FFA500 100%)' 
              : 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
            border: hasStar ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: hasStar ? '0 0 15px rgba(255, 215, 0, 0.5)' : 'none',
          }}
        >
          {hasStar && '⭐'}
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-red-500/30">
          <p className="text-xs text-muted-foreground mb-1">Minas</p>
          <p className="text-2xl font-bold text-red-500">
            {phase === 'result' ? result?.mines : '—'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/30">
          <p className="text-xs text-muted-foreground mb-1">Proteções</p>
          <p className="text-2xl font-bold text-green-500">
            {phase === 'result' ? '02' : '—'}
          </p>
        </div>
      </div>

      {/* Grid 5x5 */}
      <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
        {renderGrid()}
      </div>

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
          {stepIndex === 2 && <p className="text-sm text-muted-foreground">Prepare-se</p>}
        </div>
      )}
    </div>
  );
};

// ===== AVIATOR =====
const AviatorGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">Entrada</p>
          <p className="text-xl font-bold text-white">
            {phase === 'result' ? result?.entryTime : '∞'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saída</p>
          <p className="text-xl font-bold text-green-500">
            {phase === 'result' ? `${result?.exitMultiplier}x` : '—'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-yellow-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Proteções</p>
          <p className="text-xl font-bold text-yellow-500">
            {phase === 'result' ? 'Até 02' : '—'}
          </p>
        </div>
      </div>

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="text-center space-y-2 animate-pulse py-8">
          <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
          {stepIndex === 2 && <p className="text-sm text-muted-foreground">Prepare-se</p>}
        </div>
      )}
    </div>
  );
};

// ===== ROLETA =====
const RouletteStrategies = [
  { type: 'par_impar', signal: () => Math.random() > 0.5 ? 'Par (Even)' : 'Ímpar (Odd)', tip: 'Aposte em Par (Even) ou Ímpar (Odd) por 3 rodadas. Proteção até 02.' },
  { type: 'metade', signal: () => Math.random() > 0.5 ? '1–18' : '19–36', tip: 'Aposte na metade indicada (1–18 = baixos, 19–36 = altos) por 3 rodadas. Proteção até 02.' },
  { type: 'cor', signal: () => Math.random() > 0.5 ? '🔴 Vermelho' : '⚫ Preto', tip: 'Aposte na cor indicada por 3 rodadas. Proteção até 02.' },
  { type: 'colunas', signal: () => { const cols = ['1ª', '2ª', '3ª']; const c1 = cols[Math.floor(Math.random() * 3)]; let c2 = cols[Math.floor(Math.random() * 3)]; while(c2 === c1) c2 = cols[Math.floor(Math.random() * 3)]; return `${c1} + ${c2} coluna`; }, tip: 'Colunas são as verticais: 1ª coluna começa no 1 (1,4,7,10...), 2ª começa no 2 (2,5,8,11...), 3ª começa no 3 (3,6,9,12...). Selecione 2 colunas. Proteção até 02.' },
  { type: 'quadrantes', signal: () => { const quads = ['1º', '2º', '3º']; const q1 = quads[Math.floor(Math.random() * 3)]; let q2 = quads[Math.floor(Math.random() * 3)]; while(q2 === q1) q2 = quads[Math.floor(Math.random() * 3)]; return `${q1} + ${q2} quadrante`; }, tip: 'Quadrantes são blocos de 12: 1º (1-12), 2º (13-24), 3º (25-36). Escolha 2 quadrantes. Proteção até 02.' },
];

const RouletteGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-red-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Horário</p>
          <p className="text-xl font-bold text-white">
            {phase === 'result' ? result?.time : '∞'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Proteções</p>
          <p className="text-xl font-bold text-green-500">
            {phase === 'result' ? 'Até 02' : '—'}
          </p>
        </div>
      </div>

      {/* Sinal e Dica */}
      {phase === 'result' && result && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 rounded-xl p-4 border border-red-500/40 text-center">
            <p className="text-xs text-muted-foreground mb-2">SINAL</p>
            <p className="text-2xl font-bold text-white">{result.signal}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
            <p className="text-xs text-muted-foreground mb-2">ESTRATÉGIA</p>
            <p className="text-sm text-white/80 leading-relaxed">{result.tip}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="text-center space-y-2 animate-pulse py-8">
          <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
          {stepIndex === 2 && <p className="text-sm text-muted-foreground">Prepare-se</p>}
        </div>
      )}
    </div>
  );
};

// ===== FORTUNE TIGER =====
const FortuneTigerGame = ({ phase, stepIndex, result }: { phase: Phase; stepIndex: number; result: any }) => {
  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-orange-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Giros</p>
          <p className="text-xl font-bold text-orange-500">
            {phase === 'result' ? `Até ${result?.spins}` : '∞'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-green-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Entrada</p>
          <p className="text-xl font-bold text-green-500">
            {phase === 'result' ? 'Agora' : '∞'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-yellow-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Válido até</p>
          <p className="text-xl font-bold text-yellow-500">
            {phase === 'result' ? result?.validUntil : '—:—'}
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-cyan-500/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Tentativas</p>
          <p className="text-xl font-bold text-cyan-500">
            {phase === 'result' ? 'Até 05' : '—'}
          </p>
        </div>
      </div>

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="text-center space-y-2 animate-pulse py-8">
          <p className="text-lg font-semibold text-white">{LOADING_STEPS[stepIndex]}</p>
          {stepIndex === 2 && <p className="text-sm text-muted-foreground">Prepare-se</p>}
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====
const CasinoSignalGame = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<any>(null);

  const gameConfig = slug ? GAME_CONFIGS[slug] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const generateResult = useCallback(() => {
    const now = new Date();
    
    switch (slug) {
      case 'mines': {
        const mines = [3, 4, 5][Math.floor(Math.random() * 3)];
        const starCount = Math.floor(Math.random() * 4) + 3; // 3-6 estrelas
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
        return { 
          entryTime: entryTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          exitMultiplier 
        };
      }
      case 'roleta': {
        const strategy = RouletteStrategies[Math.floor(Math.random() * RouletteStrategies.length)];
        const minutesAdd = Math.random() > 0.5 ? 1 : 2;
        const time = new Date(now.getTime() + minutesAdd * 60000);
        return {
          time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          signal: strategy.signal(),
          tip: strategy.tip,
        };
      }
      case 'fortune-tiger': {
        const spins = Math.floor(Math.random() * 11) + 5; // 5-15
        const validMinutes = Math.floor(Math.random() * 3) + 2; // 2-4
        const validUntil = new Date(now.getTime() + validMinutes * 60000);
        return {
          spins,
          validUntil: validUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
      }
      default:
        return {};
    }
  }, [slug]);

  const handleIdentifySignal = useCallback(() => {
    if (cooldown > 0 || phase === 'loading') return;

    setPhase('loading');
    setStepIndex(0);
    setResult(null);

    // Random total time between 5-10 seconds
    const totalMs = 5000 + Math.random() * 5000;
    const step1 = totalMs * 0.25;
    const step2 = totalMs * 0.25;
    const step3 = totalMs * 0.50;

    // Step 1
    setTimeout(() => setStepIndex(1), step1);
    
    // Step 2
    setTimeout(() => setStepIndex(2), step1 + step2);
    
    // Final result
    setTimeout(() => {
      setPhase('result');
      setResult(generateResult());
      setCooldown(30);
    }, step1 + step2 + step3);
  }, [cooldown, phase, generateResult]);

  // Jogo não encontrado
  if (!gameConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Jogo não encontrado</h1>
          <p className="text-muted-foreground">O jogo solicitado não existe ou foi removido.</p>
          <Button
            onClick={() => navigate("/cassino")}
            className="bg-vip hover:bg-vip/90 text-white font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Cassino
          </Button>
        </div>
      </div>
    );
  }

  const buttonText = phase === 'result' 
    ? (cooldown > 0 ? `Novo sinal (${cooldown}s)` : 'Novo sinal')
    : 'Identificar sinal';

  const isButtonDisabled = phase === 'loading' || cooldown > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/cassino")}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{gameConfig.name} - IA</h1>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/40">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-xs font-medium text-green-500">Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Game-specific content */}
        {slug === 'mines' && <MinesGame phase={phase} stepIndex={stepIndex} result={result} />}
        {slug === 'aviator' && <AviatorGame phase={phase} stepIndex={stepIndex} result={result} />}
        {slug === 'roleta' && <RouletteGame phase={phase} stepIndex={stepIndex} result={result} />}
        {slug === 'fortune-tiger' && <FortuneTigerGame phase={phase} stepIndex={stepIndex} result={result} />}

        {/* Button */}
        <Button
          onClick={handleIdentifySignal}
          disabled={isButtonDisabled}
          className="w-full py-6 text-lg font-bold transition-all duration-200"
          style={{
            background: isButtonDisabled 
              ? '#374151' 
              : `linear-gradient(135deg, ${gameConfig.buttonColor} 0%, ${gameConfig.buttonColor}cc 100%)`,
            boxShadow: isButtonDisabled ? 'none' : `0 0 20px ${gameConfig.buttonGlow}`,
          }}
        >
          {phase === 'loading' ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Processando...
            </span>
          ) : buttonText}
        </Button>
      </main>
    </div>
  );
};

export default CasinoSignalGame;
