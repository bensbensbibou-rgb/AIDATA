# 🏢 BACnet MCP Server - Serveur BACnet Complet

Serveur BACnet MCP avec interface web moderne, automatisation n8n, monitoring et toutes les fonctionnalités avancées.

## 🚀 Démarrage Rapide

### Option 1: Docker (Recommandé) - Lancement Automatique MCP Inspector
```powershell
# Démarrer avec Docker ET lancer MCP Inspector automatiquement
.\start-docker.ps1
```

**✨ NOUVEAU :** Le script lance automatiquement MCP Inspector v0.13.0 dans une nouvelle fenêtre !

### Option 2: Local
```bash
# Installer les dépendances
pip install -r requirements.txt

# Démarrer le serveur
python app.py
```

## 🌐 Accès aux Services

### 🏠 Interface Web BACnet MCP
- **URL principale:** http://localhost:8000
- **Interface mobile:** http://localhost:8000/static/app.html
- **Documentation API:** http://localhost:8000/docs
- **Santé du serveur:** http://localhost:8000/health

### 🔧 Serveur MCP
- **Endpoint MCP:** http://localhost:8000/mcp/
- **API REST:** http://localhost:8000/api/tools/{tool_name}
- **Format:** JSON-RPC 2.0
- **Transport:** Streamable HTTP

### 🤖 Automatisation n8n
- **Interface n8n:** http://localhost:5678
- **Login:** admin / admin123
- **Webhook:** http://localhost:5678/webhook/18ef9e54-023b-4f25-a2aa-46922329a494/chat

### 📊 Monitoring & Dashboards
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000 (admin/admin123)
- **Adminer (DB):** http://localhost:8080
- **Redis:** localhost:6379

### 🔗 Reverse Proxy
- **Nginx:** http://localhost (redirige vers les services)

## 🔍 MCP Inspector - Connexion Automatique

### Lancement Automatique
Le script `start-docker.ps1` lance automatiquement MCP Inspector v0.13.0 !

### Configuration Manuelle
Si MCP Inspector ne se lance pas automatiquement :

```powershell
# Lancer MCP Inspector manuellement
npx @modelcontextprotocol/inspector@0.13.0
```

### Paramètres de Connexion
- **URL:** `http://localhost:8000/mcp/`
- **Method:** `HTTP`
- **Format:** `JSON-RPC 2.0`
- **Transport:** `Streamable HTTP`

### Étapes de Connexion
1. MCP Inspector s'ouvre automatiquement après le démarrage Docker
2. Cliquez sur "Add Server"
3. Entrez l'URL: `http://localhost:8000/mcp/`
4. Sélectionnez "HTTP" comme méthode
5. Cliquez sur "Connect"

## 🛠️ Fonctionnalités BACnet

### Outils de Base (42 outils disponibles)
- **Connectivité:** `ping`, `version`, `info`
- **Lecture/Écriture:** `read`, `write`, `read_all`, `write_pv`
- **Découverte:** `search`, `discover_devices`, `decouverte_objects`
- **TrendLog:** `read_trendlog`, `get_trendlog_info`, `read_trendlog_range`
- **Horaires:** `read_schedule`, `write_weekly_schedule_text`
- **Alarmes:** `alarm`, `acknowledge_alarm`, `list_nc_recipients`
- **COV:** `read_active_cov_subscriptions`, `subscribe_notifications_class`
- **Propriétés:** `read_property`, `write_property`, `read_all_properties`

### Fonctionnalités Avancées
- ✅ **Champs pré-remplis** dans MCP Inspector
- ✅ **Format de réponse standardisé**
- ✅ **Support complet JSON-RPC 2.0**
- ✅ **Gestion d'erreurs robuste**
- ✅ **Compatible MCP Inspector v0.13.0**

## 🐳 Configuration Docker

### Services Inclus
- **bacnet-mcp:** Serveur principal BACnet MCP
- **n8n:** Automatisation et webhooks
- **redis:** Cache et sessions
- **adminer:** Interface de base de données
- **nginx:** Reverse proxy
- **prometheus:** Monitoring
- **grafana:** Dashboards

### Commandes Docker
```powershell
# Démarrer avec MCP Inspector
.\start-docker.ps1

# Voir les logs
docker-compose logs -f bacnet-mcp

# Arrêter les services
docker-compose down

# Redémarrer le serveur MCP
docker-compose restart bacnet-mcp
```

## 📋 Tests et Validation

### Tests Automatiques
```powershell
# Test de toutes les fonctions BACnet
python test_all_functions.py

# Test MCP Inspector
python test_mcp_inspector.py

# Test des TrendLog
python test_trendlog.py
```

### Tests Manuel
```powershell
# Test de santé
curl http://localhost:8000/health

# Test MCP endpoint
curl http://localhost:8000/mcp/
```

## 🔧 Configuration

### Variables d'Environnement
Copiez `config.env.example` vers `.env` et configurez :
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/18ef9e54-023b-4f25-a2aa-46922329a494/chat
```

### Ports Utilisés
- **8000:** Serveur BACnet MCP
- **5678:** n8n
- **6379:** Redis
- **8080:** Adminer
- **9090:** Prometheus
- **3000:** Grafana
- **80:** Nginx

## 🐛 Dépannage

### Problèmes de Connexion
```powershell
# Vérifier que Docker fonctionne
docker-compose ps

# Vérifier les logs
docker-compose logs bacnet-mcp

# Redémarrer le service
docker-compose restart bacnet-mcp
```

### MCP Inspector ne se connecte pas
- Vérifiez que l'URL se termine par `/mcp/`
- Assurez-vous que le serveur Docker est démarré
- Vérifiez les logs pour les erreurs

### Ports déjà utilisés
```powershell
# Identifier les processus
netstat -ano | findstr :8000

# Tuer le processus
taskkill /PID <PID> /F
```

## 📚 Documentation

- **Guide MCP Inspector:** [MCP_Inspector_Guide.md](MCP_Inspector_Guide.md)
- **API Documentation:** http://localhost:8000/docs
- **Configuration Docker:** [docker-compose.yml](docker-compose.yml)

## 🎯 Statut Final

✅ **Serveur BACnet MCP COMPLET et OPÉRATIONNEL**
✅ **42 outils BACnet disponibles**
✅ **MCP Inspector 100% compatible avec lancement automatique**
✅ **Interface web moderne**
✅ **Automatisation n8n intégrée**
✅ **Monitoring complet (Prometheus/Grafana)**
✅ **Dockerisation complète**
✅ **Champs pré-remplis pour faciliter l'utilisation**

---

**Votre serveur BACnet MCP est maintenant prêt pour la production ! 🚀**
