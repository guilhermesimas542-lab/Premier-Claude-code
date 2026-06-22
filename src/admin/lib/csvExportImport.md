# Export/Import de Odds — Formato Canônico

Este documento define o formato CSV usado para mover tips (odds) entre operações
do CL Score (Chile ↔ Espanha) sem retrabalho manual.

## Headers (ordem obrigatória)

```
data_hora,time1,time2,categoria,odd,palpite,mercado,explicacao,justificativa
```

| Coluna         | Tipo / Formato                          | Exemplo                       | Obs                                                                  |
| -------------- | --------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `data_hora`    | ISO `YYYY-MM-DDTHH:MM:SS` ou BR `DD/MM/YYYY HH:MM` | `2026-02-26T20:00:00`         | Prefira ISO no export (sem timezone bug).                            |
| `time1`        | string                                  | `Colo-Colo`                   | Resolve escudo via `teams.name` no destino.                          |
| `time2`        | string                                  | `Universidad de Chile`        | Idem.                                                                |
| `categoria`    | chave do `CATEGORIA_MAP`                | `alavancagem`, `free`, `pro`  | Mapeia pra `tier_required + addon_required + feature_required`.      |
| `odd`          | número decimal                          | `1.85`                        | Ponto como separador decimal.                                        |
| `palpite`      | string livre                            | `Más de 1.5 goles`            | Vai pra `condition_to_win`.                                          |
| `mercado`      | string livre                            | `Over/Under`                  | Vai pra `market` E `category` (legado).                              |
| `explicacao`   | string livre                            | `Tip explicado…`              | Vai pra `category_explanation`.                                      |
| `justificativa`| string livre                            | `Ambos vêm em sequência…`     | Vai pra `justification`.                                             |

## Categorias suportadas

| Chave                  | tier_required | addon_required        | feature_required        |
| ---------------------- | ------------- | --------------------- | ----------------------- |
| `free`                 | free          | —                     | —                       |
| `basico` (ou `basic`)  | basic         | —                     | odds_safes              |
| `pro`                  | pro           | —                     | odds_pro                |
| `ultra`                | ultra         | —                     | odds_pro                |
| `premium`              | pro           | —                     | odds_pro                |
| `alavancagem`          | ultra         | alavancagem           | alavancagem             |
| `multiplas_bingo`      | ultra         | multiplas_bingo       | multiplas_bingo         |
| `mercados_secundarios` | ultra         | —                     | mercados_secundarios    |
| `esportes_americanos`  | ultra         | —                     | esportes_americanos     |
| `odds_ultra`           | ultra         | —                     | odds_ultra              |

## Regras

1. **Escudos não viajam no CSV.** O CSV só carrega `time1` e `time2`. O destino
   resolve `team_logo_url` consultando sua própria tabela `teams`. Isso é o que
   permite portabilidade entre projetos: nenhum URL de bucket vaza.

2. **Pré-requisito:** o destino precisa ter os mesmos nomes na tabela `teams`.
   Se não tiver, o review do importer destaca como pendente e o admin resolve
   via `TeamAutocomplete`.

3. **Encoding:** UTF-8 com BOM (`﻿`). Excel e Google Sheets abrem certo.

4. **Separador:** vírgula no export. O importer aceita também `;` (auto-detect
   no header).

5. **Aspas:** todos os campos são envolvidos em aspas duplas. Aspas dentro de
   campos são escapadas duplicando (`""`).

6. **Dedup:** o importer tem checkbox "Evitar duplicadas" (default ON). Chave =
   `date | team1_name(lower) | team2_name(lower) | odd.toFixed(2) | palpite(lower)`.

## Round-trip esperado

```
content_entries(Chile) → serializeBatch() → CSV → parseCSV() → normalizeRow()
  → review (match teams locais) → insert content_entries(Espanha)
```

Campos que devem chegar idênticos no destino:
- `date`, `starts_at`
- `team1_name`, `team2_name`
- `tier_required`, `addon_required`, `feature_required` (via `categoria`)
- `odd`
- `condition_to_win`, `market`, `category_explanation`, `justification`

Campos que **mudam** no destino (esperado):
- `team1_logo_url`, `team2_logo_url` — vêm do `teams` local
- `id`, `created_at`, `expires_at` — gerados no destino
- `active` — sempre `true` no import
