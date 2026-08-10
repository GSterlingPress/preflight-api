FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY README.md ./
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node","src/server.js"]
