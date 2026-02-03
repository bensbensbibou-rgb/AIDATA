import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Wifi, Activity, ArrowRight, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { distechDriver } from '../drivers/DistechDriver';
import { DistechDevice, DistechObject } from '../drivers/DistechTypes';
import { DataNode } from '../types';

interface DistechManagerProps {
    treeData: DataNode[];
    setTreeData: (data: DataNode[]) => void;
}

export const DistechManager: React.FC<DistechManagerProps> = ({ treeData, setTreeData }) => {
    const [devices, setDevices] = useState<DistechDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<DistechDevice | null>(null);
    const [mcpConnected, setMcpConnected] = useState(false);
    const [isLoadingObjects, setIsLoadingObjects] = useState(false);
    const [eventCount, setEventCount] = useState(0);
    const [mappedCount, setMappedCount] = useState(0);

    useEffect(() => {
        const initDriver = async () => {
            try {
                await distechDriver.connect();
                setMcpConnected(distechDriver.isConnectedToMCP());
            } catch (error) {
                0
                console.error('Failed to connect to Distech MCP server:', error);
                setMcpConnected(false);
            }
        };

        initDriver();

        const unsubscribe = distechDriver.subscribe((updatedDevices) => {
            setDevices([...updatedDevices]);
            if (selectedDevice) {
                const updatedSelected = updatedDevices.find(d => d.deviceId === selectedDevice.deviceId);
                if (updatedSelected) setSelectedDevice(updatedSelected);
            }
        });

        distechDriver.startPolling();

        return () => {
            unsubscribe();
            distechDriver.disconnect();
        };
    }, []);

    const handleLoadObjects = async (device: DistechDevice, objectType: string, instances: number[]) => {
        setIsLoadingObjects(true);
        try {
            await distechDriver.loadObjects(device.deviceId, objectType, instances);
        } catch (error) {
            console.error('Failed to load objects:', error);
        } finally {
            setIsLoadingObjects(false);
        }
    };

    const handleLoadEvents = async () => {
        try {
            const events = await distechDriver.getEventNotifications();
            setEventCount(events.length);
            console.log('Events:', events);
        } catch (error) {
            console.error('Failed to load events:', error);
        }
    };

    const handleMapObject = (device: DistechDevice, obj: DistechObject) => {
        const newId = `distech_${device.deviceId}_${obj.type}_${obj.instance}`;
        const newLabel = `${device.name} - ${obj.objectName || `${obj.type} ${obj.instance}`}`;

        // Check if already exists
        const exists = findNode(treeData, newId);
        if (exists) {
            alert("Variable already mapped!");
            return;
        }

        const newNode: DataNode = {
            id: newId,
            label: newLabel,
            type: 'variable',
            value: obj.presentValue,
            unit: obj.units
        };

        // Add to a "Distech" folder
        let newTree = [...treeData];
        let distechFolder = newTree.find(n => n.id === 'distech_network');

        if (!distechFolder) {
            distechFolder = {
                id: 'distech_network',
                label: 'Distech Network',
                type: 'folder',
                children: []
            };
            newTree.push(distechFolder);
        }

        // Add device folder if needed
        let deviceFolder = distechFolder.children?.find(n => n.id === `distech_dev_${device.deviceId}`);
        if (!deviceFolder) {
            deviceFolder = {
                id: `distech_dev_${device.deviceId}`,
                label: device.name,
                type: 'equipment',
                children: []
            };
            if (!distechFolder.children) distechFolder.children = [];
            distechFolder.children.push(deviceFolder);
        }

        if (!deviceFolder.children) deviceFolder.children = [];
        deviceFolder.children.push(newNode);

        setTreeData(newTree);
        setMappedCount(prev => prev + 1);
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
        <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-[#1c1c1e]">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Server className="text-purple-500" />
                        Distech ECY Manager
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Distech controllers and map points to the explorer.</p>
                </div>
                <div className="flex gap-3">
                    <div className={`bg-white dark:bg-white/5 px-4 py-2 rounded-lg border ${mcpConnected ? 'border-green-500' : 'border-red-500'} flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full ${mcpConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium dark:text-gray-200">
                            {mcpConnected ? 'MCP Connected' : 'MCP Disconnected'}
                        </span>
                    </div>
                    <div className="bg-white dark:bg-white/5 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-2">
                        <Activity size={16} className="text-purple-500" />
                        <span className="text-sm font-medium dark:text-gray-200">{devices.length} Devices</span>
                    </div>
                    <button
                        onClick={handleLoadEvents}
                        disabled={!mcpConnected}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${!mcpConnected ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/30'}`}
                    >
                        <Bell size={18} />
                        Events ({eventCount})
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Device List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-semibold dark:text-gray-200">Devices</h2>
                    {devices.length === 0 ? (
                        <div className="bg-white dark:bg-white/5 rounded-xl p-8 text-center border border-dashed border-gray-300 dark:border-white/10">
                            <Wifi size={32} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500">No devices configured.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {devices.map(device => (
                                <div
                                    key={device.deviceId}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedDevice?.deviceId === device.deviceId ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-purple-300'}`}
                                >
                                    <div onClick={() => setSelectedDevice(device)}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-800 dark:text-white">{device.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${device.isLocal ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {device.isLocal ? 'Local' : 'Remote'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div className="flex justify-between"><span>ID:</span> <span className="font-mono">{device.deviceId}</span></div>
                                            <div className="flex justify-between"><span>Objects:</span> <span>{device.objects.length}</span></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Example: load analogValue instances 1-10
                                            handleLoadObjects(device, 'analogValue', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                                        }}
                                        disabled={isLoadingObjects}
                                        className="mt-3 w-full text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white py-1.5 px-3 rounded transition-colors"
                                    >
                                        {isLoadingObjects && selectedDevice?.deviceId === device.deviceId ? 'Loading...' : 'Load Objects'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Object List */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-semibold dark:text-gray-200 mb-4">
                        {selectedDevice ? `Objects for ${selectedDevice.name}` : 'Select a device to view objects'}
                    </h2>

                    {selectedDevice ? (
                        <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                    <tr>
                                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Object Name</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Value</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {selectedDevice.objects.map(obj => (
                                        <tr key={`${obj.type}_${obj.instance}`} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{obj.objectName || `${obj.type} ${obj.instance}`}</div>
                                                <div className="text-xs text-gray-400">{obj.description || `Instance ${obj.instance}`}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-xs font-mono">{obj.type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                                    {obj.presentValue !== undefined ? obj.presentValue : 'N/A'}
                                                </span>
                                                <span className="text-gray-400 text-xs ml-1">{obj.units}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleMapObject(selectedDevice, obj)}
                                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ml-auto"
                                                >
                                                    Map to Explorer <ArrowRight size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                            <Server size={48} className="mb-4 opacity-20" />
                            <p>Select a device from the list to view its data points.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
