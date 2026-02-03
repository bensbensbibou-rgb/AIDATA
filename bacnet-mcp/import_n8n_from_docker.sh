#!/bin/bash

echo "========================================"
echo "Import des données n8n depuis Docker"
echo "========================================"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé. Veuillez installer Docker"
    exit 1
fi

echo ""
echo "Cette opération va:"
echo "1. Copier les données n8n depuis le conteneur Docker"
echo "2. Les placer dans le dossier local n8n-data"
echo "3. Permettre à n8n local d'utiliser ces données"
echo ""

read -p "Voulez-vous continuer? (o/n): " confirm
if [[ ! $confirm =~ ^[Oo]$ ]]; then
    echo "Opération annulée."
    exit 0
fi

echo ""
echo "========================================"
echo "1. Recherche du conteneur n8n Docker..."
echo "========================================"

# Chercher le conteneur n8n
if ! docker ps -a | grep -q n8n; then
    echo "Aucun conteneur n8n trouvé."
    echo "Veuillez d'abord démarrer n8n dans Docker."
    exit 1
fi

echo ""
echo "========================================"
echo "2. Copie des données depuis Docker..."
echo "========================================"

# Créer le dossier de destination s'il n'existe pas
mkdir -p n8n-data

# Copier les données depuis le conteneur Docker
echo "Copie des workflows..."
if ! docker cp n8n:/home/node/.n8n/workflows.json n8n-data/ 2>/dev/null; then
    echo "Aucun workflow trouvé dans le conteneur Docker."
fi

echo "Copie des credentials..."
if ! docker cp n8n:/home/node/.n8n/credentials.json n8n-data/ 2>/dev/null; then
    echo "Aucun credential trouvé dans le conteneur Docker."
fi

echo "Copie de la base de données..."
if ! docker cp n8n:/home/node/.n8n/database.sqlite n8n-data/ 2>/dev/null; then
    echo "Aucune base de données trouvée dans le conteneur Docker."
fi

echo ""
echo "========================================"
echo "3. Vérification des fichiers copiés..."
echo "========================================"

echo "Fichiers dans n8n-data:"
ls -la n8n-data/*.json 2>/dev/null || echo "Aucun fichier JSON trouvé"
ls -la n8n-data/*.sqlite 2>/dev/null || echo "Aucun fichier SQLite trouvé"

echo ""
echo "========================================"
echo "Import terminé!"
echo "========================================"
echo ""
echo "Pour utiliser n8n avec ces données:"
echo "1. Utilisez ./start_n8n_local.sh"
echo "2. Ou ./start_all_with_web_interface.sh"
echo ""
echo "Interface n8n: http://localhost:5678"
echo ""
