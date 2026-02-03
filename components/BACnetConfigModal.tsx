import React, { useState, useEffect } from 'react';
import { Settings, Save, X, RefreshCw, AlertTriangle, Check, Network } from 'lucide-react';

interface BACnetConfig {
    host: string;
    target_host: string;
    device_instance: number;
    server_device_id: number;
    use_broadcast: boolean;
    bbmd_address?: string;
    bbmd_ttl?: number;
}

interface NetworkInterface {
    name: string;
    ip: string;
}

interface BACnetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Use env override if provided, otherwise go through the frontend proxy to avoid CORS/port drift.
const BACNET_BASE =
    (import.meta as any).env?.VITE_MCP_BACNET_URL?.trim().replace(/\/+$/, '') ||
    '/proxy/bacnet';

export const BACnetConfigModal: React.FC<BACnetConfigModalProps> = ({ isOpen, onClose }) => {
    const [config, setConfig] = useState<BACnetConfig>({
        host: '0.0.0.0',
        target_host: '192.168.1.7',
        device_instance: 1007,
        server_device_id: 19149,
        use_broadcast: false,
        bbmd_address: '',
        bbmd_ttl: 900
    });
    const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch config and interfaces on open
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Interfaces
            const ifaceRes = await fetch(`${BACNET_BASE}/api/bacnet/interfaces`);
            if (ifaceRes.ok) {
                const data = await ifaceRes.json();
                setInterfaces(data.interfaces || []);
            }

            // Fetch Config
            const configRes = await fetch(`${BACNET_BASE}/api/bacnet/config`);
            if (configRes.ok) {
                const data = await configRes.json();
                setConfig({
                    host: data.host || '0.0.0.0',
                    target_host: data.target_host || '192.168.1.7',
                    device_instance: data.device_instance || 1007,
                    server_device_id: data.server_device_id || 19149,
                    use_broadcast: data.use_broadcast || false,
                    bbmd_address: data.bbmd_address || '',
                    bbmd_ttl: data.bbmd_ttl || 900
                });
            }
        } catch (err) {
            console.error("Error fetching BACnet config:", err);
            setError("Failed to load configuration. Is the BACnet server running?");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${BACNET_BASE}/api/bacnet/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setSuccess("Configuration saved successfully! Server settings updated.");
                // Close after a brief delay
                setTimeout(() => {
                    setSuccess(null);
                    onClose();
                }, 1500);
            } else {
                throw new Error("Failed to save configuration");
            }
        } catch (err) {
            console.error("Error saving config:", err);
            setError("Failed to save configuration.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#252525]">
                    <div className="flex items-center gap-2">
                        <Settings className="text-blue-500" size={20} />
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Configuration BACnet</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                            <Check size={16} />
                            {success}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <RefreshCw className="animate-spin text-blue-500" size={24} />
                        </div>
                    ) : (
                        <>
                            {/* Network Interface Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Network size={12} /> Carte Réseau (Interface Locale)
                                </label>
                                <select
                                    value={config.host}
                                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    {interfaces.map((iface) => (
                                        <option key={iface.ip} value={iface.ip}>
                                            {iface.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400">
                                    L'adresse IP locale utilisée pour communiquer avec le réseau BACnet.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Target Host */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        IP Cible (Automate)
                                    </label>
                                    <input
                                        type="text"
                                        value={config.target_host}
                                        onChange={(e) => setConfig({ ...config, target_host: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="192.168.1.7"
                                    />
                                </div>

                                {/* Target Device ID */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ID Device Cible
                                    </label>
                                    <input
                                        type="number"
                                        value={config.device_instance}
                                        onChange={(e) => setConfig({ ...config, device_instance: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="1007"
                                    />
                                </div>
                            </div>

                            {/* Server Device ID */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    ID Serveur MCP (Unique)
                                </label>
                                <input
                                    type="number"
                                    value={config.server_device_id}
                                    onChange={(e) => setConfig({ ...config, server_device_id: parseInt(e.target.value) || 19149 })}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="19149"
                                />
                                <p className="text-[10px] text-gray-400">
                                    ID unique de votre serveur sur le réseau BACnet (doit être différent des autres devices)
                                </p>
                            </div>

                            {/* BBMD / Foreign Device Registration */}
                            <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] rounded-lg border border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Network size={16} className="text-purple-500" />
                                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                        Foreign Device Registration (BBMD)
                                    </h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Adresse BBMD (IP:Port)
                                        </label>
                                        <input
                                            type="text"
                                            value={config.bbmd_address || ''}
                                            onChange={(e) => setConfig({ ...config, bbmd_address: e.target.value })}
                                            className="w-full p-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                            placeholder="Ex: 192.168.1.254:47808"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            TTL (sec)
                                        </label>
                                        <input
                                            type="number"
                                            value={config.bbmd_ttl || 900}
                                            onChange={(e) => setConfig({ ...config, bbmd_ttl: parseInt(e.target.value) || 900 })}
                                            className="w-full p-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                            placeholder="900"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                    Remplissez ces champs UNIQUEMENT si vous devez vous enregistrer auprès d'un routeur BBMD distant (FDT). Laissez vide pour une communication locale standard.
                                </p>
                            </div>

                            {/* Broadcast Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2c2c2e] rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Utiliser Broadcast</span>
                                    <span className="text-[10px] text-gray-400">Cochez si l'automate ne répond pas en direct</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.use_broadcast}
                                        onChange={(e) => setConfig({ ...config, use_broadcast: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#252525] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        Sauvegarder
                    </button>
                </div>
            </div>
        </div >
    );
};
