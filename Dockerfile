# ── Stage 1: Build the React frontend ────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + serve built frontend ──────────────────
FROM python:3.12-slim
WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy pre-built frontend into a static dir
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8000 8080

CMD ["python", "backend/start.py"]