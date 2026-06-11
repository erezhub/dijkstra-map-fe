FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_MAP_URL=http://localhost:8080
ARG VITE_USER_URL=http://localhost:8081
ENV VITE_MAP_URL=$VITE_MAP_URL
ENV VITE_USER_URL=$VITE_USER_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
