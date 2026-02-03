

import { ChartDataPoint, Ticket, Alarm, AirQualityZone, SubMeter, Language, DataNode, DashboardWidget, AppModule } from './types';

const ENV = (import.meta as any).env || {};

export const MQTT_CONNECTION_INFO = {
  host: ENV.VITE_MQTT_DEFAULT_HOST || 'localhost',
  port: parseInt(ENV.VITE_MQTT_DEFAULT_PORT || '1883', 10),
  wsPort: parseInt(ENV.VITE_MQTT_DEFAULT_WS_PORT || '9001', 10),
  username: ENV.VITE_MQTT_DEFAULT_USERNAME || '',
  password: ENV.VITE_MQTT_DEFAULT_PASSWORD || '',
  protocol: ENV.VITE_MQTT_PROTOCOL || 'mqtt',
  wsProtocol: ENV.VITE_MQTT_WS_PROTOCOL || 'ws',
  secureProtocol: ENV.VITE_MQTT_SECURE_PROTOCOL || 'mqtts',
  label: 'Broker par défaut (Mosquitto local)',
  description: 'Utilise le broker exposé sur la machine (ports 1883/9001) pour connecter n8n ou d’autres clients.'
};

// Helper to generate random history
const genHistory = (base: number, variance: number, length = 24): ChartDataPoint[] =>
  Array.from({ length }, (_, i) => ({
    name: `${i}h`,
    value: Math.max(0, Math.floor(base + (Math.random() * variance) - (variance / 2))),
    expected: Math.floor(base),
  }));

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    electricity: 'Electricity',
    water: 'Water',
    heating: 'Heating',
    cold: 'Cooling',
    hvac: 'HVAC',
    airQuality: 'Air Quality',
    tickets: 'Tickets',
    reports: 'Reports',
    alarms: 'Alarms',
    ai: 'AI Assistant',
    allApps: 'All Apps',
    overview: 'Overview',
    settings: 'Settings',
    loginTitle: 'Sign In',
    localLogin: 'Local Account',
    enterpriseSSO: 'Enterprise SSO',
    email: 'Email / ID',
    password: 'Password',
    signIn: 'Sign In',
    logout: 'Log Out',
    createDashboard: 'Create Dashboard',
    widgetLibrary: 'Widget Library',
    editDashboard: 'Edit Dashboard',
    doneEditing: 'Done Editing',
    addToSidebar: 'Pin to Menu',
    removeFromSidebar: 'Unpin',
    deleteApp: 'Delete App',
    consumption: 'Consumption',
    facility: 'Facility',
    network: 'Network',
    floorPlans: 'Floor Plans',
    synoptic: 'Synoptic',
    building: 'Building',
    floor: 'Floor',
    office: 'Office',
    meetingRoom: 'Meeting Room',
    cafeteria: 'Cafeteria',
    kitchen: 'Kitchen',
    livingRoom: 'Living Room',
    bedroom: 'Bedroom',
    fitness: 'Fitness',
    logic: 'Logic Programming',
    knowledge: 'Knowledge Base',
    bookstore: 'Bookstore',
    // UI General
    properties: 'Properties',
    layers: 'Layers',
    objects: 'Objects',
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    back: 'Back',
    background: 'Background',
    changeImage: 'Change Image',
    label: 'Label',
    variable: 'Variable',
    addWidget: 'Add Widget',
    siteStructure: 'Site Structure',
    addDashboardRoot: 'Add Dashboard to Root',
    networkTabConfig: 'Configuration',
    networkTabWidgets: 'Widgets',
    networkTabImport: 'Import',
    enableComm: 'Enable communication',
    disableComm: 'Disable communication',
    style: 'Style',
    fillColor: 'Fill Color',
    strokeColor: 'Stroke Color',
    fontSize: 'Font Size',
    transparent: 'Transparent',
    none: 'None',
    noData: 'No Data',
    selectObject: 'Select Object',
    addObject: 'Add Object',
    metricConfig: 'Metric Config',
    gradient: 'Gradient',
    min: 'Min',
    max: 'Max',
    units: 'Units'
  },
  fr: {
    dashboard: 'Tableau de bord',
    electricity: 'Électricité',
    water: 'Eau',
    heating: 'Chauffage',
    cold: 'Froid',
    hvac: 'CVC',
    airQuality: 'Qualité d\'Air',
    tickets: 'Tickets',
    reports: 'Rapports',
    alarms: 'Alarmes',
    ai: 'Assistant IA',
    allApps: 'Toutes les Apps',
    overview: 'Vue d\'ensemble',
    settings: 'Paramètres',
    loginTitle: 'Connexion',
    localLogin: 'Compte Local',
    enterpriseSSO: 'SSO Entreprise',
    email: 'Email / ID',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    logout: 'Déconnexion',
    createDashboard: 'Créer Tableau',
    widgetLibrary: 'Bibliothèque Widgets',
    editDashboard: 'Modifier',
    doneEditing: 'Terminé',
    addToSidebar: 'Épingler au menu',
    removeFromSidebar: 'Détacher',
    deleteApp: 'Supprimer App',
    consumption: 'Consommation',
    facility: 'Installations',
    network: 'Réseau',
    floorPlans: 'Plans d\'étage',
    synoptic: 'Synoptique',
    building: 'Bâtiment',
    floor: 'Étage',
    office: 'Bureau',
    meetingRoom: 'Salle de Réunion',
    cafeteria: 'Cafétéria',
    kitchen: 'Cuisine',
    livingRoom: 'Salon',
    bedroom: 'Chambre',
    fitness: 'Fitness',
    logic: 'Programmation Logique',
    knowledge: 'Base de Connaissances',
    bookstore: 'Librairie',
    // UI General
    properties: 'Propriétés',
    layers: 'Calques',
    objects: 'Objets',
    save: 'Enregistrer',
    delete: 'Supprimer',
    cancel: 'Annuler',
    back: 'Retour',
    background: 'Arrière-plan',
    changeImage: 'Changer Image',
    label: 'Libellé',
    variable: 'Variable',
    addWidget: 'Ajouter un widget',
    siteStructure: 'Structure du site',
    addDashboardRoot: 'Ajouter un tableau racine',
    networkTabConfig: 'Configuration',
    networkTabWidgets: 'Widgets',
    networkTabImport: 'Import',
    enableComm: 'Activer la communication',
    disableComm: 'Désactiver la communication',
    style: 'Style',
    fillColor: 'Couleur Remplissage',
    strokeColor: 'Couleur Contour',
    fontSize: 'Taille Police',
    transparent: 'Transparent',
    none: 'Aucun',
    noData: 'Aucune Donnée',
    selectObject: 'Sélectionner Objet',
    addObject: 'Ajouter Objet',
    metricConfig: 'Config. Métrique',
    gradient: 'Dégradé',
    min: 'Min',
    max: 'Max',
    units: 'Unités'
  }
};

