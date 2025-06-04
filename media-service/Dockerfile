FROM --platform=linux/amd64 node:20-alpine
WORKDIR /app
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    python3-dev \
    make \
    g++ \
    build-base \
    ninja \
    meson \
    pkgconfig \
    openssl-dev \
    libuv-dev \
    libsrtp-dev \
    abseil-cpp-dev \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    git \
    cmake \
    autoconf \
    automake \
    libtool

# usrsctp 소스 빌드 및 설치
RUN git clone https://github.com/sctplab/usrsctp.git /tmp/usrsctp \
    && cd /tmp/usrsctp \
    && ./bootstrap \
    && ./configure --prefix=/usr \
    && make \
    && make install \
    && rm -rf /tmp/usrsctp

# Build and install ninja from source (v1.11.1)
RUN apk add --no-cache git cmake g++ make \
    && git clone https://github.com/ninja-build/ninja.git /tmp/ninja \
    && cd /tmp/ninja \
    && git checkout v1.11.1 \
    && cmake -Bbuild-cmake -H. \
    && cmake --build build-cmake \
    && cp build-cmake/ninja /usr/bin/ninja \
    && chmod +x /usr/bin/ninja \
    && ninja --version \
    && rm -rf /tmp/ninja

# 파이썬용 ninja/meson도 명시적으로 설치
RUN pip install --break-system-packages --upgrade pip setuptools ninja meson

COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3005
CMD ["npm", "start"] 