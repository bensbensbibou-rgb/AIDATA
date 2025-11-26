# Dashboard AI - Guide de Déploiement sur Raspberry Pi

## Prérequis

- Raspberry Pi 3/4/5 avec Raspberry Pi OS (64-bit recommandé)
- Docker et Docker Compose installés
- Au moins 2GB de RAM disponible
- Connexion réseau stable

## Installation de Docker sur Raspberry Pi

```bash
# Mettre à jour le système
sudo apt-get update
sudo apt-get upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt-get install -y docker-compose

# Redémarrer pour appliquer les changements
sudo reboot
```

## Déploiement de l'Application

### 1. Transférer les fichiers sur le Raspberry Pi

```bash
# Sur votre PC Windows, compresser le projet
# Puis transférer via SCP ou clé USB

# Sur le Raspberry Pi, extraire les fichiers
cd ~
mkdir dashboard-ai
cd dashboard-ai
# Copier tous les fichiers du projet ici
```

### 2. Configuration

Éditer le fichier `.env` si nécessaire :

```bash
nano .env
```

Vérifier les URLs et ports :
- `VITE_MCP_DISTECH_URL=http://backend:8000`
- `VITE_GOOGLE_API_KEY=votre_clé_api`

### 3. Build et Démarrage

```bash
# Build les images Docker (peut prendre 10-15 minutes sur Raspberry Pi)
docker-compose build

# Démarrer les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

### 4. Accès à l'Application

Ouvrir un navigateur et aller à :
- `http://[IP_DU_RASPBERRY]:3007`

Pour trouver l'IP du Raspberry Pi :
```bash
hostname -I
```

## Commandes Utiles

```bash
# Arrêter les services
docker-compose down

# Redémarrer les services
docker-compose restart

# Voir les logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Voir l'état des conteneurs
docker-compose ps

# Nettoyer les images inutilisées
docker system prune -a
```

## Optimisations pour Raspberry Pi

### Limiter l'utilisation de la RAM

Éditer `docker-compose.yml` et ajouter des limites :

```yaml
services:
  frontend:
    # ... autres configurations
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
  
  backend:
    # ... autres configurations
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Activer le swap si nécessaire

```bash
# Vérifier le swap actuel
free -h

# Augmenter le swap si nécessaire
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Modifier CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## Démarrage Automatique au Boot

```bash
# Activer le démarrage automatique de Docker
sudo systemctl enable docker

# Le docker-compose avec restart: unless-stopped
# démarrera automatiquement les conteneurs
```

## Mise à Jour de l'Application

```bash
# Arrêter les services
docker-compose down

# Mettre à jour le code
git pull  # si vous utilisez git
# ou copier les nouveaux fichiers

# Rebuild et redémarrer
docker-compose build
docker-compose up -d
```

## Dépannage

### Le build échoue par manque de mémoire

```bash
# Augmenter le swap temporairement
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=4096/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Rebuild
docker-compose build --no-cache
```

### Les conteneurs redémarrent en boucle

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'utilisation des ressources
docker stats
```

### Port déjà utilisé

```bash
# Vérifier les ports utilisés
sudo netstat -tulpn | grep :3007
sudo netstat -tulpn | grep :8000

# Modifier les ports dans docker-compose.yml si nécessaire
```

## Performance

Sur un Raspberry Pi 4 avec 4GB de RAM :
- Build initial : ~10-15 minutes
- Démarrage : ~30-60 secondes
- Utilisation RAM : ~800MB-1GB total
- CPU : ~10-20% en idle, ~40-60% sous charge

## Sécurité

### Firewall

```bash
# Installer ufw
sudo apt-get install ufw

# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser l'application
sudo ufw allow 3007/tcp

# Activer le firewall
sudo ufw enable
```

### Accès HTTPS (optionnel)

Pour un accès sécurisé, utiliser un reverse proxy comme Nginx avec Let's Encrypt :

```bash
# Installer certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtenir un certificat (nécessite un nom de domaine)
sudo certbot --nginx -d votre-domaine.com
```

## Support

Pour toute question ou problème :
1. Vérifier les logs : `docker-compose logs`
2. Vérifier l'état : `docker-compose ps`
3. Vérifier les ressources : `docker stats`
