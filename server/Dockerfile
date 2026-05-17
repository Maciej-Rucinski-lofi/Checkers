FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm install typescript tsx

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
