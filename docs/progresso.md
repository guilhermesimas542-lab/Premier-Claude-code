---
tipo: progresso
projeto: ultrateste111
atualizado: 2026-05-06
---

# Progresso — ultrateste111

## Migração do Lovable para desenvolvimento local com Claude Code
- **Data:** 2026-05-06
- **Contexto:** Projeto originalmente desenvolvido no Lovable (gerador de apps com IA), com código publicado no GitHub `guilhermesimas542-lab/ultrateste111`. O projeto está em produção com tráfego ativo, então não pode ser interrompido. Usuário relatou limitações da plataforma Lovable e decidiu migrar pra desenvolvimento local com [[Claude Code]] para ter mais controle.
- **Plano executado:**
  1. Clone do repo de produção em `/Users/guilhermesimas/Documents/premier/ultrateste111/`
  2. Remoção do `origin` antigo (impede push acidental no repo de produção)
  3. Conexão com novo `origin`: `Premier-Claude-code` (repo separado pra desenvolvimento)
  4. Remoção dos lockfiles do bun (`bun.lock`, `bun.lockb`) — escolhido npm como gerenciador
  5. `npm install` — instalação limpa das dependências
  6. Proteção do `.env` (criado `.env.example`, `.env` removido do tracking do Git e adicionado ao `.gitignore`)
  7. Validação do `npm run dev` — servidor sobe em `http://localhost:8080/`
  8. Criação da estrutura `docs/` (progresso, decisões, bugs)
- **Resultado:** Ambiente local funcional, repo de produção intocado, novo repo de desenvolvimento isolado. Pronto pra evoluir.
- **Próximos passos:**
  - Configurar Supabase CLI pra acessar o banco de produção localmente
  - Definir estratégia de deploy (continuar onde está? mudar pra Vercel/Netlify?)
  - Validar fluxos críticos (Casino, Sport, Login) no ambiente local
- **Tags:** [[Lovable]] [[migração]] [[Vite]] [[React]] [[Supabase]] [[npm]]
