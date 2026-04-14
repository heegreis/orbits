# syntax=docker/dockerfile:1.7

# ── Stage 1: Build the Quasar SPA ───────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock quasar.config.ts index.html ./
RUN corepack enable && corepack yarn install --immutable || corepack yarn install --frozen-lockfile
COPY . .
RUN corepack yarn quasar build

# ── Stage 2: Runtime with Nginx ────────────────────────────────────
FROM debian:bookworm-slim AS runtime

ENV GATEWAY_URL=http://127.0.0.1:42617

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        nginx \
        gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
