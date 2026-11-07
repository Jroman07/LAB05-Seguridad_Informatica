FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts
COPY vite.config.mjs auth0.config.json ./
COPY client ./client
RUN npm run build:react

FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --chown=node:node server.js index.html auth0.config.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node libs ./libs
COPY --chown=node:node public ./public
COPY --from=frontend --chown=node:node /app/dist/client ./dist/client
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# El mismo comando Node.js que ejecuta npm start, como PID 1 para vaciar OTLP al detenerse.
CMD ["node", "server.js"]
