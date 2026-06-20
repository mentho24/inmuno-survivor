# API de ranking — Node puro, sin dependencias
FROM node:20-alpine

WORKDIR /app
COPY server.js ./

# Carpeta de datos con permisos para el usuario 'node' (no-root)
RUN mkdir -p /data && chown -R node:node /data /app

USER node
ENV DATA_FILE=/data/scores.json PORT=3000
EXPOSE 3000

# Healthcheck simple contra /healthz
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]
