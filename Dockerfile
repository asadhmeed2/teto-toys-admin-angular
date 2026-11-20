# syntax=docker/dockerfile:1
# Build the production bundle, then serve it as static files — never ship the Angular dev server.
FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Unprivileged nginx: runs as uid 101, listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/admin-teto-toys/browser /usr/share/nginx/html
EXPOSE 8080
