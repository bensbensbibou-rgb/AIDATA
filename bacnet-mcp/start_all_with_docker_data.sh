#!/bin/bash

echo "========================================"
echo "Démarrage BACnet MCP + n8n (Docker Data) + Web Interface"
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

echo ""
echo "========================================"
echo "1. Démarrage du serveur BACnet MCP..."
echo "========================================"

# Activer l'environnement virtuel et démarrer le serveur BACnet
source venv/bin/activate
python server.py &
BACNET_PID=$!

# Attendre un peu pour que le serveur démarre
sleep 5

echo ""
echo "========================================"
echo "2. Démarrage de n8n (avec données Docker)..."
echo "========================================"

# Démarrer n8n avec les données importées depuis Docker
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
python serveurWeb.py &
WEB_PID=$!

# Attendre un peu
sleep 3

echo ""
echo "========================================"
echo "Tous les services démarrés avec succès!"
echo "========================================"
echo ""
echo "Serveur BACnet MCP: http://localhost:8050"
echo "Interface n8n (Docker Data): http://localhost:5678"
echo "Interface Web BACnet: http://localhost:8080"
echo ""
echo "Applications Web:"
echo "- Chat AI 24/7: http://localhost:8080/static/app.html"
echo "- Interface BACnet: http://localhost:8080/static/app1.html"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "Arrêt des services..."
    kill $BACNET_PID $N8N_PID $WEB_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

echo "Services en cours d'exécution. Appuyez sur Ctrl+C pour arrêter."
echo ""

# Attendre indéfiniment
wait
