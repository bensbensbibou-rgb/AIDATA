import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Factory,
  FolderPlus,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Server,
  UploadCloud,
  User,
  QrCode,
  MapPin,
  Lock,
  PauseCircle,
  Share2,
  Paperclip,
  ChevronDown,
  Link as LinkIcon,
  Pencil,
  LayoutList,
  Table as TableIcon,
  Check,
  Settings,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

type Equipment = {
  id: string;
  name: string;
  status?: string;
  description?: string;
  location?: string;
  criticality?: string;
  parentId?: string;
  manufacturer?: string;
  model?: string;
  createdAt?: string;
  updatedAt?: string;
  linkedVariables?: string[];
};
type Supplier = { id: string; name: string; color?: string; description?: string };
type Category = { id: string; name: string; description?: string; icon?: string; color?: string };
type UserType = { id: string; name: string; email?: string; role?: string };
type Attachment = { name: string; preview?: string };
type Part = {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  partType?: string;
  locations?: { zone: string; stock: number; minStock: number }[];
  equipments?: string[];
  teams?: string[];
  suppliers?: string[];
  files?: string[];
};
type WorkOrder = {
  id: string;
  status: string;
  title: string;
  description: string;
  location: string;
  equipment: string;
  equipmentStatus: string;
  procedure: string;
  assignee: string;
  hours: number;
  minutes: number;
  dueDate: string;
  startDate: string;
  recurrence: string;
  workType: string;
  priority: string;
  categoryInput: string;
  files: Attachment[];
  parts: string;
  supplier: string;
  categories: string[];
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
};

// Types pour les alarmes et l'historique
type EquipmentAlarm = {
  id: string;
  equipmentId: string;
  variableName: string;
  message: string;
  priority: 'Info' | 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
  timestamp: string;
  acknowledged: boolean;
  workOrderId?: string;
};

type StatusHistoryEntry = {
  id: string;
  equipmentId: string;
  status: string;
  timestamp: string;
  updatedBy: string;
  durationMs?: number;
};

type AlarmHistoryEntry = {
  id: string;
  equipmentId: string;
  variableName: string;
  alarmText: string;
  priority: string;
  timestamp: string;
  clearedAt?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
};

// Par défaut, on évite le port 4000 (souvent occupé par Docker Desktop) et on utilise 4100
const API_URL = (import.meta as any).env?.VITE_GMAO_API || 'http://localhost:4100';
const API_BASE = API_URL.replace(/\/$/, '');
const WORK_ORDERS_STORAGE_KEY = 'gmao-workorders';
const TEAMS_STORAGE_KEY = 'gmao-teams';
const API_TIMEOUT_MS = 5000;
const LAST_API_OK_KEY = 'gmao-last-api-ok';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const FALLBACK_EQUIPMENTS: Equipment[] = [
  { id: 'eq-sample-1', name: 'Pompe principale', status: 'En ligne' },
  { id: 'eq-sample-2', name: 'Groupe froid', status: 'Hors ligne' },
];
const FALLBACK_LOCATIONS = [
  { id: 'loc-sample-1', name: 'General' },
  { id: 'loc-sample-2', name: 'Batiment A / RDC' },
];
const FALLBACK_SUPPLIERS: Supplier[] = [
  { id: 'sup-sample-1', name: 'Fournisseur local' },
  { id: 'sup-sample-2', name: 'Maintenance externe' },
];
const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-sample-1', name: 'Maintenance' },
  { id: 'cat-sample-2', name: 'Securite' },
];

const tabs = [
  { id: 'workorders', label: 'Bons de travail', icon: ClipboardList },
  { id: 'work', label: 'Formulaire BT', icon: ClipboardList },
  { id: 'pieces', label: 'Pièces', icon: Factory },
  { id: 'equipments', label: 'Équipements', icon: Factory },
  { id: 'suppliers', label: 'Fournisseurs', icon: Building2 },
  { id: 'categories', label: 'Catégories', icon: FolderPlus },
  { id: 'users', label: 'Utilisateurs', icon: User },
  { id: 'teams', label: 'Équipes', icon: User },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'automations', label: 'Automatisations', icon: RefreshCw },
];

