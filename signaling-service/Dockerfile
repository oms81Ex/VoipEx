FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3004
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=12qwaszx
ENV JWT_SECRET=your-super-secret-jwt-key
ENV LOG_LEVEL=info
ENV ALLOWED_ORIGINS=*

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3004/health || exit 1

EXPOSE 3004
CMD ["npm", "start"] 