# ----------- Stage 1: Build React frontend -----------
FROM --platform=linux/amd64 node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend code and build
COPY frontend/ ./
RUN npm run build

# ----------- Stage 2: Build Flask + Prolog backend -----------
FROM --platform=linux/amd64 python:3.12-slim
WORKDIR /app

# Copy backend code
COPY backend/ ./backend

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Install Python dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 5000

# Run server (JSON form recommended)
CMD sh -c 'gunicorn --bind 0.0.0.0:${PORT:-5000} app:app'