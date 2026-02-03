# 🔧 Guide complet : Activer la virtualisation pour Docker

## 📋 Étapes à suivre

### ✅ Étape 1 : Vérifier le support de virtualisation

Avant de modifier le BIOS, vérifions si votre CPU supporte la virtualisation.

Ouvrez PowerShell **en tant qu'administrateur** et exécutez :

```powershell
# Vérifier le support de virtualisation
systeminfo | findstr /i "virtualization"
```

**Résultats possibles :**
- ✅ "Virtualization Enabled In Firmware: **Yes**" → La virtualisation est déjà activée ! Passez à l'Étape 3
- ⚠️ "Virtualization Enabled In Firmware: **No**" → Passez à l'Étape 2
- ❌ Si rien n'apparaît → Votre CPU ne supporte peut-être pas la virtualisation

---

### ✅ Étape 2 : Activer la virtualisation dans le BIOS/UEFI

#### 2.1 Identifier la touche pour entrer dans le BIOS

La touche pour entrer dans le BIOS dépend de votre fabricant :

| Fabricant | Touches communes |
|-----------|------------------|
| **HP** | `F10`, `Esc` puis `F10` |
| **Dell** | `F2`, `F12` |
| **Lenovo** | `F1`, `F2`, `Enter` puis `F1` |
| **Asus** | `F2`, `Del` |
| **Acer** | `F2`, `Del` |
| **MSI** | `Del` |
| **Toshiba** | `F2` |
| **Samsung** | `F2` |

#### 2.2 Redémarrer et entrer dans le BIOS

1. **Redémarrez votre PC**
2. **Appuyez immédiatement et répétitivement** sur la touche BIOS dès que l'écran s'allume
3. **Vous devriez voir l'interface du BIOS/UEFI**

#### 2.3 Trouver l'option de virtualisation

L'option peut se trouver dans différents menus selon le fabricant :

**Cherchez dans ces menus :**
- 📁 `Advanced` > `CPU Configuration`
- 📁 `Configuration` > `Intel Virtualization Technology`
- 📁 `Security` > `Virtualization`
- 📁 `System Configuration` > `Virtualization Technology`
- 📁 `Processor` > `Intel Virtualization Technology`

**Noms possibles de l'option :**
- **Intel** : `Intel VT-x`, `Intel Virtualization Technology`, `Vanderpool Technology`
- **AMD** : `AMD-V`, `SVM Mode`, `Secure Virtual Machine`

#### 2.4 Activer la virtualisation

1. Sélectionnez l'option de virtualisation
2. Changez la valeur de `Disabled` à **`Enabled`**
3. **Important** : Cherchez aussi `VT-d` ou `Intel VT for Directed I/O` et activez-le si disponible

#### 2.5 Sauvegarder et quitter

1. Appuyez sur `F10` (généralement) pour sauvegarder
2. Confirmez avec `Yes` ou `OK`
3. Le PC va redémarrer

---

### ✅ Étape 3 : Activer les fonctionnalités Windows requises

Une fois Windows redémarré, ouvrez **PowerShell en tant qu'administrateur** :

**Clic droit sur le menu Démarrer** > **Terminal (Administrateur)** ou **Windows PowerShell (Administrateur)**

Exécutez ces commandes **une par une** :

```powershell
# 1. Activer Hyper-V
dism.exe /online /enable-feature /featurename:Microsoft-Hyper-V-All /all /norestart

# 2. Activer Windows Subsystem for Linux (WSL)
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 3. Activer Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 4. Redémarrer le PC
Restart-Computer
```

⚠️ **Le PC va redémarrer automatiquement après la dernière commande**

---

### ✅ Étape 4 : Installer et configurer WSL2

Après le redémarrage, ouvrez à nouveau **PowerShell en tant qu'administrateur** :

```powershell
# Installer WSL2
wsl --install

# Définir WSL2 comme version par défaut
wsl --set-default-version 2

# Vérifier l'installation
wsl --status
```

Si WSL demande un redémarrage, faites-le.

---

### ✅ Étape 5 : Configurer Docker Desktop

