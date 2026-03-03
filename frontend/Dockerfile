FROM node:20-slim
WORKDIR /app
ARG VITE_API_URL
ARG VITE_API_KEY
ARG NODE_OPTIONS
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV NODE_OPTIONS=${NODE_OPTIONS}
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
