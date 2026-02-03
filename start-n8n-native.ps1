# Script d'installation et démarrage de n8n (SANS Docker)
# Alternative pour les systèmes sans support de virtualisation

Write-Host "🚀 Installation de n8n (version native - sans Docker)" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Vérifier Node.js
Write-Host "`n[1/4] Vérification de Node.js..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js $nodeVersion installé" -ForegroundColor Green
    Write-Host "✓ npm $npmVersion installé" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js n'est pas installé !" -ForegroundColor Red
    Write-Host "`n📥 Téléchargez Node.js depuis : https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   Installez la version LTS (Long Term Support)" -ForegroundColor Yellow
    Write-Host "`n   Après l'installation, relancez ce script." -ForegroundColor Cyan
    
    # Ouvrir le navigateur vers la page de téléchargement
    $response = Read-Host "`nVoulez-vous ouvrir la page de téléchargement maintenant ? (O/N)"
    if ($response -eq 'O' -or $response -eq 'o') {
        Start-Process "https://nodejs.org/"
    }
    exit 1
}

# Vérifier si n8n est déjà installé
Write-Host "`n[2/4] Vérification de n8n..." -ForegroundColor Yellow

try {
    $n8nVersion = n8n --version 2>$null
    Write-Host "✓ n8n $n8nVersion est déjà installé" -ForegroundColor Green
    $skipInstall = $true
}
catch {
    Write-Host "⚠ n8n n'est pas encore installé" -ForegroundColor Yellow
    $skipInstall = $false
}

# Installer n8n si nécessaire
if (-not $skipInstall) {
    Write-Host "`n[3/4] Installation de n8n..." -ForegroundColor Yellow
    Write-Host "   Cela peut prendre quelques minutes..." -ForegroundColor Gray
    
    try {
        npm install -g n8n
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ n8n a été installé avec succès !" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Erreur lors de l'installation de n8n" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "✗ Erreur lors de l'installation : $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "`n[3/4] Installation de n8n..." -ForegroundColor Yellow
    Write-Host "   Installation déjà effectuée, passage à l'étape suivante" -ForegroundColor Gray
}

# Configuration des variables d'environnement
Write-Host "`n[4/4] Configuration de n8n..." -ForegroundColor Yellow

$env:N8N_BASIC_AUTH_ACTIVE = "true"
$env:N8N_BASIC_AUTH_USER = "admin"
$env:N8N_BASIC_AUTH_PASSWORD = "admin123"
$env:N8N_HOST = "localhost"
$env:N8N_PORT = "5678"
$env:GENERIC_TIMEZONE = "Europe/Paris"

Write-Host "✓ Configuration appliquée" -ForegroundColor Green

# Informations de connexion
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "✨ n8n est prêt à démarrer !" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

Write-Host "`n📋 Informations de connexion :" -ForegroundColor Cyan
Write-Host "   URL:          http://localhost:5678" -ForegroundColor White
Write-Host "   Utilisateur:  admin" -ForegroundColor White
Write-Host "   Mot de passe: admin123" -ForegroundColor White

Write-Host "`n💡 Commandes utiles :" -ForegroundColor Cyan
Write-Host "   Pour démarrer n8n:    n8n start" -ForegroundColor White
Write-Host "   Pour arrêter:          Ctrl+C" -ForegroundColor White

Write-Host "`n🚀 Démarrage de n8n..." -ForegroundColor Yellow
Write-Host "   Appuyez sur Ctrl+C pour arrêter n8n" -ForegroundColor Gray
Write-Host "   Une fois démarré, ouvrez http://localhost:5678 dans votre navigateur" -ForegroundColor Gray
Write-Host "`n" -NoNewline

# Démarrer n8n
n8n start
