

import React from 'react';

export type Period = 'j' | 'm' | 'a' | 'd';
export type Language = 'en' | 'fr';

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number; // Secondary value (e.g. Water or Setpoint)
  value3?: number; // Tertiary value (e.g. Heating)
  expected?: number; // For Model vs Measured
  total?: number;
}

export interface SubMeter {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: number;
  status: 'Active' | 'Alert' | 'Offline';
  history: ChartDataPoint[];
}

export interface Ticket {
  id: string;
  code: string;
  domain: string;
  location: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Cancelled';
  date: string;
}

export interface Alarm {
  id: string;
  code: string;
  level: 'Critical' | 'Major' | 'Info';
  equipment: string;
  message: string;
  since: string;
  isPredictive?: boolean;
  probability?: string;
  horizon?: string;
}

export interface AirQualityZone {
  id: string;
  name: string;
  ppm: number;
  status: 'Good' | 'Moderate' | 'Poor' | 'Critical';
  history: ChartDataPoint[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export type NodeType = 'site' | 'building' | 'floor' | 'space' | 'equipment' | 'variable' | 'folder';

export interface DataNode {
  id: string;
  label: string;
  type: NodeType;
  value?: any;
  unit?: string;
  children?: DataNode[];
}

// --- FLOOR PLAN TYPES ---

export type FloorPlanObjectType = 'zone' | 'text' | 'icon';

export interface FloorPlanLayer {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  locked?: boolean;
  // Metric Configuration
  defaultColor?: string; // Hex
  gradient?: 'none' | 'blue-red' | 'green-red' | 'heatmap' | 'grayscale';
  minValue?: number;
  maxValue?: number;
  units?: string;
}

export interface FloorPlanObject {
  id: string;
  type: FloorPlanObjectType;
  layerId: string;
  x: number; // Percentage 0-100 (Center X for rect/icon, or starting X for text)
  y: number; // Percentage 0-100
  width?: number; // Percentage, for zones/icons
  height?: number; // Percentage, for zones/icons
  rotation?: number;
  
  // For Polygons
  shape?: 'rect' | 'circle' | 'polygon';
  points?: {x: number, y: number}[]; // Array of percentage coordinates for polygons
  
  // Content
  label?: string; // For Text or Zone hover
  contentUrl?: string; // For Icons/Images
  
  // Binding
  variableId?: string; // Linked data
  
  // Style Overrides
  backgroundColor?: string; // Hex override
  color?: string; // Hex (Text color or Border color)
  fontSize?: number;
  strokeWidth?: number;
}

export interface FloorPlanConfig {
  imageUrl: string;
  width?: number; // Aspect ratio width
  height?: number; // Aspect ratio height
  layers: FloorPlanLayer[];
  objects: FloorPlanObject[];
}

// --- DATABOX TYPES ---

export interface DataboxNode {
  id: string; // variableId
  labelOverride?: string;
  numberFormat?: string; // "#.00", ",###", "# %"
  showPriority?: boolean;
  showUnit?: boolean;
  showActions?: boolean;
  inlineActions?: boolean;
  showTrend?: boolean;
  actions?: string[]; // e.g. ["Auto", "Override", "On", "Off"]
  color?: string; // Hex color for the indicator dot
}

export interface ZoneConfig {
  tempId?: string;     // Variable ID for Main Temperature
  setpointId?: string; // Variable ID for Setpoint
  humidityId?: string; // Variable ID for Humidity
  co2Id?: string;      // Variable ID for CO2
  valveId?: string;    // Variable ID for Valve %
  modeId?: string;     // Variable ID for Mode (Heat/Cool)
}

export type HVACSymbolType = 
  // Pumps & Fans
  | 'pump' 
  | 'pump_circulator' 
  | 'pump_vacuum'
  | 'fan' 
  | 'fan_axial'
  | 'compressor'
  | 'compressor_piston'
  | 'compressor_scroll'
  // Valves
  | 'valve_2way' 
  | 'valve_3way' 
  | 'valve_ball' 
  | 'valve_check'
  | 'valve_solenoid'
  // Dampers
  | 'damper_rect' 
  | 'damper_round' 
  | 'damper_louver'
  | 'fire_damper' 
  | 'vav_box'
  // Heat Exchangers
  | 'coil_heat' 
  | 'coil_cool' 
  | 'heat_recovery'
  | 'heat_exchanger_rotary'
  | 'heater_electric'
  // Air Treatment
  | 'filter'
  | 'filter_bag'
  | 'humidifier'
  | 'silencer'
  // Plant Equipment
  | 'radiator'
  | 'boiler'
  | 'tank'
  | 'cooling_tower'
  | 'chiller'
  | 'condenser'
  // Sensors
  | 'sensor_temp' 
  | 'sensor_humidity'
  | 'sensor_pressure' 
  | 'sensor_flow'
  | 'sensor_co2'
  | 'sensor_air_quality'
  | 'sensor_velocity'
  | 'sensor_light'
  | 'sensor_heat_meter'
  // Switches & Monitors
  | 'switch_pressure'
  | 'switch_flow'
  // Actuators/General
  | 'actuator'
  | 'motor'
  | 'led'
  | 'hand'
  | 'checkbox'
  | 'radio'
  // Navigation
  | 'nav_arrow'
  | 'nav_home'
  | 'nav_settings'
  | 'nav_trend'
  | 'nav_alarm'
  | 'nav_info'
  | 'nav_help'
  | 'nav_plus'
  | 'nav_minus'
  | 'nav_refresh'
  | 'nav_stop'
  | 'nav_play'
  | 'nav_date'
  | 'nav_clock'
  | 'nav_internet';

// --- SYNOPTIC EDITOR TYPES ---

export type SynopticElementType = 'symbol' | 'pipe' | 'text' | 'databox';

export interface SynopticElementBase {
  id: string;
  type: SynopticElementType;
  x: number;
  y: number;
  variableId?: string; // Linked data
  color?: string;
  locked?: boolean;
  rotation?: number; // Rotation in degrees (0-360)
}

export interface SynopticSymbol extends SynopticElementBase {
  type: 'symbol';
  symbolType: HVACSymbolType;
  width: number;
  height: number;
  rotation: number; // Enforced for symbols
  label?: string;
}

export interface SynopticPipe extends SynopticElementBase {
  type: 'pipe';
  points: {x: number, y: number}[]; // Polyline points
  strokeWidth: number;
  animated?: boolean; // Flow animation
}

export interface SynopticText extends SynopticElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  rotation?: number;
}

export interface SynopticDatabox extends SynopticElementBase {
  type: 'databox';
  width: number;
  height: number;
  databoxConfig: {
    showHeader?: boolean;
    headerText?: string;
    showImage?: boolean;
    imageUrl?: string;
    showLabels?: boolean;
    nodes: DataboxNode[];
  };
}

export type SynopticElement = SynopticSymbol | SynopticPipe | SynopticText | SynopticDatabox;

export interface SynopticConfig {
  elements: SynopticElement[];
  backgroundColor?: string;
  width: number; // Canvas virtual width
  height: number; // Canvas virtual height
}

// --- LOGIC EDITOR TYPES ---

export type LogicBlockCategory = 'boolean' | 'numeric' | 'string' | 'time' | 'io';

export interface LogicPort {
  id: string;
  label?: string;
  type: 'input' | 'output';
  dataType: 'boolean' | 'number' | 'string' | 'any';
}

export interface LogicBlockType {
  type: string;
  label: string;
  category: LogicBlockCategory;
  inputs: LogicPort[];
  outputs: LogicPort[];
  description?: string;
}

export interface LogicBlockInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  inputs: Record<string, any>; // Stores disconnected default values or connection refs
  outputs: Record<string, any>; // Stores current computed value
  config?: Record<string, any>; // For custom configs like mapped variable ID
}

