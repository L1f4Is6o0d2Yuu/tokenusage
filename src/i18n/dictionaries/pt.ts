import type { Dictionary } from "../types";

const pt: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "Painel local de uso de tokens para ferramentas de IA de codificação",
  },
  header: {
    tagline: "Gasto de tokens em todas as suas ferramentas de IA — somente leitura, local primeiro.",
  },
  language: { label: "Idioma" },
  period: {
    today: "Hoje",
    "24h": "Últimas 24 h",
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    all: "Tudo",
    custom: "Personalizado",
    from: "de",
    to: "até",
    apply: "Aplicar",
  },
  banner: {
    readingFrom: "Origem",
    noData: "Nenhuma fonte de dados encontrada.",
    sampleBadge: "dados de exemplo",
  },
  cards: {
    totalSpend: "Gasto total",
    totalTokens: "Total de tokens",
    inputOutput: "Entrada / Saída",
    cacheRead: "Leitura de cache",
    estimated: "estimado",
    partialCost: "dados de custo parciais",
    nonCache: "sem cache",
    sessions: (n) => `${n} sessões`,
    written: (f) => `${f} escritos`,
  },
  trend: {
    title: "Tendência diária",
    description: (p) => `Por dia local — ${p} (eixo esq. tokens, dir. USD)`,
    empty: "Sem dados no período selecionado.",
    yTokens: "Tokens",
    yCost: "Custo",
  },
  topModels: {
    title: "Modelos principais",
    description: "Por tokens totais",
    empty: "Sem uso neste período.",
  },
  breakdown: {
    title: "Detalhamento por modelo",
    description:
      "Ordenado por tokens totais. Os custos são estimativas do gateway, não faturas.",
    columns: {
      provider: "Provedor",
      model: "Modelo",
      sessions: "Sessões",
      input: "Entrada",
      output: "Saída",
      cacheRW: "Cache L/E",
      reasoning: "Raciocínio",
      total: "Total",
      cost: "Custo",
    },
    empty: "Sem uso neste período.",
    editPrices: "Editar preços",
    exportCsv: "Exportar CSV",
  },
  recent: {
    title: "Sessões recentes",
    description: "Últimas 10 deste período — clique para inspecionar.",
    empty: "Sem sessões neste período.",
    untitled: "(sessão sem título)",
  },
  session: {
    back: "← Voltar ao painel",
    untitled: "(sessão sem título)",
    totalTokens: "Total de tokens",
    cost: "Custo",
    started: "Início",
    duration: "Duração",
    stillOpen: "ainda aberta",
    endedAt: (w) => `encerrada ${w}`,
    breakdownTitle: "Detalhamento de tokens",
    breakdownDescription: "Capturado pelo adaptador de origem ao fechar a sessão.",
    fields: {
      input: "Entrada",
      output: "Saída",
      reasoning: "Raciocínio",
      cacheRead: "Leitura cache",
      cacheWrite: "Escrita cache",
      apiCalls: "Chamadas API",
    },
    costStatus: {
      estimated: "estimado",
      unpriced: "sem preço",
      unknown: "desconhecido",
    },
  },
  prices: {
    back: "← Voltar ao painel",
    title: "Tabela de preços",
    description:
      "Edite os preços por modelo. Valores em USD por 1M tokens. Match é uma regex sem distinção de maiúsculas.",
    badges: {
      override: "substituição ativa",
      defaults: "padrões",
      missing: "sem arquivo de preços",
    },
    saved: "Salvo. As estimativas de custo serão atualizadas ao recarregar.",
    resetDone: "Substituição removida. Voltando aos padrões.",
    rulesTitle: "Regras",
    rulesDescription:
      "As regras são avaliadas em ordem — vence a primeira correspondência. Deixe match vazio para remover; a última linha vazia serve para adicionar.",
    columns: {
      match: "Match (regex)",
      input: "Entrada",
      output: "Saída",
      cacheRead: "Cache L",
      cacheWrite: "Cache E",
      reasoning: "Raciocínio",
    },
    save: "Salvar substituição",
    resetTitle: "Redefinir",
    resetDescription:
      "Remove data/prices.json e volta a data/prices.default.json.",
    resetButton: "Redefinir para os padrões",
  },
};

export default pt;
