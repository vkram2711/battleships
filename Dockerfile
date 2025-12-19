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

# Install system dependencies (SWI-Prolog)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        swi-prolog \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code
COPY backend/ ./backend

# Copy built frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Install Python dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

CMD sh -c 'gunicorn --bind 0.0.0.0:${PORT:-5000} app:app'
