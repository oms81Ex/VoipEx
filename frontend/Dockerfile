FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Environment variables will be replaced at runtime
ENV VITE_API_URL=http://localhost:3001/api
ENV VITE_SIGNALING_URL=http://localhost:3004
ENV VITE_TURN_SERVER=turn:your-turn-server.com:3478
ENV VITE_TURN_USERNAME=username
ENV VITE_TURN_CREDENTIAL=password

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 