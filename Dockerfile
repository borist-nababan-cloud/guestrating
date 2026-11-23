# ==============================================================================
# Multi-Stage Hardened Non-Root Dockerfile for Zen Guest Rating (Coolify)
# Zero Node.js runtime in production container (Static Vite SPA + Unprivileged Nginx)
# ==============================================================================

# Stage 1: Build static SPA bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Force devDependencies install even if Coolify passes NODE_ENV=production at build time
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm install --include=dev && \
    NODE_ENV=development npm install --no-save @rollup/rollup-linux-x64-musl

# Mandatory & Optional Build-Time Environment Variables (injected by Coolify)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WEBSITE_URL=https://zenfamilyspa.com
ARG VITE_APP_MODE=PROD

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WEBSITE_URL=$VITE_WEBSITE_URL
ENV VITE_APP_MODE=$VITE_APP_MODE

# Validate mandatory env vars without printing secret values to Docker build logs
RUN node -e "if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) { console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build args are required'); process.exit(1); }"

COPY . .
RUN npm run build

# Stage 2: Unprivileged Non-Root Nginx Server (UID 101)
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy hardened Nginx configuration listening on port 8080 (non-root)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static SPA bundle
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
