# Dockerfile pour BACnet MCP Server optimisé
FROM python:3.11-slim

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY requirements.txt .

# Installation des dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copie des fichiers de l'application
COPY server.py .
COPY decode.py .

# Exposition du port
EXPOSE 8050

# Variables d'environnement pour la stabilité MCP
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV MCP_SESSION_TIMEOUT=300
ENV MCP_MAX_SESSIONS=100
ENV PYTHONHASHSEED=random

# Commande de démarrage avec gestion d'erreurs
CMD ["python", "-u", "server.py"]
