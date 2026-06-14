# ====================================================================
# STAGE 1: BUILD ENGINE (Vite compilation & CJS Server bundler)
# ====================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install package manifests
COPY package*.json ./

# Install compilation dependencies
RUN npm ci

# Copy full application codebase
COPY . .

# Build the client-side files and compile the Express server into dist/server.cjs
RUN npm run build

# ====================================================================
# STAGE 2: RUNTIME ENGINE (Safe, lightweight, minimal execution, scale-to-zero ready)
# ====================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run standard configuration ingress)
EXPOSE 8080

# Copy node-modules and necessary metadata
COPY package*.json ./

# Only install production dependencies to keep the image super lightweight
RUN npm ci --only=production

# Copy built code from builder step
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/eval_dataset.json ./eval_dataset.json

# Launch the compiled stand-alone CommonJS Express server using Native Node.js
CMD ["node", "dist/server.cjs"]
