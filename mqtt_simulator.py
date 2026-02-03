"""
Script de test MQTT - Simule des données de capteurs
Lance ce script pour générer des messages MQTT de test
"""
import time
import json
import random
from datetime import datetime
from mqtt_service import mqtt_service

def generate_temperature():
    """Génère une température aléatoire entre 18 et 26°C"""
    return round(random.uniform(18.0, 26.0), 1)

def generate_humidity():
    """Génère une humidité aléatoire entre 30 et 70%"""
    return round(random.uniform(30.0, 70.0), 1)

def generate_co2():
    """Génère un niveau de CO2 aléatoire entre 400 et 1200 ppm"""
    return random.randint(400, 1200)

def generate_power():
    """Génère une consommation électrique aléatoire entre 50 et 500 W"""
    return random.randint(50, 500)

print("🚀 Démarrage du simulateur MQTT...")
print("=" * 60)

# Connexion au broker
if not mqtt_service.connect():
    print("❌ Impossible de se connecter au broker MQTT")
    print("Vérifiez que Mosquitto est lancé : docker ps | findstr mosquitto")
    exit(1)

# Attendre la connexion
time.sleep(2)

print("\n📡 Publication de messages toutes les 3 secondes...")
print("Appuyez sur Ctrl+C pour arrêter\n")

try:
    while True:
        timestamp = datetime.now().isoformat()
        
        # Température
        temp_data = {
            "value": generate_temperature(),
            "unit": "°C",
            "timestamp": timestamp,
            "sensor_id": "TEMP_001"
        }
        mqtt_service.publish("sensors/temperature", temp_data)
        print(f"🌡️  Température: {temp_data['value']}°C")
        
        # Humidité
        humid_data = {
            "value": generate_humidity(),
            "unit": "%",
            "timestamp": timestamp,
            "sensor_id": "HUM_001"
        }
        mqtt_service.publish("sensors/humidity", humid_data)
        print(f"💧 Humidité: {humid_data['value']}%")
        
        # CO2
        co2_data = {
            "value": generate_co2(),
            "unit": "ppm",
            "timestamp": timestamp,
            "sensor_id": "CO2_001"
        }
        mqtt_service.publish("sensors/co2", co2_data)
        print(f"🌫️  CO2: {co2_data['value']} ppm")
        
        # Consommation électrique
        power_data = {
            "value": generate_power(),
            "unit": "W",
            "timestamp": timestamp,
            "sensor_id": "PWR_001"
        }
        mqtt_service.publish("sensors/power", power_data)
        print(f"⚡ Puissance: {power_data['value']} W")
        
        # Status de la CVC
        hvac_status = {
            "mode": random.choice(["heating", "cooling", "off"]),
            "setpoint": random.randint(20, 24),
            "fan_speed": random.choice(["low", "medium", "high"]),
            "timestamp": timestamp
        }
        mqtt_service.publish("actuators/hvac/status", hvac_status)
        print(f"🌀 CVC: {hvac_status['mode']} @ {hvac_status['setpoint']}°C")
        
        print(f"\n⏱️  {timestamp}")
        print("-" * 60 + "\n")
        
        time.sleep(3)
        
except KeyboardInterrupt:
    print("\n\n👋 Arrêt du simulateur...")
    mqtt_service.disconnect()
    print("✅ Simulateur arrêté")
