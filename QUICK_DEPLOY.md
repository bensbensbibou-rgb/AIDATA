# Guide de Déploiement Rapide sur Raspberry Pi

## Méthode 1 : Script Automatique (Recommandé)

### Depuis Windows (PowerShell)

```powershell
# Ouvrir PowerShell dans le dossier du projet
cd C:\Users\Mbensale\GIT\-Dashboard-AI_beta

# Exécuter le script de déploiement
.\deploy-to-raspberry.ps1 -RaspberryIP "192.168.1.XXX" -RaspberryUser "pi"
```

### Depuis Linux/Mac (Bash)

```bash
# Rendre le script exécutable
chmod +x deploy-to-raspberry.sh

# Exécuter le script
./deploy-to-raspberry.sh 192.168.1.XXX pi
```

## Méthode 2 : Transfert Manuel

### Étape 1 : Préparer l'archive

**Windows:**
```powershell
# Créer une archive ZIP
Compress-Archive -Path * -DestinationPath dashboard-ai.zip -Force
```

**Linux/Mac:**
```bash
# Créer une archive tar.gz
tar -czf dashboard-ai.tar.gz --exclude='node_modules' --exclude='dist' --exclude='.git' .
```

### Étape 2 : Transférer sur Raspberry Pi

**Windows (PowerShell):**
```powershell
scp dashboard-ai.zip pi@192.168.1.XXX:/home/pi/
```

**Linux/Mac:**
```bash
scp dashboard-ai.tar.gz pi@192.168.1.XXX:/home/pi/
```

### Étape 3 : Se connecter au Raspberry Pi

```bash
ssh pi@192.168.1.XXX
```

### Étape 4 : Extraire et déployer

```bash
# Créer le répertoire
mkdir -p ~/dashboard-ai
cd ~/dashboard-ai

# Extraire l'archive
unzip ~/dashboard-ai.zip  # Pour Windows
# OU
tar -xzf ~/dashboard-ai.tar.gz  # Pour Linux/Mac

# Installer Docker si nécessaire
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose

# Redémarrer la session
exit
ssh pi@192.168.1.XXX
cd ~/dashboard-ai

# Build et démarrer
docker-compose build
docker-compose up -d
```

## Vérification du Déploiement

### Vérifier l'état des conteneurs

```bash
ssh pi@192.168.1.XXX
cd ~/dashboard-ai
docker-compose ps
```

Vous devriez voir:
```
NAME                  STATUS              PORTS
dashboard_frontend    Up X minutes        0.0.0.0:3007->80/tcp
dashboard_backend     Up X minutes        0.0.0.0:8000->8000/tcp
```

### Voir les logs

```bash
# Tous les logs
docker-compose logs -f

# Logs du frontend uniquement
docker-compose logs -f frontend

# Logs du backend uniquement
docker-compose logs -f backend
```

### Tester l'application

Ouvrir un navigateur et aller à:
```
http://[IP_DU_RASPBERRY]:3007
```

## Commandes Utiles

### Redémarrer l'application
```bash
ssh pi@192.168.1.XXX 'cd ~/dashboard-ai && docker-compose restart'
```

### Arrêter l'application
```bash
ssh pi@192.168.1.XXX 'cd ~/dashboard-ai && docker-compose down'
```

### Mettre à jour l'application
```bash
# 1. Transférer la nouvelle version (répéter Méthode 2)
# 2. Redéployer
ssh pi@192.168.1.XXX 'cd ~/dashboard-ai && docker-compose down && docker-compose build && docker-compose up -d'
```

### Voir l'utilisation des ressources
```bash
ssh pi@192.168.1.XXX 'docker stats'
```

## Prérequis Raspberry Pi

### Activer SSH

Si SSH n'est pas activé:
```bash
# Sur le Raspberry Pi directement
sudo raspi-config
# Interface Options -> SSH -> Enable
```

### Trouver l'IP du Raspberry Pi

```bash
# Sur le Raspberry Pi
hostname -I

# Depuis Windows (sur le même réseau)
arp -a | findstr "b8-27-eb"  # Adresse MAC typique des Raspberry Pi
```

### Augmenter le swap (si nécessaire)

```bash
ssh pi@192.168.1.XXX
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Modifier: CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## Dépannage

### "Permission denied" lors du SSH

```bash
# Vérifier que SSH est activé sur le Raspberry Pi
# Vérifier l'IP et le nom d'utilisateur
# Essayer avec le mot de passe par défaut: raspberry
```

### Le build échoue par manque de mémoire

```bash
# Augmenter le swap (voir ci-dessus)
# Ou builder une image à la fois:
docker-compose build frontend
docker-compose build backend
docker-compose up -d
```

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'espace disque
df -h

# Nettoyer Docker
docker system prune -a
```

### Port 3007 déjà utilisé

```bash
# Vérifier les processus
sudo netstat -tulpn | grep :3007

# Modifier le port dans docker-compose.yml
# Changer "3007:80" en "8080:80" par exemple
```

## Accès depuis l'extérieur (optionnel)

### Configuration du routeur

1. Trouver l'IP locale du Raspberry Pi
2. Dans votre routeur, créer une redirection de port:
   - Port externe: 3007
   - Port interne: 3007
   - IP: [IP du Raspberry Pi]

### Utiliser un nom de domaine (optionnel)

Services gratuits:
- DuckDNS: https://www.duckdns.org
- No-IP: https://www.noip.com

## Support

En cas de problème:
1. Vérifier les logs: `docker-compose logs`
2. Vérifier l'état: `docker-compose ps`
3. Vérifier les ressources: `docker stats`
4. Redémarrer: `docker-compose restart`
