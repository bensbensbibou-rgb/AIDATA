# 📁 Projet BACnet MCP + n8n - Copie Locale

## ✅ Copie Terminée

Ce dossier contient une copie complète du projet BACnet MCP Server avec n8n, prête pour une utilisation locale sans Docker.

## 📦 Contenu du Projet

### 🐍 Serveur BACnet MCP
- **`server.py`** : Serveur principal BACnet MCP (175KB)
- **`decode.py`** : Décodeur BACnet (20KB)
- **`requirements.txt`** : Dépendances Python
- **`test_server.py`** : Script de test des endpoints

### 🔧 Scripts d'Installation
- **`install_windows.bat`** : Installation automatique Windows
- **`install_linux.sh`** : Installation automatique Linux
- **`start.bat/sh`** : Démarrage du serveur BACnet
- **`start_n8n.bat/sh`** : Démarrage de n8n
- **`start_all_local.bat/sh`** : Démarrage des deux services

### 📚 Documentation
- **`README_BACNET_N8N.md`** : Documentation complète
- **`DEMARRAGE_RAPIDE.md`** : Guide de démarrage rapide
- **`INSTALLATION.md`** : Guide d'installation détaillé

### ⚙️ Configuration
- **`.env`** : Configuration du projet (copié depuis config.env.example)
- **`config.env.example`** : Exemple de configuration
- **`n8n.env`** : Configuration n8n

### 🐳 Fichiers Docker (pour référence)
- **`Dockerfile`** : Configuration Docker
- **`docker-compose.yml`** : Orchestration Docker
- **Scripts Docker** : Pour utilisation avec conteneurs

## 🚀 Démarrage Rapide

### Windows
```cmd
# Installation
install_windows.bat

# Démarrage des services
start_all_local.bat
```

### Linux
```bash
# Installation
chmod +x *.sh
./install_linux.sh

# Démarrage des services
./start_all_local.sh
```

## 🌐 Services Disponibles

- **Serveur BACnet MCP** : http://localhost:8050
- **Interface n8n** : http://localhost:5678
- **Documentation API** : http://localhost:8050/docs
- **Santé du serveur** : http://localhost:8050/health

## 🔌 Intégration

Le serveur BACnet MCP est pré-configuré pour envoyer des données à n8n via webhook :
- **URL Webhook** : http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat

## 📊 Avantages de l'Installation Locale

1. **Performance** : Plus rapide que Docker
2. **Simplicité** : Pas de gestion de conteneurs
3. **Débogage** : Logs directs dans le terminal
4. **Flexibilité** : Modification facile du code
5. **Ressources** : Moins de surcharge système

## 🛠️ Développement

- Modifiez `server.py` pour ajouter des fonctionnalités
- Créez des workflows n8n personnalisés
- Testez avec `test_server.py`
- Consultez la documentation API

## 📞 Support

En cas de problème :
1. Vérifiez les logs dans le terminal
2. Consultez `README_BACNET_N8N.md`
3. Testez avec `test_server.py`
4. Vérifiez la configuration dans `.env`

---
**Projet copié le** : 27 août 2025  
**Version** : BACnet MCP Server v1.4.2 + n8n  
**Installation** : Locale (sans Docker)
