# ---------- Base image ----------
FROM python:3.11-slim

# ---------- Environment ----------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ---------- System deps ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- Workdir ----------
WORKDIR /app

# ---------- Python deps ----------
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---------- App code ----------
COPY distech_mcp_server_full.py ./
COPY main.py ./
COPY static ./static

# ---------- Security: non-root ----------
RUN useradd -m appuser
USER appuser

# ---------- Expose port ----------
EXPOSE 8000

# ---------- Healthcheck ----------
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost:8000/ || exit 1

# ---------- Run ----------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]