
FROM python:3.11-slim



ENV PYTHONDONTWRITEBYTECODE=1 \

    PYTHONUNBUFFERED=1 \

    PYTHONHASHSEED=random \

    PYTHONPATH=/app \

    MCP_SESSION_TIMEOUT=300 \

    MCP_MAX_SESSIONS=100



RUN apt-get update && apt-get install -y --no-install-recommends \

    build-essential iproute2 net-tools curl git \

 && rm -rf /var/lib/apt/lists/*



WORKDIR /app



COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt



COPY . .



# Si server.py expose app = FastAPI(...), on préfèrera uvicorn via le compose (voir ci-dessous).

# Sinon, ce CMD lance directement server.py :

CMD ["python", "-u", "server.py"]

