# Script PowerShell pour démarrer n8n en local
Write-Host "Démarrage de n8n en local..." -ForegroundColor Green

# Activation de l'environnement virtuel Python si nécessaire
if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
    Write-Host "Environnement virtuel Python activé" -ForegroundColor Yellow
}

# Configuration des variables d'environnement pour n8n
$env:N8N_BASIC_AUTH_ACTIVE = "true"
$env:N8N_BASIC_AUTH_USER = "admin"
$env:N8N_BASIC_AUTH_PASSWORD = "Admin123"
$env:N8N_HOST = "localhost"
$env:N8N_PORT = "5678"
$env:N8N_PROTOCOL = "http"
$env:WEBHOOK_URL = "http://localhost:5678"
$env:N8N_USER_FOLDER = "$PWD\n8n-data"
$env:N8N_SKIP_OWNER_SETUP = "false"
$env:N8N_DISABLE_PRODUCTION_MAIN_PROCESS = "false"
$env:DB_SQLITE_POOL_SIZE = "1"
$env:N8N_RUNNERS_ENABLED = "true"
$env:N8N_DISABLE_TELEMETRY = "true"
$env:N8N_DISABLE_ANALYTICS = "true"
$env:N8N_DISABLE_PERSONALIZATION = "false"
$env:N8N_DISABLE_CREDENTIALS_ENCRYPTION = "false"
$env:N8N_DISABLE_WEBHOOK_ACCESS = "false"
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "false"
$env:N8N_ENCRYPTION_KEY = "metIciUneCleTresLongueEtAleatoire_32+car"
$env:GENERIC_TIMEZONE = "Europe/Paris"

# Configuration MCP pour BACnet
$env:N8N_MCP_SERVER_URL = "http://localhost:8050"
$env:N8N_MCP_SERVER_NAME = "BACnet MCP Server"
$env:N8N_MCP_SERVER_VERSION = "1.4.2"

# Création du dossier de données n8n
if (-not (Test-Path "n8n-data")) {
    New-Item -ItemType Directory -Path "n8n-data" | Out-Null
    Write-Host "Dossier n8n-data créé" -ForegroundColor Yellow
}

# Affichage des informations de connexion
Write-Host "`nConfiguration terminée. Démarrage de n8n..." -ForegroundColor Green
Write-Host "URL: http://localhost:5678" -ForegroundColor Cyan
Write-Host "Utilisateur: admin" -ForegroundColor Cyan
Write-Host "Mot de passe: Admin123" -ForegroundColor Cyan
Write-Host ""

# Démarrage de n8n
try {
    # Essayer d'abord avec npx
    Write-Host "Tentative de démarrage avec npx..." -ForegroundColor Yellow
    npx n8n start
} catch {
    try {
        # Puis avec l'installation locale
        Write-Host "Tentative avec l'installation locale..." -ForegroundColor Yellow
        & "node_modules\.bin\n8n.cmd" start
    } catch {
        try {
            # Enfin avec l'installation globale
            Write-Host "Tentative avec l'installation globale..." -ForegroundColor Yellow
            n8n start
        } catch {
            Write-Host "Erreur: n8n n'est pas installé. Installez-le avec 'npm install n8n' ou 'npm install -g n8n'" -ForegroundColor Red
        }
    }
}

