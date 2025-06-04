FROM --platform=linux/amd64 node:20-bullseye-slim

WORKDIR /app

# Install system dependencies
RUN echo "AMD64_DEBUG: Starting system package installation..." && \
    apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    make \
    g++ \
    build-essential \
    ninja-build \
    pkg-config \
    openssl \
    libssl-dev \
    libuv1-dev \
    libsrtp2-dev \
    libabsl-dev \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    git \
    cmake \
    autoconf \
    automake \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN echo "AMD64_DEBUG: Python version check..." && \
    python3 --version && \
    pip3 --version && \
    echo "AMD64_DEBUG: Installing meson and ninja..." && \
    pip3 install --no-cache-dir -v \
    meson==1.5.0 \
    ninja==1.10.2.4 \
    setuptools \
    wheel

# Verify build tools
RUN echo "AMD64_DEBUG: Verifying build tools..." && \
    echo "  - Meson version: $(meson --version)" && \
    echo "  - Ninja version: $(ninja --version)"

# Set environment variables
ENV NODE_ENV=development \
    PORT=3005 \
    MEDIASOUP_SKIP_WORKER_PREBUILT_DOWNLOAD=false \
    MEDIASOUP_FORCE_WORKER_REBUILD=false \
    PYTHON=/usr/bin/python3

# Install nodemon globally
RUN npm install -g nodemon

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create recordings directory
RUN mkdir -p /recordings

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3005/health || exit 1

EXPOSE 3005
CMD ["npm", "run", "dev"]