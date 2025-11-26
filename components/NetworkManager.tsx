import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Server, Settings, CheckCircle, XCircle, RefreshCw, Grid3x3, FolderTree, Upload, FileText } from 'lucide-react';
import { bacnetDriver } from '../drivers/BACnetDriver';
import { distechDriver } from '../drivers/DistechDriver';
import { mqttDriver } from '../drivers/MQTTDriver';
import { parseEDEFile, EDEDevice } from '../drivers/EDEParser';
import { DataNode, Language } from '../types';
import { bacnetIPDriver, BacnetIPDevice } from '../drivers/BacnetIpDriver';

const NETWORK_COPY_FR: Record<string, string> = {
    'Configuration': 'Configuration',
    'Widgets': 'Widgets',
    'Import': 'Importer',
    'Network Manager': 'Gestionnaire reseau',
    'Real-time Update Configuration': 'Configuration des mises a jour temps reel',
    'Update Mode': 'Mode de mise a jour',
    'Polling': 'Interrogation',
    'WebSocket': 'WebSocket',
    'COV': 'COV',
    'Simple, periodic refresh': 'Rafraichissement periodique simple',
    'Real-time push': 'Poussee temps reel',
    'BACnet native': 'Natif BACnet',
    'Auto-refresh': 'Rafraichissement auto',
    'Refresh Interval': 'Intervalle de rafraichissement',
    'Testing Connection...': 'Test de connexion...',
    'Test Connection': 'Tester la connexion',
    'BACnet Devices': 'Appareils BACnet',
    'Distech Devices': 'Appareils Distech',
    'MQTT Brokers': 'Courtiers MQTT',
    'No BACnet devices discovered. Go to Configuration tab and scan the network.': 'Aucun appareil BACnet detecte. Ouvrez l onglet Configuration puis lancez une analyse.',
    'No Distech devices configured.': 'Aucun appareil Distech configure.',
    'No MQTT brokers configured.': 'Aucun courtier MQTT configure.',
    'Import All': 'Tout importer',
    'Import BACnet EDE File': 'Importer un fichier EDE BACnet',
    'BACnet EDE File Import': 'Import de fichier EDE BACnet',
    'Upload a BACnet EDE (Engineering Data Exchange) CSV file to automatically import devices and objects.': 'Televersez un fichier CSV EDE pour importer automatiquement appareils et objets.',
    'Choose EDE File': 'Choisir un fichier EDE',
    'Hide': 'Masquer',
    'Import to Site Structure': 'Importer vers la structure du site',
    'Click Import to add variables to the Site Structure. They will be organized under <strong>Network -> BACnet/Distech/MQTT -> Device</strong>.': 'Cliquez sur Importer pour ajouter des variables dans la structure du site. Elles seront rangees sous <strong>Reseau -> BACnet/Distech/MQTT -> Equipement</strong>.',
    'No objects loaded. Click Load Objects in the BACnet Manager.': 'Aucun objet charge. Cliquez sur Charger les objets dans le gestionnaire BACnet.',
    'No objects loaded.': 'Aucun objet charge.',
    'No topics subscribed.': 'Aucun topic souscrit.',
    'Communication disabled for this driver.': 'Communication desactivee pour ce driver.',
    'Enable communication': 'Activer la communication',
    'Disable communication': 'Desactiver la communication',
    'BACnet IP Scan': 'Scan BACnet IP',
    'IP Range': 'Plage IP',
    'Port': 'Port',
    'Object Types': 'Types dobjet',
    'Limit per Device': 'Limite par appareil',
    'Scan Network': 'Analyser le reseau',
    'Scanning...': 'Analyse...',
    'Discovered BACnet IP Devices': 'Appareils BACnet IP detectes',
    'No BACnet IP devices found yet.': 'Aucun appareil BACnet IP detecte pour le moment.'
};

interface NetworkManagerProps {
    treeData: DataNode[];
    setTreeData: (data: DataNode[]) => void;
    language: Language;
}

type RealTimeMode = 'polling' | 'websocket' | 'cov';

interface DriverConfig {
    bacnet: {
        url: string;
        apiKey: string;
        connected: boolean;
        enabled: boolean;
    };
    distech: {
        url: string;
        apiKey: string;
        ecyUrl: string;
        ecyUser: string;
        ecyPassword: string;
        connected: boolean;
        enabled: boolean;
    };
    mqtt: {
        url: string;
        apiKey: string;
        defaultHost: string;
        defaultPort: number;
        connected: boolean;
        enabled: boolean;
    };
}

