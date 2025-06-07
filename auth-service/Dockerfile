FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production \
    PORT=3001
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3001/health || exit 1
EXPOSE 3001
CMD ["npm", "start"] 