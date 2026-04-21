# 📋 Dossiê de Produto — Premier FC App

> **Atualizado em:** 2026-04-21
> **Natureza:** Descritivo, não-técnico, sem opiniões. Fonte de verdade funcional.

---

## 1. Conceito Central e Proposta de Valor

### O que é o Premier?

O Premier FC App é um aplicativo de inteligência de apostas esportivas e sinais de cassino online. Ele entrega ao usuário "entradas" — palpites estruturados para apostas — acompanhadas de justificativas baseadas em dados, classificações de confiança, mercados, odds sugeridas e condição de vitória, com o objetivo de orientar decisões de apostas de forma mais informada.

### Para quem é o Premier?

O público-alvo são apostadores esportivos e jogadores de cassino online que buscam uma fonte confiável de palpites e análises. São pessoas que desejam ir além de palpites comuns, procurando um sistema que ofereça dados, classificações de confiança e justificativas técnicas para cada entrada disponibilizada.

### Que problema ele resolve?

O Premier atende a necessidade de ter acesso a análises estruturadas e fundamentadas para apostas, eliminando a "aposta cega". Em vez de o usuário pesquisar por conta própria, o aplicativo entrega entradas prontas, classificadas por nível de confiança, com mercado, odd, condição de vitória e justificativa — tudo organizado e atualizado diariamente.

---

## 2. A Jornada do Usuário Final

### Primeiro Acesso e Cadastro

