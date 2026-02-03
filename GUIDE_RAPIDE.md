# 🚀 GUIDE RAPIDE : Activer la virtualisation

## ⚡ Résumé en 3 étapes

### 📝 Étape 1 : Activer les fonctionnalités Windows (5 min)

**Exécutez en tant qu'ADMINISTRATEUR (clic droit > Exécuter en tant qu'administrateur) :**

```
activer-virtualisation.bat
```

Ce script va :
- ✅ Activer Hyper-V
- ✅ Activer WSL
- ✅ Activer Virtual Machine Platform

**⚠️ Important :** Acceptez le redémarrage à la fin

---

### 🔧 Étape 2 : Activer dans le BIOS (5 min)

Après le redémarrage :

1. **Redémarrez à nouveau le PC**
2. **Appuyez sur une de ces touches au démarrage** (selon votre marque) :
   - HP → `F10` ou `Esc`
   - Dell → `F2`
   - Lenovo → `F1`
   - Asus/Acer → `F2` ou `Del`
   - MSI → `Del`

3. **Dans le BIOS, cherchez et ACTIVEZ :**
   ```
   Intel VT-x  (Intel)
   ou
   AMD-V       (AMD)
   ```
   
   💡 Souvent dans : `Advanced` → `CPU Configuration`

4. **Sauvegardez** en appuyant sur `F10`

---

### 🐳 Étape 3 : Configurer Docker Desktop (2 min)

Après le redémarrage :

1. **Lancez Docker Desktop**
2. **Settings** ⚙️ → **General**
3. ✅ Cochez `Use the WSL 2 based engine`
4. **Apply & Restart**

---

## ✅ Vérification finale

Ouvrez PowerShell et tapez :

```powershell
docker run hello-world
```

Si vous voyez `Hello from Docker!` → **C'est bon ! ✅**

---

## 🎯 Ensuite : Lancer n8n avec Docker

```powershell
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n -e N8N_BASIC_AUTH_ACTIVE=true -e N8N_BASIC_AUTH_USER=admin -e N8N_BASIC_AUTH_PASSWORD=admin123 n8nio/n8n:latest
```

Accédez à : **http://localhost:5678**

---

## 📂 Fichiers créés pour vous

| Fichier | Description |
|---------|-------------|
| `activer-virtualisation.bat` | ⚡ Active les fonctionnalités Windows automatiquement |
| `ACTIVATION_VIRTUALISATION.md` | 📖 Guide détaillé avec captures et troubleshooting |
| `start-n8n.bat` | 🚀 Lance n8n (version npm, sans Docker) |
| `docker-compose.n8n.yml` | 🐳 Configuration Docker Compose pour n8n |

---

## ❓ Besoin d'aide ?

- 📖 Voir `ACTIVATION_VIRTUALISATION.md` pour le guide complet
- 🔍 Problème BIOS ? Cherchez "enable virtualization [VOTRE_MARQUE_PC]" sur YouTube
- 💻 PC professionnel ? Contactez votre service IT

---

## 🔄 Alternative si ça ne marche pas

n8n est déjà installé SANS Docker :

```bash
n8n start
```

ou double-cliquez sur `start-n8n.bat`

Accédez à : **http://localhost:5678**
- Utilisateur : `admin`
- Mot de passe : `admin123`

---

**Bon courage ! 💪**
