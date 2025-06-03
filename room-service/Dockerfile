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
ENV PORT=3006
ENV BASE_URL=http://localhost
ENV MONGODB_URL=mongodb://admin:12qwaszx@mongodb:27017/voip_rooms?authSource=admin
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=12qwaszx
ENV LOG_LEVEL=info

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3006/health || exit 1

EXPOSE 3006
CMD ["npm", "start"] 