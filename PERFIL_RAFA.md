# Dev Tracker — Perfil da Rafa

Documento de referência para o perfil e personalização do app da Rafa. Estado: configurado e em produção desde maio/2026.

---

## Perfil

| Campo | Valor |
|---|---|
| Nome | Rafa |
| Idade | 30 anos |
| Profissão | Psicóloga clínica especialista em TCC |
| Trabalho | Atendimentos clínicos, supervisão, estudo contínuo |
| Meta principal | Crescer a clínica + equilibrar saúde com trabalho |
| Produção de conteúdo | Redes sociais como parte do trabalho (meta: 3 posts/semana) |
| Gratidão | Pratica registro diário |
| Treino | Academia (meta 3x/semana) + caminhada/corrida (meta 2x/semana) + bike quando possível |
| Característica relevante | Tendência à perda de foco e pensamento excessivo; quer feedback que reconhece o esforço sem ser genérico |
| Tema visual | Roxo `#9333ea` |

---

## Campos do registro diário (Rafa)

| Seção | Campo | Tipo |
|---|---|---|
| Geral | Data | date (default: hoje local) |
| Geral | Humor | 1–5 colorido (vermelho→verde), obrigatório |
| Saúde & Bem-estar | Qualidade do sono | 1–5 |
| Saúde & Bem-estar | Atendimentos realizados | inteiro (0–20) |
| Saúde & Bem-estar | Conteúdos postados | inteiro (0–10) |
| Saúde & Bem-estar | Cancelamentos | inteiro (0–10) + motivo se > 0 |
| Saúde & Bem-estar | Gratidão do dia | textarea |
| Lazer | Lazer do dia | seleção da lista cadastrada |
| Lazer | Intensidade/foco | 1–5 |
| Lazer | Observação | textarea |
| Treino | Tipo | Academia / Caminhada-Corrida / Bike / Nenhum |
| Treino | Rendimento | 1–5 |
| Treino | Observação | textarea |
| Reflexão | Conquistas | textarea |
| Reflexão | Desafios | textarea |
| Reflexão | Destaques | textarea |

Todos os campos de atendimentos/conteúdo são ocultados quando humor ≤ 2 (modo cuidado no formulário).

---

## Métricas do dashboard (Rafa)

- Humor médio da semana
- Atendimentos da semana
- Cancelamentos da semana
- Conteúdo postado da semana
- Dias com lazer registrado (`X/7`)
- Aderência à rotina (% com seta de tendência)
- Card "Coisas boas" — gratidões + conquistas da semana

### Gráficos
- Barras: humor por dia (semana atual)
- Barras: qualidade do sono por dia (semana atual)
- Barras empilhadas: lazeres por semana (últimas 4 semanas)
- Linha: aderência à rotina (últimas 4 semanas)

---

## Modo cuidado

Ativado automaticamente quando média de humor dos últimos 3 registros < 2.

**No dashboard:**
- Banner de acolhimento visível (dispensável com ×)
- Seções de treino e rotina colapsam por padrão
- Cards de métricas ocultados (substituídos pelo card "Coisas boas")

**No insight diário:**
- Se humor do dia ≤ 2: prompt específico (modo cuidado) — 2 partes: acolhimento + ação gentil. Tom: amiga, não coach. Sem mencionar produtividade ou metas.
- Se humor > 2 mas média dos 3 últimos ≤ 2: alerta incluído no prompt padrão

---

## Personalização da IA (Rafa)

### Insight diário
- **Tom:** acolhedora mas honesta, como amiga que olha os dados com cuidado
- **Contexto:** dia atual + últimos 5 registros (tendência de sono, atendimentos, treino, humor)
- **Saída:** 3 frases — 1ª: observação honesta; 2ª: encorajamento genuíno baseado nos dados; 3ª: ação concreta para amanhã
- **Máximo:** 100 palavras
- **Modo cuidado (humor ≤ 2):** 2 partes: acolhimento + ação gentil. Máximo 60 palavras. Sem mencionar trabalho, metas ou comparações.

### Análise semanal
- **Tom:** acolhedor mas honesto, "parceira que vê os dados e se importa, não coach"
- **Contexto:** sono, atendimentos, cancelamentos, conteúdo postado, lazer, aderência à rotina, gratidões, conquistas, treino, comparação com período anterior, contexto da última análise
- **Estrutura de saída:** Visão Geral / Destaques / Padrões Preocupantes / Foco para o próximo período
- **Alertas automáticos:** ≥ 3 dias com humor < 3 (tratado com cuidado genuíno na seção Padrões Preocupantes)
- **Máximo:** 400 palavras, sem emojis

---

## Lazeres cadastrados (padrão)

Lista padrão do formulário (não requer cadastro):
- Crochê
- Sudoku / Killer Sudoku
- Leitura
- Música
- Puzzles e jogos de lógica
- Stop / Scattergories

Lazeres personalizados são cadastrados pelo painel de Lazer e persistidos no banco por usuário.

---

## Aderência à rotina

- Checkin por slot de rotina: feito / não feito / sem marcação
- Histórico semanal no gráfico de aderência
- Disponível no `GET /api/rotina/aderencia?semanas=4`
- Incluído no contexto da análise semanal como % da semana atual vs. período anterior
