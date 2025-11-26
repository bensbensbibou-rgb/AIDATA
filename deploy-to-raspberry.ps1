# Script PowerShell pour déployer sur Raspberry Pi depuis Windows
# Usage: .\deploy-to-raspberry.ps1 -RaspberryIP "192.168.1.100" -RaspberryUser "pi"

param(
    [string]$RaspberryIP = "192.168.1.100",
    [string]$RaspberryUser = "pi",
    [string]$RemoteDir = "/home/pi/dashboard-ai"
)

# Couleurs
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "========================================"
Write-ColorOutput Green "Déploiement Dashboard AI sur Raspberry Pi"
Write-ColorOutput Green "========================================"
Write-Host ""
Write-ColorOutput Yellow "IP Raspberry: $RaspberryIP"
Write-ColorOutput Yellow "Utilisateur: $RaspberryUser"
Write-ColorOutput Yellow "Répertoire distant: $RemoteDir"
Write-Host ""

# Vérifier si SSH est disponible
Write-ColorOutput Yellow "[1/7] Vérification de SSH..."
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-ColorOutput Red "❌ SSH n'est pas disponible"
    Write-Host "Installez OpenSSH depuis: Paramètres > Applications > Fonctionnalités facultatives"
    exit 1
}

# Vérifier si SCP est disponible
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-ColorOutput Red "❌ SCP n'est pas disponible"
    Write-Host "Installez OpenSSH depuis: Paramètres > Applications > Fonctionnalités facultatives"
    exit 1
}

Write-ColorOutput Green "✓ SSH/SCP disponibles"

# Tester la connexion
Write-ColorOutput Yellow "[2/7] Test de connexion au Raspberry Pi..."
$testConnection = ssh -o ConnectTimeout=5 "$RaspberryUser@$RaspberryIP" "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Impossible de se connecter au Raspberry Pi"
    Write-ColorOutput Yellow "Vérifiez:"
    Write-Host "  - L'adresse IP est correcte"
    Write-Host "  - Le Raspberry Pi est allumé et connecté"
    Write-Host "  - SSH est activé (sudo raspi-config)"
    Write-Host ""
    Write-Host "Erreur: $testConnection"
    exit 1
}
Write-ColorOutput Green "✓ Connexion établie"

# Créer le répertoire distant
Write-ColorOutput Yellow "[3/7] Création du répertoire sur le Raspberry Pi..."
ssh "$RaspberryUser@$RaspberryIP" "mkdir -p $RemoteDir"
Write-ColorOutput Green "✓ Répertoire créé"

# Créer une archive (utiliser 7-Zip ou tar si disponible)
Write-ColorOutput Yellow "[4/7] Préparation des fichiers..."
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "dashboard-ai-$timestamp.zip"

# Créer un fichier temporaire avec la liste des exclusions
$excludeList = @(
    "node_modules",
    "dist",
    ".git",
    "*.log",
    ".vscode",
    "distech_mcp_server_full\.venv",
    "distech_mcp_server_full\__pycache__",
    "mqtt-mcp-main"
)

# Utiliser Compress-Archive (natif PowerShell)
Write-Host "Création de l'archive..."
$filesToInclude = Get-ChildItem -Path . -Recurse | Where-Object {
    $item = $_
    $exclude = $false
    foreach ($pattern in $excludeList) {
        if ($item.FullName -like "*$pattern*") {
            $exclude = $true
            break
        }
    }
    -not $exclude -and -not $item.PSIsContainer
}

if ($filesToInclude.Count -eq 0) {
    Write-ColorOutput Red "❌ Aucun fichier à archiver"
    exit 1
}

Compress-Archive -Path $filesToInclude -DestinationPath $archiveName -Force
Write-ColorOutput Green "✓ Archive créée: $archiveName"

# Transférer l'archive
Write-ColorOutput Yellow "[5/7] Transfert vers le Raspberry Pi..."
Write-ColorOutput Yellow "Cela peut prendre quelques minutes..."
scp $archiveName "$RaspberryUser@${RaspberryIP}:$RemoteDir/"
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Erreur lors du transfert"
    Remove-Item $archiveName
    exit 1
}
Write-ColorOutput Green "✓ Transfert terminé"

# Nettoyer l'archive locale
Remove-Item $archiveName

# Extraire et déployer sur le Raspberry Pi
Write-ColorOutput Yellow "[6/7] Extraction sur le Raspberry Pi..."
ssh "$RaspberryUser@$RaspberryIP" @"
cd $RemoteDir
unzip -o $archiveName
rm $archiveName
"@
Write-ColorOutput Green "Extraction terminee"

# Installation et déploiement Docker
Write-ColorOutput Yellow "[7/7] Déploiement de l'application..."
ssh "$RaspberryUser@$RaspberryIP" @"
cd $RemoteDir

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker \$USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installation de Docker Compose..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
fi

# Arrêter les conteneurs existants
if [ -f docker-compose.yml ]; then
    docker-compose down 2>/dev/null || true
fi

# Build et démarrage
echo "Build des images Docker..."
docker-compose build

echo "Démarrage des services..."
docker-compose up -d

# Attendre le démarrage
sleep 10

# Afficher l'état
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
"@

Write-Host ""
Write-ColorOutput Green "========================================"
Write-ColorOutput Green "Deploiement termine avec succes !"
Write-ColorOutput Green "========================================"
Write-Host ""
Write-ColorOutput Yellow "Accès à l'application:"
Write-Host "  http://${RaspberryIP}:3007"
Write-Host ""
Write-ColorOutput Yellow "Commandes utiles:"
Write-Host "  Voir les logs:     ssh $RaspberryUser@$RaspberryIP `"cd $RemoteDir; docker-compose logs -f`""
Write-Host "  Redemarrer:        ssh $RaspberryUser@$RaspberryIP `"cd $RemoteDir; docker-compose restart`""
Write-Host "  Arreter:           ssh $RaspberryUser@$RaspberryIP `"cd $RemoteDir; docker-compose down`""
Write-Host ""
