# 🚀 BACnet MCP + n8n + Web Interface

## 📋 Vue d'ensemble

Ce projet combine un serveur BACnet MCP avec n8n pour l'automatisation, plus des composants web de monitoring et des interfaces web personnalisées.

## 🌐 Services Disponibles

### 🔧 **Services Principaux**
- **Serveur BACnet MCP** : http://localhost:8050
- **Interface n8n** : http://localhost:5678
- **Interface Web BACnet** : http://localhost:8080

### 📊 **Services de Monitoring**
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3000 (admin/admin123)
- **Nginx** : http://localhost:80

### 📱 **Applications Web BACnet**
- **Chat AI 24/7** : http://localhost:8080/static/app.html
- **Interface BACnet** : http://localhost:8080/static/app1.html

## 🚀 Démarrage Rapide

### Windows
```cmd
# Démarrage complet avec interface web
start_all_with_web_interface.bat

# Ou démarrage sans interface web
start_all_with_web.bat
```

### Linux
```bash
# Rendre les scripts exécutables
chmod +x *.sh

# Démarrage complet avec interface web
./start_all_with_web_interface.sh

# Ou démarrage sans interface web
./start_all_with_web.sh
```

## 📁 Structure du Projet

```
Bacnet n8n/
├── static/                          # Pages web statiques
│   ├── app.html                     # Chat AI 24/7
│   └── app1.html                    # Interface BACnet
├── monitoring/                      # Configuration monitoring
│   ├── prometheus/
│   ├── grafana/
│   └── nginx/
├── venv/                           # Environnement virtuel Python
├── server.py                       # Serveur BACnet MCP principal
├── serveurWeb.py                   # Serveur web pour pages statiques
├── start_all_with_web_interface.bat # Démarrage complet Windows
├── start_all_with_web_interface.sh  # Démarrage complet Linux
└── ...
```

## 🎯 Applications Web

### 💬 **Chat AI 24/7** (`app.html`)
Interface de chat intelligent pour l'assistance technique BACnet :
- Chat en temps réel avec IA
- Configuration webhook n8n
- Interface moderne et responsive
- Support des sessions multiples

### 🏢 **Interface BACnet** (`app1.html`)
Interface web complète pour la gestion des appareils BACnet :
- Visualisation des appareils BACnet
- Contrôle des propriétés
- Monitoring en temps réel
- Interface intuitive

## 🔧 Configuration

### 1. **Configuration BACnet**
Éditez le fichier `.env` :
```env
# Configuration du serveur
PORT=8000
HOST=0.0.0.0
DEBUG=false

# Configuration n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat
API_BEARER=your_secret_token_here

# Configuration BACnet
TARGET_HOSTS=192.168.1.7,192.168.1.8
```

### 2. **Configuration Webhook n8n**
Dans l'interface n8n, configurez le webhook pour le chat AI :
- URL : `http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat`
- Méthode : POST
- Format : JSON

## 📊 Monitoring

### **Prometheus**
- Collecte de métriques BACnet
- Monitoring des performances
- Alertes configurables

### **Grafana**
- Dashboards BACnet personnalisés
- Visualisation des données
- Alertes en temps réel

### **Nginx**
- Reverse proxy
- Load balancing
- Sécurité et compression

## 🛠️ Scripts de Gestion

### **Démarrage Complet**
- `start_all_with_web_interface.bat/sh` : Tous les services + interface web
- `start_all_with_web.bat/sh` : Services principaux + monitoring

### **Démarrage Partiel**
- `start_all_local.bat/sh` : BACnet MCP + n8n seulement
- `start.bat/sh` : BACnet MCP seulement
- `start_n8n.bat/sh` : n8n seulement

### **Services Web**
- `install_web_components.bat/sh` : Prometheus + Grafana + Nginx
- `stop_web_services.bat/sh` : Arrêt des services web

## 🔍 Utilisation

### 1. **Accès à l'Interface Web**
Ouvrez http://localhost:8080 pour accéder au hub principal avec tous les liens.

### 2. **Chat AI 24/7**
- Accédez à http://localhost:8080/static/app.html
- Configurez le webhook n8n dans les paramètres
- Commencez à chatter avec l'IA

### 3. **Interface BACnet**
- Accédez à http://localhost:8080/static/app1.html
- Visualisez vos appareils BACnet
- Contrôlez les propriétés

### 4. **Monitoring**
- Prometheus : http://localhost:9090
- Grafana : http://localhost:3000 (admin/admin123)
- Configurez les dashboards selon vos besoins

## 🚨 Dépannage

### **Services non accessibles**
1. Vérifiez que tous les ports sont libres
2. Vérifiez les logs des services
3. Redémarrez les services un par un

### **Pages web non accessibles**
1. Vérifiez que le serveur web est démarré (port 8080)
2. Vérifiez que les fichiers HTML sont dans le dossier `static/`
3. Vérifiez les logs du serveur web

### **Problèmes Docker**
1. Vérifiez que Docker Desktop est démarré
2. Vérifiez les logs des conteneurs : `docker logs <container-name>`
3. Redémarrez les conteneurs : `docker restart <container-name>`

## 📞 Support

Pour plus d'informations :
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation n8n](https://docs.n8n.io/)
- [Documentation Prometheus](https://prometheus.io/docs/)
- [Documentation Grafana](https://grafana.com/docs/)

## 🎉 Félicitations !

Votre environnement BACnet MCP + n8n + Web Interface est maintenant opérationnel ! 🚀
