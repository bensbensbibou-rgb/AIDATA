#!/bin/bash

# Script de gestion Docker pour l'Agent BACnet MCP
# Usage: ./docker-run.sh [commande]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}Script de gestion Docker pour l'Agent BACnet MCP${NC}"
    echo ""
    echo "Usage: $0 [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  dev     - Lancer en mode développement"
    echo "  prod    - Lancer en mode production"
    echo "  build   - Construire l'image Docker"
    echo "  stop    - Arrêter tous les conteneurs"
    echo "  logs    - Afficher les logs"
    echo "  clean   - Nettoyer les conteneurs et volumes"
    echo "  status  - Afficher le statut des conteneurs"
    echo "  shell   - Ouvrir un shell dans le conteneur principal"
    echo "  help    - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 dev     # Lancer en développement"
    echo "  $0 prod    # Lancer en production"
    echo "  $0 logs    # Voir les logs"
}

# Fonction pour vérifier Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas démarré${NC}"
        echo "Veuillez démarrer Docker Desktop"
        exit 1
    fi
}

# Fonction pour lancer en développement
run_dev() {
    echo -e "${BLUE}🚀 Lancement en mode développement...${NC}"
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Services démarrés en mode développement${NC}"
    echo ""
    echo -e "${YELLOW}📱 Interfaces disponibles:${NC}"
    echo "  🌐 Interface web: http://localhost:8000"
    echo "  🖥️  Interface iframe: http://localhost:8000/ui"
    echo "  📚 Documentation API: http://localhost:8000/docs"
    echo "  🔧 n8n: http://localhost:5678"
    echo "  🗄️  Adminer: http://localhost:8081"
    echo "  📊 Redis: localhost:6379"
}

# Fonction pour lancer en production
run_prod() {
    echo -e "${BLUE}🚀 Lancement en mode production...${NC}"
    docker-compose -f docker-compose.prod.yml up -d
    echo -e "${GREEN}✅ Services démarrés en mode production${NC}"
    echo ""
    echo -e "${YELLOW}📱 Interfaces disponibles:${NC}"
    echo "  🌐 Interface web: http://localhost"
    echo "  📊 Grafana: http://localhost:3000"
    echo "  📈 Prometheus: http://localhost:9090"
}

# Fonction pour construire
build() {
    echo -e "${BLUE}🔨 Construction de l'image Docker...${NC}"
    docker-compose build
    echo -e "${GREEN}✅ Image construite avec succès${NC}"
}

# Fonction pour arrêter
stop() {
    echo -e "${YELLOW}🛑 Arrêt des conteneurs...${NC}"
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.prod.yml down
    echo -e "${GREEN}✅ Conteneurs arrêtés${NC}"
}

# Fonction pour les logs
logs() {
    echo -e "${BLUE}📋 Affichage des logs...${NC}"
    docker-compose logs -f
}

# Fonction pour nettoyer
clean() {
    echo -e "${YELLOW}🧹 Nettoyage des conteneurs et volumes...${NC}"
    docker-compose -f docker-compose.yml down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker-compose -f docker-compose.prod.yml down -v
    docker system prune -f
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
}

# Fonction pour le statut
status() {
    echo -e "${BLUE}📊 Statut des conteneurs:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📊 Utilisation des ressources:${NC}"
    docker stats --no-stream
}

# Fonction pour ouvrir un shell
shell() {
    echo -e "${BLUE}🐚 Ouverture d'un shell dans le conteneur...${NC}"
    docker-compose exec bacnet-mcp bash
}

# Vérification de Docker
check_docker

# Gestion des commandes
case "${1:-help}" in
    dev)
        run_dev
        ;;
    prod)
        run_prod
        ;;
    build)
        build
        ;;
    stop)
        stop
        ;;
    logs)
        logs
        ;;
    clean)
        clean
        ;;
    status)
        status
        ;;
    shell)
        shell
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Commande inconnue: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

