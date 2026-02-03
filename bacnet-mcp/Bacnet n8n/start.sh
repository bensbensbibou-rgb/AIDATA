#!/bin/bash

echo "========================================"
echo "Demarrage du serveur BACnet MCP"
echo "========================================"

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "Environnement virtuel non trouve. Lancez d'abord install_linux.sh"
    exit 1
fi

# Activer l'environnement virtuel
echo "Activation de l'environnement virtuel..."
source venv/bin/activate

# Vérifier si les dépendances sont installées
if ! python -c "import fastapi, fastmcp, bacpypes3" 2>/dev/null; then
    echo "Dependances manquantes. Installation..."
    pip install -r requirements.txt
fi

# Créer les dossiers s'ils n'existent pas
mkdir -p data static logs

echo ""
echo "Demarrage du serveur..."
echo "Interface web: http://localhost:8050"
echo "Serveur MCP: http://localhost:8050/mcp/"
echo "Documentation: http://localhost:8050/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arreter le serveur"
echo ""

# Lancer le serveur
python server.py
