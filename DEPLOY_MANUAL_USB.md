# Guide de deploiement manuel via cle USB

## Etape 1 : Preparer l'archive sur Windows

1. Ouvrir PowerShell dans le dossier du projet
2. Executer :

```powershell
# Creer l'archive
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "dashboard-$timestamp.zip"

$excludePatterns = @("*node_modules*", "*dist*", "*.git*", "*.log", "*.vscode*", "*__pycache__*")
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
Write-Host "Archive creee: $archiveName"
```

3. Copier le fichier ZIP sur une cle USB

## Etape 2 : Sur le Raspberry Pi

1. Inserer la cle USB
2. Monter la cle USB (si pas automatique) :

```bash
# Trouver la cle USB
lsblk

# Monter (remplacer sda1 par votre peripherique)
sudo mount /dev/sda1 /mnt
```

3. Copier et extraire :

```bash
# Creer le repertoire
mkdir -p ~/dashboard-ai
cd ~/dashboard-ai

# Copier depuis la cle USB
cp /mnt/dashboard-*.zip .

# Extraire
unzip dashboard-*.zip
```

4. Installer Docker :

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose

# Redemarrer la session
exit
# Se reconnecter
```

5. Deployer :

```bash
cd ~/dashboard-ai

# Build (10-15 minutes)
docker-compose build

# Demarrer
docker-compose up -d

# Verifier
docker-compose ps
docker-compose logs
```

## Etape 3 : Acceder a l'application

Ouvrir un navigateur :
```
http://192.168.1.50:3007
```

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redemarrer
docker-compose restart

# Arreter
docker-compose down

# Voir l'etat
docker-compose ps
```
