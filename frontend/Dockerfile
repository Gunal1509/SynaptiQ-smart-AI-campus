# Stage 1: Build React/Vite application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy frontend source files
COPY . .

# Pass build environment variables if needed
ARG VITE_NODE_API_URL=""
ARG VITE_PYTHON_API_URL=""
ENV VITE_NODE_API_URL=$VITE_NODE_API_URL
ENV VITE_PYTHON_API_URL=$VITE_PYTHON_API_URL

# Build production bundle
RUN npm run build

# Stage 2: Serve production bundle with Nginx
FROM nginx:alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
