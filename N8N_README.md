# Installation n8n avec Docker

## 🚀 Démarrage rapide

### Lancer n8n
```bash
docker-compose -f docker-compose.n8n.yml up -d
```

### Arrêter n8n
```bash
docker-compose -f docker-compose.n8n.yml down
```

### Redémarrer n8n
```bash
docker-compose -f docker-compose.n8n.yml restart
```

### Voir les logs
```bash
docker-compose -f docker-compose.n8n.yml logs -f
```

## 🔐 Accès à n8n

- **URL**: http://localhost:5678
- **Utilisateur**: admin
- **Mot de passe**: admin123

⚠️ **Note de sécurité**: Changez ces identifiants pour une utilisation en production !

## 📁 Volumes et persistance

Les données de n8n sont stockées dans :
- Volume Docker: `n8n_data` (données persistantes)
- Dossier local: `./n8n/workflows` (workflows exportés)

## ⚙️ Configuration

Les variables d'environnement importantes :
- `N8N_BASIC_AUTH_USER`: Nom d'utilisateur (défaut: admin)
- `N8N_BASIC_AUTH_PASSWORD`: Mot de passe (défaut: admin123)
- `N8N_PORT`: Port d'écoute (défaut: 5678)
- `GENERIC_TIMEZONE`: Fuseau horaire (défaut: Europe/Paris)

## 🔧 Commandes utiles

### Vérifier le statut
```bash
docker ps | findstr n8n
```

### Accéder au conteneur
```bash
docker exec -it n8n sh
```

### Supprimer complètement n8n (⚠️ supprime les données)
```bash
docker-compose -f docker-compose.n8n.yml down -v
```

## 📚 Documentation officielle

- [Documentation n8n](https://docs.n8n.io/)
- [Tutoriels n8n](https://docs.n8n.io/courses/)
- [Forum communautaire](https://community.n8n.io/)