interface GMAOWidgetProps {
  data?: any;
}
const GMAOWidget: React.FC<GMAOWidgetProps> = ({ data }) => {
  // Destructure data from hook
  const {
    apiStatus, apiError, workOrders, updateOrder, addOrder,
    equipments, suppliers, categories, users, locations,
    teams, teamMembers, teamEquipments, teamLocations,
    fetchData, createItem, orderStats = { total: 0, open: 0, closed: 0 },
    setEquipments, setLocations, setSuppliers, setCategories, setUsers, setTeams,
    setTeamMembers, setTeamEquipments, setTeamLocations
  } = data || {};

  const fetchWithTimeout = async (url: string, options?: RequestInit) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  const [localMessage, setLocalMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('workorders');
  const [ordersView, setOrdersView] = useState<'live' | 'history'>('live'); // 'live' for "À faire", 'history' for "Terminé"
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [showFullForm, setShowFullForm] = useState<boolean>(false);
  const [showEquipPicker, setShowEquipPicker] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteList, setInviteList] = useState<{ email: string; name: string }[]>([
    { email: '', name: '' },
    { email: '', name: '' },
    { email: '', name: '' },
  ]);
  const [equipSearch, setEquipSearch] = useState<string>('');
  const [selectedEquipIds, setSelectedEquipIds] = useState<string[]>([]);
  type StepKey = 'create' | 'assign' | 'addEquip' | 'addEquipToBT' | 'invite' | 'import';
  const stepConfig: { label: string; key: 'inscription' | StepKey }[] = [
    { label: 'Inscription complète', key: 'inscription' },
    { label: 'Créer un Bon de travail', key: 'create' },
    { label: 'Attribuer le Bon de travail', key: 'assign' },
    { label: 'Ajouter un équipement', key: 'addEquip' },
    { label: 'Ajouter l’équipement au Bon de travail', key: 'addEquipToBT' },
    { label: 'Inviter toute l’équipe', key: 'invite' },
    { label: 'Importation d’équipements', key: 'import' },
  ];

  const CATEGORY_ICONS = ['⚠️', '💡', '📋', '🔧', '♻️', '📦', '❄️', '🔒', '📄'];
  const CATEGORY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b', '#f97316'];
  const [stepDone, setStepDone] = useState<Record<StepKey, boolean>>({
    create: false,
    assign: false,
    addEquip: false,
    addEquipToBT: false,
    invite: false,
    import: false,
  });

  const AVAILABLE_CATEGORIES = ['Dommages', 'Préventif', 'Électrique', 'Plomberie', 'CVC', 'Sécurité', 'Nettoyage', 'Mécanique'];


  const [parts, setParts] = useState<Part[]>([{ id: 'p1', name: 'Pièce Test' }]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showNewPartModal, setShowNewPartModal] = useState<boolean>(false);
  const [partSearch, setPartSearch] = useState<string>('');
  const [newPart, setNewPart] = useState<Partial<Part>>({
    name: '',
    description: '',
    barcode: '',
    partType: '',
    locations: [{ zone: 'General', stock: 0, minStock: 1 }],
    equipments: [],
    teams: [],
    suppliers: [],
    files: [],
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState<boolean>(false);

  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#f59e0b');
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('manager');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [assignEquipId, setAssignEquipId] = useState('');
  const [assignLocId, setAssignLocId] = useState('');
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newEquipment, setNewEquipment] = useState({ name: '', status: 'online', description: '', location: '', criticality: 'Aucun', parentId: '', manufacturer: '', model: '' });
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<Equipment | null>(null);
  const [equipmentViewMode, setEquipmentViewMode] = useState<'split' | 'table'>('split');
  const [equipmentDetailTab, setEquipmentDetailTab] = useState<'details' | 'history'>('details');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [showManufacturerForm, setShowManufacturerForm] = useState(false);
  const [equipmentDetailDraft, setEquipmentDetailDraft] = useState({ manufacturer: '', model: '' });

  // Modal pour lier une variable à un équipement
  const [showLinkVariableModal, setShowLinkVariableModal] = useState(false);
  const [newVariableLink, setNewVariableLink] = useState({ variableId: '', variableName: '' });
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Alarmes simulées et historique de statuts
  const [equipmentAlarms, setEquipmentAlarms] = useState<EquipmentAlarm[]>([]);

  // Filtre de temps pour l'historique
  const [historyTimeRange, setHistoryTimeRange] = useState<'1H' | '1J' | '1S' | '1M' | '3M' | '6M' | '1A' | 'custom'>('1J');

  const filterByTime = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    switch (historyTimeRange) {
      case '1H': return diff <= 3600000;
      case '1J': return diff <= 86400000;
      case '1S': return diff <= 604800000;
      case '1M': return diff <= 2592000000;
      case '3M': return diff <= 7776000000;
      case '6M': return diff <= 15552000000;
      case '1A': return diff <= 31536000000;
      default: return true;
    }
  };

  // Initialiser les alarmes simulées avec les vrais IDs d'équipements
  useEffect(() => {
    if (equipments && equipments.length > 0 && equipmentAlarms.length === 0) {
      const firstEqId = equipments[0]?.id;
      const secondEqId = equipments[1]?.id || firstEqId;
      setEquipmentAlarms([
        { id: 'alarm-1', equipmentId: firstEqId, variableName: 'Temp_Retour', message: 'Température retour trop élevée (>35°C)', priority: 'Haute', timestamp: new Date().toISOString(), acknowledged: false },
        { id: 'alarm-2', equipmentId: firstEqId, variableName: 'Pression_HP', message: 'Pression haute anormale', priority: 'Critique', timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: false },
        { id: 'alarm-3', equipmentId: secondEqId, variableName: 'Niveau_Huile', message: 'Niveau huile bas', priority: 'Moyenne', timestamp: new Date(Date.now() - 7200000).toISOString(), acknowledged: true },
      ]);
    }
  }, [equipments]);

  // Variables liées aux équipements (synchronisé depuis localStorage)
  const [linkedVariables, setLinkedVariables] = useState<{ variableId: string; variableName: string; equipmentId: string; alarmText?: string; priority?: string }[]>([]);

  // Alarmes actives depuis la console (synchronisé depuis localStorage)
  const [activeAlarms, setActiveAlarms] = useState<{ id: string; equipmentId: string; variableName: string; alarmText: string; priority: string; state: string; timestamp: string }[]>([]);

  // Écouter les changements de liens depuis l'Extension Alarme via localStorage
  useEffect(() => {
    const loadLinkedVariables = () => {
      const stored = localStorage.getItem('gmao_linked_variables');
      if (stored) {
        try {
          setLinkedVariables(JSON.parse(stored));
        } catch { }
      }
    };

    // Charger les alarmes actives depuis la console
    const loadActiveAlarms = () => {
      const stored = localStorage.getItem('gmao_active_alarms');
      if (stored) {
        try {
          setActiveAlarms(JSON.parse(stored));
        } catch { }
      }
    };

    // Charger l'historique des alarmes depuis la console
    const loadAlarmHistory = () => {
      const stored = localStorage.getItem('gmao_alarm_history');
      if (stored) {
        try {
          const rawHistory: any[] = JSON.parse(stored);
          const formattedHistory: AlarmHistoryEntry[] = rawHistory.map(h => ({
            id: h.id + '_' + h.time, // ID unique combiné
            equipmentId: h.linkedEquipmentId,
            variableName: h.source || 'Inconnu',
            alarmText: h.msg || 'Sans message',
            priority: String(h.pri || '3'),
            timestamp: h.time,
            acknowledged: false
          })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAlarmHistory(formattedHistory);
        } catch { }
      }
    };

    loadLinkedVariables();
    loadActiveAlarms();
    loadAlarmHistory();

    // Écouter les événements storage pour les mises à jour cross-tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gmao_linked_variables') loadLinkedVariables();
      if (e.key === 'gmao_active_alarms') loadActiveAlarms();
      if (e.key === 'gmao_alarm_history') loadAlarmHistory();
    };
    window.addEventListener('storage', handleStorage);

    // Polling pour les mises à jour dans le même onglet (localStorage ne déclenche pas storage event dans le même tab)
    const interval = setInterval(() => {
      loadLinkedVariables();
      loadActiveAlarms();
      loadAlarmHistory();
    }, 1000); // 1 seconde pour une mise à jour plus réactive

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedEquipmentItem) {
      setEquipmentDetailDraft({
        manufacturer: selectedEquipmentItem.manufacturer || '',
        model: selectedEquipmentItem.model || '',
      });
      setShowManufacturerForm(false);
    }
  }, [selectedEquipmentItem?.id]);

  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);

  // Historique des alarmes (simulé, sera alimenté par les alarmes réelles)
  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryEntry[]>([]);

  // Initialiser l'historique de statuts avec les vrais IDs d'équipements
  useEffect(() => {
    if (equipments && equipments.length > 0 && statusHistory.length === 0) {
      const firstEqId = equipments[0]?.id;
      setStatusHistory([
        { id: 'sh-1', equipmentId: firstEqId, status: 'online', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), updatedBy: 'Système', durationMs: 86400000 * 4 },
        { id: 'sh-2', equipmentId: firstEqId, status: 'offline', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), updatedBy: 'Bensalem M.', durationMs: 86400000 },
      ]);
    }
  }, [equipments]);

  // Écouter les demandes de sélection d'équipement depuis la console alarme
  useEffect(() => {
    const checkForEquipmentSelection = () => {
      const equipmentIdToSelect = localStorage.getItem('gmao_select_equipment');
      if (equipmentIdToSelect && equipments && equipments.length > 0) {
        // Trouver l'équipement par ID
        const eq = equipments.find((e: Equipment) => e.id === equipmentIdToSelect);
        if (eq) {
          setSelectedEquipmentItem(eq);
          setEquipmentViewMode('split');
          setActiveTab('equipments'); // Aller à l'onglet équipements
        }
        // Nettoyer après utilisation
        localStorage.removeItem('gmao_select_equipment');
      }
    };

    checkForEquipmentSelection();

    // Écouter les événements storage pour les mises à jour cross-tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gmao_select_equipment') checkForEquipmentSelection();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [equipments]);

  const [newSupplier, setNewSupplier] = useState({ name: '', description: '', color: '#0088ff' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: '??', color: '#ef4444' });
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState<{ name: string; parent_id?: string; path?: string }>({ name: '' });
  const filteredEquipments = useMemo(
    () => equipments.filter(eq => eq.name.toLowerCase().includes(equipSearch.toLowerCase())),
    [equipments, equipSearch]
  );
  const assigneeOptions = useMemo(() => {
    const teamOpts = teams.map((t: any) => ({ label: `Equipe: ${t.name}`, value: `team:${t.id}` }));
    const userOpts = users.map((u) => ({ label: u.name, value: u.name }));
    return { teamOpts, userOpts };
  }, [teams, users]);
  const equipmentOptions = useMemo(
    () => equipments.map((eq) => ({
      value: eq.name,
      label: eq.status ? `${eq.name} (${eq.status})` : eq.name
    })),
    [equipments]
  );

  // Synchronize GMAO equipments to localStorage for cross-component access
  useEffect(() => {
    const eqList = equipments.map(eq => ({ id: eq.id, name: eq.name }));
    localStorage.setItem('gmao_equipments', JSON.stringify(eqList));
  }, [equipments]);

  const locationOptions = useMemo(() => locations.map(l => ({ value: l.name, label: l.name })), [locations]);
  const supplierOptions = useMemo(() => suppliers.map(s => ({ value: s.name, label: s.name })), [suppliers]);
  const allAssigneeOptions = useMemo(() => [...assigneeOptions.teamOpts, ...assigneeOptions.userOpts], [assigneeOptions]);

  const getEquipmentStatus = (name: string) => {
    const found = equipments.find(eq => eq.name === name);
    return found?.status || '';
  };

  const [form, setForm] = useState<WorkOrder>({
    id: '',
    status: 'Brouillon',
    title: '',
    description: '',
    location: '',
    equipment: '',
    equipmentStatus: '',
    procedure: '',
    assignee: '',
    hours: 1,
    minutes: 0,
    dueDate: '',
    startDate: '',
    recurrence: 'Ne se répète pas',
    workType: 'Réactive',
    priority: 'Aucun',
    categoryInput: '',
    files: [] as Attachment[],
    parts: '',
    supplier: '',
    categories: ['Dommages', 'Préventif'],
  });

  const sampleWorkOrder: WorkOrder = {
    title: 'Remplacer filtre CTA',
    description: 'Filtre F7 saturé, remplacer et noter le delta P.',
    location: 'Bâtiment A / Niv 1',
    equipment: 'CTA-01',
    equipmentStatus: 'En ligne',
    procedure: 'Procédure filtre CTA v2',
    assignee: 'Technicien CVC',
    hours: 2,
    minutes: 30,
    dueDate: '2025-12-15',
    startDate: '2025-12-10',
    recurrence: 'Mensuel',
    workType: 'Préventive',
    priority: 'Élevée',
    categoryInput: '',
    files: [] as Attachment[],
    parts: '',
    supplier: 'Maintenance CVC SA',
    categories: ['Préventif', 'CVC'],
    id: 'sample-1',
    status: 'Ouvert',
  };

  // Removed local baseOrders and workOrders memos in favor of props

  const ordersByView = useMemo(() => {
    const closedStatuses = ['Terminé', 'Clôturé'];
    const list = workOrders
      .map((o: WorkOrder) => ({
        ...o,
        closedAt: o.closedAt || (closedStatuses.includes(o.status) ? (o.closedAt || new Date().toISOString().slice(0, 10)) : undefined),

      }));

    let result = ordersView === 'history'
      ? list.filter((o: WorkOrder) => closedStatuses.includes(o.status))
      : list.filter((o: WorkOrder) => !closedStatuses.includes(o.status));

    // Apply Filters (Basic implementation)
    if (activeFilters.priority) {
      result = result.filter(o => o.priority === activeFilters.priority);
    }
    if (activeFilters.assignee) { // Example for "Assigné à"
      result = result.filter(o => o.assignee === activeFilters.assignee);
    }

    // Apply Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [workOrders, ordersView, sortConfig, activeFilters]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleFilter = (type: string, value: string) => {
    setActiveFilters(prev => {
      if (prev[type] === value) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: value };
    });
  };
  // Removed local orderStats memo


  // Removed local updateOrder


  const exportOrderPdf = (order: any) => {
    const html = `
      <html><head><title>Bon de travail ${order.id}</title>
      <style>body{font-family:Arial;padding:24px;} h1{margin-bottom:4px;} table{width:100%;border-collapse:collapse;margin-top:12px;} td{padding:6px;border:1px solid #ddd;} .pill{display:inline-block;padding:4px 8px;border-radius:12px;background:#e5f0ff;color:#1f3a93;font-size:12px;margin-left:6px;}</style>
      </head><body>
      <h1>${order.title || 'Bon de travail'}</h1>
      <div>ID ${order.id || '-'} <span class="pill">${order.status || ''}</span></div>
      <table>
        <tr><td>Type</td><td>${order.workType || ''}</td></tr>
        <tr><td>Priorité</td><td>${order.priority || ''}</td></tr>
        <tr><td>Assigné à</td><td>${order.assignee || ''}</td></tr>
        <tr><td>Équipement</td><td>${order.equipment || ''}</td></tr>
        <tr><td>Emplacement</td><td>${order.location || ''}</td></tr>
        <tr><td>Date d’échéance</td><td>${order.dueDate || ''}</td></tr>
        <tr><td>Durée estimée</td><td>${order.hours || 0} h ${order.minutes || 0} min</td></tr>
        <tr><td>Catégories</td><td>${(order.categories || []).join(', ')}</td></tr>
        <tr><td>Description</td><td>${order.description || ''}</td></tr>
      </table>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) w.focus();
  };

  const markStep = (key: StepKey) => {
    setStepDone((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const isStepDone = (key: 'inscription' | StepKey) => key === 'inscription' ? true : stepDone[key];
  const firstIncomplete = stepConfig.findIndex((s) => !isStepDone(s.key));
  const currentStepIndex = firstIncomplete === -1 ? stepConfig.length - 1 : firstIncomplete;
  const progressPercent = Math.round((stepConfig.filter(s => isStepDone(s.key)).length / stepConfig.length) * 100);

  // Removed persist functions


  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'assignee' && value) markStep('assign');
    if (field === 'equipment') {
      const eq = equipments.find(e => e.name === value);
      setForm((prev) => ({ ...prev, equipment: value, equipmentStatus: eq?.status || prev.equipmentStatus }));
      if (value) markStep('addEquip');
      return;
    }
  };

  const handleFilesUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming: Attachment[] = Array.from(files).map((file) => ({
      name: file.name,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setForm((prev) => {
      const existing = prev.files || [];
      const existingNames = new Set(existing.map((f) => f.name));
      const merged = [...existing];
      incoming.forEach((file) => {
        if (!existingNames.has(file.name)) merged.push(file);
      });
      return { ...prev, files: merged };
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name: string) => {
    setForm((prev) => {
      const remaining = (prev.files || []).filter((f) => {
        if (f.name === name && f.preview) URL.revokeObjectURL(f.preview);
        return f.name !== name;
      });
      return { ...prev, files: remaining };
    });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleEditOrder = () => {
    if (!selectedOrder) return;
    setForm({
      ...sampleWorkOrder, // defaults
      ...selectedOrder,
      id: selectedOrder.id,
      status: selectedOrder.status || 'Ouvert',
      categoryInput: '',
    });
    setShowFullForm(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.title.trim()) {
      setLocalMessage('Le titre est requis.');
      return;
    }

    // Check if updating
    if (form.id && updateOrder) {
      const updated = {
        ...form,
        updatedAt: new Date().toISOString().slice(0, 10),
        equipmentStatus: form.equipmentStatus || getEquipmentStatus(form.equipment || '') || 'inconnu',
      };
      updateOrder(form.id, updated);
      setSelectedOrder(updated); // Update detail view
      setLocalMessage('Bon de travail mis à jour.');
      setShowFullForm(false);
      return;
    }

    const newId = `#LOCAL-${(workOrders?.length || 0) + 1}`;
    const order = {
      ...form,
      id: newId,
      status: form.status || 'Brouillon',
      priority: form.priority,
      workType: form.workType,
      recurrence: form.recurrence,
      assignee: form.assignee || 'Non assigné',
      equipment: form.equipment || 'Non défini',
      equipmentStatus: form.equipmentStatus || getEquipmentStatus(form.equipment || '') || 'inconnu',
      location: form.location || 'Non défini',
      supplier: (form as any).supplier || '',
      parts: form.parts || '',
      categories: form.categories,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    if (addOrder) addOrder(order);

    setSelectedOrder(order);
    setShowDetail(true);
    setLocalMessage('Fiche enregistrée localement (simulation). Connecte l’API BT pour l’envoyer réellement.');
    markStep('create');
    if (order.assignee && order.assignee !== 'Non assigné') markStep('assign');
    if (order.equipment && order.equipment !== 'Non défini') markStep('addEquip');
    setShowFullForm(false);
  };

  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      setLocalMessage('Nom d\'emplacement requis');
      return;
    }
    const payload = {
      name: newLocation.name.trim(),
      parent_id: newLocation.parent_id || undefined,
      path: newLocation.path || newLocation.name.trim(),
    };
    await createItem('locations', payload);
    setNewLocation({ name: '' });
    setShowLocationModal(false);
  };

  const handleStepClick = (key: string) => {
    switch (key) {
      case 'workorders':
        setActiveTab('work');
        break;
      case 'addEquip':
        setShowEquipmentModal(true);
        break;
      case 'invite':
        setShowInviteModal(true);
        break;
      case 'import':
        // Assuming import logic or tab switch
        break;
      default:
        break;
    }
  };

  const handleCreateEquipment = async () => {
    if (!newEquipment.name.trim()) {
      setLocalMessage('Le nom de l’équipement est requis');
      return;
    }
    const payload = { ...newEquipment, status: newEquipment.status || 'online' };
    const saved = createItem ? await createItem('equipments', payload) : { ...payload, id: `local-${Date.now()}` };
    if (saved && setEquipments) {
      setEquipments((prev: Equipment[] = []) => {
        const exists = prev.find(e => e.id === saved.id || e.name === saved.name);
        if (exists) return prev;
        return [saved as Equipment, ...prev];
      });
    }
    setLocalMessage('Équipement créé');
    setNewEquipment({ name: '', status: 'online', description: '', location: '', criticality: 'Aucun', parentId: '', manufacturer: '', model: '' });
    setShowEquipmentModal(false);
  };

  const handleSaveManufacturer = async () => {
    if (!selectedEquipmentItem) return;
    const payload = {
      ...selectedEquipmentItem,
      manufacturer: equipmentDetailDraft.manufacturer.trim(),
      model: equipmentDetailDraft.model.trim(),
    };
    try {
      await fetchWithTimeout(`${API_URL}/api/equipments/${selectedEquipmentItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSelectedEquipmentItem(payload);
      setEquipments(prev => prev.map(eq => eq.id === payload.id ? payload : eq));
      setLocalMessage('Fabricant / modèle enregistrés');
      setShowManufacturerForm(false);
    } catch (e) {
      console.error(e);
      setLocalMessage('Impossible de sauvegarder (mode local?)');
      setSelectedEquipmentItem(payload);
      setEquipments(prev => prev.map(eq => eq.id === payload.id ? payload : eq));
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    await createItem('suppliers', newSupplier);
    setNewSupplier({ name: '', description: '', color: '#0088ff' });
    setShowSupplierModal(false);
  };

  const handleCreatePart = async () => {
    if (!newPart.name?.trim()) return;
    const created = await createItem('parts', newPart);
    setParts(prev => [...prev, { ...newPart, id: created?.id || `local-${Date.now()}` } as Part]);
    setNewPart({
      name: '',
      description: '',
      barcode: '',
      partType: '',
      locations: [{ zone: 'General', stock: 0, minStock: 1 }],
      equipments: [],
      teams: [],
      suppliers: [],
      files: [],
    });
    setShowPartModal(false);
  };

  const saveUser = async (payload: Partial<UserType> & { id?: string }) => {
    // This functionality usually requires specific endpoints not generic createItem
    // Use manual fetch or adapt createItem? 
    // Creating user via API:
    try {
      const method = payload.id ? 'PUT' : 'POST';
      const url = payload.id ? `${API_URL}/api/users/${payload.id}` : `${API_URL}/api/users`;
      // Reuse logic manually since we lost the internal function
      // Or perhaps we should add saveUser to the hook?
      // For now, let's just use fetch if available (Wait, we removed fetchWithTimeout)
      // We can expose fetchWithTimeout or duplicate it.
      // It's cleaner to skip advanced user mgmt for now or mock it if strictly needed.
      // I'll leave a stub or use createItem for creation.

      if (!payload.id) {
        await createItem('users', payload);
      }
      setShowUserModal(false);
      setEditingUser(null);
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id: string) => {
    // Stub
  };


  const renderStatusBadge = () => {
    if (apiStatus === 'loading') return (
      <span className="text-blue-600 flex items-center gap-1 text-sm"><RefreshCw size={14} className="animate-spin" /> Chargement API…</span>
    );
    if (apiStatus === 'ok') return (
      <span className="text-green-600 flex items-center gap-1 text-sm"><Server size={14} /> API OK</span>
    );
    if (apiStatus === 'offline') return (
      <span className="text-gray-600 flex items-center gap-1 text-sm"><Server size={14} /> API indisponible (mode local)</span>
    );
    if (apiStatus === 'error') return (
      <span className="text-red-600 flex items-center gap-1 text-sm"><AlertTriangle size={14} /> API KO</span>
    );
    return null;
  };



  const renderAttachments = () => {
    if (!form.files?.length) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {form.files.map((file) => (
          <div key={file.name} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            {file.preview ? (
              <img src={file.preview} alt={file.name} className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-white border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <UploadCloud size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{file.name}</div>
            </div>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => removeFile(file.name)}
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'workorders':
        return (
          <div className="flex flex-col h-full overflow-hidden space-y-4">
            {/* Tabs & Top Actions */}
            <div className="flex flex-col space-y-4 shrink-0">
              <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setOrdersView('live')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ordersView === 'live'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  À faire
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ordersView === 'live' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                    {orderStats.open}
                  </span>
                </button>
                <button
                  onClick={() => setOrdersView('history')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ordersView === 'history'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  Terminé
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ordersView === 'history' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                    {orderStats.closed}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {renderAttachments()}
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={fetchData}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 shadow-sm flex items-center gap-2"
                    onClick={() => setActiveTab('work')}
                  >
                    <Plus size={16} /> Nouveau Bon de travail
                  </button>
                </div>
              </div>
            </div>

            {/* FILTER BAR & VIEW TOGGLE */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="h-6 w-px bg-gray-300 mx-2" />
              <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'split' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutList size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <TableIcon size={16} />
                </button>
              </div>

              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1 ${activeFilters.assignee ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                onClick={() => toggleFilter('assignee', 'Technicien CVC')} // Dummy toggle for demo
              >
                Assigné à <span className="text-blue-400">▼</span>
              </button>
              <button className="px-3 py-1.5 rounded-full bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
                Date d'échéance <span className="text-gray-400">▼</span>
              </button>
              <button className="px-3 py-1.5 rounded-full bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
                Emplacement <span className="text-gray-400">▼</span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1 ${activeFilters.priority ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200'}`}
                onClick={() => toggleFilter('priority', 'Élevée')} // Dummy toggle for demo
              >
                Priorité <span className="text-gray-400">▼</span>
              </button>
              <button className="px-3 py-1.5 rounded-full text-blue-600 text-sm font-medium hover:bg-blue-50 flex items-center gap-1">
                + Ajouter un filtre
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button className="text-sm text-blue-600 font-medium flex items-center gap-1">
                  <Share2 size={14} /> Mes filtres
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {/* CONTENT AREA */}
            {viewMode === 'table' ? (
              /* TABLE VIEW */
              <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                        <div className="flex items-center gap-1">Titre {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('priority')}>
                        <div className="flex items-center gap-1">Priorité {sortConfig?.key === 'priority' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">Statut {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('workType')}>
                        <div className="flex items-center gap-1">Type {sortConfig?.key === 'workType' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('assignee')}>
                        <div className="flex items-center gap-1">Assigné à {sortConfig?.key === 'assignee' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('equipment')}>
                        <div className="flex items-center gap-1">Équipement {sortConfig?.key === 'equipment' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location')}>
                        <div className="flex items-center gap-1">Emplacement {sortConfig?.key === 'location' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center gap-1">Créé le {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                      <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')}>
                        <div className="flex items-center gap-1">Échéance {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ordersByView.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => { setSelectedOrder(order); setViewMode('split'); }}>
                        <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" onClick={e => e.stopPropagation()} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold ring-2 ring-white">
                              {(order.assignee || 'NA').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600">{order.title}</div>
                              <div className="text-xs text-gray-500">{order.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {order.priority === 'Élevée' ? (
                            <span className="text-red-600 flex items-center gap-1 text-xs font-medium"><AlertTriangle size={12} /> Élevée</span>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${order.status === 'Ouvert' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            order.status === 'Terminé' ? 'bg-green-50 text-green-700 border-green-200' :
                              order.status === 'En cours' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{order.workType}</td>
                        <td className="px-4 py-3 text-gray-600">{order.assignee}</td>
                        <td className="px-4 py-3 text-gray-600">{order.equipment || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{order.location || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{order.createdAt}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.dueDate ? (
                            <span className={new Date(order.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-600'}>
                              {order.dueDate}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                    {!ordersByView.length && (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Aucun bon de travail trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* SPLIT VIEW (Master-Detail) */
              <div className="flex flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* LEFT LIST */}
                <div className="w-1/3 min-w-[350px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 shrink-0">
                    <div className="flex items-center gap-1">
                      <span>Trier par :</span>
                      <select className="bg-transparent font-medium text-gray-700 dark:text-gray-300 outline-none">
                        <option>Priorité: Le plus élevé en premier</option>
                        <option>Date: Le plus récent</option>
                      </select>
                    </div>
                    <button className="p-1 hover:bg-gray-200 rounded" title="Imprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {/* Group: Attribué à moi */}
                    <div>
                      <button className="w-full px-4 py-2 text-left text-xs font-bold text-blue-600 uppercase bg-gray-50 flex items-center justify-between hover:bg-gray-100">
                        <span>Attribué à moi ({ordersByView.length})</span>
                        <ChevronDown size={14} />
                      </button>
                      <div>
                        {ordersByView.map(order => (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`cursor-pointer border-l-4 p-4 hover:bg-white dark:hover:bg-gray-800 transition-colors border-b border-gray-100 relative group ${selectedOrder?.id === order.id ? 'bg-white dark:bg-gray-800 border-l-blue-600 shadow-sm' : 'border-l-transparent'
                              }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                <User size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`text-sm font-semibold truncate ${selectedOrder?.id === order.id ? 'text-blue-600' : 'text-gray-900 dark:text-white'}`}>
                                    {order.title}
                                  </h4>
                                  <span className="text-xs font-mono text-gray-400">{order.id}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Demandé par {order.assignee}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${order.status === 'Ouvert' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    order.status === 'En cours' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      order.status === 'Terminé' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                    {order.status}
                                  </span>
                                  {order.priority === 'Élevée' && (
                                    <span className="text-[10px] text-red-500 flex items-center gap-1">
                                      <AlertTriangle size={10} /> Priorité élevée
                                    </span>
                                  )}
                                </div>
                              </div>
                              {order.status === 'Ouvert' && <div className="w-2 h-2 rounded-full bg-blue-500 absolute top-4 right-4" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group: Créé par moi */}
                    <div className="mt-2">
                      <button className="w-full px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase bg-gray-50 flex items-center justify-between hover:bg-gray-100">
                        <span>Créé par moi (1)</span>
                        <ChevronDown size={14} />
                      </button>
                      {/* Mock item for "Created by me" */}
                      <div className="p-4 border-l-4 border-gray-200 opacity-60">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                            JD
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-800">Panne ascenseur</h4>
                            <p className="text-xs text-gray-500">Demandé par John Doe</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT DETAIL PANEL */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                  {selectedOrder ? (
                    <div className="p-8 max-w-4xl mx-auto">

                      {/* Header */}
                      < div className="flex items-start justify-between mb-6" >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{selectedOrder.title}</h2>
                            <button className="text-gray-400 hover:text-blue-600"><LinkIcon size={16} /></button>
                          </div>
                          <p className="text-xs text-gray-500">Créé le {selectedOrder.createdAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex items-center gap-2">
                            <MessageSquare size={16} /> Commentaires
                          </button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                            onClick={handleEditOrder}>
                            <Pencil size={16} /> Modifier
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Status Bar */}
                      < div className="mb-8" >
                        <h4 className="text-sm font-medium text-gray-500 mb-3">État</h4>
                        <div className="flex gap-1">
                          {['Ouvert', 'En attente', 'En cours', 'Terminé'].map((status) => {
                            const isActive = selectedOrder.status === status;
                            let activeClass = 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200';
                            if (isActive) {
                              if (status === 'Ouvert') activeClass = 'bg-blue-50 text-blue-600 border-blue-200 font-bold';
                              if (status === 'En attente') activeClass = 'bg-orange-50 text-orange-600 border-orange-200 font-bold';
                              if (status === 'En cours') activeClass = 'bg-purple-50 text-purple-600 border-purple-200 font-bold';
                              if (status === 'Terminé') activeClass = 'bg-green-50 text-green-600 border-green-200 font-bold';
                            }
                            // Icons mapping
                            const icons: any = { 'Ouvert': Lock, 'En attente': PauseCircle, 'En cours': RefreshCw, 'Terminé': CheckCircle2 };
                            const Icon = icons[status] || Circle;

                            return (
                              <div key={status} className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg border ${activeClass} transition-all cursor-pointer`}
                                onClick={() => {
                                  // Mise à jour locale immédiate pour le feedback visuel
                                  setSelectedOrder({ ...selectedOrder, status });
                                  // Mise à jour dans le store/API
                                  if (updateOrder) updateOrder(selectedOrder.id, { status });
                                }}>
                                <Icon size={20} className="mb-1" />
                                <span className="text-xs">{status}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            <Share2 size={14} /> Partager en externe
                          </button>
                        </div>
                      </div >

                      <hr className="border-gray-100 my-6" />

                      {/* ID Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">ID du Bon de travail</h4>
                        <p className="text-sm text-gray-600 font-mono">{selectedOrder.id}</p>
                      </div>

                      {/* Assignee Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Assigné à</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {(selectedOrder.assignee || 'NA').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-blue-600 font-medium">{selectedOrder.assignee}</span>
                        </div>
                      </div>

                      <hr className="border-gray-100 my-6" />

                      {/* Description Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Descriptif</h4>
                        <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-lg border border-gray-100">
                          {selectedOrder.description || "Aucune description fournie."}
                        </p>
                      </div>

                      {/* Two Col Info */}
                      <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Équipement</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Package size={16} className="text-gray-400" />
                            <span>{selectedOrder.equipment || 'Non défini'}</span>
                          </div>
                          {selectedOrder.equipmentStatus && (
                            <div className="mt-2 ml-6 text-xs bg-green-50 text-green-700 inline-block px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {selectedOrder.equipmentStatus}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Emplacement</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin size={16} className="text-gray-400" />
                            <span>{selectedOrder.location || 'Non défini'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Durée estimée</h4>
                          <p className="text-sm text-gray-600">{selectedOrder.hours || 0}h {selectedOrder.minutes || 0}min</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Type de travail</h4>
                          <p className="text-sm text-gray-600">{selectedOrder.workType}</p>
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="mb-8">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Catégories</h4>
                        <div className="flex flex-col gap-1">
                          {selectedOrder.categories?.map((cat: string) => (
                            <div key={cat} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="text-orange-400">⚡</span>
                              <span>{cat}</span>
                            </div>
                          ))}
                          {!selectedOrder.categories?.length && <span className="text-sm text-gray-400">Aucune catégorie</span>}
                        </div>
                      </div>

                      <hr className="border-gray-100 my-8" />

                      {/* Footer / Tabs */}
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Suivi du temps et des coûts</h3>
                        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                          <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium">Pièces</span>
                            <button className="text-sm text-blue-600 hover:underline">Ajouter &gt;</button>
                          </div>
                          <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium">Temps</span>
                            <button className="text-sm text-blue-600 hover:underline">Ajouter &gt;</button>
                          </div>
                          <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium">Autres coûts</span>
                            <button className="text-sm text-blue-600 hover:underline">Ajouter &gt;</button>
                          </div>
                        </div>
                      </div>

                      {/* Comments Section Match */}
                      <div className="mb-8">
                        <div className="text-xs text-gray-400 mb-1">Créé par {selectedOrder.assignee || 'User'} le {selectedOrder.createdAt}, 21:48</div>
                        <div className="text-xs text-gray-400 mb-6">Dernière mise à jour le 02/12/2025, 21:49</div>

                        <h3 className="text-lg font-bold text-gray-900 mb-4">Commentaires</h3>
                        <div className="relative">
                          <textarea
                            className="w-full border border-gray-200 rounded-lg p-4 text-sm h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder="Écrivez un commentaire..."
                          />
                          <div className="absolute bottom-2 right-2 flex items-center gap-2">
                            <button className="p-1 text-gray-400 hover:text-blue-600"><Paperclip size={14} /></button>
                            <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50">Envoyer</button>
                          </div>
                        </div>
                      </div>

                    </div >
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <ClipboardList size={64} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">Sélectionnez un bon de travail</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'work':
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Que faut-il faire ? (Requis)</label>
                <input className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Titre du bon de travail" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Récurrence</label>
                  <select className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.recurrence} onChange={e => handleChange('recurrence', e.target.value)}>
                    {['Ne se répète pas', 'Hebdomadaire', 'Mensuel', 'Annuel'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Type de travail</label>
                  <select className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.workType} onChange={e => handleChange('workType', e.target.value)}>
                    {['Réactive', 'Préventive', 'Projet'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Descriptif</label>
                <textarea className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" rows={3} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Ajouter une description" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <SearchableSelect
                  label="Emplacement"
                  placeholder="Commencz à taper..."
                  options={locationOptions}
                  value={form.location}
                  onChange={(v) => handleChange('location', v)}
                  onAddNew={() => setShowLocationModal(true)}
                  addNewLabel="Créer un emplacement"
                />
                <SearchableSelect
                  label="Équipement"
                  placeholder="Commencz à taper ou sélectionnez"
                  options={equipmentOptions}
                  value={form.equipment}
                  onChange={(v) => handleChange('equipment', v)}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <SearchableSelect
                    label="Attribuer à"
                    placeholder="Sélectionner ou taper..."
                    options={allAssigneeOptions}
                    value={form.assignee}
                    onChange={(v) => handleChange('assignee', v)}
                    onAddNew={() => setShowInviteModal(true)}
                    addNewLabel="Inviter un membre"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Date d’échéance</label>
                  <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.dueDate} onChange={e => handleChange('dueDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Date de début</label>
                  <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {['Aucun', 'Faible', 'Moyenne', 'Élevée'].map(level => (
                  <button key={level} onClick={() => handleChange('priority', level)} type="button" className={`flex-1 rounded-full px-4 py-2 border ${form.priority === level ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {level}
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Fichiers</label>
                  <div className="flex items-center gap-2 text-blue-600 text-sm mt-1">
                    <button type="button" className="flex items-center gap-2 hover:underline" onClick={openFilePicker}><UploadCloud size={16} /> Joindre des fichiers</button>
                  </div>
                  {renderAttachments()}
                </div>
                <div>
                  <SearchableSelect
                    label="Pièces"
                    placeholder="Sélectionner..."
                    options={parts.map(p => ({ value: p.name, label: p.name }))}
                    value={form.parts}
                    onChange={(v) => handleChange('parts', v)}
                    addNewLabel="Ajouter une pièce"
                    onAddNew={() => setShowPartModal(true)}
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Fournisseurs"
                    placeholder="Sélectionner..."
                    options={supplierOptions}
                    value={(form as any).supplier || ''}
                    onChange={(v) => handleChange('supplier', v)}
                    addNewLabel="Ajouter un fournisseur"
                    onAddNew={() => setShowSupplierModal(true)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.categories.map(cat => (
                    <span key={cat} className="px-3 py-1 text-sm rounded-full bg-gray-100 border border-gray-200 flex items-center gap-2">
                      {cat}
                      <span role="button" className="cursor-pointer text-gray-500" onClick={() => handleChange('categories', form.categories.filter(c => c !== cat))}>×</span>
                    </span>
                  ))}
                </div>
                <div>
                  <SearchableSelect
                    placeholder="Ajouter une catégorie..."
                    options={AVAILABLE_CATEGORIES.map(c => ({ value: c, label: c }))}
                    value=""
                    onChange={(v) => {
                      if (v && !form.categories.includes(v)) {
                        handleChange('categories', [...form.categories, v]);
                      }
                    }}
                    addNewLabel="Ajouter une catégorie"
                    onAddNew={() => setShowNewCategoryModal(true)}
                  />
                </div>
              </div>
              <div className="flex justify-center">
                <button onClick={handleSubmit} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">Créer</button>
              </div>
            </div>
          </div>
        );
      case 'pieces':
        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Commencez à ajouter des pièces</h3>
              <p className="text-sm text-gray-600">Cliquez sur “Créer” après avoir saisi les informations.</p>
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-400">
                  <div className="text-6xl">⚙️</div>
                  <div className="mt-2">Inventaire de pièces</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold">Nouvelle Pièce</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom de la Pièce (Requis)</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.name || ''} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Coût unitaire</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" type="number" min={0} value={(newPart as any).unitCost || ''} onChange={e => setNewPart(p => ({ ...p, unitCost: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Descriptif</label>
                  <textarea className="w-full mt-1 rounded-lg border px-3 py-2" rows={3} value={newPart.description || ''} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">QR code / code-barres</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.barcode || ''} onChange={e => setNewPart(p => ({ ...p, barcode: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Type de Pièce</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.partType || ''} onChange={e => setNewPart(p => ({ ...p, partType: e.target.value }))} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Emplacement</label>
                    <select className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.locations?.[0]?.zone || ''} onChange={e => setNewPart(p => ({ ...p, locations: [{ ...(p.locations?.[0] || { stock: 0, minStock: 1 }), zone: e.target.value }] }))}>
                      <option value="">Sélectionner...</option>
                      {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Stock</label>
                    <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.locations?.[0]?.stock ?? 0} onChange={e => setNewPart(p => ({ ...p, locations: [{ ...(p.locations?.[0] || { zone: '', minStock: 1 }), stock: Number(e.target.value) }] }))} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Min</label>
                    <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.locations?.[0]?.minStock ?? 1} onChange={e => setNewPart(p => ({ ...p, locations: [{ ...(p.locations?.[0] || { zone: '', stock: 0 }), minStock: Number(e.target.value) }] }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Équipements</label>
                  <select className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.equipments?.[0] || ''} onChange={e => setNewPart(p => ({ ...p, equipments: e.target.value ? [e.target.value] : [] }))}>
                    <option value="">Commencez à taper...</option>
                    {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button className="px-4 py-2 rounded-lg border" onClick={() => setNewPart({ name: '', description: '', barcode: '', partType: '', locations: [{ zone: '', stock: 0, minStock: 1 }], equipments: [], teams: [], suppliers: [], files: [] })}>Annuler</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => {
                  if (!newPart.name) { setLocalMessage('Nom de pièce requis'); return; }
                  setParts(prev => [{ ...newPart, id: `part-${Date.now()}` } as any, ...prev]);
                  setLocalMessage('Pièce créée (simulation locale)');
                }}>Créer</button>
              </div>
            </div>
          </div>
        );
      case 'equipments':
        const getStatusLabel = (status?: string) => {
          if (status === 'online') return 'En ligne';
          if (status === 'offline') return 'Hors ligne';
          return 'Ne pas suivre';
        };
        const getStatusColor = (status?: string) => {
          if (status === 'online') return 'bg-green-500';
          if (status === 'offline') return 'bg-red-500';
          return 'bg-gray-400';
        };
        const linkedWorkOrders = selectedEquipmentItem
          ? workOrders.filter(wo => wo.equipment === selectedEquipmentItem.name)
          : [];
        const subEquipments = selectedEquipmentItem
          ? equipments.filter(eq => eq.parentId === selectedEquipmentItem.id)
          : [];

        return (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-lg font-semibold">Équipements</h3>
              <div className="flex items-center gap-2">
                {/* Toggle Vue */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setEquipmentViewMode('split')}
                    className={`p-1.5 rounded-md transition-all ${equipmentViewMode === 'split' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <LayoutList size={16} />
                  </button>
                  <button
                    onClick={() => setEquipmentViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${equipmentViewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <TableIcon size={16} />
                  </button>
                </div>
                <button
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2"
                  onClick={() => setShowEquipmentModal(true)}
                >
                  <Plus size={14} /> Nouvel Équipement
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-2">
              <span className="text-sm text-gray-500">Trier par :</span>
              <button className="text-sm text-blue-600 hover:underline">Nom: Ordre croissant ▼</button>
              <div className="h-4 w-px bg-gray-300 mx-2" />
              <button className="px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-gray-50">Criticité</button>
              <button className="px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-gray-50">Statut</button>
              <button className="px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-gray-50">Types d'Équipement</button>
              <button className="px-2 py-1 rounded-full text-xs border border-gray-200 hover:bg-gray-50">Emplacement</button>
              <button className="px-2 py-1 rounded-full text-xs text-blue-600 hover:underline">+ Ajouter un filtre</button>
              <div className="ml-auto">
                <button className="text-sm text-blue-600 hover:underline">Mes filtres</button>
              </div>
            </div>

            {equipmentViewMode === 'table' ? (
              /* TABLE VIEW */
              <div className="flex-1 overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-left">Emplacement</th>
                      <th className="px-3 py-2 text-left">Criticité</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map(eq => (
                      <tr key={eq.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedEquipmentItem(eq); setEquipmentViewMode('split'); }}>
                        <td className="px-3 py-2 font-semibold">{eq.name}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${eq.status === 'online' ? 'bg-green-100 text-green-700' : eq.status === 'offline' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(eq.status)}`} />
                            {getStatusLabel(eq.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2">{eq.location || 'General'}</td>
                        <td className="px-3 py-2">{eq.criticality || 'Aucun'}</td>
                        <td className="px-3 py-2 text-gray-500">{eq.description || '-'}</td>
                        <td className="px-3 py-2">
                          <button className="text-blue-600 text-xs mr-2 hover:underline" onClick={(e) => { e.stopPropagation(); setEditingEquipment(eq); setShowEquipmentModal(true); }}>Modifier</button>
                          <button className="text-red-600 text-xs hover:underline" onClick={(e) => { e.stopPropagation(); setEquipments(prev => prev.filter(x => x.id !== eq.id)); }}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                    {!equipments.length && <tr><td className="px-3 py-4 text-gray-500" colSpan={6}>Aucun équipement</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              /* SPLIT VIEW */
              <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel - List */}
                <div className="w-80 shrink-0 flex flex-col overflow-hidden border rounded-xl bg-white">
                  <div className="flex-1 overflow-y-auto divide-y">
                    {equipments.map(eq => {
                      const alarmCount = equipmentAlarms.filter(a => a.equipmentId === eq.id && !a.acknowledged).length;
                      return (
                        <button
                          key={eq.id}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${selectedEquipmentItem?.id === eq.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                          onClick={() => setSelectedEquipmentItem(eq)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 relative">
                              <Server size={16} />
                              {alarmCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                  {alarmCount}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{eq.name}</div>
                              <div className="text-xs text-gray-500">{eq.location || 'General'}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${eq.status === 'online' ? 'bg-green-100 text-green-700' : eq.status === 'offline' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(eq.status)}`} />
                            {getStatusLabel(eq.status)}
                          </span>
                        </button>
                      );
                    })}
                    {!equipments.length && <div className="p-4 text-gray-500 text-sm">Aucun équipement</div>}
                  </div>
                </div>

                {/* Right Panel - Detail */}
                <div className="flex-1 overflow-y-auto bg-white rounded-xl border p-6">
                  {selectedEquipmentItem ? (
                    <>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">{selectedEquipmentItem.name}</h2>
                          <button className="text-gray-400 hover:text-blue-600"><LinkIcon size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                            onClick={() => { setEditingEquipment(selectedEquipmentItem); setShowEquipmentModal(true); }}
                          >
                            <Pencil size={14} /> Modifier
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b mb-6">
                        <button
                          onClick={() => setEquipmentDetailTab('details')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${equipmentDetailTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                          Détails
                        </button>
                        <button
                          onClick={() => setEquipmentDetailTab('history')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${equipmentDetailTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                          Historique
                        </button>
                      </div>

                      {equipmentDetailTab === 'details' ? (
                        <div className="space-y-6">
                          {/* État */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-500">État</h4>
                              <button className="text-sm text-blue-600 hover:underline" onClick={() => setEquipmentDetailTab('history')}>Voir plus &gt;</button>
                            </div>
                            <select
                              className="w-48 rounded-lg border px-3 py-2 text-sm"
                              value={selectedEquipmentItem.status || 'online'}
                              onChange={(e) => {
                                const updated = { ...selectedEquipmentItem, status: e.target.value };
                                setSelectedEquipmentItem(updated);
                                setEquipments(prev => prev.map(eq => eq.id === updated.id ? updated : eq));
                              }}
                            >
                              <option value="online">● En ligne</option>
                              <option value="offline">● Hors ligne</option>
                              <option value="ignore">● Ne pas suivre</option>
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : {selectedEquipmentItem.updatedAt || 'N/A'}</p>
                          </div>

                          <hr />

                          {/* Descriptif */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Descriptif</h4>
                            <p className="text-sm text-gray-600">{selectedEquipmentItem.description || 'Aucune description'}</p>
                          </div>

                          {/* Info Box */}
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="text-blue-500 mt-0.5">i</div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">Fabricant et modele</p>
                                    <p className="text-xs text-gray-600">Utile pour recommander procedures, pieces, manuels.</p>
                                  </div>
                                  {!showManufacturerForm && (
                                    <button className="px-3 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-100" onClick={() => setShowManufacturerForm(true)}>
                                      {selectedEquipmentItem.manufacturer || selectedEquipmentItem.model ? 'Modifier' : 'Ajouter'}
                                    </button>
                                  )}
                                </div>
                                {!showManufacturerForm && (
                                  <div className="text-sm text-gray-700">
                                    <div><span className="font-medium">Fabricant:</span> {selectedEquipmentItem.manufacturer || 'Non renseigne'}</div>
                                    <div><span className="font-medium">Modele:</span> {selectedEquipmentItem.model || 'Non renseigne'}</div>
                                  </div>
                                )}
                                {showManufacturerForm && (
                                  <div className="space-y-2">
                                    <input className="w-full rounded-lg border px-3 py-2" placeholder="Fabricant" value={equipmentDetailDraft.manufacturer} onChange={e => setEquipmentDetailDraft(p => ({ ...p, manufacturer: e.target.value }))} />
                                    <input className="w-full rounded-lg border px-3 py-2" placeholder="Modele" value={equipmentDetailDraft.model} onChange={e => setEquipmentDetailDraft(p => ({ ...p, model: e.target.value }))} />
                                    <div className="flex gap-2">
                                      <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSaveManufacturer}>Enregistrer</button>
                                      <button className="px-3 py-1 text-xs border rounded" onClick={() => { setShowManufacturerForm(false); setEquipmentDetailDraft({ manufacturer: selectedEquipmentItem.manufacturer || '', model: selectedEquipmentItem.model || '' }); }}>Annuler</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <hr />

                          {/* Emplacement */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Emplacement</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              <span>{selectedEquipmentItem.location || 'General'}</span>
                            </div>
                          </div>

                          <hr />

                          {/* Criticité */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Criticité</h4>
                            <p className="text-sm text-gray-600">{selectedEquipmentItem.criticality || 'Aucun'}</p>
                          </div>

                          <hr />

                          {/* Sous-Équipements */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Sous-Équipements ({subEquipments.length})</h4>
                            <p className="text-sm text-gray-500">Ajoutez des sous-éléments à l'intérieur de cette Équipement</p>
                            {subEquipments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {subEquipments.map(sub => (
                                  <div key={sub.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                                    <Server size={12} />
                                    <span>{sub.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button className="text-sm text-blue-600 hover:underline mt-2">Créer sous-Équipement</button>
                          </div>

                          <hr />

                          {/* Automatisation */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Automatisation (0)</h4>
                            <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-500">
                              ⊕ Ajouter un Compteur à cet Équipement pour activer les automatisations.
                            </div>
                            <button className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1">
                              <Plus size={12} /> Créer un Compteur
                            </button>
                          </div>

                          <hr />

                          {/* Alarmes et Variables liées */}
                          {(() => {
                            // Variables liées depuis l'Extension Alarme
                            const eqLinkedVars = linkedVariables.filter(v => v.equipmentId === selectedEquipmentItem.id);
                            // Alarmes actives pour cet équipement (depuis la console)
                            const eqActiveAlarms = activeAlarms.filter(a => a.equipmentId === selectedEquipmentItem.id);
                            const activeCount = eqActiveAlarms.length;
                            const linkedCount = eqLinkedVars.length;

                            return (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    Alarmes & Variables liées
                                    {activeCount > 0 && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold animate-pulse">
                                        {activeCount} active{activeCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {linkedCount > 0 && activeCount === 0 && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                                        {linkedCount} liée{linkedCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </h4>
                                  <button
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={() => {
                                      setNewVariableLink({ variableId: '', variableName: '' });
                                      setShowLinkVariableModal(true);
                                    }}
                                  >+ Lier une variable</button>
                                </div>

                                {/* Zone de glisser-déposer */}
                                <div
                                  className={`mb-3 p-4 rounded-lg border-2 border-dashed transition-all ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDraggingOver(true);
                                  }}
                                  onDragLeave={() => setIsDraggingOver(false)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingOver(false);
                                    // Essayer de récupérer les données du drag
                                    const textData = e.dataTransfer.getData('text/plain');
                                    const jsonData = e.dataTransfer.getData('application/json');

                                    let variableId = '';
                                    let variableName = '';

                                    if (jsonData) {
                                      try {
                                        const data = JSON.parse(jsonData);
                                        variableId = data.id || data.variableId || '';
                                        variableName = data.label || data.name || data.variableName || variableId;
                                      } catch { }
                                    } else if (textData) {
                                      // Essayer de parser comme JSON sinon utiliser comme ID
                                      try {
                                        const data = JSON.parse(textData);
                                        variableId = data.id || data.variableId || '';
                                        variableName = data.label || data.name || data.variableName || variableId;
                                      } catch {
                                        variableId = textData;
                                        variableName = textData;
                                      }
                                    }

                                    if (variableId && selectedEquipmentItem) {
                                      // Créer le lien
                                      const newLink = {
                                        variableId,
                                        variableName,
                                        equipmentId: selectedEquipmentItem.id
                                      };
                                      try {
                                        const stored = localStorage.getItem('gmao_linked_variables');
                                        const existingLinks = stored ? JSON.parse(stored) : [];
                                        const filtered = existingLinks.filter((l: any) => l.variableId !== newLink.variableId);
                                        const updatedLinks = [...filtered, newLink];
                                        localStorage.setItem('gmao_linked_variables', JSON.stringify(updatedLinks));
                                        setLinkedVariables(updatedLinks);
                                      } catch { }
                                    }
                                  }}
                                >
                                  <div className="text-center">
                                    <div className="text-2xl mb-2">{isDraggingOver ? '📥' : '🎯'}</div>
                                    <div className={`text-sm font-medium ${isDraggingOver ? 'text-blue-700' : 'text-gray-600'}`}>
                                      {isDraggingOver ? 'Relâchez pour lier la variable !' : 'Glissez une variable ici pour la lier'}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">ou utilisez le bouton "+ Lier une variable"</div>
                                  </div>
                                </div>

                                {/* Variables liées depuis Extension Alarme */}
                                {eqLinkedVars.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    <div className="text-xs font-medium text-gray-500 uppercase">Variables liées</div>
                                    {eqLinkedVars.map(v => {
                                      // Vérifier si cette variable est actuellement en alarme active
                                      const isActive = eqActiveAlarms.some(a => a.id === v.variableId);
                                      const priLabel = v.priority === '1' ? 'Urgent' : v.priority === '2' ? 'Non Urgent' : 'Info';
                                      const priBg = v.priority === '1' ? 'bg-red-100 text-red-700' : v.priority === '2' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                                      return (
                                        <div key={v.variableId} className={`p-3 rounded-lg border ${isActive ? 'bg-red-50 border-red-300 ring-2 ring-red-400 ring-opacity-50' : v.priority === '1' ? 'bg-red-50 border-red-200' : v.priority === '2' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                              <span className={`text-lg ${isActive ? 'animate-pulse' : ''}`}>{isActive ? '🚨' : v.priority === '1' ? '🚨' : v.priority === '2' ? '⚠️' : '🔗'}</span>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <div className="font-medium text-sm text-gray-900">{v.alarmText || v.variableName}</div>
                                                  {isActive && (
                                                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">ACTIF</span>
                                                  )}
                                                </div>
                                                {v.alarmText && (
                                                  <div className="text-xs text-gray-500">Variable: {v.variableName}</div>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priBg}`}>{priLabel}</span>
                                                  <span className="text-xs text-gray-400">ID: {v.variableId}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                              onClick={() => {
                                                // Supprimer le lien
                                                try {
                                                  const stored = localStorage.getItem('gmao_linked_variables');
                                                  if (stored) {
                                                    const links = JSON.parse(stored).filter((l: any) => l.variableId !== v.variableId);
                                                    localStorage.setItem('gmao_linked_variables', JSON.stringify(links));
                                                    setLinkedVariables(links);
                                                  }
                                                } catch { }
                                              }}
                                            >
                                              Délier
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {eqLinkedVars.length === 0 && (
                                  <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed">
                                    Aucune variable liée à cet équipement
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Modal Lier une Variable */}
                          {showLinkVariableModal && selectedEquipmentItem && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Lier une variable à {selectedEquipmentItem.name}</h3>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID de la variable *</label>
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border px-3 py-2 text-sm"
                                      placeholder="Ex: device-1/analog-value-1"
                                      value={newVariableLink.variableId}
                                      onChange={(e) => setNewVariableLink(prev => ({ ...prev, variableId: e.target.value }))}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">L'identifiant unique de la variable (trouvable dans l'arbre de données)</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la variable *</label>
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border px-3 py-2 text-sm"
                                      placeholder="Ex: Température Retour"
                                      value={newVariableLink.variableName}
                                      onChange={(e) => setNewVariableLink(prev => ({ ...prev, variableName: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                  <button
                                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowLinkVariableModal(false)}
                                  >Annuler</button>
                                  <button
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    disabled={!newVariableLink.variableId.trim() || !newVariableLink.variableName.trim()}
                                    onClick={() => {
                                      // Sauvegarder le lien
                                      const newLink = {
                                        variableId: newVariableLink.variableId.trim(),
                                        variableName: newVariableLink.variableName.trim(),
                                        equipmentId: selectedEquipmentItem.id
                                      };
                                      try {
                                        const stored = localStorage.getItem('gmao_linked_variables');
                                        const existingLinks = stored ? JSON.parse(stored) : [];
                                        // Éviter les doublons
                                        const filtered = existingLinks.filter((l: any) => l.variableId !== newLink.variableId);
                                        const updatedLinks = [...filtered, newLink];
                                        localStorage.setItem('gmao_linked_variables', JSON.stringify(updatedLinks));
                                        setLinkedVariables(updatedLinks);
                                      } catch { }
                                      setShowLinkVariableModal(false);
                                      setNewVariableLink({ variableId: '', variableName: '' });
                                    }}
                                  >Lier la variable</button>
                                </div>
                              </div>
                            </div>
                          )}

                          <hr />

                          {/* Action */}
                          <div className="flex justify-center gap-3">
                            <button
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                              onClick={() => {
                                setForm(prev => ({ ...prev, equipment: selectedEquipmentItem.name }));
                                setActiveTab('work');
                              }}
                            >
                              📋 Créer un Bon de travail
                            </button>
                            <button
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                              onClick={() => {
                                if (confirm(`Supprimer l'équipement "${selectedEquipmentItem.name}" ? Cette action est irréversible.`)) {
                                  // Supprimer les liens de variables associés
                                  try {
                                    const stored = localStorage.getItem('gmao_linked_variables');
                                    if (stored) {
                                      const links = JSON.parse(stored).filter((l: any) => l.equipmentId !== selectedEquipmentItem.id);
                                      localStorage.setItem('gmao_linked_variables', JSON.stringify(links));
                                      setLinkedVariables(links);
                                    }
                                  } catch { }
                                  // Supprimer l'équipement
                                  setEquipments(prev => prev.filter(eq => eq.id !== selectedEquipmentItem.id));
                                  setSelectedEquipmentItem(null);
                                }
                              }}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Historique Tab */
                        <div className="space-y-6">
                          {/* Header avec Export */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900">État</h4>
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                onClick={() => {
                                  if (confirm('Vider l\'historique de cet équipement ? Cette action est irréversible.')) {
                                    setStatusHistory(prev => prev.filter(h => h.equipmentId !== selectedEquipmentItem.id));
                                    setAlarmHistory(prev => prev.filter(h => h.equipmentId !== selectedEquipmentItem.id));
                                  }
                                }}
                              >
                                🗑️ Vider l'historique
                              </button>
                              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                ↓ Exporter les données
                              </button>
                            </div>
                          </div>

                          {/* État Dropdown */}
                          <div className="flex items-center gap-4">
                            <select
                              className="rounded-lg border px-3 py-2 text-sm"
                              value={selectedEquipmentItem.status || 'online'}
                              onChange={(e) => {
                                const updated = { ...selectedEquipmentItem, status: e.target.value, updatedAt: new Date().toISOString().slice(0, 10) };
                                setSelectedEquipmentItem(updated);
                                setEquipments(prev => prev.map(eq => eq.id === updated.id ? updated : eq));
                              }}
                            >
                              <option value="online">● En ligne</option>
                              <option value="offline">● Hors ligne</option>
                              <option value="ignore">● Ne pas suivre</option>
                            </select>
                          </div>

                          {/* Historique de statuts - Timeline */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-700">Historique de statuts</h5>
                              <div className="flex items-center gap-1 text-xs">
                                {(['1H', '1J', '1S', '1M', '3M', '6M', '1A'] as const).map(range => (
                                  <button
                                    key={range}
                                    onClick={() => setHistoryTimeRange(range)}
                                    className={`px-2 py-1 rounded border ${historyTimeRange === range ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                                  >
                                    {range}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setHistoryTimeRange('custom')}
                                  className={`px-2 py-1 rounded border ${historyTimeRange === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-blue-600'}`}
                                >
                                  Personnaliser
                                </button>
                              </div>
                            </div>

                            {/* Timeline Visual */}
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg border p-4 h-40">
                                  <div className="h-full flex flex-col justify-between text-xs text-gray-400">
                                    <div className="flex items-center gap-2"><span className="w-16">En ligne</span><div className="flex-1 h-6 bg-green-400 rounded"></div></div>
                                    <div className="flex items-center gap-2"><span className="w-16">Hors ligne</span><div className="flex-1 h-6 bg-gray-200 rounded"></div></div>
                                    <div className="flex items-center gap-2"><span className="w-16">Ne pas suivre</span><div className="flex-1 h-6 bg-gray-200 rounded"></div></div>
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-400 mt-2 border-t pt-2">
                                    <span>1 Déc</span><span>2 Déc</span><span>3 Déc</span><span>4 Déc</span><span>5 Déc</span><span>6 Déc</span><span>7 Déc</span>
                                  </div>
                                </div>

                                {/* Bouton Ajouter temps d'arrêt */}
                                <button className="mt-3 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  + Ajouter un temps d'arrêt manuel
                                </button>
                              </div>

                              {/* Stats Panel - Calculé */}
                              {(() => {
                                const eqHistory = statusHistory.filter(h => h.equipmentId === selectedEquipmentItem.id && filterByTime(h.timestamp));
                                const onlineMs = eqHistory.filter(h => h.status === 'online').reduce((sum, h) => sum + (h.durationMs || 0), 0);
                                const offlineMs = eqHistory.filter(h => h.status === 'offline').reduce((sum, h) => sum + (h.durationMs || 0), 0);
                                const formatDuration = (ms: number) => {
                                  const hours = Math.floor(ms / 3600000);
                                  return `${hours}h`;
                                };
                                // Calcul durée statut actuel
                                const lastChange = selectedEquipmentItem.updatedAt ? new Date(selectedEquipmentItem.updatedAt) : new Date(Date.now() - 86400000 * 4);
                                const currentDurationMs = Date.now() - lastChange.getTime();
                                const totalOnline = onlineMs + (selectedEquipmentItem.status === 'online' ? currentDurationMs : 0);

                                return (
                                  <div className="w-48 bg-gray-50 rounded-lg border p-4 space-y-4">
                                    <div>
                                      <div className="text-2xl font-bold text-gray-900">{formatDuration(totalOnline)}</div>
                                      <div className="text-xs text-gray-500">Disponibilité</div>
                                    </div>
                                    <div>
                                      <div className="text-xl font-bold text-orange-500">{formatDuration(offlineMs)}</div>
                                      <div className="text-xs text-gray-500">Temps d'arrêt non planifié</div>
                                    </div>
                                    <div>
                                      <div className="text-xl font-bold text-blue-500">0h</div>
                                      <div className="text-xs text-gray-500">Temps d'arrêt planifié</div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Tableau des changements de statut - Données réelles */}
                          {(() => {
                            const eqHistory = statusHistory.filter(h => h.equipmentId === selectedEquipmentItem.id && filterByTime(h.timestamp));
                            const lastChange = selectedEquipmentItem.updatedAt ? new Date(selectedEquipmentItem.updatedAt) : new Date(Date.now() - 86400000 * 4);
                            const currentDurationMs = Date.now() - lastChange.getTime();
                            const formatDuration = (ms: number) => {
                              const days = Math.floor(ms / 86400000);
                              const hours = Math.floor((ms % 86400000) / 3600000);
                              const mins = Math.floor((ms % 3600000) / 60000);
                              if (days > 0) return `${days} jour${days > 1 ? 's' : ''}, ${hours}h ${mins}m`;
                              return `${hours}h ${mins}m`;
                            };
                            const getStatusDisplay = (status: string) => {
                              if (status === 'online') return { label: 'En ligne', color: 'bg-green-500', textColor: 'text-green-600' };
                              if (status === 'offline') return { label: 'Hors ligne', color: 'bg-red-500', textColor: 'text-red-600' };
                              return { label: 'Ne pas suivre', color: 'bg-gray-400', textColor: 'text-gray-600' };
                            };

                            return (
                              <>
                                <div className="overflow-auto rounded-lg border">
                                  <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Statut</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Mis à jour par</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Durée</th>
                                        <th className="px-4 py-2 text-left text-gray-600"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Statut actuel */}
                                      <tr className="border-t bg-blue-50">
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex items-center gap-1 ${getStatusDisplay(selectedEquipmentItem.status || 'online').textColor}`}>
                                            <div className={`w-2 h-2 rounded-full ${getStatusDisplay(selectedEquipmentItem.status || 'online').color}`} />
                                            {getStatusDisplay(selectedEquipmentItem.status || 'online').label}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">Système, {selectedEquipmentItem.updatedAt || new Date().toLocaleDateString('fr-FR')}</td>
                                        <td className="px-4 py-3 text-blue-600 font-medium">{formatDuration(currentDurationMs)}</td>
                                        <td className="px-4 py-3 text-gray-400">›</td>
                                      </tr>
                                      {/* Historique */}
                                      {eqHistory.map((entry, idx) => (
                                        <tr key={entry.id} className="border-t hover:bg-gray-50">
                                          <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 ${getStatusDisplay(entry.status).textColor}`}>
                                              <div className={`w-2 h-2 rounded-full ${getStatusDisplay(entry.status).color}`} />
                                              {getStatusDisplay(entry.status).label}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">{entry.updatedBy}, {new Date(entry.timestamp).toLocaleDateString('fr-FR')}</td>
                                          <td className="px-4 py-3 text-gray-600">{formatDuration(entry.durationMs || 0)}</td>
                                          <td className="px-4 py-3 text-gray-400">›</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Détails du statut actuel */}
                                <div className="bg-gray-50 rounded-lg border p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-2 h-2 rounded-full ${getStatusDisplay(selectedEquipmentItem.status || 'online').color}`} />
                                    <span className="font-medium text-gray-900">{getStatusDisplay(selectedEquipmentItem.status || 'online').label}</span>
                                  </div>
                                  <div className="text-sm text-gray-500 mb-2">{formatDuration(currentDurationMs)}</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">Depuis</span>
                                      <div className="text-blue-600">{selectedEquipmentItem.updatedAt || new Date(Date.now() - currentDurationMs).toLocaleDateString('fr-FR')}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Créé par</span>
                                      <div className="text-gray-700">{selectedEquipmentItem.createdAt ? 'Admin' : '—'}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Mis à jour par</span>
                                      <div className="text-gray-700">Système</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Alarmes actives</span>
                                      <div className="text-gray-700">{activeAlarms.filter(a => a.equipmentId === selectedEquipmentItem.id && a.state !== 'Normal').length}</div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          <hr />

                          {/* Historique des Alarmes */}
                          {(() => {
                            const eqAlarmHistory = alarmHistory.filter(a => a.equipmentId === selectedEquipmentItem.id && filterByTime(a.timestamp));
                            const getPriDisplay = (pri: string) => {
                              if (pri === '1') return { label: 'Urgent', bg: 'bg-red-100 text-red-700', icon: '🚨' };
                              if (pri === '2') return { label: 'Non Urgent', bg: 'bg-orange-100 text-orange-700', icon: '⚠️' };
                              return { label: 'Info', bg: 'bg-blue-100 text-blue-700', icon: 'ℹ️' };
                            };
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    Historique des Alarmes
                                    {eqAlarmHistory.length > 0 && (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{eqAlarmHistory.length}</span>
                                    )}
                                  </h5>
                                </div>
                                {eqAlarmHistory.length > 0 ? (
                                  <div className="overflow-auto rounded-lg border">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-gray-600">Alarme</th>
                                          <th className="px-3 py-2 text-left text-gray-600">Priorité</th>
                                          <th className="px-3 py-2 text-left text-gray-600">Déclenchée</th>
                                          <th className="px-3 py-2 text-left text-gray-600">Résolue</th>
                                          <th className="px-3 py-2 text-left text-gray-600">Acquittée par</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {eqAlarmHistory.map(alarm => {
                                          const pri = getPriDisplay(alarm.priority);
                                          return (
                                            <tr key={alarm.id} className="border-t hover:bg-gray-50">
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                  <span>{pri.icon}</span>
                                                  <div>
                                                    <div className="font-medium text-gray-900">{alarm.alarmText}</div>
                                                    <div className="text-xs text-gray-500">Variable: {alarm.variableName}</div>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${pri.bg}`}>{pri.label}</span>
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">{new Date(alarm.timestamp).toLocaleString('fr-FR')}</td>
                                              <td className="px-3 py-2 text-gray-600">{alarm.clearedAt ? new Date(alarm.clearedAt).toLocaleString('fr-FR') : '—'}</td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {alarm.acknowledgedBy || '—'}
                                                {alarm.acknowledgedAt && (
                                                  <div className="text-xs text-gray-400">{new Date(alarm.acknowledgedAt).toLocaleString('fr-FR')}</div>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed">
                                    Aucune alarme dans l'historique pour cet équipement
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <hr />

                          {/* Historique des Bons de travail */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-medium text-gray-900">Historique des Bon de travail</h4>
                              <span className="text-xs text-gray-500">oct. 19 - déc. 7</span>
                            </div>
                            {/* Simple Chart */}
                            <div className="h-32 bg-gray-50 rounded-lg border flex items-end justify-center p-4 mb-4">
                              <div className="w-full h-full flex items-end">
                                <div className="flex-1 border-b border-l border-gray-200 h-full relative">
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400"></div>
                                  <div className="absolute bottom-0 right-4 w-2 h-2 bg-blue-600 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Liste des bons liés */}
                          <div className="space-y-2">
                            {linkedWorkOrders.length > 0 ? linkedWorkOrders.map(wo => (
                              <div key={wo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <ClipboardList size={14} className="text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{wo.title}</div>
                                    <div className="text-xs text-gray-500">Demandé par {wo.assignee || 'Non assigné'}</div>
                                    <span className={`inline-flex items-center text-xs mt-1 ${wo.status === 'Terminé' ? 'text-green-600' : wo.status === 'En cours' ? 'text-purple-600' : 'text-blue-600'}`}>
                                      {wo.status === 'Terminé' ? '✓' : '○'} {wo.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-gray-400">{wo.id}</span>
                                  {wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'Terminé' && (
                                    <div className="text-xs text-red-500 mt-1">⚠ En retard</div>
                                  )}
                                </div>
                              </div>
                            )) : (
                              <div className="text-sm text-gray-500 text-center py-8">Aucun bon de travail lié à cet équipement</div>
                            )}
                          </div>

                          {/* Create Work Order */}
                          <div className="flex justify-center pt-4">
                            <button
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                              onClick={() => {
                                setForm(prev => ({ ...prev, equipment: selectedEquipmentItem.name }));
                                setActiveTab('work');
                              }}
                            >
                              📋 Utiliser dans le nouveau Bon de travail
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <Server size={48} className="mb-4 opacity-50" />
                      <p className="text-lg font-medium">Sélectionnez un équipement</p>
                      <p className="text-sm">Cliquez sur un équipement à gauche pour voir les détails</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'suppliers':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fournisseurs</h3>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2" onClick={() => createItem('suppliers', newSupplier, () => setNewSupplier({ name: '', description: '', color: '#0088ff' }))}>
                  <Plus size={14} /> Créer
                </button>
                <button className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setNewSupplier({ name: 'Maintenance CVC SA', description: 'Contrats CTA & PAC', color: '#e65f8e' })}>
                  Exemple
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="rounded-lg border px-3 py-2" placeholder="Ex: Maintenance CVC SA" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
              <input className="rounded-lg border px-3 py-2" placeholder="Couleur (hex)" value={newSupplier.color} onChange={(e) => setNewSupplier({ ...newSupplier, color: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 col-span-1 md:col-span-3" placeholder="Ex: Contrats CTA & PAC" value={newSupplier.description} onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {suppliers.map(sp => (
                <div key={sp.id} className="rounded-xl border p-3 bg-white group hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: sp.color || '#0088ff' }} />
                      <div className="font-semibold">{sp.name}</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button className="text-blue-600 text-xs hover:underline" onClick={() => { /* TODO: edit modal */ setLocalMessage('Mode édition fournisseur à venir'); }}>Modifier</button>
                      <button className="text-red-600 text-xs hover:underline" onClick={() => setSuppliers(prev => prev.filter(x => x.id !== sp.id))}>Supprimer</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{sp.description || '—'}</div>
                </div>
              ))}
              {!suppliers.length && <div className="text-gray-500">Aucun fournisseur</div>}
            </div>
          </div>
        );
      case 'categories':
        const filteredCats = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
        const defaultCategories: Category[] = [
          { id: 'cat-1', name: 'Dommages', icon: '⚠️', color: '#ef4444', description: '' },
          { id: 'cat-2', name: 'Électrique', icon: '💡', color: '#f59e0b', description: '' },
          { id: 'cat-3', name: 'Inspection', icon: '📋', color: '#3b82f6', description: '' },
          { id: 'cat-4', name: 'Mécanique', icon: '🔧', color: '#22c55e', description: '' },
          { id: 'cat-5', name: 'Préventif', icon: '♻️', color: '#06b6d4', description: '' },
          { id: 'cat-6', name: 'Projet', icon: '📦', color: '#8b5cf6', description: '' },
          { id: 'cat-7', name: 'Réfrigération', icon: '❄️', color: '#ec4899', description: '' },
          { id: 'cat-8', name: 'Sécurité', icon: '🔒', color: '#64748b', description: '' },
          { id: 'cat-9', name: 'Procédure d\'exploitation standard', icon: '📄', color: '#f97316', description: '' },
        ];
        const displayCategories = categories.length > 0 ? filteredCats : defaultCategories;

        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Catégories</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher des Catégories"
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm w-64"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2 hover:bg-blue-700"
                  onClick={() => setShowNewCategoryModal(true)}
                >
                  <Plus size={14} /> Nouvelle Catégorie
                </button>
              </div>
            </div>

            {/* Main Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Sidebar - Category List */}
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                  {displayCategories.map(cat => (
                    <button
                      key={cat.id}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedCategory?.id === cat.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
                        }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${cat.color || '#3b82f6'}20` }}
                      >
                        {cat.icon || '📋'}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
                    </button>
                  ))}
                  {!displayCategories.length && (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Aucune catégorie trouvée
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Edit Category */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                {selectedCategory ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <button onClick={() => setSelectedCategory(null)} className="hover:text-blue-600">
                        ← Modifier la Catégorie
                      </button>
                    </div>

                    {/* Category Name */}
                    <div>
                      <input
                        type="text"
                        className="text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none w-full pb-1"
                        value={selectedCategory.name}
                        onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
                      />
                    </div>

                    {/* Icon Picker */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
                        Icônes de catégorie
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_ICONS.map((icon, idx) => (
                          <button
                            key={icon}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${selectedCategory.icon === icon
                              ? 'ring-2 ring-blue-500 ring-offset-2'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            style={{ backgroundColor: `${CATEGORY_COLORS[idx]}20` }}
                            onClick={() => setSelectedCategory({ ...selectedCategory, icon, color: CATEGORY_COLORS[idx] })}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <button className="text-sm text-blue-600 hover:underline mt-2">
                        Importer une icône personnalisée →
                      </button>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
                        Descriptif
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-gray-900"
                        rows={4}
                        placeholder="Ajouter une description"
                        value={selectedCategory.description || ''}
                        onChange={(e) => setSelectedCategory({ ...selectedCategory, description: e.target.value })}
                      />
                    </div>

                    {/* Work Orders Link */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                        Bons de travail liés
                      </h4>
                      <div className="text-sm text-gray-500">
                        {workOrders.filter(wo => wo.categories?.includes(selectedCategory.name)).length > 0 ? (
                          <div className="space-y-2">
                            {workOrders.filter(wo => wo.categories?.includes(selectedCategory.name)).slice(0, 5).map(wo => (
                              <div key={wo.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="font-medium">{wo.title}</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{wo.status}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic">Aucun bon de travail associé à cette catégorie</p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white transition-colors"
                        onClick={() => {
                          // Save category changes
                          const updated = categories.map(c => c.id === selectedCategory.id ? selectedCategory : c);
                          setCategories(updated);
                          setSelectedCategory(null);
                        }}
                      >
                        Mettre à jour
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                    <FolderPlus size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sélectionnez une catégorie</p>
                    <p className="text-sm">Cliquez sur une catégorie à gauche pour la modifier</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal removed from here */}
          </div>
        );
      case 'users':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Utilisateurs</h3>
              <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2" onClick={() => { setEditingUser({ id: undefined as any, name: '', email: '', role: 'standard' }); setUserTeamId(''); setShowUserModal(true); }}>
                <Plus size={14} /> Nouvel utilisateur
              </button>
            </div>
            <div className="overflow-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="px-3 py-2 text-left">Nom</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Rôle</th><th className="px-3 py-2 text-left">Équipe</th><th className="px-3 py-2 text-left">Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const member = teamMembers.find(m => m.user_id === u.id);
                    const team = member ? teams.find(t => t.id === member.team_id) : null;
                    return (
                      <tr key={u.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold">{u.name}</td>
                        <td className="px-3 py-2">{u.email || '—'}</td>
                        <td className="px-3 py-2">{u.role || '—'}</td>
                        <td className="px-3 py-2">{team?.name || '—'}</td>
                        <td className="px-3 py-2 space-x-2">
                          <button className="text-blue-600 text-xs" onClick={() => { setEditingUser(u); setUserTeamId(team?.id || ''); setShowUserModal(true); }}>Éditer</button>
                          <button className="text-red-600 text-xs" onClick={() => deleteUser(u.id)}>Supprimer</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!users.length && <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>Aucun utilisateur</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'teams':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Équipes</h3>
              <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2" onClick={() => { setShowTeamModal(true); setEditingTeam(null); setNewTeamName(''); setNewTeamDesc(''); }}>
                <Plus size={14} /> Nouvelle équipe
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Liste</h4>
                <div className="space-y-1 max-h-80 overflow-auto">
                  {teams.map(team => (
                    <button key={team.id} className={`w-full text-left px-3 py-2 rounded-lg border ${selectedTeam?.id === team.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setSelectedTeam(team)}>
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-xs text-gray-500">{team.description || ''}</div>
                    </button>
                  ))}
                  {!teams.length && <div className="text-sm text-gray-500">Aucune équipe</div>}
                </div>
              </div>
              <div className="lg:col-span-2 bg-white rounded-xl border p-4 space-y-3">
                {selectedTeam ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{selectedTeam.name}</div>
                        <div className="text-sm text-gray-500">{selectedTeam.description}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-2 text-xs rounded border" onClick={() => { setShowTeamModal(true); setEditingTeam(selectedTeam); setNewTeamName(selectedTeam.name); setNewTeamDesc(selectedTeam.description || ''); setNewTeamColor(selectedTeam.color || '#f59e0b'); }}>Éditer</button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <h5 className="text-sm font-semibold mb-2">Membres</h5>
                        <div className="space-y-2">
                          {teamMembers.filter(m => m.team_id === selectedTeam.id).map(m => {
                            const usr = users.find(u => u.id === m.user_id);
                            return (
                              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                                <div>
                                  <div className="font-semibold">{usr?.name || m.user_id}</div>
                                  <div className="text-xs text-gray-500">{usr?.email || ''}</div>
                                </div>
                                <div className="w-40">
                                  <SearchableSelect
                                    value={m.role || 'member'}
                                    options={[
                                      { value: 'admin', label: 'Administrateur' },
                                      { value: 'manager', label: 'Manager' },
                                      { value: 'standard', label: 'Utilisateur standard' },
                                      { value: 'guest', label: 'Guest' },
                                      { value: 'requester', label: 'Demandeur uniquement' }
                                    ]}
                                    onChange={async (val) => {
                                      const payload = { ...m, role: val };
                                      const res = await fetchWithTimeout(`${API_URL}/api/team_members/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                      if (res.ok) setTeamMembers(prev => prev.map(x => x.id === m.id ? payload : x));
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <SearchableSelect
                                placeholder="Sélectionner un utilisateur"
                                options={users.map(u => ({ value: u.id, label: u.name }))}
                                value={newMemberUserId}
                                onChange={setNewMemberUserId}
                              />
                            </div>
                            <div className="w-32">
                              <SearchableSelect
                                value={newMemberRole}
                                options={[
                                  { value: 'manager', label: 'Manager' },
                                  { value: 'standard', label: 'Standard' },
                                  { value: 'guest', label: 'Guest' },
                                  { value: 'requester', label: 'Demandeur' }
                                ]}
                                onChange={setNewMemberRole}
                              />
                            </div>
                            <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={async () => {
                              if (!newMemberUserId) return;
                              const payload = { team_id: selectedTeam.id, user_id: newMemberUserId, role: newMemberRole };
                              const res = await fetchWithTimeout(`${API_URL}/api/team_members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                              if (res.ok) {
                                const created = await res.json();
                                setTeamMembers(prev => [...prev, created]);
                                setNewMemberUserId('');
                              }
                            }}>Ajouter</button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-semibold mb-2">Équipements assignés</h5>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <SearchableSelect
                                placeholder="Sélectionner un équipement"
                                options={equipments.map(eq => ({ value: eq.id, label: eq.name }))}
                                value={assignEquipId}
                                onChange={setAssignEquipId}
                              />
                            </div>
                            <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={async () => {
                              if (!assignEquipId) return;
                              const payload = { team_id: selectedTeam.id, equipment_id: assignEquipId };
                              const res = await fetchWithTimeout(`${API_URL}/api/team_equipments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                              if (res.ok) {
                                const created = await res.json();
                                setTeamEquipments(prev => [...prev, created]);
                                setAssignEquipId('');
                              }
                            }}>Assigner</button>
                          </div>
                          <ul className="text-sm text-gray-700 mt-2 space-y-1">
                            {teamEquipments.filter(t => t.team_id === selectedTeam.id).map(t => {
                              const eq = equipments.find(e => e.id === t.equipment_id);
                              return <li key={t.id}>- {eq?.name || t.equipment_id}</li>;
                            })}
                            {!teamEquipments.filter(t => t.team_id === selectedTeam.id).length && <li className="text-gray-500">Aucun équipement</li>}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold mb-2">Emplacements assignés</h5>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <SearchableSelect
                                placeholder="Sélectionner un emplacement"
                                options={locations.map(l => ({ value: l.id, label: l.name }))}
                                value={assignLocId}
                                onChange={setAssignLocId}
                              />
                            </div>
                            <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={async () => {
                              if (!assignLocId) return;
                              const payload = { team_id: selectedTeam.id, location_id: assignLocId };
                              const res = await fetchWithTimeout(`${API_URL}/api/team_locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                              if (res.ok) {
                                const created = await res.json();
                                setTeamLocations(prev => [...prev, created]);
                                setAssignLocId('');
                              }
                            }}>Assigner</button>
                          </div>
                          <ul className="text-sm text-gray-700 mt-2 space-y-1">
                            {teamLocations.filter(t => t.team_id === selectedTeam.id).map(t => {
                              const loc = locations.find(c => c.id === t.location_id);
                              return <li key={t.id}>- {loc?.name || t.location_id}</li>;
                            })}
                            {!teamLocations.filter(t => t.team_id === selectedTeam.id).length && <li className="text-gray-500">Aucun emplacement</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Sélectionnez une équipe ou créez-en une.</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'messages':
        return <div className="text-sm text-gray-600">Messages (à intégrer)</div>;
      case 'automations':
        return <div className="text-sm text-gray-600">Automatisations (prochain sprint)</div>;
      default:
        return (
          <div className="space-y-6">
            {localMessage && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{localMessage}</div>}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Créer une fiche de Bon de travail</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Les informations saisies seront visibles dans la vue tableau.</p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setForm(sampleWorkOrder)}
                >
                  Remplir avec un exemple
                </button>
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setForm({
                    title: '',
                    description: '',
                    location: '',
                    equipment: '',
                    procedure: '',
                    assignee: '',
                    hours: 1,
                    minutes: 0,
                    dueDate: '',
                    startDate: '',
                    recurrence: 'Ne se répète pas',
                    workType: 'Réactive',
                    priority: 'Aucun',
                    categoryInput: '',
                    files: [],
                    parts: '',
                    supplier: '',
                    categories: ['Dommages', 'Préventif'],
                  })}
                >
                  Réinitialiser
                </button>
                <button
                  className="ml-auto px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                  onClick={() => setShowFullForm(true)}
                >
                  Ouvrir le formulaire détaillé
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setForm(sampleWorkOrder)}
                >
                  Remplir avec un exemple
                </button>
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setForm({
                    title: '',
                    description: '',
                    location: '',
                    equipment: '',
                    procedure: '',
                    assignee: '',
                    hours: 1,
                    minutes: 0,
                    dueDate: '',
                    startDate: '',
                    recurrence: 'Ne se répète pas',
                    workType: 'Réactive',
                    priority: 'Aucun',
                    categoryInput: '',
                    files: [],
                    parts: '',
                    supplier: '',
                    categories: ['Dommages', 'Préventif'],
                  })}
                >
                  Réinitialiser
                </button>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Que faut-il faire ? (Requis)</label>
                <input className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Titre du bon de travail" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Descriptif</label>
                <textarea className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" rows={3} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Ajouter une description" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Emplacement</label>
                  <SearchableSelect
                    placeholder="Sélectionner..."
                    options={locationOptions}
                    value={form.location}
                    onChange={(v) => handleChange('location', v)}
                    addNewLabel="Créer un emplacement"
                    onAddNew={() => setShowLocationModal(true)}
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Équipement"
                    placeholder="Sélectionner..."
                    options={equipmentOptions}
                    value={form.equipment}
                    onChange={(v) => handleChange('equipment', v)}
                    addNewLabel="Créer un équipement"
                    onAddNew={() => setShowEquipmentModal(true)}
                  />
                  {form.equipment && (
                    <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: getEquipmentStatus(form.equipment) === 'online' ? '#10b981' : '#d1d5db' }} />
                      Statut: {getEquipmentStatus(form.equipment) || 'Inconnu'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Attribuer à</label>
                <SearchableSelect
                  placeholder="Non assigné"
                  options={allAssigneeOptions}
                  value={form.assignee}
                  onChange={(v) => handleChange('assignee', v)}
                  addNewLabel="Inviter un membre"
                  onAddNew={() => setShowInviteModal(true)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Durée estimée</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="number" min={0} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.hours} onChange={e => handleChange('hours', Number(e.target.value))} />
                  <input type="number" min={0} max={59} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.minutes} onChange={e => handleChange('minutes', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Date d’échéance</label>
                <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.dueDate} onChange={e => handleChange('dueDate', e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Date de début</label>
                <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Récurrence</label>
                <select className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.recurrence} onChange={e => handleChange('recurrence', e.target.value)}>
                  {['Ne se répète pas', 'Hebdomadaire', 'Mensuel', 'Annuel'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Type de travail</label>
                <select className="w-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500" value={form.workType} onChange={e => handleChange('workType', e.target.value)}>
                  {['Réactive', 'Préventive', 'Projet'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {['Aucun', 'Faible', 'Moyenne', 'Élevée'].map(level => (
                  <button key={level} onClick={() => handleChange('priority', level)} type="button" className={`flex-1 rounded-full px-4 py-2 border ${form.priority === level ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-600">
                <button type="button" className="flex items-center gap-2 hover:underline" onClick={openFilePicker}><UploadCloud size={16} /> Joindre des fichiers</button>
              </div>
              {renderAttachments()}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    label="Pièces"
                    placeholder="Sélectionner..."
                    options={parts.map(p => ({ value: p.name, label: p.name }))}
                    value={form.parts}
                    onChange={(v) => handleChange('parts', v)}
                    addNewLabel="Ajouter une pièce"
                    onAddNew={() => setShowPartModal(true)}
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Fournisseurs"
                    placeholder="Sélectionner..."
                    options={supplierOptions}
                    value={(form as any).supplier || ''}
                    onChange={(v) => handleChange('supplier', v)}
                    addNewLabel="Ajouter un fournisseur"
                    onAddNew={() => setShowSupplierModal(true)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Catégories</label>
                <button type="button" className="text-xs text-blue-600 hover:underline" onClick={(e) => {
                  e.stopPropagation();
                  const val = form.categoryInput.trim();
                  if (val) {
                    setForm(prev => {
                      if (prev.categories.includes(val)) return { ...prev, categoryInput: '' };
                      return { ...prev, categories: [...prev.categories, val], categoryInput: '' };
                    });
                  } else {
                    setShowNewCategoryModal(true);
                  }
                }}>+ Ajouter</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center gap-2">
                    {cat}
                    <span role="button" className="cursor-pointer text-gray-500" onClick={() => handleChange('categories', form.categories.filter(c => c !== cat))}>×</span>
                  </span>
                ))}
                <input
                  type="text"
                  list="category-options"
                  value={form.categoryInput}
                  onChange={e => handleChange('categoryInput', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = form.categoryInput.trim();
                      if (val) {
                        setForm(prev => {
                          if (prev.categories.includes(val)) return { ...prev, categoryInput: '' };
                          return { ...prev, categories: [...prev.categories, val], categoryInput: '' };
                        });
                      }
                    }
                  }}
                  placeholder="Ajouter une catégorie"
                  className="px-3 py-1 border border-dashed border-gray-300 dark:border-white/20 rounded-full bg-white dark:bg-gray-900 text-xs focus:ring-0"
                />
                <datalist id="category-options">
                  {categories.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSubmit} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">Créer</button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vue tableau des bons</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Filtrer par priorité, état, emplacement.</p>
                </div>
                <button className="text-sm text-blue-600 hover:underline">Enregistrer les filtres</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="text-xs uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      <th className="px-6 py-3">Titre</th>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">État</th>
                      <th className="px-6 py-3">Priorité</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Assigné à</th>
                      <th className="px-6 py-3">Catégories</th>
                      <th className="px-6 py-3">Équipement</th>
                      <th className="px-6 py-3">Emplacement</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700 dark:text-gray-200">
                    {workOrders.map(order => (
                      <tr key={order.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-6 py-3 font-semibold">{order.title}</td>
                        <td className="px-6 py-3">{order.id}</td>
                        <td className="px-6 py-3">{order.status}</td>
                        <td className="px-6 py-3">{order.priority}</td>
                        <td className="px-6 py-3">{order.workType}</td>
                        <td className="px-6 py-3">{order.assignee}</td>
                        <td className="px-6 py-3">
                          {order.categories.map(cat => (
                            <span key={cat} className="inline-flex items-center px-2 py-0.5 mr-1 rounded-full text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">{cat}</span>
                          ))}
                        </td>
                        <td className="px-6 py-3">{order.equipment}</td>
                        <td className="px-6 py-3">{order.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesUpload(e.target.files)}
      />
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-6 md:p-8 overflow-y-auto space-y-6">
        {showFullForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold">Nouveau Bon de travail</h3>
                  <p className="text-xs text-gray-500">Formulaire détaillé</p>
                </div>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowFullForm(false)}>✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Que faut-il faire ? (Requis)</label>
                    <input
                      className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2"
                      placeholder="Titre du bon de travail"
                      value={form.title}
                      onChange={e => handleChange('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Photos / fichiers</label>
                    <div
                      className="mt-1 border-2 border-dashed border-gray-200 rounded-xl h-32 flex flex-col items-center justify-center text-sm text-gray-500 cursor-pointer"
                      onClick={openFilePicker}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleFilesUpload(e.dataTransfer.files); }}
                    >
                      <UploadCloud size={18} className="text-gray-400 mb-1" />
                      <span>Ajouter ou faire glisser des images</span>
                      <span className="text-xs text-gray-400">PNG, JPG, PDF</span>
                    </div>
                  </div>
                </div>
                {renderAttachments()}
                <div>
                  <label className="text-sm font-semibold text-gray-700">Descriptif</label>
                  <textarea className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" rows={3} value={form.description} onChange={e => handleChange('description', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Catégories</label>
                    <button type="button" className="text-xs text-blue-600 hover:underline" onClick={(e) => {
                      console.log('Button Clicked'); // DEBUG
                      e.preventDefault();
                      e.stopPropagation();
                      const val = form.categoryInput.trim();
                      console.log('Value:', val); // DEBUG
                      if (val) {
                        console.log('Adding category directly'); // DEBUG
                        setForm(prev => {
                          if (prev.categories.includes(val)) return { ...prev, categoryInput: '' };
                          return { ...prev, categories: [...prev.categories, val], categoryInput: '' };
                        });
                      } else {
                        console.log('Opening modal, setting true'); // DEBUG
                        setShowNewCategoryModal(true);
                      }
                    }}>+ Ajouter</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded-xl min-h-[42px]">
                    {form.categories.map(cat => (
                      <span key={cat} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                        {cat}
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Ajouter une catégorie"
                      className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none ml-1"
                      value={form.categoryInput}
                      onChange={e => setForm(prev => ({ ...prev, categoryInput: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = form.categoryInput.trim();
                          if (val) {
                            setForm(prev => {
                              if (prev.categories.includes(val)) return { ...prev, categoryInput: '' };
                              return { ...prev, categories: [...prev.categories, val], categoryInput: '' };
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <SearchableSelect
                      label="Emplacement"
                      placeholder="Sélectionner..."
                      options={locationOptions}
                      value={form.location}
                      onChange={(v) => handleChange('location', v)}
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      label="Équipement"
                      placeholder="Sélectionner..."
                      options={equipmentOptions}
                      value={form.equipment}
                      onChange={(v) => handleChange('equipment', v)}
                      addNewLabel="Ajouter un équipement"
                      onAddNew={() => setShowEquipmentModal(true)}
                    />
                    <button className="text-xs text-blue-600 mt-1" onClick={() => setShowEquipPicker(true)}>+ Ajouter plusieurs équipements</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Procédure</label>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-gray-500">Créer ou joindre une nouvelle Procédure</span>
                    <button className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-blue-600">+ Ajouter la Procédure</button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <SearchableSelect
                      label="Attribuer à"
                      placeholder="Non assigné"
                      options={allAssigneeOptions}
                      value={form.assignee}
                      onChange={(v) => handleChange('assignee', v)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Durée estimée (heures)</label>
                      <input type="number" min={0} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.hours} onChange={e => handleChange('hours', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Durée estimée (minutes)</label>
                      <input type="number" min={0} max={59} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.minutes} onChange={e => handleChange('minutes', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Date d’échéance</label>
                    <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.dueDate} onChange={e => handleChange('dueDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Date de début</label>
                    <input type="date" className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-between gap-2 bg-gray-50">
                <div className="w-1/3">
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Statut</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {[
                      { value: 'Ouvert', label: 'Ouvert', icon: Lock, activeClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
                      { value: 'En attente', label: 'En attente', icon: PauseCircle, activeClass: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
                      { value: 'En cours', label: 'En cours', icon: RefreshCw, activeClass: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
                      { value: 'Terminé', label: 'Terminé', icon: CheckCircle2, activeClass: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' }
                    ].map(st => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Clicking status:', st.value, 'Current:', form.status);
                          handleChange('status', st.value);
                          console.log('Called handleChange with:', st.value);
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all border border-transparent ${form.status === st.value
                          ? `${st.activeClass} shadow-sm`
                          : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                          }`}
                      >
                        <st.icon size={14} className={st.value === 'En cours' && form.status === 'En cours' ? 'animate-spin' : ''} />
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100" onClick={() => setShowFullForm(false)}>Annuler</button>
                  <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={handleSubmit}>
                    {form.id ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showEquipPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Sélectionner des Équipements</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowEquipPicker(false)}>✕</button>
              </div>
              <div className="p-5 space-y-3">
                <input
                  type="text"
                  placeholder="Rechercher"
                  className="w-full rounded-lg border px-3 py-2"
                  value={equipSearch}
                  onChange={(e) => setEquipSearch(e.target.value)}
                />
                <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Des sous-bons de travail seront créés pour chaque équipement.
                </div>
                <div className="max-h-60 overflow-auto border rounded-xl">
                  {(filteredEquipments.length ? filteredEquipments : equipments).map(eq => (
                    <label key={eq.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{eq.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedEquipIds.includes(eq.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedEquipIds(prev => checked ? [...prev, eq.id] : prev.filter(id => id !== eq.id));
                        }}
                      />
                    </label>
                  ))}
                  {!equipments.length && <div className="px-3 py-4 text-gray-500 text-sm">Aucun équipement</div>}
                </div>
              </div>
              <div className="flex justify-between items-center px-5 py-4 border-t text-sm text-gray-600">
                <span>{selectedEquipIds.length ? `${selectedEquipIds.length} équipement(s) sélectionné(s)` : 'Aucun équipement sélectionné'}</span>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowEquipPicker(false)}>Annuler</button>
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                    onClick={() => {
                      const names = equipments.filter(eq => selectedEquipIds.includes(eq.id)).map(eq => eq.name);
                      handleChange('equipment', names.join(', '));
                      if (names.length) {
                        markStep('addEquip');
                        markStep('addEquipToBT');
                      }
                      setShowEquipPicker(false);
                    }}
                  >
                    Ajouter les Équipements
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showLocationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Nouvel Emplacement</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowLocationModal(false)}>×</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newLocation.name} onChange={e => setNewLocation(l => ({ ...l, name: e.target.value }))} placeholder="Ex: Bâtiment A / Niv 1" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Emplacement parent</label>
                  <select className="w-full mt-1 rounded-lg border px-3 py-2" value={newLocation.parent_id || ''} onChange={e => setNewLocation(l => ({ ...l, parent_id: e.target.value || undefined }))}>
                    <option value="">Aucun</option>
                    {locations.map(l => <option key={l.id || l.name} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowLocationModal(false)}>Annuler</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleCreateLocation}>Créer</button>
              </div>
            </div>
          </div>
        )}
        {showEquipmentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Nouvel Équipement</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowEquipmentModal(false)}>✕</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newEquipment.name} onChange={e => setNewEquipment(l => ({ ...l, name: e.target.value }))} placeholder="Ex: Pompe P-01" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Statut</label>
                  <select className="w-full mt-1 rounded-lg border px-3 py-2" value={newEquipment.status} onChange={e => setNewEquipment(l => ({ ...l, status: e.target.value }))}>
                    <option value="online">En ligne</option>
                    <option value="offline">Hors ligne</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea className="w-full mt-1 rounded-lg border px-3 py-2" rows={3} value={newEquipment.description} onChange={e => setNewEquipment(l => ({ ...l, description: e.target.value }))} />
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowEquipmentModal(false)}>Annuler</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleCreateEquipment}>Créer</button>
              </div>
            </div>
          </div>
        )}
        {showSupplierModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Nouveau Fournisseur</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowSupplierModal(false)}>✕</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newSupplier.name} onChange={e => setNewSupplier(l => ({ ...l, name: e.target.value }))} placeholder="Ex: Acme Corp" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea className="w-full mt-1 rounded-lg border px-3 py-2" rows={3} value={newSupplier.description} onChange={e => setNewSupplier(l => ({ ...l, description: e.target.value }))} />
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowSupplierModal(false)}>Annuler</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleCreateSupplier}>Créer</button>
              </div>
            </div>
          </div>
        )}
        {showPartModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Nouvelle Pièce</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowPartModal(false)}>✕</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.name} onChange={e => setNewPart(l => ({ ...l, name: e.target.value }))} placeholder="Ex: Filtre F7" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Référence / Barcode</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newPart.barcode} onChange={e => setNewPart(l => ({ ...l, barcode: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea className="w-full mt-1 rounded-lg border px-3 py-2" rows={3} value={newPart.description} onChange={e => setNewPart(l => ({ ...l, description: e.target.value }))} />
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowPartModal(false)}>Annuler</button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleCreatePart}>Créer</button>
              </div>
            </div>
          </div>
        )}
        {/* Team Invitation Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">Inviter toute l'équipe</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="border-t-4 border-blue-500 bg-blue-50 rounded-b-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-1">MaintainX fonctionne mieux avec votre équipe</h4>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-sm font-medium text-gray-600">Adresse e-mail ou numéro de téléphone (avec code du pays)</label>
                    <label className="text-sm font-medium text-gray-600">Nom complet</label>
                  </div>
                  {inviteList.map((inv, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="jean@exemple.com"
                        value={inv.email}
                        onChange={(e) => {
                          const updated = [...inviteList];
                          updated[idx].email = e.target.value;
                          setInviteList(updated);
                        }}
                      />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Michel Dupont"
                        value={inv.name}
                        onChange={(e) => {
                          const updated = [...inviteList];
                          updated[idx].name = e.target.value;
                          setInviteList(updated);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    onClick={() => setInviteList([...inviteList, { email: '', name: '' }])}
                  >
                    <Plus size={14} /> Ajouter un autre utilisateur
                  </button>
                </div>
              </div>
              <div className="flex justify-center px-6 py-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg bg-gray-300 text-gray-600 font-medium cursor-not-allowed"
                    disabled={!inviteList.some(inv => inv.email.trim() !== '')}
                    onClick={() => {
                      // Handle invitation logic here
                      const validInvites = inviteList.filter(inv => inv.email.trim() !== '');
                      if (validInvites.length > 0) {
                        alert(`Invitations envoyées à ${validInvites.length} utilisateur(s)`);
                        markStep('invite');
                        setShowInviteModal(false);
                        setInviteList([{ email: '', name: '' }, { email: '', name: '' }, { email: '', name: '' }]);
                      }
                    }}
                  >
                    Envoyer des invitations
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm ${isActive ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {renderStatusBadge()}
            <button onClick={fetchData} className="px-3 py-2 text-sm rounded-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-50">
              <RefreshCw size={14} /> Rafraîchir
            </button>
            {apiError && <span className="text-xs text-red-600">Erreur : {apiError}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-semibold text-gray-700 dark:text-gray-200">Configuration de base (v3)</h2>
                  <p className="text-xs text-gray-500">{stepConfig.filter(s => isStepDone(s.key)).length} sur {stepConfig.length}</p>
                </div>
                <span className="text-sm text-gray-500">5 min</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="text-right text-xs text-gray-400 mb-6">Progression</div>
              <div className="space-y-2">
                {stepConfig.map((step, i) => {
                  const done = isStepDone(step.key);
                  const current = !done && currentStepIndex === i;
                  return (
                    <div
                      key={step.label}
                      onClick={() => handleStepClick(step.key)}
                      className={`flex items-center justify-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${done ? 'bg-green-50 border-green-100' : current ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="text-green-600" size={18} />
                        ) : (
                          <Circle className={current ? 'text-blue-500' : 'text-gray-300'} size={18} />
                        )}
                        <span className={current ? 'text-blue-700 font-semibold' : 'text-gray-700'}>
                          {step.label}
                        </span>
                      </div>
                      {current && <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Inviter toute l’équipe</h4>
                  <p className="text-xs text-gray-500">Ajoutez les membres pour collaborer.</p>
                </div>
                <button
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                  onClick={() => setShowInviteModal(true)}
                >
                  Inviter
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Importation d’équipements</h4>
                  <p className="text-xs text-gray-500">Téléchargez un fichier pour ajouter vos équipements.</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-blue-600 flex items-center gap-2 justify-between"
                  onClick={() => markStep('import')}
                >
                  <span>1. Télécharger le modèle</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 justify-between"
                  onClick={() => markStep('import')}
                >
                  <span>2. Télécharger le fichier des équipements</span>
                  <UploadCloud size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">{renderTabContent()}</div>
        </div>
      </div>

      {
        showDetail && selectedOrder && (
          <DetailModal
            order={selectedOrder}
            onClose={() => setShowDetail(false)}
            onSave={(updated) => {
              setSelectedOrder(updated);
              if (updateOrder) updateOrder(updated.id, updated);
            }}
            equipments={equipments}
            locations={locations}
            users={users}
            teams={teams}
            suppliers={suppliers}
            parts={parts}
            onAddEquipment={() => setShowEquipmentModal(true)}
            onAddSupplier={() => setShowSupplierModal(true)}
            onAddPart={() => setShowPartModal(true)}
          />
        )
      }
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">{editingUser ? 'Éditer l’utilisateur' : 'Nouvel utilisateur'}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nom</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={editingUser?.name || ''} onChange={e => setEditingUser(prev => ({ ...(prev || { id: undefined }), name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={editingUser?.email || ''} onChange={e => setEditingUser(prev => ({ ...(prev || { id: undefined }), email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Téléphone</label>
                  <input className="w-full mt-1 rounded-lg border px-3 py-2" value={(editingUser as any)?.phone || ''} onChange={e => setEditingUser(prev => ({ ...(prev || { id: undefined }), phone: e.target.value }))} />
                </div>
                <div>
                  <SearchableSelect
                    label="Rôle"
                    placeholder="Sélectionner..."
                    options={[
                      { value: 'admin', label: 'Administrateur' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'standard', label: 'Utilisateur standard' },
                      { value: 'guest', label: 'Guest' },
                      { value: 'requester', label: 'Demandeur uniquement' }
                    ]}
                    value={editingUser?.role || 'standard'}
                    onChange={(v) => setEditingUser(prev => ({ ...(prev || { id: undefined }), role: v }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Affecter à une équipe"
                    placeholder="Aucune"
                    className="w-full"
                    options={[{ value: '', label: 'Aucune' }, ...teams.map(t => ({ value: t.id, label: t.name }))]}
                    value={userTeamId}
                    onChange={setUserTeamId}
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowUserModal(false)}>Annuler</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => {
                if (!editingUser?.name) return;
                saveUser({ ...editingUser, id: editingUser.id });
              }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">{editingTeam ? 'Éditer l’équipe' : 'Nouvelle équipe'}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowTeamModal(false)}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nom</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea className="w-full mt-1 rounded-lg border px-3 py-2" value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Couleur</label>
                <div className="flex gap-2 mt-1">
                  {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'].map(c => (
                    <button key={c} className={`w-6 h-6 rounded-full border ${newTeamColor === c ? 'ring-2 ring-blue-500' : ''}`} style={{ background: c }} onClick={() => setNewTeamColor(c)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={() => setShowTeamModal(false)}>Annuler</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={async () => {
                if (!newTeamName) return;
                const payload = { name: newTeamName, description: newTeamDesc, color: newTeamColor };
                const method = editingTeam ? 'PUT' : 'POST';
                const url = editingTeam ? `${API_URL}/api/teams/${editingTeam.id}` : `${API_URL}/api/teams`;
                const res = await fetchWithTimeout(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (res.ok) {
                  const saved = await res.json();
                  setTeams(prev => {
                    const exists = prev.find(t => t.id === saved.id);
                    if (exists) return prev.map(t => t.id === saved.id ? saved : t);
                    return [...prev, saved];
                  });
                  setSelectedTeam(saved);
                }
                setShowTeamModal(false);
                setEditingTeam(null);
              }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900">Nouvelle Catégorie</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Nom de la catégorie</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Maintenance préventive"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Icône</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.map((icon, idx) => (
                    <button
                      key={icon}
                      type="button"
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${newCategory.icon === icon
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : 'hover:bg-gray-100'
                        }`}
                      style={{ backgroundColor: `${CATEGORY_COLORS[idx]}20` }}
                      onClick={() => setNewCategory({ ...newCategory, icon, color: CATEGORY_COLORS[idx] })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  placeholder="Ajouter une description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowNewCategoryModal(false)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  if (newCategory.name.trim()) {
                    const cat: Category = {
                      id: `cat-${Date.now()}`,
                      name: newCategory.name,
                      description: newCategory.description,
                      icon: newCategory.icon,
                      color: newCategory.color,
                    };
                    setCategories([...categories, cat]);
                    setNewCategory({ name: '', description: '', icon: '⚠️', color: '#ef4444' });
                    setShowNewCategoryModal(false);
                  }
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GMAOWidget;

// Formulaire détaillé modal
// (injecté à la fin pour rester léger)

const DetailModal: React.FC<{
  order: any;
  onClose: () => void;
  onSave: (order: any) => void;
  equipments: Equipment[];
  locations: any[];
  users: UserType[];
  teams: any[];
  suppliers: Supplier[];
  parts: Part[];
  onAddEquipment: () => void;
  onAddSupplier: () => void;
  onAddPart: () => void;
}> = ({ order, onClose, onSave, equipments, locations, users, teams, suppliers, parts, onAddEquipment, onAddSupplier, onAddPart }) => {
  const [draft, setDraft] = React.useState(order);
  const statusList = ['Ouvert', 'En attente', 'En cours', 'Terminé'];
  const update = (field: string, value: any) => setDraft((p: any) => ({ ...p, [field]: value }));

  const locationOptions = useMemo(() => locations.map(l => ({ value: l.name, label: l.name })), [locations]);
  const supplierOptions = useMemo(() => (suppliers || []).map(s => ({ value: s.name, label: s.name })), [suppliers]);
  const equipmentOptions = useMemo(() => equipments.map(eq => ({ value: eq.name, label: eq.status ? `${eq.name} (${eq.status})` : eq.name })), [equipments]);
  const assigneeOptions = useMemo(() => [
    ...teams.map((t: any) => ({ value: `team:${t.id}`, label: `Equipe: ${t.name}` })),
    ...users.map((u: any) => ({ value: u.name, label: u.name }))
  ], [teams, users]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">{draft.title || 'Bon de travail'}</h3>
            <p className="text-sm text-gray-500">ID {draft.id}</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            {statusList.map(s => (
              <button
                key={s}
                className={`px-3 py-2 rounded-lg border ${draft.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700'}`}
                onClick={() => update('status', s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Titre</label>
              <input className="w-full mt-1 rounded-lg border px-3 py-2" value={draft.title} onChange={e => update('title', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Type de travail</label>
              <input className="w-full mt-1 rounded-lg border px-3 py-2" value={draft.workType || ''} onChange={e => update('workType', e.target.value)} />
            </div>
            <div>
              <SearchableSelect
                label="Assigné à"
                placeholder="Non assigné"
                options={assigneeOptions}
                value={draft.assignee || ''}
                onChange={(v) => update('assignee', v)}
              />
            </div>
            <div>
              <SearchableSelect
                label="Priorité"
                placeholder="Sélectionner..."
                options={['Aucun', 'Faible', 'Moyenne', 'Élevée'].map(p => ({ value: p, label: p }))}
                value={draft.priority || ''}
                onChange={(v) => update('priority', v)}
              />
            </div>
            <div>
              <SearchableSelect
                label="Équipement"
                placeholder="Sélectionner..."
                options={equipmentOptions}
                value={draft.equipment || ''}
                onChange={(v) => update('equipment', v)}
                addNewLabel="Ajouter un équipement"
                onAddNew={onAddEquipment}
              />
            </div>
            <div>
              <SearchableSelect
                label="Emplacement"
                placeholder="Sélectionner..."
                options={locationOptions}
                value={draft.location || ''}
                onChange={(v) => update('location', v)}
              />
            </div>
            <div>
              <SearchableSelect
                label="Récurrence"
                placeholder="Sélectionner..."
                options={['Ne se répète pas', 'Hebdomadaire', 'Mensuel', 'Annuel'].map(opt => ({ value: opt, label: opt }))}
                value={draft.recurrence || 'Ne se répète pas'}
                onChange={(v) => update('recurrence', v)}
              />
            </div>
            <div>
              <SearchableSelect
                label="Type de travail (Liste)"
                placeholder="Sélectionner..."
                options={['Réactive', 'Préventive', 'Projet'].map(opt => ({ value: opt, label: opt }))}
                value={draft.workType || 'Réactive'}
                onChange={(v) => update('workType', v)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Date d'échéance</label>
              <input type="date" className="w-full mt-1 rounded-lg border px-3 py-2" value={draft.dueDate || ''} onChange={e => update('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Durée estimée (h)</label>
              <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2" value={draft.hours || 0} onChange={e => update('hours', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <SearchableSelect
                label="Pièces"
                placeholder="Sélectionner..."
                options={(parts || []).map(p => ({ value: p.name, label: p.name }))}
                value={draft.parts || ''}
                onChange={(v) => update('parts', v)}
                addNewLabel="Ajouter une pièce"
                onAddNew={onAddPart}
              />
            </div>
            <div>
              <SearchableSelect
                label="Fournisseur"
                placeholder="Sélectionner..."
                options={supplierOptions}
                value={draft.supplier || ''}
                onChange={(v) => update('supplier', v)}
                addNewLabel="Ajouter un fournisseur"
                onAddNew={onAddSupplier}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Descriptif</label>
            <textarea className="w-full mt-1 rounded-lg border px-3 py-2" rows={4} value={draft.description || ''} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded-lg border border-gray-200" onClick={onClose}>Annuler</button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => { onSave(draft); onClose(); }}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
};
