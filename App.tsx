

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard, Zap, Droplets, Thermometer, Wind, Activity, Settings, LogOut, Plus, Search,
  Menu, X, ChevronRight, ChevronDown, Folder, Radio, Server, Globe, Bot, Sparkles, Pencil, Check,
  LayoutGrid, FileText, BarChart3, Sun, Shield, Wrench, Car, Calendar, GripVertical, PieChart as PieIcon,
  LineChart as LineIcon, ScatterChart as ScatterIcon, Table as TableIcon, Grid3x3, Workflow, MoreVertical,
  Building, Layers, Box, Layout, Trash2, Map as MapIcon, Lightbulb, Fan, Wifi, Cpu, AlertTriangle, Battery, Leaf, Factory,
  KeyRound, Lock, Unlock, GripHorizontal, CornerDownRight, Gauge, Scale, Circle, Disc, Target, SlidersHorizontal, List, Bell, EyeOff,
  CloudSun, Settings2, BookOpen, Monitor, Snowflake, Briefcase, Users, Coffee, Utensils, Armchair, Bed, Dumbbell,
  AreaChart as AreaChartIcon, ArrowLeftRight, Undo2, Languages, Mic, MicOff, Volume2, VolumeX, ClipboardList, Download, Upload, ChevronsLeft, ChevronsRight, Save, Copy
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Legend, LineChart, Line, Cell, RadialBarChart, RadialBar
} from 'recharts';

import { GoogleGenAI, Type } from "@google/genai";
import { Card, KpiCard, ChartToolbar, PeriodSelector, ChatBubble, ChatInput, Button, EditableInput, EnergyLabelWidget, GaugeWidget, FloorPlanWidget, PredictiveAlarmsWidget, SliderWidget, ScheduleWidget, DataboxWidget, AlarmConsoleWidget, WeatherWidget, HVACWidget, SynopticWidget, ZoneWidget, LogicWidget, OEEWidget } from './components/Widgets';
import { HeatmapChart, ThermometerChart, SimpleTable, FlowChart } from './components/Charts';
import { NetworkManager } from './components/NetworkManager';
import { ObjectDetailsPanel } from './components/ObjectDetailsPanel';
import { DriverNodeDetails } from './drivers/NodeDetails';
import { bacnetDriver } from './drivers/BACnetDriver';
import { distechDriver } from './drivers/DistechDriver';
import { mqttDriver } from './drivers/MQTTDriver';
import {
  TRANSLATIONS, MOCK_CHART_DATA, INITIAL_SITE_TREE, INITIAL_DASHBOARDS, INITIAL_MODULES
} from './constants';
import { Period, Language, DataNode, ChatMessage, NodeType, DashboardWidget, AppModule, DataboxNode, AlarmConfig } from './types';
import AIChatWidget from './components/AIChatWidget';
import GMAOWidget from './components/GMAOWidget';
import WorkOrdersWidget from './components/WorkOrdersWidget';
import RequestsWidget from './components/RequestsWidget';
import GMAOReportsWidget from './components/GMAOReportsWidget';
import { KnowledgeWidget } from './components/KnowledgeWidget';
import { MQTTDemo } from './components/MQTTDemo';
import { useMQTT } from './hooks/useMQTT';
import { useGMAOData } from './hooks/useGMAOData';
import { BACnetConfigModal } from './components/BACnetConfigModal';

// --- Icon Mapping ---
const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Zap, Droplets, Wind, FileText, Sparkles, Settings, LayoutGrid,
  BarChart3, PieIcon, Activity, Calendar, Shield, Building, Layout,
  Lightbulb, Fan, Wifi, Cpu, AlertTriangle, Battery, Leaf, Factory, Map: MapIcon, Server, Box, Wrench,
  Thermometer, Workflow, TableIcon, LineIcon, ScatterIcon, AreaChart: AreaChartIcon, Grid3x3, Gauge, Scale,
  Circle, Disc, Target, SlidersHorizontal, List, Bell, CloudSun, Settings2, BookOpen, Monitor,
  Briefcase, Users, Coffee, Utensils, Armchair, Bed, Dumbbell, ClipboardList
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

const findNodeById = (nodes: DataNode[], id: string): DataNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

// Retourne le chemin (labels) jusqu'au nœud ciblé
const findNodePath = (nodes: DataNode[], targetId: string, trail: string[] = []): string | null => {
  for (const n of nodes) {
    const nextTrail = [...trail, n.label];
    if (n.id === targetId) return nextTrail.join(' / ');
    if (n.children) {
      const found = findNodePath(n.children, targetId, nextTrail);
      if (found) return found;
    }
  }
  return null;
};

const generateVariableHistory = (variableId: string, period: Period): any[] => {
  const seed = variableId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const random = (i: number) => { const x = Math.sin(seed + i) * 10000; return x - Math.floor(x); };

  const now = new Date();
  let dataPoints: any[] = [];
  const base = (seed % 100) + 20;

  if (period === 'j') { // Day - 24 hours
    for (let i = 0; i < 24; i++) {
      const d = new Date(now);
      d.setHours(now.getHours() - (23 - i));
      d.setMinutes(0);
      d.setSeconds(0);
      dataPoints.push({
        name: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: d.toISOString(), // For export
        value: Math.floor(base + (random(i) * (base / 2)))
      });
    }
  } else if (period === 'm') { // Month - 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (29 - i));
      dataPoints.push({
        name: d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
        fullDate: d.toISOString(),
        value: Math.floor(base + (random(i) * (base / 2)))
      });
    }
  } else if (period === 'a') { // Year - 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - (11 - i));
      dataPoints.push({
        name: d.toLocaleDateString([], { month: 'short' }),
        fullDate: d.toISOString(),
        value: Math.floor(base + (random(i) * (base / 2)))
      });
    }
  } else { // All / Default
    for (let i = 0; i < 10; i++) {
      dataPoints.push({
        name: `${2020 + i}`,
        fullDate: `${2020 + i}-01-01T00:00:00.000Z`,
        value: Math.floor(base + (random(i) * (base / 2)))
      });
    }
  }
  return dataPoints;
};

const COLORS = ['#ef4444', '#dc2626', '#991b1b', '#f87171', '#6b7280', '#374151', '#111827', '#d1d5db', '#f3f4f6'];

const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  enabled: false,
  alarmInhibit: false,
  inhibitTime: '0000h:00m:00s',
  alarmState: 'Normal',
  masked: false,
  maintenance: false,
  timeDelay: '0000h:00m:00s',
  timeDelayToNormal: '0000h:00m:00s',
  alarmEnable: { toOffnormal: true, toFault: true },
  toOffnormalText: 'Alarm',
  toFaultText: 'Fault',
  toNormalText: 'Alarm Cleared',
  sourceName: '',
  hyperlinkOrd: null,
  soundFile: null,
  priority: '255',
  timestamp: '',
  booleanBinding: { enabled: false, invert: false, normalValue: 1 },
  numericThreshold: { enabled: false, highLimit: undefined, lowLimit: undefined, deadband: 0 },
  highLimitText: '',
  lowLimitText: '',
  booleanFacetTrue: 'Normal',
  booleanFacetFalse: 'Défaut'
};

