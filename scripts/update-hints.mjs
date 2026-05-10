#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictDir = path.resolve(__dirname, "..", "src", "i18n", "dictionaries");

const updates = {
  en: {
    pasteHintBrew:
      "Auto-installs Homebrew if you don't have it, then installs the tokenusage CLI and registers the agent as a background service.",
    pasteHintCurl:
      "Pure bash installer — no Homebrew required, just curl + tar (built into Mac and Linux).",
  },
  "zh-CN": {
    pasteHintBrew:
      "自动检测 Homebrew，没装会先帮你装；然后通过 brew 安装 tokenusage CLI 并把 agent 注册为后台服务。",
    pasteHintCurl:
      "纯 Bash 安装器 —— 不需要 Homebrew，只要 curl + tar（Mac/Linux 自带）。",
  },
  "zh-TW": {
    pasteHintBrew:
      "自動偵測 Homebrew，沒裝會先幫你裝；然後透過 brew 安裝 tokenusage CLI 並把 agent 註冊為背景服務。",
    pasteHintCurl:
      "純 Bash 安裝器 —— 不需要 Homebrew，只要 curl + tar（Mac/Linux 內建）。",
  },
  ja: {
    pasteHintBrew:
      "Homebrew がなければ自動でインストールし、tokenusage CLI を入れて agent をバックグラウンドサービスとして登録します。",
    pasteHintCurl:
      "純粋な Bash インストーラ —— Homebrew 不要、curl と tar だけ（Mac/Linux に標準搭載）。",
  },
  ko: {
    pasteHintBrew:
      "Homebrew가 없으면 자동으로 설치한 뒤 tokenusage CLI를 설치하고 agent를 백그라운드 서비스로 등록합니다.",
    pasteHintCurl:
      "순수 Bash 설치 스크립트 —— Homebrew 불필요, curl + tar만 있으면 됩니다 (Mac/Linux 기본 탑재).",
  },
  fr: {
    pasteHintBrew:
      "Installe Homebrew automatiquement s'il manque, puis le CLI tokenusage, puis enregistre l'agent en service de fond.",
    pasteHintCurl:
      "Installeur Bash pur —— pas besoin de Homebrew, juste curl + tar (intégrés sur Mac/Linux).",
  },
  de: {
    pasteHintBrew:
      "Installiert Homebrew automatisch, falls nicht vorhanden, dann das tokenusage-CLI und registriert den Agent als Hintergrunddienst.",
    pasteHintCurl:
      "Reiner Bash-Installer —— kein Homebrew nötig, nur curl + tar (auf Mac/Linux vorinstalliert).",
  },
  es: {
    pasteHintBrew:
      "Instala Homebrew automáticamente si no lo tienes, luego instala el CLI de tokenusage y registra el agente como servicio de fondo.",
    pasteHintCurl:
      "Instalador Bash puro —— no necesita Homebrew, solo curl + tar (vienen con Mac/Linux).",
  },
  pt: {
    pasteHintBrew:
      "Instala o Homebrew automaticamente se não tiver, depois instala o CLI tokenusage e registra o agente como serviço de fundo.",
    pasteHintCurl:
      "Instalador Bash puro —— não precisa de Homebrew, só curl + tar (vêm no Mac/Linux).",
  },
  it: {
    pasteHintBrew:
      "Installa Homebrew automaticamente se manca, poi il CLI tokenusage e registra l'agent come servizio di sfondo.",
    pasteHintCurl:
      "Installer Bash puro —— senza Homebrew, basta curl + tar (inclusi su Mac/Linux).",
  },
  ru: {
    pasteHintBrew:
      "Автоматически ставит Homebrew, если его нет; потом устанавливает CLI tokenusage и регистрирует agent как фоновый сервис.",
    pasteHintCurl:
      "Чистый Bash-установщик —— Homebrew не нужен, только curl + tar (есть на Mac/Linux по умолчанию).",
  },
};

for (const [locale, fields] of Object.entries(updates)) {
  const file = path.join(dictDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  Object.assign(data.install, fields);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`updated ${locale}.json`);
}
