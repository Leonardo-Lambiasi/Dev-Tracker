# Leo Dev Tracker — Perfil e Contexto do Leo

Documento de referência para o perfil do usuário Leo e as decisões de personalização do app.

---

## Perfil

| Campo | Valor |
|---|---|
| Nome | Leonardo Lambiasi |
| Idade | 26 anos |
| Função atual | Suporte técnico na Rift Sistemas (em transição para dev júnior) |
| Stack principal | C#/.NET, SQL Server, React |
| Meta de carreira | Dev júnior em 6–9 meses; pleno em 3 anos |
| Treino | Academia 5x/semana + Vôlei 2x/semana |
| Característica relevante | Tendência a desistir sob pressão — prefere feedback honesto que reconhece o esforço sem ser condescendente |

---

## Campos do registro diário (Leo)

| Seção | Campo | Tipo |
|---|---|---|
| Geral | Data | date (default: hoje local) |
| Geral | Humor | 1–5 (obrigatório) |
| Estudos | Horas estudadas | decimal (0–24, step 0.5) |
| Estudos | Tópico estudado | texto livre |
| Trabalho (Rift) | Tickets trabalhados | inteiro (0–50) |
| Trabalho (Rift) | Horas trabalhadas | decimal (0–24, step 0.5) |
| Treino | Tipo | Academia / Vôlei / Ambos / Nenhum |
| Treino | Rendimento | 1–5 |
| Treino | Observação | texto livre |
| Reflexão | Conquistas | textarea |
| Reflexão | Desafios | textarea |
| Reflexão | Destaques | textarea |

Campos `FeaturesRift` e `BugsRift` existem no modelo mas não são expostos no formulário atualmente (campos legacy mantidos para histórico).

---

## Métricas do dashboard (Leo)

- Horas de estudo da semana
- Tickets Rift da semana + horas trabalhadas
- Humor médio da semana
- Dias com registro na semana

### Gráficos
- Linha: horas de estudo por dia (últimas 4 semanas)
- Barras: humor por dia (semana atual)
- Barras horizontais: tópicos estudados por horas (últimas 4 semanas)

---

## Personalização da IA (Leo)

### Insight diário
- **Tom:** mentor direto, sem elogios vazios, pode ser crítico
- **Contexto:** dia atual + últimos 5 registros (tendência) + projetos ativos com % + streak de treino (últimos 30 dias)
- **Saída:** 2 frases — 1ª: observação honesta; 2ª: ação concreta e executável para amanhã
- **Máximo:** 80 palavras

### Análise semanal
- **Tom:** honesto, direto, data-driven
- **Contexto adicional:** metas financeiras com progresso %, comparação com período anterior, contexto da última análise
- **Estrutura de saída:** Visão Geral / Destaques / Padrões Preocupantes / Foco para o próximo período
- **Máximo:** 400 palavras, sem emojis
- **Alertas automáticos:** estuda < período anterior, treino abaixo da meta (academia 5x, vôlei 2x), metas financeiras estagnadas

### Análise de extrato
- **Contexto adicional:** metas financeiras cadastradas (nome, valor atual, meta, progresso %)
- **Campos extras no JSON:** `projecao`, `acoes_concretas`, `alertas`, `metas_impacto`

---

## Tema visual

- Cor de acesso: índigo `#6366f1`
- Background de acesso: `#6366f120`
- Definido dinamicamente via CSS vars em `Dashboard.jsx` no `useEffect` de montagem