const SiteTreeNode: React.FC<{
  node: DataNode;
  level: number;
  onAddNode: (parentId: string, type: NodeType) => void;
  onDeleteNode: (id: string) => void;
  onToggleHistory: (id: string) => void;
  onToggleAlarmBinding?: (node: DataNode) => void;
  onToggleMask?: (id: string, value: boolean) => void;
  onToggleMaintenance?: (id: string, value: boolean) => void;
  onDuplicateNode?: (sourceId: string, anchorId?: string) => void;
  copiedNodeId?: string | null;
  onRenameNode?: (id: string) => void;
  onUpdateNode?: (id: string, updates: Partial<DataNode>) => void;
  onLinkToEquipment?: (nodeId: string) => void;

  viewMode: 'site' | 'equipment';
  selectedNodeId: string | null;
  expandTick?: number;
  onSelectNode: (id: string) => void;
}> = ({ node, level, onAddNode, onDeleteNode, onToggleHistory, onToggleAlarmBinding, onToggleMask, onToggleMaintenance, onDuplicateNode, copiedNodeId, onRenameNode, onUpdateNode, onLinkToEquipment, viewMode, selectedNodeId, onSelectNode, expandTick }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedNodeId === node.id;
  const hasSelectedDescendant = useMemo(() => {
    const search = (n: DataNode | undefined): boolean => {
      if (!n || !selectedNodeId) return false;
      if (n.id === selectedNodeId) return true;
      return (n.children || []).some(child => search(child));
    };
    return search(node);
  }, [node, selectedNodeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type === 'variable') {
      e.stopPropagation();
      const dragData = JSON.stringify({ type: 'variable', id: node.id, label: node.label, unit: node.unit });
      if (e.dataTransfer) {
        e.dataTransfer.setData("application/json", dragData);
        e.dataTransfer.setData("text/plain", `VAR:${node.id}`);
        e.dataTransfer.effectAllowed = "copy";
      }
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case 'site': return <Globe size={14} className="text-blue-500" />;
      case 'building': return <Building size={14} className="text-orange-500" />;
      case 'floor': return <Layers size={14} className="text-purple-500" />;
      case 'space': return <Layout size={14} className="text-green-500" />;
      case 'equipment': return <Box size={14} className="text-gray-500" />;
      case 'variable': {
        const hasLive = node.value !== undefined && node.value !== null;
        const color = hasLive ? 'text-green-500' : 'text-gray-400';
        return <Wifi size={14} className={color} />;
      }
      case 'alarm': return <AlertTriangle size={14} className="text-red-500" />;
      default: return <Folder size={14} />;
    }
  };

  const canHaveChildren = node.type !== 'variable' && node.type !== 'alarm';

  useEffect(() => {
    if (hasSelectedDescendant) setIsOpen(true);
  }, [hasSelectedDescendant]);

  useEffect(() => {
    if (expandTick !== undefined) setIsOpen(true);
  }, [expandTick]);

  const renderAlarmBadge = () => {
    const cfg = (node as any).alarmConfig;
    if (!cfg?.enabled) return null;
    let state: 'Normal' | 'Offnormal' = 'Normal';
    const rawVal = (node as any).value;
    const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal ?? '').replace(/[^0-9,.\-]/g, '').replace(',', '.'));
    const val = Number.isNaN(parsed) ? undefined : parsed;

    const ntEnabled = cfg.numericThreshold?.enabled ?? (cfg.numericThreshold && (cfg.numericThreshold.highLimit !== undefined || cfg.numericThreshold.lowLimit !== undefined));
    if (ntEnabled && cfg.numericThreshold && val !== undefined) {
      const db = cfg.numericThreshold.deadband ?? 0;
      if ((cfg.numericThreshold.highLimit !== undefined && val >= cfg.numericThreshold.highLimit + db) ||
        (cfg.numericThreshold.lowLimit !== undefined && val <= cfg.numericThreshold.lowLimit - db)) {
        state = 'Offnormal';
      }
    } else if (cfg.booleanBinding?.enabled) {
      const normalVal = cfg.booleanBinding.normalValue ?? 1;
      const isNormal = cfg.booleanBinding.invert ? val === 0 : val === normalVal;
      state = isNormal ? 'Normal' : 'Offnormal';
    }
    if (state === 'Normal') return null;

    const priNum = cfg.priority !== undefined ? parseInt(String(cfg.priority), 10) : NaN;
    const color = priNum === 1 ? 'bg-red-100 text-red-700' : priNum === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
    const label = priNum === 1 ? 'P1' : priNum === 2 ? 'P2' : 'P3+';
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>{label}</span>;
  };

  return (
    <div className="select-none relative">
      <div
        className={`group flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer ${node.type === 'variable' ? 'cursor-grab active:cursor-grabbing' : ''
          } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onSelectNode(node.id);
          if (canHaveChildren) setIsOpen(!isOpen);
        }}
        draggable={node.type === 'variable'}
        onDragStart={handleDragStart}
      >
        <div className="flex items-center gap-1 min-w-[20px]">
          {canHaveChildren && <span className="text-gray-300 hover:text-gray-500">{isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}</span>}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium dark:text-gray-200 truncate">{node.label}</div>
            {node.type === 'variable' && (
              <div className="text-[10px] text-gray-400 flex items-center gap-2 flex-wrap">
                <span>{String(node.value)} {node.unit}</span>
                <span className={`px-2 py-0.5 rounded-full ${node.historyEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {node.historyEnabled ? 'Hist.' : 'No hist.'}
                </span>
                {renderAlarmBadge()}
                {((node as any).alarmConfig?.linkedEquipmentId) && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1" title="Lié à un équipement GMAO">
                    <Wrench size={10} /> GMAO
                  </span>
                )}
                {((node as any).alarmConfig?.maintenance) && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Wrench size={10} /> Maint.
                  </span>
                )}
                {((node as any).alarmConfig?.masked) && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 flex items-center gap-1">
                    <EyeOff size={10} /> Masqué
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-opacity"><MoreVertical size={12} /></button>
        {
          showMenu && (
            <div ref={menuRef} className="absolute right-2 top-6 z-50 w-40 bg-white dark:bg-[#2c2c2e] shadow-xl rounded-lg border border-gray-100 dark:border-white/5 py-1 z-[60]">
              {['building', 'floor', 'space', 'equipment', 'folder', 'site'].includes(node.type) ? (
                <>
                  <button onClick={() => onAddNode(node.id, 'folder')} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 text-indigo-600">
                    <Folder size={12} /> Ajouter Dossier
                  </button>
                  <button onClick={() => onAddNode(node.id, 'equipment')} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-white/10 flex items-center gap-2">Add Child</button>
                  <button onClick={() => onAddNode(node.id, 'alarm')} className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2">
                    <AlertTriangle size={12} /> Add Alarm
                  </button>
                  <button onClick={() => onAddNode(node.id, 'variable')} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-white/10 flex items-center gap-2">
                    <Radio size={12} /> Add Variable
                  </button>
                </>
              ) : null}
              {node.type === 'variable' && (
                <button
                  onClick={() => { onToggleHistory(node.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                >
                  {node.historyEnabled ? 'Desactiver historique' : 'Activer historique'}
                </button>
              )}
              {node.type === 'variable' && onToggleMask && (
                <button
                  onClick={() => { onToggleMask(node.id, !(node as any).alarmConfig?.masked); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-pink-50 dark:hover:bg-pink-900/20 flex items-center gap-2"
                >
                  {(node as any).alarmConfig?.masked ? 'Démasquer' : 'Masquer'}
                </button>
              )}
              {node.type === 'variable' && onToggleMaintenance && (
                <button
                  onClick={() => { onToggleMaintenance(node.id, !(node as any).alarmConfig?.maintenance); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                >
                  {(node as any).alarmConfig?.maintenance ? 'Maintenance off' : 'Maintenance'}
                </button>
              )}
              {node.type === 'variable' && onUpdateNode && (
                <button
                  onClick={() => { onUpdateNode(node.id, { overrideMode: node.overrideMode === 'manu' ? 'auto' : 'manu' }); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2"
                >
                  {node.overrideMode === 'manu' ? 'Passer en Auto' : 'Passer en Manuel'}
                </button>
              )}
              {node.type === 'variable' && onDuplicateNode && (
                <button
                  onClick={() => { onDuplicateNode(node.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                >
                  Copier / Dupliquer
                </button>
              )}
              {node.type === 'variable' && onDuplicateNode && copiedNodeId && (
                <button
                  onClick={() => { onDuplicateNode(copiedNodeId, node.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
                >
                  Coller (depuis copie)
                </button>
              )}
              {node.type === 'variable' && onRenameNode && (
                <button
                  onClick={() => { onRenameNode(node.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                >
                  Renommer / Modifier
                </button>
              )}
              {node.type === 'variable' && onToggleAlarmBinding && (
                <button
                  onClick={() => { onToggleAlarmBinding(node); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                >
                  {node.alarmConfig?.enabled ? 'Désactiver alarme' : 'Attacher alarme (booléen)'}
                </button>
              )}
              {node.type === 'variable' && onLinkToEquipment && (
                <button
                  onClick={() => { onLinkToEquipment(node.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 text-blue-600"
                >
                  <Wrench size={12} /> Lier à équipement GMAO
                </button>
              )}
              {node.type !== 'site' && <button onClick={() => onDeleteNode(node.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-500"><Trash2 size={12} /> Delete</button>}
            </div>
          )
        }
      </div >
      {canHaveChildren && isOpen && node.children && (
        <div className="border-l border-gray-100 dark:border-white/5 ml-3 my-1">
          {node.children.map(child => (
            <SiteTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onAddNode={onAddNode}
              onDeleteNode={onDeleteNode}
              onToggleHistory={onToggleHistory}
              onToggleAlarmBinding={onToggleAlarmBinding}
              onToggleMask={onToggleMask}
              onToggleMaintenance={onToggleMaintenance}
              onDuplicateNode={onDuplicateNode}
              copiedNodeId={copiedNodeId}
              onRenameNode={onRenameNode}
              onUpdateNode={onUpdateNode}
              onLinkToEquipment={onLinkToEquipment}
              viewMode={viewMode}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div >
  );
};

// --- AI CHAT WIDGET WITH GEMINI ---
// Component moved to ./components/AIChatWidget.tsx

// --- TYPES FOR UNDO ---
type DeletedItem =
  | { type: 'widget'; data: DashboardWidget; dashboardId: string; index: number }
  | { type: 'module'; data: AppModule; parentId: string | 'root' };

// --- MAIN APP ---

const App: React.FC = () => {
  const gmaoData = useGMAOData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState<Period>('j');
  const [language, setLanguage] = useState<Language>('fr');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');

  const [modules, setModules] = useState<AppModule[]>(() => {
    // Force reload depuis INITIAL_MODULES pour récupérer les nouveaux modules
    localStorage.removeItem('appModules');
    return INITIAL_MODULES;
  });
  const [dashboards, setDashboards] = useState<Record<string, DashboardWidget[]>>(() => {
    // Force reload pour récupérer les nouveaux dashboards
    localStorage.removeItem('appDashboards');
    return INITIAL_DASHBOARDS;
  });
  const [treeData, setTreeData] = useState<DataNode[]>(() => {
    const saved = localStorage.getItem('appTreeData');
    return saved ? JSON.parse(saved) : INITIAL_SITE_TREE;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(() => selectedNodeId ? findNodeById(treeData, selectedNodeId) : null, [selectedNodeId, treeData]);
  const alarmDelayRef = useRef(new Map<string, { target: 'Normal' | 'Offnormal'; started: number }>());
  const lastAlarmStateRef = useRef(new Map<string, string>());
  // Tick pour recalculer périodiquement les alarmes (délai, inhibition)
  const [alarmTick, setAlarmTick] = useState(0);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const [detailsPanelWidth, setDetailsPanelWidth] = useState(620);
  const [isResizingDetails, setIsResizingDetails] = useState(false);
  const [detailsPanelLocked, setDetailsPanelLocked] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<DriverNodeDetails | null>(null);
  const [bacnetConfigOpen, setBacnetConfigOpen] = useState(false);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'site' | 'equipment'>('site');
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [nodeParentId, setNodeParentId] = useState<string | null>(null);
  const [nodeTypeToAdd, setNodeTypeToAdd] = useState<NodeType>('equipment');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newMqttTopic, setNewMqttTopic] = useState('');
  const [newVariableType, setNewVariableType] = useState<'number' | 'boolean' | 'string'>('number');
  const [newVariableValue, setNewVariableValue] = useState<string>('0');
  const [newVariableUnit, setNewVariableUnit] = useState<string>('');
  const [newBooleanLabelTrue, setNewBooleanLabelTrue] = useState('Normal');
  const [newBooleanLabelFalse, setNewBooleanLabelFalse] = useState('Défaut');
  const [newOverrideMode, setNewOverrideMode] = useState<'auto' | 'manu'>('auto');
  const [isTabCreatorOpen, setIsTabCreatorOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabIcon, setNewTabIcon] = useState('LayoutDashboard');
  const [parentForNewTab, setParentForNewTab] = useState<string | null>(null);
  // Duplication d'onglet
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<AppModule | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateIcon, setDuplicateIcon] = useState('LayoutDashboard');
  const [duplicateWithWidgets, setDuplicateWithWidgets] = useState(true);
  // Modification d'icône
  const [isIconEditModalOpen, setIsIconEditModalOpen] = useState(false);
  const [iconEditModuleId, setIconEditModuleId] = useState<string | null>(null);
  const [iconEditCurrentIcon, setIconEditCurrentIcon] = useState('LayoutDashboard');
  const [isEditing, setIsEditing] = useState(true);
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [swappingWidgetId, setSwappingWidgetId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<DeletedItem[]>([]);
  const [aiPredictiveData, setAiPredictiveData] = useState<any[]>([]);
  const [expandTreeTick, setExpandTreeTick] = useState(0);
  const [treeSearch, setTreeSearch] = useState('');
  const [widgetSearch, setWidgetSearch] = useState('');
  const alarmTimeRef = useRef<Record<string, string>>({});
  const alarmLastRef = useRef<Record<string, string>>({});
  const filteredTree = useMemo(() => {
    const query = treeSearch.trim().toLowerCase();
    if (!query) return treeData;
    const match = (n: DataNode) => n.label.toLowerCase().includes(query);
    const recur = (list: DataNode[]): DataNode[] => {
      const out: DataNode[] = [];
      list.forEach(n => {
        const kids = n.children ? recur(n.children) : [];
        if (match(n) || kids.length > 0) {
          out.push({ ...n, children: kids });
        }
      });
      return out;
    };
    return recur(treeData);
  }, [treeData, treeSearch]);
  const [alarmHistory, setAlarmHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('alarmHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Si on sélectionne un noeud, on force l'ouverture du bandeau et on déverrouille
  useEffect(() => {
    if (selectedNodeId && !detailsPanelLocked) {
      setDetailsPanelOpen(true);
    }
  }, [selectedNodeId, detailsPanelLocked]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchDetails = async () => {
      if (!selectedNodeId) {
        if (!cancelled) setSelectedDetails(null);
        return;
      }

      let details: DriverNodeDetails | null = null;
      try {
        if (selectedNodeId.startsWith('bacnet')) {
          details = await bacnetDriver.getNodeDetails(selectedNodeId);
        } else if (selectedNodeId.startsWith('distech')) {
          details = await distechDriver.getNodeDetails(selectedNodeId);
        } else if (selectedNodeId.startsWith('mqtt')) {
          details = await mqttDriver.getNodeDetails(selectedNodeId);
        } else {
          details = null;
        }
      } catch (error) {
        console.error('Failed to load node details:', error);
      }

      if (!cancelled) {
        setSelectedDetails(details);
      }
    };

    fetchDetails();
    timer = setInterval(fetchDetails, 5000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [selectedNodeId]);

  // --- MQTT INTEGRATION (Moved to top level) ---
  const mqttTopics = useMemo(() => {
    const topics: string[] = [];
    const traverse = (nodes: DataNode[]) => {
      nodes.forEach(node => {
        if (node.mqttTopic) topics.push(node.mqttTopic);
        if (node.children) traverse(node.children);
      });
    };
    traverse(treeData);
    return topics;
  }, [treeData]);

  useMQTT({
    topics: mqttTopics,
    onMessage: (topic, message) => {
      setTreeData(prevTree => {
        const updateRecursive = (nodes: DataNode[]): DataNode[] => {
          return nodes.map(node => {
            if (node.mqttTopic === topic) {
              let newValue = message;
              try {
                const json = JSON.parse(message);
                if (json.value !== undefined) newValue = json.value;
              } catch (e) { }
              return { ...node, value: newValue };
            }
            if (node.children) {
              return { ...node, children: updateRecursive(node.children) };
            }
            return node;
          });
        };
        return updateRecursive(prevTree);
      });
    }
  });

  // --- LIVE TREE UPDATES ---
  // Nettoyage automatique des liens GMAO orphelins (si une variable est supprimée de l'arborescence)
  useEffect(() => {
    const cleanupGmaoLinks = () => {
      const stored = localStorage.getItem('gmao_linked_variables');
      if (!stored) return;

      try {
        const links = JSON.parse(stored);
        if (!Array.isArray(links)) return;

        // Collecter tous les IDs valides dans l'arbre actuel
        const validIds = new Set<string>();
        const traverse = (nodes: DataNode[]) => {
          nodes.forEach(node => {
            validIds.add(node.id);
            if (node.children) traverse(node.children);
          });
        };
        traverse(treeData);

        // Filtrer les liens dont l'ID de variable n'existe plus
        const validLinks = links.filter((l: any) => validIds.has(l.variableId));

        if (validLinks.length !== links.length) {
          localStorage.setItem('gmao_linked_variables', JSON.stringify(validLinks));
          // Déclencher un événement storage pour mettre à jour les autres composants
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('Erreur lors du nettoyage des liens GMAO', e);
      }
    };

    // Debounce de 2 secondes pour éviter de nettoyer pendant des chargements partiels ou modifications rapides
    const timer = setTimeout(cleanupGmaoLinks, 2000);
    return () => clearTimeout(timer);
  }, [treeData]);

  useEffect(() => {
    const updateTreeWithValues = (driverPrefix: string, devices: any[]) => {
      setTreeData(prevTree => {
        const updateRecursive = (nodes: DataNode[]): DataNode[] => {
          return nodes.map(node => {
            let updatedNode = { ...node };

            // Check if this node belongs to the driver and has a value to update
            if (node.id.startsWith(driverPrefix) && node.type === 'variable') {
              // Parse ID to find match in devices
              // Format: prefix_deviceId_type_instance
              const parts = node.id.split('_');
              if (parts.length >= 4) {
                const deviceId = parseInt(parts[1], 10);
                const type = parts[2];
                const instance = parseInt(parts.slice(3).join('_'), 10);

                const device = devices.find((d: any) => d.deviceId === deviceId);
                if (device) {
                  const obj = device.objects.find((o: any) =>
                    (o.type?.toLowerCase() === type.toLowerCase() || o.objectType?.toLowerCase() === type.toLowerCase()) &&
                    (Number(o.instance) === instance || Number(o.objectInstance) === instance)
                  );

                  if (obj) {
                    const newVal = obj.presentValue ?? obj.value ?? obj.state;
                    if (newVal !== undefined && newVal !== null) {
                      updatedNode.value = newVal;
                    }
                  }
                }
              }
            }

            if (node.children) {
              updatedNode.children = updateRecursive(node.children);
            }
            return updatedNode;
          });
        };
        return updateRecursive(prevTree);
      });
    };

    const unsubBacnet = bacnetDriver.subscribe(devices => updateTreeWithValues('bacnet', devices));
    const unsubDistech = distechDriver.subscribe(devices => updateTreeWithValues('distech', devices));



    // Start polling if not already started
    bacnetDriver.startPolling(10000);
    distechDriver.startPolling(15000);

    return () => {
      unsubBacnet();
      unsubDistech();
      bacnetDriver.disconnect(); // Or just stop polling if we want to keep connection
      distechDriver.disconnect();
    };
  }, []);


  const handleSaveAs = () => {
    if (!newDashboardName) return;
    const newId = newDashboardName.toLowerCase().replace(/\s+/g, '_');
    const newModule: AppModule = {
      id: newId,
      label: newDashboardName,
      iconKey: activeModuleDef?.iconKey || 'LayoutDashboard',
      type: 'dashboard',
      color: activeModuleDef?.color || 'blue',
      description: `Copy of ${activeModuleDef?.label || activeTab}`,
      isRemovable: true,
      isPinned: true
    };

    setModules(prev => [...prev, newModule]);
    setDashboards(prev => ({
      ...prev,
      [newId]: [...(dashboards[activeTab] || [])]
    }));
    setActiveTab(newId);
    setIsSaveAsModalOpen(false);
    setNewDashboardName('');
    setShowSaveMenu(false);
    alert('Tableau de bord enregistré sous ' + newDashboardName);
  };

  const handleSaveVersion = () => {
    const versionKey = `dashboard_version_${activeTab}_${Date.now()}`;
    const versionData = dashboards[activeTab];
    localStorage.setItem(versionKey, JSON.stringify(versionData));
    setShowSaveMenu(false);
    alert(`Version enregistrée : ${versionKey}`);
  };

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    if (!detailsPanelLocked) setDetailsPanelOpen(true);
  };
  const handleSelectAlarmFromConsole = (id: string) => {
    setViewMode('site');
    setSidebarOpen(true);
    setExpandTreeTick(t => t + 1);
    handleSelectNode(id);
  };
  const handleClearAlarmHistory = () => setAlarmHistory([]);
  const handleImportAlarmHistory = (entries: any[]) => setAlarmHistory(entries || []);

  const handleDuplicateNode = (sourceId: string, anchorId?: string) => {
    const source = findNodeById(treeData, sourceId);
    const anchor = anchorId ? findNodeById(treeData, anchorId) : source;
    if (!source || !anchor || source.type !== 'variable' || anchor.type !== 'variable') return;

    const newLabel = window.prompt('Nom de la copie ?', `${source.label || source.id} (copie)`);
    if (!newLabel) return;
    const newId = `${source.id}_copy_${Date.now()}`;

    const newNode: DataNode = {
      ...source,
      id: newId,
      label: newLabel,
      alarmConfig: source.alarmConfig ? { ...source.alarmConfig } : undefined
    };

    const insertAfterAnchor = (nodes: DataNode[]): DataNode[] => {
      return nodes.map(n => {
        if (!n.children || n.children.length === 0) return n;
        const idx = n.children.findIndex(c => c.id === anchor.id);
        if (idx !== -1) {
          const newChildren = [...n.children];
          newChildren.splice(idx + 1, 0, newNode);
          return { ...n, children: newChildren };
        }
        return { ...n, children: insertAfterAnchor(n.children) };
      });
    };

    const newTree = insertAfterAnchor(treeData);
    setTreeData(newTree);
    setSelectedNodeId(newId);
  };

  const handleRenameNode = (id: string) => {
    const source = findNodeById(treeData, id);
    if (!source) return;
    const newLabel = window.prompt('Nouveau nom ?', source.label || source.id);
    if (newLabel === null) return;
    let newValue: any = source.value;
    if (source.type === 'variable') {
      const valPrompt = window.prompt('Nouvelle valeur par défaut (laisser vide pour conserver)', source.value !== undefined ? String(source.value) : '');
      if (valPrompt !== null && valPrompt !== '') newValue = valPrompt;
    }
    const updateNode = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
      if (n.id === id) return { ...n, label: newLabel, value: newValue };
      if (n.children) return { ...n, children: updateNode(n.children) };
      return n;
    });
    setTreeData(updateNode(treeData));
    setSelectedNodeId(id);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedNode?.type === 'variable') {
        setCopiedNodeId(selectedNode.id);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'v' && copiedNodeId) {
        const src = findNodeById(treeData, copiedNodeId);
        if (src?.type === 'variable') {
          handleDuplicateNode(copiedNodeId);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode?.id, selectedNode?.type, copiedNodeId, treeData]);

  // --- EXPORT / IMPORT LOGIC ---
  const importPageInputRef = useRef<HTMLInputElement>(null);
  const importProjectInputRef = useRef<HTMLInputElement>(null);

  const handleExportPage = () => {
    const activeModuleDef = modules.find(m => m.id === activeTab);
    if (!activeModuleDef) return;
    const data = {
      type: 'dashboard_page',
      version: 1,
      exportedAt: new Date().toISOString(),
      module: activeModuleDef,
      widgets: dashboards[activeTab] || []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_${activeModuleDef.label}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveMenu(false);
  };

  const handleImportPageClick = () => importPageInputRef.current?.click();

  const handleImportPageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.type !== 'dashboard_page' || !json.module || !json.widgets) {
          alert('Format de fichier invalide');
          return;
        }
        const newId = `${json.module.id}_import_${Date.now()}`;
        const newModule = { ...json.module, id: newId, label: `${json.module.label} (Import)` };
        setModules(prev => [...prev, newModule]);
        setDashboards(prev => ({ ...prev, [newId]: json.widgets }));
        setActiveTab(newId);
        alert('Page importée avec succès');
      } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'import');
      } finally {
        if (importPageInputRef.current) importPageInputRef.current.value = '';
        setShowSaveMenu(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExportProject = () => {
    const data = {
      type: 'full_project',
      version: 1,
      exportedAt: new Date().toISOString(),
      modules,
      dashboards,
      treeData,
      gmaoLinks: JSON.parse(localStorage.getItem('gmao_linked_variables') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveMenu(false);
  };

  const handleImportProjectClick = () => importProjectInputRef.current?.click();

  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Attention : L\'importation d\'un projet complet va écraser toutes les données actuelles. Continuer ?')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.type !== 'full_project') {
          alert('Format de projet invalide');
          return;
        }

        // Mise à jour de l'état
        if (json.modules) setModules(json.modules);
        if (json.dashboards) setDashboards(json.dashboards);
        if (json.treeData) setTreeData(json.treeData);
        if (json.gmaoLinks) localStorage.setItem('gmao_linked_variables', JSON.stringify(json.gmaoLinks));

        // Persistance
        localStorage.setItem('appModules', JSON.stringify(json.modules));
        localStorage.setItem('appDashboards', JSON.stringify(json.dashboards));
        localStorage.setItem('appTreeData', JSON.stringify(json.treeData));

        alert('Projet importé avec succès. La page va se recharger.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Erreur fatale lors de l\'import du projet');
      } finally {
        if (importProjectInputRef.current) importProjectInputRef.current.value = '';
        setShowSaveMenu(false);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleMask = (id: string, value: boolean, comment?: string) => {
    const finalComment = comment ?? window.prompt('Commentaire (dé)masquage ?') ?? '';
    handleAlarmConfigChange(id, { masked: value });
    appendAlarmHistory({
      id,
      type: value ? 'mask' : 'unmask',
      time: new Date().toISOString(),
      comment: finalComment
    });
  };

  const handleToggleMaintenance = (id: string, value: boolean, comment?: string) => {
    const finalComment = comment ?? window.prompt('Commentaire maintenance ?') ?? '';
    handleAlarmConfigChange(id, { maintenance: value });
    appendAlarmHistory({
      id,
      type: value ? 'maintenance_on' : 'maintenance_off',
      time: new Date().toISOString(),
      comment: finalComment
    });
  };

  const appendAlarmHistory = (evt: any) => {
    setAlarmHistory(prev => {
      const next = [...prev, evt];
      // simple rotation
      return next.slice(-500);
    });
  };

  const handleAcknowledgeAlarm = (alarm: any, stillActive: boolean, comment?: string) => {
    const finalComment = comment ?? window.prompt('Commentaire acquittement ?') ?? '';
    appendAlarmHistory({
      id: alarm.id,
      source: alarm.source,
      msg: alarm.msg,
      pri: alarm.pri,
      state: alarm.state,
      type: 'ack',
      active: stillActive,
      time: new Date().toISOString(),
      comment: finalComment
    });
  };

  // --- PREDICTIVE WIDGET PERSISTENCE ---
  const [predictiveWidgetEnabled, setPredictiveWidgetEnabled] = useState(() => {
    const saved = localStorage.getItem('predictiveWidgetEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('predictiveWidgetEnabled', JSON.stringify(predictiveWidgetEnabled));
  }, [predictiveWidgetEnabled]);

  // --- AUTO-SAVE CONFIGURATION ---
  useEffect(() => {
    localStorage.setItem('appDashboards', JSON.stringify(dashboards));
  }, [dashboards]);

  useEffect(() => {
    localStorage.setItem('appModules', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem('appTreeData', JSON.stringify(treeData));
  }, [treeData, alarmTick]);

  useEffect(() => { if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [darkMode]);

  // Tick alarme : recalcul périodique des états (pour gérer les délais sans changement de valeur)
  useEffect(() => {
    const id = setInterval(() => setAlarmTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist alarm history
  useEffect(() => {
    try {
      localStorage.setItem('alarmHistory', JSON.stringify(alarmHistory));
    } catch { /* ignore */ }
  }, [alarmHistory]);

  // Check for expired inhibitions
  useEffect(() => {
    const now = Date.now();
    let hasChanges = false;

    const checkRecursive = (nodes: DataNode[]): DataNode[] => {
      return nodes.map(n => {
        let updatedNode = n;
        let childrenChanged = false;
        let newChildren = n.children;

        if (n.children) {
          newChildren = checkRecursive(n.children);
          if (newChildren !== n.children) {
            childrenChanged = true;
          }
        }

        if (updatedNode.alarmConfig?.alarmInhibit && updatedNode.alarmConfig.inhibitionStartedAt) {
          const duration = parseDurationMs(updatedNode.alarmConfig.inhibitTime);
          if (duration > 0 && (now - updatedNode.alarmConfig.inhibitionStartedAt > duration)) {
            hasChanges = true;
            updatedNode = {
              ...updatedNode,
              alarmConfig: { ...updatedNode.alarmConfig, alarmInhibit: false, inhibitionStartedAt: undefined }
            };
          }
        }

        if (childrenChanged) {
          updatedNode = { ...updatedNode, children: newChildren };
          hasChanges = true; // Propagate change flag
        }

        return updatedNode;
      });
    };

    // Only run if we have data to avoid initial render issues
    if (treeData.length > 0) {
      const newTree = checkRecursive(treeData);
      if (hasChanges) setTreeData(newTree);
    }

  }, [alarmTick]);

  const toggleVariableAlarmBinding = (node: DataNode) => {
    const current = findNodeById(treeData, node.id);
    const cfg = current?.alarmConfig || { ...DEFAULT_ALARM_CONFIG, sourceName: current?.label || node.label };
    const nextEnabled = !cfg.enabled;
    const binding = cfg.booleanBinding || { enabled: true, invert: false, normalValue: 1 };
    handleAlarmConfigChange(node.id, {
      ...cfg,
      enabled: nextEnabled,
      booleanBinding: { ...binding, enabled: true }
    });
  };
  const t = TRANSLATIONS[language];
  const chartData = MOCK_CHART_DATA[period];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isResizingDetails) {
        const viewportWidth = window.innerWidth;
        const newWidth = Math.max(360, Math.min(900, viewportWidth - e.clientX));
        setDetailsPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingDetails(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingSidebar || isResizingDetails) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizingSidebar]);

  const collectGlobalDashboardData = () => {
    const context: any[] = [];
    Object.entries(dashboards).forEach(([dashId, widgets]) => {
      const widgetList = widgets as DashboardWidget[];
      widgetList.forEach(w => {
        if (w.variables && w.variables.length > 0) {
          const widgetData = {
            dashboard: dashId,
            title: w.title,
            type: w.type,
            variables: w.variables.map(v => {
              const hist = generateVariableHistory(v.id, period);
              const last = hist[hist.length - 1].value;
              const avg = hist.reduce((a, b) => a + b.value, 0) / hist.length;
              return { label: v.label, current: last, avg: avg.toFixed(1), unit: v.unit };
            })
          };
          context.push(widgetData);
        } else if (w.staticData) {
          context.push({ dashboard: dashId, title: w.title, value: w.staticData.value, unit: w.staticData.unit });
        }

      });
    });
    return context;
  };

  const handleAiChat = async (userText: string) => {
    try {
      const contextData = collectGlobalDashboardData();

      // Call Backend API (which handles MCP + RAG + Gemini)
      const response = await fetch('http://localhost:8001/api/chat_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText, context: contextData })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();

      if (json.predictions && Array.isArray(json.predictions) && json.predictions.length > 0) {
        setAiPredictiveData(json.predictions);
      }

      return { text: json.response || "Analysis complete." };
    } catch (e) {
      console.error("AI Error:", e);
      return { text: "I'm having trouble connecting to the analysis engine right now. Please ensure the backend server is running." };
    }
  };

  const handleUpdateLogicVariable = (id: string, value: any, label: string, type: 'number' | 'string' | 'boolean', unit?: string) => {
    let logicFolder = findNodeById(treeData, 'logic_vars');
    if (!logicFolder) return;

    let existing = logicFolder.children?.find(c => c.id === id);
    if (existing) {
      if (existing.value !== value || (unit && existing.unit !== unit)) {
        const updateRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
          if (n.id === id) return { ...n, value, unit: unit || n.unit };
          if (n.children) return { ...n, children: updateRecursive(n.children) };
          return n;
        });
        setTreeData(updateRecursive(treeData));
      }
    } else {
      const newNode: DataNode = { id, label, type: 'variable', value, unit: unit || (type === 'boolean' ? '' : type === 'string' ? '' : '#') };
      const addRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
        if (n.id === 'logic_vars') return { ...n, children: [...(n.children || []), newNode] };
        if (n.children) return { ...n, children: addRecursive(n.children) };
        return n;
      });
      setTreeData(addRecursive(treeData));
    }
  };

  const flattenModules = (list: AppModule[]): AppModule[] => { return list.reduce((acc: AppModule[], curr) => { acc.push(curr); if (curr.children) acc.push(...flattenModules(curr.children)); return acc; }, []); };
  const findAndRemove = (list: AppModule[], id: string): { item: AppModule | null, newList: AppModule[], parentId: string | 'root' } => {
    let item: AppModule | null = null;
    let parentId: string | 'root' = 'root';
    const traverse = (currentList: AppModule[], currentParent: string | 'root'): AppModule[] => {
      const result: AppModule[] = [];
      for (const node of currentList) {
        if (node.id === id) { item = node; parentId = currentParent; continue; }
        if (node.children) { const updatedChildren = traverse(node.children, node.id); result.push({ ...node, children: updatedChildren }); } else { result.push(node); }
      }
      return result;
    };
    const newList = traverse(list, 'root');
    return { item, newList, parentId };
  };
  const addToParent = (list: AppModule[], parentId: string, item: AppModule): AppModule[] => { return list.map(node => { if (node.id === parentId) { return { ...node, children: [...(node.children || []), item], isOpen: true }; } if (node.children) { return { ...node, children: addToParent(node.children, parentId, item) }; } return node; }); };
  const getAllIds = (nodes: AppModule[]): string[] => { return nodes.reduce((acc: string[], curr) => { return [...acc, curr.id, ...(curr.children ? getAllIds(curr.children) : [])]; }, []); };
  const findModule = (nodes: AppModule[], id: string): AppModule | null => { for (const node of nodes) { if (node.id === id) return node; if (node.children) { const found = findModule(node.children, id); if (found) return found; } } return null; };
  const handleAddDashboard = () => { if (!newTabName.trim()) return; const id = newTabName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(); const newModule: AppModule = { id, label: newTabName, iconKey: newTabIcon, type: 'dashboard', color: COLORS[modules.length % COLORS.length], description: 'Custom Dashboard', isRemovable: true, isPinned: true, isOpen: true }; if (parentForNewTab) { setModules(addToParent(modules, parentForNewTab, newModule)); } else { setModules([...modules, newModule]); } setDashboards(prev => ({ ...prev, [id]: [] })); setNewTabName(''); setIsTabCreatorOpen(false); setParentForNewTab(null); if (!parentForNewTab) setActiveTab(id); };

  const handleDeleteModule = (id: string) => {
    const { item, newList, parentId } = findAndRemove(modules, id);
    if (item) {
      setUndoStack(prev => [...prev, { type: 'module', data: item, parentId }]);
      setModules(newList);
      if (activeTab === id) setActiveTab('dashboard');
    }
  };

  // Ouvrir le modal de duplication
  const openDuplicateModal = (m: AppModule) => {
    setDuplicateSource(m);
    setDuplicateName(m.label + ' (copie)');
    setDuplicateIcon(m.iconKey || 'LayoutDashboard');
    setDuplicateWithWidgets(true);
    setIsDuplicateModalOpen(true);
  };

  // Exécuter la duplication
  const handleDuplicateModule = () => {
    if (!duplicateSource || !duplicateName.trim()) return;

    const newId = duplicateName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newModule: AppModule = {
      ...duplicateSource,
      id: newId,
      label: duplicateName,
      iconKey: duplicateIcon,
      isRemovable: true,
      children: undefined // Ne pas copier les enfants
    };

    // Ajouter le nouveau module après le module source
    const insertAfter = (list: AppModule[], afterId: string, item: AppModule): AppModule[] => {
      const result: AppModule[] = [];
      for (const node of list) {
        result.push(node);
        if (node.id === afterId) {
          result.push(item);
        }
        if (node.children) {
          // Chercher aussi dans les enfants
          const childIndex = node.children.findIndex(c => c.id === afterId);
          if (childIndex >= 0) {
            const newChildren = [...node.children];
            newChildren.splice(childIndex + 1, 0, item);
            result[result.length - 1] = { ...node, children: newChildren };
          }
        }
      }
      return result;
    };

    setModules(insertAfter(modules, duplicateSource.id, newModule));

    // Dupliquer les widgets si demandé
    if (duplicateWithWidgets && dashboards[duplicateSource.id]) {
      const sourceWidgets = dashboards[duplicateSource.id];
      const newWidgets = sourceWidgets.map(w => ({
        ...w,
        id: `${w.id}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setDashboards(prev => ({ ...prev, [newId]: newWidgets }));
    } else {
      setDashboards(prev => ({ ...prev, [newId]: [] }));
    }

    // Fermer le modal et naviguer vers le nouveau module
    setIsDuplicateModalOpen(false);
    setDuplicateSource(null);
    setDuplicateName('');
    setActiveTab(newId);
  };

  const togglePinModule = (id: string) => { const mapRecursive = (list: AppModule[]): AppModule[] => { return list.map(m => { if (m.id === id) return { ...m, isPinned: !m.isPinned }; if (m.children) return { ...m, children: mapRecursive(m.children) }; return m; }); }; setModules(mapRecursive(modules)); };
  const toggleModuleOpen = (id: string) => { const mapRecursive = (list: AppModule[]): AppModule[] => { return list.map(m => { if (m.id === id) return { ...m, isOpen: !m.isOpen }; if (m.children) return { ...m, children: mapRecursive(m.children) }; return m; }); }; setModules(mapRecursive(modules)); };
  const handleRenameModule = (id: string, newLabel: string) => { const mapRecursive = (list: AppModule[]): AppModule[] => { return list.map(m => { if (m.id === id) return { ...m, label: newLabel }; if (m.children) return { ...m, children: mapRecursive(m.children) }; return m; }); }; setModules(mapRecursive(modules)); };

  // Ouvrir le modal de modification d'icône
  const openIconEditModal = (m: AppModule) => {
    setIconEditModuleId(m.id);
    setIconEditCurrentIcon(m.iconKey || 'LayoutDashboard');
    setIsIconEditModalOpen(true);
  };

  // Appliquer le changement d'icône
  const handleChangeModuleIcon = () => {
    if (!iconEditModuleId) return;
    const mapRecursive = (list: AppModule[]): AppModule[] => {
      return list.map(m => {
        if (m.id === iconEditModuleId) return { ...m, iconKey: iconEditCurrentIcon };
        if (m.children) return { ...m, children: mapRecursive(m.children) };
        return m;
      });
    };
    setModules(mapRecursive(modules));
    setIsIconEditModalOpen(false);
    setIconEditModuleId(null);
  };

  const handleModuleDragStart = (e: React.DragEvent, id: string) => { e.stopPropagation(); setDraggedModuleId(id); if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); } };
  const handleModuleDragOver = (e: React.DragEvent, targetId: string) => { e.preventDefault(); e.stopPropagation(); if (!draggedModuleId || draggedModuleId === targetId) return; const draggedNode = findModule(modules, draggedModuleId); if (draggedNode && draggedNode.children && getAllIds(draggedNode.children).includes(targetId)) { return; } setDragOverId(targetId); };

  const handleModuleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); e.stopPropagation(); setDragOverId(null);
    if (!e.dataTransfer) return;
    const draggedId = draggedModuleId || e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;
    const draggedNode = findModule(modules, draggedId);
    if (draggedNode && draggedNode.children && getAllIds(draggedNode.children).includes(targetId)) { return; }
    const { item, newList } = findAndRemove(modules, draggedId);
    if (!item) return;

    // S'assurer que l'élément déplacé a isOpen défini
    const itemWithOpen = { ...item, isOpen: item.isOpen ?? true };

    let finalModules: AppModule[];
    if (targetId === 'root') {
      finalModules = [...newList, itemWithOpen];
    } else {
      // Insérer AVANT le module cible (réordonnancement au même niveau)
      const insertBefore = (list: AppModule[]): AppModule[] => {
        const result: AppModule[] = [];
        for (const node of list) {
          if (node.id === targetId) {
            result.push(itemWithOpen);
          }
          if (node.children) {
            result.push({ ...node, children: insertBefore(node.children) });
          } else {
            result.push(node);
          }
        }
        return result;
      };
      finalModules = insertBefore(newList);

      // Si insertion avant échoue, ajouter comme enfant du parent cible
      if (JSON.stringify(finalModules) === JSON.stringify(newList)) {
        // addToParent définit déjà isOpen: true pour le parent
        finalModules = addToParent(newList, targetId, itemWithOpen);
      }
    }
    setModules(finalModules);
    setDraggedModuleId(null);
  };

  const currentWidgets = dashboards[activeTab] || [];
  const visibleWidgets = currentWidgets.filter(w => {
    if (w.type === 'predictive' && !predictiveWidgetEnabled) return false;
    if (widgetSearch && !w.title?.toLowerCase().includes(widgetSearch.toLowerCase()) && !w.type.toLowerCase().includes(widgetSearch.toLowerCase())) return false;
    return true;
  });
  const updateWidgets = (newWidgets: DashboardWidget[]) => { setDashboards(prev => ({ ...prev, [activeTab]: newWidgets })); };
  const handleWidgetUpdate = (id: string, updates: Partial<DashboardWidget>) => { updateWidgets(currentWidgets.map(w => w.id === id ? { ...w, ...updates } : w)); };

  const removeVariable = (widgetId: string, variableId: string) => {
    updateWidgets(currentWidgets.map(w => {
      if (w.id !== widgetId) return w;
      return { ...w, variables: w.variables?.filter(v => v.id !== variableId) };
    }));
  };

  const handleVariableStyleChange = (widgetId: string, variableId: string, updates: { color?: string, fontSize?: string, fontFamily?: string }) => {
    updateWidgets(currentWidgets.map(w => {
      if (w.id !== widgetId) return w;
      return { ...w, variables: w.variables?.map(v => v.id === variableId ? { ...v, ...updates } : v) };
    }));
  };

  const addWidget = (type: string, chartType?: DashboardWidget['chartType']) => {
    let widgetType = type as DashboardWidget['type'];
    if (type === 'kpi-power') widgetType = 'kpi';
    let newWidget: DashboardWidget = {
      id: `w_${Date.now()}`, type: widgetType, chartType,
      title: `New ${type === 'hvac' ? 'HVAC Symbol' : type === 'synoptic' ? 'Synoptic View' : type === 'logic' ? 'Logic Editor' : type}`,
      subtitle: 'Configure in edit mode',
      colSpan: (type === 'kpi' || type === 'thermometer' || type === 'dpe' || type === 'gauge' || type === 'slider' || type === 'weather' || type === 'hvac' || type === 'databox' || type === 'zone') ? 2 : 2,
      height: 400, colorTheme: 'default', variables: [], hiddenVariables: [], staticData: { value: 0 }
    };

    if (type === 'kpi-power') { newWidget.title = 'Total Power'; newWidget.colSpan = 2; newWidget.height = 350; newWidget.colorTheme = 'orange'; newWidget.variables = [{ id: 'var_main_elec', label: 'Main Grid', unit: 'kW' }]; }
    else if (type === 'kpi') { newWidget.colSpan = 2; newWidget.height = 350; }
    else if (type === 'floorplan') {
      newWidget.floorPlanConfig = {
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?q=80&w=1000&auto=format&fit=crop',
        objects: [],
        layers: [{ id: 'l1', name: 'Base', visible: true }]
      };
      newWidget.colSpan = 3; newWidget.height = 550; newWidget.noPadding = true;
    }
    else if (type === 'schedule') { newWidget.colSpan = 3; newWidget.height = 450; newWidget.scheduleConfig = { showWeekends: true, startOnSunday: false, is24hFormat: true, allowlist: [] }; }
    else if (type === 'databox') { newWidget.colSpan = 2; newWidget.height = 400; newWidget.databoxConfig = { showHeader: true, headerText: 'Details', showImage: false, showLabels: true, nodes: [] }; }
    else if (type === 'zone') { newWidget.colSpan = 2; newWidget.height = 400; newWidget.zoneConfig = {}; newWidget.title = "New Zone"; newWidget.subtitle = "Drag & Drop Variables"; }
    else if (type === 'alarm') { newWidget.colSpan = 3; newWidget.height = 450; newWidget.alarmConfig = { playSound: false, soundUrl: '/assets/alarm.mp3', minPriority: 'Critical' }; }
    else if (type === 'weather') { newWidget.colSpan = 2; newWidget.height = 350; newWidget.weatherConfig = { location: 'New York', units: 'C' }; }
    else if (type === 'predictive') { newWidget.colSpan = 2; newWidget.height = 350; }
    else if (type === 'hvac') { newWidget.colSpan = 2; newWidget.height = 350; newWidget.hvacConfig = { symbol: 'pump', orientation: 'up', showValue: true, animate: true }; }
    else if (type === 'synoptic') { newWidget.colSpan = 4; newWidget.height = 650; newWidget.synopticConfig = { width: 1000, height: 600, elements: [] }; }
    else if (type === 'logic') { newWidget.colSpan = 4; newWidget.height = 700; newWidget.logicConfig = { blocks: [], connections: [] }; }
    else if (type === 'workorders_widget') { newWidget.colSpan = 4; newWidget.height = 450; newWidget.title = 'Bons de travail'; newWidget.subtitle = 'Suivi en temps réel'; }
    else if (type === 'requests_widget') { newWidget.colSpan = 4; newWidget.height = 400; newWidget.title = 'Demandes'; newWidget.subtitle = 'Demandes en cours'; }
    else if (type === 'gmao_reports') { newWidget.colSpan = 4; newWidget.height = 600; newWidget.title = 'Rapports GMAO'; newWidget.subtitle = 'Tableau de bord de maintenance'; }

    if (swappingWidgetId) {
      const index = currentWidgets.findIndex(w => w.id === swappingWidgetId);
      if (index >= 0) {
        const old = currentWidgets[index];
        newWidget.colSpan = old.colSpan; newWidget.height = old.height; newWidget.variables = old.variables;
        const updatedWidgets = [...currentWidgets]; updatedWidgets[index] = newWidget;
        updateWidgets(updatedWidgets);
      }
      setSwappingWidgetId(null);
    } else { updateWidgets([...currentWidgets, newWidget]); }
    setShowWidgetPalette(false);
  };

  const removeWidget = (id: string) => {
    const index = currentWidgets.findIndex(w => w.id === id);
    if (index !== -1) {
      const widget = currentWidgets[index];
      setUndoStack(prev => [...prev, { type: 'widget', data: widget, dashboardId: activeTab, index }]);
      updateWidgets(currentWidgets.filter(w => w.id !== id));
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const item = undoStack[undoStack.length - 1];
    const newStack = undoStack.slice(0, -1);
    setUndoStack(newStack);

    if (item.type === 'widget') {
      const { data, dashboardId, index } = item;
      setDashboards(prev => {
        const list = [...(prev[dashboardId] || [])];
        // Safe insertion at index
        if (index >= 0 && index <= list.length) {
          list.splice(index, 0, data);
        } else {
          list.push(data);
        }
        return { ...prev, [dashboardId]: list };
      });
      if (activeTab !== dashboardId) setActiveTab(dashboardId);
    } else if (item.type === 'module') {
      const { data, parentId } = item;
      if (parentId === 'root') {
        setModules(prev => [...prev, data]);
      } else {
        setModules(prev => addToParent(prev, parentId, data));
      }
    }
  };

  // Raccourci clavier Ctrl+Z pour Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Ne pas déclencher si on est dans un champ input ou textarea
        const active = document.activeElement as HTMLElement;
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]); // Dépendre de undoStack pour avoir la dernière version de handleUndo

  const handleWidgetResize = (id: string, w: number, h: number) => { const containerW = window.innerWidth - (sidebarOpen ? 300 : 100); const colW = containerW / 4; let span = Math.round(w / colW); if (span < 1) span = 1; if (span > 4) span = 4; updateWidgets(currentWidgets.map(wd => wd.id === id ? { ...wd, colSpan: span as any, height: h } : wd)); };
  const handleWidgetWiden = (id: string) => { const w = currentWidgets.find(x => x.id === id); if (!w) return; const nextSpan = w.colSpan === 1 ? 2 : w.colSpan === 2 ? 4 : w.colSpan === 4 ? 1 : 2; handleWidgetUpdate(id, { colSpan: nextSpan as any }); };
  const handleWidgetExtend = (id: string) => { const w = currentWidgets.find(x => x.id === id); if (!w) return; const currentH = w.height || 300; const nextH = currentH >= 600 ? 300 : currentH + 150; handleWidgetUpdate(id, { height: nextH }); };
  const handleExport = (widget: DashboardWidget) => {
    const rows = widget.variables?.map(v => {
      const hist = generateVariableHistory(v.id, period);
      return hist.map(h => {
        // Format date for Excel (YYYY-MM-DD HH:mm:ss)
        let dateStr = h.name;
        if (h.fullDate) {
          const d = new Date(h.fullDate);
          dateStr = d.toISOString().replace('T', ' ').split('.')[0];
        }
        return {
          time: dateStr,
          variable: v.label,
          value: h.value,
          unit: v.unit
        };
      });
    }).flat() || [];

    if (rows.length === 0) { alert("No data to export"); return; }

    // Add BOM for Excel UTF-8 compatibility
    const BOM = "\uFEFF";
    const csvContent = "data:text/csv;charset=utf-8," + BOM + "Time,Variable,Value,Unit\n" + rows.map(e => `${e.time},${e.variable},${e.value},${e.unit}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${widget.title}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleLegendClick = (w: DashboardWidget, e: any) => { const targetId = e.dataKey; if (!targetId) return; const isHidden = w.hiddenVariables?.includes(targetId); let newHidden; if (isHidden) newHidden = w.hiddenVariables?.filter(id => id !== targetId) || []; else newHidden = [...(w.hiddenVariables || []), targetId]; updateWidgets(currentWidgets.map(cw => cw.id === w.id ? { ...cw, hiddenVariables: newHidden } : cw)); };

  const handleEditNode = (id: string) => {
    const node = findNodeById(treeData, id);
    if (!node) return;
    setEditingNodeId(id);
    setNodeParentId(null); // Not needed for edit
    setNewNodeLabel(node.label);
    setNodeTypeToAdd(node.type);
    if (node.type === 'variable') {
      setNewVariableType(node.dataType || 'number');
      setNewVariableValue(node.value !== undefined ? String(node.value) : '');
      setNewVariableUnit(node.unit || '');
      setNewMqttTopic(node.mqttTopic || '');
      if (node.alarmConfig) {
        setNewBooleanLabelTrue(node.alarmConfig.booleanFacetTrue || 'Normal');
        setNewBooleanLabelFalse(node.alarmConfig.booleanFacetFalse || 'Défaut');
      }
      setNewOverrideMode(node.overrideMode || 'auto');
    }
    setIsAddNodeModalOpen(true);
  };

  const handleAddNode = () => {
    if ((!nodeParentId && !editingNodeId) || !newNodeLabel) return;

    if (editingNodeId) {
      // Edit mode
      const updateRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
        if (n.id === editingNodeId) {
          const updatedNode = { ...n, label: newNodeLabel, mqttTopic: newMqttTopic || undefined };
          if (n.type === 'variable') {
            updatedNode.dataType = newVariableType;
            updatedNode.value = newVariableType === 'boolean' ? newVariableValue === 'true' || newVariableValue === '1' : newVariableType === 'number' ? parseFloat(newVariableValue || '0') : newVariableValue;
            if (newVariableType !== 'boolean') updatedNode.unit = newVariableUnit;
            // Update alarm config facets if boolean
            if (newVariableType === 'boolean' && n.alarmConfig) {
              updatedNode.alarmConfig = {
                ...n.alarmConfig,
                booleanFacetTrue: newBooleanLabelTrue,
                booleanFacetFalse: newBooleanLabelFalse
              };
            }
            updatedNode.overrideMode = newOverrideMode;
          }
          return updatedNode;
        }
        if (n.children) return { ...n, children: updateRecursive(n.children) };
        return n;
      });
      setTreeData(prev => updateRecursive(prev));
      setIsAddNodeModalOpen(false);
      setEditingNodeId(null);
      setNewMqttTopic('');
      setNewVariableType('number');
      setNewVariableValue('0');
      setNewVariableUnit('');
      setNewOverrideMode('auto');
      return;
    }

    // Add mode
    const baseAlarm =
      nodeTypeToAdd === 'variable'
        ? newVariableType === 'boolean'
          ? {
            ...DEFAULT_ALARM_CONFIG,
            enabled: true,
            sourceName: newNodeLabel,
            booleanBinding: { enabled: true, invert: false, normalValue: 1 },
            numericThreshold: { enabled: false },
            booleanFacetTrue: newBooleanLabelTrue,
            booleanFacetFalse: newBooleanLabelFalse
          }
          : {
            ...DEFAULT_ALARM_CONFIG,
            enabled: true,
            sourceName: newNodeLabel,
            booleanBinding: { enabled: false, invert: false, normalValue: 1 },
            numericThreshold: { enabled: true, highLimit: undefined, lowLimit: undefined, deadband: 0 }
          }
        : nodeTypeToAdd === 'alarm'
          ? { ...DEFAULT_ALARM_CONFIG, sourceName: newNodeLabel, enabled: false }
          : undefined;

    const newNode: DataNode = {
      id: `n_${Date.now()}`,
      label: newNodeLabel,
      type: nodeTypeToAdd,
      dataType: nodeTypeToAdd === 'variable' ? newVariableType : undefined,
      children: nodeTypeToAdd === 'alarm' ? [] : [],
      mqttTopic: newMqttTopic || undefined,
      value: nodeTypeToAdd === 'variable'
        ? (newVariableType === 'boolean' ? newVariableValue === 'true' || newVariableValue === '1' : newVariableType === 'number' ? parseFloat(newVariableValue || '0') : newVariableValue)
        : undefined,
      unit: nodeTypeToAdd === 'variable' && newVariableType !== 'boolean' ? newVariableUnit : undefined,
      alarmConfig: baseAlarm
    };
    const addRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
      if (n.id === nodeParentId) return { ...n, children: [...(n.children || []), newNode] };
      if (n.children) return { ...n, children: addRecursive(n.children) };
      return n;
    });
    setTreeData(addRecursive(treeData));
    setIsAddNodeModalOpen(false);
    setNewMqttTopic('');
    setNewVariableType('number');
    setNewVariableValue('0');
    setNewVariableUnit('');
    setNewBooleanLabelTrue('Normal');
    setNewBooleanLabelFalse('Défaut');
  };
  const handleDeleteNode = (id: string) => { const delRecursive = (nodes: DataNode[]): DataNode[] => nodes.filter(n => n.id !== id).map(n => ({ ...n, children: n.children ? delRecursive(n.children) : [] })); setTreeData(delRecursive(treeData)); };
  const handleToggleHistory = (id: string) => {
    const toggleRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
      if (n.id === id) {
        return { ...n, historyEnabled: !n.historyEnabled };
      }
      if (n.children) return { ...n, children: toggleRecursive(n.children) };
      return n;
    });
    setTreeData(prev => toggleRecursive(prev));
  };

  const handleAlarmConfigChange = (id: string, partial: Partial<AlarmConfig>) => {
    const updateRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
      if (n.id === id && (n.type === 'alarm' || n.type === 'variable')) {
        const current = n.alarmConfig || { ...DEFAULT_ALARM_CONFIG, sourceName: n.label };

        // Logic for inhibition start time
        let extraUpdates = {};
        if (partial.alarmInhibit === true) {
          extraUpdates = { inhibitionStartedAt: Date.now() };
        } else if (partial.alarmInhibit === false) {
          extraUpdates = { inhibitionStartedAt: undefined };
        }

        // Si seuils numériques activés, on désactive le binding booléen pour éviter les conflits
        let merged = { ...current, ...partial, ...extraUpdates };
        if (partial.numericThreshold) {
          const numericEnabled = partial.numericThreshold.enabled ?? current.numericThreshold?.enabled ?? true;
          merged.numericThreshold = { ...(current.numericThreshold || {}), ...partial.numericThreshold, enabled: numericEnabled };
          merged = { ...merged, booleanBinding: { ...(merged.booleanBinding || { normalValue: 1, invert: false }), enabled: false }, enabled: true };
        }
        if (partial.booleanBinding) {
          const boolEnabled = partial.booleanBinding.enabled ?? current.booleanBinding?.enabled ?? false;
          merged.booleanBinding = { ...(current.booleanBinding || { normalValue: 1, invert: false }), ...partial.booleanBinding, enabled: boolEnabled };
          if (boolEnabled) merged.enabled = true;
        }

        return { ...n, alarmConfig: merged };
      }
      if (n.children) return { ...n, children: updateRecursive(n.children) };
      return n;
    });
    setTreeData(prev => updateRecursive(prev));
  };

  // Helper to resolve Priority Array (Niagara Style)
  const resolvePriorityArray = (node: DataNode): any => {
    if (!node.priorityArray) return node.value;

    // Check priorities 1 to 16
    for (let i = 1; i <= 16; i++) {
      const val = node.priorityArray[i];
      if (val !== null && val !== undefined) {
        return val;
      }
    }

    // Fallback
    return node.fallbackValue ?? false;
  };

  const handleUpdateNode = (id: string, partial: Partial<DataNode>) => {
    const updateRecursive = (nodes: DataNode[]): DataNode[] => nodes.map(n => {
      if (n.id === id) {
        // Merge updates
        const updatedNode = { ...n, ...partial };

        // If priority array is updated, re-calculate present value
        if (partial.priorityArray || partial.fallbackValue !== undefined) {
          // Ensure priorityArray exists if we are updating it
          if (!updatedNode.priorityArray) updatedNode.priorityArray = {};

          // Calculate new present value
          const newValue = resolvePriorityArray(updatedNode);
          updatedNode.value = newValue;
        }

        return updatedNode;
      }
      if (n.children) return { ...n, children: updateRecursive(n.children) };
      return n;
    });
    setTreeData(prev => updateRecursive(prev));
  };

  const handleDataDrop = (widgetId: string, variableId: string) => {
    const node = findNodeById(treeData, variableId); if (!node) return;
    const newWidgets = currentWidgets.map(w => {
      if (w.id !== widgetId) return w;
      const vars = w.variables || []; const existing = vars.find(v => v.id === variableId);
      const newVariables = existing ? vars : [...vars, { id: variableId, label: node.label, unit: node.unit }];
      if (w.type === 'databox' && w.databoxConfig) {
        if (w.databoxConfig.nodes.find(n => n.id === variableId)) return w;
        const newNodeConfig: DataboxNode = { id: variableId, labelOverride: node.label, showUnit: true, numberFormat: '#.00', color: COLORS[w.databoxConfig.nodes.length % COLORS.length] };
        return { ...w, variables: newVariables, databoxConfig: { ...w.databoxConfig, nodes: [...w.databoxConfig.nodes, newNodeConfig] } };
      }
      if (w.type === 'zone' && w.zoneConfig) {
        const unit = (node.unit || '').toLowerCase(); const label = (node.label || '').toLowerCase();
        let newConfig = { ...w.zoneConfig };
        if (unit.includes('c') || unit.includes('f') || unit.includes('k')) { if (!newConfig.tempId) newConfig.tempId = variableId; else if (!newConfig.setpointId) newConfig.setpointId = variableId; }
        else if (unit.includes('%') || unit.includes('rh')) { if (label.includes('valve') || label.includes('out')) { if (!newConfig.valveId) newConfig.valveId = variableId; } else { if (!newConfig.humidityId) newConfig.humidityId = variableId; } }
        else if (unit.includes('ppm')) { if (!newConfig.co2Id) newConfig.co2Id = variableId; }
        else if (label.includes('mode')) { if (!newConfig.modeId) newConfig.modeId = variableId; }
        else if (label.includes('valve')) { if (!newConfig.valveId) newConfig.valveId = variableId; }
        return { ...w, variables: newVariables, zoneConfig: newConfig };
      }
      return { ...w, variables: newVariables };
    }); updateWidgets(newWidgets);
  };

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); if (!e.dataTransfer) return;
    try { const raw = e.dataTransfer.getData("application/json"); if (raw) { const data = JSON.parse(raw); if (data.type === 'new-widget') { addWidget(data.widgetType, data.chartType); } } } catch (err) { }
  };

  const activeModuleDef = findModule(modules, activeTab);
  const expandedWidget = currentWidgets.find(w => w.id === expandedWidgetId);

  const getResponsiveColSpan = (span: number) => {
    switch (span) {
      case 1: return 'col-span-1 md:col-span-1 xl:col-span-1';
      case 2: return 'col-span-1 md:col-span-2 xl:col-span-2';
      case 3: return 'col-span-1 md:col-span-2 xl:col-span-3';
      case 4: return 'col-span-1 md:col-span-2 xl:col-span-4';
      default: return 'col-span-1';
    }
  };

  const renderWidget = (w: DashboardWidget, isExpanded = false) => {
    const commonProps = { isEditing, onConfigChange: (cfg: any) => handleWidgetUpdate(w.id, cfg), language };

    // Enrich variables with current values from treeData
    const enrichedVariables = w.variables?.map(v => ({
      ...v,
      value: findNodeById(treeData, v.id)?.value
    }));

    switch (w.type) {
      case 'kpi': return <KpiCard label={w.title} value={w.staticData?.value || (enrichedVariables?.[0]?.value || 0)} sub={w.subtitle} trend={5} variableConfig={w.variables?.[0]} chartData={w.variables?.[0] ? generateVariableHistory(w.variables[0].id, period) : undefined} isEditing={isEditing} onLabelChange={v => handleWidgetUpdate(w.id, { title: v })} onValueChange={v => handleWidgetUpdate(w.id, { staticData: { ...w.staticData, value: v } })} onSubChange={v => handleWidgetUpdate(w.id, { subtitle: v })} colorTheme={w.colorTheme} language={language} />;
      case 'chart': return (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            {w.chartType === 'line' ? (<LineChart data={w.variables?.[0] ? generateVariableHistory(w.variables[0].id, period) : chartData}> <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /> <XAxis dataKey="name" hide={!isExpanded} /> <YAxis hide={!isExpanded} /> <Tooltip /> <Legend onClick={(e) => handleLegendClick(w, e)} /> {w.variables?.map((v, i) => !w.hiddenVariables?.includes(v.id) && <Line key={v.id} type="monotone" dataKey="value" name={v.label} stroke={v.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)} </LineChart>) :
              w.chartType === 'bar' ? (<BarChart data={w.variables?.[0] ? generateVariableHistory(w.variables[0].id, period) : chartData}> <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /> <XAxis dataKey="name" hide={!isExpanded} /> <YAxis hide={!isExpanded} /> <Tooltip /> <Legend /> {w.variables?.map((v, i) => !w.hiddenVariables?.includes(v.id) && <Bar key={v.id} dataKey="value" name={v.label} fill={v.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)} </BarChart>) :
                w.chartType === 'area' ? (<AreaChart data={w.variables?.[0] ? generateVariableHistory(w.variables[0].id, period) : chartData}> <defs> {w.variables?.map((v, i) => (<linearGradient key={v.id} id={`color${v.id}`} x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor={v.color || COLORS[i % COLORS.length]} stopOpacity={0.3} /> <stop offset="95%" stopColor={v.color || COLORS[i % COLORS.length]} stopOpacity={0} /> </linearGradient>))} </defs> <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /> <XAxis dataKey="name" hide={!isExpanded} /> <YAxis hide={!isExpanded} /> <Tooltip /> <Legend /> {w.variables?.map((v, i) => !w.hiddenVariables?.includes(v.id) && <Area key={v.id} type="monotone" dataKey="value" name={v.label} stroke={v.color || COLORS[i % COLORS.length]} fillOpacity={1} fill={`url(#color${v.id})`} />)} </AreaChart>) :
                  w.chartType === 'pie' ? (<PieChart> <Pie data={enrichedVariables?.map(v => ({ name: v.label, value: v.value || Math.random() * 100 })) || [{ name: 'A', value: 40 }, { name: 'B', value: 60 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"> {w.variables?.map((v, i) => <Cell key={`cell-${i}`} fill={v.color || COLORS[i % COLORS.length]} />)} </Pie> <Tooltip /> <Legend /> </PieChart>) :
                    w.chartType === 'radial' ? (<RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={enrichedVariables?.map(v => ({ name: v.label, value: v.value || Math.random() * 100, fill: v.color })) || []}> <RadialBar label={{ position: 'insideStart', fill: '#fff' }} background dataKey="value" /> <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ top: '50%', right: 0, transform: 'translate(0, -50%)', lineHeight: '24px' }} /> <Tooltip /> </RadialBarChart>) :
                      w.chartType === 'heatmap' ? (<HeatmapChart data={[]} />) : null}
          </ResponsiveContainer>
        </div>
      );
      case 'table': return <SimpleTable data={w.customData || []} />;
      case 'weather': return <WeatherWidget config={w.weatherConfig} {...commonProps} />;
      case 'dpe': return <EnergyLabelWidget value={w.staticData?.value || 0} unit={w.staticData?.unit} isEditing={isEditing} onValueChange={v => handleWidgetUpdate(w.id, { staticData: { ...w.staticData, value: v } })} />;
      case 'gauge': return <GaugeWidget value={w.staticData?.value || 0} min={w.staticData?.min || 0} max={w.staticData?.max || 100} unit={w.staticData?.unit || ''} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { staticData: { ...w.staticData, ...cfg } })} />;
      case 'slider': return <SliderWidget value={w.staticData?.value || 0} min={w.staticData?.min || 0} max={w.staticData?.max || 100} unit={w.staticData?.unit || ''} isEditing={isEditing} onValueChange={v => handleWidgetUpdate(w.id, { staticData: { ...w.staticData, value: v } })} />;
      case 'oee': return <OEEWidget availability={w.staticData?.availability || 0} performance={w.staticData?.performance || 0} quality={w.staticData?.quality || 0} label={w.title} subLabel={w.subtitle} isEditing={isEditing} onValuesChange={v => handleWidgetUpdate(w.id, { staticData: { ...w.staticData, ...v } })} />;
      case 'schedule': return <ScheduleWidget config={w.scheduleConfig} {...commonProps} />;
      case 'databox': return <DataboxWidget config={w.databoxConfig!} variables={enrichedVariables} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { databoxConfig: { ...w.databoxConfig, ...cfg } })} onRemoveNode={(vid) => removeVariable(w.id, vid)} />;
      case 'alarm': return (
        <AlarmConsoleWidget
          config={{ ...(w.alarmConfig || {}), entries: alarmEntries, history: alarmHistory, stats: alarmStats }}
          {...commonProps}
          onSelectAlarm={id => handleSelectAlarmFromConsole(id)}
          onAcknowledge={handleAcknowledgeAlarm}
          onToggleMask={handleToggleMask}
          onToggleMaintenance={handleToggleMaintenance}
          onOpenEquipment={(equipmentId) => {
            if (equipmentId) {
              // Stocker l'ID de l'équipement à sélectionner pour GMAOWidget
              localStorage.setItem('gmao_select_equipment', equipmentId);
              setActiveTab('gmao');
            }
          }}
          onOpenPlan={(id) => { handleSelectNode(id); setActiveTab('floorplan'); }}
          onClearHistory={handleClearAlarmHistory}
          onImportHistory={handleImportAlarmHistory}
        />
      );
      case 'flow': return <FlowChart />;
      case 'thermometer': return <ThermometerChart value={enrichedVariables?.[0]?.value || w.staticData?.value || 20} unit={enrichedVariables?.[0]?.unit} />;
      case 'floorplan': return <FloorPlanWidget config={w.floorPlanConfig!} variables={enrichedVariables} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { floorPlanConfig: { ...w.floorPlanConfig, ...cfg } })} language={language} />;
      case 'predictive': return <PredictiveAlarmsWidget alarms={aiPredictiveData} />;
      case 'hvac': return <HVACWidget config={w.hvacConfig!} variables={enrichedVariables} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { hvacConfig: { ...w.hvacConfig, ...cfg } })} />;
      case 'synoptic': return <SynopticWidget config={w.synopticConfig!} variables={getAllVariables()} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { synopticConfig: cfg })} />;
      case 'zone': return <ZoneWidget config={w.zoneConfig!} variables={enrichedVariables} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { zoneConfig: { ...w.zoneConfig, ...cfg } })} />;
      case 'logic': return <LogicWidget config={w.logicConfig!} isEditing={isEditing} onConfigChange={cfg => handleWidgetUpdate(w.id, { logicConfig: cfg })} variables={getAllVariables()} onUpdateVariable={handleUpdateLogicVariable} />;
      case 'ai': return <AIChatWidget onSendMessage={handleAiChat} />;
      case 'gmao': return <GMAOWidget data={gmaoData} />;
      case 'workorders_widget': return <WorkOrdersWidget items={gmaoData.workOrders} onSelect={(item) => { setActiveTab('gmao'); }} />;
      case 'gmao_reports': return <GMAOReportsWidget workOrders={gmaoData.workOrders} isEditing={isEditing} />;
      case 'knowledge': return <KnowledgeWidget isEditing={isEditing} />;
      case 'mqtt_demo': return <MQTTDemo />;
      case 'settings_control': return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="flex items-center justify-between w-full px-8">
            <span className="font-medium text-lg dark:text-white">Predictive Widget</span>
            <button
              onClick={() => setPredictiveWidgetEnabled(!predictiveWidgetEnabled)}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out ${predictiveWidgetEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${predictiveWidgetEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 px-8 text-center">
            {predictiveWidgetEnabled ? 'Predictive maintenance alerts are visible on the dashboard.' : 'Predictive maintenance alerts are hidden.'}
          </div>

          <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />

          <div className="flex flex-col gap-3 w-full px-8">
            <button
              onClick={() => {
                const config = {
                  dashboards,
                  modules,
                  treeData,
                  predictiveWidgetEnabled,
                  exportDate: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={16} />
              <span className="font-medium">Export Configuration</span>
            </button>

            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const config = JSON.parse(ev.target?.result as string);
                        if (config.dashboards) setDashboards(config.dashboards);
                        if (config.modules) setModules(config.modules);
                        if (config.treeData) setTreeData(config.treeData);
                        if (config.predictiveWidgetEnabled !== undefined) setPredictiveWidgetEnabled(config.predictiveWidgetEnabled);
                        alert('Configuration imported successfully!');
                      } catch (err) {
                        alert('Error importing configuration: Invalid file format');
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Upload size={16} />
              <span className="font-medium">Import Configuration</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset to default configuration? This will clear all your customizations.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 size={16} />
              <span className="font-medium">Reset to Defaults</span>
            </button>
          </div>
        </div>
      );
      default: return <div className="flex items-center justify-center h-full text-gray-400">Widget {w.type}</div>;
    }
  };

  const getAllVariables = () => {
    const vars: { id: string, label: string, value: any, type?: string, unit?: string, alarmActive?: boolean, alarmPriority?: string }[] = [];
    const traverse = (nodes: DataNode[]) => {
      nodes.forEach(n => {
        if (n.type === 'variable') {
          const type = n.dataType || (typeof n.value === 'boolean' ? 'boolean' : typeof n.value === 'number' ? 'number' : 'string');
          vars.push({
            id: n.id,
            label: n.label,
            value: n.value,
            type,
            unit: n.unit,
            alarmActive: !!n.alarmConfig?.enabled,
            alarmPriority: n.alarmConfig?.priority
          });
        }
        if (n.children) traverse(n.children);
      });
    };
    traverse(treeData);
    return vars;
  };

  const parseDurationMs = (value?: string) => {
    if (!value) return 0;
    const digits = value.match(/\d+/g)?.map(Number);
    if (!digits || digits.length === 0) return 0;
    let h = 0, m = 0, s = 0;
    if (digits.length >= 3) {
      [h, m, s] = digits;
    } else if (digits.length === 2) {
      [m, s] = digits;
    } else if (digits.length === 1) {
      [s] = digits;
    }
    return ((h * 3600) + (m * 60) + s) * 1000;
  };

  const alarmEntries = useMemo(() => {
    const entries: any[] = [];
    const now = Date.now();
    const tracker = alarmDelayRef.current;

    const findNodeValueByLabel = (label?: string) => {
      if (!label) return undefined;
      const stack = [...treeData];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.label === label && n.value !== undefined) return n.value;
        if (n.children) stack.push(...n.children);
      }
      return undefined;
    };
    const getPath = (id: string) => findNodePath(treeData, id) || '';

    const walk = (nodes: DataNode[]) => {
      nodes.forEach(n => {
        const cfg = n.alarmConfig;
        const isAlarmNode = n.type === 'alarm';
        const isVariableWithAlarm = n.type === 'variable' && cfg?.enabled;

        if ((isAlarmNode || isVariableWithAlarm) && cfg?.enabled) {
          const effectiveValue = (n as any).mqttValue ?? n.value ?? (n as any).defaultValue ?? findNodeValueByLabel(cfg.sourceName);
          // État cible (avec override manuel et inhibition)
          let targetState: string | undefined;
          if (cfg.masked) {
            targetState = 'masked';
          } else if (cfg.maintenance) {
            targetState = 'maintenance';
          } else if (cfg.alarmInhibit) {
            targetState = 'Inhibited';
          } else {
            const ntEnabled = cfg.numericThreshold?.enabled ?? (
              cfg.numericThreshold && (cfg.numericThreshold.highLimit !== undefined || cfg.numericThreshold.lowLimit !== undefined)
            );
            if (ntEnabled && cfg.numericThreshold) {
              const rawVal = effectiveValue;
              const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9,.\-]/g, '').replace(',', '.'));
              const val = Number.isNaN(parsed) ? NaN : parsed;
              const high = cfg.numericThreshold.highLimit;
              const low = cfg.numericThreshold.lowLimit;
              const db = cfg.numericThreshold.deadband ?? 0;
              let off = false;
              if (high !== undefined && !Number.isNaN(val)) off = off || val >= (high + db);
              if (low !== undefined && !Number.isNaN(val)) off = off || val <= (low - db);
              targetState = off ? 'Offnormal' : 'Normal';
            } else if (cfg.booleanBinding?.enabled) {
              const normalVal = cfg.booleanBinding.normalValue ?? 1;
              const val = Number(n.value);
              const isNormal = cfg.booleanBinding.invert ? val === 0 : val === normalVal;
              targetState = isNormal ? 'Normal' : 'Offnormal';
            } else if (cfg.alarmState) {
              // Pas de binding : on respecte l'état manuel.
              targetState = cfg.alarmState;
            } else {
              targetState = 'Normal';
            }
          }

          // Gestion des délais d'activation / retour à la normale (pas appliqués en mode inhibé ou force manuelle)
          let state = targetState;
          const isBindingActive = cfg.booleanBinding?.enabled || cfg.numericThreshold?.enabled;
          if (!cfg.alarmInhibit && (isBindingActive || !cfg.alarmState)) {
            const delayOff = parseDurationMs(cfg.timeDelay);
            const delayNorm = parseDurationMs(cfg.timeDelayToNormal);

            if (state === 'Offnormal' && delayOff > 0) {
              const rec = tracker.get(n.id);
              const started = rec?.target === 'Offnormal' ? rec.started : now;
              if (now - started < delayOff) {
                tracker.set(n.id, { target: 'Offnormal', started });
                state = 'Pending';
              } else {
                tracker.set(n.id, { target: 'Offnormal', started });
              }
            } else if (state === 'Normal' && delayNorm > 0) {
              const rec = tracker.get(n.id);
              const started = rec?.target === 'Normal' ? rec.started : now;
              if (now - started < delayNorm) {
                tracker.set(n.id, { target: 'Normal', started });
                state = 'Pending';
              } else {
                tracker.set(n.id, { target: 'Normal', started });
              }
            } else {
              tracker.delete(n.id);
            }
          } else {
            tracker.delete(n.id);
          }

          const priNum = cfg.priority !== undefined ? parseInt(String(cfg.priority), 10) : NaN;
          const priLabel = !Number.isNaN(priNum)
            ? (priNum === 1 ? 'Urgent' : priNum === 2 ? 'Non Urgent' : 'Info')
            : (cfg.priority || 'Info');

          // Message basé sur l'état + libellés booléens si présents
          const normalLabel = cfg.booleanBinding?.enabled ? (cfg.booleanFacetTrue || 'Normal') : (cfg.toNormalText || 'Alarm Cleared');
          const offLabel = cfg.booleanBinding?.enabled ? (cfg.booleanFacetFalse || cfg.toOffnormalText || n.label) : (cfg.toOffnormalText || n.label);

          let msg: string;
          if (state === 'Normal') {
            msg = normalLabel;
          } else if (state === 'Fault') {
            msg = cfg.toFaultText || offLabel;
          } else if (state === 'Masked') {
            msg = `[Masquée] ${offLabel}`;
          } else if (state === 'Maintenance') {
            msg = `[Maintenance] ${offLabel}`;
          } else if (state === 'Inhibited') {
            msg = `[Inhibée${cfg.inhibitTime ? ` (${cfg.inhibitTime})` : ''}] ${offLabel}`;
          } else if (state === 'Pending') {
            msg = `${offLabel} (Délai en cours)`;
          } else {
            msg = offLabel;
          }

          // Inject numeric limit texts when alarm is inhibited
          if (cfg.numericThreshold?.enabled && cfg.alarmInhibit) {
            const limits: string[] = [];
            if (cfg.highLimitText) limits.push(`High: ${cfg.highLimitText}`);
            if (cfg.lowLimitText) limits.push(`Low: ${cfg.lowLimitText}`);
            msg = `[Inhibée] ${msg}${limits.length ? ' | ' + limits.join(' | ') : ''}`;
          }

          // Show delays info when present
          if (state === 'Pending') {
            if (cfg.timeDelay) msg += ` (Delay: ${cfg.timeDelay})`;
            if (cfg.timeDelayToNormal) msg += ` (DelayNormal: ${cfg.timeDelayToNormal})`;
          }

          const stateLabel = cfg.booleanBinding?.enabled
            ? (state === 'Normal' ? normalLabel : state === 'Pending' ? `${offLabel} (Délai)` : offLabel)
            : state;

          const reliability = cfg.reliability || ((n.value === undefined || n.value === null || n.value === '') ? 'Bad' : 'Good');
          let ts = cfg.timestamp || alarmTimeRef.current[n.id];
          if (!ts) {
            ts = new Date().toISOString();
            alarmTimeRef.current[n.id] = ts;
          }
          const lastTs = new Date().toISOString();
          alarmLastRef.current[n.id] = lastTs;

          entries.push({
            id: n.id,
            time: ts,
            lastAlarm: lastTs,
            msg,
            pri: priLabel,
            state,
            stateLabel,
            source: cfg.sourceName || n.label,
            reliability,
            equipment: cfg.sourceName || n.label,
            plan: n.id,
            path: getPath(n.id),
            masked: cfg.masked === true,
            maintenance: cfg.maintenance === true,
            linkedEquipmentId: cfg.linkedEquipmentId
          });
        }
        if (n.children) walk(n.children);
      });
    };
    walk(treeData);
    return entries;
  }, [treeData, alarmTick]);

  const alarmStats = useMemo(() => {
    const stats = new Map<string, { count: number; last: string | null; lastAck: string | null }>();
    alarmHistory.forEach(evt => {
      if (!evt?.id) return;
      const rec = stats.get(evt.id) || { count: 0, last: null, lastAck: null };
      const t = evt.time || new Date().toISOString();
      if (evt.type === 'ack') {
        rec.lastAck = t;
      }
      if (evt.type === 'state' && evt.state && evt.state.toLowerCase() !== 'normal') {
        rec.count += 1;
        rec.last = t;
      }
      stats.set(evt.id, rec);
    });
    return stats;
  }, [alarmHistory]);

  // Journalisation des transitions d'état d'alarmes (simple, localStorage)
  useEffect(() => {
    const map = lastAlarmStateRef.current;
    alarmEntries.forEach(a => {
      const prev = map.get(a.id);
      if (prev !== a.state) {
        appendAlarmHistory({
          id: a.id,
          source: a.source,
          msg: a.msg,
          pri: a.pri,
          prevState: prev,
          state: a.state,
          stateLabel: a.stateLabel,
          type: 'state',
          time: new Date().toISOString(),
          linkedEquipmentId: a.linkedEquipmentId
        });
        map.set(a.id, a.state);
      }
    });
  }, [alarmEntries]);

  // Synchroniser l'historique des alarmes GMAO vers localStorage
  useEffect(() => {
    // Filtrer pour ne garder que les entrées liées à un équipement
    const gmaoHistory = alarmHistory.filter(h => (h as any).linkedEquipmentId);
    if (gmaoHistory.length > 0) {
      localStorage.setItem('gmao_alarm_history', JSON.stringify(gmaoHistory));
    }
  }, [alarmHistory]);

  // Synchroniser les alarmes actives vers localStorage pour GMAOWidget
  useEffect(() => {
    // Filtrer les alarmes liées à un équipement GMAO et qui sont actives (Offnormal)
    const activeLinkedAlarms = alarmEntries
      .filter(a => a.linkedEquipmentId && a.state && a.state.toLowerCase() !== 'normal')
      .map(a => ({
        id: a.id,
        equipmentId: a.linkedEquipmentId,
        variableName: a.source,
        alarmText: a.msg,
        priority: a.pri,
        state: a.state,
        timestamp: a.time
      }));
    localStorage.setItem('gmao_active_alarms', JSON.stringify(activeLinkedAlarms));
  }, [alarmEntries]);

  const renderSidebarItem = (m: AppModule, level = 0) => {
    if (!m.isPinned && m.type !== 'system' && m.id !== 'apps') return null;
    const Icon = ICON_MAP[m.iconKey] || Layout;
    const isActive = activeTab === m.id;
    const hasChildren = m.children && m.children.length > 0;
    const isDragging = draggedModuleId === m.id;
    const isOver = dragOverId === m.id;

    return (
      <div key={m.id} className="mb-0.5" style={{ paddingLeft: level === 0 ? 0 : 8 }}>
        {/* Utiliser le style folder pour les modules avec enfants OU de type folder */}
        {(m.type === 'folder' || hasChildren) ? (
          <div className="mb-1">
            <div
              className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group ${isActive && m.type !== 'folder' ? `bg-${m.color || 'blue'}-50 dark:bg-${m.color || 'blue'}-900/20` : ''} ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                if (m.type !== 'folder') {
                  setActiveTab(m.id);
                }
                toggleModuleOpen(m.id);
              }}
              draggable={isEditing}
              onDragStart={(e) => isEditing && handleModuleDragStart(e, m.id)}
              onDragOver={(e) => isEditing && handleModuleDragOver(e, m.id)}
              onDrop={(e) => isEditing && handleModuleDrop(e, m.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-gray-400">{m.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                <Icon size={16} className={`shrink-0 ${isActive && m.type !== 'folder' ? `text-${m.color || 'blue'}-600` : 'text-gray-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider truncate ${isActive && m.type !== 'folder' ? `text-${m.color || 'blue'}-600` : 'text-gray-500'}`}>{t[m.label] || m.label}</span>
              </div>
              {isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setParentForNewTab(m.id); setIsTabCreatorOpen(true); }} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded"><Plus size={12} className="text-gray-500" /></button>
                  {m.isRemovable && <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded text-red-500"><Trash2 size={12} /></button>}
                </div>
              )}
            </div>
            {m.isOpen && hasChildren && (
              <div className="mt-0.5 space-y-0.5">
                {m.children!.map(child => renderSidebarItem(child, level + 1))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className={`
                            group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 relative
                            ${isActive ? `bg-${m.color || 'blue'}-50 dark:bg-${m.color || 'blue'}-900/20 text-${m.color || 'blue'}-600 dark:text-${m.color || 'blue'}-400 font-bold shadow-sm` : `text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5`}
                            ${isDragging ? 'opacity-50' : ''}
                            ${isOver ? 'ring-2 ring-blue-500' : ''}
                        `}
              onClick={() => setActiveTab(m.id)}
              draggable={isEditing}
              onDragStart={(e) => isEditing && handleModuleDragStart(e, m.id)}
              onDragOver={(e) => isEditing && handleModuleDragOver(e, m.id)}
              onDrop={(e) => isEditing && handleModuleDrop(e, m.id)}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 truncate text-sm">
                  {isEditing && m.isRemovable ? (
                    <input
                      value={m.label}
                      onChange={(e) => handleRenameModule(m.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent outline-none w-full"
                    />
                  ) : (
                    <span>{t[m.label] || m.label}</span>
                  )}
                </div>
              )}
              {isEditing && sidebarOpen && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 absolute right-2 bg-white/80 dark:bg-black/80 rounded px-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setParentForNewTab(m.id);
                      setIsTabCreatorOpen(true);
                    }}
                    className="p-1 hover:text-green-500"
                    title="Ajouter sous-élément"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDuplicateModal(m); }}
                    className="p-1 hover:text-purple-500"
                    title="Dupliquer"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openIconEditModal(m); }}
                    className="p-1 hover:text-orange-500"
                    title="Modifier l'icône"
                  >
                    <Pencil size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePinModule(m.id); }} className="p-1 hover:text-blue-500"><LogOut size={12} className="rotate-180" /></button>
                  {m.isRemovable && <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }} className="p-1 hover:text-red-500"><Trash2 size={12} /></button>}
                </div>
              )}
            </div>
            {/* Afficher les enfants même pour les modules non-folder */}
            {hasChildren && (
              <div className="mt-0.5 space-y-0.5 pl-4">
                {m.children!.map(child => renderSidebarItem(child, level + 1))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'network') {
      return (
        <NetworkManager language={language} treeData={treeData} setTreeData={setTreeData} />
      );
    }

    if (activeTab === 'apps') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {flattenModules(modules).filter(m => m.type !== 'folder' && m.id !== 'apps').map(m => {
            const Icon = ICON_MAP[m.iconKey] || Layout;
            return (
              <div
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col items-center gap-4 group"
              >
                <div className={`w-16 h-16 rounded-2xl bg-${m.color}-100 dark:bg-${m.color}-900/20 text-${m.color}-600 dark:text-${m.color}-400 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon size={32} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg dark:text-white">{t[m.label] || m.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.description}</div>
                </div>
                {isEditing && m.isRemovable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id); }}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
          {isEditing && (
            <button
              onClick={() => { setParentForNewTab(null); setIsTabCreatorOpen(true); }}
              className="bg-gray-100 dark:bg-white/5 p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Plus size={32} />
              <span className="font-bold">{t.createDashboard}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-min pb-20 min-h-[500px]"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleGridDrop}
      >
        {visibleWidgets.map(w => (
          <Card
            key={w.id}
            {...w}
            isEditing={isEditing}
            onRemove={() => removeWidget(w.id)}
            onSwap={() => { setSwappingWidgetId(w.id); setShowWidgetPalette(true); }}
            onResize={(width, height) => handleWidgetResize(w.id, width, height)}
            onTitleChange={(val) => handleWidgetUpdate(w.id, { title: val })}
            onSubtitleChange={(val) => handleWidgetUpdate(w.id, { subtitle: val })}
            onColorChange={(color) => handleWidgetUpdate(w.id, { colorTheme: color })}
            onBackgroundChange={(color) => handleWidgetUpdate(w.id, { backgroundColor: color })}
            dragHandleProps={isEditing ? {
              draggable: true,
              onDragStart: (e: React.DragEvent) => {
                setDraggedItemIndex(currentWidgets.indexOf(w));
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", "reorder");
              },
              onDragEnd: () => setDraggedItemIndex(null)
            } : undefined}
            onReorderDragOver={(e) => {
              if (draggedItemIndex === null) return;
              const dragIndex = draggedItemIndex;
              const hoverIndex = currentWidgets.indexOf(w);
              if (dragIndex === hoverIndex) return;

              const newItems = [...currentWidgets];
              const [reorderedItem] = newItems.splice(dragIndex, 1);
              newItems.splice(hoverIndex, 0, reorderedItem);
              updateWidgets(newItems);
              setDraggedItemIndex(hoverIndex);
            }}
            tools={{ onExpand: () => setExpandedWidgetId(w.id), onExport: () => handleExport(w), onWiden: () => handleWidgetWiden(w.id), onExtend: () => handleWidgetExtend(w.id) }}
            className={`${getResponsiveColSpan(w.colSpan || 1)} row-span-1 ${w.type === 'synoptic' || w.type === 'logic' || w.type === 'floorplan' ? 'overflow-hidden' : ''}`}
            style={{ height: w.height || 300 }}
            onDataDrop={(varId) => handleDataDrop(w.id, varId)}
            variables={w.variables}
            onRemoveVariable={(vid) => removeVariable(w.id, vid)}
            onVariableStyleChange={(vid, style) => handleVariableStyleChange(w.id, vid, style)}
            language={language}
          >
            {renderWidget(w)}
          </Card>
        ))}
        {isEditing && (
          <div
            className="col-span-1 h-[300px] border-2 border-dashed border-gray-300 dark:border-white/10 rounded-3xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
            onClick={() => setShowWidgetPalette(true)}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus size={32} />
              <span className="font-bold">Add Widget</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-blue-500 selection:text-white">
      <aside
        className="transition-all duration-300 bg-white dark:bg-[#1c1c1e] border-r border-gray-100 dark:border-white/5 flex flex-col shrink-0 z-20 shadow-xl shadow-gray-200/50 dark:shadow-none relative"
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : '64px' }}
      >
        <div className={`p-6 flex items-center gap-3 ${!sidebarOpen && 'justify-center px-2'}`}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20 shrink-0">
            <Zap size={20} fill="currentColor" />
          </div>
          {sidebarOpen && <div className="font-bold text-xl tracking-tight whitespace-nowrap overflow-hidden">DataConnectAI</div>}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
          <div
            className={`flex justify-between items-center px-2 mb-2 mt-4 rounded-lg transition-colors ${dragOverId === 'root' ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''}`}
            onDragOver={(e) => isEditing && handleModuleDragOver(e, 'root')}
            onDrop={(e) => isEditing && handleModuleDrop(e, 'root')}
          >
            <div className={`text-xs font-bold text-gray-400 uppercase tracking-wider ${!sidebarOpen && 'hidden'}`}>Menu</div>
            {isEditing && (
              <button
                onClick={() => {
                  setParentForNewTab(null);
                  setIsTabCreatorOpen(true);
                }}
                className="text-blue-500 hover:bg-blue-50 dark:hover:bg-white/10 rounded p-1 transition-colors"
                title="Add Dashboard to Root"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {modules.map(m => renderSidebarItem(m))}
          <div className={`flex items-center gap-2 px-2 mb-2 mt-8 ${!sidebarOpen && 'justify-center'}`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Site Structure</div>
                <button
                  onClick={() => {
                    const folderName = prompt('Nom du dossier :');
                    if (folderName && folderName.trim()) {
                      const newFolder: DataNode = {
                        id: `folder_${Date.now()}`,
                        label: folderName.trim().toUpperCase(),
                        type: 'folder',
                        children: []
                      };
                      setTreeData(prev => [...prev, newFolder]);
                    }
                  }}
                  className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-indigo-500 transition-colors"
                  title="Ajouter un dossier à la racine"
                >
                  <Plus size={12} />
                </button>
              </div>
            ) : (
              <div className="w-8 h-1 bg-gray-200 dark:bg-white/10 rounded-full" />
            )}
            {sidebarOpen && (
              <input
                value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
                placeholder="Filtrer..."
                className="flex-1 text-xs px-2 py-1 rounded bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
              />
            )}
            <div className={`flex bg-gray-100 dark:bg-white/5 rounded-lg p-0.5 ${!sidebarOpen && 'flex-col'}`}>
              <button onClick={() => setViewMode('site')} className={`p-1 rounded-md ${viewMode === 'site' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} title="Site View"><Folder size={12} /></button>
              <button onClick={() => setViewMode('equipment')} className={`p-1 rounded-md ${viewMode === 'equipment' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} title="Equipment View"><Box size={12} /></button>
            </div>
          </div>
          <div className={`space-y-0.5 pl-2 ${!sidebarOpen && 'hidden'}`}>
            {filteredTree.map(node => (
              <SiteTreeNode
                key={node.id}
                node={node}
                level={0}
                onAddNode={(pid, type) => {
                  setNodeParentId(pid);
                  setNodeTypeToAdd(type);
                  setIsAddNodeModalOpen(true);
                }}
                onDeleteNode={handleDeleteNode}
                onToggleHistory={handleToggleHistory}
                onToggleAlarmBinding={toggleVariableAlarmBinding}
                onToggleMask={(id, val) => handleToggleMask(id, val)}
                onToggleMaintenance={(id, val) => handleToggleMaintenance(id, val)}
                onDuplicateNode={handleDuplicateNode}
                copiedNodeId={copiedNodeId}
                onRenameNode={handleEditNode}
                onUpdateNode={handleUpdateNode}
                onLinkToEquipment={(nodeId) => {
                  setSelectedNodeId(nodeId);
                  setDetailsPanelOpen(true);
                  // Focus sur le panneau de droite où la liaison existe déjà
                }}
                viewMode={viewMode}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                expandTick={expandTreeTick}
              />
            ))}
          </div>

          <div className="flex justify-between items-center px-2 mb-2 mt-8">
            <div className={`flex items-center gap-2 ${!sidebarOpen && 'hidden'}`}>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Drivers</div>
              <button
                onClick={() => setBacnetConfigOpen(true)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-400 hover:text-blue-500 transition-colors"
                title="Configuration BACnet"
              >
                <Settings size={12} />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`absolute right-0 top-0 bottom-0 w-2 ${sidebarLocked ? 'cursor-not-allowed opacity-30' : 'cursor-col-resize hover:bg-blue-500/50'} transition-colors z-50`}
          onMouseDown={() => { if (!sidebarLocked) setIsResizingSidebar(true); }}
        />
        <button
          onClick={() => { if (!sidebarLocked) setSidebarOpen(!sidebarOpen); }}
          className={`absolute -right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-16 rounded-r-xl bg-white dark:bg-[#1c1c1e] border-r border-y border-gray-200 dark:border-white/10 shadow-[2px_0_4px_rgba(0,0,0,0.05)] text-gray-400 hover:text-blue-600 transition-all hover:w-9 z-50`}
          title={sidebarLocked ? 'Bandeau gauche verrouillé' : sidebarOpen ? 'Fermer le bandeau' : 'Ouvrir le bandeau'}
        >
          {sidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-8 shrink-0 z-10 bg-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (!sidebarLocked) setSidebarOpen(!sidebarOpen); }}
              className={`p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 ${sidebarOpen ? 'hidden' : 'block'}`}
              title={sidebarLocked ? 'Bandeau gauche verrouillé' : 'Ouvrir/Fermer le bandeau gauche'}
            >
              {sidebarOpen ? <ChevronsLeft size={20} /> : <Menu size={20} />}
            </button>
            <button
              onClick={() => setSidebarLocked(v => {
                const next = !v;
                if (next) setSidebarOpen(false); // lock en position fermée
                return next;
              })}
              className={`p-2 rounded-lg border ${sidebarLocked ? 'bg-gray-900 text-white border-gray-800' : 'bg-white dark:bg-white/10 text-gray-500 border-gray-200 dark:border-white/10'} transition-colors`}
              title={sidebarLocked ? 'Déverrouiller le bandeau gauche' : 'Verrouiller le bandeau gauche fermé'}
            >
              {sidebarLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <div> <h2 className="text-2xl font-extrabold tracking-tight capitalize flex items-center gap-3"> {activeModuleDef?.iconKey && ICON_MAP[activeModuleDef.iconKey] ? React.createElement(ICON_MAP[activeModuleDef.iconKey], { size: 26, className: "text-blue-600" }) : <Layout size={26} className="text-blue-600" />} {t[activeModuleDef?.label || activeTab] || activeModuleDef?.label || activeTab} </h2> </div>
            <div className="relative ml-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={widgetSearch}
                onChange={(e) => setWidgetSearch(e.target.value)}
                placeholder="Rechercher widgets..."
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-48 transition-all"
              />
              {widgetSearch && (
                <button
                  onClick={() => setWidgetSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'fr' : 'en')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-all shadow-sm"
            >
              <Languages size={18} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-bold uppercase">{language}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSaveMenu(!showSaveMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-all shadow-sm text-gray-700 dark:text-gray-200"
              >
                <Save size={18} />
                <span className="text-sm font-bold hidden sm:inline">{t.save || 'Enregistrer'}</span>
                <ChevronDown size={14} />
              </button>
              {showSaveMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => { setIsSaveAsModalOpen(true); setShowSaveMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <Download size={14} /> Enregistrer sous...
                  </button>
                  <button
                    onClick={handleSaveVersion}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <Layers size={14} /> Enregistrer version
                  </button>
                  <hr className="my-1 border-gray-100 dark:border-white/10" />
                  <button
                    onClick={handleExportPage}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-blue-600"
                  >
                    <Upload size={14} /> Exporter Page
                  </button>
                  <button
                    onClick={handleImportPageClick}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-blue-600"
                  >
                    <Download size={14} /> Importer Page
                  </button>
                  <hr className="my-1 border-gray-100 dark:border-white/10" />
                  <button
                    onClick={handleExportProject}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-purple-600"
                  >
                    <Upload size={14} /> Exporter Projet Complet
                  </button>
                  <button
                    onClick={handleImportProjectClick}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-purple-600"
                  >
                    <Download size={14} /> Importer Projet Complet
                  </button>
                </div>
              )}
              {/* Hidden Inputs for Import */}
              <input type="file" ref={importPageInputRef} onChange={handleImportPageFile} accept=".json" className="hidden" />
              <input type="file" ref={importProjectInputRef} onChange={handleImportProjectFile} accept=".json" className="hidden" />
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${isEditing ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/20 border border-gray-100 dark:border-white/5'}`}> {isEditing ? <Check size={16} /> : <Pencil size={16} />} {isEditing ? t.doneEditing : t.editDashboard} </button>
            <div className="flex bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-sm"> <button onClick={() => setDarkMode(false)} className={`p-2 rounded-lg transition-all ${!darkMode ? 'bg-gray-100 dark:bg-gray-700 text-yellow-500 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}><Sun size={18} /></button> <button onClick={() => setDarkMode(true)} className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-gray-100 dark:bg-gray-700 text-blue-400 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}><Activity size={18} /></button> </div> <PeriodSelector current={period} onChange={setPeriod} /> <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 border-2 border-white dark:border-white/10 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center text-white font-bold text-sm" onClick={() => setIsAuthenticated(false)} title={t.logout}>JD</div> </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth">
            <div className="max-w-[1800px] mx-auto">
              {renderContent()}
            </div>
          </div>
          <ObjectDetailsPanel
            node={selectedNode}
            open={detailsPanelOpen}
            width={detailsPanelWidth}
            resizable={isEditing && !detailsPanelLocked}
            isLocked={detailsPanelLocked}
            onResizeStart={() => { if (!detailsPanelLocked) setIsResizingDetails(true); }}
            details={selectedDetails}
            onToggle={() => { if (!detailsPanelLocked) setDetailsPanelOpen(prev => !prev); }}
            onToggleLock={() => {
              setDetailsPanelLocked(prev => {
                const next = !prev;
                if (next) setDetailsPanelOpen(false);
                return next;
              });
            }}
            onUpdateAlarm={handleAlarmConfigChange}
            onUpdateNode={handleUpdateNode}
          />
        </div>

        {undoStack.length > 0 && isEditing && (
          <div className="fixed bottom-8 left-8 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full shadow-xl hover:scale-105 transition-transform font-bold active:scale-95"
            >
              <Undo2 size={18} />
              <span>Undo Delete ({undoStack.length})</span>
            </button>
          </div>
        )}

        {isEditing && activeTab !== 'apps' && activeTab !== 'network' && activeTab !== 'alarm_explorer' && (<div className="fixed bottom-8 right-8 z-40 animate-in zoom-in duration-300"> <button onClick={() => setShowWidgetPalette(true)} className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl shadow-blue-900/20 flex items-center justify-center hover:scale-110 transition-transform active:scale-95"> <Plus size={32} /> </button> </div>)}
      </main>

      {expandedWidget && (<div className="fixed inset-0 z-[60] bg-white dark:bg-black flex flex-col animate-in fade-in duration-200"> <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/10"> <h2 className="text-2xl font-bold">{expandedWidget.title}</h2> <button onClick={() => setExpandedWidgetId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={24} /></button> </div> <div className="flex-1 p-8 bg-gray-50 dark:bg-black/50"> <Card title="" noPadding className="h-full shadow-none border-none bg-transparent" tools={{ onRefresh: () => { }, onExport: () => handleExport(expandedWidget) }}> {renderWidget(expandedWidget, true)} </Card> </div> </div>)}

      {isTabCreatorOpen && (<div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-white/10"> <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center"> <h3 className="text-xl font-bold">{parentForNewTab ? 'Create Child Tab' : t.createDashboard}</h3> <button onClick={() => setIsTabCreatorOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button> </div> <div className="p-6 space-y-6"> <div> <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Name</label> <input autoFocus type="text" value={newTabName} onChange={e => setNewTabName(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg dark:text-white" placeholder="e.g. Maintenance Report" /> </div> <div> <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Icon</label> <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1"> {AVAILABLE_ICONS.map(iconKey => { const Icon = ICON_MAP[iconKey]; return (<button key={iconKey} onClick={() => setNewTabIcon(iconKey)} className={`p-3 rounded-xl flex items-center justify-center transition-all ${newTabIcon === iconKey ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 text-gray-500'}`}> <Icon size={20} /> </button>) })} </div> </div> <Button onClick={handleAddDashboard} className="w-full py-3 text-lg">Create</Button> </div> </div> </div>)}

      {/* Modal de duplication d'onglet */}
      {isDuplicateModalOpen && duplicateSource && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-white/10">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Copy size={20} className="text-purple-500" />
                Dupliquer "{duplicateSource.label}"
              </h3>
              <button onClick={() => setIsDuplicateModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nouveau nom</label>
                <input
                  autoFocus
                  type="text"
                  value={duplicateName}
                  onChange={e => setDuplicateName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-lg dark:text-white"
                  placeholder="Nom du nouvel onglet"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Icône</label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {AVAILABLE_ICONS.map(iconKey => {
                    const Icon = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        onClick={() => setDuplicateIcon(iconKey)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${duplicateIcon === iconKey ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 text-gray-500'}`}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  id="duplicateWidgets"
                  checked={duplicateWithWidgets}
                  onChange={e => setDuplicateWithWidgets(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-500"
                />
                <label htmlFor="duplicateWidgets" className="text-sm font-medium cursor-pointer flex-1">
                  Dupliquer également les widgets de la page
                </label>
              </div>
              <Button onClick={handleDuplicateModule} className="w-full py-3 text-lg bg-purple-600 hover:bg-purple-700">
                <Copy size={18} /> Dupliquer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'icône */}
      {isIconEditModalOpen && iconEditModuleId && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-white/10">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Pencil size={20} className="text-orange-500" />
                Modifier l'icône
              </h3>
              <button onClick={() => setIsIconEditModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Choisir une icône</label>
                <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1">
                  {AVAILABLE_ICONS.map(iconKey => {
                    const Icon = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        onClick={() => setIconEditCurrentIcon(iconKey)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${iconEditCurrentIcon === iconKey ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 text-gray-500'}`}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={handleChangeModuleIcon} className="w-full py-3 text-lg bg-orange-500 hover:bg-orange-600">
                <Check size={18} /> Appliquer
              </Button>
            </div>
          </div>
        </div>
      )}
      {showWidgetPalette && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setShowWidgetPalette(false); setSwappingWidgetId(null); }}>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-gray-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-2xl font-bold dark:text-white">{swappingWidgetId ? 'Swap Widget' : t.widgetLibrary}</h3>
              <button onClick={() => { setShowWidgetPalette(false); setSwappingWidgetId(null); }}><X size={24} className="text-gray-400 hover:text-gray-900" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-black/20">
              <p className="text-sm text-gray-500 font-medium mb-6">
                {swappingWidgetId
                  ? 'Select a new widget type to replace the selected one. Data connections will be preserved.'
                  : 'Click to add to your dashboard, or drag to the grid.'}
              </p>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { id: 'kpi-power', label: 'Total Power', icon: Zap, color: 'orange' },
                  { id: 'logic', label: 'Logic Editor', icon: Workflow, color: 'purple' },
                  { id: 'zone', label: 'Zone Control', icon: Snowflake, color: 'blue' },
                  { id: 'synoptic', label: 'Synoptic View', icon: Monitor, color: 'blue' },
                  { id: 'hvac', label: 'HVAC Symbol', icon: Fan, color: 'green' },
                  { id: 'kpi', label: 'KPI Card', icon: Activity, color: 'blue' },
                  { id: 'dpe', label: 'Energy Label', icon: Scale, color: 'green' },
                  { id: 'gauge', label: 'Gauge Chart', icon: Gauge, color: 'purple' },
                  { id: 'slider', label: 'Slider Control', icon: SlidersHorizontal, color: 'blue' },
                  { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'teal' },
                  { id: 'databox', label: 'Databox', icon: List, color: 'indigo' },
                  { id: 'alarm', label: 'Alarm Console', icon: Bell, color: 'red' },
                  { id: 'workorders_widget', label: 'Bons de travail', icon: ClipboardList, color: 'red' },
                  { id: 'requests_widget', label: 'Demandes', icon: ClipboardList, color: 'teal' },
                  { id: 'gmao_reports', label: 'Rapports GMAO', icon: BarChart3, color: 'purple' },
                  { id: 'weather', label: 'Weather', icon: CloudSun, color: 'blue' },
                  { id: 'predictive', label: 'Predictive', icon: AlertTriangle, color: 'orange' },
                  { id: 'chart', type: 'bar', label: 'Bar Graph', icon: BarChart3, color: 'indigo' },
                  { id: 'chart', type: 'line', label: 'Line Chart', icon: LineIcon, color: 'pink' },
                  { id: 'chart', type: 'area', label: 'Area Chart', icon: AreaChartIcon, color: 'orange' },
                  { id: 'chart', type: 'pie', label: 'Pie Chart', icon: Circle, color: 'yellow' },
                  { id: 'chart', type: 'donut', label: 'Donut Chart', icon: Disc, color: 'cyan' },
                  { id: 'chart', type: 'radial', label: 'Radial Rings', icon: Target, color: 'red' },
                  { id: 'chart', type: 'heatmap', label: 'Heatmap', icon: Grid3x3, color: 'red' },
                  { id: 'floorplan', label: 'Floor Plan', icon: MapIcon, color: 'teal' },
                  { id: 'thermometer', label: 'Thermometer', icon: Thermometer, color: 'cyan' },
                  { id: 'flow', label: 'Sankey Flow', icon: Workflow, color: 'teal' },
                  { id: 'table', label: 'Data Table', icon: TableIcon, color: 'gray' },
                  { id: 'ai', label: 'AI Assistant', icon: Sparkles, color: 'violet' },
                ].map((item: any) => (
                  <div
                    key={item.label + item.type}
                    draggable={!swappingWidgetId}
                    onDragStart={(e) => {
                      if (swappingWidgetId) return;
                      const dragPayload = JSON.stringify({ type: 'new-widget', widgetType: item.id, chartType: item.type });
                      if (e.dataTransfer) {
                        e.dataTransfer.setData("application/json", dragPayload);
                        e.dataTransfer.effectAllowed = "copy";
                      }
                    }}
                    onClick={() => addWidget(item.id, item.type)}
                    className={`group p-6 rounded-3xl bg-white dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left flex flex-col items-start relative overflow-hidden ${swappingWidgetId ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                      {swappingWidgetId ? <ArrowLeftRight size={20} /> : <Plus size={20} />}
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                      <item.icon size={28} />
                    </div>
                    <span className="font-bold text-lg dark:text-white">{item.label}</span>
                    <span className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wider">{item.type || 'Widget'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-[#2c2c2e] p-6 rounded-2xl shadow-xl w-96 border border-gray-200 dark:border-white/10">
            <h3 className="font-bold mb-4 dark:text-white text-lg">{editingNodeId ? 'Modifier le nœud' : 'Ajouter un nœud'}</h3>

            {/* Type Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Type</label>
              <select
                value={nodeTypeToAdd}
                onChange={e => setNodeTypeToAdd(e.target.value as NodeType)}
                className={`w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10 ${editingNodeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!!editingNodeId}
              >
                <option value="site">Site</option>
                <option value="building">Building</option>
                <option value="floor">Floor</option>
                <option value="space">Space / Room</option>
                <option value="equipment">Equipment</option>
                <option value="variable">Variable</option>
                <option value="folder">Folder</option>
                <option value="alarm">Alarm</option>
              </select>
            </div>

            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nom</label>
              <input
                autoFocus
                value={newNodeLabel}
                onChange={e => setNewNodeLabel(e.target.value)}
                className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                placeholder="e.g. Temperature Sensor"
                onKeyDown={e => e.key === 'Enter' && handleAddNode()}
              />
            </div>

            {/* Variable type selector */}
            {nodeTypeToAdd === 'variable' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Type de variable</label>
                <select
                  value={newVariableType}
                  onChange={e => setNewVariableType(e.target.value as any)}
                  className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                >
                  <option value="number">Numérique</option>
                  <option value="boolean">Booléen</option>
                  <option value="string">Texte</option>
                </select>
              </div>
            )}

            {/* Auto/Manu Toggle for Variables */}
            {nodeTypeToAdd === 'variable' && editingNodeId && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewOverrideMode('auto')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${newOverrideMode === 'auto' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setNewOverrideMode('manu')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${newOverrideMode === 'manu' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                  >
                    Manuel
                  </button>
                </div>
              </div>
            )}

            {/* Default value and unit */}
            {nodeTypeToAdd === 'variable' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Valeur par défaut</label>
                  <input
                    value={newVariableValue}
                    onChange={e => setNewVariableValue(e.target.value)}
                    className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                    placeholder={newVariableType === 'boolean' ? 'true/false ou 1/0' : newVariableType === 'number' ? '0' : 'texte'}
                  />
                </div>
                {newVariableType !== 'boolean' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Unité</label>
                    <input
                      value={newVariableUnit}
                      onChange={e => setNewVariableUnit(e.target.value)}
                      className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                      placeholder="°C, %, kW..."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Label état = 1</label>
                      <input
                        value={newBooleanLabelTrue}
                        onChange={e => setNewBooleanLabelTrue(e.target.value)}
                        className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                        placeholder="ex: Normal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Label état = 0</label>
                      <input
                        value={newBooleanLabelFalse}
                        onChange={e => setNewBooleanLabelFalse(e.target.value)}
                        className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                        placeholder="ex: Défaut"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MQTT Topic Input (only for variables) */}
            {nodeTypeToAdd === 'variable' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Topic MQTT (Optionnel)</label>
                <input
                  value={newMqttTopic}
                  onChange={e => setNewMqttTopic(e.target.value)}
                  className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                  placeholder="e.g. campus/building/temp"
                  onKeyDown={e => e.key === 'Enter' && handleAddNode()}
                />
                <p className="text-xs text-gray-400 mt-1">Laisser vide si non utilisé</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsAddNodeModalOpen(false); setEditingNodeId(null); }}>Annuler</Button>
              <Button onClick={handleAddNode} size="sm">{editingNodeId ? 'Enregistrer' : 'Ajouter'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Save As Modal */}
      {isSaveAsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-300">
            <h3 className="text-lg font-bold mb-4">Enregistrer le tableau de bord</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nom du nouveau tableau de bord</label>
              <input
                autoFocus
                value={newDashboardName}
                onChange={e => setNewDashboardName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveAs()}
                className="w-full p-2 bg-gray-100 dark:bg-white/10 rounded-lg outline-none dark:text-white border border-gray-200 dark:border-white/10"
                placeholder="Ex: Rez-de-chaussée V2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsSaveAsModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveAs}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}

      {/* BACnet Config Modal */}
      <BACnetConfigModal isOpen={bacnetConfigOpen} onClose={() => setBacnetConfigOpen(false)} />
    </div>
  );
};

export default App;
