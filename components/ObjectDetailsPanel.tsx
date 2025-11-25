import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Clock, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataNode } from '../types';
import { DriverNodeDetails } from '../drivers/NodeDetails';
import { getObjectProperties } from '../data/bacnetProperties';

interface ObjectDetailsPanelProps {
  node: DataNode | null;
  open: boolean;
  onToggle: () => void;
  details: DriverNodeDetails | null;
}

interface PropertyField {
  key: string;
  label: string;
  value: string;
}

export const ObjectDetailsPanel: React.FC<ObjectDetailsPanelProps> = ({
  node,
  open,
  onToggle,
  details,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const advancedAvailable = useMemo(() => {
    if (!details) return false;
    const driverPropsCount = Object.keys(details.properties ?? {}).length;
    const hasBacnetDefinitions = details.driver === 'bacnet' && Boolean(details.objectType);
    return driverPropsCount > 0 || hasBacnetDefinitions;
  }, [details]);

  useEffect(() => {
    setShowAdvanced(true);
  }, [node?.id]);

  const sections = useMemo(() => {
    const generalFields: PropertyField[] = [
      { key: 'label', label: 'Nom', value: details?.label || node?.label || 'Non défini' },
      {
        key: 'objectType',
        label: 'Type d’objet',
        value: details?.objectType || node?.type || 'Inconnu',
      },
      {
        key: 'presentValue',
        label: 'Valeur actuelle',
        value:
          details?.presentValue !== undefined && details?.presentValue !== null
            ? String(details.presentValue)
            : node && node.value !== undefined && node.value !== null
              ? String(node.value)
              : '—',
      },
      { key: 'unit', label: 'Unité', value: details?.units || node?.unit || '—' },
      { key: 'identifier', label: 'Identifiant', value: node?.id || details?.id || '—' },
    ];

    const advancedFields: PropertyField[] = details && showAdvanced
      ? Object.entries(details.properties ?? {}).map(([key, value]) => ({
          key,
          label: key,
          value: value === null || value === undefined ? '—' : String(value),
        }))
      : [];

    const equipmentFields: PropertyField[] = [
      {
        key: 'device',
        label: 'Équipement',
        value: details?.device?.label
          ? `${details.device.label} (${details.device.id})`
          : buildPath(node),
      },
      {
        key: 'driver',
        label: 'Source',
        value: details?.driver ? details.driver.toUpperCase() : 'Structure locale',
      },
      {
        key: 'location',
        label: 'Emplacement',
        value: details?.locationPath || buildPath(node),
      },
      {
        key: 'lastSync',
        label: 'Synchronisation',
        value: details?.lastUpdated || 'En attente',
      },
    ];

    const historyFields: PropertyField[] = [
      { key: 'lastEvent', label: 'Dernier évènement', value: details?.status || '—' },
      { key: 'driverStatus', label: 'Statut driver', value: details?.driver?.toUpperCase() || '—' },
      { key: 'operator', label: 'Opérateur', value: 'Console MCP' },
    ];

    return [
      { title: 'Objet sélectionné', fields: generalFields },
      ...(advancedFields.length ? [{ title: 'Propriétés du driver', fields: advancedFields }] : []),
      { title: 'Appareil', fields: equipmentFields },
      { title: 'Historique', fields: historyFields },
    ];
  }, [node, showAdvanced, details]);

  const definitionRows = useMemo(() => {
    if (!showAdvanced || details?.driver !== 'bacnet' || !details.objectType) return [];
    const props = getObjectProperties(details.objectType);
    return Object.entries(props).map(([name, def]) => ({
      name,
      ...def,
    }));
  }, [details, showAdvanced]);

  return (
    <div className="relative flex h-full">
      <aside
        className={`h-full bg-white dark:bg-[#1c1c1e] border-l border-gray-200 dark:border-white/10 md:rounded-l-3xl shadow-inner transition-[width,opacity,padding] duration-300 overflow-y-auto custom-scrollbar ${
          open
            ? 'w-full md:w-[420px] px-4 md:px-6 py-6 opacity-100'
            : 'w-0 px-0 py-0 opacity-0 pointer-events-none'
        }`}
      >
        {open && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-xs uppercase text-gray-400 font-semibold">Propriétés</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {node ? node.label : 'Aucun objet sélectionné'}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <button className="p-2 rounded-full bg-gray-50 dark:bg-white/10 hover:text-blue-500">
                  <Shield size={18} />
                </button>
                <button className="p-2 rounded-full bg-gray-50 dark:bg-white/10 hover:text-blue-500">
                  <Clock size={18} />
                </button>
                <button className="p-2 rounded-full bg-gray-50 dark:bg-white/10 hover:text-blue-500">
                  <Settings2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                <span className="uppercase text-xs font-semibold text-gray-400">Avancé</span>
                <button
                  onClick={() => advancedAvailable && setShowAdvanced((v) => !v)}
                  disabled={!advancedAvailable}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !advancedAvailable
                      ? 'bg-gray-200 cursor-not-allowed'
                      : showAdvanced
                        ? 'bg-emerald-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showAdvanced ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                {!advancedAvailable && (
                  <span className="text-[10px] text-gray-400 italic">
                    Indisponible pour cet objet
                  </span>
                )}
              </div>
              <span className="text-xs uppercase text-gray-400 tracking-widest">
                {details?.driver ? details.driver.toUpperCase() : 'Aucune sélection'}
              </span>
            </div>

            {node ? (
              <div className="space-y-6">
                {sections.map((section) => (
                  <div
                    key={section.title}
                    className="border border-gray-100 dark:border-white/10 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {section.title}
                      </h3>
                      <span className="text-xs text-gray-400">
                        ({section.fields.length} champs)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {section.fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs uppercase text-gray-400 font-semibold tracking-wide">
                            {field.label}
                          </label>
                          <input
                            value={field.value}
                            readOnly
                            className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-gray-700 dark:text-gray-100"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {definitionRows.length > 0 && (
                  <div className="border border-blue-100 dark:border-blue-900/40 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                        Propriétés BACnet ({details?.objectType})
                      </h3>
                      <span className="text-xs text-blue-400">
                        {definitionRows.length} définitions
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {definitionRows.map((row) => (
                        <div
                          key={`${row.name}-${row.id}`}
                          className="grid grid-cols-[1fr,60px,90px,60px] gap-3 text-xs px-3 py-2 rounded-lg bg-blue-50/60 dark:bg-blue-900/10"
                        >
                          <div className="font-semibold truncate">{row.name}</div>
                          <div className="text-gray-600 dark:text-gray-300">ID {row.id}</div>
                          <div>{row.type}</div>
                          <div className="text-right">{row.conformance}{row.writable ? ' (W)' : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-4 py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <span className="text-2xl">ℹ️</span>
                </div>
                <p className="text-lg font-semibold text-center px-6">
                  Sélectionnez un objet dans l’arborescence pour afficher ses détails.
                </p>
              </div>
            )}
          </>
        )}
      </aside>

      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 shadow-lg rounded-full p-3 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
        title={open ? 'Masquer le panneau' : 'Afficher les propriétés'}
      >
        {open ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </div>
  );
};

const buildPath = (node: DataNode | null): string => {
  if (!node) return '—';
  return node.id.split('_').join(' / ');
};
