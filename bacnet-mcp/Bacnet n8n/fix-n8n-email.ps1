# Script PowerShell pour corriger l'email n8n
Write-Host "🔧 Correction de l'email n8n..." -ForegroundColor Green

# Arrêter n8n
Write-Host "🛑 Arrêt de n8n..." -ForegroundColor Yellow
docker-compose stop n8n

# Créer un fichier de configuration avec un email valide
Write-Host "🔧 Création de la configuration n8n avec email valide..." -ForegroundColor Yellow

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

# Email valide pour l'utilisateur admin
N8N_EMAIL=admin@example.com
"@

$configContent | Out-File -FilePath "n8n.env" -Encoding UTF8
Write-Host "✅ Fichier de configuration mis à jour" -ForegroundColor Green

# Redémarrer n8n avec la nouvelle configuration
Write-Host "🚀 Redémarrage de n8n avec l'email corrigé..." -ForegroundColor Green
docker-compose up -d n8n

# Attendre que n8n démarre
Write-Host "⏳ Attente du démarrage de n8n (20 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Vérifier le statut
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n✅ Email n8n corrigé !" -ForegroundColor Green
Write-Host "🌐 Accès à n8n: http://localhost:5678" -ForegroundColor White
Write-Host "📧 Email: admin@example.com" -ForegroundColor White
Write-Host "🔑 Mot de passe: admin123" -ForegroundColor White
Write-Host "📁 Vos workflows existants devraient être visibles !" -ForegroundColor Green
