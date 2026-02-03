#!/bin/bash

echo "========================================"
echo "Installation des Composants Web - Linux"
echo "========================================"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installe. Veuillez installer Docker depuis https://docker.com"
    exit 1
fi

echo "Docker detecte:"
docker --version

echo ""
echo "========================================"
echo "Installation des composants web..."
echo "========================================"

# Créer les dossiers nécessaires
mkdir -p monitoring/prometheus monitoring/grafana monitoring/nginx

# Copier les fichiers de configuration
cp prometheus.yml monitoring/prometheus/prometheus.yml
cp nginx.conf monitoring/nginx/nginx.conf

echo ""
echo "========================================"
echo "Demarrage des services web..."
echo "========================================"

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
echo "Services web demarres avec succes!"
echo "========================================"
echo ""
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin123)"
echo "Nginx: http://localhost:80"
echo ""
echo "Pour voir les logs:"
echo "docker logs prometheus-monitoring"
echo "docker logs grafana-dashboard"
echo "docker logs nginx-proxy"
echo ""
