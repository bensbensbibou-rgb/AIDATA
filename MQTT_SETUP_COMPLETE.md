# 🎉 Configuration MQTT Complète - Options 2 & 3

## ✅ Ce qui a été installé

### Option 3 : Intégration MQTT dans le Dashboard ✅

#### Backend (Python)
- ✅ Bibliothèque `paho-mqtt` installée
- ✅ Fichier `mqtt_service.py` créé
  - Connexion au broker MQTT
  - Publish/Subscribe simplifié
  - Callbacks personnalisables

#### Frontend (React)
- ✅ Bibliothèque `mqtt.js` installée  
- ✅ Hook personnalisé `hooks/useMQTT.ts` créé
  - Connexion WebSocket au broker
  - État de connexion en temps réel
  - Publication et abonnement faciles

- ✅ Composant de démonstration `components/MQTTDemo.tsx` créé
  - Interface de test MQTT
  - Visualisation des messages en temps réel
  - Outil de publication

#### Infrastructure
- ✅ Broker MQTT Mosquitto lancé (Docker)
  - Port 1883 : MQTT classique
  - Port 9001 : WebSocket (pour le frontend)

---

### Option 2 : MQTT MCP Server ⏳

#### Statut actuel
⚠️ **En attente** : Nécessite Python 3.13+ (vous avez Python 3.12)

#### Fichiers préparés
- ✅ Guide d'installation `INSTALL_PYTHON313_MQTT_MCP.md`
- ✅ Configuration `.env` (dans mqtt-mcp-main)
- ✅ Documentation complète

#### Pour activer MQTT MCP :
1. Installer Python 3.13 (voir guide)
2. Créer environnement virtuel
3. Installer mqtt-mcp
4. Lancer le serveur sur port 8002

---

## 🚀 Utilisation

### Option 3 : MQTT dans votre Dashboard

#### 1. Utiliser le composant de démonstration

Ajoutez dans votre `App.tsx` :

```typescript
import { MQTTDemo } from './components/MQTTDemo';

// Dans votre render
<MQTTDemo />
```

#### 2. Utiliser le hook dans vos composants

```typescript
import { useMQTT } from './hooks/useMQTT';

function MyComponent() {
  const { connected, messages, publish } = useMQTT({
    brokerUrl: 'ws://localhost:9001',
    topics: ['sensors/temperature'],
    onMessage: (topic, message) => {
      console.log('Nouveau message:', topic, message);
    }
  });

  const sendCommand = () => {
    publish('actuators/hvac', JSON.stringify({
      command: 'SET_TEMP',
      value: 22
    }));
  };

  return (
    <div>
      <p>Status: {connected ? 'Connecté' : 'Déconnecté'}</p>
      <button onClick={sendCommand}>Envoyer commande</button>
    </div>
  );
}
```

#### 3. Utiliser le service Python backend

```python
from mqtt_service import mqtt_service

# Connexion au broker
mqtt_service.connect()

# S'abonner à un topic
def on_temperature(topic, payload):
    print(f"Température: {payload}")

mqtt_service.subscribe("sensors/temperature", on_temperature)

# Publier un message
mqtt_service.publish("actuators/hvac", {
    "setpoint": 22,
    "mode": "heat"
})
```

#### 4. Tester MQTT

**Terminal 1 - S'abonner :**
```powershell
docker exec -it mosquitto mosquitto_sub -t "sensors/#"
```

**Terminal 2 - Publier :**
```powershell
docker exec -it mosquitto mosquitto_pub -t "sensors/temperature" -m '{"value": 22.5, "unit": "C"}'
```

**Ou utiliser le composant MQTTDemo dans votre navigateur !**

---

## 📂 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `mqtt_service.py` | Service MQTT Python backend |
| `hooks/useMQTT.ts` | Hook React pour MQTT |
| `components/MQTTDemo.tsx` | Composant de démonstration MQTT |
| `start_all_services.bat` | Script pour démarrer tous les services |
| `INSTALL_PYTHON313_MQTT_MCP.md` | Guide installation Python 3.13 et MQTT MCP |
| `MQTT_OPTIONS_GUIDE.md` | Guide détaillé des options MQTT |

---

## 🔌 Services actifs actuellement

