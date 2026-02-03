# Script de démarrage n8n avec Docker
Write-Host "🚀 Démarrage de n8n avec Docker..." -ForegroundColor Cyan

# Vérifier si Docker est en cours d'exécution
Write-Host "`nVérification de Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✓ Docker est installé" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier si le conteneur n8n existe déjà
$existingContainer = docker ps -a --filter "name=n8n" --format "{{.Names}}"

if ($existingContainer -eq "n8n") {
    Write-Host "`n⚠ Le conteneur n8n existe déjà" -ForegroundColor Yellow
    
    # Vérifier s'il est en cours d'exécution
    $runningContainer = docker ps --filter "name=n8n" --format "{{.Names}}"
    
    if ($runningContainer -eq "n8n") {
        Write-Host "✓ n8n est déjà en cours d'exécution" -ForegroundColor Green
        Write-Host "`n📊 Informations du conteneur:" -ForegroundColor Cyan
        docker ps --filter "name=n8n"
    } else {
        Write-Host "Démarrage du conteneur existant..." -ForegroundColor Yellow
        docker start n8n
        Write-Host "✓ n8n a été démarré" -ForegroundColor Green
    }
} else {
    Write-Host "`nCréation d'un nouveau conteneur n8n..." -ForegroundColor Yellow
    
    # Créer et démarrer le conteneur n8n
    docker run -d `
        --name n8n `
        -p 5678:5678 `
        -v n8n_data:/home/node/.n8n `
        -e N8N_BASIC_AUTH_ACTIVE=true `
        -e N8N_BASIC_AUTH_USER=admin `
        -e N8N_BASIC_AUTH_PASSWORD=admin123 `
        -e GENERIC_TIMEZONE=Europe/Paris `
        -e N8N_HOST=localhost `
        -e N8N_PORT=5678 `
        -e N8N_PROTOCOL=http `
        -e WEBHOOK_URL=http://localhost:5678/ `
        n8nio/n8n:latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ n8n a été créé et démarré avec succès" -ForegroundColor Green
    } else {
        Write-Host "✗ Erreur lors de la création du conteneur" -ForegroundColor Red
        exit 1
    }
}

# Attendre quelques secondes pour que n8n démarre
Write-Host "`nAttente du démarrage de n8n..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Afficher les logs
Write-Host "`n📋 Derniers logs de n8n:" -ForegroundColor Cyan
docker logs --tail 20 n8n

Write-Host "`n✨ n8n est accessible sur:" -ForegroundColor Green
Write-Host "   URL: http://localhost:5678" -ForegroundColor White
Write-Host "   Utilisateur: admin" -ForegroundColor White
Write-Host "   Mot de passe: admin123" -ForegroundColor White

Write-Host "`n💡 Commandes utiles:" -ForegroundColor Cyan
Write-Host "   Voir les logs:    docker logs -f n8n" -ForegroundColor White
Write-Host "   Arrêter n8n:      docker stop n8n" -ForegroundColor White
Write-Host "   Redémarrer n8n:   docker restart n8n" -ForegroundColor White
Write-Host "   Supprimer n8n:    docker rm -f n8n" -ForegroundColor White
