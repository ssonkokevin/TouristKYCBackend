FROM node:20-alpine AS builder
RUN apk add --no-cache openssl openssl1.1-compat
WORKDIR /app

COPY package*.json ./
COPY src/prisma ./src/prisma
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl openssl1.1-compat
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma

RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "dist/server.js"]