| Service | Port | Statut | URL |
|---------|------|--------|-----|
| Dashboard Frontend | 3000 | ✅ | http://localhost:3000 |
| BACnet Server | 8000 | ✅ | http://localhost:8000 |
| Distech Server | 8001 | ✅ | http://localhost:8001 |
| Mosquitto MQTT | 1883 | ✅ | mqtt://localhost:1883 |
| Mosquitto WebSocket | 9001 | ✅ | ws://localhost:9001 |
| n8n | 5678 | ✅ | http://localhost:5678 |
| MQTT MCP Server | 8002 | ⏳ | Nécessite Python 3.13 |

---

## 🎯 Prochaines étapes

### Immédiatement disponible (Option 3) ✅

1. **Tester MQTT dans le Dashboard**
   ```powershell
   # Le dashboard est déjà lancé sur http://localhost:3000
   # Ajoutez le composant MQTTDemo pour voir MQTT en action
   ```

2. **Publier un message de test**
   ```powershell
   docker exec -it mosquitto mosquitto_pub -t "sensors/temperature" -m '{"value": 23.5}'
   ```

3. **Intégrer MQTT dans vos composants existants**
   - Utilisez le hook `useMQTT`
   - Ajoutez des topics pour vos capteurs BACnet
   - Créez des widgets temps réel

### Pour activer MQTT MCP (Option 2) ⏳

1. **Installer Python 3.13**
   - Télécharger depuis python.org
   - Ou utiliser `winget install Python.Python.3.13`

2. **Suivre le guide**
   ```powershell
   # Voir le fichier
   code INSTALL_PYTHON313_MQTT_MCP.md
   ```

3. **Lancer MQTT MCP**
   ```powershell
   cd mqtt-mcp-main\mqtt-mcp-main
   py -3.13 -m venv venv_mqtt
   .\venv_mqtt\Scripts\activate
   pip install -e .
   mqtt-mcp
   ```

4. **Connecter à n8n**
   - Ajouter le serveur MCP dans n8n
   - Utiliser les outils MQTT directement dans les workflows

---

## 💡 Exemples d'utilisation

### Scénario 1 : Afficher la température en temps réel

```typescript
function TemperatureWidget() {
  const [temp, setTemp] = useState(null);
  
  useMQTT({
    topics: ['sensors/temperature'],
    onMessage: (topic, message) => {
      const data = JSON.parse(message);
      setTemp(data.value);
    }
  });
  
  return <div>Température: {temp}°C</div>;
}
```

### Scénario 2 : Contrôler la CVC

```typescript
function HVACControl() {
  const { publish } = useMQTT();
  
  const setTemperature = (temp) => {
    publish('actuators/hvac/setpoint', JSON.stringify({
      value: temp,
      timestamp: new Date().toISOString()
    }));
  };
  
  return (
    <input type="number" onChange={(e) => setTemperature(e.target.value)} />
  );
}
```

### Scénario 3 : Automatisation avec n8n (quand MQTT MCP sera actif)

Dans n8n, vous pourrez créer des workflows comme :
```
1. Trigger: Temperature > 25°C (via MQTT MCP)
2. Action: Envoyer notification
3. Action: Ajuster CVC (via MQTT MCP)
```

---

## 🆘 Dépannage

### Le Dashboard ne se connecte pas à MQTT
```powershell
# Vérifier que Mosquitto tourne
docker ps | findstr mosquitto

# Vérifier les logs
docker logs mosquitto

# Redémarrer si nécessaire
docker restart mosquitto
```

### Erreur WebSocket dans le navigateur
- Vérifiez que le port 9001 est ouvert
- Vérifiez l'URL : `ws://localhost:9001` (pas `wss://`)

### Messages non reçus
- Vérifiez les topics (case-sensitive)
- Utilisez le wildcard `#` pour tester : `sensors/#`

---

## 📚 Ressources

- [Documentation MQTT](https://mqtt.org/)
- [Documentation mqtt.js](https://github.com/mqttjs/MQTT.js)
- [Documentation paho-mqtt](https://eclipse.dev/paho/index.php?page=clients/python/index.php)
- [MQTT MCP Server](https://github.com/ezhuk/mqtt-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**✨ MQTT est maintenant intégré dans votre Dashboard ! Profitez-en ! 🚀**
