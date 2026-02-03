# Guide d'installation Python 3.13 et MQTT MCP Server

## Étape 1 : Installer Python 3.13

### Option A : Téléchargement manuel (recommandé)
1. Allez sur https://www.python.org/downloads/
2. Téléchargez Python 3.13.x (dernière version stable)
3. **IMPORTANT** : Cochez "Add Python 3.13 to PATH" lors de l'installation
4. Cliquez sur "Install Now"

### Option B : Avec Chocolatey
```powershell
choco install python --version=3.13.0
```

### Option C : Avec winget
```powershell
winget install Python.Python.3.13
```

## Étape 2 : Vérifier l'installation

```powershell
# Vérifier la version de Python
python --version
# Devrait afficher: Python 3.13.x

# Ou si vous avez plusieurs versions
py -3.13 --version
```

## Étape 3 : Créer un environnement virtuel pour MQTT MCP

```powershell
# Naviguer vers le dossier mqtt-mcp
cd c:\Users\Mbensale\GIT\-Dashboard-AI_beta\mqtt-mcp-main\mqtt-mcp-main

# Créer un environnement virtuel avec Python 3.13
py -3.13 -m venv venv_mqtt

# Activer l'environnement virtuel
.\venv_mqtt\Scripts\Activate.ps1

# Vérifier que c'est bien Python 3.13
python --version
```

## Étape 4 : Installer MQTT MCP

```powershell
# Avec l'environnement virtuel activé
pip install -e .

# Ou installer depuis PyPI
pip install mqtt-mcp
```

## Étape 5 : Configurer MQTT MCP

Créer un fichier `.env` dans le dossier mqtt-mcp-main :

```env
# Configuration du broker MQTT
MQTT_MCP_MQTT__HOST=localhost
MQTT_MCP_MQTT__PORT=1883

# Configuration du serveur MCP (optionnel)
MQTT_MCP_SERVER__HOST=0.0.0.0
MQTT_MCP_SERVER__PORT=8002
```

## Étape 6 : Lancer le serveur MQTT MCP

```powershell
# Activer l'environnement virtuel si pas déjà fait
.\venv_mqtt\Scripts\Activate.ps1

# Lancer le serveur
mqtt-mcp

# Le serveur sera accessible sur http://localhost:8002/mcp/
```

## Étape 7 : Tester avec MCP Inspector

```powershell
# Dans un nouveau terminal
npx @modelcontextprotocol/inspector
```

Puis connectez-vous à `http://localhost:8002/mcp/` avec transport `Streamable HTTP`.

## Étape 8 : Intégrer avec n8n

Dans les paramètres de n8n, ajoutez le serveur MCP :
- URL: `http://localhost:8002/mcp/`
- Transport: Streamable HTTP

Vous pourrez ensuite utiliser les outils MQTT directement dans vos workflows n8n !

## Résumé des services actifs

Après toutes les installations, vous aurez :

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Dashboard Frontend | 3000 | http://localhost:3000 | Interface React |
| BACnet Server | 8000 | http://localhost:8000 | API BACnet |
| Distech Server | 8001 | http://localhost:8001 | API Distech |
| MQTT MCP Server | 8002 | http://localhost:8002/mcp/ | Interface MCP pour MQTT |
| Mosquitto MQTT | 1883 | mqtt://localhost:1883 | Broker MQTT |
| Mosquitto WebSocket | 9001 | ws://localhost:9001 | WebSocket MQTT |
| n8n | 5678 | http://localhost:5678 | Automatisation |

## Dépannage

### Python 3.13 n'est pas reconnu
```powershell
# Utiliser le Python Launcher
py -3.13 --version

# Ou spécifier le chemin complet
C:\Users\Mbensale\AppData\Local\Programs\Python\Python313\python.exe --version
```

### Erreur lors de l'installation mqtt-mcp
```powershell
# Mettre à jour pip
python -m pip install --upgrade pip

# Installer avec verbose pour voir les erreurs
pip install -e . -v
```

### Le serveur ne démarre pas
```powershell
# Vérifier les logs
mqtt-mcp --help

# Spécifier explicitement le port
mqtt-mcp --port 8002
```
