ARG NODE_VERSION=20.20.2
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 4201
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4201", "--poll", "2000"]