export const NetworkManager: React.FC<NetworkManagerProps> = ({ treeData, setTreeData, language }) => {
    const localize = (text: string) => language === 'fr' ? (NETWORK_COPY_FR[text] ?? text) : text;
    const [activeTab, setActiveTab] = useState<'config' | 'widgets' | 'import'>('config');
    const [config, setConfig] = useState<DriverConfig>({
        bacnet: {
            url: (import.meta as any).env?.VITE_MCP_BACNET_URL || '/proxy/bacnet',
            apiKey: '',
            connected: false,
            enabled: true,
        },
        distech: {
            url: (import.meta as any).env?.VITE_MCP_DISTECH_URL || 'http://localhost:8001',
            apiKey: '',
            ecyUrl: '',
            ecyUser: '',
            ecyPassword: '',
            connected: false,
            enabled: true,
        },
        mqtt: {
            url: (import.meta as any).env?.VITE_MCP_MQTT_URL || 'http://localhost:8002',
            apiKey: '',
            defaultHost: (import.meta as any).env?.VITE_MQTT_DEFAULT_HOST || 'localhost',
            defaultPort: parseInt((import.meta as any).env?.VITE_MQTT_DEFAULT_PORT || '1883'),
            connected: false,
            enabled: true,
        },
    });

    useEffect(() => {
        bacnetDriver.configure({
            url: config.bacnet.url,
            apiKey: config.bacnet.apiKey,
        });
    }, [config.bacnet.url, config.bacnet.apiKey]);

    useEffect(() => {
        distechDriver.configure({
            url: config.distech.url,
            apiKey: config.distech.apiKey,
            ecyUrl: config.distech.ecyUrl,
            ecyUser: config.distech.ecyUser,
            ecyPassword: config.distech.ecyPassword,
        });
    }, [
        config.distech.url,
        config.distech.apiKey,
        config.distech.ecyUrl,
        config.distech.ecyUser,
        config.distech.ecyPassword
    ]);

    useEffect(() => {
        mqttDriver.configure({
            url: config.mqtt.url,
            apiKey: config.mqtt.apiKey,
            defaultHost: config.mqtt.defaultHost,
            defaultPort: config.mqtt.defaultPort,
        });
    }, [
        config.mqtt.url,
        config.mqtt.apiKey,
        config.mqtt.defaultHost,
        config.mqtt.defaultPort
    ]);

    const [testingDriver, setTestingDriver] = useState<string | null>(null);
    const [edeDevices, setEdeDevices] = useState<EDEDevice[]>([]);
    const [showEdeImport, setShowEdeImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bacnetIpScanParams, setBacnetIpScanParams] = useState({
        ipRange: '192.168.1.1-192.168.1.50',
        port: 47808,
        objectTypes: 'analogInput,analogValue,binaryValue',
        limitPerDevice: 20,
    });
    const [bacnetIpDevices, setBacnetIpDevices] = useState<BacnetIPDevice[]>([]);
    const [isScanningIp, setIsScanningIp] = useState(false);

    // Real-time update settings
    const [realTimeMode, setRealTimeMode] = useState<RealTimeMode>('polling');
    const [pollingInterval, setPollingInterval] = useState(5000); // 5 seconds
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        // Check initial connection status
        setConfig(prev => ({
            ...prev,
            bacnet: { ...prev.bacnet, connected: bacnetDriver.isConnectedToMCP() },
            distech: { ...prev.distech, connected: distechDriver.isConnectedToMCP() },
            mqtt: { ...prev.mqtt, connected: mqttDriver.isConnectedToMCP() },
        }));
    }, []);

    useEffect(() => {
        if (!config.bacnet.enabled) {
            bacnetDriver.disconnect();
            setConfig(prev => ({ ...prev, bacnet: { ...prev.bacnet, connected: false } }));
        }
    }, [config.bacnet.enabled]);

    useEffect(() => {
        if (!config.distech.enabled) {
            distechDriver.disconnect();
            setConfig(prev => ({ ...prev, distech: { ...prev.distech, connected: false } }));
        }
    }, [config.distech.enabled]);

    useEffect(() => {
        if (!config.mqtt.enabled) {
            mqttDriver.disconnect();
            setConfig(prev => ({ ...prev, mqtt: { ...prev.mqtt, connected: false } }));
        }
    }, [config.mqtt.enabled]);

    useEffect(() => {
        const unsubscribe = bacnetIPDriver.subscribe((devices, busy) => {
            setBacnetIpDevices(devices);
            setIsScanningIp(busy);
        });
        return () => unsubscribe();
    }, []);

    // Polling effect
    useEffect(() => {
        if (realTimeMode !== 'polling' || !autoRefresh) return;

        const interval = setInterval(async () => {
            try {
                // Refresh BACnet devices
                const bacnetDevices = bacnetDriver.getDevices();
                for (const device of bacnetDevices) {
                    if (device.objects.length > 0) {
                        await bacnetDriver.getObjectList(device.deviceId);
                    }
                }

                // Update treeData with fresh values
                updateTreeDataValues(bacnetDevices);
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, pollingInterval);

        return () => clearInterval(interval);
    }, [realTimeMode, autoRefresh, pollingInterval]);

    // Helper function to update treeData values from BACnet devices
    const updateTreeDataValues = (bacnetDevices: any[]) => {
        const updateNodeValues = (nodes: DataNode[]): DataNode[] => {
            return nodes.map(node => {
                // Update BACnet variable values
                if (node.id.startsWith('bacnet_')) {
                    // Extract device ID and object ID from node ID
                    const parts = node.id.split('_');
                    if (parts.length >= 3) {
                        const deviceId = parseInt(parts[1]);
                        const device = bacnetDevices.find(d => d.deviceId === deviceId);

                        if (device) {
                            // Find matching object
                            const objectId = node.id.replace(`bacnet_${deviceId}_`, '');
                            const obj = device.objects.find((o: any) =>
                                o.id === objectId ||
                                o.id.replace(':', '_') === objectId
                            );

                            if (obj) {
                                return {
                                    ...node,
                                    value: obj.presentValue,
                                    unit: obj.units
                                };
                            }
                        }
                    }
                }

                // Recursively update children
                if (node.children) {
                    return {
                        ...node,
                        children: updateNodeValues(node.children)
                    };
                }

                return node;
            });
        };

        setTreeData(prevTree => updateNodeValues(prevTree));
    };

    // WebSocket effect (placeholder for future implementation)
    useEffect(() => {
        if (realTimeMode !== 'websocket') return;

        // TODO: Implement WebSocket connection
        console.log('WebSocket mode enabled - implementation pending');

        return () => {
            // TODO: Close WebSocket connection
        };
    }, [realTimeMode]);

    // COV effect (placeholder for future implementation)
    useEffect(() => {
        if (realTimeMode !== 'cov') return;

        // TODO: Implement COV subscriptions
        console.log('COV mode enabled - implementation pending');

        return () => {
            // TODO: Unsubscribe from COV
        };
    }, [realTimeMode]);

    const handleTestConnection = async (driver: 'bacnet' | 'distech' | 'mqtt') => {
        if (!config[driver].enabled) {
            alert(localize('Communication disabled for this driver.'));
            return;
        }
        setTestingDriver(driver);

        try {
            if (driver === 'bacnet') {
                bacnetDriver.disconnect();
                await bacnetDriver.connect();
                setConfig(prev => ({
                    ...prev,
                    bacnet: { ...prev.bacnet, connected: bacnetDriver.isConnectedToMCP() },
                }));
            } else if (driver === 'distech') {
                distechDriver.disconnect();
                await distechDriver.connect();
                setConfig(prev => ({
                    ...prev,
                    distech: { ...prev.distech, connected: distechDriver.isConnectedToMCP() },
                }));
            } else if (driver === 'mqtt') {
                mqttDriver.disconnect();
                await mqttDriver.connect();
                setConfig(prev => ({
                    ...prev,
                    mqtt: { ...prev.mqtt, connected: mqttDriver.isConnectedToMCP() },
                }));
            }
        } catch (error) {
            console.error(`Failed to connect to ${driver}:`, error);
            alert(`Failed to connect to ${driver} MCP server`);
        } finally {
            setTestingDriver(null);
        }
    };

    const handleConfigChange = (driver: 'bacnet' | 'distech' | 'mqtt', field: string, value: string | number) => {
        setConfig(prev => ({
            ...prev,
            [driver]: {
                ...prev[driver],
                [field]: value,
            },
        }));
    };

    const handleEDEFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const devices = parseEDEFile(text);
            setEdeDevices(devices);
            const totalObjects = devices.reduce((sum, d) => sum + d.objects.length, 0);
            const successMessage = language === 'fr'
                ? `Analyse reussie : ${devices.length} equipement(s), ${totalObjects} objets.`
                : `Parsed ${devices.length} device(s) with ${totalObjects} total objects.`;
            alert(successMessage);
        } catch (error) {
            console.error('Failed to parse EDE file:', error);
            alert(language === 'fr'
                ? 'Impossible de lire le fichier EDE. Verifiez le format.'
                : 'Failed to parse EDE file. Please check the format.');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBacnetIpScan = async () => {
        setIsScanningIp(true);
        try {
            await bacnetIPDriver.scan({
                ipRange: bacnetIpScanParams.ipRange,
                port: bacnetIpScanParams.port,
                objectTypes: bacnetIpScanParams.objectTypes.split(',').map(s => s.trim()).filter(Boolean),
                limitPerDevice: bacnetIpScanParams.limitPerDevice,
            });
        } catch (error) {
            console.error('BACnet IP scan failed:', error);
            alert(language === 'fr' ? 'Scan BACnet IP echoue.' : 'BACnet IP scan failed.');
        } finally {
            setIsScanningIp(false);
        }
    };

    const handleImportAllEDE = () => {
        let importedCount = 0;
        let newTree = [...treeData];

        // Find or create Network folder
        let networkFolder = newTree.find(n => n.id === 'network_folder');
        if (!networkFolder) {
            networkFolder = {
                id: 'network_folder',
                label: 'Network',
                type: 'folder',
                children: []
            };
            newTree.push(networkFolder);
        }

        // Find or create BACnet folder
        let bacnetFolder = networkFolder.children?.find(n => n.id === 'bacnet_network');
        if (!bacnetFolder) {
            bacnetFolder = {
                id: 'bacnet_network',
                label: 'BACnet',
                type: 'folder',
                children: []
            };
            if (!networkFolder.children) networkFolder.children = [];
            networkFolder.children.push(bacnetFolder);
        }

        // Import all devices and objects
        for (const device of edeDevices) {
            // Find or create device folder
            let deviceFolder = bacnetFolder.children?.find(n => n.id === `bacnet_ede_${device.deviceInstance}`);
            if (!deviceFolder) {
                deviceFolder = {
                    id: `bacnet_ede_${device.deviceInstance}`,
                    label: device.deviceName,
                    type: 'equipment',
                    children: []
                };
                if (!bacnetFolder.children) bacnetFolder.children = [];
                bacnetFolder.children.push(deviceFolder);
            }

            // Import all objects for this device
            for (const obj of device.objects) {
                const objId = `bacnet_ede_${device.deviceInstance}_${obj.objectType}_${obj.objectInstance}`;

                // Check if already exists
                const exists = findNodeInTree(newTree, objId);
                if (exists) continue;

                const newNode: DataNode = {
                    id: objId,
                    label: obj.objectName,
                    type: 'variable',
                    value: obj.presentValue || 0,
                    unit: obj.units || ''
                };

                if (!deviceFolder.children) deviceFolder.children = [];
                deviceFolder.children.push(newNode);
                importedCount++;
            }
        }

        setTreeData(newTree);
        const importMessage = language === 'fr'
            ? `Import termine : ${importedCount} objets ajoutes.\n\nValeurs issues du fichier EDE. Utilisez MCP pour les valeurs temps reel.`
            : `Imported ${importedCount} objects from the EDE file.\n\nNote: Values come from the EDE file. Use MCP for live data.`;
        alert(importMessage);
        setEdeDevices([]);
        setShowEdeImport(false);
    };

    const toggleDriverEnabled = (driver: 'bacnet' | 'distech' | 'mqtt') => {
        setConfig(prev => ({
            ...prev,
            [driver]: {
                ...prev[driver],
                enabled: !prev[driver].enabled,
            }
        }));
    };

    const findNodeInTree = (nodes: DataNode[], id: string): DataNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNodeInTree(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    const renderConfigPanel = () => (
        <div className="space-y-6">
            {/* Real-time Update Settings */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
                    <RefreshCw className="text-blue-500" size={20} />
                    {localize('Real-time Update Configuration')}
                </h3>

                <div className="space-y-4">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {localize('Update Mode')}
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setRealTimeMode('polling')}
                                className={`p-3 rounded-lg border-2 transition-all ${realTimeMode === 'polling'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                    : 'border-gray-200 dark:border-white/10 hover:border-blue-300'
                                    }`}
                            >
                                    <div className="font-medium dark:text-white">{localize('Polling')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{localize('Simple, periodic refresh')}</div>
                            </button>
                            <button
                                onClick={() => setRealTimeMode('websocket')}
                                className={`p-3 rounded-lg border-2 transition-all ${realTimeMode === 'websocket'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                    : 'border-gray-200 dark:border-white/10 hover:border-purple-300'
                                    }`}
                            >
                                    <div className="font-medium dark:text-white">{localize('WebSocket')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{localize('Real-time push')}</div>
                            </button>
                            <button
                                onClick={() => setRealTimeMode('cov')}
                                className={`p-3 rounded-lg border-2 transition-all ${realTimeMode === 'cov'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                    : 'border-gray-200 dark:border-white/10 hover:border-green-300'
                                    }`}
                            >
                                    <div className="font-medium dark:text-white">{localize('COV')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{localize('BACnet native')}</div>
                            </button>
                        </div>
                    </div>

                    {/* Polling Settings */}
                    {realTimeMode === 'polling' && (
                        <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium dark:text-white">{localize('Auto-refresh')}</label>
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {localize('Refresh Interval')}: {pollingInterval / 1000}s
                                </label>
                                <input
                                    type="range"
                                    min="1000"
                                    max="30000"
                                    step="1000"
                                    value={pollingInterval}
                                    onChange={(e) => setPollingInterval(parseInt(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1s</span>
                                    <span>30s</span>
                                </div>
                            </div>
                            {lastUpdate && (
                                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                    Last update: {lastUpdate.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* WebSocket Info */}
                    {realTimeMode === 'websocket' && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-purple-900 dark:text-purple-200">
                                ⚠️ WebSocket mode requires MCP server WebSocket support (coming soon)
                            </p>
                        </div>
                    )}

                    {/* COV Info */}
                    {realTimeMode === 'cov' && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-900 dark:text-green-200">
                                ⚠️ COV mode requires BACnet devices with COV support (coming soon)
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* BACnet Configuration */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Server className="text-blue-500" size={24} />
                        <h3 className="text-lg font-semibold dark:text-white">BACnet MCP Server</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {config.bacnet.connected ? (
                            <CheckCircle className="text-green-500" size={20} />
                        ) : (
                            <XCircle className="text-red-500" size={20} />
                        )}
                        <span className={`text-sm font-medium ${config.bacnet.connected ? 'text-green-500' : 'text-red-500'}`}>
                            {config.bacnet.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MCP Server URL
                        </label>
                        <input
                            type="text"
                            value={config.bacnet.url}
                            onChange={(e) => handleConfigChange('bacnet', 'url', e.target.value)}
                            placeholder="http://localhost:8000"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API Key (Optional)
                        </label>
                        <input
                            type="password"
                            value={config.bacnet.apiKey}
                            onChange={(e) => handleConfigChange('bacnet', 'apiKey', e.target.value)}
                            placeholder="Enter API key if required"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                        />
                    </div>

                    <button
                        onClick={() => handleTestConnection('bacnet')}
                        disabled={testingDriver === 'bacnet'}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {testingDriver === 'bacnet' ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            {localize('Testing Connection...')}
                        </>
                    ) : (
                        <>
                            <Server size={18} />
                            {localize('Test Connection')}
                        </>
                    )}
                </button>
                </div>
            </div>

            {/* Distech Configuration */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Server className="text-purple-500" size={24} />
                        <h3 className="text-lg font-semibold dark:text-white">Distech MCP Server</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {config.distech.connected ? (
                            <CheckCircle className="text-green-500" size={20} />
                        ) : (
                            <XCircle className="text-red-500" size={20} />
                        )}
                        <span className={`text-sm font-medium ${config.distech.connected ? 'text-green-500' : 'text-red-500'}`}>
                            {config.distech.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MCP Server URL
                        </label>
                        <input
                            type="text"
                            value={config.distech.url}
                            onChange={(e) => handleConfigChange('distech', 'url', e.target.value)}
                            placeholder="http://localhost:8001"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                        />
                    </div>

                    <button
                        onClick={() => handleTestConnection('distech')}
                        disabled={testingDriver === 'distech'}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {testingDriver === 'distech' ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            {localize('Testing Connection...')}
                        </>
                    ) : (
                        <>
                            <Server size={18} />
                            {localize('Test Connection')}
                        </>
                    )}
                </button>
                </div>
            </div>

            {/* MQTT Configuration */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Wifi className="text-orange-500" size={24} />
                        <h3 className="text-lg font-semibold dark:text-white">MQTT MCP Server</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {config.mqtt.connected ? (
                            <CheckCircle className="text-green-500" size={20} />
                        ) : (
                            <XCircle className="text-red-500" size={20} />
                        )}
                        <span className={`text-sm font-medium ${config.mqtt.connected ? 'text-green-500' : 'text-red-500'}`}>
                            {config.mqtt.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MCP Server URL
                        </label>
                        <input
                            type="text"
                            value={config.mqtt.url}
                            onChange={(e) => handleConfigChange('mqtt', 'url', e.target.value)}
                            placeholder="http://localhost:8002"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Broker Host
                            </label>
                            <input
                                type="text"
                                value={config.mqtt.defaultHost}
                                onChange={(e) => handleConfigChange('mqtt', 'defaultHost', e.target.value)}
                                placeholder="localhost"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Port
                            </label>
                            <input
                                type="number"
                                value={config.mqtt.defaultPort}
                                onChange={(e) => handleConfigChange('mqtt', 'defaultPort', parseInt(e.target.value))}
                                placeholder="1883"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => handleTestConnection('mqtt')}
                        disabled={testingDriver === 'mqtt'}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {testingDriver === 'mqtt' ? (
                        <>
                            <RefreshCw size={18} className="animate-spin" />
                            {localize('Testing Connection...')}
                        </>
                    ) : (
                        <>
                            <Wifi size={18} />
                            {localize('Test Connection')}
                        </>
                    )}
                </button>
                </div>
            </div>
        </div>
    );

    const renderWidgetsPanel = () => (
        <div className="text-center py-12 text-gray-500">
            <Grid3x3 size={48} className="mx-auto mb-4 opacity-20" />
            <p>Widget palettes coming soon...</p>
            <p className="text-sm mt-2">Drag and drop widgets for BACnet, Distech, and MQTT</p>
        </div>
    );

    const renderImportPanel = () => {
        const bacnetDevices = bacnetDriver.getDevices();
        const distechDevices = distechDriver.getDevices();
        const mqttBrokers = mqttDriver.getBrokers();
        const handleImportBacnetIpPoint = (device: BacnetIPDevice, point: any) => {
            const objId = `bacnet_ip_${device.deviceId}_${point.objectType}_${point.instance}`;
            const exists = findNode(treeData, objId);
            if (exists) {
                alert(language === 'fr' ? 'Point deja importe !' : 'Point already imported!');
                return;
            }
            const newNode: DataNode = {
                id: objId,
                label: `${device.address} - ${point.name}`,
                type: 'variable',
                value: point.presentValue,
                unit: point.units,
            };
            let newTree = [...treeData];
            let networkFolder = newTree.find(n => n.id === 'network_ip_folder');
            if (!networkFolder) {
                networkFolder = {
                    id: 'network_ip_folder',
                    label: 'BACnet IP',
                    type: 'folder',
                    children: [],
                };
                newTree.push(networkFolder);
            }
            if (!networkFolder.children) networkFolder.children = [];
            networkFolder.children.push(newNode);
            setTreeData(newTree);
            alert(language === 'fr' ? `Point importe : ${point.name}` : `Imported point: ${point.name}`);
        };

        const handleImportBACnetObject = (device: any, obj: any) => {
            const newId = `bacnet_${device.deviceId}_${obj.id.replace(':', '_')}`;
            const newLabel = `${obj.name || obj.id}`;

            // Check if already exists
            const exists = findNode(treeData, newId);
            if (exists) {
                alert("Variable already imported!");
                return;
            }

            const newNode: DataNode = {
                id: newId,
                label: newLabel,
                type: 'variable',
                value: obj.presentValue,
                unit: obj.units
            };

            // Create Network > BACnet > Device structure
            let newTree = [...treeData];

            // Find or create Network folder
            let networkFolder = newTree.find(n => n.id === 'network_folder');
            if (!networkFolder) {
                networkFolder = {
                    id: 'network_folder',
                    label: 'Network',
                    type: 'folder',
                    children: []
                };
                newTree.push(networkFolder);
            }

            // Find or create BACnet folder
            let bacnetFolder = networkFolder.children?.find(n => n.id === 'bacnet_network');
            if (!bacnetFolder) {
                bacnetFolder = {
                    id: 'bacnet_network',
                    label: 'BACnet',
                    type: 'folder',
                    children: []
                };
                if (!networkFolder.children) networkFolder.children = [];
                networkFolder.children.push(bacnetFolder);
            }

            // Find or create device folder
            let deviceFolder = bacnetFolder.children?.find(n => n.id === `bacnet_dev_${device.deviceId}`);
            if (!deviceFolder) {
                deviceFolder = {
                    id: `bacnet_dev_${device.deviceId}`,
                    label: device.name,
                    type: 'equipment',
                    children: []
                };
                if (!bacnetFolder.children) bacnetFolder.children = [];
                bacnetFolder.children.push(deviceFolder);
            }

            if (!deviceFolder.children) deviceFolder.children = [];
            deviceFolder.children.push(newNode);

            setTreeData(newTree);
            alert(`Imported: ${newLabel}`);
        };

        const handleImportDistechObject = (device: any, obj: any) => {
            const newId = `distech_${device.deviceId}_${obj.type}_${obj.instance}`;
            const newLabel = obj.objectName || `${obj.type} ${obj.instance}`;

            const exists = findNode(treeData, newId);
            if (exists) {
                alert("Variable already imported!");
                return;
            }

            const newNode: DataNode = {
                id: newId,
                label: newLabel,
                type: 'variable',
                value: obj.presentValue,
                unit: obj.units
            };

            let newTree = [...treeData];
            let networkFolder = newTree.find(n => n.id === 'network_folder');
            if (!networkFolder) {
                networkFolder = { id: 'network_folder', label: 'Network', type: 'folder', children: [] };
                newTree.push(networkFolder);
            }

            let distechFolder = networkFolder.children?.find(n => n.id === 'distech_network');
            if (!distechFolder) {
                distechFolder = { id: 'distech_network', label: 'Distech', type: 'folder', children: [] };
                if (!networkFolder.children) networkFolder.children = [];
                networkFolder.children.push(distechFolder);
            }

            let deviceFolder = distechFolder.children?.find(n => n.id === `distech_dev_${device.deviceId}`);
            if (!deviceFolder) {
                deviceFolder = { id: `distech_dev_${device.deviceId}`, label: device.name, type: 'equipment', children: [] };
                if (!distechFolder.children) distechFolder.children = [];
                distechFolder.children.push(deviceFolder);
            }

            if (!deviceFolder.children) deviceFolder.children = [];
            deviceFolder.children.push(newNode);

            setTreeData(newTree);
            alert(`Imported: ${newLabel}`);
        };

        const handleImportMQTTTopic = (broker: any, topic: any) => {
            const newId = `mqtt_${broker.id}_${topic.topic.replace(/\//g, '_')}`;
            const newLabel = topic.topic;

            const exists = findNode(treeData, newId);
            if (exists) {
                alert("Topic already imported!");
                return;
            }

            const newNode: DataNode = {
                id: newId,
                label: newLabel,
                type: 'variable',
                value: topic.lastMessage || '',
                unit: ''
            };

            let newTree = [...treeData];
            let networkFolder = newTree.find(n => n.id === 'network_folder');
            if (!networkFolder) {
                networkFolder = { id: 'network_folder', label: 'Network', type: 'folder', children: [] };
                newTree.push(networkFolder);
            }

            let mqttFolder = networkFolder.children?.find(n => n.id === 'mqtt_network');
            if (!mqttFolder) {
                mqttFolder = { id: 'mqtt_network', label: 'MQTT', type: 'folder', children: [] };
                if (!networkFolder.children) networkFolder.children = [];
                networkFolder.children.push(mqttFolder);
            }

            let brokerFolder = mqttFolder.children?.find(n => n.id === `mqtt_broker_${broker.id}`);
            if (!brokerFolder) {
                brokerFolder = { id: `mqtt_broker_${broker.id}`, label: broker.name, type: 'equipment', children: [] };
                if (!mqttFolder.children) mqttFolder.children = [];
                mqttFolder.children.push(brokerFolder);
            }

            if (!brokerFolder.children) brokerFolder.children = [];
            brokerFolder.children.push(newNode);

            setTreeData(newTree);
            alert(`Imported: ${newLabel}`);
        };

        const findNode = (nodes: DataNode[], id: string): DataNode | undefined => {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.children) {
                    const found = findNode(node.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">{localize('Import to Site Structure')}</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {localize('Click Import to add variables to the Site Structure. They will be organized under <strong>Network -> BACnet/Distech/MQTT -> Device</strong>.')}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={() => setShowEdeImport(!showEdeImport)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <FileText size={16} />
                            {showEdeImport ? localize('Hide') : localize('Import BACnet EDE File')}
                        </button>
                    </div>
                </div>

                {/* EDE File Import Section */}
                {showEdeImport && (
                    <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
                            <Upload className="text-blue-500" size={20} />
                            {localize('BACnet EDE File Import')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {localize('Upload a BACnet EDE (Engineering Data Exchange) CSV file to automatically import devices and objects.')}
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleEDEFileUpload}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload size={18} />
                            {localize('Choose EDE File')}
                        </button>

                        {edeDevices.length > 0 && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium dark:text-white">Found {edeDevices.length} device(s)</h4>
                                    <button
                                        onClick={handleImportAllEDE}
                                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                                    >
                                        {localize('Import All')} ({edeDevices.reduce((sum, d) => sum + d.objects.length, 0)} {language === 'fr' ? 'objets' : 'objects'})
                                    </button>
                                </div>
                                {edeDevices.map(device => (
                                    <div key={device.deviceInstance} className="border border-gray-200 dark:border-white/10 rounded-lg p-3">
                                        <div className="font-medium dark:text-white">{device.deviceName} (ID: {device.deviceInstance})</div>
                                        <div className="text-xs text-gray-500 mt-1">{device.objects.length} objects</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* BACnet IP Scan */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                            <Server className="text-cyan-500" size={20} />
                            {localize('BACnet IP Scan')}
                        </h3>
                        <button
                            onClick={handleBacnetIpScan}
                            disabled={isScanningIp}
                            className="text-sm bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            {isScanningIp ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    {localize('Scanning...')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    {localize('Scan Network')}
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {localize('IP Range')}
                            </label>
                            <input
                                type="text"
                                value={bacnetIpScanParams.ipRange}
                                onChange={(e) => setBacnetIpScanParams({ ...bacnetIpScanParams, ipRange: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                placeholder="192.168.1.1-192.168.1.50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {localize('Port')}
                            </label>
                            <input
                                type="number"
                                value={bacnetIpScanParams.port}
                                onChange={(e) => setBacnetIpScanParams({ ...bacnetIpScanParams, port: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {localize('Object Types')}
                            </label>
                            <input
                                type="text"
                                value={bacnetIpScanParams.objectTypes}
                                onChange={(e) => setBacnetIpScanParams({ ...bacnetIpScanParams, objectTypes: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                                placeholder="analogInput,analogValue,binaryValue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {localize('Limit per Device')}
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={bacnetIpScanParams.limitPerDevice}
                                onChange={(e) => setBacnetIpScanParams({ ...bacnetIpScanParams, limitPerDevice: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mt-5">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
                            <span>{localize('Discovered BACnet IP Devices')}</span>
                            <span className="text-xs text-gray-500">{bacnetIpDevices.length}</span>
                        </h4>
                        {bacnetIpDevices.length === 0 ? (
                            <p className="text-sm text-gray-500">{localize('No BACnet IP devices found yet.')}</p>
                        ) : (
                            <div className="space-y-3">
                                {bacnetIpDevices.map((device) => (
                                    <div key={`${device.deviceId}-${device.address}`} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{device.address} (ID: {device.deviceId})</div>
                                                <div className="text-xs text-gray-500">
                                                    {device.vendor || device.description || 'BACnet/IP'} {device.lastSeen ? `· ${new Date(device.lastSeen).toLocaleString()}` : ''}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">{device.points.length} pts</span>
                                        </div>
                                        {device.points.length > 0 ? (
                                            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {device.points.map((point) => (
                                                    <div key={`${device.deviceId}-${point.objectType}-${point.instance}`} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded">
                                                        <div className="flex-1 pr-3">
                                                            <div className="text-sm font-medium dark:text-white">{point.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {point.objectType} #{point.instance} · {point.presentValue ?? '-'} {point.units || ''}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleImportBacnetIpPoint(device, point)}
                                                            className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded"
                                                        >
                                                            {localize('Import')}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-2">{localize('No objects loaded.')}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* BACnet Section */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                            <Server className="text-blue-500" size={20} />
                            {localize('BACnet Devices')} ({bacnetDevices.length})
                        </h3>
                        <button
                            onClick={() => toggleDriverEnabled('bacnet')}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${config.bacnet.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                            {config.bacnet.enabled ? localize('Disable communication') : localize('Enable communication')}
                        </button>
                    </div>
                    {bacnetDevices.length === 0 ? (
                        <p className="text-gray-500 text-sm">{localize('No BACnet devices discovered. Go to Configuration tab and scan the network.')}</p>
                    ) : (
                        <div className="space-y-4">
                            {bacnetDevices.map(device => (
                                <div key={device.deviceId} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                    <div className="font-medium text-gray-900 dark:text-white mb-2">{device.name} (ID: {device.deviceId})</div>
                                    {device.objects.length === 0 ? (
                                        <p className="text-xs text-gray-500">{localize('No objects loaded. Click Load Objects in the BACnet Manager.')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {device.objects.slice(0, 5).map(obj => (
                                                <div key={obj.id} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium dark:text-white">{obj.name}</div>
                                                        <div className="text-xs text-gray-500">{obj.type} - {obj.presentValue} {obj.units}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleImportBACnetObject(device, obj)}
                                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                                                    >
                                                        {localize('Import')}
                                                    </button>
                                                </div>
                                            ))}
                                            {device.objects.length > 5 && (
                                                <p className="text-xs text-gray-500">
                                                    {language === 'fr'
                                                        ? `... et ${device.objects.length - 5} autres objets`
                                                        : `... and ${device.objects.length - 5} more objects`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Distech Section */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                            <Server className="text-purple-500" size={20} />
                            {localize('Distech Devices')} ({distechDevices.length})
                        </h3>
                        <button
                            onClick={() => toggleDriverEnabled('distech')}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${config.distech.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                            {config.distech.enabled ? localize('Disable communication') : localize('Enable communication')}
                        </button>
                    </div>
                    {distechDevices.length === 0 ? (
                        <p className="text-gray-500 text-sm">{localize('No Distech devices configured.')}</p>
                    ) : (
                        <div className="space-y-4">
                            {distechDevices.map(device => (
                                <div key={device.deviceId} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                    <div className="font-medium text-gray-900 dark:text-white mb-2">{device.name}</div>
                                    {device.objects.length === 0 ? (
                                        <p className="text-xs text-gray-500">{localize('No objects loaded.')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {device.objects.slice(0, 5).map(obj => (
                                                <div key={`${obj.type}_${obj.instance}`} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium dark:text-white">{obj.objectName || `${obj.type} ${obj.instance}`}</div>
                                                        <div className="text-xs text-gray-500">{obj.presentValue} {obj.units}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleImportDistechObject(device, obj)}
                                                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                                                    >
                                                        {localize('Import')}
                                                    </button>
                                                </div>
                                            ))}
                                            {device.objects.length > 5 && (
                                                <p className="text-xs text-gray-500">
                                                    {language === 'fr'
                                                        ? `... et ${device.objects.length - 5} autres objets`
                                                        : `... and ${device.objects.length - 5} more objects`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MQTT Section */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                            <Wifi className="text-orange-500" size={20} />
                            {localize('MQTT Brokers')} ({mqttBrokers.length})
                        </h3>
                        <button
                            onClick={() => toggleDriverEnabled('mqtt')}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${config.mqtt.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                            {config.mqtt.enabled ? localize('Disable communication') : localize('Enable communication')}
                        </button>
                    </div>
                    {mqttBrokers.length === 0 ? (
                        <p className="text-gray-500 text-sm">{localize('No MQTT brokers configured.')}</p>
                    ) : (
                        <div className="space-y-4">
                            {mqttBrokers.map(broker => (
                                <div key={broker.id} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                    <div className="font-medium text-gray-900 dark:text-white mb-2">{broker.name} ({broker.host}:{broker.port})</div>
                                    {broker.topics.length === 0 ? (
                                        <p className="text-xs text-gray-500">{localize('No topics subscribed.')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {broker.topics.slice(0, 5).map(topic => (
                                                <div key={topic.topic} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium dark:text-white font-mono">{topic.topic}</div>
                                                        <div className="text-xs text-gray-500">{topic.lastMessage || 'No message'}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleImportMQTTTopic(broker, topic)}
                                                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded"
                                                    >
                                                        {localize('Import')}
                                                    </button>
                                                </div>
                                            ))}
                                            {broker.topics.length > 5 && (
                                                <p className="text-xs text-gray-500">... and {broker.topics.length - 5} more topics</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-[#1c1c1e]">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Wifi className="text-orange-500" />
                    {localize('Network Manager')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'fr'
                        ? 'Configurez les drivers, gérez les widgets et importez des variables'
                        : 'Configure drivers, manage widgets, and import variables'}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-white/10">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'config'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Settings size={18} className="inline mr-2" />
                    {localize('Configuration')}
                </button>
                <button
                    onClick={() => setActiveTab('widgets')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'widgets'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Grid3x3 size={18} className="inline mr-2" />
                    {localize('Widgets')}
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'import'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <FolderTree size={18} className="inline mr-2" />
                    {localize('Import')}
                </button>
            </div>

            {/* Content */}
            <div className="max-w-4xl">
                {activeTab === 'config' && renderConfigPanel()}
                {activeTab === 'widgets' && renderWidgetsPanel()}
                {activeTab === 'import' && renderImportPanel()}
            </div>
        </div>
    );
};
