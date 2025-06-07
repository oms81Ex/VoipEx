FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g nodemon
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=development \
    PORT=3004
EXPOSE 3004
EXPOSE 3004/udp
CMD ["npm", "run", "dev"] 