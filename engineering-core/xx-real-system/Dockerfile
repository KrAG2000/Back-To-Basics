FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY backend ./backend
COPY frontend ./frontend
COPY docs ./docs
EXPOSE 4000
CMD ["node", "backend/src/server.js"]
