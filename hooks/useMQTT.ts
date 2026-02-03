/**
 * Hook React pour MQTT
 * Permet de s'abonner et publier sur des topics MQTT depuis n'importe quel composant
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';

interface MQTTMessage {
    topic: string;
    message: string;
    timestamp: Date;
}

interface UseMQTTOptions {
    brokerUrl?: string;
    topics?: string[];
    onMessage?: (topic: string, message: string) => void;
}

export function useMQTT(options: UseMQTTOptions = {}) {
    const {
        brokerUrl = 'ws://localhost:9001',
        topics = [],
        onMessage
    } = options;

    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<MQTTMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<MqttClient | null>(null);

    useEffect(() => {
        // Connexion au broker MQTT
        console.log('🔌 Connexion au broker MQTT:', brokerUrl);
        const client = mqtt.connect(brokerUrl);
        clientRef.current = client;

        client.on('connect', () => {
            console.log('✅ Connecté au broker MQTT');
            setConnected(true);
            setError(null);

            // Exposer le statut pour le panneau de propriétés
            (window as any).MQTT_CONNECTED = true;
            (window as any).MQTT_BROKER_HOST = brokerUrl.split('://')[1]?.split(':')[0] || 'localhost';
            (window as any).MQTT_BROKER_WS_PORT = brokerUrl.split(':').pop() || '9001';

            // S'abonner aux topics
            topics.forEach(topic => {
                client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Erreur d'abonnement au topic ${topic}:`, err);
                        setError(`Échec d'abonnement: ${topic}`);
                    } else {
                        console.log(`📡 Abonné au topic: ${topic}`);
                    }
                });
            });
        });

        client.on('error', (err) => {
            console.error('❌ Erreur MQTT:', err);
            setError(err.message);
            setConnected(false);
            (window as any).MQTT_CONNECTED = false;
        });

        client.on('offline', () => {
            console.warn('⚠️ Client MQTT hors ligne');
            setConnected(false);
            (window as any).MQTT_CONNECTED = false;
        });

        client.on('reconnect', () => {
            console.log('🔄 Reconnexion au broker MQTT...');
        });

        client.on('message', (topic, payload) => {
            const message = payload.toString();
            console.log(`📨 Message reçu - Topic: ${topic}, Message: ${message}`);

            const mqttMessage: MQTTMessage = {
                topic,
                message,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, mqttMessage]);

            if (onMessage) {
                onMessage(topic, message);
            }
        });

        // Nettoyage lors du démontage
        return () => {
            console.log('🔌 Déconnexion du broker MQTT');
            if (client) {
                client.end();
            }
        };
    }, [brokerUrl, topics.join(',')]);

    const publish = useCallback((topic: string, message: string | object, options = {}) => {
        const client = clientRef.current;
        if (!client || !connected) {
            console.error('❌ Client MQTT non connecté');
            return false;
        }

        const payload = typeof message === 'object' ? JSON.stringify(message) : message;

        client.publish(topic, payload, options, (err) => {
            if (err) {
                console.error(`❌ Erreur de publication sur ${topic}:`, err);
                setError(`Échec de publication: ${topic}`);
            } else {
                console.log(`✉️ Message publié - Topic: ${topic}, Message: ${payload}`);
            }
        });

        return true;
    }, [connected]);

    const subscribe = useCallback((topic: string) => {
        const client = clientRef.current;
        if (!client || !connected) {
            console.error('❌ Client MQTT non connecté');
            return false;
        }

        client.subscribe(topic, (err) => {
            if (err) {
                console.error(`❌ Erreur d'abonnement au topic ${topic}:`, err);
                setError(`Échec d'abonnement: ${topic}`);
            } else {
                console.log(`📡 Abonné au topic: ${topic}`);
            }
        });

        return true;
    }, [connected]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        connected,
        messages,
        error,
        publish,
        subscribe,
        clearMessages
    };
}
