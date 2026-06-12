import { Navigate } from "react-router-dom";
import { TipAnalysis } from "@/components/aitipster/TipAnalysis";
import { isPreviewEnv } from "@/lib/previewEnv";

/**
 * Página de PREVIEW da análise IA — usada pra revisar visualmente o novo
 * formato do output (Sub-tarefa: refazer prompt). Mostra markdown mock
 * sem chamar edge function nem consumir créditos.
 *
 * Acesso: rota /ia-tipster-preview, gated por isPreviewEnv (só local/preview).
 * Não exposta na sidebar nem em link — só por URL direto.
 */

const SAMPLE_PRE_MATCH = `🎯 **ENTRADA PRINCIPAL**

***Ambos Marcam — Não*** @ 1.50

✅ **Defesas sólidas dos dois lados num jogo travado entre times brigando contra o rebaixamento.**

**📊 Os números falam:**
- Casa Pia 60% e Torreense 70% de jogos sem ambas marcarem nos últimos 10
- Torreense fora de casa: 4 jogos sem sofrer gol nos últimos 5
- Odds pré-jogo apontam Under 2.5 como cenário favorito (1.38)

**🧠 Leitura do jogo:**
Confronto entre dois times na zona de rebaixamento, ambos priorizando não sofrer.
Mandante tem o melhor índice defensivo em casa do campeonato (0.8 gol sofrido/jogo).

**⚠️ O que pode quebrar:**
- Casa Pia marcou em todos os 3 últimos em casa, mesmo em jogos travados
- Sequência de empates 1x1 nos confrontos diretos recentes (pode quebrar o BTTS Não)

⚡ **ALTERNATIVAS**

***Under 2.5 do Jogo*** @ 1.40

**Under 2.5**: 80% dos jogos do mandante em casa terminaram com menos de 2.5 gols. Visitante média 1.1 gol/jogo fora — pouca pólvora pra estourar a linha.

***Casa Pia Handicap Asiático 0.0*** @ 1.53

**HA 0.0 Casa Pia**: protege empate, mandante invicto em 4 dos últimos 5 em casa. Sem perder a entrada se o jogo terminar 0x0.

📋 **RESUMO**

Jogo travado entre defesas sólidas no fundo da tabela. Valor está em mercados de baixa pontuação, com BTTS Não como leitura principal.

🔍 **CONTEXTO**

- H2H: último confronto 0x0 há 8 dias; nos últimos 5, só 1 jogo com ambas marcando
- Casa Pia perdeu o artilheiro pra lesão na última rodada (afeta capacidade ofensiva)
- Torreense vem de sequência defensiva sólida (4x0 Vizela, 2x0 Fafe, 1x0 Marítimo)

⏱️ *Análise válida até o início do jogo*`;

const SAMPLE_LIVE = `🎯 **ENTRADA PRINCIPAL**

***Casa Pia Vence o Tempo*** @ 1.85

✅ **Aos 65', mandante pressionando com 1x1 e 8 finalizações no 2T — cenário típico de vitória no fim.**

**⏱️ Como o jogo está:**
65 minutos, placar 1x1. Casa Pia abriu o placar aos 12', tomou empate aos 38'.
Mandante dominando posse e finalizações no segundo tempo.

**📊 Os números falam:**
- Casa Pia: 8 finalizações no 2T contra 2 do visitante
- Mandante venceu 4 dos últimos 5 em casa quando empatado na metade do 2T
- Posse de bola: 64% no segundo tempo contra 36%

**🧠 Leitura do jogo:**
Visitante recuou todas as linhas após o empate e está só segurando.
Casa Pia ainda tem 2 trocas ofensivas no banco — pressão tende a aumentar.

**⚠️ O que pode quebrar:**
- 2 cartões amarelos em jogadores da defesa do mandante (risco de expulsão)
- Visitante tem contra-ataques rápidos com o ponta esquerda

⚡ **ALTERNATIVAS**

***Siguiente gol: Casa Pia*** @ 1.65

**Próx gol mandante**: 75% das finalizações do 2T saíram do mandante. Pressão concentrada no campo de ataque com sequência de escanteios.

***Over 2.5 do Jogo*** @ 1.50

**Over 2.5**: já 1x1 com 25min restantes; média de 0.9 gol/jogo no último terço dos jogos da rodada. Linha próxima de bater.

📋 **RESUMO**

65', 1x1 — mandante dominando o 2T e empurrando o visitante. Entrada na vitória dele tem suporte estatístico e tático.

🔍 **CONTEXTO**

- 25 min restantes + acréscimos: tempo suficiente pra cenário se confirmar
- Visitante sem substituições ofensivas no banco (só zagueiros e volantes)
- Casa Pia historicamente forte nos minutos finais em casa (35% dos gols após o 70')

⏱️ *Análise válida pelos siguientes minutos. Cenário pode mudar com novos eventos.*`;

export default function IATipsterPreview() {
  if (!isPreviewEnv()) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Preview — Nova análise IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualização do novo formato (bullets + punchline). Sem chamar edge
            function, sem consumir créditos. Disponível só em preview env.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Pré-jogo (Chat)
          </h2>
          <TipAnalysis markdown={SAMPLE_PRE_MATCH} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Ao vivo
          </h2>
          <TipAnalysis markdown={SAMPLE_LIVE} />
        </section>

        <footer className="text-[11px] text-muted-foreground italic border-t border-border pt-4">
          Os textos acima são mockados. A edge function só vai gerar nesse
          formato após deploy via Lovable.
        </footer>
      </div>
    </div>
  );
}
