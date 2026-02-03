# Script PowerShell pour dockeriser le dossier n8n existant
Write-Host "🐳 Dockerisation du dossier n8n existant..." -ForegroundColor Green

# Arrêter n8n actuel
Write-Host "🛑 Arrêt de n8n actuel..." -ForegroundColor Yellow
docker-compose stop n8n

# Vérifier le dossier n8n existant
$n8nPath = "C:\Users\naine\.n8n"
Write-Host "📁 Vérification du dossier n8n: $n8nPath" -ForegroundColor Cyan

if (Test-Path $n8nPath) {
    Write-Host "✅ Dossier n8n trouvé!" -ForegroundColor Green
    
    # Vérifier le contenu
    $dbPath = "$n8nPath\database.sqlite"
    if (Test-Path $dbPath) {
        $dbSize = (Get-Item $dbPath).Length
        Write-Host "📊 Base de données: $([math]::Round($dbSize/1MB, 2)) MB" -ForegroundColor Cyan
    }
    
    # Vérifier les workflows
    $workflowsPath = "$n8nPath\workflows"
    if (Test-Path $workflowsPath) {
        $workflowCount = (Get-ChildItem $workflowsPath -Recurse -File | Where-Object {$_.Name -like "*.json"}).Count
        Write-Host "📋 Workflows trouvés: $workflowCount" -ForegroundColor Cyan
    }
    
    # Vérifier les credentials
    $credentialsPath = "$n8nPath\credentials"
    if (Test-Path $credentialsPath) {
        $credCount = (Get-ChildItem $credentialsPath -Recurse -File | Where-Object {$_.Name -like "*.json"}).Count
        Write-Host "🔑 Credentials trouvés: $credCount" -ForegroundColor Cyan
    }
    
    # Vérifier les nodes personnalisés
    $nodesPath = "$n8nPath\nodes"
    if (Test-Path $nodesPath) {
        $nodeCount = (Get-ChildItem $nodesPath -Recurse -File | Where-Object {$_.Name -like "*.json"}).Count
        Write-Host "🔧 Nodes personnalisés trouvés: $nodeCount" -ForegroundColor Cyan
    }
    
} else {
    Write-Host "❌ Dossier n8n non trouvé!" -ForegroundColor Red
    exit 1
}

# Créer un fichier de configuration optimisé pour n8n
Write-Host "🔧 Création de la configuration n8n optimisée..." -ForegroundColor Yellow

$configContent = @"
# Configuration n8n optimisée pour Docker
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678
N8N_USER_FOLDER=/home/node/.n8n

# Configuration pour éviter la création d'un nouveau propriétaire
N8N_SKIP_OWNER_SETUP=true
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
DB_SQLITE_POOL_SIZE=1
N8N_RUNNERS_ENABLED=true

# Désactiver les fonctionnalités non nécessaires
N8N_DISABLE_TELEMETRY=true
N8N_DISABLE_ANALYTICS=true
N8N_DISABLE_PERSONALIZATION=false

# Configuration de sécurité
N8N_DISABLE_CREDENTIALS_ENCRYPTION=false
N8N_DISABLE_WEBHOOK_ACCESS=false

# Configuration des permissions
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
"@

$configContent | Out-File -FilePath "n8n.env" -Encoding UTF8
Write-Host "✅ Fichier de configuration créé" -ForegroundColor Green

# Modifier le docker-compose.yml pour utiliser le bon montage
Write-Host "🔧 Mise à jour du docker-compose.yml..." -ForegroundColor Yellow

# Redémarrer n8n avec la configuration optimisée
Write-Host "🚀 Redémarrage de n8n avec la configuration optimisée..." -ForegroundColor Green
docker-compose up -d n8n

# Attendre que n8n démarre
Write-Host "⏳ Attente du démarrage de n8n (25 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# Vérifier le statut
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose ps

# Vérifier les logs
Write-Host "📋 Logs récents de n8n:" -ForegroundColor Cyan
docker-compose logs n8n --tail 10

Write-Host "`n✅ n8n dockerisé avec succès !" -ForegroundColor Green
Write-Host "🌐 Accès à n8n: http://localhost:5678" -ForegroundColor White
Write-Host "🔑 Login: admin / admin123" -ForegroundColor White
Write-Host "📁 Vos workflows et données existantes sont maintenant disponibles !" -ForegroundColor Green

Write-Host "`n🎯 Si n8n demande encore un email:" -ForegroundColor Yellow
Write-Host "1. Utilisez: admin@localhost" -ForegroundColor White
Write-Host "2. Mot de passe: admin123" -ForegroundColor White
Write-Host "3. Vos workflows devraient être visibles après connexion" -ForegroundColor White
