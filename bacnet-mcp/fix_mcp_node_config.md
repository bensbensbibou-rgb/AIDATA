# 🔧 CORRECTION CONNEXION MCP DANS N8N

## 📋 Problème identifié
Votre noeud "MCP Client2" dans n8n ne peut pas se connecter au serveur MCP qui fonctionne sur `http://localhost:8050/mcp/`.

## ✅ Solution étape par étape

### 1. Ouvrez n8n
- Allez sur : **http://localhost:5678**
- Connectez-vous avec vos identifiants

### 2. Accédez à votre workflow
- Trouvez le workflow qui contient le noeud "MCP Client2"
- Ouvrez-le en mode édition

### 3. Localisez le noeud problématique
- Trouvez le noeud nommé **"MCP Client2"**
- Il devrait avoir une icône d'erreur rouge

### 4. Ouvrez les paramètres du noeud
- **Double-cliquez** sur le noeud "MCP Client2"
- La fenêtre de configuration s'ouvre

### 5. Configurez l'URL du serveur
Dans la section **"Server URL"** :
```
http://localhost:8050/mcp/
```
⚠️ **Important :**
- Pas d'espace avant ou après
- Pas de slash supplémentaire à la fin
- Vérifiez qu'il n'y a pas de caractères spéciaux

### 6. Configurez les Headers (si nécessaire)
Dans la section **"Headers"**, ajoutez :
```
Accept: application/json, text/event-stream
Content-Type: application/json
```

### 7. Testez la connexion
- Cliquez sur le bouton **"Test Connection"**
- Vous devriez voir : ✅ **"Connection successful"**

### 8. Sauvegardez et testez
- Cliquez sur **"Save"**
- Testez votre workflow en cliquant sur **"Execute Workflow"**

## 🔍 Si le problème persiste

### Option A : Recréer le noeud
1. **Supprimez** le noeud "MCP Client2" (clic droit > Delete)
2. **Ajoutez** un nouveau noeud "MCP Client" depuis la palette
3. **Configurez-le** avec l'URL : `http://localhost:8050/mcp/`
4. **Testez** la connexion

### Option B : Vérifier les ports
1. Ouvrez une nouvelle fenêtre de terminal
2. Vérifiez que les services sont actifs :
```bash
# Vérifier n8n (port 5678)
netstat -an | findstr ":5678"

# Vérifier serveur MCP (port 8050)
netstat -an | findstr ":8050"
```

## 🧪 Test de validation

Pour vérifier que le serveur MCP fonctionne indépendamment de n8n :

```bash
# Test 1 : Connexion basique
curl -X GET "http://localhost:8050/mcp/" -H "Accept: text/event-stream"

# Test 2 : Avec PowerShell
powershell -Command "
$body = '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{\"tools\":{}}}}'
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:8050/mcp/' -Method POST -Headers @{
        'Content-Type' = 'application/json'
        'Accept' = 'application/json, text/event-stream'
    } -Body $body -TimeoutSec 10
    Write-Host 'SUCCESS: Serveur MCP accessible' -ForegroundColor Green
} catch {
    Write-Host 'Erreur:' $_.Exception.Message -ForegroundColor Red
}
"
```

## 🎯 Résultat attendu

Après correction :
- ✅ Le noeud MCP se connecte sans erreur
- ✅ Vous pouvez utiliser les outils BACnet depuis n8n
- ✅ Les workflows s'exécutent correctement

## 📞 Support

Si vous rencontrez toujours des problèmes :
1. Vérifiez que le serveur MCP fonctionne : `http://localhost:8050/mcp/`
2. Redémarrez n8n : Arrêtez avec Ctrl+C et relancez `./start_n8n_final.bat`
3. Vérifiez les logs de n8n pour plus de détails sur l'erreur

---
**Le serveur MCP fonctionne parfaitement - il s'agit uniquement d'une configuration dans n8n !** 🚀


