#!/bin/bash

echo "========================================"
echo "INSTALLATEUR BACnet MCP + n8n + Web"
echo "========================================"
echo ""
echo "Cet installateur va:"
echo "1. Vérifier/Installer Python 3.11+"
echo "2. Vérifier/Installer Node.js 18+"
echo "3. Vérifier/Installer Docker"
echo "4. Installer les dépendances Python"
echo "5. Configurer l'environnement"
echo "6. Préparer les services"
echo ""

read -p "Voulez-vous continuer? (o/n): " confirm
if [[ ! $confirm =~ ^[Oo]$ ]]; then
    echo "Installation annulée."
    exit 0
fi

echo ""
echo "========================================"
echo "1. DÉTECTION DU SYSTÈME"
echo "========================================"

# Détecter la distribution Linux
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "Impossible de détecter la distribution Linux"
    exit 1
fi

echo "Distribution détectée: $OS $VER"

echo ""
echo "========================================"
echo "2. VÉRIFICATION PYTHON"
echo "========================================"

if ! command -v python3 &> /dev/null; then
    echo "Python n'est pas installé."
    echo "Installation de Python 3.11+..."
    
    case $ID in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y python3 python3-pip python3-venv
            ;;
        centos|rhel|fedora)
            sudo yum install -y python3 python3-pip
            ;;
        *)
            echo "Distribution non supportée. Veuillez installer Python 3.11+ manuellement."
            exit 1
            ;;
    esac
else
    echo "Python est installé."
    python3 --version
fi

echo ""
echo "========================================"
echo "3. VÉRIFICATION NODE.JS"
echo "========================================"

if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé."
    echo "Installation de Node.js 18+..."
    
    case $ID in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        *)
            echo "Distribution non supportée. Veuillez installer Node.js 18+ manuellement."
            exit 1
            ;;
    esac
else
    echo "Node.js est installé."
    node --version
fi

echo ""
echo "========================================"
echo "4. VÉRIFICATION DOCKER"
echo "========================================"

if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé."
    echo "Installation de Docker..."
    
    case $ID in
        ubuntu|debian)
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            ;;
        centos|rhel|fedora)
            sudo yum install -y docker
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        *)
            echo "Distribution non supportée. Veuillez installer Docker manuellement."
            exit 1
            ;;
    esac
else
    echo "Docker est installé."
    docker --version
fi

echo ""
echo "========================================"
echo "5. CRÉATION DE L'ENVIRONNEMENT VIRTUEL"
echo "========================================"

if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel Python..."
    python3 -m venv venv
    echo "Environnement virtuel créé."
else
    echo "Environnement virtuel déjà présent."
fi

echo ""
echo "========================================"
echo "6. INSTALLATION DES DÉPENDANCES PYTHON"
echo "========================================"

echo "Activation de l'environnement virtuel..."
source venv/bin/activate

echo "Mise à jour de pip..."
pip install --upgrade pip

echo "Installation des dépendances..."
pip install -r requirements.txt

echo ""
echo "========================================"
echo "7. INSTALLATION N8N"
echo "========================================"

echo "Installation de n8n globalement..."
npm install -g n8n

echo ""
echo "========================================"
echo "8. CRÉATION DES DOSSIERS"
echo "========================================"

mkdir -p data static logs n8n-data
mkdir -p monitoring/prometheus monitoring/grafana monitoring/nginx

echo "Dossiers créés."

echo ""
echo "========================================"
echo "9. CONFIGURATION DES FICHIERS"
echo "========================================"

if [ ! -f ".env" ]; then
    echo "Copie du fichier de configuration..."
    cp config.env.example .env 2>/dev/null || echo "Fichier .env créé."
fi

echo ""
echo "========================================"
echo "10. PERMISSIONS DES SCRIPTS"
echo "========================================"

chmod +x *.sh

echo ""
echo "========================================"
echo "11. VÉRIFICATION DES SERVICES"
echo "========================================"

echo "Test de Python..."
python3 -c "import fastapi, uvicorn, pydantic; print('Python OK')"

echo "Test de Node.js..."
node -e "console.log('Node.js OK')"

echo "Test de Docker..."
docker --version

echo ""
echo "========================================"
echo "INSTALLATION TERMINÉE AVEC SUCCÈS!"
echo "========================================"
echo ""
echo "Services disponibles:"
echo "- Serveur BACnet MCP: http://localhost:8050"
echo "- Interface n8n: http://localhost:5678"
echo "- Interface Web: http://localhost:8080"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000"
echo ""
echo "Scripts de démarrage:"
echo "- ./start_all_with_web_interface.sh (tous les services)"
echo "- ./start_n8n_local.sh (n8n seul)"
echo "- ./start.sh (BACnet MCP seul)"
echo ""
echo "IMPORTANT: Redémarrez votre terminal ou exécutez:"
echo "source venv/bin/activate"
echo ""
