FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app

# Install build dependencies and nodemon globally
RUN npm install -g nodemon

# Install all dependencies including devDependencies
COPY package*.json ./
RUN npm install

COPY . .

# Environment variables
ENV NODE_ENV=development \
    PORT=3002

EXPOSE 3002
CMD ["npm", "run", "dev"] 