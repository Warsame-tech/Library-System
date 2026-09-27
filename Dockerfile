FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Auto-logout time (seconds). Set VITE_IDLE_TIMEOUT_SECONDS as a Railway service variable
# to override; Railway passes service variables to the build as build args.
ARG VITE_IDLE_TIMEOUT_SECONDS=300
ENV VITE_IDLE_TIMEOUT_SECONDS=$VITE_IDLE_TIMEOUT_SECONDS
RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=7860
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 7860
CMD ["node", "server/server.js"]