FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Environment variables
ENV NODE_ENV=production \
    PORT=3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"] 