export const MOCK_CHART_DATA: Record<string, ChartDataPoint[]> = {
  j: Array.from({ length: 24 }, (_, i) => ({
    name: `${i}h`,
    value: Math.floor(Math.random() * 50) + 100,
    value2: Math.floor(Math.random() * 30) + 50,
    value3: Math.floor(Math.random() * 40) + 80,
    total: 0
  })),
  m: Array.from({ length: 30 }, (_, i) => ({
    name: `J${i + 1}`,
    value: Math.floor(Math.random() * 1000) + 2000,
    value2: Math.floor(Math.random() * 500) + 1000,
    value3: Math.floor(Math.random() * 800) + 1500,
    total: 0
  })),
  a: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({
    name: m,
    value: Math.floor(Math.random() * 10000) + 20000,
    value2: Math.floor(Math.random() * 5000) + 10000,
    value3: Math.floor(Math.random() * 8000) + 15000,
    total: 0
  })),
  d: Array.from({ length: 10 }, (_, i) => ({
    name: `${2015 + i}`,
    value: Math.floor(Math.random() * 100000) + 300000,
    value2: Math.floor(Math.random() * 50000) + 150000,
    value3: Math.floor(Math.random() * 80000) + 200000,
    total: 0
  }))
};

export const INITIAL_SITE_TREE: DataNode[] = [
  {
    id: 'site_1',
    label: 'Campus Eclypse',
    type: 'site',
    children: [
      {
        id: 'bldg_A',
        label: 'Main Building',
        type: 'building',
        children: [
          {
            id: 'fl_1',
            label: 'Floor 1',
            type: 'floor',
            children: [
              {
                id: 'eq_ahu_1',
                label: 'AHU-01 South',
                type: 'equipment',
                children: [
                  { id: 'var_temp_supply', label: 'Supply Temp', type: 'variable', value: 21.5, unit: '°C' },
                  { id: 'var_temp_return', label: 'Return Temp', type: 'variable', value: 23.0, unit: '°C' },
                  { id: 'var_fan_speed', label: 'Fan Speed', type: 'variable', value: 75, unit: '%' },
                  { id: 'var_co2', label: 'CO2 Level', type: 'variable', value: 450, unit: 'ppm' },
                  { id: 'var_filter_diff', label: 'Filter Diff Pressure', type: 'variable', value: 45, unit: 'Pa' },
                  { id: 'var_valve_heat', label: 'Heating Valve', type: 'variable', value: 0, unit: '%' },
                  { id: 'var_pump_status', label: 'Pump Status', type: 'variable', dataType: 'boolean', value: true, unit: '', priorityArray: { 16: true }, fallbackValue: false },
                  { id: 'var_valve_cool', label: 'Cooling Valve', type: 'variable', value: 45, unit: '%' },
                ]
              },
              {
                id: 'zone_101',
                label: 'Office 101',
                type: 'space',
                children: [
                  { id: 'var_z1_temp', label: 'Room Temp', type: 'variable', value: 22.5, unit: '°C', mqttTopic: 'campus/bldg_a/f1/z101/temp' },
                  { id: 'var_z1_sp', label: 'Setpoint', type: 'variable', value: 22.0, unit: '°C' },
                  { id: 'var_z1_occ', label: 'Occupancy', type: 'variable', value: 1, unit: '' },
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'bldg_B',
        label: 'Science Lab',
        type: 'building',
        children: []
      },
      {
        id: 'meters',
        label: 'Main Meters',
        type: 'folder',
        children: [
          { id: 'var_main_elec', label: 'Main Elec', type: 'variable', value: 450, unit: 'kW', mqttTopic: 'campus/energy/elec' },
          { id: 'var_main_water', label: 'Main Water', type: 'variable', value: 12, unit: 'm3/h' },
          { id: 'var_main_gas', label: 'Main Gas', type: 'variable', value: 4.5, unit: 'm3/h' }
        ]
      },
      {
        id: 'logic_vars',
        label: 'Logic Variables',
        type: 'folder',
        children: [] // Will be populated by logic editor outputs
      }
    ]
  }
];

// Consolidated Module List (Apps + Tabs)
export const INITIAL_MODULES: AppModule[] = [
  { id: 'dashboard', label: 'dashboard', iconKey: 'LayoutDashboard', type: 'dashboard', color: 'red', description: 'Central Overview', isRemovable: false, isPinned: true },
  {
    id: 'consumption_folder', label: 'consumption', iconKey: 'Zap', type: 'folder', color: 'gray', isRemovable: false, isPinned: true, isOpen: true,
    children: [
      { id: 'energy', label: 'electricity', iconKey: 'Zap', type: 'dashboard', color: 'red', description: 'Consumption Monitor', isRemovable: true, isPinned: true },
      { id: 'fluids', label: 'water', iconKey: 'Droplets', type: 'dashboard', color: 'blue', description: 'Water Usage', isRemovable: true, isPinned: true },
      { id: 'air_quality', label: 'Qualité d\'Air', iconKey: 'Wind', type: 'dashboard', color: 'green', description: 'Air Quality Monitoring', isRemovable: true, isPinned: true },
    ]
  },
  {
    id: 'facility_folder', label: 'facility', iconKey: 'Building', type: 'folder', color: 'gray', isRemovable: false, isPinned: true, isOpen: true,
    children: [
      {
        id: 'hvac_folder', label: 'HVAC', iconKey: 'Wind', type: 'folder', color: 'red', isRemovable: false, isPinned: true, isOpen: true,
        children: [
          { id: 'hvac', label: 'Vue Générale', iconKey: 'Wind', type: 'dashboard', color: 'red', description: 'Air Systems', isRemovable: true, isPinned: true },
          { id: 'hvac_cta', label: 'Module CTA', iconKey: 'Activity', type: 'dashboard', color: 'blue', description: 'Centrale de Traitement d\'Air', isRemovable: true, isPinned: true },
        ]
      },
      { id: 'equipment_availability', label: 'Disponibilité Équipement', iconKey: 'Server', type: 'dashboard', color: 'green', description: 'Equipment Availability', isRemovable: true, isPinned: true },
      { id: 'tickets', label: 'tickets', iconKey: 'Wrench', type: 'dashboard', color: 'orange', description: 'Maintenance', isRemovable: true, isPinned: true },
      {
        id: 'gmao_folder', label: 'GMAO', iconKey: 'ClipboardList', type: 'folder', color: 'red', isRemovable: false, isPinned: true, isOpen: true,
        children: [
          { id: 'gmao', label: 'Gestion GMAO', iconKey: 'ClipboardList', type: 'dashboard', color: 'red', description: 'Maintenance Management', isRemovable: true, isPinned: true },
          { id: 'gmao_tickets', label: 'Tickets Maintenance', iconKey: 'Ticket', type: 'dashboard', color: 'orange', description: 'Tickets de maintenance', isRemovable: true, isPinned: true },
          { id: 'teams_users', label: 'Équipes / Utilisateurs', iconKey: 'Users', type: 'dashboard', color: 'blue', description: 'Gestion des équipes et utilisateurs', isRemovable: true, isPinned: true },
        ]
      },
    ]
  },
  {
    id: 'synoptic_folder', label: 'synoptic', iconKey: 'Monitor', type: 'folder', color: 'gray', isRemovable: false, isPinned: true, isOpen: true,
    children: [
      { id: 'syn_building', label: 'building', iconKey: 'Building', type: 'dashboard', color: 'red', description: 'Whole Building', isRemovable: true, isPinned: true },
      { id: 'syn_floor', label: 'floor', iconKey: 'Layers', type: 'dashboard', color: 'red', description: 'Floor Level', isRemovable: true, isPinned: true },
      { id: 'syn_office', label: 'office', iconKey: 'Briefcase', type: 'dashboard', color: 'gray', description: 'Workspaces', isRemovable: true, isPinned: true },
      { id: 'syn_meeting', label: 'meetingRoom', iconKey: 'Users', type: 'dashboard', color: 'red', description: 'Meeting Areas', isRemovable: true, isPinned: true },
      { id: 'syn_cafeteria', label: 'cafeteria', iconKey: 'Coffee', type: 'dashboard', color: 'orange', description: 'Break Area', isRemovable: true, isPinned: true },
      { id: 'syn_kitchen', label: 'kitchen', iconKey: 'Utensils', type: 'dashboard', color: 'red', description: 'Cooking Area', isRemovable: true, isPinned: true },
      { id: 'syn_living', label: 'livingRoom', iconKey: 'Armchair', type: 'dashboard', color: 'green', description: 'Lounge', isRemovable: true, isPinned: true },
      { id: 'syn_bedroom', label: 'bedroom', iconKey: 'Bed', type: 'dashboard', color: 'purple', description: 'Accommodation', isRemovable: true, isPinned: true },
      { id: 'syn_fitness', label: 'fitness', iconKey: 'Dumbbell', type: 'dashboard', color: 'cyan', description: 'Gym', isRemovable: true, isPinned: true },
    ]
  },
  { id: 'floor_plans', label: 'floorPlans', iconKey: 'Map', type: 'dashboard', color: 'red', description: 'Zone Monitoring', isRemovable: true, isPinned: true },
  { id: 'logic_app', label: 'logic', iconKey: 'Workflow', type: 'dashboard', color: 'purple', description: 'Logic Editor', isRemovable: true, isPinned: true },
  { id: 'mqtt', label: 'MQTT', iconKey: 'Radio', type: 'dashboard', color: 'indigo', description: 'MQTT Dashboard', isRemovable: true, isPinned: true },
  { id: 'network', label: 'network', iconKey: 'Wifi', type: 'dashboard', color: 'orange', description: 'Driver Connectivity', isRemovable: false, isPinned: true },
  { id: 'apps', label: 'allApps', iconKey: 'LayoutGrid', type: 'system', color: 'gray', description: 'Application Launcher', isRemovable: false, isPinned: true },
  { id: 'ai', label: 'ai', iconKey: 'Sparkles', type: 'ai', color: 'red', description: 'Smart Assistant', isRemovable: false, isPinned: true },
  { id: 'knowledge', label: 'knowledge', iconKey: 'BookOpen', type: 'dashboard', color: 'indigo', description: 'RAG Knowledge Base', isRemovable: false, isPinned: true },
  { id: 'reports', label: 'reports', iconKey: 'FileText', type: 'dashboard', color: 'green', description: 'Generated Reports', isRemovable: true, isPinned: false },
  { id: 'settings', label: 'settings', iconKey: 'Settings', type: 'settings', color: 'gray', description: 'System Config', isRemovable: false, isPinned: true },
  { id: 'hvac_library', label: 'bookstore', iconKey: 'BookOpen', type: 'dashboard', color: 'indigo', description: 'Inventory', isRemovable: true, isPinned: false }
];

// Initial layouts for the modules above
export const INITIAL_DASHBOARDS: Record<string, DashboardWidget[]> = {
  dashboard: [
    // ROW 1: Weather & Key Metrics
    {
      id: 'w_weather', type: 'weather', title: 'Site Conditions', colSpan: 1, height: 260,
      weatherConfig: { location: 'Lausanne', units: 'C' }
    },
    {
      id: 'w_kpi_elec', type: 'kpi', title: 'Total Power', colSpan: 1, height: 260, colorTheme: 'orange',
      variables: [{ id: 'var_main_elec', label: 'Main Grid', unit: 'kW' }]
    },
    {
      id: 'w_kpi_water', type: 'kpi', title: 'Water Flow', colSpan: 1, height: 260, colorTheme: 'blue',
      variables: [{ id: 'var_main_water', label: 'Main Water', unit: 'm3/h' }]
    },
    {
      id: 'w_kpi_co2', type: 'kpi', title: 'Avg Air Quality', colSpan: 1, height: 260, colorTheme: 'green',
      variables: [{ id: 'var_co2', label: 'Site Avg', unit: 'ppm' }]
    },
    // ROW 2
    {
      id: 'w_chart_main', type: 'chart', chartType: 'area', title: 'Campus Energy Profile', subtitle: 'Real-time demand',
      colSpan: 3, height: 450, colorTheme: 'orange',
      variables: [{ id: 'var_main_elec', label: 'Electricity Demand', color: '#f97316', unit: 'kW' }]
    },
    {
      id: 'w_databox', type: 'databox', title: 'AHU-01 Telemetry', colSpan: 1, height: 450,
      variables: [
        { id: 'var_temp_supply', label: 'Supply Temp', unit: '°C' },
        { id: 'var_temp_return', label: 'Return Temp', unit: '°C' },
        { id: 'var_fan_speed', label: 'Fan Speed', unit: '%' },
        { id: 'var_co2', label: 'CO2 Level', unit: 'ppm' }
      ],
      databoxConfig: {
        showHeader: true, headerText: 'Critical Sensors', showImage: false, showLabels: true,
        nodes: [
          { id: 'var_temp_supply', color: '#ef4444', numberFormat: '#.0', showTrend: true },
          { id: 'var_temp_return', color: '#3b82f6', numberFormat: '#.0' },
          { id: 'var_fan_speed', color: '#10b981', showTrend: true, numberFormat: '# %' },
          { id: 'var_co2', color: '#8b5cf6', showPriority: true }
        ]
      }
    },
    // ROW 3
    {
      id: 'w_hvac_ahu', type: 'hvac', title: 'AHU-01 Status', subtitle: 'Supply Fan', colSpan: 1, height: 300,
      hvacConfig: { symbol: 'fan_axial', orientation: 'right', showValue: true, animate: true },
      variables: [{ id: 'var_fan_speed', label: 'Speed', unit: '%' }]
    },
    {
      id: 'w_zone_main', type: 'zone', title: 'Lobby Climate', subtitle: 'Zone 1 Control', colSpan: 1, height: 300,
      variables: [{ id: 'var_temp_return', label: 'Current', unit: '°C' }, { id: 'var_co2', label: 'CO2', unit: 'ppm' }],
      zoneConfig: { tempId: 'var_temp_return', co2Id: 'var_co2' }
    },
    {
      id: 'w_alarm', type: 'alarm', title: 'Active Alarms', colSpan: 2, height: 300,
      alarmConfig: { minPriority: 'Info' }
    },
    {
      id: 'w_predictive', type: 'predictive', title: 'Predictive Maintenance', colSpan: 2, height: 300
    }
  ],

  reports: [
    { id: 'r_list', type: 'table', title: 'Generated Reports', colSpan: 4, height: 400, customData: [{ Date: '2023-10-01', Name: 'Monthly Energy', Format: 'PDF', Size: '1.2 MB' }, { Date: '2023-10-02', Name: 'Alarm History', Format: 'CSV', Size: '45 KB' }] }
  ],

  tickets: [
    { id: 't_list', type: 'table', title: 'Maintenance Tickets', colSpan: 4, height: 500, customData: [{ ID: 'T-101', Priority: 'High', Issue: 'AHU-01 Belt', Status: 'Open', Assigned: 'John D.' }, { ID: 'T-102', Priority: 'Low', Issue: 'Leaky Faucet 2F', Status: 'Pending', Assigned: 'Mike S.' }] }
  ],

  // Dashboard Électricité - Consommation énergétique
  energy: [
    // ROW 1: Graphique principal de consommation
    {
      id: 'e_chart_main', type: 'chart', chartType: 'bar', title: 'Consommation Électrique Mensuelle', subtitle: 'Éclairage | Équipements | CVC',
      colSpan: 4, height: 350, colorTheme: 'orange',
      variables: [
        { id: 'var_main_elec', label: 'Éclairage', color: '#fbbf24', unit: 'kWh' },
        { id: 'var_fan_speed', label: 'Équipements', color: '#1f2937', unit: 'kWh' },
        { id: 'var_valve_cool', label: 'CVC', color: '#3b82f6', unit: 'kWh' }
      ]
    },
    // ROW 2: KPIs principaux
    {
      id: 'e_kpi_total', type: 'kpi', title: 'Consommation Totale', colSpan: 1, height: 180, colorTheme: 'orange',
      staticData: { value: 52786, unit: 'kWh' }
    },
    {
      id: 'e_kpi_lighting', type: 'kpi', title: 'Éclairage', colSpan: 1, height: 180, colorTheme: 'default',
      staticData: { value: 5173, unit: 'kWh' }
    },
    {
      id: 'e_kpi_hvac', type: 'kpi', title: 'CVC', colSpan: 1, height: 180, colorTheme: 'blue',
      staticData: { value: 210, unit: 'kWh' }
    },
    {
      id: 'e_kpi_equipment', type: 'kpi', title: 'Équipements', colSpan: 1, height: 180, colorTheme: 'green',
      staticData: { value: 12450, unit: 'kWh' }
    },
    // ROW 3: Consommation par étage
    {
      id: 'e_chart_floor', type: 'chart', chartType: 'bar', title: 'Consommation par Étage - Mars 2023', subtitle: 'Répartition spatiale',
      colSpan: 4, height: 300, colorTheme: 'blue',
      variables: [
        { id: 'var_main_elec', label: 'Étage 1', color: '#1f2937', unit: 'kWh' },
        { id: 'var_fan_speed', label: 'Étage 2', color: '#3b82f6', unit: 'kWh' }
      ]
    },
    // ROW 4: Évolution temporelle
    {
      id: 'e_chart_trend', type: 'chart', chartType: 'line', title: 'Tendance Annuelle', subtitle: 'Comparaison N-1',
      colSpan: 2, height: 280, colorTheme: 'green',
      variables: [
        { id: 'var_main_elec', label: 'Cette année', color: '#22c55e', unit: 'kWh' },
        { id: 'var_main_water', label: 'Année précédente', color: '#9ca3af', unit: 'kWh' }
      ]
    },
    {
      id: 'e_gauge', type: 'gauge', title: 'Performance Énergétique', colSpan: 1, height: 280,
      staticData: { value: 78, min: 0, max: 100, unit: '%' }
    },
    {
      id: 'e_alarm', type: 'alarm', title: 'Alertes Consommation', colSpan: 1, height: 280,
      alarmConfig: { minPriority: 'Major' }
    }
  ],

  // Dashboard Eau (Fluids)
  fluids: [
    {
      id: 'f_kpi_total', type: 'kpi', title: 'Consommation Eau Totale', colSpan: 1, height: 180, colorTheme: 'blue',
      variables: [{ id: 'var_main_water', label: 'Total', unit: 'm³' }]
    },
    {
      id: 'f_chart', type: 'chart', chartType: 'area', title: 'Consommation Eau', colSpan: 3, height: 350, colorTheme: 'blue',
      variables: [{ id: 'var_main_water', label: 'Eau', color: '#3b82f6', unit: 'm³/h' }]
    },
    {
      id: 'f_gauge', type: 'gauge', title: 'Pression Réseau', colSpan: 1, height: 250,
      staticData: { value: 4.2, min: 0, max: 10, unit: 'bar' }
    },
    {
      id: 'f_alarm', type: 'alarm', title: 'Alertes Fuites', colSpan: 3, height: 250,
      alarmConfig: { minPriority: 'Major' }
    }
  ],

  // Dashboard Tickets de Maintenance GMAO
  gmao_tickets: [
    // ROW 1: Graphique des tickets par domaine
    {
      id: 'gt_chart_domain', type: 'chart', chartType: 'bar', title: 'Activité des Tickets en Cours', subtitle: 'Tous domaines de maintenance',
      colSpan: 4, height: 350, colorTheme: 'orange',
      variables: [
        { id: 'var_main_elec', label: 'Planifié', color: '#22c55e', unit: '' },
        { id: 'var_fan_speed', label: 'En cours', color: '#f59e0b', unit: '' },
        { id: 'var_valve_cool', label: 'Terminé', color: '#1f2937', unit: '' },
        { id: 'var_main_water', label: 'Non résolu', color: '#ef4444', unit: '' }
      ]
    },
    // ROW 2: KPIs principaux
    {
      id: 'gt_kpi_total', type: 'kpi', title: 'Tickets Cette Année', colSpan: 1, height: 180, colorTheme: 'blue',
      staticData: { value: 349, unit: '' }
    },
    {
      id: 'gt_kpi_progress', type: 'kpi', title: 'En Cours', colSpan: 1, height: 180, colorTheme: 'orange',
      staticData: { value: 10, unit: '' }
    },
    {
      id: 'gt_kpi_open', type: 'kpi', title: 'Non Résolus', colSpan: 1, height: 180, colorTheme: 'default',
      staticData: { value: 3, unit: '' }
    },
    {
      id: 'gt_kpi_closed', type: 'kpi', title: 'Résolus Ce Mois', colSpan: 1, height: 180, colorTheme: 'green',
      staticData: { value: 42, unit: '' }
    },
    // ROW 3: Camembert et Tableau
    {
      id: 'gt_pie', type: 'chart', chartType: 'pie', title: 'Activité des Tickets en Cours', colSpan: 1, height: 350, colorTheme: 'blue',
      variables: [
        { id: 'var_main_elec', label: 'CVC', color: '#1f2937', unit: '' },
        { id: 'var_fan_speed', label: 'Électricité', color: '#3b82f6', unit: '' },
        { id: 'var_valve_cool', label: 'Plomberie', color: '#22c55e', unit: '' },
        { id: 'var_main_water', label: 'Autre', color: '#f59e0b', unit: '' }
      ]
    },
    {
      id: 'gt_table', type: 'table', title: 'Tableau des Tickets', colSpan: 3, height: 350,
      customData: [
        { ID: 'T-2023-001', Catégorie: 'Climatisation', Description: 'Climatisation obsolète', Priorité: 'partiaire', Date: '21 juin 2023' },
        { ID: 'T-2023-002', Catégorie: 'Climatisation', Description: 'Installation climatisation', Priorité: 'totale', Date: '21 juin 2023' },
        { ID: 'T-2023-003', Catégorie: 'Climatisation', Description: 'Réparation climatisation', Priorité: 'partielle', Date: '21 juin 2023' },
        { ID: 'T-2023-004', Catégorie: 'Électricité', Description: 'Remplacement disjoncteur', Priorité: 'urgente', Date: '20 juin 2023' },
        { ID: 'T-2023-005', Catégorie: 'Plomberie', Description: 'Fuite robinet 2F', Priorité: 'normale', Date: '19 juin 2023' }
      ]
    }
  ],

  // Dashboard Qualité d'Air
  air_quality: [
    // ROW 1: KPIs de qualité d'air par niveau
    {
      id: 'aq_kpi_good', type: 'kpi', title: 'Bon', colSpan: 1, height: 150, colorTheme: 'green',
      staticData: { value: 349, unit: 'zones' }
    },
    {
      id: 'aq_kpi_moderate', type: 'kpi', title: 'Modéré', colSpan: 1, height: 150, colorTheme: 'orange',
      staticData: { value: 45, unit: 'zones' }
    },
    {
      id: 'aq_kpi_unhealthy', type: 'kpi', title: 'Mauvais', colSpan: 1, height: 150, colorTheme: 'default',
      staticData: { value: 12, unit: 'zones' }
    },
    {
      id: 'aq_kpi_hazardous', type: 'kpi', title: 'Dangereux', colSpan: 1, height: 150, colorTheme: 'default',
      staticData: { value: 3, unit: 'zones' }
    },
    // ROW 2: Tableau par étage
    {
      id: 'aq_table_floors', type: 'table', title: 'Étages Sélectionnés', colSpan: 4, height: 350,
      customData: [
        { Étage: 'A-01-08 Salle des réunions 107', Bon: '██████████', Modéré: '███', Mauvais: '█', Status: 'Stable' },
        { Étage: 'A-02-04 Bureau Direction', Bon: '████████', Modéré: '████', Mauvais: '██', Status: 'Stable' },
        { Étage: 'A-03-01 Open Space', Bon: '██████', Modéré: '██████', Mauvais: '███', Status: 'À surveiller' },
        { Étage: 'A-04-02 Cafétéria', Bon: '███████████', Modéré: '██', Mauvais: '', Status: 'Excellent' },
        { Étage: 'A-05-03 Salle serveurs', Bon: '████', Modéré: '███', Mauvais: '████', Status: 'Alerte' }
      ]
    },
    // ROW 3: Camemberts statistiques
    {
      id: 'aq_pie_global', type: 'chart', chartType: 'pie', title: 'Global Stat - Répartition CO2', colSpan: 2, height: 320, colorTheme: 'green',
      variables: [
        { id: 'var_co2', label: 'Bon (<800ppm)', color: '#22c55e', unit: '' },
        { id: 'var_temp_supply', label: 'Modéré (800-1000)', color: '#f59e0b', unit: '' },
        { id: 'var_temp_return', label: 'Mauvais (1000-1500)', color: '#ef4444', unit: '' },
        { id: 'var_fan_speed', label: 'Dangereux (>1500)', color: '#7f1d1d', unit: '' }
      ]
    },
    {
      id: 'aq_pie_distribution', type: 'chart', chartType: 'pie', title: 'Global Stat - Par Zone', colSpan: 2, height: 320, colorTheme: 'blue',
      variables: [
        { id: 'var_main_elec', label: 'Bureaux', color: '#3b82f6', unit: '' },
        { id: 'var_fan_speed', label: 'Salles réunion', color: '#22c55e', unit: '' },
        { id: 'var_valve_cool', label: 'Espaces communs', color: '#f59e0b', unit: '' },
        { id: 'var_main_water', label: 'Technique', color: '#8b5cf6', unit: '' }
      ]
    },
    // ROW 4: Graphique évolution CO2
    {
      id: 'aq_chart_co2', type: 'chart', chartType: 'area', title: 'Évolution CO2 - 24h', colSpan: 4, height: 300, colorTheme: 'green',
      variables: [
        { id: 'var_co2', label: 'CO2 moyen', color: '#22c55e', unit: 'ppm' },
        { id: 'var_temp_return', label: 'Seuil alerte', color: '#ef4444', unit: 'ppm' }
      ]
    }
  ],

  // Dashboard Disponibilité Équipement
  equipment_availability: [
    // ROW 1: Jauges principales
    {
      id: 'ea_gauge_monitored', type: 'gauge', title: 'Espaces Monitorés', colSpan: 2, height: 200,
      staticData: { value: 89, min: 0, max: 100, unit: '%' }
    },
    {
      id: 'ea_gauge_automats', type: 'gauge', title: 'Automates Connectés', colSpan: 2, height: 200,
      staticData: { value: 90, min: 0, max: 100, unit: '%' }
    },
    // ROW 2: KPIs détails éléments connectés
    {
      id: 'ea_kpi_multi', type: 'kpi', title: 'Multicapteurs', colSpan: 1, height: 180, colorTheme: 'blue',
      staticData: { value: 5000, unit: '' }
    },
    {
      id: 'ea_kpi_contacts', type: 'kpi', title: 'Contacts de Fenêtres', colSpan: 1, height: 180, colorTheme: 'green',
      staticData: { value: 3000, unit: '' }
    },
    {
      id: 'ea_kpi_telecom', type: 'kpi', title: 'Télécommandes', colSpan: 1, height: 180, colorTheme: 'orange',
      staticData: { value: 1000, unit: '' }
    },
    {
      id: 'ea_kpi_stores', type: 'kpi', title: 'Stores', colSpan: 1, height: 180, colorTheme: 'default',
      staticData: { value: 1000, unit: '' }
    },
    // ROW 3: Tableau de disponibilité
    {
      id: 'ea_table', type: 'table', title: 'Détail des Éléments Connectés', colSpan: 4, height: 350,
      customData: [
        { Type: 'Multicapteurs', Total: 5000, Connectés: 4823, Défaut: 177, Taux: '96.5%' },
        { Type: 'Contacts fenêtres', Total: 3000, Connectés: 2890, Défaut: 110, Taux: '96.3%' },
        { Type: 'Télécommandes', Total: 1000, Connectés: 823, Défaut: 177, Taux: '82.3%' },
        { Type: 'Stores', Total: 1000, Connectés: 950, Défaut: 50, Taux: '95.0%' }
      ]
    }
  ],

  // Dashboard Module CTA (Centrale de Traitement d'Air)
  hvac_cta: [
    // ROW 1: Graphiques débit air
    {
      id: 'cta_chart_airflow', type: 'chart', chartType: 'bar', title: 'Rapport CTA - Débits Air', subtitle: 'Mesure vs Configuration',
      colSpan: 2, height: 300, colorTheme: 'blue',
      variables: [
        { id: 'var_fan_speed', label: 'Air extrait', color: '#3b82f6', unit: 'm³/h' },
        { id: 'var_temp_supply', label: 'Air soufflé', color: '#f59e0b', unit: 'm³/h' }
      ]
    },
    {
      id: 'cta_gauge_efficiency', type: 'gauge', title: 'Efficacité Échangeur', colSpan: 1, height: 300,
      staticData: { value: 40, min: 0, max: 100, unit: '%' }
    },
    {
      id: 'cta_kpi_efficiency', type: 'kpi', title: 'Efficacité = 40%', colSpan: 1, height: 300, colorTheme: 'orange',
      staticData: { value: 40, unit: '%' }
    },
    // ROW 2: Tableau débits
    {
      id: 'cta_table_flow', type: 'table', title: 'Débits Mesurés vs Configurés', colSpan: 2, height: 280,
      customData: [
        { Groupe: 'Groupe 1', Extraction: '3500', Configuration: '4000', Écart: '-12.5%' },
        { Groupe: 'Groupe 2', Extraction: '2899', Configuration: '3000', Écart: '-3.4%' },
        { Groupe: 'Groupe 3', Extraction: '2999', Configuration: '3500', Écart: '-14.3%' }
      ]
    },
    {
      id: 'cta_table_schedule', type: 'table', title: 'Horaires Échangeur Rotatif', colSpan: 2, height: 280,
      customData: [
        { Jour: 'Lundi', Début: '06:00', Fin: '22:00', Durée: '16h' },
        { Jour: 'Mardi', Début: '06:00', Fin: '22:00', Durée: '16h' },
        { Jour: 'Mercredi', Début: '06:00', Fin: '22:00', Durée: '16h' },
        { Jour: 'Jeudi', Début: '06:00', Fin: '22:00', Durée: '16h' },
        { Jour: 'Vendredi', Début: '06:00', Fin: '18:00', Durée: '12h' }
      ]
    },
    // ROW 3: Consommation ventilateurs
    {
      id: 'cta_chart_consumption', type: 'chart', chartType: 'bar', title: 'Consommation des Ventilateurs', subtitle: 'Écart configuration = -23%',
      colSpan: 2, height: 320, colorTheme: 'orange',
      variables: [
        { id: 'var_main_elec', label: 'Air soufflé', color: '#f59e0b', unit: 'kWh' },
        { id: 'var_fan_speed', label: 'Air extrait', color: '#3b82f6', unit: 'kWh' }
      ]
    },
    // ROW 3: Énergie thermique
    {
      id: 'cta_chart_thermal', type: 'chart', chartType: 'bar', title: 'Énergie Thermique', subtitle: 'Écart batterie + aux = 3%',
      colSpan: 2, height: 320, colorTheme: 'green',
      variables: [
        { id: 'var_temp_supply', label: 'Énergie récupérée', color: '#22c55e', unit: 'kWh' },
        { id: 'var_temp_return', label: 'Énergie batterie', color: '#f59e0b', unit: 'kWh' }
      ]
    }
  ],

  // --- Synoptic Tabs (Populated) ---
  syn_building: [
    { id: 'sb_weather', type: 'weather', title: 'External', colSpan: 1, height: 250, weatherConfig: { location: 'Montreal', units: 'C' } },
    { id: 'sb_kpi_pwr', type: 'kpi', title: 'Total Power', colSpan: 1, height: 120, colorTheme: 'orange', variables: [{ id: 'var_main_elec', label: 'KW', unit: 'kW' }] },
    { id: 'sb_kpi_wtr', type: 'kpi', title: 'Total Water', colSpan: 1, height: 120, colorTheme: 'blue', variables: [{ id: 'var_main_water', label: 'Flow', unit: 'm3' }] },
    { id: 'sb_alarm', type: 'alarm', title: 'Building Alarms', colSpan: 2, height: 250, alarmConfig: { minPriority: 'Info' } },
    { id: 'sb_chart', type: 'chart', chartType: 'area', title: 'Global Consumption', colSpan: 4, height: 300, variables: [{ id: 'var_main_elec', label: 'Power', color: '#f97316' }] }
  ],

  syn_floor: [
    { id: 'sf_fp', type: 'floorplan', title: 'Floor Overview', colSpan: 3, height: 400, floorPlanConfig: { imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop', objects: [], layers: [{ id: 'def', name: 'Base', visible: true, gradient: 'none' }] } },
    { id: 'sf_kpi_occ', type: 'kpi', title: 'Occupancy', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 45, unit: 'ppl' } },
    { id: 'sf_kpi_avg', type: 'kpi', title: 'Avg Temp', colSpan: 1, height: 150, colorTheme: 'blue', staticData: { value: 22.4, unit: '°C' } },
    { id: 'sf_vav_list', type: 'databox', title: 'VAV Status', colSpan: 1, height: 400, databoxConfig: { showHeader: true, headerText: 'VAV Boxes', nodes: [{ id: 'vav_1', labelOverride: 'VAV-01', color: 'green' }, { id: 'vav_2', labelOverride: 'VAV-02', color: 'green' }, { id: 'vav_3', labelOverride: 'VAV-03', color: 'orange' }] } }
  ],

  syn_office: [
    { id: 'so_zone', type: 'zone', title: 'Office 101 Control', colSpan: 1, height: 300, variables: [{ id: 'var_z1_temp', label: 'Room', unit: '°C' }, { id: 'var_z1_sp', label: 'Set', unit: '°C' }], zoneConfig: { tempId: 'var_z1_temp', setpointId: 'var_z1_sp' } },
    { id: 'so_chart', type: 'chart', chartType: 'line', title: '24h Temperature', colSpan: 2, height: 300, variables: [{ id: 'var_z1_temp', label: 'Temp', color: '#3b82f6' }, { id: 'var_z1_sp', label: 'Set', color: '#9ca3af' }] },
    { id: 'so_light', type: 'slider', title: 'Lighting', colSpan: 1, height: 140, staticData: { value: 80, min: 0, max: 100, unit: '%' } },
    { id: 'so_blinds', type: 'slider', title: 'Blinds', colSpan: 1, height: 140, staticData: { value: 0, min: 0, max: 100, unit: '%' } }
  ],

  syn_meeting: [
    { id: 'sm_zone', type: 'zone', title: 'Conf Room Climate', colSpan: 1, height: 300, variables: [{ id: 'var_mtg_temp', label: 'Room', unit: '°C' }], zoneConfig: { tempId: 'var_mtg_temp' } },
    { id: 'sm_co2', type: 'gauge', title: 'Air Quality', colSpan: 1, height: 300, staticData: { value: 850, min: 400, max: 1200, unit: 'ppm' } },
    { id: 'sm_occ', type: 'kpi', title: 'Occupied', colSpan: 1, height: 140, colorTheme: 'green', staticData: { value: 'YES', unit: '' } },
    { id: 'sm_proj', type: 'hvac', title: 'Projector', colSpan: 1, height: 140, hvacConfig: { symbol: 'led', orientation: 'up', showValue: false, animate: false }, staticData: { value: 'ON' } }
  ],

  syn_cafeteria: [
    { id: 'sc_fridge1', type: 'thermometer', title: 'Fridge 1', colSpan: 1, height: 250, staticData: { value: 4.2, unit: '°C' } },
    { id: 'sc_fridge2', type: 'thermometer', title: 'Freezer', colSpan: 1, height: 250, staticData: { value: -18.5, unit: '°C' } },
    { id: 'sc_kpi_wtr', type: 'kpi', title: 'Kitchen Water', colSpan: 1, height: 120, colorTheme: 'blue', staticData: { value: 450, unit: 'L/h' } },
    { id: 'sc_hood', type: 'hvac', title: 'Extract Hood', colSpan: 1, height: 250, hvacConfig: { symbol: 'fan', orientation: 'up', showValue: true, animate: true }, staticData: { value: 100, unit: '%' } }
  ],

  syn_kitchen: [
    { id: 'sk_oven', type: 'hvac', title: 'Oven Status', colSpan: 1, height: 200, hvacConfig: { symbol: 'heater_electric', orientation: 'up', showValue: true, animate: true }, staticData: { value: 180, unit: '°C' } },
    { id: 'sk_gas', type: 'kpi', title: 'Gas Usage', colSpan: 1, height: 200, colorTheme: 'orange', staticData: { value: 2.1, unit: 'm3/h' } },
    { id: 'sk_leak', type: 'alarm', title: 'Safety Systems', colSpan: 2, height: 200, alarmConfig: { minPriority: 'Critical' } }
  ],

  syn_living: [
    { id: 'sl_zone', type: 'zone', title: 'Lounge', colSpan: 1, height: 300, variables: [{ id: 'var_lng_temp', label: 'Room', unit: '°C' }], zoneConfig: { tempId: 'var_lng_temp' } },
    { id: 'sl_scene', type: 'databox', title: 'Lighting Scenes', colSpan: 1, height: 300, databoxConfig: { showHeader: false, nodes: [{ id: 'sc_relax', labelOverride: 'Relax Mode', color: 'blue' }, { id: 'sc_read', labelOverride: 'Reading', color: 'yellow' }, { id: 'sc_bright', labelOverride: 'Full Bright', color: 'white' }] } },
    { id: 'sl_tv', type: 'hvac', title: 'TV Display', colSpan: 1, height: 200, hvacConfig: { symbol: 'led', orientation: 'up', showValue: false, animate: false }, staticData: { value: 'OFF' } }
  ],

  syn_bedroom: [
    { id: 'sbr_zone', type: 'zone', title: 'Master Bedroom', colSpan: 1, height: 300, variables: [{ id: 'var_bed_temp', label: 'Room', unit: '°C' }], zoneConfig: { tempId: 'var_bed_temp' } },
    { id: 'sbr_hum', type: 'kpi', title: 'Humidity', colSpan: 1, height: 150, colorTheme: 'blue', staticData: { value: 45, unit: '%' } },
    { id: 'sbr_win', type: 'hvac', title: 'Window Sensor', colSpan: 1, height: 150, hvacConfig: { symbol: 'radio', orientation: 'up', showValue: false, animate: false }, staticData: { value: 'CLOSED' } }
  ],

  syn_fitness: [
    { id: 'sfit_zone', type: 'zone', title: 'Gym AC', colSpan: 1, height: 300, variables: [{ id: 'var_gym_temp', label: 'Temp', unit: '°C' }], zoneConfig: { tempId: 'var_gym_temp' } },
    { id: 'sfit_co2', type: 'kpi', title: 'Air Quality', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 550, unit: 'ppm' } },
    { id: 'sfit_music', type: 'slider', title: 'Music Volume', colSpan: 1, height: 150, staticData: { value: 40, min: 0, max: 100, unit: '%' } },
    { id: 'sfit_chart', type: 'chart', chartType: 'bar', title: 'Gym Usage (Hrs)', colSpan: 4, height: 250 }
  ],

  logic_app: [
    { id: 'w_logic', type: 'logic', title: 'Logic Editor', colSpan: 4, height: 600, logicConfig: { blocks: [], connections: [] } }
  ],

  hvac_library: [
    { id: 'h_pump_run', type: 'hvac', title: 'Pump (Running)', subtitle: 'State: 2 (Green)', colSpan: 1, height: 220, hvacConfig: { symbol: 'pump', orientation: 'up', showValue: true, animate: true }, staticData: { value: 2 }, variables: [{ id: 'v_p1', label: 'Status', unit: '' }] },
    { id: 'h_pump_alarm', type: 'hvac', title: 'Pump (Alarm)', subtitle: 'State: 1 (Red)', colSpan: 1, height: 220, hvacConfig: { symbol: 'pump_circulator', orientation: 'right', showValue: true, animate: true }, staticData: { value: 1 }, variables: [{ id: 'v_p2', label: 'Status', unit: '' }] },
    { id: 'h_fan_var', type: 'hvac', title: 'Supply Fan', subtitle: 'Variable Speed', colSpan: 1, height: 220, hvacConfig: { symbol: 'fan_axial', orientation: 'left', showValue: true, animate: true }, staticData: { value: 85 }, variables: [{ id: 'v_f1', label: 'Speed', unit: '%' }] },
    { id: 'h_valve_3', type: 'hvac', title: 'Mixing Valve', subtitle: 'Modulating', colSpan: 1, height: 220, hvacConfig: { symbol: 'valve_3way', orientation: 'up', showValue: true, animate: true }, staticData: { value: 45 }, variables: [{ id: 'v_v1', label: 'Position', unit: '%' }] },
    { id: 'h_filter', type: 'hvac', title: 'Filter Status', subtitle: 'Dirty (Alarm)', colSpan: 1, height: 220, hvacConfig: { symbol: 'filter_bag', orientation: 'up', showValue: false, animate: false }, staticData: { value: 1 }, variables: [{ id: 'v_fil', label: 'Status', unit: '' }] },
    { id: 'h_sensor_t', type: 'hvac', title: 'Temp Sensor', subtitle: 'Return Air', colSpan: 1, height: 220, hvacConfig: { symbol: 'sensor_temp', orientation: 'up', showValue: true, animate: false }, staticData: { value: 23.5 }, variables: [{ id: 'v_t1', label: 'Temp', unit: '°C' }] },
    { id: 'h_rec', type: 'hvac', title: 'Heat Recovery', subtitle: 'Active', colSpan: 1, height: 220, hvacConfig: { symbol: 'heat_recovery', orientation: 'up', showValue: false, animate: true }, staticData: { value: 2 }, variables: [{ id: 'v_rec', label: 'State', unit: '' }] },
    { id: 'h_damper', type: 'hvac', title: 'Fire Damper', subtitle: 'Closed/Alarm', colSpan: 1, height: 220, hvacConfig: { symbol: 'fire_damper', orientation: 'right', showValue: false, animate: false }, staticData: { value: 1 }, variables: [{ id: 'v_d1', label: 'State', unit: '' }] },
  ],

  ai: [
    { id: 'w_ai_main', type: 'ai', title: 'AI Assistant', colSpan: 4, height: 600 }
  ],

  knowledge: [
    { id: 'w_knowledge_base', type: 'knowledge', title: 'Knowledge Base', colSpan: 4, height: 600 }
  ],

  gmao: [
    { id: 'w_gmao_main', type: 'gmao', title: 'GMAO', colSpan: 4, height: 1600 }
  ],
  teams_users: [
    { id: 'w_gmao_users', type: 'gmao', title: 'Équipes / Utilisateurs', colSpan: 4, height: 800 }
  ],

  mqtt: [
    { id: 'w_mqtt_demo', type: 'mqtt_demo', title: 'MQTT Dashboard', colSpan: 4, height: 700 }
  ],

  settings: [
    { id: 's_uptime', type: 'kpi', title: 'System Uptime', colSpan: 1, height: 150, colorTheme: 'blue', staticData: { value: '99.9', unit: '%' } },
    { id: 's_version', type: 'kpi', title: 'Version', colSpan: 1, height: 150, colorTheme: 'gray', staticData: { value: '2.5.0', unit: 'beta' } },
    { id: 's_users', type: 'kpi', title: 'Active Users', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 12, unit: '' } },
    { id: 's_db', type: 'kpi', title: 'DB Status', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 'OK', unit: '' } },
    { id: 's_info', type: 'databox', title: 'System Information', colSpan: 2, height: 300, databoxConfig: { showHeader: true, headerText: 'Details', nodes: [] }, variables: [] },
    { id: 's_logs', type: 'table', title: 'System Logs', colSpan: 2, height: 300, customData: [{ Time: '10:00', Level: 'Info', Message: 'System Started' }, { Time: '10:05', Level: 'Warn', Message: 'High Memory Usage' }] },
    { id: 's_predictive_control', type: 'settings_control', title: 'Predictive Features', colSpan: 1, height: 150, colorTheme: 'purple', staticData: { value: 'ON', unit: '' } }
  ]
};
