# 🚀 Guide de Démarrage Automatique - BACnet MCP

## 📋 Scripts de Gestion

### **1. Démarrage Complet Automatique**
```cmd
start_all_automatic.bat
```
**Fait :**
- ✅ Arrête les processus existants
- ✅ Lance le serveur BACnet MCP
- ✅ Lance l'interface web
- ✅ Lance n8n via Docker
- ✅ Lance Prometheus, Grafana, Nginx
- ✅ Lance l'inspecteur MCP

### **2. Arrêt de Tous les Services**
```cmd
stop_all_services.bat
```
**Fait :**
- ✅ Arrête tous les processus Python
- ✅ Arrête tous les processus Node.js
- ✅ Arrête tous les conteneurs Docker
- ✅ Ferme toutes les fenêtres de commande

### **3. Vérification de l'État**
```cmd
check_all_services.bat
```
**Affiche :**
- ✅ État des processus Python/Node.js
- ✅ État des conteneurs Docker
- ✅ État de tous les ports
- ✅ URLs d'accès

### **4. Configuration du Démarrage Automatique**
```cmd
create_startup_shortcut.bat
```
**Fait :**
- ✅ Crée un raccourci dans le dossier de démarrage Windows
- ✅ Lance automatiquement tous les services au démarrage
- ✅ Configure le démarrage en arrière-plan

## 🌐 Services Disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **BACnet MCP** | http://localhost:8050/mcp/ | Serveur principal BACnet |
| **Interface Web** | http://localhost:8080 | Hub principal |
| **n8n** | http://localhost:5678 | Interface d'automatisation |
| **MCP Inspector** | http://localhost:6274 | Inspection des services MCP |
| **Prometheus** | http://localhost:9090 | Monitoring |
| **Grafana** | http://localhost:3000 | Dashboards |

## 🔄 Démarrage Automatique Windows

### **Activation :**
1. Exécutez `create_startup_shortcut.bat`
2. Confirmez l'installation
3. Le raccourci est créé dans le dossier de démarrage

### **Désactivation :**
1. Appuyez sur `Win + R`
2. Tapez : `shell:startup`
3. Supprimez le fichier `BACnet_MCP_AutoStart.lnk`

## 📁 Structure des Scripts

```
Bacnet n8n/
├── start_all_automatic.bat      # Démarrage complet
├── stop_all_services.bat        # Arrêt complet
├── check_all_services.bat       # Vérification état
├── create_startup_shortcut.bat  # Configuration auto-démarrage
├── start_all_with_web_interface.bat  # Démarrage manuel
└── GUIDE_DEMARRAGE_AUTOMATIQUE.md   # Ce guide
```

## 🎯 Utilisation Quotidienne

### **Première Utilisation :**
1. **Installez** : `installer.bat`
2. **Configurez l'auto-démarrage** : `create_startup_shortcut.bat`
3. **Testez** : `start_all_automatic.bat`

### **Utilisation Quotidienne :**
- **Au démarrage** : Tout se lance automatiquement
- **Vérification** : `check_all_services.bat`
- **Arrêt** : `stop_all_services.bat`

### **En Cas de Problème :**
1. **Arrêtez tout** : `stop_all_services.bat`
2. **Redémarrez** : `start_all_automatic.bat`
3. **Vérifiez** : `check_all_services.bat`

## ⚡ Avantages

- ✅ **Démarrage automatique** au boot Windows
- ✅ **Gestion centralisée** de tous les services
- ✅ **Vérification d'état** en un clic
- ✅ **Arrêt propre** de tous les services
- ✅ **Fenêtres séparées** pour chaque service
- ✅ **Logs visibles** pour le débogage

## 🔧 Dépannage

### **Service ne démarre pas :**
1. Vérifiez les logs dans les fenêtres de commande
2. Utilisez `check_all_services.bat`
3. Redémarrez avec `start_all_automatic.bat`

### **Port déjà utilisé :**
1. Arrêtez tout : `stop_all_services.bat`
2. Attendez 10 secondes
3. Redémarrez : `start_all_automatic.bat`

### **Docker ne répond pas :**
1. Vérifiez que Docker Desktop est démarré
2. Redémarrez Docker Desktop
3. Relancez : `start_all_automatic.bat`

## 🎉 Félicitations !

Votre environnement BACnet MCP est maintenant configuré pour un démarrage automatique complet !

**Prochaines étapes :**
1. Testez le démarrage automatique
2. Configurez vos workflows n8n
3. Personnalisez vos dashboards Grafana
4. Explorez les outils BACnet via l'inspecteur MCP

**Support :**
- Vérification : `check_all_services.bat`
- Redémarrage : `start_all_automatic.bat`
- Arrêt : `stop_all_services.bat`