O novo usuário acessa o aplicativo e é recebido por uma tela de login com a identidade visual do Premier — fundo escuro (navy), detalhes em verde primário (#00FF7F) e o logotipo da plataforma. A tela exibe chips informativos como "Entradas prontas", "Atualizados diariamente" e "Alto índice de assertividade", além de um selo de prova social com o número de clientes ativos. Um carrossel de "Últimos Greens" também pode ser exibido como prova social.

O cadastro é simplificado: o usuário insere apenas seu e-mail e clica em "Acessar aplicativo". Não há criação de senha, verificação por código ou etapas adicionais. Caso o usuário ainda não possua acesso a um plano pago, há também um botão "Adquirir acesso" que dispara imediatamente o funil de venda principal.

Ao final da tela de login, o usuário encontra links para os Termos e Privacidade e para o canal de Suporte via WhatsApp, além do aviso "18+ • Jogue com responsabilidade".

### Tela Principal (Home)

Após o login, o usuário é levado à tela principal (Home), que apresenta o seguinte conteúdo, de cima para baixo:

**Cabeçalho (AppHeader):** Exibe o logotipo "Premier" à esquerda. À direita, há botões contextuais: um indicador de "Live" (acesso ao grupo de Telegram com sinais ao vivo — se o usuário possui esse add-on, o botão é verde e direciona ao grupo; se não possui, aparece em vermelho com um ícone de carrinho, direcionando para a compra), um indicador de "Acesso Vitalício" (mesma lógica: verde se possui, vermelho com carrinho se não possui), e um menu hamburger que abre opções de "Promoções", "Suporte" e "Sair".

**Carousel de Banners:** Logo abaixo do cabeçalho, um carousel horizontal exibe banners promocionais rotativos, configurados pelo administrador e segmentados por casa de apostas e audiência.

**Cards de Entrada:** A seção principal da Home exibe os cards dinâmicos. O card "Futebol" recebe destaque visual prioritário com uma moldura verde pulsante. Cada card possui imagem ilustrativa, título, subtítulo descritivo, badges coloridos (como "HOT", "NOVO", "VIP") e um botão de ação. Ao clicar, o usuário é direcionado à categoria correspondente (Tips esportivas, Cassino, etc.).

**Acesso Rápido:** Cards adicionais para categorias específicas (Odds Altas, Alavancagem). Esses cards podem estar desbloqueados ou bloqueados conforme o plano e add-ons do usuário.

**Últimos Greens:** Uma seção dinâmica que exibe o histórico recente de entradas vencedoras, servindo como prova social de resultados. É alimentada pelo card configurado com slug fixo no painel admin.

**Rodapé:** Exibe copyright, link para Termos e Privacidade, link para Suporte e o aviso de responsabilidade.

**Barra de Navegação Inferior (BottomNav):** Fixa na parte inferior da tela, apresenta abas: "Tips", "Cassino" e "Perfil". Os ícones são SVG preenchidos sempre brancos, independentemente da aba ativa. Essa barra está presente em todas as telas principais.

### Acesso ao Conteúdo (Tips Esportivas)

Ao clicar na aba "Tips" ou no card "Futebol" da Home, o usuário é levado à tela de dicas esportivas. Essa tela apresenta:

**Abas compactas por categoria:** Filtros por tier/tipo de entrada (Grátis, Básico, Pro, Ultra, Alavancagem, Odds Altas). Para usuários pagos, a aba "Grátis" é ocultada automaticamente. O sistema também exibe o volume total de entradas por categoria globalmente, como incentivo ao upgrade.

**Filtro por data:** Uma barra horizontal permite navegar entre datas para ver as entradas programadas.

**Lista de Entradas:** Cards individuais com layout de 4 linhas que exibem:

- **Times:** Nomes das equipes com escudos em PNG quando disponíveis (com fallback para camisas estilizadas nas cores reais de cada time).
- **Categoria:** A liga ou campeonato (ex: "Premier League", "La Liga").
- **Mercado:** O tipo de aposta sugerida (ex: "Resultado Final", "Ambas Marcam", "Over 2.5 Gols").
- **Odd:** O valor da odd sugerida.
- **Classificação:** Indicador visual do nível de confiança da entrada.
- **Condição de vitória:** A condição específica para o palpite ser vencedor.
- **Cronômetro em tempo real:** Exibe o horário (HH:mm) e transiciona automaticamente para o status "AO VIVO" com ponto vermelho quando a partida começa.
- **Botão "Adicionar":** Realiza scroll suave até o rodapé absoluto da página, onde fica a área de bilhete e o botão de acesso à casa de apostas parceira.

**Cards bloqueados:** Quando o usuário não possui o plano necessário, o card é exibido com efeito de desfoque (blur), ícone de cadeado e um indicador da odd multiplicada por 2 no canto inferior direito (estímulo visual). Clicar em um card bloqueado abre o funil de venda (Pay Card) ou popup de upgrade correspondente.

**Tipos de conteúdo por tier:**

| Tipo | Visível para | Descrição |
|------|-------------|-----------|
| Grátis | Plano Free (oculto para pagos) | Entradas de vitrine para conversão |
| Básico | Planos Básico, Pro e Ultra | Entradas padrão com análise completa |
| Pro | Planos Pro e Ultra | Entradas com análises mais detalhadas |
| Ultra | Apenas plano Ultra | As melhores entradas, com análise premium |
| Alavancagem | Quem adquiriu o add-on Alavancagem | Entradas focadas em multiplicação de banca |
| Odds Altas | Quem adquiriu o add-on Desaltas | Entradas com odds elevadas |

A ordenação dentro de cada tier é feita pela proximidade do início da partida (entradas mais próximas aparecem primeiro).

### Cassino

A aba "Cassino" segue identidade visual navy e apresenta cards de jogos de cassino online (Aviator, Roleta, Mines, Fortune Tiger, Football Studio). Cada card direciona para uma tela de jogo individual, onde o conteúdo da casa de apostas parceira é carregado de forma integrada via iframe dentro do aplicativo. As URLs dos jogos variam conforme a casa parceira do usuário.

### Perfil (Suporte)

A aba "Perfil" funciona como um hub centralizado que reúne:

**Card de Perfil:** Avatar do usuário, apelido (nickname), nível atual no sistema de gamificação, barra de progresso de XP e título do nível. Ao clicar, abre um modal para editar avatar e nickname, além de exibir estatísticas detalhadas (streak de logins, total de logins, total de XP).

**Gestão de Plano:** Mostra o plano atual (Free, Básico, Pro ou Ultra) e um botão de upgrade para o próximo nível, que aciona o Pay Card apropriado. Para o plano Ultra, há tratamento visual especial.

**Convite de Amigos:** Sistema de indicação onde o usuário compartilha um link de convite e ganha XP por cada novo cadastrado.

**Conquistas:** Seção que exibe as conquistas (achievements) desbloqueadas e bloqueadas. Cada conquista tem nome, descrição, ícone e recompensa em XP. Notificações de conquista usam tema claro (fundo branco com texto azul).

**Suporte:** Link direto para o atendimento via WhatsApp (link dinâmico configurado por casa de apostas).

**Sair da Conta:** Botão para encerrar a sessão.

### Interação com Casas de Aposta

O Premier trabalha com casas de apostas parceiras (ex: Esportiva Bet). Cada usuário pode estar vinculado a uma casa específica, e essa vinculação determina:

- **Links das entradas:** O botão de acesso nas tips esportivas redireciona o usuário para a casa parceira. A configuração permite forçar abertura em nova aba (campo `force_sports_link_new_tab`) ou manter dentro do app.
- **Jogos de cassino:** As URLs dos jogos são carregadas conforme a casa parceira.
- **Popups e promoções:** Popups de boas-vindas e promoções são personalizados por casa.
- **Grupo de Telegram:** O link do grupo Live varia conforme a casa parceira.
- **Identidade visual de assets:** Logo e elementos visuais podem variar dinamicamente por casa.

### Sistema de Gamificação

O aplicativo possui um sistema completo de gamificação:

- **XP (Pontos de Experiência):** O usuário ganha XP por login diário, conquistas desbloqueadas e convites de amigos.
- **10 Níveis de Progressão:** O XP acumulado faz o usuário subir de nível, com títulos progressivos.
- **Streak de Login:** Registra dias consecutivos de acesso ao aplicativo.
- **Conquistas:** Marcos especiais que premiam comportamentos (logins seguidos, primeiro convite, login em dia de evento, etc.).
- **Ranking Global:** Tabela com posição do usuário em relação a todos os outros, baseada em XP e nível.

---

## 3. Planos, Upgrades e Funis de Venda (Pay Cards)

### Modelo de Monetização

O Premier utiliza um modelo de assinatura em camadas (tiers), complementado por add-ons independentes:

**Planos Principais (hierárquicos):**

| Plano | Preço | O que inclui |
|-------|-------|-------------|
| Gratuito (Free) | R$ 0 | Acesso limitado à Home e conteúdo de vitrine |
| Básico | R$ 29,90 | Entradas básicas diárias com análise completa |
| Pro | R$ 49,90 | Tudo do Básico + entradas Pro exclusivas |
| Ultra | R$ 99,90 | Tudo do Pro + entradas Ultra premium |

**Add-ons (independentes do plano):**

| Add-on | Preço | O que oferece |
|--------|-------|--------------|
| Alavancagem | R$ 19,90 | Entradas focadas em multiplicação de banca |
| Desaltas (Odds Altas) | R$ 14,90 | Entradas com odds elevadas |
| Live Telegram | Variável | Acesso ao grupo de sinais ao vivo no Telegram |
| Acesso Vitalício | Variável | Acesso permanente, sem renovação |

Os add-ons podem ser adquiridos por qualquer usuário, independentemente do tier principal. O sistema também suporta **bundles** (pacotes que liberam múltiplos produtos com uma única compra).

**Política de retenção em reembolsos:** Em caso de reembolso, o sistema NÃO rebaixa automaticamente o usuário para o plano gratuito. O acesso é mantido para preservar relacionamento.

### Experiência de Compra

A experiência de compra é integrada ao fluxo de uso do aplicativo:

**1. Card bloqueado:** Ao clicar em conteúdo que exige um plano superior, o usuário é direcionado a um Pay Card ou popup de upgrade.

**2. Botão de upgrade no Perfil:** O card de "Gestão de Plano" exibe um botão de upgrade que aciona o funil para o próximo tier.

**3. Botões no Header:** Os botões "Live" e "Vitalício" no cabeçalho, quando o usuário não possui esses produtos, direcionam para o funil correspondente.

**4. Popups automáticos:** Popups de marketing podem aparecer após login ou tempo de navegação, seguindo prioridade de exibição: `welcome_paid` > `welcome_basic` > `welcome_free` > demais.

**Padrão de checkout:** Todo checkout é exibido de forma embutida (iframe) dentro do aplicativo, sem abrir nova aba, para manter o usuário retido.

### O que são os "Pay Cards" (Funis de Venda)

Do ponto de vista do usuário, os Pay Cards são experiências interativas de oferta. O fluxo segue múltiplas etapas:

**Etapa 1 — Introdução (opcional):** Popup inicial com imagem, título e texto persuasivo, com botão para "Continuar". Clicar na imagem do popup avança automaticamente para a primeira pergunta do quiz.

**Etapa 2 — Quiz interativo:** O usuário responde a 2 ou 3 perguntas rápidas de múltipla escolha (ex: "Qual seu objetivo com apostas?", "Quanto você costuma apostar por dia?"). Uma barra de progresso indica a etapa atual.

**Etapa 3 — Tela de Checkout:** Após o quiz, o usuário chega à tela final com a oferta personalizada. O sistema oferece **7 templates de checkout**: Urgência, Ancoragem, Prova Social, Escassez, Bônus, Comparativo de Planos e Urgência Simples. Os templates "Comparativo de Planos" e "Urgência Simples" suportam dois botões de checkout (plano individual + bundle/pacote).

A tela final pode exibir título personalizado, lista de benefícios, preço, um ou dois botões de compra, e leva ao checkout embutido. O processo de pagamento é realizado pelos provedores Lastlink ou PayT, e o acesso é liberado automaticamente após confirmação via webhook.

### Popups de Marketing

Além dos Pay Cards, popups aparecem em diferentes momentos:

- **Popup de Boas-vindas:** Exibido no primeiro login ou em promoções ativas para a casa parceira.
- **Popup de Paywall:** Para usuários do plano gratuito.
- **Popups por tempo:** Configurados para aparecer após delay específico.
- **Popups por casa:** Personalizados conforme a casa de apostas vinculada.

Esses popups podem ter apenas imagem com botão de ação ou seguir o formato completo de funil com quiz.

---

## 4. A Visão do Administrador (Painel Admin)

O painel administrativo é uma área separada (`/admin`) acessível apenas por pessoas autorizadas. O login do admin exige verificação por código enviado ao e-mail cadastrado. Uma vez dentro, o admin tem acesso a um painel completo com menu lateral organizado por seções e badges visuais que sinalizam itens novos ou pendentes (Clientes, Feedback, Erros, etc.).

### Gerenciamento de Conteúdo

**Dicas Esportivas (Tips):** O admin pode criar entradas preenchendo: título, times (com busca automática e suporte a Drag-and-drop / Ctrl+V para upload de logo), mercado, odd, categoria/liga, classificação de confiança, justificativa, horário de início, data de expiração, tier mínimo, add-on necessário, e links para casas parceiras (até 3). Também pode listar, filtrar, editar e importar tips em lote.

**Analytics de Entradas (NOVO):** Página dedicada que quantifica os resultados das tips: win rate, número de greens/reds, lucro acumulado, ROI, sequências consecutivas. Inclui filtros por período (com presets All Time, Hoje, 7 dias, 30 dias, etc.) e categoria. Stake fixo de R$100 por entrada para cálculos. Apresenta gráfico de barras (greens vs reds por dia), gráfico de linha de % de acerto com referência em 55%, e tabela de histórico diário com colunas ordenáveis. Ao clicar em uma linha do histórico, abre modal com todas as entradas do dia (também com colunas ordenáveis: título, mercado, categoria, odd, status, lucro). Suporta exportação em CSV.

**Times:** Cadastro e edição de times (nome + upload de logo).

**Predições de Mercado:** Cadastro centralizado da relação Palpite × Mercado × Explicação, que alimenta o autocomplete na criação de tips.

**Banners:** Criação, edição e ordenação dos banners promocionais da Home, com filtros por casa de apostas e audiência alvo, datas de início/fim e link de ação.

**Cards da Home:** Configuração dos cards dinâmicos (Home e Cassino). Para cada card: nome, título, subtítulo, layout (lateral ou topo), imagens, badges, ordem fixa pré-definida (1. Futebol, 2. Cassino, etc.), categoria, audiência alvo, regras avançadas de bloqueio ("Bloqueado para") e Pay Card de destino quando bloqueado.

### Gerenciamento de Usuários (CRM)

**Lista de Clientes:** Tabela com todos os usuários (e-mail, plano, casa vinculada, data de cadastro, primeiro acesso, último acesso, origem). Filtros por plano, casa, status. Ações em lote para atualização de tier/casa.

**Cadastro Manual:** Criação de usuários definindo e-mail, plano inicial, casa, origem (`webhook`, `gift`, `test`) e add-ons ativos. A origem distingue compras reais de cortesias e testes internos.

**Clientes Free:** Página dedicada para gestão dos usuários gratuitos.

**Clientes "Não Acessou":** Lista de usuários cadastrados mas que ainda não fizeram primeiro acesso ao app, para ações de reengajamento.

**Perfil de Cliente:** Modal com dados cadastrais, histórico de planos, entitlements ativos, eventos recentes e dados de gamificação.

### Gerenciamento de Vendas

**Casas de Apostas:** Cadastro de casas parceiras com nome, slug, logo, URL do iframe, URLs específicas de cada jogo (Aviator, Roleta, Mines, Football Studio), URL do grupo Telegram, controles granulares de iframe (`open_in_new_tab`, `force_sports_link_new_tab`), e configurações de popup personalizados (boas-vindas, básico, pro, ultra, alavancagem, odds altas, live telegram).

**Popups de Marketing:** Editor de popups com trigger (delay/manual), tempo de delay, audiência, casa específica, até 3 perguntas de quiz, template da tela final, título, benefícios, link de checkout, texto e cor do botão. Inclui simulador interativo de prévia.

**Pay Cards (Funis de Aquisição):** Configurador completo de funis com nome, plano associado, casa, localização no app, audiência, perguntas do quiz, template de checkout (7 opções), até dois links de checkout (plano + bundle), cores e popup de introdução opcional. Inclui prévia interativa do funil completo.

**Links Padrão:** Configuração dos links padrão de checkout usados como fallback quando não há Pay Card específico.

**Webhook e Catálogo:** Logs de webhook de pagamento (Lastlink + PayT), com identificação automática do provedor, status de processamento, e função de reprocessamento manual via RPC. Catálogo de produtos com suporte a bundles.

### Análise de Dados (Dashboards)

**Dashboard Geral:** Métricas em tempo real:
- Total de usuários cadastrados
- Usuários ativos (DAU calculado a partir de eventos como logins, screen_view, app_open)
- Usuários online (sessão ativa)
- Novos cadastros por período
- Relógio em tempo real com horário do servidor (fuso America/Sao_Paulo)

**Analytics:** 
- Eventos granulares capturados pelo sistema de telemetria (app_open, screen_view, funnel_view, cliques, popup views, etc.)
- Filtros por tipo, período, casa e usuário
- Funis de conversão (quantos iniciaram, quantos completaram cada etapa, quantos chegaram ao checkout)
- Engajamento com banners (impressões e cliques)
- Identificação de risco de churn (usuários pagos com baixa atividade recente)

**Ranking Global:** Tabela com todos os usuários ranqueados por XP e nível, mostrando posição, avatar, nickname, nível, XP total e conquistas desbloqueadas.

**Central de Inteligência Financeira:** Painel financeiro com:
- Faturamento bruto total e por período
- KPIs estratégicos (ticket médio, recorrência, MRR estimado)
- Logs de transações detalhados
- Aba Recuperação (cancelados ou pagamentos pendentes)
- Aba Upsell (oportunidades de upgrade)

**Log de Erros:** Lista de erros registrados com tela, mensagem, e-mail do usuário afetado, componente e data/hora.

**Feedback de Usuários:** Sistema de coleta de feedback com suporte a captura de tela (anexos no bucket `feedback_screenshots`).

**Notificações Push:** Composição e disparo de push notifications via Web Push API nativa (sem Firebase), com segmentação (todos, casa específica ou e-mail individual).

---

## 5. Resumo das Funcionalidades por Área

### Para o Usuário Final

| Área | Funcionalidade |
|------|---------------|
| Login | Acesso rápido apenas com e-mail + carrossel de greens |
| Home | Cards dinâmicos, banners, acesso rápido, últimos greens |
| Tips | Entradas esportivas com cronômetro AO VIVO, escudos PNG, abas por tier |
| Cassino | Jogos integrados via iframe (Aviator, Roleta, Mines, Football Studio) |
| Perfil | Avatar, nickname, nível, XP, streak, conquistas, upgrade de plano |
| Gamificação | XP, 10 níveis, streaks, conquistas, ranking global, convites |
| Compra | Funis interativos com quiz + checkout embutido |
| Suporte | WhatsApp dinâmico por casa de apostas |

### Para o Administrador

| Área | Funcionalidade |
|------|---------------|
| Dashboard | Métricas de uso em tempo real |
| Tips | Criar, editar, listar, importar e analisar performance de entradas |
| Tips Analytics | Win rate, ROI, lucro, sequências, gráficos e CSV |
| Banners | Carousel promocional segmentado |
| Cards | Cards dinâmicos da Home e Cassino com regras avançadas |
| Clientes | CRM completo + páginas dedicadas (Free, Não Acessou) |
| Casas | Cadastro e configuração granular de casas parceiras |
| Popups | Editor com quiz e simulador |
| Pay Cards | Funis completos com 7 templates de checkout |
| Analytics | Eventos, funis, engajamento, churn |
| Receita | Faturamento, KPIs, recuperação, upsell |
| Notificações | Push notifications nativas segmentadas |
| Webhook | Logs Lastlink/PayT + reprocessamento |
| Erros | Monitoramento de erros |
| Feedback | Coleta com anexo de screenshots |
| Ranking | Ranking global de gamificação |

---

> ✅ **Confirmação final:** Este documento é inteiramente descritivo. Não contém análise técnica, código-fonte, jargão de programação nem opiniões. Descreve exclusivamente o que o produto faz e como ele se apresenta ao usuário e ao administrador.
