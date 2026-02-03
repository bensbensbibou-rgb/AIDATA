# 📊 Configuration Grafana - Dashboards BACnet

## 🔧 Configuration Initiale

### 1. Accès à Grafana
- **URL** : http://localhost:3000
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

### 2. Ajouter Prometheus comme Source de Données

1. Allez dans **Configuration** → **Data Sources**
2. Cliquez sur **Add data source**
3. Sélectionnez **Prometheus**
4. Configurez :
   - **URL** : `http://localhost:9090`
   - **Access** : Server (default)
5. Cliquez sur **Save & Test**

## 📈 Dashboards Recommandés

### Dashboard BACnet MCP Server

**ID** : `bacnet-mcp-overview`

```json
{
  "dashboard": {
    "title": "BACnet MCP Server Overview",
    "panels": [
      {
        "title": "Requêtes MCP par seconde",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mcp_requests_total[5m])",
            "legendFormat": "{{method}}"
          }
        ]
      },
      {
        "title": "Temps de réponse MCP",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mcp_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Appareils BACnet découverts",
        "type": "stat",
        "targets": [
          {
            "expr": "bacnet_devices_discovered",
            "legendFormat": "Devices"
          }
        ]
      },
      {
        "title": "Erreurs BACnet",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bacnet_errors_total[5m])",
            "legendFormat": "{{error_type}}"
          }
        ]
      }
    ]
  }
}
```

### Dashboard n8n Workflows

**ID** : `n8n-workflows`

```json
{
  "dashboard": {
    "title": "n8n Workflows BACnet",
    "panels": [
      {
        "title": "Workflows exécutés",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(n8n_workflows_executed_total[5m])",
            "legendFormat": "{{workflow_name}}"
          }
        ]
      },
      {
        "title": "Temps d'exécution des workflows",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(n8n_workflow_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Webhooks reçus",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(n8n_webhooks_received_total[5m])",
            "legendFormat": "Webhooks/sec"
          }
        ]
      }
    ]
  }
}
```

### Dashboard Système

**ID** : `system-overview`

```json
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU %"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "Memory %"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
            "legendFormat": "{{mountpoint}}"
          }
        ]
      },
      {
        "title": "Network Traffic",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "{{device}} - Receive"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "{{device}} - Transmit"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Alertes Recommandées

### Alerte : Serveur BACnet MCP Down

```yaml
groups:
  - name: bacnet-mcp
    rules:
      - alert: BACnetMCPServerDown
        expr: up{job="bacnet-mcp-server"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "BACnet MCP Server is down"
          description: "The BACnet MCP server has been down for more than 1 minute"
```

### Alerte : Temps de réponse élevé

```yaml
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(mcp_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 2 seconds"
```

### Alerte : Erreurs BACnet

```yaml
      - alert: BACnetErrors
        expr: rate(bacnet_errors_total[5m]) > 0.1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "BACnet errors detected"
          description: "Error rate is above 0.1 errors per second"
```

## 📊 Métriques BACnet Personnalisées

### Métriques à Exposer

Ajoutez ces métriques à votre serveur BACnet MCP :

```python
# Exemple de métriques Prometheus
from prometheus_client import Counter, Histogram, Gauge

# Compteurs
bacnet_requests_total = Counter('bacnet_requests_total', 'Total BACnet requests', ['method', 'device'])
bacnet_errors_total = Counter('bacnet_errors_total', 'Total BACnet errors', ['error_type'])

# Histogrammes
bacnet_request_duration = Histogram('bacnet_request_duration_seconds', 'BACnet request duration')

# Jauges
bacnet_devices_discovered = Gauge('bacnet_devices_discovered', 'Number of discovered BACnet devices')
bacnet_connections_active = Gauge('bacnet_connections_active', 'Number of active BACnet connections')
```

## 🔄 Importation Automatique

### Script d'Importation

```bash
#!/bin/bash

# Attendre que Grafana soit prêt
sleep 30

# Importer les dashboards
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @bacnet-mcp-dashboard.json \
  http://localhost:3000/api/dashboards/db

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @n8n-workflows-dashboard.json \
  http://localhost:3000/api/dashboards/db
```

## 🎯 Utilisation Avancée

### Variables de Dashboard

Ajoutez ces variables à vos dashboards :

- `$device` : Liste des appareils BACnet
- `$workflow` : Liste des workflows n8n
- `$time_range` : Période de temps

### Requêtes PromQL Utiles

```promql
# Top 5 des appareils les plus actifs
topk(5, sum by (device) (rate(bacnet_requests_total[5m])))

# Temps de réponse par méthode
histogram_quantile(0.95, sum by (method) (rate(bacnet_request_duration_seconds_bucket[5m])))

# Taux d'erreur par appareil
rate(bacnet_errors_total[5m]) / rate(bacnet_requests_total[5m])
```

## 📞 Support

Pour plus d'informations :
- [Documentation Grafana](https://grafana.com/docs/)
- [Documentation Prometheus](https://prometheus.io/docs/)
- [PromQL Reference](https://prometheus.io/docs/prometheus/latest/querying/basics/)
