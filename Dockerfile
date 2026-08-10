# ============================================================
# 🕷️ LEGEND-AMMAR — Pairing Code Server (Railway-ready)
# ============================================================
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
