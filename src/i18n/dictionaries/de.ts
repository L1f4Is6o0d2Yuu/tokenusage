import type { Dictionary } from "../types";

const de: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "Lokales Token-Nutzungs-Dashboard für KI-Coding-Tools",
  },
  header: {
    tagline: "Token-Verbrauch über alle KI-Tools — nur lesend, lokal zuerst.",
  },
  language: { label: "Sprache" },
  period: {
    today: "Heute",
    "24h": "Letzte 24 h",
    "7d": "Letzte 7 Tage",
    "30d": "Letzte 30 Tage",
    all: "Gesamt",
    custom: "Benutzerdefiniert",
    from: "von",
    to: "bis",
    apply: "Übernehmen",
  },
  banner: {
    readingFrom: "Quelle",
    noData: "Keine Datenquellen gefunden.",
    sampleBadge: "Beispieldaten",
  },
  cards: {
    totalSpend: "Gesamtkosten",
    totalTokens: "Tokens gesamt",
    inputOutput: "Eingabe / Ausgabe",
    cacheRead: "Cache-Lesezugriffe",
    estimated: "geschätzt",
    partialCost: "Kostendaten unvollständig",
    nonCache: "ohne Cache",
    sessions: (n) => `${n} Sitzungen`,
    written: (f) => `${f} geschrieben`,
  },
  trend: {
    title: "Tagesverlauf",
    description: (p) => `Pro lokalem Tag — ${p} (links Tokens, rechts USD)`,
    empty: "Keine Daten im gewählten Zeitraum.",
    yTokens: "Tokens",
    yCost: "Kosten",
  },
  topModels: {
    title: "Top-Modelle",
    description: "Nach Token-Summe",
    empty: "Keine Nutzung in diesem Zeitraum.",
  },
  breakdown: {
    title: "Aufschlüsselung nach Modell",
    description:
      "Sortiert nach Token-Summe. Kosten sind Schätzungen aus den Gateway-Daten, keine Rechnungen.",
    columns: {
      provider: "Anbieter",
      model: "Modell",
      sessions: "Sitzungen",
      input: "Eingabe",
      output: "Ausgabe",
      cacheRW: "Cache L/S",
      reasoning: "Reasoning",
      total: "Gesamt",
      cost: "Kosten",
    },
    empty: "Keine Nutzung in diesem Zeitraum.",
    editPrices: "Preise bearbeiten",
    exportCsv: "CSV exportieren",
  },
  recent: {
    title: "Letzte Sitzungen",
    description: "Die letzten 10 in diesem Zeitraum — zum Anzeigen klicken.",
    empty: "Keine Sitzungen in diesem Zeitraum.",
    untitled: "(unbenannte Sitzung)",
  },
  session: {
    back: "← Zurück zum Dashboard",
    untitled: "(unbenannte Sitzung)",
    totalTokens: "Tokens gesamt",
    cost: "Kosten",
    started: "Begonnen",
    duration: "Dauer",
    stillOpen: "noch offen",
    endedAt: (w) => `beendet ${w}`,
    breakdownTitle: "Token-Aufschlüsselung",
    breakdownDescription: "Vom Quell-Adapter beim Sitzungsende erfasst.",
    fields: {
      input: "Eingabe",
      output: "Ausgabe",
      reasoning: "Reasoning",
      cacheRead: "Cache-Lesen",
      cacheWrite: "Cache-Schreiben",
      apiCalls: "API-Aufrufe",
    },
    costStatus: {
      estimated: "geschätzt",
      unpriced: "ohne Preis",
      unknown: "unbekannt",
    },
  },
  prices: {
    back: "← Zurück zum Dashboard",
    title: "Preistabelle",
    description:
      "Token-Preise pro Modell bearbeiten. Werte in USD pro 1M Tokens; Match ist eine groß-/kleinschreibungs-unabhängige Regex.",
    badges: {
      override: "Override aktiv",
      defaults: "Standard",
      missing: "keine Preisdatei",
    },
    saved: "Gespeichert. Kostenschätzungen werden beim nächsten Dashboard-Laden aktualisiert.",
    resetDone: "Override entfernt. Standardwerte aktiv.",
    rulesTitle: "Regeln",
    rulesDescription:
      "Regeln werden in Reihenfolge geprüft — der erste Treffer zählt. Match leer lassen zum Entfernen; die letzte (leere) Zeile dient zum Hinzufügen.",
    columns: {
      match: "Match (Regex)",
      input: "Eingabe",
      output: "Ausgabe",
      cacheRead: "Cache L",
      cacheWrite: "Cache S",
      reasoning: "Reasoning",
    },
    save: "Override speichern",
    resetTitle: "Zurücksetzen",
    resetDescription:
      "Löscht data/prices.json und kehrt zu data/prices.default.json zurück.",
    resetButton: "Auf Standard zurücksetzen",
  },
};

export default de;
