FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Environment variables will be provided through Docker Compose
ENV NODE_ENV=production
ENV PORT=3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["npm", "start"] 