#!/bin/bash

echo "========================================"
echo "Demarrage BACnet MCP + n8n + Web - Local"
echo "========================================"

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "Python3 n'est pas installe. Veuillez installer Python 3.11+"
    exit 1
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installe. Veuillez installer Node.js 18+ depuis https://nodejs.org"
    exit 1
fi

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installe. Veuillez installer Docker depuis https://docker.com"
    exit 1
fi

echo ""
echo "========================================"
echo "1. Demarrage du serveur BACnet MCP..."
echo "========================================"

# Activer l'environnement virtuel et démarrer le serveur BACnet
source venv/bin/activate
python server.py &
BACNET_PID=$!

# Attendre un peu pour que le serveur démarre
sleep 5

echo ""
echo "========================================"
echo "2. Demarrage de n8n..."
echo "========================================"

# Démarrer n8n
n8n start --port 5678 &
N8N_PID=$!

# Attendre un peu
sleep 3

echo ""
echo "========================================"
echo "3. Demarrage des services web..."
echo "========================================"

# Créer les dossiers nécessaires
mkdir -p monitoring/prometheus monitoring/grafana monitoring/nginx

# Copier les fichiers de configuration
cp prometheus.yml monitoring/prometheus/prometheus.yml 2>/dev/null || true
cp nginx.conf monitoring/nginx/nginx.conf 2>/dev/null || true

# Démarrer Prometheus
echo "Demarrage de Prometheus..."
docker run -d --name prometheus-monitoring \
    -p 9090:9090 \
    -v $(pwd)/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus:latest

# Attendre un peu
sleep 3

# Démarrer Grafana
echo "Demarrage de Grafana..."
docker run -d --name grafana-dashboard \
    -p 3000:3000 \
    -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
    grafana/grafana:latest

# Attendre un peu
sleep 3

# Démarrer Nginx
echo "Demarrage de Nginx..."
docker run -d --name nginx-proxy \
    -p 80:80 \
    -p 443:443 \
    -v $(pwd)/monitoring/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
    nginx:alpine

echo ""
echo "========================================"
echo "Tous les services demarres avec succes!"
echo "========================================"
echo ""
echo "Serveur BACnet MCP: http://localhost:8050"
echo "Interface n8n: http://localhost:5678"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin123)"
echo "Nginx: http://localhost:80"
echo ""
echo "Appuyez sur Ctrl+C pour arreter tous les services"
echo ""

# Fonction pour arrêter proprement les services
cleanup() {
    echo ""
    echo "Arret des services..."
    kill $BACNET_PID 2>/dev/null
    kill $N8N_PID 2>/dev/null
    docker stop prometheus-monitoring grafana-dashboard nginx-proxy 2>/dev/null
    docker rm prometheus-monitoring grafana-dashboard nginx-proxy 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
wait
