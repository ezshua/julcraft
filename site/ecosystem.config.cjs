// ============================================================
// JulCraft — ecosystem.config.cjs (Этап 7, T-7.1; решения D-20)
// PM2-конфигурация прода. Лежит в site/ (рядом с package.json),
// запускается:  pm2 start ecosystem.config.cjs   (из site/)
//
// .cjs — CommonJS независимо от содержимого package.json: PM2
// требует классический require-модуль (ESM-конфиги поддерживаются
// не во всех версиях pm2).
//
// PATH содержит nvm-Node: PM2/systemd стартуют процесс НЕ в
// интерактивном bash, ~/.bashrc (инициализация nvm) не выполняется —
// поэтому путь к node прописан явно. Обновите версию в PATH при
// смене мажора Node (npm ls -g или ls ~/.nvm/versions/node).
// ============================================================

/* eslint-disable @typescript-eslint/no-require-imports -- CJS-модуль:
   require() здесь обязателен (формат PM2), правило рассчитано на ESM-код */
const fs = require("node:fs");
const path = require("node:path");

const NODE_HOME = path.join(
  process.env.HOME || "/home/ubuntu",
  ".nvm/versions/node",
);

// берём самую свежую установленную версию nvm-Node (v22.x)
let nodeDir = "";
try {
  const versions = fs
    .readdirSync(NODE_HOME)
    .filter((d) => d.startsWith("v"))
    .sort()
    .reverse();
  if (versions.length > 0) nodeDir = `${NODE_HOME}/${versions[0]}/bin`;
} catch {
  nodeDir = ""; // fallback: PATH наследуется от pm2
}

const config = {
  apps: [
    {
      name: "julcraft",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next", // next start без npm-обёртки
      args: "start",
      exec_mode: "fork", // SQLite + один процесс: кластер НЕ использовать
      instances: 1,
      env: {
        NODE_ENV: "production",
        ...(nodeDir ? { PATH: `${nodeDir}:${process.env.PATH || ""}` } : {}),
      },
      // перезапуск при падении, не более 10 раз
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 3000,
      // graceful shutdown: Next слушает SIGTERM
      kill_timeout: 5000,
      // логи — стандартные ~/.pm2/logs/julcraft-*.log
      time: true,
    },
  ],
};

module.exports = config;
