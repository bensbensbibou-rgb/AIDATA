#!/bin/bash

echo "========================================"
echo "Demarrage BACnet MCP + n8n - Local"
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

echo ""
echo "========================================"
echo "Services demarres avec succes!"
echo "========================================"
echo ""
echo "Serveur BACnet MCP: http://localhost:8050"
echo "Interface n8n: http://localhost:5678"
echo ""
echo "Appuyez sur Ctrl+C pour arreter tous les services"
echo ""

# Fonction pour arrêter proprement les services
cleanup() {
    echo ""
    echo "Arret des services..."
    kill $BACNET_PID
    kill $N8N_PID
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
wait
