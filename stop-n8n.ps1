# Script d'arrêt de n8n
Write-Host "🛑 Arrêt de n8n..." -ForegroundColor Cyan

# Vérifier si le conteneur existe
$existingContainer = docker ps -a --filter "name=n8n" --format "{{.Names}}"

if ($existingContainer -eq "n8n") {
    $runningContainer = docker ps --filter "name=n8n" --format "{{.Names}}"
    
    if ($runningContainer -eq "n8n") {
        Write-Host "Arrêt du conteneur n8n..." -ForegroundColor Yellow
        docker stop n8n
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ n8n a été arrêté avec succès" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Erreur lors de l'arrêt du conteneur" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠ Le conteneur n8n n'est pas en cours d'exécution" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠ Le conteneur n8n n'existe pas" -ForegroundColor Yellow
}
