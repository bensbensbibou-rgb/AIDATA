# 🚀 Démarrage Rapide - BACnet MCP + n8n + Web

## 📋 Prérequis

1. **Python 3.11+** : https://python.org
2. **Node.js 18+** : https://nodejs.org
3. **Docker Desktop** : https://docker.com (pour les composants web)

## ⚡ Installation Express

### Windows
```cmd
# 1. Installation automatique
install_windows.bat

# 2. Démarrage de tous les services (BACnet + n8n + Web)
start_all_with_web.bat
```

### Linux
```bash
# 1. Rendre les scripts exécutables
chmod +x *.sh

# 2. Installation automatique
./install_linux.sh

# 3. Démarrage de tous les services
./start_all_with_web.sh
```

## 🌐 Accès aux Services

Une fois démarrés, accédez à :

### Services Principaux
- **Serveur BACnet MCP** : http://localhost:8050
- **Interface n8n** : http://localhost:5678
- **Documentation API** : http://localhost:8050/docs

### Services Web (Monitoring)
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3000 (admin/admin123)
- **Nginx** : http://localhost:80

## 🔧 Configuration

1. **Éditez le fichier `.env`** pour configurer vos appareils BACnet
2. **Créez des workflows n8n** pour automatiser vos processus
3. **Configurez Grafana** avec les dashboards BACnet
4. **Testez les endpoints** avec `test_server.py`

## 🛠️ Scripts Disponibles

### Démarrage Complet
- `start_all_with_web.bat/sh` : Démarre BACnet MCP + n8n + Web

### Démarrage Partiel
- `start_all_local.bat/sh` : Démarre BACnet MCP + n8n
- `start.bat/sh` : Démarre seulement BACnet MCP
- `start_n8n.bat/sh` : Démarre seulement n8n
- `install_web_components.bat/sh` : Démarre seulement les services web

### Arrêt
- `stop_web_services.bat/sh` : Arrête les services web

## 📊 Monitoring

- **Grafana** : Dashboards BACnet et n8n
- **Prometheus** : Métriques et alertes
- **Nginx** : Reverse proxy et load balancing

## 📖 Documentation Complète

Consultez `README_BACNET_N8N.md` pour la documentation complète.
