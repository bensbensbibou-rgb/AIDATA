# 🚀 Guide n8n Local - BACnet MCP

## 📋 Vue d'ensemble

Ce guide explique comment configurer et utiliser n8n avec le projet BACnet MCP en local, en remplaçant l'installation Docker.

## 🔧 Configuration n8n Local

### 1. **Dossier de Données Local**
- **Dossier** : `n8n-data/` (dans le projet "Bacnet n8n")
- **Contenu** : Workflows, credentials, base de données
- **Avantage** : Données persistantes et accessibles localement

### 2. **Scripts de Démarrage**

#### **Démarrage n8n seul**
```cmd
# Windows
start_n8n_local.bat

# Linux
./start_n8n_local.sh
```

#### **Démarrage complet avec interface web**
```cmd
# Windows
start_all_with_web_interface.bat

# Linux
./start_all_with_web_interface.sh
```

## 🔄 Migration depuis Docker

### **Option 1 : Import depuis Docker (si disponible)**
```cmd
# Windows
import_n8n_from_docker.bat

# Linux
./import_n8n_from_docker.sh
```

### **Option 2 : Configuration manuelle**
1. **Accédez à n8n** : http://localhost:5678
2. **Créez vos workflows** BACnet
3. **Configurez les webhooks** pour le chat AI
4. **Sauvegardez** - les données sont automatiquement dans `n8n-data/`

## 🎯 Workflows BACnet Recommandés

### **1. Webhook Chat AI**
- **Trigger** : Webhook
- **URL** : `http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat`
- **Fonction** : Traitement des messages du chat AI

### **2. Monitoring BACnet**
- **Trigger** : Schedule (toutes les 5 minutes)
- **Action** : Lecture des propriétés BACnet
- **Sortie** : Métriques vers Prometheus

### **3. Alertes BACnet**
- **Trigger** : Webhook ou Schedule
- **Condition** : Valeurs hors limites
- **Action** : Notification (email, Slack, etc.)

## 🔗 Intégration avec le Projet

### **Chat AI 24/7**
1. **Ouvrez** : http://localhost:8080/static/app.html
2. **Configurez** le webhook n8n dans les paramètres
3. **Testez** le chat avec l'IA

### **Interface BACnet**
1. **Ouvrez** : http://localhost:8080/static/app1.html
2. **Visualisez** les appareils BACnet
3. **Contrôlez** les propriétés

### **Monitoring**
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3000 (admin/admin123)

## 📁 Structure des Données

```
Bacnet n8n/
├── n8n-data/                    # Données n8n locales
│   ├── workflows.json           # Workflows exportés
│   ├── credentials.json         # Credentials
│   ├── database.sqlite          # Base de données
│   └── ...
├── static/                      # Pages web
├── monitoring/                  # Configuration monitoring
└── ...
```

## 🛠️ Scripts Disponibles

### **Démarrage**
- `start_n8n_local.bat/sh` : n8n seul avec données locales
- `start_all_with_web_interface.bat/sh` : Tous les services

### **Migration**
- `import_n8n_from_docker.bat/sh` : Import depuis Docker

### **Gestion**
- `stop_web_services.bat/sh` : Arrêt des services web

## 🔍 Utilisation Avancée

### **Export/Import de Workflows**
```bash
# Export
n8n export:workflow --all --output=workflows.json

# Import
n8n import:workflow --input=workflows.json
```

### **Backup des Données**
```bash
# Copier le dossier n8n-data
cp -r n8n-data/ backup-n8n-data/
```

### **Configuration Avancée**
- **Variables d'environnement** : Modifiez les scripts pour ajouter des options
- **Base de données** : SQLite par défaut, PostgreSQL possible
- **Plugins** : Installation de nodes personnalisés

## 🚨 Dépannage

### **n8n ne démarre pas**
1. Vérifiez que Node.js est installé
2. Vérifiez que le port 5678 est libre
3. Vérifiez les logs dans la console

### **Données perdues**
1. Vérifiez le dossier `n8n-data/`
2. Restaurez depuis un backup
3. Reconfigurez les workflows

### **Webhooks non fonctionnels**
1. Vérifiez que n8n est démarré
2. Vérifiez l'URL du webhook
3. Testez avec curl ou Postman

## 📞 Support

Pour plus d'informations :
- [Documentation n8n](https://docs.n8n.io/)
- [n8n Community](https://community.n8n.io/)
- [n8n GitHub](https://github.com/n8n-io/n8n)

## 🎉 Félicitations !

Votre n8n est maintenant configuré localement avec le projet BACnet MCP ! 🚀