1. **Lancez Docker Desktop**
2. Si Docker demande à installer WSL2 ou des composants, acceptez
3. Allez dans **Settings** (icône ⚙️)
4. Dans **General** :
   - ✅ Cochez `Use the WSL 2 based engine`
5. Dans **Resources** > **WSL Integration** :
   - ✅ Activez l'intégration avec vos distributions WSL
6. Cliquez sur **Apply & Restart**

---

### ✅ Étape 6 : Vérifier que tout fonctionne

Ouvrez PowerShell et testez :

```powershell
# Vérifier Docker
docker --version
docker run hello-world

# Vérifier la virtualisation
systeminfo | findstr /i "virtualization"
```

**Résultat attendu :**
```
A hypervisor has been detected. Features required for Hyper-V will not be displayed.
Virtualization Enabled In Firmware: Yes
```

---

## 🎉 Une fois la virtualisation activée

Vous pourrez lancer n8n avec Docker :

```powershell
# Option 1 : Avec Docker Compose
docker-compose -f docker-compose.n8n.yml up -d

# Option 2 : Avec Docker directement
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n -e N8N_BASIC_AUTH_ACTIVE=true -e N8N_BASIC_AUTH_USER=admin -e N8N_BASIC_AUTH_PASSWORD=admin123 n8nio/n8n:latest
```

Puis accédez à : **http://localhost:5678**

---

## ❌ Problèmes courants

### Problème 1 : "Virtualization Enabled In Firmware: No" même après activation du BIOS

**Solutions :**
1. Vérifiez que vous avez bien sauvegardé les changements dans le BIOS
2. Certains PC ont plusieurs options de virtualisation à activer (VT-x ET VT-d)
3. Désactivez temporairement le Secure Boot dans le BIOS
4. Mettez à jour le BIOS de votre PC

### Problème 2 : Impossible d'activer Hyper-V

**Solutions :**
1. Vérifiez que vous utilisez **Windows 10/11 Pro, Enterprise ou Education** (pas Home)
2. Pour Windows Home, installez Hyper-V manuellement :
   ```powershell
   # Créer un fichier install-hyper-v.bat avec ce contenu :
   pushd "%~dp0"
   dir /b %SystemRoot%\servicing\Packages\*Hyper-V*.mum >hyper-v.txt
   for /f %%i in ('findstr /i . hyper-v.txt 2^>nul') do dism /online /norestart /add-package:"%SystemRoot%\servicing\Packages\%%i"
   del hyper-v.txt
   Dism /online /enable-feature /featurename:Microsoft-Hyper-V -All /LimitAccess /ALL
   ```

### Problème 3 : Docker Desktop ne démarre toujours pas

**Solutions :**
1. Désinstallez complètement Docker Desktop
2. Redémarrez le PC
3. Réinstallez la dernière version depuis https://www.docker.com/products/docker-desktop/
4. Au premier lancement, acceptez toutes les demandes d'installation de composants

### Problème 4 : PC professionnel / Accès BIOS restreint

Si vous ne pouvez pas accéder au BIOS :
- 📞 **Contactez votre service IT** - ils peuvent activer la virtualisation à distance
- 🔧 Ou utilisez **n8n sans Docker** (déjà installé avec npm)

---

## 📊 Résumé des étapes

1. ✅ Vérifier le support de virtualisation
2. ✅ Activer dans le BIOS (VT-x ou AMD-V)
3. ✅ Activer Hyper-V dans Windows
4. ✅ Installer WSL2
5. ✅ Configurer Docker Desktop
6. ✅ Lancer n8n avec Docker

---

## 💡 Alternative : n8n est déjà installé sans Docker

Si vous ne pouvez pas activer la virtualisation, **n8n est déjà installé et prêt** :

```bash
# Démarrer n8n (sans Docker)
n8n start

# Ou utilisez le fichier batch
.\start-n8n.bat
```

---

## 📞 Besoin d'aide ?

- 📖 [Documentation Docker Desktop](https://docs.docker.com/desktop/windows/wsl/)
- 📖 [Documentation WSL2](https://docs.microsoft.com/en-us/windows/wsl/install)
- 🎥 [Vidéo : Activer la virtualisation](https://www.youtube.com/results?search_query=enable+virtualization+windows+11)

---

**Bonne chance ! 🚀**
