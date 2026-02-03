# 🏢 BACnet MCP Server + n8n - Installation Locale

Ce projet combine un serveur BACnet MCP avec n8n pour l'automatisation des systèmes de bâtiment.

## 📋 Prérequis

### Windows
- Python 3.11+ (https://python.org)
- Node.js 18+ (pour n8n)
- Git (optionnel)

### Linux
- Python 3.11+
- Node.js 18+
- Git
- Build tools

## 🚀 Installation Rapide

### Windows
```cmd
# 1. Installation automatique
install_windows.bat

# 2. Démarrage du serveur
start.bat
```

### Linux
```bash
# 1. Rendre les scripts exécutables
chmod +x install_linux.sh start.sh

# 2. Installation automatique
./install_linux.sh

# 3. Démarrage du serveur
./start.sh
```

## 🔧 Installation Manuelle

### 1. Installation Python
```bash
# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement
# Windows:
venv\Scripts\activate.bat
# Linux:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### 2. Installation n8n
```bash
# Installer n8n globalement
npm install -g n8n

# Ou avec yarn
yarn global add n8n
```

## 🏃‍♂️ Démarrage

### Serveur BACnet MCP
```bash
# Windows
start.bat

# Linux
./start.sh

# Manuel
python server.py
```

### n8n (dans un nouveau terminal)
```bash
# Démarrer n8n
n8n

# Ou avec un port spécifique
n8n start --port 5678
```

## 🌐 Accès aux Services

### Serveur BACnet MCP
- **Interface web** : http://localhost:8050
- **Serveur MCP** : http://localhost:8050/mcp/
- **Documentation API** : http://localhost:8050/docs
- **Santé** : http://localhost:8050/health

### n8n
- **Interface n8n** : http://localhost:5678
- **Webhook URL** : http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat

## 📁 Structure du Projet

```
Bacnet n8n/
├── server.py              # Serveur BACnet MCP principal
├── decode.py              # Décodeur BACnet
├── requirements.txt       # Dépendances Python
├── install_windows.bat    # Installation Windows
├── install_linux.sh       # Installation Linux
├── start.bat             # Démarrage Windows
├── start.sh              # Démarrage Linux
├── config.env.example    # Configuration exemple
├── data/                 # Données du serveur
├── static/               # Fichiers statiques
└── logs/                 # Logs
```

## ⚙️ Configuration

### 1. Configuration BACnet
Éditez le fichier `.env` :
```env
# Adresses IP des appareils BACnet
TARGET_HOSTS=192.168.1.100,192.168.1.101

# Port BACnet (défaut: 47808)
BACNET_PORT=47808

# Configuration MCP
MCP_SESSION_TIMEOUT=300
MCP_MAX_SESSIONS=100
```

### 2. Configuration n8n
Le webhook n8n est pré-configuré dans le serveur :
- URL : http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat
- Méthode : POST

## 🔌 Intégration BACnet ↔ n8n

### Workflow n8n Exemple
1. **Déclencheur Webhook** : Reçoit les données BACnet
2. **Traitement** : Analyse et filtrage des données
3. **Action** : Notification, stockage, ou contrôle

### Données BACnet Disponibles
- **Notifications d'alarme** : Changements d'état des appareils
- **COV (Change of Value)** : Modifications de valeurs
- **Lecture de propriétés** : Valeurs actuelles
- **Écriture de propriétés** : Contrôle des appareils

## 🛠️ Outils MCP Disponibles

### Lecture
- `read_property` : Lire une propriété BACnet
- `read_multiple_properties` : Lire plusieurs propriétés
- `read_range` : Lire un historique de valeurs

### Écriture
- `write_property` : Écrire une propriété
- `write_multiple_properties` : Écrire plusieurs propriétés

### Découverte
- `discover_devices` : Découvrir les appareils BACnet
- `who_is` : Recherche d'appareils

### Notifications
- `subscribe_cov` : S'abonner aux changements de valeur
- `subscribe_alarm` : S'abonner aux alarmes

## 🐛 Dépannage

### Erreur "Port déjà utilisé"
```bash
# Windows
netstat -ano | findstr :8050
taskkill /PID <PID> /F

# Linux
lsof -i :8050
kill -9 <PID>
```

### Erreur de dépendances
```bash
# Réinstaller les dépendances
pip install -r requirements.txt --force-reinstall
```

### Erreur n8n
```bash
# Vérifier l'installation
n8n --version

# Réinstaller n8n
npm uninstall -g n8n
npm install -g n8n
```

## 📊 Monitoring

### Logs du Serveur
- Les logs s'affichent dans le terminal
- Fichiers de log dans le dossier `logs/`

### Santé du Système
- **Serveur** : http://localhost:8050/health
- **n8n** : http://localhost:5678/healthz

## 🔄 Mise à Jour

```bash
# Mettre à jour les dépendances Python
pip install --upgrade -r requirements.txt

# Mettre à jour n8n
npm update -g n8n
```

## 📞 Support

En cas de problème :
1. Vérifiez les logs dans le terminal
2. Consultez la documentation API : http://localhost:8050/docs
3. Vérifiez la configuration dans `.env`
4. Testez les endpoints avec `test_server.py`

## 🎯 Utilisation Avancée

### Scripts Utiles
- `test_server.py` : Test des endpoints
- `check_services.py` : Vérification des services
- `cli.py` : Interface en ligne de commande

### Développement
- Modifiez `server.py` pour ajouter de nouvelles fonctionnalités
- Créez des workflows n8n personnalisés
- Intégrez avec d'autres systèmes via les webhooks
