#!/bin/bash

echo "========================================"
echo "Demarrage de n8n - Automatisation BACnet"
echo "========================================"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installe. Veuillez installer Node.js 18+ depuis https://nodejs.org"
    exit 1
fi

echo "Node.js detecte:"
node --version

# Vérifier si n8n est installé
if ! command -v n8n &> /dev/null; then
    echo "n8n n'est pas installe. Installation en cours..."
    npm install -g n8n
fi

echo "n8n detecte:"
n8n --version

echo ""
echo "Demarrage de n8n..."
echo "Interface n8n: http://localhost:5678"
echo "Webhook URL: http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat"
echo ""
echo "Appuyez sur Ctrl+C pour arreter n8n"
echo ""

# Démarrer n8n
n8n start --port 5678
