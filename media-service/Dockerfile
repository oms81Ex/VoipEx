FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    git \
    gcc \
    musl-dev \
    linux-headers \
    eudev-dev \
    && ln -sf python3 /usr/bin/python

# Install dependencies with mediasoup build flags
COPY package*.json ./
ENV MEDIASOUP_BYPASS_WORKAROUND=true
RUN npm ci --build-from-source

# Copy source code
COPY . .

# Create media and logs directories
RUN mkdir -p media/recordings logs

# Environment variables will be provided through Docker Compose
ENV NODE_ENV=production
ENV PORT=3004

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3004/health || exit 1

EXPOSE 3004
CMD ["npm", "start"] 