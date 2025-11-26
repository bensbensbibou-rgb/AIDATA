# Script PowerShell pour deployer sur Raspberry Pi avec port SSH personnalise
param(
    [string]$RaspberryIP = "192.168.1.50",
    [int]$SSHPort = 41443,
    [string]$RaspberryUser = "pi"
)

$RemoteDir = "/home/$RaspberryUser/dashboard-ai"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deploiement Dashboard AI sur Raspberry Pi" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IP Raspberry: $RaspberryIP" -ForegroundColor Yellow
Write-Host "Port SSH: $SSHPort" -ForegroundColor Yellow
Write-Host "Utilisateur: $RaspberryUser" -ForegroundColor Yellow
Write-Host ""

# Test connexion SSH avec port personnalise
Write-Host "[1/6] Test de connexion SSH..." -ForegroundColor Yellow
try {
    $null = ssh -p $SSHPort -o ConnectTimeout=5 "$RaspberryUser@$RaspberryIP" "echo OK" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Connexion echouee" }
    Write-Host "OK - Connexion etablie sur le port $SSHPort" -ForegroundColor Green
}
catch {
    Write-Host "ERREUR - Impossible de se connecter" -ForegroundColor Red
    Write-Host "Verifiez l'IP, le port SSH, et le reseau" -ForegroundColor Yellow
    exit 1
}

# Creer repertoire distant
Write-Host "[2/6] Creation du repertoire..." -ForegroundColor Yellow
ssh -p $SSHPort "$RaspberryUser@$RaspberryIP" "mkdir -p $RemoteDir"
Write-Host "OK" -ForegroundColor Green

# Creer archive
Write-Host "[3/6] Creation de l'archive..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "dashboard-$timestamp.zip"

$excludePatterns = @("*node_modules*", "*dist*", "*.git*", "*.log", "*.vscode*", "*__pycache__*", "*mqtt-mcp-main*")
$files = Get-ChildItem -Recurse -File | Where-Object {
    $file = $_
    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($file.FullName -like $pattern) {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

Compress-Archive -Path $files -DestinationPath $archiveName -Force
Write-Host "OK - Archive creee: $archiveName" -ForegroundColor Green

# Transferer avec port personnalise
Write-Host "[4/6] Transfert vers Raspberry Pi..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Yellow
scp -P $SSHPort $archiveName "$RaspberryUser@${RaspberryIP}:$RemoteDir/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors du transfert" -ForegroundColor Red
    Remove-Item $archiveName
    exit 1
}
Write-Host "OK - Transfert termine" -ForegroundColor Green
Remove-Item $archiveName

# Extraire
Write-Host "[5/6] Extraction..." -ForegroundColor Yellow
ssh -p $SSHPort "$RaspberryUser@$RaspberryIP" "cd $RemoteDir && unzip -o $archiveName && rm $archiveName"
Write-Host "OK" -ForegroundColor Green

# Deployer
Write-Host "[6/6] Deploiement Docker..." -ForegroundColor Yellow
ssh -p $SSHPort "$RaspberryUser@$RaspberryIP" @"
cd $RemoteDir

# Installer Docker si necessaire
if ! command -v docker &> /dev/null; then
    echo "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker `$USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installation de Docker Compose..."
    sudo apt-get update -qq
    sudo apt-get install -y docker-compose
fi

# Arreter conteneurs existants
docker-compose down 2>/dev/null || true

# Build et demarrage
echo "Build des images (10-15 min)..."
docker-compose build

echo "Demarrage des services..."
docker-compose up -d

sleep 10

echo ""
echo "========================================="
echo "Etat des services:"
docker-compose ps
echo ""
echo "Logs recents:"
docker-compose logs --tail=20
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deploiement termine !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acces a l'application:" -ForegroundColor Yellow
Write-Host "  http://${RaspberryIP}:3007"
Write-Host ""
Write-Host "Commandes utiles:" -ForegroundColor Yellow
Write-Host "  Logs:      ssh -p $SSHPort $RaspberryUser@$RaspberryIP 'cd $RemoteDir; docker-compose logs -f'"
Write-Host "  Restart:   ssh -p $SSHPort $RaspberryUser@$RaspberryIP 'cd $RemoteDir; docker-compose restart'"
Write-Host "  Stop:      ssh -p $SSHPort $RaspberryUser@$RaspberryIP 'cd $RemoteDir; docker-compose down'"
Write-Host ""
