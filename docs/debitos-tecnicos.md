---
tipo: debitos
projeto: ultrateste111
atualizado: 2026-05-08
---

# Débitos técnicos — ultrateste111

## Página `/bd` — bandeiras de pagamento em português ✅ RESOLVIDO
- **Data:** 2026-05-08 (registrado e corrigido na mesma sessão)
- **Contexto:** A landing `/bd` herdou do SingleFile um PNG de bandeiras com legenda "PAGAMENTOS À VISTA" + bandeiras Boleto/Pix (brasileiras).
- **Solução aplicada:** recriado como **SVG** em `public/bd/payment-methods.svg` (~3 KB) seguindo a definição de produto: bandeiras internacionais aceitas pela Perfect Pay no checkout chileno (**Mastercard + Visa + American Express**). Legenda "MÉTODOS DE PAGO" entre linhas decorativas, container com borda arredondada (mesmo formato visual do original). PNG antigo removido.
- **Justificativa do conjunto Visa+Mastercard+Amex:** trio universal de checkout internacional. Cobre praticamente 100% dos cartões de crédito chilenos. WebPay/Mach/Khipu não foram incluídos porque exigiriam integração local com Transbank — fora do escopo do checkout internacional da Perfect Pay.
- **Vantagens da abordagem:** escala perfeita em qualquer DPI, ~50× menor que o PNG original (3 KB vs 147 KB), trivial trocar/adicionar bandeira no futuro, sem licença externa (logos vetorizados a partir das cores oficiais).
- **Tags:** [[es-CL]] [[SVG]] [[assets]] [[Perfect-Pay]] [[checkout-internacional]] [[Premier-FC]]

## Página `/bd` — selo de garantia em português ✅ RESOLVIDO
- **Data:** 2026-05-08 (registrado e corrigido na mesma sessão)
- **Contexto:** O selo original `guarantee-30d.png` (decodificado do base64 do SingleFile) estava em pt-BR ("GARANTIA 30 DIAS").
- **Solução aplicada:** recriado como **SVG** em `public/bd/guarantee-30d.svg` (~5 KB, escala perfeita, texto editável). Mantém o visual: anel dourado serrilhado com "GARANTÍA" curvada em cima e embaixo, centro azul-marinho com raios, "30 DÍAS" em destaque, estrelas laterais. PNG antigo removido.
- **Vantagens da abordagem:** texto trivial de editar (basta abrir o SVG e mudar `30`/`DÍAS` se virar `60`/`MESES` etc), peso 12x menor, escala em qualquer DPI sem blur, sem questão de licença.
- **Tags:** [[es-CL]] [[SVG]] [[assets]] [[Premier-FC]]
