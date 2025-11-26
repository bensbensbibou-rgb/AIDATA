#!/bin/bash
# Script de déploiement automatique sur Raspberry Pi
# Usage: ./deploy-to-raspberry.sh [IP_RASPBERRY] [USER]

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RASPBERRY_IP="${1:-192.168.1.100}"  # IP par défaut
RASPBERRY_USER="${2:-pi}"           # Utilisateur par défaut
REMOTE_DIR="/home/$RASPBERRY_USER/dashboard-ai"
PROJECT_NAME="dashboard-ai"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Déploiement Dashboard AI sur Raspberry Pi${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "IP Raspberry: ${YELLOW}$RASPBERRY_IP${NC}"
echo -e "Utilisateur: ${YELLOW}$RASPBERRY_USER${NC}"
echo -e "Répertoire distant: ${YELLOW}$REMOTE_DIR${NC}"
echo ""

# Vérifier la connexion SSH
echo -e "${YELLOW}[1/7] Vérification de la connexion SSH...${NC}"
if ! ssh -o ConnectTimeout=5 "$RASPBERRY_USER@$RASPBERRY_IP" "echo 'Connexion OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Impossible de se connecter au Raspberry Pi${NC}"
    echo -e "${YELLOW}Vérifiez:${NC}"
    echo "  - L'adresse IP est correcte"
    echo "  - Le Raspberry Pi est allumé et connecté au réseau"
    echo "  - SSH est activé sur le Raspberry Pi"
    echo ""
    echo "Pour activer SSH: sudo raspi-config -> Interface Options -> SSH"
    exit 1
fi
echo -e "${GREEN}✓ Connexion SSH établie${NC}"

# Créer le répertoire distant
echo -e "${YELLOW}[2/7] Création du répertoire sur le Raspberry Pi...${NC}"
ssh "$RASPBERRY_USER@$RASPBERRY_IP" "mkdir -p $REMOTE_DIR"
echo -e "${GREEN}✓ Répertoire créé${NC}"

# Créer une archive du projet (exclure node_modules, dist, etc.)
echo -e "${YELLOW}[3/7] Création de l'archive du projet...${NC}"
ARCHIVE_NAME="dashboard-ai-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.vscode' \
    --exclude='distech_mcp_server_full/.venv' \
    --exclude='distech_mcp_server_full/__pycache__' \
    --exclude='mqtt-mcp-main' \
    .

echo -e "${GREEN}✓ Archive créée: $ARCHIVE_NAME${NC}"

# Transférer l'archive
echo -e "${YELLOW}[4/7] Transfert de l'archive vers le Raspberry Pi...${NC}"
echo -e "${YELLOW}Cela peut prendre quelques minutes...${NC}"
scp "$ARCHIVE_NAME" "$RASPBERRY_USER@$RASPBERRY_IP:$REMOTE_DIR/"
echo -e "${GREEN}✓ Transfert terminé${NC}"

# Nettoyer l'archive locale
rm "$ARCHIVE_NAME"

# Extraire l'archive sur le Raspberry Pi
echo -e "${YELLOW}[5/7] Extraction de l'archive sur le Raspberry Pi...${NC}"
ssh "$RASPBERRY_USER@$RASPBERRY_IP" "cd $REMOTE_DIR && tar -xzf $ARCHIVE_NAME && rm $ARCHIVE_NAME"
echo -e "${GREEN}✓ Extraction terminée${NC}"

# Vérifier et installer Docker si nécessaire
echo -e "${YELLOW}[6/7] Vérification de Docker...${NC}"
ssh "$RASPBERRY_USER@$RASPBERRY_IP" << 'ENDSSH'
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé. Installation en cours..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker installé avec succès"
else
    echo "Docker est déjà installé"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose n'est pas installé. Installation en cours..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
    echo "Docker Compose installé avec succès"
else
    echo "Docker Compose est déjà installé"
fi
ENDSSH
echo -e "${GREEN}✓ Docker vérifié/installé${NC}"

# Déployer l'application
echo -e "${YELLOW}[7/7] Déploiement de l'application...${NC}"
ssh "$RASPBERRY_USER@$RASPBERRY_IP" << ENDSSH
cd $REMOTE_DIR

# Arrêter les conteneurs existants
if [ -f docker-compose.yml ]; then
    echo "Arrêt des conteneurs existants..."
    docker-compose down 2>/dev/null || true
fi

# Build et démarrage
echo "Build des images Docker (cela peut prendre 10-15 minutes)..."
docker-compose build

echo "Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 10

# Vérifier l'état
echo ""
echo "========================================="
echo "État des services:"
echo "========================================="
docker-compose ps

echo ""
echo "========================================="
echo "Logs récents:"
echo "========================================="
docker-compose logs --tail=20
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Déploiement terminé avec succès !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Accès à l'application:${NC}"
echo -e "  http://$RASPBERRY_IP:3007"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo -e "  Voir les logs:     ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd $REMOTE_DIR && docker-compose logs -f'"
echo -e "  Redémarrer:        ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd $REMOTE_DIR && docker-compose restart'"
echo -e "  Arrêter:           ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd $REMOTE_DIR && docker-compose down'"
echo ""
