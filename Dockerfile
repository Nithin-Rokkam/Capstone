# Builder stage
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements-prod.txt requirements.txt
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --retries 10 --timeout 120 -r requirements.txt

# Production stage
FROM python:3.10-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only necessary application files
COPY src/ ./src/
COPY main.py .
COPY download_data.py .  

# Expose port 8080
EXPOSE 8080

# Download data at container startup, then run the app
CMD ["sh", "-c", "python download_data.py && uvicorn src.main:app --host=0.0.0.0 --port=8080"]