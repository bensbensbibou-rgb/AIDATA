# ✅ n8n installé avec succès (SANS Docker)

## 🎉 Installation réussie !

n8n version **1.122.4** a été installé avec npm.

---

## 🚀 Démarrage rapide

### Option 1 : Avec le fichier batch (le plus simple)
Double-cliquez sur :
```
start-n8n.bat
```

### Option 2 : Avec PowerShell/Terminal
```bash
n8n start
```

### Option 3 : Avec configuration personnalisée
```powershell
# Définir les variables d'environnement
$env:N8N_BASIC_AUTH_ACTIVE = "true"
$env:N8N_BASIC_AUTH_USER = "admin"
$env:N8N_BASIC_AUTH_PASSWORD = "admin123"

# Démarrer n8n
n8n start
```

---

## 🔐 Accès à n8n

Une fois n8n démarré, accédez-y via votre navigateur :

- **URL**: http://localhost:5678
- **Utilisateur**: admin
- **Mot de passe**: admin123

⚠️ **Note**: Changez ces identifiants pour une utilisation en production !

---

## 📁 Emplacement des données

Les données de n8n sont stockées dans :
```
C:\Users\Mbensale\.n8n
```

Ce dossier contient :
- ✅ Vos workflows
- ✅ Vos credentials
- ✅ La base de données
- ✅ Les paramètres

---

## ⚙️ Configuration avancée

### Changer le port
```powershell
$env:N8N_PORT = "8080"
n8n start
```

### Désactiver l'authentification (développement uniquement)
```powershell
$env:N8N_BASIC_AUTH_ACTIVE = "false"
n8n start
```

### Changer les identifiants
```powershell
$env:N8N_BASIC_AUTH_USER = "votre_nom"
$env:N8N_BASIC_AUTH_PASSWORD = "votre_mot_de_passe"
n8n start
```

---

## 🛠️ Commandes utiles

```bash
# Démarrer n8n
n8n start

# Voir la version
n8n --version

# Voir l'aide
n8n --help

# Exporter un workflow
n8n export:workflow --id=<workflow_id> --output=workflow.json

# Importer un workflow
n8n import:workflow --input=workflow.json

# Mettre à jour n8n
npm update -g n8n
```

---

## 🔄 Mise à jour de n8n

Pour mettre à jour n8n vers la dernière version :
```bash
npm update -g n8n
```

---

## ❌ Désinstallation

Si vous souhaitez désinstaller n8n :
```bash
npm uninstall -g n8n
```

Pour supprimer également les données :
```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.n8n"
```

---

## 🆘 Résolution de problèmes

### n8n ne démarre pas
1. Vérifiez que le port 5678 n'est pas utilisé :
   ```powershell
   netstat -ano | findstr :5678
   ```

2. Essayez un autre port :
   ```powershell
   $env:N8N_PORT = "8080"
   n8n start
   ```

### Erreur "command not found"
Node.js n'est pas dans le PATH. Réinstallez Node.js depuis https://nodejs.org/

### Les workflows ne se sauvegardent pas
Vérifiez que vous avez les permissions d'écriture dans `C:\Users\Mbensale\.n8n`

---

## 📚 Ressources

- [Documentation officielle n8n](https://docs.n8n.io/)
- [Tutoriels vidéo](https://docs.n8n.io/courses/)
- [Forum communautaire](https://community.n8n.io/)
- [Templates de workflows](https://n8n.io/workflows/)
- [Liste des intégrations](https://n8n.io/integrations/)

---

## 🎓 Premiers pas

1. **Créer votre premier workflow**
   - Connectez-vous à http://localhost:5678
   - Cliquez sur "Create New Workflow"
   - Ajoutez des nodes et connectez-les

2. **Explorer les templates**
   - Allez dans "Workflows" > "Templates"
   - Importez un template prêt à l'emploi

3. **Apprendre avec les tutoriels**
   - Visitez https://docs.n8n.io/courses/
   - Suivez le cours "Level 1"

---

## 💡 Avantages de la version npm (vs Docker)

✅ Pas besoin de virtualisation
✅ Démarrage plus rapide
✅ Utilisation de ressources plus faible
✅ Installation plus simple
✅ Mise à jour plus facile

---

## 🚀 Prochaines étapes

1. ✅ n8n est installé
2. ⏭️ Lancez `start-n8n.bat` ou `n8n start`
3. ⏭️ Ouvrez http://localhost:5678
4. ⏭️ Créez votre premier workflow !

**Bon coding avec n8n ! 🎉**
