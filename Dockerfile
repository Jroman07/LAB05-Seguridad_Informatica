FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --chown=node:node server.js index.html ./
COPY --chown=node:node libs ./libs
COPY --chown=node:node public ./public
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# El mismo comando Node.js que ejecuta npm start, como PID 1 para vaciar OTLP al detenerse.
CMD ["node", "server.js"]
