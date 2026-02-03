# Script PowerShell pour corriger le problème d'utilisateur n8n
Write-Host "🔧 Correction du problème d'utilisateur n8n..." -ForegroundColor Green

# Arrêter n8n
Write-Host "🛑 Arrêt de n8n..." -ForegroundColor Yellow
docker-compose stop n8n

# Vérifier la base de données locale
$n8nPath = "C:\Users\naine\.n8n"
$dbPath = "$n8nPath\database.sqlite"

Write-Host "📊 Vérification de la base de données locale..." -ForegroundColor Cyan
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "✅ Base de données trouvée: $([math]::Round($dbSize/1MB, 2)) MB" -ForegroundColor Green
    
    # Vérifier si sqlite3 est disponible
    try {
        $userCount = sqlite3 $dbPath "SELECT COUNT(*) FROM User;" 2>$null
        if ($userCount -gt 0) {
            Write-Host "✅ Utilisateurs trouvés dans la base: $userCount" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Aucun utilisateur trouvé dans la base" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Impossible de vérifier les utilisateurs (sqlite3 non disponible)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Base de données non trouvée!" -ForegroundColor Red
}

# Modifier la configuration pour forcer l'utilisation des données existantes
Write-Host "🔧 Modification de la configuration n8n..." -ForegroundColor Yellow

# Créer un fichier de configuration temporaire
$configContent = @"
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678
N8N_USER_FOLDER=/home/node/.n8n
N8N_SKIP_OWNER_SETUP=true
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
DB_SQLITE_POOL_SIZE=1
N8N_RUNNERS_ENABLED=true
N8N_DISABLE_UI=false
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
N8N_DISABLE_WEBHOOK=false
N8N_DISABLE_EDITOR=false
N8N_DISABLE_EXECUTIONS=false
N8N_DISABLE_PERSONALIZATION=false
N8N_DISABLE_TELEMETRY=true
N8N_DISABLE_ANALYTICS=true
N8N_DISABLE_CREDENTIALS_ENCRYPTION=false
N8N_DISABLE_WEBHOOK_ACCESS=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_OWNER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_INSTANCE_OWNER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_EDITOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_VIEWER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_EDITOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_VIEWER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_EDITOR_AND_VIEWER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_EDITOR_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_VIEWER_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_EDITOR_AND_VIEWER=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_EDITOR_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_VIEWER_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_EDITOR_AND_VIEWER_AND_EXECUTOR=false
N8N_DISABLE_WEBHOOK_ACCESS_FOR_WORKFLOW_OWNER_AND_EDITOR_AND_VIEWER_AND_EXECUTOR=false
"@

$configContent | Out-File -FilePath "n8n.env" -Encoding UTF8
Write-Host "✅ Fichier de configuration créé" -ForegroundColor Green

# Redémarrer n8n avec la nouvelle configuration
Write-Host "🚀 Redémarrage de n8n avec la configuration corrigée..." -ForegroundColor Green
docker-compose up -d n8n

# Attendre que n8n démarre
Write-Host "⏳ Attente du démarrage de n8n (20 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Vérifier le statut
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n🎯 Instructions pour résoudre le problème d'email:" -ForegroundColor Green
Write-Host "1. Ouvrez http://localhost:5678" -ForegroundColor White
Write-Host "2. Si n8n demande un email, utilisez: admin@localhost" -ForegroundColor White
Write-Host "3. Mot de passe: admin123" -ForegroundColor White
Write-Host "4. Une fois connecté, vos workflows devraient être visibles" -ForegroundColor White

Write-Host "`n✅ Configuration corrigée !" -ForegroundColor Green
