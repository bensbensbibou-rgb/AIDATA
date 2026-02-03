/**
 * Composant de test MQTT
 * Affiche les messages en temps réel et permet de publier des messages
 */
import React, { useState } from 'react';
import { useMQTT } from '../hooks/useMQTT';

export function MQTTDemo() {
    const [topic, setTopic] = useState('sensors/temperature');
    const [messageToSend, setMessageToSend] = useState('{"value": 25, "unit": "°C"}');

    const { connected, messages, error, publish, subscribe } = useMQTT({
        brokerUrl: 'ws://localhost:9001',
        topics: ['sensors/#', 'actuators/#'],
        onMessage: (topic, message) => {
            console.log(`Nouveau message sur ${topic}:`, message);
        }
    });

    const handlePublish = () => {
        if (topic && messageToSend) {
            publish(topic, messageToSend);
        }
    };

    const handleSubscribe = () => {
        if (topic) {
            subscribe(topic);
        }
    };

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#1a1a2e',
            borderRadius: '8px',
            color: '#fff'
        }}>
            <h2>🔌 MQTT Dashboard</h2>

            {/* Statut de connexion */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{
                    display: 'inline-block',
                    padding: '5px 15px',
                    borderRadius: '20px',
                    backgroundColor: connected ? '#10b981' : '#ef4444',
                    color: 'white',
                    fontWeight: 'bold'
                }}>
                    {connected ? '✅ Connecté' : '❌ Déconnecté'}
                </div>
                {error && (
                    <div style={{ color: '#ef4444', marginTop: '10px' }}>
                        ⚠️ Erreur: {error}
                    </div>
                )}
            </div>

            {/* Zone de publication */}
            <div style={{
                marginBottom: '30px',
                padding: '15px',
                backgroundColor: '#16213e',
                borderRadius: '8px'
            }}>
                <h3>✉️ Publier un message</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Topic (ex: sensors/temperature)"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #0f3460',
                            backgroundColor: '#0f3460',
                            color: '#fff'
                        }}
                    />
                    <textarea
                        placeholder='Message (ex: {"value": 25, "unit": "°C"})'
                        value={messageToSend}
                        onChange={(e) => setMessageToSend(e.target.value)}
                        rows={3}
                        style={{
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #0f3460',
                            backgroundColor: '#0f3460',
                            color: '#fff',
                            fontFamily: 'monospace'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handlePublish}
                            disabled={!connected}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: connected ? '#3b82f6' : '#6b7280',
                                color: 'white',
                                cursor: connected ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold'
                            }}
                        >
                            📤 Publier
                        </button>
                        <button
                            onClick={handleSubscribe}
                            disabled={!connected}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: connected ? '#8b5cf6' : '#6b7280',
                                color: 'white',
                                cursor: connected ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold'
                            }}
                        >
                            📡 S'abonner
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages reçus */}
            <div style={{
                padding: '15px',
                backgroundColor: '#16213e',
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto'
            }}>
                <h3>📨 Messages reçus ({messages.length})</h3>
                {messages.length === 0 ? (
                    <p style={{ color: '#9ca3af' }}>Aucun message reçu</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {messages.slice().reverse().map((msg, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '10px',
                                    backgroundColor: '#0f3460',
                                    borderRadius: '4px',
                                    borderLeft: '3px solid #3b82f6'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '5px'
                                }}>
                                    <span style={{
                                        color: '#60a5fa',
                                        fontWeight: 'bold',
                                        fontFamily: 'monospace'
                                    }}>
                                        {msg.topic}
                                    </span>
                                    <span style={{ color: '#9ca3af', fontSize: '0.8em' }}>
                                        {msg.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                                <pre style={{
                                    margin: 0,
                                    color: '#e5e7eb',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9em',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}>
                                    {msg.message}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Aide */}
            <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#16213e',
                borderRadius: '8px',
                fontSize: '0.9em'
            }}>
                <h4>💡 Exemples de topics</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#9ca3af' }}>
                    <li><code>sensors/temperature</code> - Température</li>
                    <li><code>sensors/humidity</code> - Humidité</li>
                    <li><code>sensors/#</code> - Tous les capteurs (wildcard)</li>
                    <li><code>actuators/hvac/setpoint</code> - Consigne CVC</li>
                    <li><code>building/floor1/room101/#</code> - Tous les topics d'une pièce</li>
                </ul>
            </div>
        </div>
    );
}
