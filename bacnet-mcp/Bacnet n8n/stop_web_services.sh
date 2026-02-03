#!/bin/bash

echo "========================================"
echo "Arret des Services Web - Linux"
echo "========================================"

echo "Arret de Prometheus..."
docker stop prometheus-monitoring 2>/dev/null
docker rm prometheus-monitoring 2>/dev/null

echo "Arret de Grafana..."
docker stop grafana-dashboard 2>/dev/null
docker rm grafana-dashboard 2>/dev/null

echo "Arret de Nginx..."
docker stop nginx-proxy 2>/dev/null
docker rm nginx-proxy 2>/dev/null

echo ""
echo "========================================"
echo "Services web arretes avec succes!"
echo "========================================"
echo ""
echo "Pour redemarrer les services web:"
echo "./install_web_components.sh"
echo ""
