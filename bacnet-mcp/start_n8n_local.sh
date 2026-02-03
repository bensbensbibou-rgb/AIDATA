#!/bin/bash

echo "========================================"
echo "Démarrage n8n avec données locales"
echo "========================================"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Veuillez installer Node.js 18+"
    exit 1
fi

echo ""
echo "Configuration n8n:"
echo "- Dossier de données: $(pwd)/n8n-data"
echo "- Port: 5678"
echo "- Interface: http://localhost:5678"
echo ""

# Démarrer n8n avec le dossier de données local
export N8N_USER_FOLDER="$(pwd)/n8n-data"
echo "Dossier n8n: $N8N_USER_FOLDER"

echo ""
echo "Démarrage de n8n..."
n8n start --port 5678 --user-folder "$(pwd)/n8n-data"
