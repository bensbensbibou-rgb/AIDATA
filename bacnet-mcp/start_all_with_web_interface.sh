#!/bin/bash

echo "========================================"
echo "Démarrage BACnet MCP + n8n + Web + Interface"
echo "========================================"

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "Python n'est pas installé. Veuillez installer Python 3.11+"
    exit 1
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Veuillez installer Node.js 18+"
    exit 1
fi

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé. Veuillez installer Docker"
    exit 1
fi

echo ""
echo "========================================"
echo "1. Démarrage du serveur BACnet MCP..."
echo "========================================"

# Démarrer le serveur BACnet MCP en arrière-plan
source venv/bin/activate
python server.py &
BACNET_PID=$!

# Attendre un peu
sleep 5

echo ""
echo "========================================"
echo "2. Démarrage de n8n..."
echo "========================================"

# Démarrer n8n avec données locales en arrière-plan
export N8N_USER_FOLDER="$(pwd)/n8n-data"
n8n start --port 5678 --user-folder "$(pwd)/n8n-data" &
N8N_PID=$!

# Attendre un peu
sleep 3

echo ""
echo "========================================"
echo "3. Démarrage du serveur web interface..."
echo "========================================"

# Démarrer le serveur web pour les pages statiques
source venv/bin/activate
python serveurWeb.py &
WEB_PID=$!

# Attendre un peu
sleep 3

echo ""
echo "========================================"
echo "4. Démarrage des services web..."
echo "========================================"

# Créer les dossiers nécessaires
mkdir -p monitoring/prometheus monitoring/grafana monitoring/nginx

# Copier les fichiers de configuration
cp prometheus_bacnet.yml monitoring/prometheus/prometheus.yml 2>/dev/null || true
cp nginx_bacnet.conf monitoring/nginx/nginx.conf 2>/dev/null || true

# Arrêter les conteneurs existants
docker rm -f prometheus-monitoring grafana-dashboard nginx-proxy 2>/dev/null || true

# Démarrer Prometheus
echo "Démarrage de Prometheus..."
docker run -d --name prometheus-monitoring -p 9090:9090 \
    -v "$(pwd)/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml" \
    prom/prometheus:latest

# Attendre un peu
sleep 3

# Démarrer Grafana
echo "Démarrage de Grafana..."
docker run -d --name grafana-dashboard -p 3000:3000 \
    -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
    grafana/grafana:latest

# Attendre un peu
sleep 3

# Démarrer Nginx
echo "Démarrage de Nginx..."
docker run -d --name nginx-proxy -p 80:80 \
    -v "$(pwd)/monitoring/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    nginx:alpine

echo ""
echo "========================================"
echo "Tous les services démarrés avec succès!"
echo "========================================"
echo ""
echo "Serveur BACnet MCP: http://localhost:8050"
echo "Interface n8n: http://localhost:5678"
echo "Interface Web BACnet: http://localhost:8080"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin123)"
echo "Nginx: http://localhost:80"
echo ""
echo "Applications Web:"
echo "- Chat AI 24/7: http://localhost:8080/static/app.html"
echo "- Interface BACnet: http://localhost:8080/static/app1.html"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "Arrêt des services..."
    kill $BACNET_PID $N8N_PID $WEB_PID 2>/dev/null || true
    docker rm -f prometheus-monitoring grafana-dashboard nginx-proxy 2>/dev/null || true
    echo "Services arrêtés."
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

echo "Appuyez sur Ctrl+C pour arrêter tous les services..."
echo ""

# Attendre indéfiniment
wait
