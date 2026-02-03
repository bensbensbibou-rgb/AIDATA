# BACnet Driver Service (EDE + Historisation PostgreSQL)

Microservice Node.js indépendant (sans MCP) pour :
- Charger et parser un fichier EDE (CSV) uploadé.
- Découvrir les devices BACnet (whoIs/iAm) et associer les adresses.
- Lire cycliquement les points listés dans l’EDE.
- Écrire sur un point sur commande.
- Historiser chaque lecture dans PostgreSQL (point_id, valeur, timestamp).
- Exposer l’historique par point/période pour affichage graphique.

## Démarrage
```bash
cd bacnet-driver-service
npm install
cp .env.example .env
# Éditez .env (PORT, PG_URL, PG_TABLE, POLL_MS, BACNET_*).
npm start
```

## API
- `POST /ede/upload` (form-data `file`): charge un fichier EDE `;` et remplace la liste des points.
- `GET /points`: retourne les points chargés + adresse connue (si découverte).
- `POST /scan`: lance un whoIs pour remplir les adresses devices.
- `POST /write`: body JSON `{ device_id, object_type, instance, property_id?, value }`.
- `GET /history?point_id=<id>&from=<iso>&to=<iso>&limit=1000`: renvoie l’historique.
- `GET /health`: ping.
- `GET /config` / `POST /config`: lecture/MAJ de la config réseau (port BACnet nécessite un restart manuel).
- WebSocket (`socket.io`) : events `points_tree` (arborescence complète) et `point_update` (valeur temps réel).

## Hypothèses EDE
- Fichier CSV séparé par `;`.
- Colonnes minimales attendues (case-insensitive): `device_id`, `object_type`, `instance`, `name`, `property` (optionnel, défaut `presentValue`).
- Les autres colonnes sont ignorées.

## Notes
- Le service écoute par défaut sur `PORT=8100`.
- Le polling lit toutes les `POLL_MS` ms (défaut 5000).
- La découverte BACnet utilise `whoIs` (plage `BACNET_WHOIS_LOW/HIGH`). Les adresses sont mises à jour au fil des `iAm` reçus.
- Historisation dans `PG_TABLE` (défaut `bacnet_history`).
