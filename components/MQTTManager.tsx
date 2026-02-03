import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Wifi, Activity, Send, Inbox, Plus, Trash2 } from 'lucide-react';
import { mqttDriver } from '../drivers/MQTTDriver';
import { MQTTBroker, MQTTMessage } from '../drivers/MQTTTypes';
import { DataNode } from '../types';
import { MQTTConnectionGuide } from './MQTTConnectionGuide';
import { MQTT_CONNECTION_INFO } from '../constants';

interface MQTTManagerProps {
    treeData: DataNode[];
    setTreeData: (data: DataNode[]) => void;
}

export const MQTTManager: React.FC<MQTTManagerProps> = ({ treeData, setTreeData }) => {
    const [brokers, setBrokers] = useState<MQTTBroker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<MQTTBroker | null>(null);
    const [mcpConnected, setMcpConnected] = useState(false);
    const [messageHistory, setMessageHistory] = useState<MQTTMessage[]>([]);

    // Publish form
    const [publishTopic, setPublishTopic] = useState('');
    const [publishMessage, setPublishMessage] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // Receive form
    const [receiveTopic, setReceiveTopic] = useState('');
    const [receiveTimeout, setReceiveTimeout] = useState(30);
    const [isReceiving, setIsReceiving] = useState(false);
    const [receivedMessage, setReceivedMessage] = useState('');

    useEffect(() => {
        const initDriver = async () => {
            try {
                await mqttDriver.connect();
                setMcpConnected(mqttDriver.isConnectedToMCP());
            } catch (error) {
                console.error('Failed to connect to MQTT MCP server:', error);
                setMcpConnected(false);
            }
        };

        initDriver();

        const unsubscribe = mqttDriver.subscribe((updatedBrokers) => {
            setBrokers([...updatedBrokers]);
            if (selectedBroker) {
                const updatedSelected = updatedBrokers.find(b => b.id === selectedBroker.id);
                if (updatedSelected) setSelectedBroker(updatedSelected);
            }
        });

        mqttDriver.startPolling();

        // Update message history periodically
        const historyInterval = setInterval(() => {
            setMessageHistory(mqttDriver.getMessageHistory(50));
        }, 1000);

        return () => {
            unsubscribe();
            mqttDriver.disconnect();
            clearInterval(historyInterval);
        };
    }, []);

    const handlePublish = async () => {
        if (!selectedBroker || !publishTopic || !publishMessage) return;

        setIsPublishing(true);
        try {
            await mqttDriver.publish(selectedBroker.id, publishTopic, publishMessage);
            setPublishMessage('');
            alert('Message published successfully!');
        } catch (error) {
            console.error('Publish failed:', error);
            alert('Failed to publish message');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleReceive = async () => {
        if (!selectedBroker || !receiveTopic) return;

        setIsReceiving(true);
        setReceivedMessage('');
        try {
            const message = await mqttDriver.receive(selectedBroker.id, receiveTopic, receiveTimeout);
            setReceivedMessage(message);
        } catch (error) {
            console.error('Receive failed:', error);
            setReceivedMessage('Timeout or error receiving message');
        } finally {
            setIsReceiving(false);
        }
    };

    const handleAddBroker = () => {
        const name = prompt('Broker name:');
        const host = prompt('Broker host:');
        const port = prompt('Broker port:', '1883');

        if (name && host && port) {
            const id = `broker_${Date.now()}`;
            mqttDriver.addBroker(id, name, host, parseInt(port));
        }
    };

    return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-[#1c1c1e] space-y-6">
        <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Wifi className="text-orange-500" />
                        MQTT Manager
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Publish and subscribe to MQTT topics.</p>
                </div>
                <div className="flex gap-3">
                    <div className={`bg-white dark:bg-white/5 px-4 py-2 rounded-lg border ${mcpConnected ? 'border-green-500' : 'border-red-500'} flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full ${mcpConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium dark:text-gray-200">
                            {mcpConnected ? 'MCP Connected' : 'MCP Disconnected'}
                        </span>
                    </div>
                    <div className="bg-white dark:bg-white/5 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-2">
                        <Activity size={16} className="text-orange-500" />
                        <span className="text-sm font-medium dark:text-gray-200">{brokers.length} Brokers</span>
                    </div>
                    <button
                        onClick={handleAddBroker}
                        disabled={!mcpConnected}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${!mcpConnected ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-orange-500/30'}`}
                    >
                        <Plus size={18} />
                        Add Broker
                    </button>
            </div>
        </div>

        <MQTTConnectionGuide info={MQTT_CONNECTION_INFO} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Broker List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-semibold dark:text-gray-200">MQTT Brokers</h2>
                    {brokers.length === 0 ? (
                        <div className="bg-white dark:bg-white/5 rounded-xl p-8 text-center border border-dashed border-gray-300 dark:border-white/10">
                            <Server size={32} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500">No brokers configured.</p>
                            <button
                                onClick={handleAddBroker}
                                className="mt-4 text-sm text-orange-600 hover:underline"
                            >
                                Add your first broker
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {brokers.map(broker => (
                                <div
                                    key={broker.id}
                                    onClick={() => setSelectedBroker(broker)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedBroker?.id === broker.id ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 ring-1 ring-orange-500' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-orange-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-800 dark:text-white">{broker.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${broker.status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {broker.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div className="flex justify-between"><span>Host:</span> <span className="font-mono">{broker.host}:{broker.port}</span></div>
                                        <div className="flex justify-between"><span>Topics:</span> <span>{broker.topics.length}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Publish/Subscribe Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedBroker ? (
                        <>
                            {/* Publish */}
                            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                                <h3 className="text-lg font-semibold dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Send size={20} className="text-orange-500" />
                                    Publish Message
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
                                        <input
                                            type="text"
                                            value={publishTopic}
                                            onChange={(e) => setPublishTopic(e.target.value)}
                                            placeholder="devices/sensor/temperature"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                                        <textarea
                                            value={publishMessage}
                                            onChange={(e) => setPublishMessage(e.target.value)}
                                            placeholder='{"temperature": 23.5, "unit": "C"}'
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white font-mono text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePublish}
                                        disabled={isPublishing || !publishTopic || !publishMessage}
                                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        {isPublishing ? 'Publishing...' : 'Publish'}
                                    </button>
                                </div>
                            </div>

                            {/* Receive */}
                            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                                <h3 className="text-lg font-semibold dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Inbox size={20} className="text-blue-500" />
                                    Receive Message
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
                                            <input
                                                type="text"
                                                value={receiveTopic}
                                                onChange={(e) => setReceiveTopic(e.target.value)}
                                                placeholder="devices/sensor/temperature"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeout (s)</label>
                                            <input
                                                type="number"
                                                value={receiveTimeout}
                                                onChange={(e) => setReceiveTimeout(parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleReceive}
                                        disabled={isReceiving || !receiveTopic}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Inbox size={18} />
                                        {isReceiving ? 'Receiving...' : 'Receive'}
                                    </button>
                                    {receivedMessage && (
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Received message</p>
                                            <pre className="text-sm font-mono text-gray-900 dark:text-white whitespace-pre-wrap">{receivedMessage}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Message History */}
                            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                                <h3 className="text-lg font-semibold dark:text-gray-200 mb-4">Message History</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {messageHistory.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No messages yet</p>
                                    ) : (
                                        messageHistory.reverse().map((msg, idx) => (
                                            <div key={idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.topic}</span>
                                                    <span className="text-xs text-gray-500">{msg.timestamp.toLocaleTimeString()}</span>
                                                </div>
                                                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{msg.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">{msg.broker}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-12">
                            <Server size={48} className="mb-4 opacity-20" />
                            <p>Select a broker to publish and receive messages.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
