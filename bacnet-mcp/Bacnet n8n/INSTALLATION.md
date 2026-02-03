# Installation BACnet MCP Server - Sans Docker

Ce guide vous explique comment installer et configurer le serveur BACnet MCP sans utiliser Docker.

## Prérequis

### Windows
- Python 3.11 ou plus récent (téléchargeable depuis https://python.org)
- Git (optionnel, pour cloner le repository)

### Linux
- Python 3.11 ou plus récent
- Git
- Curl
- Build tools (gcc, make, etc.)

## Installation

### Windows

1. **Téléchargez et installez Python 3.11+** depuis https://python.org
   - Assurez-vous de cocher "Add Python to PATH" lors de l'installation

2. **Ouvrez PowerShell ou Command Prompt** dans le dossier du projet

3. **Lancez le script d'installation automatique** :
   ```cmd
   install_windows.bat
   ```

4. **Ou installation manuelle** :
   ```cmd
   python -m venv venv
   venv\Scripts\activate.bat
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

### Linux (Ubuntu/Debian)

1. **Ouvrez un terminal** dans le dossier du projet

2. **Lancez le script d'installation automatique** :
   ```bash
   chmod +x install_linux.sh
   ./install_linux.sh
   ```

3. **Ou installation manuelle** :
   ```bash
   sudo apt-get update
   sudo apt-get install python3 python3-pip python3-venv curl git build-essential
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

### Linux (CentOS/RHEL/Fedora)

1. **Lancez le script d'installation automatique** :
   ```bash
   chmod +x install_linux.sh
   ./install_linux.sh
   ```

2. **Ou installation manuelle** :
   ```bash
   sudo yum update -y
   sudo yum install python3 python3-pip python3-venv curl git gcc
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

## Démarrage du serveur

### Windows
```cmd
start.bat
```

### Linux
```bash
./start.sh
```

### Manuel
```bash
# Windows
venv\Scripts\activate.bat
python server.py

# Linux
source venv/bin/activate
python server.py
```

## Configuration

1. **Copiez le fichier de configuration exemple** :
   ```bash
   # Windows
   copy config.env.example .env
   
   # Linux
   cp config.env.example .env
   ```

2. **Éditez le fichier `.env`** selon vos besoins :
   ```env
   # Configuration BACnet
   TARGET_HOSTS=192.168.1.100,192.168.1.101
   BACNET_PORT=47808
   
   # Configuration MCP
   MCP_SESSION_TIMEOUT=300
   MCP_MAX_SESSIONS=100
   ```

## Accès au serveur

Une fois le serveur démarré, vous pouvez accéder à :

- **Interface web** : http://localhost:8050
- **Serveur MCP** : http://localhost:8050/mcp/
- **Documentation API** : http://localhost:8050/docs
- **Santé du serveur** : http://localhost:8050/health

## Dépannage

### Erreur "Python not found"
- Vérifiez que Python est installé et dans le PATH
- Windows : Redémarrez le terminal après l'installation de Python

### Erreur de dépendances
- Vérifiez que vous êtes dans l'environnement virtuel
- Réinstallez les dépendances : `pip install -r requirements.txt`

### Erreur de port déjà utilisé
- Changez le port dans `server.py` ou arrêtez le service qui utilise le port 8050

### Erreur de permissions (Linux)
- Utilisez `sudo` pour l'installation des dépendances système
- Vérifiez les permissions du dossier : `chmod +x *.sh`

## Structure des dossiers

```
bacnet-mcp-venv/
├── venv/                 # Environnement virtuel Python
├── data/                 # Données du serveur
├── static/               # Fichiers statiques
├── logs/                 # Logs du serveur
├── server.py             # Serveur principal
├── requirements.txt      # Dépendances Python
├── install_windows.bat   # Script d'installation Windows
├── install_linux.sh      # Script d'installation Linux
├── start.bat            # Script de démarrage Windows
├── start.sh             # Script de démarrage Linux
└── .env                 # Configuration (à créer)
```

## Mise à jour

Pour mettre à jour le serveur :

1. **Arrêtez le serveur** (Ctrl+C)
2. **Activez l'environnement virtuel**
3. **Mettez à jour les dépendances** :
   ```bash
   pip install --upgrade -r requirements.txt
   ```
4. **Redémarrez le serveur**

## Support

En cas de problème :
1. Vérifiez les logs dans le terminal
2. Consultez la documentation API : http://localhost:8050/docs
3. Vérifiez que toutes les dépendances sont installées
