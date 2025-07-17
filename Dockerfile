# Multi-stage build for faster builds
FROM python:3.10-slim AS builder

# Set working directory
WORKDIR /app

# Install only essential build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements-prod.txt requirements.txt

# Install Python dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --retries 10 --timeout 120 -r requirements.txt

# Production stage
FROM python:3.10-slim

# Set working directory 
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only necessary application files
COPY src/ ./src/
COPY data/ ./data/
COPY main.py .

# Expose port 8080 (Cloud Run expects this)
EXPOSE 8080

# Start FastAPI with uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"] 