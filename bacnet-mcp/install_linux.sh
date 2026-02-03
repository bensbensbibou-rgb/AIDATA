#!/bin/bash

echo "========================================"
echo "Installation BACnet MCP Server - Linux"
echo "========================================"

# Détecter la distribution
if [ -f /etc/debian_version ]; then
    DISTRO="debian"
    echo "Distribution Debian/Ubuntu detectee"
elif [ -f /etc/redhat-release ]; then
    DISTRO="redhat"
    echo "Distribution RedHat/CentOS detectee"
elif [ -f /etc/arch-release ]; then
    DISTRO="arch"
    echo "Distribution Arch Linux detectee"
else
    DISTRO="unknown"
    echo "Distribution non reconnue, tentative d'installation generique"
fi

# Installer les dépendances système selon la distribution
echo ""
echo "Installation des dependances systeme..."

case $DISTRO in
    "debian")
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip python3-venv curl git build-essential
        ;;
    "redhat")
        sudo yum update -y
        sudo yum install -y python3 python3-pip python3-venv curl git gcc
        ;;
    "arch")
        sudo pacman -Syu --noconfirm
        sudo pacman -S --noconfirm python python-pip curl git base-devel
        ;;
    *)
        echo "Veuillez installer manuellement: python3, python3-pip, python3-venv, curl, git"
        ;;
esac

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "Python3 n'est pas installe. Installation echouee."
    exit 1
fi

echo "Python detecte:"
python3 --version

# Créer un environnement virtuel
echo ""
echo "Creation de l'environnement virtuel..."
python3 -m venv venv

# Activer l'environnement virtuel
echo ""
echo "Activation de l'environnement virtuel..."
source venv/bin/activate

# Mettre à jour pip
echo ""
echo "Mise a jour de pip..."
pip install --upgrade pip

# Installer les dépendances Python
echo ""
echo "Installation des dependances Python..."
pip install -r requirements.txt

# Créer les dossiers nécessaires
echo ""
echo "Creation des dossiers..."
mkdir -p data static logs

# Copier le fichier de configuration exemple
echo ""
echo "Configuration..."
if [ ! -f ".env" ]; then
    cp config.env.example .env
    echo "Fichier .env cree. Veuillez le configurer selon vos besoins."
fi

# Rendre le script de démarrage exécutable
chmod +x start.sh

echo ""
echo "========================================"
echo "Installation terminee avec succes!"
echo "========================================"
echo ""
echo "Pour demarrer le serveur:"
echo "1. Activez l'environnement virtuel: source venv/bin/activate"
echo "2. Lancez le serveur: python server.py"
echo "   Ou utilisez le script: ./start.sh"
echo ""
echo "Interface web: http://localhost:8050"
echo "Serveur MCP: http://localhost:8050/mcp/"
echo ""
