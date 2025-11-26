# Guide de deploiement sur Revolution Pi (RevPi141947)

## Informations de connexion
- **Adresse IP** : 192.168.1.50
- **Utilisateur** : pi
- **Mot de passe** : 2t5qth
- **Hostname** : RevPi141947

## Methode 1 : Deploiement interactif (Recommande)

### Etape 1 : Tester la connexion SSH

Ouvrez PowerShell et testez la connexion :

```powershell
ssh pi@192.168.1.50
# Entrez le mot de passe : 2t5qth
```

Si la connexion fonctionne, tapez `exit` pour revenir.

### Etape 2 : Configurer l'authentification par cle SSH (optionnel mais recommande)

Pour eviter de saisir le mot de passe a chaque fois :

```powershell
# Generer une cle SSH si vous n'en avez pas
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa

# Copier la cle sur le RevPi
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh pi@192.168.1.50 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
# Mot de passe : 2t5qth
```

### Etape 3 : Deploiement automatique

Une fois la cle SSH configuree, executez :

```powershell
cd C:\Users\Mbensale\GIT\-Dashboard-AI_beta
.\deploy-simple.ps1 -RaspberryIP "192.168.1.50" -RaspberryUser "pi"
```

## Methode 2 : Deploiement manuel pas a pas

### Etape 1 : Creer l'archive

```powershell
cd C:\Users\Mbensale\GIT\-Dashboard-AI_beta

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
Write-Host "Archive creee: $archiveName"
```

### Etape 2 : Transferer l'archive

```powershell
scp .\dashboard-*.zip pi@192.168.1.50:/home/pi/
# Mot de passe : 2t5qth
```

### Etape 3 : Se connecter au RevPi

```powershell
ssh pi@192.168.1.50
# Mot de passe : 2t5qth
```

### Etape 4 : Sur le RevPi, installer et deployer

```bash
# Creer le repertoire
mkdir -p ~/dashboard-ai
cd ~/dashboard-ai

# Copier et extraire l'archive
mv ~/dashboard-*.zip .
unzip -o dashboard-*.zip
rm dashboard-*.zip

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose

# IMPORTANT : Redemarrer la session pour que les permissions Docker soient appliquees
exit
```

### Etape 5 : Reconnexion et demarrage

```powershell
ssh pi@192.168.1.50
# Mot de passe : 2t5qth
```

```bash
cd ~/dashboard-ai

# Build des images (10-15 minutes)
docker-compose build

# Demarrage des services
docker-compose up -d

# Verifier l'etat
docker-compose ps
docker-compose logs -f
```

## Acces a l'application

Une fois deploye, l'application sera accessible a :
```
http://192.168.1.50:3007
```

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Voir les logs d'un service specifique
docker-compose logs -f frontend
docker-compose logs -f backend

# Redemarrer les services
docker-compose restart

# Arreter les services
docker-compose down

# Voir l'etat des conteneurs
docker-compose ps

# Voir l'utilisation des ressources
docker stats
```

## Depannage

### Le build echoue par manque de memoire

Le Revolution Pi a generalement 1-2GB de RAM. Si le build echoue :

```bash
# Augmenter le swap
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Rebuild
docker-compose build --no-cache
```

### Les conteneurs ne demarrent pas

```bash
# Verifier les logs
docker-compose logs

# Verifier l'espace disque
df -h

# Nettoyer Docker
docker system prune -a
```

### Port 3007 deja utilise

```bash
# Modifier le port dans docker-compose.yml
nano docker-compose.yml
# Changer "3007:80" en "8080:80" par exemple

# Redemarrer
docker-compose up -d
```

## Notes specifiques au Revolution Pi

Le Revolution Pi est un automate industriel robuste base sur Raspberry Pi Compute Module. Il est concu pour des environnements industriels et supporte :
- Temperatures etendues (-40°C a +55°C)
- Alimentation 24V DC
- Modules d'E/S industriels

Pour une utilisation optimale :
- Assurez-vous que le RevPi a acces a Internet pour telecharger les images Docker
- Verifiez l'espace disque disponible (au moins 5GB recommandes)
- Le build peut prendre 15-20 minutes sur un RevPi en raison du CPU limite
