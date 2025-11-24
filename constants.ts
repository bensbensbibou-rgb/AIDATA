

import { ChartDataPoint, Ticket, Alarm, AirQualityZone, SubMeter, Language, DataNode, DashboardWidget, AppModule } from './types';

// Helper to generate random history
const genHistory = (base: number, variance: number, length = 24): ChartDataPoint[] => 
  Array.from({ length }, (_, i) => ({
    name: `${i}h`,
    value: Math.max(0, Math.floor(base + (Math.random() * variance) - (variance/2))),
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
                  { id: 'var_valve_cool', label: 'Cooling Valve', type: 'variable', value: 45, unit: '%' },
                ]
              },
              {
                  id: 'zone_101',
                  label: 'Office 101',
                  type: 'space',
                  children: [
                      { id: 'var_z1_temp', label: 'Room Temp', type: 'variable', value: 22.5, unit: '°C' },
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
             { id: 'var_main_elec', label: 'Main Elec', type: 'variable', value: 450, unit: 'kW' },
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
  { id: 'dashboard', label: 'dashboard', iconKey: 'LayoutDashboard', type: 'dashboard', color: 'blue', description: 'Central Overview', isRemovable: false, isPinned: true },
  { 
    id: 'consumption_folder', label: 'consumption', iconKey: 'Zap', type: 'folder', color: 'yellow', isRemovable: false, isPinned: true, isOpen: true,
    children: [
        { id: 'energy', label: 'electricity', iconKey: 'Zap', type: 'dashboard', color: 'yellow', description: 'Consumption Monitor', isRemovable: true, isPinned: true },
        { id: 'fluids', label: 'water', iconKey: 'Droplets', type: 'dashboard', color: 'blue', description: 'Water Usage', isRemovable: true, isPinned: true },
    ]
  },
  {
    id: 'facility_folder', label: 'facility', iconKey: 'Building', type: 'folder', color: 'green', isRemovable: false, isPinned: true, isOpen: true,
    children: [
        { id: 'hvac', label: 'hvac', iconKey: 'Wind', type: 'dashboard', color: 'cyan', description: 'Air Systems', isRemovable: true, isPinned: true },
        { id: 'tickets', label: 'tickets', iconKey: 'Wrench', type: 'dashboard', color: 'orange', description: 'Maintenance', isRemovable: true, isPinned: true },
    ]
  },
  {
    id: 'synoptic_folder', label: 'synoptic', iconKey: 'Monitor', type: 'folder', color: 'indigo', isRemovable: false, isPinned: true, isOpen: true,
    children: [
        { id: 'syn_building', label: 'building', iconKey: 'Building', type: 'dashboard', color: 'blue', description: 'Whole Building', isRemovable: true, isPinned: true },
        { id: 'syn_floor', label: 'floor', iconKey: 'Layers', type: 'dashboard', color: 'blue', description: 'Floor Level', isRemovable: true, isPinned: true },
        { id: 'syn_office', label: 'office', iconKey: 'Briefcase', type: 'dashboard', color: 'gray', description: 'Workspaces', isRemovable: true, isPinned: true },
        { id: 'syn_meeting', label: 'meetingRoom', iconKey: 'Users', type: 'dashboard', color: 'orange', description: 'Meeting Areas', isRemovable: true, isPinned: true },
        { id: 'syn_cafeteria', label: 'cafeteria', iconKey: 'Coffee', type: 'dashboard', color: 'orange', description: 'Break Area', isRemovable: true, isPinned: true },
        { id: 'syn_kitchen', label: 'kitchen', iconKey: 'Utensils', type: 'dashboard', color: 'red', description: 'Cooking Area', isRemovable: true, isPinned: true },
        { id: 'syn_living', label: 'livingRoom', iconKey: 'Armchair', type: 'dashboard', color: 'green', description: 'Lounge', isRemovable: true, isPinned: true },
        { id: 'syn_bedroom', label: 'bedroom', iconKey: 'Bed', type: 'dashboard', color: 'purple', description: 'Accommodation', isRemovable: true, isPinned: true },
        { id: 'syn_fitness', label: 'fitness', iconKey: 'Dumbbell', type: 'dashboard', color: 'cyan', description: 'Gym', isRemovable: true, isPinned: true },
    ]
  },
  { id: 'floor_plans', label: 'floorPlans', iconKey: 'Map', type: 'dashboard', color: 'teal', description: 'Zone Monitoring', isRemovable: true, isPinned: true },
  { id: 'logic_app', label: 'logic', iconKey: 'Workflow', type: 'dashboard', color: 'purple', description: 'Logic Editor', isRemovable: true, isPinned: true },
  { id: 'apps', label: 'allApps', iconKey: 'LayoutGrid', type: 'system', color: 'gray', description: 'Application Launcher', isRemovable: false, isPinned: true },
  { id: 'ai', label: 'ai', iconKey: 'Sparkles', type: 'ai', color: 'purple', description: 'Smart Assistant', isRemovable: false, isPinned: true },
  { id: 'reports', label: 'reports', iconKey: 'FileText', type: 'dashboard', color: 'green', description: 'Generated Reports', isRemovable: true, isPinned: false },
  { id: 'settings', label: 'settings', iconKey: 'Settings', type: 'settings', color: 'gray', description: 'System Config', isRemovable: false, isPinned: true },
  { id: 'hvac_library', label: 'bookstore', iconKey: 'BookOpen', type: 'dashboard', color: 'indigo', description: 'Inventory', isRemovable: true, isPinned: false }
];

// Initial layouts for the modules above
export const INITIAL_DASHBOARDS: Record<string, DashboardWidget[]> = {
  dashboard: [
    // ROW 1: Weather & Key Metrics
    { 
      id: 'w_weather', type: 'weather', title: 'Site Conditions', colSpan: 1, height: 220,
      weatherConfig: { location: 'Montreal', units: 'C' } 
    },
    { 
      id: 'w_kpi_elec', type: 'kpi', title: 'Total Power', colSpan: 1, height: 220, colorTheme: 'orange', 
      variables: [{id: 'var_main_elec', label: 'Main Grid', unit: 'kW'}] 
    },
    { 
      id: 'w_kpi_water', type: 'kpi', title: 'Water Flow', colSpan: 1, height: 220, colorTheme: 'blue',
      variables: [{id: 'var_main_water', label: 'Main Water', unit: 'm3/h'}] 
    },
    { 
      id: 'w_kpi_co2', type: 'kpi', title: 'Avg Air Quality', colSpan: 1, height: 220, colorTheme: 'green', 
      variables: [{id: 'var_co2', label: 'Site Avg', unit: 'ppm'}] 
    },
    // ROW 2
    { 
      id: 'w_chart_main', type: 'chart', chartType: 'area', title: 'Campus Energy Profile', subtitle: 'Real-time demand',
      colSpan: 3, height: 380, colorTheme: 'orange',
      variables: [{id: 'var_main_elec', label: 'Electricity Demand', color: '#f97316', unit: 'kW'}] 
    },
    { 
      id: 'w_databox', type: 'databox', title: 'AHU-01 Telemetry', colSpan: 1, height: 380,
      variables: [
        {id: 'var_temp_supply', label: 'Supply Temp', unit: '°C'},
        {id: 'var_temp_return', label: 'Return Temp', unit: '°C'},
        {id: 'var_fan_speed', label: 'Fan Speed', unit: '%'},
        {id: 'var_co2', label: 'CO2 Level', unit: 'ppm'}
      ],
      databoxConfig: { 
        showHeader: true, headerText: 'Critical Sensors', showImage: false, showLabels: true, 
        nodes: [
          {id: 'var_temp_supply', color: '#ef4444', numberFormat: '#.0', showTrend: true},
          {id: 'var_temp_return', color: '#3b82f6', numberFormat: '#.0'},
          {id: 'var_fan_speed', color: '#10b981', showTrend: true, numberFormat: '# %'},
          {id: 'var_co2', color: '#8b5cf6', showPriority: true}
        ]
      }
    },
    // ROW 3
    { 
      id: 'w_hvac_ahu', type: 'hvac', title: 'AHU-01 Status', subtitle: 'Supply Fan', colSpan: 1, height: 250,
      hvacConfig: { symbol: 'fan_axial', orientation: 'right', showValue: true, animate: true },
      variables: [{id: 'var_fan_speed', label: 'Speed', unit: '%'}]
    },
    { 
      id: 'w_zone_main', type: 'zone', title: 'Lobby Climate', subtitle: 'Zone 1 Control', colSpan: 1, height: 250,
      variables: [{id: 'var_temp_return', label: 'Current', unit: '°C'}, {id: 'var_co2', label: 'CO2', unit: 'ppm'}],
      zoneConfig: { tempId: 'var_temp_return', co2Id: 'var_co2' }
    },
    { 
      id: 'w_alarm', type: 'alarm', title: 'Active Alarms', colSpan: 2, height: 250, 
      alarmConfig: { minPriority: 'Info' } 
    }
  ],
  
  energy: [
     { id: 'e_kpi_main', type: 'kpi', title: 'Grid Consumption', subtitle: 'Main Inlet', colSpan: 1, height: 200, colorTheme: 'orange', variables: [{id: 'var_main_elec', label: 'Grid', unit: 'kW'}] },
     { id: 'e_kpi_solar', type: 'kpi', title: 'Solar Production', subtitle: 'Roof PV', colSpan: 1, height: 200, colorTheme: 'green', staticData: { value: 125, unit: 'kW' } },
     { id: 'e_kpi_pf', type: 'gauge', title: 'Power Factor', subtitle: 'Efficiency', colSpan: 1, height: 200, staticData: { value: 96, min: 0, max: 100, unit: '%' } },
     { id: 'e_kpi_batt', type: 'dpe', title: 'Efficiency Grade', colSpan: 1, height: 200, staticData: { value: 95, unit: 'A' } },
     
     { id: 'e_chart_volt', type: 'chart', chartType: 'line', title: 'Voltage Phase L1/L2/L3', colSpan: 2, height: 300, variables: [{id: 'v_l1', label: 'L1', color: '#ef4444'}, {id: 'v_l2', label: 'L2', color: '#eab308'}, {id: 'v_l3', label: 'L3', color: '#3b82f6'}] },
     { id: 'e_chart_load', type: 'chart', chartType: 'area', title: 'Load Profile', colSpan: 2, height: 300, variables: [{id: 'var_main_elec', label: 'Load', color: '#f97316'}] },
     
     { id: 'e_submeters', type: 'table', title: 'Sub-Meters', colSpan: 4, height: 300, customData: [
         { Meter: 'Lighting-L1', Location: 'Floor 1', Reading: '14,502 kWh', Status: 'OK' },
         { Meter: 'HVAC-Main', Location: 'Roof', Reading: '89,201 kWh', Status: 'OK' },
         { Meter: 'Sockets-L2', Location: 'Floor 2', Reading: '22,100 kWh', Status: 'OK' }
     ]}
  ],
  
  fluids: [
     { id: 'f_kpi_water', type: 'kpi', title: 'Water Flow', subtitle: 'Domestic', colSpan: 1, colorTheme: 'blue', variables: [{id: 'var_main_water', label: 'Flow', unit: 'm3/h'}] },
     { id: 'f_kpi_gas', type: 'kpi', title: 'Gas Flow', subtitle: 'Boilers', colSpan: 1, colorTheme: 'orange', variables: [{id: 'var_main_gas', label: 'Gas', unit: 'm3/h'}] },
     { id: 'f_chart_water', type: 'chart', chartType: 'bar', title: 'Daily Water Usage', colSpan: 2, colorTheme: 'blue', height: 200, variables: [{id: 'var_main_water', label: 'Water', color: '#3b82f6'}] },
     
     { id: 'f_flow', type: 'flow', title: 'Fluid Distribution', subtitle: 'Sankey Flow', colSpan: 4, height: 400 },
     { id: 'f_leak', type: 'alarm', title: 'Leak Detection', colSpan: 4, height: 200, alarmConfig: { minPriority: 'Major' } }
  ],
  
  hvac: [
     { id: 'h_thermo', type: 'thermometer', title: 'Supply Air', colSpan: 1, height: 280, variables: [{id: 'var_temp_supply', label: 'Temp', unit: '°C'}] },
     { id: 'h_kpi_eff', type: 'kpi', title: 'Efficiency', subtitle: 'COP', colSpan: 1, height: 140, colorTheme: 'green', staticData: { value: 3.8, unit: '' } },
     { id: 'h_kpi_mode', type: 'kpi', title: 'Mode', subtitle: 'System', colSpan: 1, height: 140, colorTheme: 'blue', staticData: { value: 'COOL', unit: '' } },
     { id: 'h_chart_perf', type: 'chart', chartType: 'line', title: 'Temperature Delta', colSpan: 2, height: 280, variables: [{id: 'var_temp_supply', label: 'Supply', color: '#3b82f6'}, {id: 'var_temp_return', label: 'Return', color: '#ef4444'}] },
     
     // AHU Components Row
     { id: 'h_comp_fan', type: 'hvac', title: 'Supply Fan', colSpan: 1, height: 200, hvacConfig: { symbol: 'fan_axial', orientation: 'right', showValue: true, animate: true }, variables: [{id: 'var_fan_speed', label: 'Speed', unit: '%'}] },
     { id: 'h_comp_filter', type: 'hvac', title: 'Filter', colSpan: 1, height: 200, hvacConfig: { symbol: 'filter_bag', orientation: 'up', showValue: true, animate: false }, variables: [{id: 'var_filter_diff', label: 'Diff', unit: 'Pa'}] },
     { id: 'h_comp_cool', type: 'hvac', title: 'Cooling Coil', colSpan: 1, height: 200, hvacConfig: { symbol: 'coil_cool', orientation: 'up', showValue: true, animate: true }, variables: [{id: 'var_valve_cool', label: 'Valve', unit: '%'}] },
     { id: 'h_comp_damp', type: 'hvac', title: 'Mixing Damper', colSpan: 1, height: 200, hvacConfig: { symbol: 'damper_louver', orientation: 'up', showValue: true, animate: true }, staticData: { value: 30, unit: '%' } },
     
     { id: 'h_databox', type: 'databox', title: 'Full Sensor List', colSpan: 4, height: 300, variables: [{id: 'var_temp_supply', label: 'SAT', unit:'C'}, {id: 'var_temp_return', label: 'RAT', unit:'C'}, {id: 'var_fan_speed', label:'Fan', unit:'%'}, {id: 'var_co2', label:'CO2', unit:'ppm'}], databoxConfig: { showHeader: true, nodes: [{id:'var_temp_supply', color:'blue'}, {id:'var_temp_return', color:'red'}, {id:'var_fan_speed', color:'green'}] } }
  ],
  
  floor_plans: [
    { 
      id: 'fp_1', type: 'floorplan', title: 'Main Office Floor', colSpan: 4, height: 500,
      variables: [
        { id: 'var_z1_temp', label: 'Office 101', unit: '°C', color: '#3b82f6' },
        { id: 'var_z2_temp', label: 'Conf Room', unit: '°C', color: '#10b981' }
      ],
      floorPlanConfig: {
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop',
        objects: [
           { id: 'obj1', type: 'zone', layerId: 'l_temp', x: 20, y: 70, width: 15, height: 10, label: 'Office 101', variableId: 'var_z1_temp', backgroundColor: 'rgba(59, 130, 246, 0.3)' },
           { id: 'obj2', type: 'zone', layerId: 'l_temp', x: 60, y: 50, width: 20, height: 15, label: 'Conf Room', variableId: 'var_z2_temp', backgroundColor: 'rgba(16, 185, 129, 0.3)' }
        ],
        layers: [
          { id: 'l_temp', name: 'Space Temperature', visible: true, gradient: 'blue-red', minValue: 18, maxValue: 26, units: '°C', defaultColor: 'rgba(59, 130, 246, 0.3)' },
          { id: 'l_co2', name: 'Space CO2', visible: false, gradient: 'green-red', minValue: 400, maxValue: 1200, units: 'ppm', defaultColor: 'rgba(16, 185, 129, 0.3)' },
          { id: 'l_humidity', name: 'Space Humidity', visible: false, gradient: 'blue-red', minValue: 20, maxValue: 80, units: '%', defaultColor: 'rgba(6, 182, 212, 0.3)' },
          { id: 'l_occ', name: 'Occupancy', visible: false, gradient: 'grayscale', minValue: 0, maxValue: 1, units: '', defaultColor: 'rgba(156, 163, 175, 0.3)' },
          { id: 'l_light', name: 'Light Level', visible: false, gradient: 'grayscale', minValue: 0, maxValue: 100, units: '%', defaultColor: 'rgba(251, 191, 36, 0.3)' }
        ]
      }
    }
  ],
  
  reports: [
     { id: 'r_list', type: 'table', title: 'Generated Reports', colSpan: 4, height: 400, customData: [{Date: '2023-10-01', Name: 'Monthly Energy', Format: 'PDF', Size: '1.2 MB'}, {Date: '2023-10-02', Name: 'Alarm History', Format: 'CSV', Size: '45 KB'}] }
  ],
  
  tickets: [
     { id: 't_list', type: 'table', title: 'Maintenance Tickets', colSpan: 4, height: 500, customData: [{ID: 'T-101', Priority: 'High', Issue: 'AHU-01 Belt', Status: 'Open', Assigned: 'John D.'}, {ID: 'T-102', Priority: 'Low', Issue: 'Leaky Faucet 2F', Status: 'Pending', Assigned: 'Mike S.'}]}
  ],

  // --- Synoptic Tabs (Populated) ---
  syn_building: [
     { id: 'sb_weather', type: 'weather', title: 'External', colSpan: 1, height: 250, weatherConfig: { location: 'Montreal', units: 'C' } },
     { id: 'sb_kpi_pwr', type: 'kpi', title: 'Total Power', colSpan: 1, height: 120, colorTheme: 'orange', variables: [{id: 'var_main_elec', label: 'KW', unit: 'kW'}] },
     { id: 'sb_kpi_wtr', type: 'kpi', title: 'Total Water', colSpan: 1, height: 120, colorTheme: 'blue', variables: [{id: 'var_main_water', label: 'Flow', unit: 'm3'}] },
     { id: 'sb_alarm', type: 'alarm', title: 'Building Alarms', colSpan: 2, height: 250, alarmConfig: { minPriority: 'Info' } },
     { id: 'sb_chart', type: 'chart', chartType: 'area', title: 'Global Consumption', colSpan: 4, height: 300, variables: [{id: 'var_main_elec', label: 'Power', color: '#f97316'}] }
  ],

  syn_floor: [
     { id: 'sf_fp', type: 'floorplan', title: 'Floor Overview', colSpan: 3, height: 400, floorPlanConfig: { imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop', objects: [], layers: [{id: 'def', name: 'Base', visible: true, gradient: 'none'}] } },
     { id: 'sf_kpi_occ', type: 'kpi', title: 'Occupancy', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 45, unit: 'ppl' } },
     { id: 'sf_kpi_avg', type: 'kpi', title: 'Avg Temp', colSpan: 1, height: 150, colorTheme: 'blue', staticData: { value: 22.4, unit: '°C' } },
     { id: 'sf_vav_list', type: 'databox', title: 'VAV Status', colSpan: 1, height: 400, databoxConfig: { showHeader:true, headerText:'VAV Boxes', nodes: [{id:'vav_1', labelOverride:'VAV-01', color:'green'}, {id:'vav_2', labelOverride:'VAV-02', color:'green'}, {id:'vav_3', labelOverride:'VAV-03', color:'orange'}] } }
  ],

  syn_office: [
     { id: 'so_zone', type: 'zone', title: 'Office 101 Control', colSpan: 1, height: 300, variables: [{id: 'var_z1_temp', label: 'Room', unit: '°C'}, {id: 'var_z1_sp', label: 'Set', unit: '°C'}], zoneConfig: { tempId: 'var_z1_temp', setpointId: 'var_z1_sp' } },
     { id: 'so_chart', type: 'chart', chartType: 'line', title: '24h Temperature', colSpan: 2, height: 300, variables: [{id: 'var_z1_temp', label: 'Temp', color: '#3b82f6'}, {id: 'var_z1_sp', label: 'Set', color: '#9ca3af'}] },
     { id: 'so_light', type: 'slider', title: 'Lighting', colSpan: 1, height: 140, staticData: { value: 80, min: 0, max: 100, unit: '%' } },
     { id: 'so_blinds', type: 'slider', title: 'Blinds', colSpan: 1, height: 140, staticData: { value: 0, min: 0, max: 100, unit: '%' } }
  ],

  syn_meeting: [
     { id: 'sm_zone', type: 'zone', title: 'Conf Room Climate', colSpan: 1, height: 300, variables: [{id: 'var_mtg_temp', label: 'Room', unit: '°C'}] },
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
     { id: 'sl_zone', type: 'zone', title: 'Lounge', colSpan: 1, height: 300, variables: [{id: 'var_lng_temp', label: 'Room', unit: '°C'}] },
     { id: 'sl_scene', type: 'databox', title: 'Lighting Scenes', colSpan: 1, height: 300, databoxConfig: { showHeader: false, nodes: [{id:'sc_relax', labelOverride:'Relax Mode', color:'blue'}, {id:'sc_read', labelOverride:'Reading', color:'yellow'}, {id:'sc_bright', labelOverride:'Full Bright', color:'white'}] } },
     { id: 'sl_tv', type: 'hvac', title: 'TV Display', colSpan: 1, height: 200, hvacConfig: { symbol: 'led', orientation: 'up', showValue: false, animate: false }, staticData: { value: 'OFF' } }
  ],

  syn_bedroom: [
     { id: 'sbr_zone', type: 'zone', title: 'Master Bedroom', colSpan: 1, height: 300, variables: [{id: 'var_bed_temp', label: 'Room', unit: '°C'}] },
     { id: 'sbr_hum', type: 'kpi', title: 'Humidity', colSpan: 1, height: 150, colorTheme: 'blue', staticData: { value: 45, unit: '%' } },
     { id: 'sbr_win', type: 'hvac', title: 'Window Sensor', colSpan: 1, height: 150, hvacConfig: { symbol: 'radio', orientation: 'up', showValue: false, animate: false }, staticData: { value: 'CLOSED' } }
  ],

  syn_fitness: [
     { id: 'sfit_zone', type: 'zone', title: 'Gym AC', colSpan: 1, height: 300, variables: [{id: 'var_gym_temp', label: 'Temp', unit: '°C'}] },
     { id: 'sfit_co2', type: 'kpi', title: 'Air Quality', colSpan: 1, height: 150, colorTheme: 'green', staticData: { value: 550, unit: 'ppm' } },
     { id: 'sfit_music', type: 'slider', title: 'Music Volume', colSpan: 1, height: 150, staticData: { value: 40, min: 0, max: 100, unit: '%' } },
     { id: 'sfit_chart', type: 'chart', chartType: 'bar', title: 'Gym Usage (Hrs)', colSpan: 4, height: 250 }
  ],

  logic_app: [
     { id: 'w_logic', type: 'logic', title: 'Logic Editor', colSpan: 4, height: 600, logicConfig: { blocks: [], connections: [] } }
  ],

  hvac_library: [
        { id: 'h_pump_run', type: 'hvac', title: 'Pump (Running)', subtitle: 'State: 2 (Green)', colSpan: 1, height: 220, hvacConfig: { symbol: 'pump', orientation: 'up', showValue: true, animate: true }, staticData: { value: 2 }, variables: [{id: 'v_p1', label: 'Status', unit: ''}] },
        { id: 'h_pump_alarm', type: 'hvac', title: 'Pump (Alarm)', subtitle: 'State: 1 (Red)', colSpan: 1, height: 220, hvacConfig: { symbol: 'pump_circulator', orientation: 'right', showValue: true, animate: true }, staticData: { value: 1 }, variables: [{id: 'v_p2', label: 'Status', unit: ''}] },
        { id: 'h_fan_var', type: 'hvac', title: 'Supply Fan', subtitle: 'Variable Speed', colSpan: 1, height: 220, hvacConfig: { symbol: 'fan_axial', orientation: 'left', showValue: true, animate: true }, staticData: { value: 85 }, variables: [{id: 'v_f1', label: 'Speed', unit: '%'}] },
        { id: 'h_valve_3', type: 'hvac', title: 'Mixing Valve', subtitle: 'Modulating', colSpan: 1, height: 220, hvacConfig: { symbol: 'valve_3way', orientation: 'up', showValue: true, animate: true }, staticData: { value: 45 }, variables: [{id: 'v_v1', label: 'Position', unit: '%'}] },
        { id: 'h_filter', type: 'hvac', title: 'Filter Status', subtitle: 'Dirty (Alarm)', colSpan: 1, height: 220, hvacConfig: { symbol: 'filter_bag', orientation: 'up', showValue: false, animate: false }, staticData: { value: 1 }, variables: [{id: 'v_fil', label: 'Status', unit: ''}] },
        { id: 'h_sensor_t', type: 'hvac', title: 'Temp Sensor', subtitle: 'Return Air', colSpan: 1, height: 220, hvacConfig: { symbol: 'sensor_temp', orientation: 'up', showValue: true, animate: false }, staticData: { value: 23.5 }, variables: [{id: 'v_t1', label: 'Temp', unit: '°C'}] },
        { id: 'h_rec', type: 'hvac', title: 'Heat Recovery', subtitle: 'Active', colSpan: 1, height: 220, hvacConfig: { symbol: 'heat_recovery', orientation: 'up', showValue: false, animate: true }, staticData: { value: 2 }, variables: [{id: 'v_rec', label: 'State', unit: ''}] },
        { id: 'h_damper', type: 'hvac', title: 'Fire Damper', subtitle: 'Closed/Alarm', colSpan: 1, height: 220, hvacConfig: { symbol: 'fire_damper', orientation: 'right', showValue: false, animate: false }, staticData: { value: 1 }, variables: [{id: 'v_d1', label: 'State', unit: ''}] },
    ]
};
