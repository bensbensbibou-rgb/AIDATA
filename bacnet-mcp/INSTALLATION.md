# 🚀 Guide d'Installation - BACnet MCP + n8n + Web

## 📋 Prérequis Système

### Windows
- Windows 10/11 (64-bit)
- 4 GB RAM minimum (8 GB recommandé)
- 2 GB espace disque libre
- Connexion Internet

### Linux
- Ubuntu 20.04+, Debian 11+, CentOS 8+, RHEL 8+
- 4 GB RAM minimum (8 GB recommandé)
- 2 GB espace disque libre
- Connexion Internet
- Accès sudo

## 🎯 Installation Automatique

### Windows
1. **Téléchargez le projet** et extrayez-le
2. **Double-cliquez** sur `installer.bat`
3. **Suivez les instructions** à l'écran
4. **Redémarrez** si demandé

### Linux
```bash
# Rendre le script exécutable
chmod +x installer.sh

# Lancer l'installation
./installer.sh
```

## 🔧 Installation Manuelle

### 1. Python 3.11+
- **Windows** : https://python.org/downloads/
- **Linux** : `sudo apt install python3 python3-pip python3-venv`

### 2. Node.js 18+
- **Windows** : https://nodejs.org/
- **Linux** : `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -`

### 3. Docker Desktop
- **Windows** : https://docker.com/products/docker-desktop/
- **Linux** : `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`

### 4. Installation des Dépendances
```bash
# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement
# Windows
venv\Scripts\activate.bat
# Linux
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Installer n8n
npm install -g n8n
```

## 🚀 Démarrage

### Démarrage Complet (Recommandé)
```bash
# Windows
start_all_with_web_interface.bat

# Linux
./start_all_with_web_interface.sh
```

### Démarrage Partiel
```bash
# BACnet MCP seul
start.bat  # Windows
./start.sh  # Linux

# n8n seul
start_n8n_local.bat  # Windows
./start_n8n_local.sh  # Linux
```

## 🌐 Accès aux Services

| Service | URL | Description |
|---------|-----|-------------|
| **BACnet MCP** | http://localhost:8050 | Serveur principal BACnet |
| **n8n** | http://localhost:5678 | Interface d'automatisation |
| **Interface Web** | http://localhost:8080 | Hub principal |
| **Chat AI** | http://localhost:8080/static/app.html | Assistant IA |
| **Interface BACnet** | http://localhost:8080/static/app1.html | Gestion BACnet |
| **Prometheus** | http://localhost:9090 | Monitoring |
| **Grafana** | http://localhost:3000 | Dashboards |

## 📁 Structure du Projet

```
Bacnet n8n/
├── installer.bat              # Installateur Windows
├── installer.sh               # Installateur Linux
├── start_all_with_web_interface.bat  # Démarrage complet
├── start_all_with_web_interface.sh   # Démarrage complet Linux
├── venv/                      # Environnement Python
├── n8n-data/                  # Données n8n
├── static/                    # Pages web
├── monitoring/                # Configuration monitoring
├── server.py                  # Serveur BACnet MCP
├── serveurWeb.py              # Interface web
└── requirements.txt           # Dépendances Python
```

## 🔍 Dépannage

### Erreur "Python non trouvé"
- Vérifiez que Python est installé et dans le PATH
- Redémarrez le terminal après installation

### Erreur "Node.js non trouvé"
- Vérifiez que Node.js est installé
- Redémarrez le terminal après installation

### Erreur "Docker non trouvé"
- Vérifiez que Docker Desktop est démarré
- Sur Linux, ajoutez l'utilisateur au groupe docker

### Ports déjà utilisés
- Arrêtez les services existants
- Changez les ports dans les fichiers de configuration

### Problèmes de permissions (Linux)
```bash
sudo chown -R $USER:$USER .
chmod +x *.sh
```

## 📞 Support

### Logs
- **BACnet MCP** : `logs/bacnet.log`
- **n8n** : `n8n-data/n8nEventLog.log`
- **Docker** : `docker logs n8n-local`

### Commandes Utiles
```bash
# Vérifier les services
docker ps
netstat -an | findstr ":5678"  # Windows
netstat -an | grep ":5678"     # Linux

# Redémarrer un service
docker restart n8n-local

# Voir les logs
docker logs -f n8n-local
```

## 🎉 Félicitations !

Votre environnement BACnet MCP + n8n + Web est maintenant opérationnel !

**Prochaines étapes :**
1. Accédez à http://localhost:8080 pour le hub principal
2. Configurez vos workflows n8n
3. Personnalisez les dashboards Grafana
4. Explorez les interfaces BACnet

## 📚 Documentation

- [Guide n8n Local](GUIDE_N8N_LOCAL.md)
- [Composants Web](COMPOSANTS_WEB.md)
- [Démarrage Rapide](DEMARRAGE_RAPIDE.md)