export interface LogicConnection {
  id: string;
  sourceBlockId: string;
  sourcePortId: string;
  targetBlockId: string;
  targetPortId: string;
}

export interface LogicConfig {
  blocks: LogicBlockInstance[];
  connections: LogicConnection[];
}

// -----------------------------

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'ai' | 'custom' | 'thermometer' | 'table' | 'flow' | 'dpe' | 'gauge' | 'floorplan' | 'predictive' | 'slider' | 'schedule' | 'databox' | 'alarm' | 'weather' | 'hvac' | 'synoptic' | 'zone' | 'logic';
  chartType?: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radial' | 'scatter' | 'heatmap' | 'radar';
  title: string;
  subtitle?: string;
  colSpan: 1 | 2 | 3 | 4;
  height?: number;
  colorTheme?: string;
  backgroundColor?: string;
  noPadding?: boolean;
  content?: React.ReactNode;
  customData?: any[];
  variables?: { 
    id: string; 
    label: string; 
    unit?: string; 
    color?: string;
    fontSize?: string; // e.g. "text-xl"
    fontFamily?: string; // e.g. "font-mono"
  }[];
  hiddenVariables?: string[]; // For toggling series visibility
  staticData?: {
    value?: string | number;
    sub?: string;
    min?: number;
    max?: number;
    unit?: string;
  };
  floorPlanConfig?: FloorPlanConfig;
  scheduleConfig?: {
    allowlist?: string[];
    showWeekends?: boolean;
    startOnSunday?: boolean;
    is24hFormat?: boolean;
  };
  databoxConfig?: {
    showHeader?: boolean;
    headerText?: string;
    showImage?: boolean;
    imageUrl?: string;
    showLabels?: boolean;
    nodes: DataboxNode[];
  };
  zoneConfig?: ZoneConfig;
  alarmConfig?: {
    playSound?: boolean;
    soundUrl?: string;
    minPriority?: 'Critical' | 'Major' | 'Info';
  };
  weatherConfig?: {
    location: string;
    units: 'C' | 'F';
  };
  hvacConfig?: {
    symbol: HVACSymbolType;
    orientation: 'up' | 'down' | 'left' | 'right';
    showValue: boolean;
    animate: boolean;
  };
  synopticConfig?: SynopticConfig;
  logicConfig?: LogicConfig;
}

// Unified Module Interface (Combines App and Tab)
export interface AppModule {
  id: string;
  label: string;
  iconKey: string;
  type: 'dashboard' | 'app' | 'ai' | 'settings' | 'system' | 'folder';
  color?: string; // For the App Grid icon
  description?: string; // For the App Grid
  isRemovable: boolean;
  isPinned: boolean; // If true, shows in Sidebar
  children?: AppModule[]; // Nesting support
  isOpen?: boolean; // Accordion state
}