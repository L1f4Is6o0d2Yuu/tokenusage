import type { Dictionary } from "../types";

const es: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "Panel local de uso de tokens para herramientas de IA de codificación",
  },
  header: {
    tagline: "Gasto de tokens en todas tus herramientas de IA — solo lectura, local primero.",
  },
  language: { label: "Idioma" },
  period: {
    today: "Hoy",
    "24h": "Últimas 24 h",
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    all: "Todo el tiempo",
    custom: "Personalizado",
    from: "desde",
    to: "hasta",
    apply: "Aplicar",
  },
  banner: {
    readingFrom: "Origen",
    noData: "No se encontraron fuentes de datos.",
    sampleBadge: "datos de ejemplo",
  },
  cards: {
    totalSpend: "Gasto total",
    totalTokens: "Tokens totales",
    inputOutput: "Entrada / Salida",
    cacheRead: "Lectura de caché",
    estimated: "estimado",
    partialCost: "datos de coste parciales",
    nonCache: "sin caché",
    sessions: (n) => `${n} sesiones`,
    written: (f) => `${f} escritos`,
  },
  trend: {
    title: "Tendencia diaria",
    description: (p) => `Por día local — ${p} (eje izq. tokens, der. USD)`,
    empty: "Sin datos en el período seleccionado.",
    yTokens: "Tokens",
    yCost: "Coste",
  },
  topModels: {
    title: "Modelos más usados",
    description: "Por tokens totales",
    empty: "Sin uso en este período.",
  },
  breakdown: {
    title: "Desglose por modelo",
    description:
      "Ordenado por tokens totales. Los costes son estimaciones del gateway, no facturas.",
    columns: {
      provider: "Proveedor",
      model: "Modelo",
      sessions: "Sesiones",
      input: "Entrada",
      output: "Salida",
      cacheRW: "Caché L/E",
      reasoning: "Razonamiento",
      total: "Total",
      cost: "Coste",
    },
    empty: "Sin uso en este período.",
    editPrices: "Editar precios",
    exportCsv: "Exportar CSV",
  },
  recent: {
    title: "Sesiones recientes",
    description: "Últimas 10 en este período — haz clic para ver detalles.",
    empty: "Sin sesiones en este período.",
    untitled: "(sesión sin título)",
  },
  session: {
    back: "← Volver al panel",
    untitled: "(sesión sin título)",
    totalTokens: "Tokens totales",
    cost: "Coste",
    started: "Inicio",
    duration: "Duración",
    stillOpen: "aún abierta",
    endedAt: (w) => `finalizada ${w}`,
    breakdownTitle: "Desglose de tokens",
    breakdownDescription: "Capturado por el adaptador de origen al cerrar la sesión.",
    fields: {
      input: "Entrada",
      output: "Salida",
      reasoning: "Razonamiento",
      cacheRead: "Lectura caché",
      cacheWrite: "Escritura caché",
      apiCalls: "Llamadas API",
    },
    costStatus: {
      estimated: "estimado",
      unpriced: "sin precio",
      unknown: "desconocido",
    },
  },
  prices: {
    back: "← Volver al panel",
    title: "Tabla de precios",
    description:
      "Edita los precios por modelo. Valores en USD por 1M tokens. Match es una regex insensible a mayúsculas.",
    badges: {
      override: "anulación activa",
      defaults: "valores por defecto",
      missing: "sin archivo de precios",
    },
    saved: "Guardado. Las estimaciones de coste se actualizan al recargar el panel.",
    resetDone: "Anulación eliminada. Volviendo a los valores por defecto.",
    rulesTitle: "Reglas",
    rulesDescription:
      "Las reglas se evalúan en orden — gana la primera coincidencia. Deja match vacío para descartar la fila; la última fila vacía sirve para añadir.",
    columns: {
      match: "Match (regex)",
      input: "Entrada",
      output: "Salida",
      cacheRead: "Caché L",
      cacheWrite: "Caché E",
      reasoning: "Razonamiento",
    },
    save: "Guardar anulación",
    resetTitle: "Restablecer",
    resetDescription:
      "Elimina data/prices.json y vuelve a data/prices.default.json.",
    resetButton: "Restablecer valores por defecto",
  },
};

export default es;
