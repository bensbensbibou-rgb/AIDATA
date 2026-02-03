# Script de gestion Docker pour l'Agent BACnet MCP (PowerShell)
# Usage: .\docker-run.ps1 [commande]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Fonction d'aide
function Show-Help {
    Write-Host "Script de gestion Docker pour l'Agent BACnet MCP" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\docker-run.ps1 [commande]"
    Write-Host ""
    Write-Host "Commandes disponibles:"
    Write-Host "  dev     - Lancer en mode développement"
    Write-Host "  prod    - Lancer en mode production"
    Write-Host "  build   - Construire l'image Docker"
    Write-Host "  stop    - Arrêter tous les conteneurs"
    Write-Host "  logs    - Afficher les logs"
    Write-Host "  clean   - Nettoyer les conteneurs et volumes"
    Write-Host "  status  - Afficher le statut des conteneurs"
    Write-Host "  shell   - Ouvrir un shell dans le conteneur principal"
    Write-Host "  help    - Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\docker-run.ps1 dev     # Lancer en développement"
    Write-Host "  .\docker-run.ps1 prod    # Lancer en production"
    Write-Host "  .\docker-run.ps1 logs    # Voir les logs"
}

# Fonction pour vérifier Docker
function Test-Docker {
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Host "❌ Docker n'est pas installé" -ForegroundColor Red
        exit 1
    }
    
    try {
        docker info | Out-Null
    }
    catch {
        Write-Host "❌ Docker n'est pas démarré" -ForegroundColor Red
        Write-Host "Veuillez démarrer Docker Desktop"
        exit 1
    }
}

# Fonction pour lancer en développement
function Start-Dev {
    Write-Host "🚀 Lancement en mode développement..." -ForegroundColor Blue
    docker-compose -f docker-compose.dev.yml up -d
    Write-Host "✅ Services démarrés en mode développement" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Interfaces disponibles:" -ForegroundColor Yellow
    Write-Host "  🌐 Interface web: http://localhost:8000"
    Write-Host "  🖥️  Interface iframe: http://localhost:8000/ui"
    Write-Host "  📚 Documentation API: http://localhost:8000/docs"
    Write-Host "  🔧 n8n: http://localhost:5678"
    Write-Host "  🗄️  Adminer: http://localhost:8081"
    Write-Host "  📊 Redis: localhost:6379"
}

# Fonction pour lancer en production
function Start-Prod {
    Write-Host "🚀 Lancement en mode production..." -ForegroundColor Blue
    docker-compose -f docker-compose.prod.yml up -d
    Write-Host "✅ Services démarrés en mode production" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Interfaces disponibles:" -ForegroundColor Yellow
    Write-Host "  🌐 Interface web: http://localhost"
    Write-Host "  📊 Grafana: http://localhost:3000"
    Write-Host "  📈 Prometheus: http://localhost:9090"
}

# Fonction pour construire
function Build-Image {
    Write-Host "🔨 Construction de l'image Docker..." -ForegroundColor Blue
    docker-compose build
    Write-Host "✅ Image construite avec succès" -ForegroundColor Green
}

# Fonction pour arrêter
function Stop-Containers {
    Write-Host "🛑 Arrêt des conteneurs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.prod.yml down
    Write-Host "✅ Conteneurs arrêtés" -ForegroundColor Green
}

# Fonction pour les logs
function Show-Logs {
    Write-Host "📋 Affichage des logs..." -ForegroundColor Blue
    docker-compose logs -f
}

# Fonction pour nettoyer
function Clean-All {
    Write-Host "🧹 Nettoyage des conteneurs et volumes..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker-compose -f docker-compose.prod.yml down -v
    docker system prune -f
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
}

# Fonction pour le statut
function Show-Status {
    Write-Host "📊 Statut des conteneurs:" -ForegroundColor Blue
    docker-compose ps
    Write-Host ""
    Write-Host "📊 Utilisation des ressources:" -ForegroundColor Blue
    docker stats --no-stream
}

# Fonction pour ouvrir un shell
function Open-Shell {
    Write-Host "🐚 Ouverture d'un shell dans le conteneur..." -ForegroundColor Blue
    docker-compose exec bacnet-mcp bash
}

# Vérification de Docker
Test-Docker

# Gestion des commandes
switch ($Command.ToLower()) {
    "dev" {
        Start-Dev
    }
    "prod" {
        Start-Prod
    }
    "build" {
        Build-Image
    }
    "stop" {
        Stop-Containers
    }
    "logs" {
        Show-Logs
    }
    "clean" {
        Clean-All
    }
    "status" {
        Show-Status
    }
    "shell" {
        Open-Shell
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "❌ Commande inconnue: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
