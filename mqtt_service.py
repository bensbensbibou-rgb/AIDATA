"""
MQTT Service pour le Dashboard Energy Portal
Gère la connexion au broker MQTT et l'échange de messages
"""
import paho.mqtt.client as mqtt
import json
import logging
from typing import Dict, Callable, List
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MQTTService:
    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883):
        """
        Initialise le service MQTT
        
        Args:
            broker_host: Adresse du broker MQTT
            broker_port: Port du broker MQTT
        """
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client = mqtt.Client(client_id="dashboard_energy_portal")
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.connected = False
        
        # Configurer les callbacks
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        
    def _on_connect(self, client, userdata, flags, rc):
        """Callback appelé lors de la connexion au broker"""
        if rc == 0:
            self.connected = True
            logger.info(f"✅ Connecté au broker MQTT {self.broker_host}:{self.broker_port}")
            
            # Réabonner aux topics
            for topic in self.subscriptions.keys():
                client.subscribe(topic)
                logger.info(f"📡 Abonné au topic: {topic}")
        else:
            logger.error(f"❌ Échec de connexion au broker MQTT. Code: {rc}")
            self.connected = False
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback appelé lors de la déconnexion"""
        self.connected = False
        logger.warning(f"⚠️ Déconnecté du broker MQTT. Code: {rc}")
    
    def _on_message(self, client, userdata, msg):
        """Callback appelé lors de la réception d'un message"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.info(f"📨 Message reçu - Topic: {topic}, Payload: {payload}")
            
            # Appeler les callbacks enregistrés pour ce topic
            if topic in self.subscriptions:
                for callback in self.subscriptions[topic]:
                    try:
                        callback(topic, payload)
                    except Exception as e:
                        logger.error(f"Erreur dans callback pour {topic}: {e}")
                        
        except Exception as e:
            logger.error(f"Erreur lors du traitement du message: {e}")
    
    def connect(self):
        """Établit la connexion au broker MQTT"""
        try:
            logger.info(f"🔌 Connexion à {self.broker_host}:{self.broker_port}...")
            self.client.connect(self.broker_host, self.broker_port, 60)
            self.client.loop_start()  # Démarre la boucle en arrière-plan
            return True
        except Exception as e:
            logger.error(f"❌ Erreur de connexion: {e}")
            return False
    
    def disconnect(self):
        """Déconnecte du broker MQTT"""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("🔌 Déconnecté du broker MQTT")
    
    def subscribe(self, topic: str, callback: Callable = None):
        """
        S'abonne à un topic MQTT
        
        Args:
            topic: Topic MQTT (peut contenir des wildcards # et +)
            callback: Fonction appelée lors de la réception d'un message
        """
        if topic not in self.subscriptions:
            self.subscriptions[topic] = []
            
        if callback:
            self.subscriptions[topic].append(callback)
        
        if self.connected:
            self.client.subscribe(topic)
            logger.info(f"📡 Abonné au topic: {topic}")
    
    def publish(self, topic: str, message: dict | str, qos: int = 0, retain: bool = False):
        """
        Publie un message sur un topic
        
        Args:
            topic: Topic de destination
            message: Message à publier (dict ou string)
            qos: Quality of Service (0, 1, ou 2)
            retain: Si True, le broker garde le dernier message
        """
        try:
            if isinstance(message, dict):
                payload = json.dumps(message)
            else:
                payload = str(message)
            
            result = self.client.publish(topic, payload, qos=qos, retain=retain)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"✉️ Message publié - Topic: {topic}, Payload: {payload}")
                return True
            else:
                logger.error(f"❌ Échec de publication: {result.rc}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur lors de la publication: {e}")
            return False
    
    def is_connected(self) -> bool:
        """Retourne l'état de la connexion"""
        return self.connected


# Instance globale du service MQTT
mqtt_service = MQTTService()


# Exemple d'utilisation
if __name__ == "__main__":
    # Test du service MQTT
    def on_temperature_message(topic, payload):
        print(f"🌡️ Température reçue: {payload}")
    
    def on_sensor_message(topic, payload):
        print(f"📊 Capteur: {topic} = {payload}")
    
    # Connexion au broker
    mqtt_service.connect()
    
    # S'abonner à des topics
    mqtt_service.subscribe("sensors/temperature", on_temperature_message)
    mqtt_service.subscribe("sensors/#", on_sensor_message)
    
    # Publier un message de test
    import time
    time.sleep(2)
    mqtt_service.publish("sensors/temperature", {"value": 22.5, "unit": "°C", "timestamp": datetime.now().isoformat()})
    
    # Garder le service actif
    try:
        print("Service MQTT actif. Appuyez sur Ctrl+C pour arrêter...")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        mqtt_service.disconnect()
        print("\n👋 Service MQTT arrêté")
