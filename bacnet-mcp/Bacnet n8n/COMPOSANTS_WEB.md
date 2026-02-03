# 🌐 Composants Web - BACnet MCP + n8n

## 📦 Services Web Ajoutés

### 🔍 **Prometheus** (Monitoring)
- **Image** : `prom/prometheus:latest`
- **Port** : 9090
- **URL** : http://localhost:9090
- **Fonction** : Collecte et stockage des métriques
- **Configuration** : `prometheus_bacnet.yml`

### 📊 **Grafana** (Dashboards)
- **Image** : `grafana/grafana:latest`
- **Port** : 3000
- **URL** : http://localhost:3000
- **Identifiants** : admin/admin123
- **Fonction** : Visualisation des métriques et dashboards
- **Configuration** : `grafana_dashboards.md`

### 🌐 **Nginx** (Reverse Proxy)
- **Image** : `nginx:alpine`
- **Ports** : 80, 443
- **URL** : http://localhost:80
- **Fonction** : Reverse proxy, load balancing, sécurité
- **Configuration** : `nginx_bacnet.conf`

## 🚀 Scripts de Gestion

### Installation
- `install_web_components.bat` - Windows
- `install_web_components.sh` - Linux

### Démarrage Complet
- `start_all_with_web.bat` - Windows
- `start_all_with_web.sh` - Linux

### Arrêt
- `stop_web_services.bat` - Windows
- `stop_web_services.sh` - Linux

## 📁 Structure des Fichiers

```
Bacnet n8n/
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   └── nginx/
│       └── nginx.conf
├── prometheus_bacnet.yml      # Configuration Prometheus optimisée
├── nginx_bacnet.conf          # Configuration Nginx optimisée
├── grafana_dashboards.md      # Guide des dashboards
├── install_web_components.bat # Installation Windows
├── install_web_components.sh  # Installation Linux
├── start_all_with_web.bat     # Démarrage complet Windows
├── start_all_with_web.sh      # Démarrage complet Linux
├── stop_web_services.bat      # Arrêt Windows
└── stop_web_services.sh       # Arrêt Linux
```

## 🔧 Configuration Prometheus

### Métriques Surveillées
- **BACnet MCP Server** : Requêtes, temps de réponse, erreurs
- **n8n** : Workflows, webhooks, performance
- **Système** : CPU, mémoire, disque, réseau
- **Appareils BACnet** : Découverte, connectivité

### Endpoints de Scraping
```yaml
- job_name: 'bacnet-mcp-server'
  targets: ['localhost:8050']
  metrics_path: '/metrics'

- job_name: 'n8n'
  targets: ['localhost:5678']
  metrics_path: '/metrics'

- job_name: 'prometheus'
  targets: ['localhost:9090']
```

## 📊 Dashboards Grafana

### Dashboard BACnet MCP
- Requêtes par seconde
- Temps de réponse
- Appareils découverts
- Erreurs BACnet

### Dashboard n8n
- Workflows exécutés
- Temps d'exécution
- Webhooks reçus

### Dashboard Système
- Utilisation CPU/Mémoire
- Espace disque
- Trafic réseau

## 🌐 Configuration Nginx

### Routes Configurées
- `/` → Serveur BACnet MCP (port 8050)
- `/n8n/` → Interface n8n (port 5678)
- `/webhook/` → Webhooks n8n (rate limited)
- `/prometheus/` → Prometheus (port 9090)
- `/grafana/` → Grafana (port 3000)

### Fonctionnalités
- **Rate Limiting** : Protection contre les abus
- **Compression Gzip** : Optimisation des performances
- **Headers de Sécurité** : Protection XSS, CSRF
- **WebSocket Support** : Pour n8n et Grafana
- **Load Balancing** : Distribution de charge

## 🚨 Alertes Prometheus

### Alertes Configurées
- **Serveur Down** : BACnet MCP indisponible
- **Temps de Réponse** : Performance dégradée
- **Erreurs BACnet** : Problèmes de communication
- **Ressources Système** : CPU/Mémoire élevés

## 🔄 Intégration

### Flux de Données
```
Appareils BACnet → BACnet MCP Server → n8n → Prometheus → Grafana
                                    ↓
                                 Nginx (Reverse Proxy)
```

### Métriques Exposées
- **BACnet** : Requêtes, erreurs, appareils
- **MCP** : Sessions, outils, performance
- **n8n** : Workflows, webhooks, exécutions
- **Système** : Ressources, réseau, disque

## 🛠️ Maintenance

### Logs
```bash
# Prometheus
docker logs prometheus-monitoring

# Grafana
docker logs grafana-dashboard

# Nginx
docker logs nginx-proxy
```

### Sauvegarde
```bash
# Configuration Prometheus
cp monitoring/prometheus/prometheus.yml backup/

# Dashboards Grafana
curl -X GET http://localhost:3000/api/dashboards/db/bacnet-mcp-overview > backup/dashboard.json
```

### Mise à Jour
```bash
# Arrêter les services
./stop_web_services.sh

# Mettre à jour les images
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull nginx:alpine

# Redémarrer
./install_web_components.sh
```

## 📞 Support

### Documentation
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)
- [Nginx](https://nginx.org/en/docs/)

### Dépannage
1. Vérifiez les logs Docker
2. Testez les endpoints individuels
3. Vérifiez la configuration
4. Consultez les métriques Prometheus

### Métriques Utiles
```promql
# Santé du serveur BACnet
up{job="bacnet-mcp-server"}

# Requêtes par seconde
rate(bacnet_requests_total[5m])

# Temps de réponse 95e percentile
histogram_quantile(0.95, rate(bacnet_request_duration_seconds_bucket[5m]))
```
