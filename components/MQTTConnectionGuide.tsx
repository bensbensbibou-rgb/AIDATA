import React, { useState } from 'react';
import { Copy, ClipboardList } from 'lucide-react';

export interface MQTTConnectionInfo {
  host: string;
  port: number;
  wsPort: number;
  username?: string;
  password?: string;
  protocol: string;
  wsProtocol: string;
  secureProtocol: string;
  label: string;
  description: string;
}

const formatUrl = (protocol: string, host: string, port: number) => `${protocol}://${host}:${port}`;

export const MQTTConnectionGuide: React.FC<{ info: MQTTConnectionInfo }> = ({ info }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1400);
    } catch (error) {
      console.error('Clipboard error', error);
    }
  };

  const brokerUrl = formatUrl(info.protocol, info.host, info.port);
  const websocketUrl = formatUrl(info.wsProtocol, info.host, info.wsPort);

  return (
    <section className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Guides MQTT</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{info.label}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">{info.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => handleCopy(brokerUrl, 'mqtt')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg hover:border-blue-500 text-gray-700 dark:text-white transition"
          >
            <Copy size={16} />
            Copier l’URL MQTT
          </button>
          <button
            onClick={() => handleCopy(websocketUrl, 'ws')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg hover:border-blue-500 text-gray-700 dark:text-white transition"
          >
            <ClipboardList size={16} />
            Copier WebSocket
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm text-gray-600 dark:text-gray-300">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Protocole</p>
          <p className="font-semibold">{info.protocol.toUpperCase()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Hôte</p>
          <p className="font-semibold font-mono">{info.host}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Ports</p>
          <p className="font-semibold font-mono">{info.port} / {info.wsPort}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Utilisateur</p>
          <p className="font-semibold">{info.username || 'aucun'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Mot de passe</p>
          <p className="font-semibold">{info.password ? '••••••••' : 'non défini'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">SSL possible</p>
          <p className="font-semibold">{info.secureProtocol.toUpperCase()}</p>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <p className="font-semibold text-gray-700 dark:text-white">Configurer n8n</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Choisis le protocole (mqtt / ws) puis sers-toi de <span className="font-mono">{brokerUrl}</span> ou <span className="font-mono">{websocketUrl}</span>.</li>
          <li>Renseigne l’hôte, le port, puis l’identifiant client (ex. <span className="font-mono">n8n-dashboard</span>).</li>
          <li>Ajoute nom d’utilisateur/mot de passe si tu as configuré des credentials (voir ci-dessus).</li>
          <li>Si tu veux conserver les messages QoS 1/2, désactive « Session propre ».</li>
          <li>Active SSL uniquement si tu as les certificats correspondants et coche « Rejeter les certificats non autorisés » selon ton lab.</li>
        </ul>
      </div>

      <div className="text-xs text-gray-400">
        {copied ? `Copié (${copied === 'mqtt' ? brokerUrl : websocketUrl})` : 'Tu peux maintenant coller l’URL dans n8n ou tout autre client MQTT.'}
      </div>
    </section>
  );
};
