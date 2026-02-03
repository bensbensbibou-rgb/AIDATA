import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Clock, Settings2, ChevronLeft, ChevronRight, Info, Server, Database, History, ChevronsRight, ChevronsLeft, Lock, Unlock, X } from 'lucide-react';
import { AlarmConfig, DataNode, Language } from '../types';
import { DriverNodeDetails } from '../drivers/NodeDetails';
import { getObjectProperties } from '../data/bacnetProperties';

interface ObjectDetailsPanelProps {
  node: DataNode | null;
  open: boolean;
  width?: number;
  resizable?: boolean;
  onResizeStart?: () => void;
  onToggle: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  details: DriverNodeDetails | null;
  language?: Language;
  onUpdateAlarm?: (id: string, partial: Partial<AlarmConfig>) => void;
  onUpdateValue?: (id: string, value: any, unit?: string) => void;
  onUpdateNode?: (id: string, partial: Partial<DataNode>) => void;
  // GMAO Equipment linking
  gmaoEquipments?: { id: string; name: string }[];
  onLinkToGmaoEquipment?: (variableId: string, equipmentId: string | null) => void;
}

interface PropertyField {
  key: string;
  label: string;
  value: string;
}

export const ObjectDetailsPanel: React.FC<ObjectDetailsPanelProps> = ({
  node,
  open,
  width,
  resizable,
  onResizeStart,
  isLocked,
  onToggleLock,
  onToggle,
  details,
  language,
  onUpdateAlarm,
  onUpdateValue,
  onUpdateNode,
  gmaoEquipments,
  onLinkToGmaoEquipment,
}) => {
  void language;
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [alarmDraft, setAlarmDraft] = useState<AlarmConfig | null>(null);

  // Load GMAO equipments from localStorage if not provided via props
  const [localEquipments, setLocalEquipments] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const stored = localStorage.getItem('gmao_equipments');
    if (stored) {
      try {
        setLocalEquipments(JSON.parse(stored));
      } catch { }
    }
  }, [open]); // Refresh when panel opens
  const effectiveEquipments = gmaoEquipments && gmaoEquipments.length > 0 ? gmaoEquipments : localEquipments;
  const defaultAlarmConfig: AlarmConfig = useMemo(() => ({
    enabled: false,
    alarmInhibit: false,
    inhibitTime: '0000h:00m:00s',
    alarmState: 'Normal',
    timeDelay: '0000h:00m:00s',
    timeDelayToNormal: '0000h:00m:00s',
    alarmEnable: { toOffnormal: true, toFault: true },
    toOffnormalText: 'Alarm',
    toFaultText: 'Fault',
    toNormalText: 'Alarm Cleared',
    sourceName: node?.label || '',
    hyperlinkOrd: null,
    soundFile: null,
    priority: '255',
    timestamp: ''
  }), [node?.label]);
  const alarmConfig = useMemo(() => node?.alarmConfig || defaultAlarmConfig, [node?.alarmConfig, defaultAlarmConfig]);
  const isBooleanVariable = node?.type === 'variable' && (node as any)?.dataType === 'boolean';
  const advancedAvailable = useMemo(() => {
    // Si un nœud est présent, on autorise l'onglet avancé même sans détails driver
    if (node) {
      return true;
    }
    if (!details) return false;
    const driverPropsCount = Object.keys(details.properties ?? {}).length;
    const hasBacnetDefinitions = details.driver === 'bacnet' && Boolean(details.objectType);
    return driverPropsCount > 0 || hasBacnetDefinitions;
  }, [details, node]);

  useEffect(() => {
    setShowAdvanced(true);
  }, [node?.id]);

  useEffect(() => {
    setAlarmDraft(alarmConfig || defaultAlarmConfig);
  }, [alarmConfig, defaultAlarmConfig, node?.id]);

  const parseNumberValue = (v: any) => {
    if (typeof v === 'number') return v;
    const parsed = parseFloat(String(v ?? '').replace(/[^0-9,.\-]/g, '').replace(',', '.'));
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const derivedAlarmState = useMemo(() => {
    const cfg = alarmConfig;
    if (!cfg || !node) return 'Normal';
    if (cfg.masked) return 'Masked';
    if (cfg.maintenance) return 'Maintenance';
    if (cfg.alarmInhibit) return 'Inhibited';

    const val = parseNumberValue((node as any).value);
    const ntEnabled = cfg.numericThreshold?.enabled ?? (
      cfg.numericThreshold && (cfg.numericThreshold.highLimit !== undefined || cfg.numericThreshold.lowLimit !== undefined)
    );
    if (ntEnabled && cfg.numericThreshold) {
      const high = cfg.numericThreshold.highLimit;
      const low = cfg.numericThreshold.lowLimit;
      const db = cfg.numericThreshold.deadband ?? 0;
      let off = false;
      if (high !== undefined && val !== undefined) off = off || val >= (high + db);
      if (low !== undefined && val !== undefined) off = off || val <= (low - db);
      return off ? 'Offnormal' : 'Normal';
    }
    if (cfg.booleanBinding?.enabled) {
      const normalVal = cfg.booleanBinding.normalValue ?? 1;
      const v = val ?? 0;
      const isNormal = cfg.booleanBinding.invert ? v === 0 : v === normalVal;
      return isNormal ? 'Normal' : 'Offnormal';
    }
    return cfg.alarmState || 'Normal';
  }, [alarmConfig, node]);

  const draft = alarmDraft || defaultAlarmConfig;
  const updateDraft = (partial: Partial<AlarmConfig>) => {
    setAlarmDraft(prev => ({ ...(prev || defaultAlarmConfig), ...partial }));
  };

  const applyDraft = () => {
    if (node?.id && alarmDraft) {
      onUpdateAlarm?.(node.id, alarmDraft);
    }
  };

  const resetDraft = () => {
    setAlarmDraft(alarmConfig || defaultAlarmConfig);
  };


  // Synchroniser le nom de source avec le label du n?ud
  useEffect(() => {
    if (node?.id && node?.label && alarmConfig?.sourceName !== node.label) {
      onUpdateAlarm?.(node.id, { sourceName: node.label });
    }
  }, [node?.id, node?.label]);

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
      ...(isBooleanVariable ? [] : [{ key: 'unit', label: 'Unité', value: details?.units || node?.unit || '—' }]),
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
        value: node?.mqttTopic
          ? 'MQTT'
          : details?.driver
            ? details.driver.toUpperCase()
            : 'Structure locale',
      },
      ...(node?.mqttTopic ? [{
        key: 'mqttTopic',
        label: 'Topic MQTT',
        value: node.mqttTopic,
      }] : []),
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

    const mqttConfigFields: PropertyField[] = node?.mqttTopic ? [
      {
        key: 'mqttTopic',
        label: '📡 Topic MQTT',
        value: node.mqttTopic,
      },
      {
        key: 'mqttBroker',
        label: 'ðŸŒ Broker',
        value: `${(window as any).MQTT_BROKER_HOST || 'localhost'}:${(window as any).MQTT_BROKER_WS_PORT || '9001'}`,
      },
      {
        key: 'mqttStatus',
        label: '🔌 Statut',
        value: (window as any).MQTT_CONNECTED ? '🟢 Connecté' : '🔴 Déconnecté',
      },
      {
        key: 'mqttProtocol',
        label: '📋 Protocole',
        value: 'WebSocket (MQTT.js)',
      },
    ] : [];

    return [
      { title: 'Objet sélectionné', fields: generalFields },
      ...(advancedFields.length ? [{ title: 'Propriétés du driver', fields: advancedFields }] : []),
      { title: 'Appareil', fields: equipmentFields },
      ...(mqttConfigFields.length ? [{ title: 'Configuration MQTT', fields: mqttConfigFields }] : []),
      { title: 'Historique', fields: historyFields },
    ];
  }, [node, showAdvanced, details]);

  const definitionRows = useMemo(() => {
    if (!showAdvanced || details?.driver !== 'bacnet' || !details?.objectType) return [];
    const props = getObjectProperties(details!.objectType);
    return Object.entries(props).map(([name, def]) => ({
      name,
      ...def,
    }));
  }, [details, showAdvanced]);

  return (
    <div className="relative flex h-full">
      <aside
        className={`h-full bg-white dark:bg-[#1c1c1e] border-l border-gray-200 dark:border-white/10 md:rounded-l-3xl shadow-inner transition-[width,opacity,padding] duration-300 overflow-y-auto custom-scrollbar flex flex-col ${open
          ? 'px-4 md:px-6 py-6 opacity-100'
          : 'w-16 px-0 py-4 opacity-100 items-center'
          }`}
        style={open ? { width: width ? `${width}px` : undefined } : {}}
      >
        {!open && (
          <div className="flex flex-col items-center gap-6 w-full">
            {onToggleLock && (
              <button
                onClick={onToggleLock}
                className={`p-2 rounded-lg border text-xs font-semibold ${isLocked ? 'bg-gray-900 text-white border-gray-800' : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-white/10'}`}
                title={isLocked ? 'Déverrouiller le bandeau' : 'Verrouiller le bandeau fermé'}
              >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
            )}
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors mb-4"
              title="Expand Panel"
            >
              <ChevronsLeft size={20} />
            </button>

            <div className="flex flex-col gap-4 w-full items-center">
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" title="General Info" onClick={onToggle}>
                <Info size={20} />
              </div>
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" title="Settings" onClick={onToggle}>
                <Settings2 size={20} />
              </div>
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" title="Equipment" onClick={onToggle}>
                <Server size={20} />
              </div>
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" title="History" onClick={onToggle}>
                <History size={20} />
              </div>
            </div>
          </div>
        )}
        {open && (
          <>
            <button
              onClick={onToggle}
              className="hidden md:flex items-center justify-center w-8 h-16 rounded-l-xl bg-white dark:bg-[#2c2c2e] border-l border-y border-gray-200 dark:border-white/10 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] text-gray-400 hover:text-blue-600 absolute -left-8 top-1/2 -translate-y-1/2 transition-all hover:w-9"
              title="Replier le bandeau"
            >
              <ChevronsRight size={20} />
            </button>
            {resizable && (
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-col-resize hover:bg-blue-500/40'}`}
                onMouseDown={() => !isLocked && onResizeStart?.()}
              />
            )}

            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-xs uppercase text-gray-400 font-semibold">Propriétés</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {node ? node.label : 'Aucun objet sélectionné'}
                </h2>
              </div>
              {onToggleLock && (
                <button
                  onClick={onToggleLock}
                  className={`p-2 rounded-lg border text-xs font-semibold ${isLocked ? 'bg-gray-900 text-white border-gray-800' : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-white/10'}`}
                  title={isLocked ? 'Déverrouiller le bandeau' : 'Verrouiller le bandeau fermé'}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                <span className="uppercase text-xs font-semibold text-gray-400">Avancé</span>
                <button
                  onClick={() => advancedAvailable && setShowAdvanced((v) => !v)}
                  disabled={!advancedAvailable}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!advancedAvailable
                    ? 'bg-gray-200 cursor-not-allowed'
                    : showAdvanced
                      ? 'bg-emerald-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAdvanced ? 'translate-x-6' : 'translate-x-1'
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
                {isBooleanVariable && (
                  <div className="border border-gray-100 dark:border-white/10 rounded-2xl p-4 bg-white/40 dark:bg-white/5">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Valeur par défaut (booléen)</h3>
                    <input
                      className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                      value={String(node.value ?? '')}
                      onChange={e => node.id && onUpdateValue?.(node.id, e.target.value)}
                    />
                  </div>
                )}

                {alarmConfig && showAdvanced && advancedAvailable && (
                  <div className="border border-orange-200 dark:border-orange-900/40 rounded-2xl p-5 bg-orange-50/40 dark:bg-orange-900/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-300">Extension alarme</h3>
                        <p className="text-xs text-orange-600 dark:text-orange-200">Activation Alarme pour rendre les paramètres visibles et modifiables.</p>
                      </div>
                      <button
                        onClick={() => node.id && onUpdateAlarm?.(node.id, { enabled: !alarmConfig.enabled })}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${alarmConfig.enabled ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      >
                        {alarmConfig.enabled ? 'Alarme activée' : 'Activer alarme'}
                      </button>
                    </div>

                    {alarmConfig.enabled && (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={alarmConfig.alarmInhibit} onChange={e => node.id && onUpdateAlarm?.(node.id, { alarmInhibit: e.target.checked })} />
                            Inhibition Alarme
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={alarmConfig.masked || false} onChange={e => node.id && onUpdateAlarm?.(node.id, { masked: e.target.checked })} />
                            Masquée
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={alarmConfig.maintenance || false} onChange={e => node.id && onUpdateAlarm?.(node.id, { maintenance: e.target.checked })} />
                            Maintenance
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={alarmConfig.alarmEnable?.toOffnormal} onChange={e => node.id && onUpdateAlarm?.(node.id, { alarmEnable: { ...alarmConfig.alarmEnable, toOffnormal: e.target.checked } })} />
                            toOffnormal
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={alarmConfig.alarmEnable?.toFault} onChange={e => node.id && onUpdateAlarm?.(node.id, { alarmEnable: { ...alarmConfig.alarmEnable, toFault: e.target.checked } })} />
                            toFault
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Temps d'inhibition</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.inhibitTime} onChange={e => node.id && onUpdateAlarm?.(node.id, { inhibitTime: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">État de l'alarme (lecture seule)</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5" value={derivedAlarmState} readOnly />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Délai (sec)</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.timeDelay} onChange={e => node.id && onUpdateAlarm?.(node.id, { timeDelay: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Délai Retour Normale</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.timeDelayToNormal} onChange={e => node.id && onUpdateAlarm?.(node.id, { timeDelayToNormal: e.target.value })} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Texte Vers Anormal</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.toOffnormalText} onChange={e => node.id && onUpdateAlarm?.(node.id, { toOffnormalText: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Texte Vers Défaut</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.toFaultText} onChange={e => node.id && onUpdateAlarm?.(node.id, { toFaultText: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Texte Vers Normale</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.toNormalText} onChange={e => node.id && onUpdateAlarm?.(node.id, { toNormalText: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Priorité</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5" value={alarmConfig.priority || ''} onChange={e => node.id && onUpdateAlarm?.(node.id, { priority: e.target.value })} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Nom de la source</label>
                            <input className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5" value={node?.label || alarmConfig.sourceName} readOnly />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Équipement GMAO</label>
                            <select
                              className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm"
                              value={alarmConfig.linkedEquipmentId || ''}
                              onChange={e => {
                                const eqId = e.target.value || null;
                                if (node?.id) {
                                  onUpdateAlarm?.(node.id, { linkedEquipmentId: eqId || undefined });
                                  onLinkToGmaoEquipment?.(node.id, eqId);

                                  // Sauvegarder vers localStorage pour synchroniser avec GMAOWidget
                                  try {
                                    const stored = localStorage.getItem('gmao_linked_variables');
                                    let links: { variableId: string; variableName: string; equipmentId: string; alarmText?: string; priority?: string }[] = stored ? JSON.parse(stored) : [];
                                    // Retirer l'ancien lien pour cette variable
                                    links = links.filter(l => l.variableId !== node.id);
                                    // Ajouter le nouveau lien si un équipement est sélectionné
                                    if (eqId) {
                                      links.push({
                                        variableId: node.id,
                                        variableName: node.label || node.id,
                                        equipmentId: eqId,
                                        alarmText: alarmConfig.toOffnormalText || undefined,
                                        priority: alarmConfig.priority || undefined
                                      });
                                    }
                                    localStorage.setItem('gmao_linked_variables', JSON.stringify(links));
                                  } catch { }
                                }
                              }}
                            >
                              <option value="">— Non lié —</option>
                              {effectiveEquipments.map(eq => (
                                <option key={eq.id} value={eq.id}>{eq.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Numeric thresholds */}
                        <div className="border border-gray-200 dark:border-white/10 rounded-lg p-3 bg-white/50 dark:bg-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs uppercase text-gray-500 font-semibold">Seuils numériques</label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={alarmConfig.numericThreshold?.enabled || false}
                                onChange={e => node.id && onUpdateAlarm?.(node.id, { numericThreshold: { ...(alarmConfig.numericThreshold || {}), enabled: e.target.checked } })}
                              />
                              Activer
                            </label>
                          </div>
                          {alarmConfig.numericThreshold?.enabled && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs uppercase text-gray-500">Limite Haute</label>
                                <input
                                  type="number"
                                  className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                  value={alarmConfig.numericThreshold.highLimit ?? ''}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { numericThreshold: { ...(alarmConfig.numericThreshold || { enabled: true }), highLimit: e.target.value === '' ? undefined : Number(e.target.value) } })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs uppercase text-gray-500">Limite Basse</label>
                                <input
                                  type="number"
                                  className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                  value={alarmConfig.numericThreshold.lowLimit ?? ''}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { numericThreshold: { ...(alarmConfig.numericThreshold || { enabled: true }), lowLimit: e.target.value === '' ? undefined : Number(e.target.value) } })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs uppercase text-gray-500">Zone Morte</label>
                                <input
                                  type="number"
                                  className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                  value={alarmConfig.numericThreshold.deadband ?? 0}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { numericThreshold: { ...(alarmConfig.numericThreshold || { enabled: true }), deadband: Number(e.target.value) } })}
                                />
                              </div>
                              <div className="space-y-1 col-span-3">
                                <label className="text-xs uppercase text-gray-500">Texte Limite Haute</label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                  value={alarmConfig.highLimitText || ''}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { highLimitText: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1 col-span-3">
                                <label className="text-xs uppercase text-gray-500">Texte Limite Basse</label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                  value={alarmConfig.lowLimitText || ''}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { lowLimitText: e.target.value })}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {!alarmConfig.numericThreshold?.enabled && (
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-gray-500">Binding booléen</label>
                            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={alarmConfig.booleanBinding?.enabled || false}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { booleanBinding: { ...(alarmConfig.booleanBinding || { normalValue: 1 }), enabled: e.target.checked } })}
                                />
                                Activer (1 = normal, 0 = défaut)
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={alarmConfig.booleanBinding?.invert || false}
                                  onChange={e => node.id && onUpdateAlarm?.(node.id, { booleanBinding: { ...(alarmConfig.booleanBinding || { normalValue: 1, enabled: true }), invert: e.target.checked } })}
                                  disabled={!alarmConfig.booleanBinding?.enabled}
                                />
                                Inverser (0 = normal)
                              </label>
                            </div>
                            {alarmConfig.booleanBinding?.enabled && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="space-y-1">
                                  <label className="text-xs uppercase text-gray-500">Label état = 1</label>
                                  <input
                                    className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                    value={alarmConfig.booleanFacetTrue || ''}
                                    onChange={e => node.id && onUpdateAlarm?.(node.id, { booleanFacetTrue: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs uppercase text-gray-500">Label état = 0</label>
                                  <input
                                    className="w-full rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                                    value={alarmConfig.booleanFacetFalse || ''}
                                    onChange={e => node.id && onUpdateAlarm?.(node.id, { booleanFacetFalse: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Priority Array Section for Boolean Variables */}
                {node && node.type === 'variable' && node.dataType === 'boolean' && (
                  <div className="border border-gray-100 dark:border-white/10 rounded-2xl p-5 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Priority Array (16 Levels)
                      </h3>
                      <span className="text-xs text-gray-400">
                        Present Value: {String(node.value)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/10">
                            <th className="py-2 font-semibold text-gray-500">Level</th>
                            <th className="py-2 font-semibold text-gray-500">Description</th>
                            <th className="py-2 font-semibold text-gray-500">Value</th>
                            <th className="py-2 font-semibold text-gray-500 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 16 }, (_, i) => i + 1).map((level) => {
                            const val = node.priorityArray?.[level];
                            const isSet = val !== undefined && val !== null;
                            let desc = 'Standard';
                            if (level === 1) desc = 'Emergency / Manual Life Safety';
                            else if (level === 8) desc = 'Manual Operator';
                            else if (level === 16) desc = 'Default';

                            return (
                              <tr key={level} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="py-2 font-mono text-gray-400">{level}</td>
                                <td className="py-2 text-gray-600 dark:text-gray-300">{desc}</td>
                                <td className="py-2">
                                  {isSet ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {val ? 'TRUE' : 'FALSE'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 italic">null</span>
                                  )}
                                </td>
                                <td className="py-2 text-right flex justify-end gap-1">
                                  <button
                                    onClick={() => onUpdateNode && onUpdateNode(node.id, { priorityArray: { ...(node.priorityArray || {}), [level]: true } })}
                                    className={`px-2 py-1 rounded hover:bg-green-50 text-green-600 ${isSet && val === true ? 'bg-green-50 ring-1 ring-green-200' : ''}`}
                                    title="Set True"
                                  >
                                    ON
                                  </button>
                                  <button
                                    onClick={() => onUpdateNode && onUpdateNode(node.id, { priorityArray: { ...(node.priorityArray || {}), [level]: false } })}
                                    className={`px-2 py-1 rounded hover:bg-gray-100 text-gray-600 ${isSet && val === false ? 'bg-gray-100 ring-1 ring-gray-200' : ''}`}
                                    title="Set False"
                                  >
                                    OFF
                                  </button>
                                  <button
                                    onClick={() => onUpdateNode && onUpdateNode(node.id, { priorityArray: { ...(node.priorityArray || {}), [level]: null } })}
                                    className="px-2 py-1 rounded hover:bg-red-50 text-red-400"
                                    title="Relinquish (Null)"
                                    disabled={!isSet}
                                  >
                                    <X size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Fallback Row */}
                          <tr className="bg-gray-50/50 dark:bg-white/5">
                            <td className="py-2 font-mono text-gray-400">FB</td>
                            <td className="py-2 text-gray-600 dark:text-gray-300">Fallback Value</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${node.fallbackValue ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {node.fallbackValue ? 'TRUE' : 'FALSE'}
                              </span>
                            </td>
                            <td className="py-2 text-right flex justify-end gap-1">
                              <button
                                onClick={() => onUpdateNode && onUpdateNode(node.id, { fallbackValue: true })}
                                className={`px-2 py-1 rounded hover:bg-green-50 text-green-600 ${node.fallbackValue === true ? 'bg-green-50 ring-1 ring-green-200' : ''}`}
                              >
                                ON
                              </button>
                              <button
                                onClick={() => onUpdateNode && onUpdateNode(node.id, { fallbackValue: false })}
                                className={`px-2 py-1 rounded hover:bg-gray-100 text-gray-600 ${node.fallbackValue === false ? 'bg-gray-100 ring-1 ring-gray-200' : ''}`}
                              >
                                OFF
                              </button>
                              <div className="w-[28px]"></div>{/* Spacer for alignment */}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

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
                          {node && onUpdateNode && (field.key === 'label' || field.key === 'presentValue' || field.key === 'unit') ? (
                            <div className="flex gap-2">
                              {field.key === 'presentValue' && (
                                <button
                                  onClick={() => onUpdateNode(node.id, { overrideMode: node.overrideMode === 'manu' ? 'auto' : 'manu' })}
                                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors shrink-0 ${node.overrideMode === 'manu'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'bg-blue-500 text-white shadow-sm'
                                    }`}
                                >
                                  {node.overrideMode === 'manu' ? 'Manuel' : 'Auto'}
                                </button>
                              )}
                              <input
                                value={field.value}
                                readOnly={field.key === 'presentValue' && node.overrideMode !== 'manu'}
                                onChange={(e) => {
                                  if (field.key === 'label') onUpdateNode(node.id, { label: e.target.value });
                                  else if (field.key === 'presentValue') onUpdateNode(node.id, { value: e.target.value });
                                  else if (field.key === 'unit') onUpdateNode(node.id, { unit: e.target.value });
                                }}
                                className={`w-full px-4 py-2 rounded-xl border text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${field.key === 'presentValue' && node.overrideMode !== 'manu'
                                  ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 cursor-not-allowed text-gray-500'
                                  : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/20'
                                  }`}
                              />
                            </div>
                          ) : (
                            <input
                              value={field.value}
                              readOnly
                              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-gray-700 dark:text-gray-100"
                            />
                          )}
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
                  <span className="text-2xl"><Info size={32} /></span>
                </div>
                <p className="text-lg font-semibold text-center px-6">
                  Sélectionnez un objet dans l’arborescence pour afficher ses détails.
                </p>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
};

const buildPath = (node: DataNode | null): string => {
  if (!node) return '—';
  return node.id.split('_').join(' / ');
};
