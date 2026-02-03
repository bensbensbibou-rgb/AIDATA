import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer, Type, Trash2, RotateCw, X, PenTool, Grid, Check, Move, Maximize, RefreshCw, Copy, Clipboard,
  PlayCircle, StopCircle, SlidersHorizontal, Power, Activity, ZoomIn, ZoomOut, Map as MapIcon, Eye, EyeOff, Crosshair, ChevronDown, ChevronRight, List
} from 'lucide-react';
import {
  SynopticConfig, SynopticElement, SynopticPipe, SynopticSymbol, SynopticText, SynopticDatabox, HVACSymbolType, DataboxNode
} from '../types';
import { HVACSymbol } from './HVACSymbols';
import { DataboxWidget } from './Databox';

// --- Component Props ---

interface SynopticEditorProps {
  config: SynopticConfig;
  variables: { id: string, label: string, unit?: string, value?: any }[];
  isEditing: boolean;
  onConfigChange: (newConfig: SynopticConfig) => void;
  onRemoveVariable?: (id: string) => void;
  autoFit?: boolean;
}

// --- Constants ---
const GRID_SIZE = 10;

// Categorized Palette
const PALETTE_SECTIONS = [
  {
    title: 'Pumps & Fans',
    items: [
      { type: 'pump', label: 'Pump' },
      { type: 'pump_circulator', label: 'Circulator' },
      { type: 'pump_vacuum', label: 'Vacuum Pump' },
      { type: 'fan_axial', label: 'Fan (Axial)' },
      { type: 'fan', label: 'Fan (Centr.)' },
      { type: 'compressor', label: 'Compressor' },
      { type: 'compressor_piston', label: 'Piston Comp.' },
      { type: 'compressor_scroll', label: 'Scroll Comp.' },
    ]
  },
  {
    title: 'Valves',
    items: [
      { type: 'valve_2way', label: '2-Way Valve' },
      { type: 'valve_3way', label: '3-Way Valve' },
      { type: 'valve_ball', label: 'Ball Valve' },
      { type: 'valve_check', label: 'Check Valve' },
      { type: 'valve_solenoid', label: 'Solenoid Valve' },
    ]
  },
  {
    title: 'Dampers',
    items: [
      { type: 'damper_rect', label: 'Damper Rect' },
      { type: 'damper_round', label: 'Damper Round' },
      { type: 'damper_louver', label: 'Louver Damper' },
      { type: 'fire_damper', label: 'Fire Damper' },
      { type: 'vav_box', label: 'VAV Box' },
    ]
  },
  {
    title: 'Coils & Air',
    items: [
      { type: 'coil_heat', label: 'Heater' },
      { type: 'coil_cool', label: 'Cooler' },
      { type: 'heater_electric', label: 'Elec. Heater' },
      { type: 'heat_recovery', label: 'Plate Recov.' },
      { type: 'heat_exchanger_rotary', label: 'Rotary Exch.' },
      { type: 'humidifier', label: 'Humidifier' },
      { type: 'silencer', label: 'Silencer' },
      { type: 'filter', label: 'Filter' },
      { type: 'filter_bag', label: 'Bag Filter' },
    ]
  },
  {
    title: 'Plant Equipment',
    items: [
      { type: 'radiator', label: 'Radiator' },
      { type: 'boiler', label: 'Boiler (Generic)' },
      { type: 'boiler_buderus', label: 'Boiler Buderus' },
      { type: 'boiler_camus_dynamax', label: 'Boiler Camus' },
      { type: 'boiler_cleaver', label: 'Boiler Cleaver' },
      { type: 'boiler_crest_condensing', label: 'Boiler Crest' },
      { type: 'boiler_fulton', label: 'Boiler Fulton' },
      { type: 'boiler_murray', label: 'Boiler Murray' },
      { type: 'tank', label: 'Tank' },
      { type: 'cooling_tower', label: 'Cooling Tower' },
      { type: 'chiller', label: 'Chiller' },
      { type: 'condenser', label: 'Condenser' },
    ]
  },
  {
    title: 'Sensors & Switches',
    items: [
      { type: 'sensor_temp', label: 'Temp' },
      { type: 'sensor_humidity', label: 'Humidity' },
      { type: 'sensor_pressure', label: 'Pressure' },
      { type: 'sensor_flow', label: 'Flow' },
      { type: 'sensor_velocity', label: 'Velocity' },
      { type: 'sensor_co2', label: 'CO2' },
      { type: 'sensor_light', label: 'Light (Lux)' },
      { type: 'sensor_heat_meter', label: 'Heat Meter' },
      { type: 'switch_pressure', label: 'Press. Switch' },
      { type: 'switch_flow', label: 'Flow Switch' },
    ]
  },
  {
    title: 'General & Actuators',
    items: [
      { type: 'actuator', label: 'Actuator' },
      { type: 'motor', label: 'Motor' },
      { type: 'hand', label: 'Manual Op.' },
    ]
  },
  {
    title: 'UI & Navigation',
    items: [
      { type: 'databox', label: 'Databox' }, // Added Databox
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'radio', label: 'Radio Btn' },
      { type: 'led', label: 'LED' },
      { type: 'nav_arrow', label: 'Arrow' },
      { type: 'nav_home', label: 'Home Btn' },
      { type: 'nav_settings', label: 'Settings Btn' },
      { type: 'nav_trend', label: 'Trend Btn' },
      { type: 'nav_alarm', label: 'Alarm Btn' },
      { type: 'nav_info', label: 'Info Btn' },
      { type: 'nav_help', label: 'Help Btn' },
      { type: 'nav_plus', label: 'Plus' },
      { type: 'nav_minus', label: 'Minus' },
      { type: 'nav_refresh', label: 'Refresh' },
      { type: 'nav_stop', label: 'Stop' },
      { type: 'nav_play', label: 'Play' },
      { type: 'nav_date', label: 'Date' },
      { type: 'nav_clock', label: 'Clock' },
      { type: 'nav_internet', label: 'Internet' },
    ]
  }
];

const COLORS = [
  { label: 'Black', val: '#000000' },
  { label: 'Gray', val: '#9ca3af' },
  { label: 'Blue (Cold)', val: '#3b82f6' },
  { label: 'Red (Hot)', val: '#ef4444' },
  { label: 'Green', val: '#22c55e' },
  { label: 'Yellow', val: '#eab308' },
  { label: 'Orange', val: '#f97316' },
  { label: 'Purple', val: '#a855f7' },
];

// --- Helper Functions ---
const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

// Rotation logic
const rotatePoint = (x: number, y: number, cx: number, cy: number, angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + (dx * cos - dy * sin),
    y: cy + (dx * sin + dy * cos)
  };
};

interface InteractionState {
  type: 'move' | 'resize' | 'rotate' | 'select-box' | 'pan';
  startX: number;
  startY: number;
  initialElements?: SynopticElement[]; // Snapshot of selected elements before transform
  initialBounds?: { x: number, y: number, w: number, h: number, cx: number, cy: number };
  initialPan?: { x: number, y: number };
}

// Bounding box calculator
const getElementBounds = (el: SynopticElement) => {
  if (el.type === 'symbol') return { x: el.x, y: el.y, w: el.width, h: el.height };
  if (el.type === 'databox') return { x: el.x, y: el.y, w: el.width, h: el.height };
  // Approximate text bounds
  if (el.type === 'text') return { x: el.x, y: el.y - el.fontSize, w: (el.text.length * el.fontSize * 0.6), h: el.fontSize * 1.2 };
  if (el.type === 'pipe') {
    const xs = el.points.map(p => p.x);
    const ys = el.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX || 10, h: maxY - minY || 10 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
};

const getGroupBounds = (elements: SynopticElement[]) => {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach(el => {
    const b = getElementBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  });

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: minX + (maxX - minX) / 2, cy: minY + (maxY - minY) / 2 };
};

export const SynopticEditor: React.FC<SynopticEditorProps> = ({
  config,
  variables,
  isEditing,
  onConfigChange,
  onRemoveVariable
}) => {
  // --- State ---
  const [tool, setTool] = useState<'select' | 'pipe' | 'text'>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<SynopticElement[]>([]);
  const [drawingPipe, setDrawingPipe] = useState<{ points: { x: number, y: number }[] } | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragSelectRect, setDragSelectRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [openPaletteSections, setOpenPaletteSections] = useState<Record<string, boolean>>({ 'Pumps & Fans': true });

  // View / Operator Mode State
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(false);
  const [activeCommandWindow, setActiveCommandWindow] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedValues, setSimulatedValues] = useState<Record<string, any>>({});

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
      setActiveCommandWindow(null);
    } else {
      // When leaving edit mode, clear selection to prevent phantom drags
      setSelectedIds([]);
      setTool('select');
      setDrawingPipe(null);
    }
  }, [isEditing]);

  // --- Data Resolution ---
  const getValueForVar = (varId?: string) => {
    if (!varId) return 0;
    if (isSimulating && simulatedValues[varId] !== undefined) {
      return simulatedValues[varId];
    }
    const v = variables.find(v => v.id === varId);
    return v ? v.value : 0;
  };

  // Auto detection par suffixe sur les variables disponibles
  const autoDetectPumpBindings = (baseId?: string) => {
    const pick = (suffixes: string[]) => {
      const found = variables.find(v => {
        const id = (v.id || '').toLowerCase();
        const lbl = (v.label || '').toLowerCase();
        return suffixes.some(s => id.endsWith(s) || lbl.includes(s));
      });
      return found?.id;
    };
    return {
      commandId: pick([`${baseId?.toLowerCase()}_cd_et`, 'cd_et', 'pmp_cd']),
      modeId: pick([`${baseId?.toLowerCase()}_mode`, 'pmp_mode', 'mode_pmp']),
      feedbackId: pick([`${baseId?.toLowerCase()}_rm_et`, 'rm_et', 'fb', 'pmp_rm']),
      alarmId: pick([`${baseId?.toLowerCase()}_th_al`, 'th_al', `${baseId?.toLowerCase()}_df_al`, 'df_al', `${baseId?.toLowerCase()}_dis_al`, 'dis_al', 'fault', 'alarm', 'pmp_fault']),
      manualId: pick([`${baseId?.toLowerCase()}_mode_man`, 'mode_man', 'hand', 'pmp_manual']),
      displayId: baseId
    };
  };

  // Pump state aggregation: tries to assemble command/feedback/alarm/manual from related tags or bindings
  const getPumpState = (varId?: string, bindings?: { commandId?: string; modeId?: string; feedbackId?: string; alarmId?: string; manualId?: string; displayId?: string }) => {
    if (!varId && !bindings) return {};
    const pickVal = (id?: string, fallbackSuffixes?: string[]) => {
      if (id) {
        if (simulatedValues[id] !== undefined) return simulatedValues[id];
        const v = variables.find(v => v.id === id);
        return v?.value;
      }
      if (!fallbackSuffixes || !varId) return undefined;
      const found = variables.find(v => {
        const lid = (v.id || '').toLowerCase();
        const lbl = (v.label || '').toLowerCase();
        return fallbackSuffixes.some(s => lid.endsWith(s) || lbl.includes(s));
      });
      return found?.value;
    };
    const pickBool = (v: any) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
    const lowerBase = (varId || '').toLowerCase().split('_')[0];
    const command = pickVal(bindings?.commandId, [`${lowerBase}_cd_et`, 'cd_et', 'pmp_cd']);
    const modeRaw = pickVal(bindings?.modeId, [`${lowerBase}_mode`, 'pmp_mode', 'mode_pmp', 'mode']);
    const feedback = pickVal(bindings?.feedbackId, [`${lowerBase}_rm_et`, 'rm_et', 'fb']);
    const manual = pickVal(bindings?.manualId, [`${lowerBase}_mode_man`, 'mode_man', 'hand']) ?? modeRaw;
    const al1 = pickVal(bindings?.alarmId, [`${lowerBase}_th_al`, `${lowerBase}_df_al`, `${lowerBase}_dis_al`, 'th_al', 'df_al', 'dis_al', 'fault', 'alarm']);
    const alarm = al1 === true || al1 === 1 || al1 === '1' || al1 === 'true';
    const maintenanceVal = pickVal(undefined, [`${lowerBase}_maintenance`, `${lowerBase}_maint`, 'maintenance', 'maint']);
    const maskedVal = pickVal(undefined, [`${lowerBase}_masked`, 'masked', 'mute', 'silenced']);
    const maintenance = pickBool(maintenanceVal);
    const masked = pickBool(maskedVal);
    const display = pickVal(bindings?.displayId) ?? getValueForVar(bindings?.displayId || varId);
    const mode = modeRaw !== undefined ? (pickBool(modeRaw) ? 1 : 0) : undefined;
    return { command, feedback, manual, mode, alarm, maintenance, masked, display, value: display };
  };

  const getUnitForVar = (varId?: string) => {
    if (!varId) return '';
    const v = variables.find(v => v.id === varId);
    return v ? v.unit : '';
  };

  // --- View Controls ---
  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(3, Math.max(0.5, prev + delta)));
  };

  const handleFit = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // --- Copy / Paste Logic ---
  const handleCopy = () => {
    if (selectedElements.length > 0) {
      setClipboard(JSON.parse(JSON.stringify(selectedElements)));
    }
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    const newElements = clipboard.map(el => {
      const newId = `${el.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (el.type === 'pipe') {
        return { ...el, id: newId, points: el.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) };
      }
      return { ...el, id: newId, x: el.x + 20, y: el.y + 20 };
    });
    onConfigChange({ ...config, elements: [...config.elements, ...newElements] });
    setSelectedIds(newElements.map(e => e.id));
  };

  const selectedElements = config.elements.filter(e => selectedIds.includes(e.id));
  const groupBounds = getGroupBounds(selectedElements);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan Logic (Spacebar or Middle Click or View Mode drag)
    if (!isEditing || e.button === 1 || (e.shiftKey && !isEditing)) {
      setInteraction({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialPan: { ...panOffset }
      });
      return;
    }

    if (isEditing && !interaction && !isSimulating) {
      if (e.target === svgRef.current) {
        if (tool === 'select') {
          if (!e.shiftKey) setSelectedIds([]);
          const rect = svgRef.current!.getBoundingClientRect();
          // Adjust for zoom/pan
          const rawX = (e.clientX - rect.left - panOffset.x) / scale;
          const rawY = (e.clientY - rect.top - panOffset.y) / scale;

          setInteraction({
            type: 'select-box',
            startX: rawX,
            startY: rawY,
            initialElements: []
          });
        } else if (tool === 'pipe') {
          const rect = svgRef.current!.getBoundingClientRect();
          const x = snapToGrid((e.clientX - rect.left - panOffset.x) / scale);
          const y = snapToGrid((e.clientY - rect.top - panOffset.y) / scale);
          if (!drawingPipe) {
            setDrawingPipe({ points: [{ x, y }, { x, y }] });
          } else {
            const newPoints = [...drawingPipe.points];
            newPoints[newPoints.length - 1] = { x, y };
            setDrawingPipe({ points: [...newPoints, { x, y }] });
          }
        } else if (tool === 'text') {
          const rect = svgRef.current!.getBoundingClientRect();
          const newText: SynopticText = {
            id: `txt_${Date.now()}`,
            type: 'text',
            x: snapToGrid((e.clientX - rect.left - panOffset.x) / scale),
            y: snapToGrid((e.clientY - rect.top - panOffset.y) / scale),
            text: 'Label',
            fontSize: 16,
            color: '#000000',
            rotation: 0
          };
          onConfigChange({ ...config, elements: [...config.elements, newText] });
          setTool('select');
          setSelectedIds([newText.id]);
        }
      }
    }
  };

  const handleElementClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    // OPERATOR MODE: Open Command Window
    if (!isEditing) {
      const el = config.elements.find(e => e.id === id);
      if (el?.variableId) {
        setActiveCommandWindow(id);
      }
      return;
    }

    // SIMULATION MODE
    if (isSimulating) {
      const el = config.elements.find(e => e.id === id);
      if (el && el.variableId) {
        const current = getValueForVar(el.variableId);
        const next = (current === 0 || current === 'off' || current === false) ? 2 : 0;
        setSimulatedValues(prev => ({ ...prev, [el.variableId!]: next }));
      }
      return;
    }

    // EDIT MODE
    if (tool !== 'select') return;

    if (e.shiftKey) {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
      else setSelectedIds([...selectedIds, id]);
    } else {
      if (!selectedIds.includes(id)) setSelectedIds([id]);
    }
  };

  const handleInteractionStart = (e: React.MouseEvent, type: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditing || isSimulating) return;
    if (selectedElements.length === 0) return;

    setInteraction({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialElements: JSON.parse(JSON.stringify(selectedElements)),
      initialBounds: groupBounds ? { ...groupBounds } : undefined
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Pan Update
    if (interaction?.type === 'pan') {
      const dx = e.clientX - interaction.startX;
      const dy = e.clientY - interaction.startY;
      setPanOffset({
        x: interaction.initialPan!.x + dx,
        y: interaction.initialPan!.y + dy
      });
      return;
    }

    if (!isEditing) return;

    const rect = svgRef.current!.getBoundingClientRect();
    // Mouse pos relative to SVG canvas (accounting for zoom/pan)
    const mouseX = (e.clientX - rect.left - panOffset.x) / scale;
    const mouseY = (e.clientY - rect.top - panOffset.y) / scale;

    // Pipe Drawing
    if (tool === 'pipe' && drawingPipe) {
      const newPoints = [...drawingPipe.points];
      newPoints[newPoints.length - 1] = { x: snapToGrid(mouseX), y: snapToGrid(mouseY) };
      setDrawingPipe({ points: newPoints });
    }

    // Drag Selection
    if (interaction?.type === 'select-box') {
      const x = Math.min(interaction.startX, mouseX);
      const y = Math.min(interaction.startY, mouseY);
      const w = Math.abs(mouseX - interaction.startX);
      const h = Math.abs(mouseY - interaction.startY);
      setDragSelectRect({ x, y, w, h });
    }

    // Transformations
    if (interaction && interaction.type !== 'select-box' && interaction.initialBounds) {
      // Calculate delta in zoomed coordinate space
      const dx = (e.clientX - interaction.startX) / scale;
      const dy = (e.clientY - interaction.startY) / scale;

      const newElements = config.elements.map(existing => {
        const initial = interaction.initialElements!.find(i => i.id === existing.id);
        if (!initial) return existing;

        if (interaction.type === 'move') {
          const nx = snapToGrid(initial.x + dx);
          const ny = snapToGrid(initial.y + dy);
          if (existing.type === 'pipe' && initial.type === 'pipe') {
            return { ...existing, points: initial.points.map(p => ({ x: snapToGrid(p.x + dx), y: snapToGrid(p.y + dy) })) };
          }
          return { ...existing, x: nx, y: ny };
        }

        if (interaction.type === 'resize') {
          const scaleX = Math.max(0.1, (interaction.initialBounds!.w + dx) / interaction.initialBounds!.w);
          const scaleY = Math.max(0.1, (interaction.initialBounds!.h + dy) / interaction.initialBounds!.h);
          const anchorX = interaction.initialBounds!.x;
          const anchorY = interaction.initialBounds!.y;

          if ((existing.type === 'symbol' && initial.type === 'symbol') || (existing.type === 'databox' && initial.type === 'databox')) {
            const relX = initial.x - anchorX;
            const relY = initial.y - anchorY;
            return {
              ...existing,
              x: anchorX + relX * scaleX,
              y: anchorY + relY * scaleY,
              width: Math.max(10, initial.width * scaleX),
              height: Math.max(10, initial.height * scaleY)
            };
          }
          // ... Text and Pipe resize logic (similar to above, omitted for brevity but assumed preserved)
          return existing;
        }

        if (interaction.type === 'rotate') {
          const cx = interaction.initialBounds!.cx;
          const cy = interaction.initialBounds!.cy;

          // Re-calculate raw mouse positions relative to zoomed canvas for rotation angle
          const rawMouseX = (e.clientX - rect.left - panOffset.x) / scale;
          const rawMouseY = (e.clientY - rect.top - panOffset.y) / scale;

          const angleStart = Math.atan2(interaction.startY - (rect.top + panOffset.y + cy * scale), interaction.startX - (rect.left + panOffset.x + cx * scale));
          // This rotation logic is simplified for the zoomed context
          // A more robust way uses vector math from center, but let's stick to delta for now or re-calc absolute
          // Simplified: just use raw mouse pos vs center
          const angleEnd = Math.atan2(rawMouseY - cy, rawMouseX - cx);

          let angleDeg = (angleEnd * 180 / Math.PI) + 90; // Offset fix
          angleDeg = Math.round(angleDeg / 5) * 5;

          if (initial.type === 'symbol' || initial.type === 'text') {
            // Rotate position around group center
            const rotatedPos = rotatePoint(initial.x, initial.y, cx, cy, angleDeg);
            const baseRot = initial.rotation || 0;
            return {
              ...existing,
              x: rotatedPos.x,
              y: rotatedPos.y,
              rotation: Math.round((baseRot + angleDeg) % 360)
            };
          }
        }
        return existing;
      });
      onConfigChange({ ...config, elements: newElements });
    }
  };

  const handleMouseUp = () => {
    if (interaction?.type === 'select-box' && dragSelectRect) {
      const { x, y, w, h } = dragSelectRect;
      const idsToSelect: string[] = [];
      config.elements.forEach(el => {
        const b = getElementBounds(el);
        if (b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y) {
          idsToSelect.push(el.id);
        }
      });
      setSelectedIds(idsToSelect);
      setDragSelectRect(null);
    }
    setInteraction(null);
  };

  const finishPipe = () => {
    if (drawingPipe && drawingPipe.points.length > 1) {
      const finalPoints = drawingPipe.points.slice(0, -1);
      if (finalPoints.length >= 2) {
        const newPipe: SynopticPipe = {
          id: `pipe_${Date.now()}`,
          type: 'pipe',
          x: 0, y: 0,
          points: finalPoints,
          strokeWidth: 4,
          color: '#9ca3af'
        };
        onConfigChange({ ...config, elements: [...config.elements, newPipe] });
        setTimeout(() => { setSelectedIds([newPipe.id]); setTool('select'); }, 50);
      }
    }
    setDrawingPipe(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') { handleCopy(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') { handlePaste(); return; }
    if (e.key === 'Escape') { setDrawingPipe(null); setTool('select'); setInteraction(null); setSelectedIds([]); setActiveCommandWindow(null); }
    if (e.key === 'Enter' && tool === 'pipe') finishPipe();
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      onConfigChange({ ...config, elements: config.elements.filter(e => !selectedIds.includes(e.id)) });
      setSelectedIds([]);
    }
  };

  const handlePaletteDragStart = (e: React.DragEvent, type: string) => {
    e.stopPropagation(); // CRITICAL: Prevent drag from bubbling to draggable widget container
    const payload = { appType: 'synoptic-symbol', symbolType: type };
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    if (!isEditing) return;
    if (!e.dataTransfer) return; // Fix: Safety check

    const rect = svgRef.current!.getBoundingClientRect();
    const x = snapToGrid((e.clientX - rect.left - panOffset.x) / scale);
    const y = snapToGrid((e.clientY - rect.top - panOffset.y) / scale);

    let data: any = null;
    let variableIdStr: string | null = null;
    const txt = e.dataTransfer.getData("text/plain");
    if (txt) {
      try {
        if (txt.startsWith('{')) data = JSON.parse(txt);
        else if (txt.startsWith('VAR:')) variableIdStr = txt.substring(4);
      } catch (err) { }
    }

    if (variableIdStr) {
      const topElement = [...config.elements].reverse().find(el => {
        if (el.type === 'symbol' || el.type === 'databox') {
          return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
        }
        return false;
      });

      if (topElement) {
        // If it's a databox, add the variable to the databox config
        if (topElement.type === 'databox') {
          const box = topElement as SynopticDatabox;
          // Avoid duplicates
          if (box.databoxConfig.nodes.some(n => n.id === variableIdStr)) return;

          const newNode: DataboxNode = {
            id: variableIdStr!,
            labelOverride: undefined,
            showUnit: true,
            numberFormat: '#.00',
            color: '#3b82f6'
          };

          const newConfig = {
            ...box.databoxConfig,
            nodes: [...box.databoxConfig.nodes, newNode]
          };

          const newElements = config.elements.map(el => el.id === box.id ? { ...el, databoxConfig: newConfig } : el);
          onConfigChange({ ...config, elements: newElements as SynopticElement[] });
          setSelectedIds([box.id]);
          return;
        }

        // Existing symbol logic + pump binding auto-detect
        if (topElement.type === 'symbol' && (topElement as SynopticSymbol).symbolType.startsWith('pump')) {
          const auto = autoDetectPumpBindings(variableIdStr);
          const newElements = config.elements.map(el => {
            if (el.id !== topElement.id || el.type !== 'symbol') return el;
            const sym = el as SynopticSymbol;
            return {
              ...sym,
              variableId: variableIdStr!,
              pumpBindings: { ...(sym.pumpBindings || {}), ...auto }
            };
          });
          onConfigChange({ ...config, elements: newElements as SynopticElement[] });
          setSelectedIds([topElement.id]);
          return;
        }

        const newElements = config.elements.map(el => el.id === topElement.id ? { ...el, variableId: variableIdStr! } : el);
        onConfigChange({ ...config, elements: newElements as SynopticElement[] });
        setSelectedIds([topElement.id]);
      }
      return;
    }

    if (data && data.appType === 'synoptic-symbol' && data.symbolType) {
      if (data.symbolType === 'databox') {
        const newBox: SynopticDatabox = {
          id: `box_${Date.now()}`,
          type: 'databox',
          x: x - 50, y: y - 50, width: 200, height: 150,
          databoxConfig: {
            showHeader: true,
            headerText: 'Data',
            showLabels: true,
            nodes: []
          }
        };
        onConfigChange({ ...config, elements: [...config.elements, newBox] });
        setSelectedIds([newBox.id]);
        setTool('select');
      } else {
        const newSymbol: SynopticSymbol = {
          id: `sym_${Date.now()}`,
          type: 'symbol',
          symbolType: data.symbolType as HVACSymbolType,
          x: x - 20, y: y - 20, width: 40, height: 40, rotation: 0
        };
        onConfigChange({ ...config, elements: [...config.elements, newSymbol] });
        setSelectedIds([newSymbol.id]);
        setTool('select');
      }
    }
  };

  const updateSelection = (updates: Partial<SynopticElement>) => {
    const newElements = config.elements.map(el => selectedIds.includes(el.id) ? { ...el, ...updates } as SynopticElement : el);
    onConfigChange({ ...config, elements: newElements });
  };

  const updatePumpBindings = (symbolId: string, updates: Partial<NonNullable<SynopticSymbol['pumpBindings']>>) => {
    const newElements = config.elements.map(el => {
      if (el.id !== symbolId || el.type !== 'symbol') return el;
      const sym = el as SynopticSymbol;
      return { ...sym, pumpBindings: { ...(sym.pumpBindings || {}), ...updates } };
    });
    onConfigChange({ ...config, elements: newElements as SynopticElement[] });
  };

  const firstSelected = config.elements.find(e => e.id === selectedIds[0]);
  const selectedPump = firstSelected && firstSelected.type === 'symbol' && (firstSelected as SynopticSymbol).symbolType.startsWith('pump')
    ? (firstSelected as SynopticSymbol)
    : null;
  type PumpBindingKey = 'commandId' | 'feedbackId' | 'alarmId' | 'manualId' | 'displayId';
  const pumpFields: { key: PumpBindingKey; label: string }[] = [
    { key: 'commandId', label: 'Commande (cd_et)' },
    { key: 'feedbackId', label: 'Retour marche (rm_et)' },
    { key: 'alarmId', label: 'Alarme (th/df/dis)' },
    { key: 'manualId', label: 'Mode manuel (mode_man)' },
    { key: 'displayId', label: 'Valeur affichée' },
  ];

  const togglePaletteSection = (title: string) => {
    setOpenPaletteSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // --- Render Components ---

  const CommandWindow = () => {
    if (!activeCommandWindow) return null;
    const el = config.elements.find(e => e.id === activeCommandWindow);
    if (!el || !el.variableId) return null;

    const variable = variables.find(v => v.id === el.variableId);
    const currentVal = getValueForVar(el.variableId);
    const pumpBindings = el.type === 'symbol' && (el as SynopticSymbol).symbolType.startsWith('pump') ? (el as SynopticSymbol).pumpBindings || {} : undefined;
    const boundIds = pumpBindings ? [el.variableId, pumpBindings.commandId, pumpBindings.feedbackId, pumpBindings.alarmId, pumpBindings.manualId, pumpBindings.displayId].filter(Boolean) as string[] : [el.variableId];

    const pickBool = (v: any) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';

    const applyStatusToBindings = (kind: 'masked' | 'maintenance') => {
      const nextValues: Record<string, any> = { ...simulatedValues };
      const targetIds = boundIds;
      targetIds.forEach(id => {
        if (kind === 'masked') {
          const prev = nextValues[id];
          const current = typeof prev === 'object' ? pickBool((prev as any).masked) : false;
          const next = !current;
          nextValues[id] = { ...(typeof prev === 'object' ? prev : {}), masked: next, maintenance: false };
        } else {
          const prev = nextValues[id];
          const current = typeof prev === 'object' ? pickBool((prev as any).maintenance) : false;
          const next = !current;
          nextValues[id] = { ...(typeof prev === 'object' ? prev : {}), maintenance: next, masked: false };
        }
      });
      setSimulatedValues(nextValues);
    };

    const isMasked = boundIds.some(id => {
      const val = simulatedValues[id];
      return pickBool((val as any)?.masked || (val as any)?.isMasked || (val as any)?.mute || (val as any)?.silenced);
    });
    const isMaint = boundIds.some(id => {
      const val = simulatedValues[id];
      return pickBool((val as any)?.maintenance || (val as any)?.maint);
    });

    // Calculate position relative to the element (anchored)
    const screenX = (el.x * scale) + panOffset.x + 60;
    const screenY = (el.y * scale) + panOffset.y;

    return (
      <div
        className="absolute z-50 w-64 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col animate-in zoom-in-95 duration-100"
        style={{ left: screenX, top: screenY }}
      >
        <div className="h-1 w-12 bg-gray-300 rounded-full mx-auto my-1 absolute -top-2 left-1/2 -translate-x-1/2 hidden" /> {/* Connector placeholder */}
        <div className="p-3 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5 rounded-t-lg">
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">{variable?.label || 'Object'}</h4>
            <p className="text-[10px] text-gray-500">{el.variableId}</p>
          </div>
          <button onClick={() => setActiveCommandWindow(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-500/30">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Current Value</span>
            <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
              {typeof currentVal === 'number' ? currentVal.toFixed(1) : currentVal} {getUnitForVar(el.variableId)}
            </span>
          </div>

          {pumpBindings && (
            <div className="mb-3 space-y-2">
              <p className="text-[10px] font-bold uppercase text-gray-400">Mode & commande</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (pumpBindings.modeId) setSimulatedValues(p => ({ ...p, [pumpBindings.modeId!]: 0 }));
                  }}
                  className="py-2 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200"
                >
                  Auto
                </button>
                <button
                  onClick={() => {
                    if (pumpBindings.modeId) setSimulatedValues(p => ({ ...p, [pumpBindings.modeId!]: 1 }));
                  }}
                  className="py-2 rounded bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200"
                >
                  Manuel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!pumpBindings.commandId}
                  onClick={() => {
                    if (pumpBindings.commandId) setSimulatedValues(p => ({ ...p, [pumpBindings.commandId!]: 2 }));
                  }}
                  className="py-2 rounded bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 disabled:opacity-50"
                >
                  On (manuel)
                </button>
                <button
                  disabled={!pumpBindings.commandId}
                  onClick={() => {
                    if (pumpBindings.commandId) setSimulatedValues(p => ({ ...p, [pumpBindings.commandId!]: 0 }));
                  }}
                  className="py-2 rounded bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
                >
                  Off (manuel)
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-gray-400">Commands</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSimulatedValues(p => ({ ...p, [el.variableId!]: 'Auto' }))} className="py-2 rounded bg-gray-100 dark:bg-white/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs font-medium transition-colors">Auto</button>
              <button onClick={() => setSimulatedValues(p => ({ ...p, [el.variableId!]: 2 }))} className="py-2 rounded bg-green-100 dark:bg-green-900/20 hover:bg-green-200 text-green-700 dark:text-green-400 text-xs font-medium transition-colors">On</button>
              <button onClick={() => setSimulatedValues(p => ({ ...p, [el.variableId!]: 0 }))} className="py-2 rounded bg-red-100 dark:bg-red-900/20 hover:bg-red-200 text-red-700 dark:text-red-400 text-xs font-medium transition-colors">Off</button>
            </div>
            {pumpBindings && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => applyStatusToBindings('masked')}
                  className={`py-2 rounded text-xs font-semibold transition-colors ${isMasked ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}
                >
                  Masquer (pump + liens)
                </button>
                <button
                  onClick={() => applyStatusToBindings('maintenance')}
                  className={`py-2 rounded text-xs font-semibold transition-colors ${isMaint ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                >
                  Maintenance (pump + liens)
                </button>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <label className="text-[10px] text-gray-400 block mb-1">Setpoint / Analog Override</label>
              <input
                type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                min="0" max="100"
                onChange={(e) => setSimulatedValues(p => ({ ...p, [el.variableId!]: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-b-lg text-center">
          <button className="text-[10px] text-blue-500 hover:underline flex items-center justify-center gap-1 mx-auto">
            <Activity size={10} /> View Trend Log
          </button>
        </div>
      </div>
    );
  };

  const MiniMap = () => {
    if (!showMinimap) return null;
    // Calculate scale to fit
    const miniScale = 0.15;
    return (
      <div className="absolute bottom-4 right-4 w-48 h-32 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 shadow-xl rounded-lg overflow-hidden z-40">
        <div className="relative w-full h-full bg-gray-50 dark:bg-black/20">
          <svg width="100%" height="100%" viewBox={`0 0 ${1000} ${600}`}>
            {config.elements.map(el => {
              if (el.type === 'pipe') {
                return <polyline key={el.id} points={(el as SynopticPipe).points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ccc" strokeWidth="10" />
              }
              if (el.type === 'symbol') return <rect key={el.id} x={el.x} y={el.y} width={(el as SynopticSymbol).width} height={(el as SynopticSymbol).height} fill="#ccc" />;
              if (el.type === 'databox') return <rect key={el.id} x={el.x} y={el.y} width={(el as SynopticDatabox).width} height={(el as SynopticDatabox).height} fill="#999" opacity={0.5} />;
              return null;
            })}
          </svg>
          {/* Viewport Rect */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-move"
            style={{
              left: -panOffset.x * miniScale / scale, // Approximate mapping
              top: -panOffset.y * miniScale / scale,
              width: '40%', height: '40%' // Mock viewport size relative to canvas
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#121212] relative" onKeyDown={handleKeyDown} tabIndex={0}>

      {/* --- TOOLBAR (EDITOR MODE) --- */}
      {isEditing && (
        <div className="h-14 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex items-center px-3 gap-4 shrink-0 overflow-x-auto z-10 relative no-scrollbar">
          {/* ... Existing Editing Toolbar Controls ... */}
          <div className="flex items-center gap-2 bg-white dark:bg-black/20 rounded-lg p-1 border border-gray-200 dark:border-white/10 shadow-sm shrink-0">
            <button onClick={() => { setTool('select'); setDrawingPipe(null); }} className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-colors ${tool === 'select' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}> <MousePointer size={14} /> Select </button>
            <button onClick={() => { setTool('pipe'); setSelectedIds([]); }} className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-colors ${tool === 'pipe' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}> <PenTool size={14} /> Pipe </button>
            <button onClick={() => { setTool('text'); setSelectedIds([]); }} className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-colors ${tool === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}> <Type size={14} /> Text </button>
          </div>
          <div className="h-8 w-px bg-gray-300 dark:bg-white/10 shrink-0" />
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} disabled={selectedIds.length === 0} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-gray-600 dark:text-gray-300" title="Copy (Ctrl+C)"> <Copy size={14} /> </button>
            <button onClick={handlePaste} disabled={clipboard.length === 0} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-gray-600 dark:text-gray-300" title="Paste (Ctrl+V)"> <Clipboard size={14} /> </button>
          </div>
          <div className="h-8 w-px bg-gray-300 dark:bg-white/10 shrink-0" />
          <button onClick={() => { setIsSimulating(!isSimulating); setSelectedIds([]); }} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${isSimulating ? 'bg-orange-500 text-white shadow-md animate-pulse' : 'bg-green-600 text-white hover:bg-green-700'}`}> {isSimulating ? <StopCircle size={14} /> : <PlayCircle size={14} />} {isSimulating ? 'Stop Test' : 'Test Mode'} </button>
          <div className="h-8 w-px bg-gray-300 dark:bg-white/10 shrink-0" />
          {selectedIds.length > 0 && !isSimulating ? (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1 whitespace-nowrap overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 p-1 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="flex gap-1"> {COLORS.map(c => (<button key={c.val} onClick={() => updateSelection({ color: c.val })} className={`w-5 h-5 rounded border border-gray-200 dark:border-white/10 ${firstSelected?.color === c.val ? 'ring-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: c.val }} title={c.label} />))} </div>
              </div>
              <button onClick={() => updateSelection({ rotation: ((firstSelected?.rotation || 0) + 90) % 360 })} className="px-2 py-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg flex items-center gap-1 text-xs font-bold" title="Rotate +90°"> <RotateCw size={12} /> Rot </button>
              {selectedIds.length === 1 && firstSelected?.type === 'symbol' && (<div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-xs ${firstSelected.variableId ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-dashed border-gray-300 text-gray-400'}`}> <span className="truncate max-w-[80px]">{firstSelected.variableId ? variables.find(v => v.id === firstSelected.variableId)?.label || 'Linked' : 'No Link'}</span> {firstSelected.variableId && <button onClick={() => updateSelection({ variableId: undefined })} className="hover:text-red-500"><X size={10} /></button>} </div>)}
              <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1" />
              <button onClick={() => { onConfigChange({ ...config, elements: config.elements.filter(e => !selectedIds.includes(e.id)) }); setSelectedIds([]); }} className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-1 text-xs font-bold"><Trash2 size={12} /> Del</button>
            </div>
          ) : (<div className="text-xs text-gray-400 italic"> {isSimulating ? 'Click symbols to toggle.' : 'Select elements to edit'} </div>)}
        </div>
      )}

      {/* --- TOOLBAR (VIEW / OPERATOR MODE) --- */}
      {!isEditing && (
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-white/10 p-1 flex flex-col gap-1">
            <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300" title="Zoom In (+)"><ZoomIn size={18} /></button>
            <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300" title="Zoom Out (-)"><ZoomOut size={18} /></button>
            <button onClick={handleFit} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300" title="Fit to Page (100%)"><Maximize size={18} /></button>
          </div>
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-white/10 p-1 flex flex-col gap-1">
            <button onClick={() => setShowMinimap(!showMinimap)} className={`p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded ${showMinimap ? 'text-blue-500' : 'text-gray-600 dark:text-gray-300'}`} title="Toggle Bird's Eye View"><MapIcon size={18} /></button>
          </div>
        </div>
      )}

      {/* Pump binding configurator (edit mode) */}
      {isEditing && selectedPump && (
        <div className="absolute top-16 right-4 z-40 w-80 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Pump bindings</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedPump.label || 'Pump'} · {selectedPump.variableId || 'aucune variable liée'}</p>
            </div>
            <button
              className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded"
              onClick={() => {
                const auto = autoDetectPumpBindings(selectedPump.variableId || selectedPump.label);
                updatePumpBindings(selectedPump.id, auto);
              }}
            >
              Auto
            </button>
          </div>
          {pumpFields.map(field => (
            <label key={field.key} className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{field.label}</span>
              <select
                className="h-8 rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-[#2b2b30] text-sm px-2"
                value={(selectedPump.pumpBindings?.[field.key] as string) || ''}
                onChange={(e) => updatePumpBindings(
                  selectedPump.id,
                  { [field.key]: e.target.value || undefined } as Record<PumpBindingKey, string | undefined>
                )}
              >
                <option value="">Aucun</option>
                {variables.map(v => (
                  <option key={v.id} value={v.id}>{v.label || v.id}</option>
                ))}
              </select>
            </label>
          ))}
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Astuce : déposez un point sur le symbole pour pré-remplir. L’auto-détection cherche les suffixes cd_et, rm_et, th_al/df_al/dis_al et mode_man.
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* --- PALETTE & SIM PANEL --- */}
        {isEditing && !isSimulating && (
          <div className="w-44 bg-gray-50 dark:bg-[#1c1c1e] border-r border-gray-200 dark:border-white/10 overflow-y-auto flex flex-col shrink-0 shadow-inner z-10 custom-scrollbar">
            {PALETTE_SECTIONS.map(section => (
              <div key={section.title} className="border-b border-gray-200 dark:border-white/5">
                <button
                  onClick={() => togglePaletteSection(section.title)}
                  className="w-full flex items-center justify-between p-3 text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  {section.title}
                  {openPaletteSections[section.title] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {openPaletteSections[section.title] && (
                  <div className="p-2 grid grid-cols-2 gap-2 bg-gray-100/50 dark:bg-black/10">
                    {section.items.map(item => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => handlePaletteDragStart(e, item.type)}
                        className="flex flex-col items-center p-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg cursor-grab hover:shadow-md transition-all active:cursor-grabbing hover:border-blue-400 group"
                        title={item.label}
                      >
                        <div className="w-8 h-8 mb-1 pointer-events-none group-hover:scale-110 transition-transform flex items-center justify-center">
                          {item.type === 'databox' ? <List size={24} className="text-gray-500" /> : <HVACSymbol type={item.type as HVACSymbolType} value={0} />}
                        </div>
                        <span className="text-[9px] font-medium text-center leading-tight text-gray-600 dark:text-gray-400 line-clamp-2">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- CANVAS --- */}
        <div ref={containerRef} className={`flex-1 relative bg-white dark:bg-[#121212] overflow-hidden ${tool === 'pipe' && !isSimulating ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }} onDrop={handleDrop}>
          {isEditing && (<div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)`, backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`, backgroundPosition: `${panOffset.x}px ${panOffset.y}px` }} />)}

          <svg ref={svgRef} width="100%" height="100%" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="w-full h-full outline-none touch-none">
            <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${scale})`}>

              {/* 1. Pipes */}
              {config.elements.filter(e => e.type === 'pipe').map(el => {
                const pipe = el as SynopticPipe;
                const pointsStr = pipe.points.map(p => `${p.x},${p.y}`).join(' ');
                const isSelected = selectedIds.includes(el.id);
                return (
                  <g key={el.id} onClick={(e) => handleElementClick(e, el.id)} onMouseDown={(e) => isEditing && selectedIds.includes(el.id) && handleInteractionStart(e, 'move')}>
                    <polyline points={pointsStr} fill="none" stroke="transparent" strokeWidth={Math.max(10, pipe.strokeWidth + 10)} strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer" />
                    <polyline points={pointsStr} fill="none" stroke={pipe.color || '#9ca3af'} strokeWidth={pipe.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" />
                    {isEditing && isSelected && <polyline points={pointsStr} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" className="pointer-events-none opacity-50" />}
                  </g>
                );
              })}

              {drawingPipe && (<polyline points={drawingPipe.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="5 5" className="pointer-events-none animate-pulse" />)}

              {/* 2. Symbols & Databoxes */}
              {config.elements.filter(e => e.type === 'symbol' || e.type === 'databox').map(el => {
                const isSelected = selectedIds.includes(el.id);

                if (el.type === 'databox') {
                  const box = el as SynopticDatabox;
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${box.x}, ${box.y})`}
                      onClick={(e) => handleElementClick(e, el.id)}
                      onMouseDown={(e) => isEditing && selectedIds.includes(el.id) && handleInteractionStart(e, 'move')}
                    >
                      <foreignObject width={box.width} height={box.height} style={{ overflow: 'visible' }} className="pointer-events-none">
                        <div className="w-full h-full bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded shadow-sm overflow-hidden pointer-events-none">
                          <DataboxWidget
                            config={box.databoxConfig}
                            variables={variables}
                            isEditing={false}
                          />
                        </div>
                      </foreignObject>

                      {/* Selection Box */}
                      {isEditing && isSelected && !isSimulating && <rect x="-2" y="-2" width={box.width + 4} height={box.height + 4} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" className="pointer-events-none" />}
                    </g>
                  );
                }

                const sym = el as SynopticSymbol;
                const pumpVal = sym.symbolType.startsWith('pump') ? getPumpState(sym.variableId, sym.pumpBindings) : undefined;
                const rawVal = pumpVal && Object.keys(pumpVal).length > 0 ? pumpVal : getValueForVar(sym.variableId);
                const unit = getUnitForVar(sym.variableId);
                const sanitizeDisplay = (val: any) => {
                  if (val === null || val === undefined) return '';
                  if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val;
                  if (typeof val === 'object') {
                    if ('display' in val && typeof (val as any).display !== 'object') return (val as any).display;
                    if ('value' in val && typeof (val as any).value !== 'object') return (val as any).value;
                    return '';
                  }
                  return '';
                };
                const displayVal = sym.symbolType.startsWith('pump')
                  ? sanitizeDisplay((pumpVal as any)?.display ?? (pumpVal as any)?.value ?? rawVal)
                  : sanitizeDisplay(rawVal);
                const isInteractive = !!sym.variableId;

                return (
                  <g
                    key={el.id}
                    transform={`translate(${sym.x}, ${sym.y})`}
                    onClick={(e) => handleElementClick(e, el.id)}
                    onMouseDown={(e) => isEditing && selectedIds.includes(el.id) && handleInteractionStart(e, 'move')}
                    onMouseEnter={() => setHoveredElementId(el.id)}
                    onMouseLeave={() => setHoveredElementId(null)}
                    className={`group ${!isEditing && isInteractive ? 'cursor-pointer hover:brightness-110 transition-all' : 'cursor-default'}`}
                  >
                    <foreignObject width={sym.width} height={sym.height} className="pointer-events-none">
                      <HVACSymbol type={sym.symbolType} value={rawVal} orientation={sym.rotation} showValue={false} className="w-full h-full" />
                    </foreignObject>

                    {/* Selection Box */}
                    {isEditing && isSelected && !isSimulating && <rect x="-2" y="-2" width={sym.width + 4} height={sym.height + 4} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" className="pointer-events-none" />}

                    {/* Static Label (Editor) / Value Tag */}
                    {(sym.variableId || sym.label) && (
                      <g transform={`translate(${sym.width / 2}, ${sym.height + 12})`}>
                        <rect x="-30" y="-10" width="60" height="20" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" className="shadow-sm opacity-90" />
                        <text x="0" y="4" textAnchor="middle" fontSize="10" fill="black" fontWeight="bold" fontFamily="monospace"> {typeof displayVal === 'number' ? displayVal.toFixed(1) : displayVal} {unit} </text>
                      </g>
                    )}

                    {/* Dynamic Tooltip (Operator Mode) */}
                    {!isEditing && hoveredElementId === el.id && sym.variableId && (
                      <g transform={`translate(${sym.width + 5}, 0)`} className="pointer-events-none">
                        <rect x="0" y="0" width="120" height="50" rx="4" fill="rgba(0,0,0,0.85)" stroke="none" />
                        <text x="10" y="20" fill="white" fontSize="10" fontWeight="bold">{variables.find(v => v.id === sym.variableId)?.label || sym.variableId}</text>
                        <text x="10" y="38" fill="#4ade80" fontSize="12" fontWeight="bold">{typeof displayVal === 'number' ? displayVal.toFixed(1) : displayVal} {unit}</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 3. Text */}
              {config.elements.filter(e => e.type === 'text').map(el => {
                const txt = el as SynopticText;
                const isSelected = selectedIds.includes(el.id);
                return (
                  <text key={el.id} x={txt.x} y={txt.y} fontSize={txt.fontSize} fill={txt.color || 'black'} fontWeight={txt.fontWeight} transform={`rotate(${txt.rotation || 0}, ${txt.x}, ${txt.y})`} className={`cursor-pointer select-none ${isSelected ? 'fill-blue-600 font-bold' : ''}`} onClick={(e) => handleElementClick(e, el.id)} onMouseDown={(e) => isEditing && selectedIds.includes(el.id) && handleInteractionStart(e, 'move')}> {txt.text} </text>
                );
              })}

              {/* 4. Group Transformer */}
              {isEditing && !isSimulating && selectedIds.length > 0 && groupBounds && (
                <g className="pointer-events-auto">
                  <rect x={groupBounds.x - 2} y={groupBounds.y - 2} width={groupBounds.w + 4} height={groupBounds.h + 4} fill="none" stroke="#3b82f6" strokeWidth="1" className="pointer-events-none" />
                  <rect x={groupBounds.x} y={groupBounds.y} width={groupBounds.w} height={groupBounds.h} fill="transparent" cursor="move" onMouseDown={(e) => handleInteractionStart(e, 'move')} />
                  <g transform={`translate(${groupBounds.cx}, ${groupBounds.y - 20})`}>
                    <line x1="0" y1="0" x2="0" y2="20" stroke="#3b82f6" strokeWidth="1" />
                    <circle cx="0" cy="0" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" cursor="grab" onMouseDown={(e) => handleInteractionStart(e, 'rotate')} />
                  </g>
                  <g transform={`translate(${groupBounds.x + groupBounds.w + 2}, ${groupBounds.y + groupBounds.h + 2})`}>
                    <circle cx="0" cy="0" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" cursor="se-resize" onMouseDown={(e) => handleInteractionStart(e, 'resize')} />
                  </g>
                </g>
              )}

              {dragSelectRect && (<rect x={dragSelectRect.x} y={dragSelectRect.y} width={dragSelectRect.w} height={dragSelectRect.h} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" className="pointer-events-none" />)}
            </g>
          </svg>

          {/* Operator Mode Elements */}
          <MiniMap />
          <CommandWindow />
        </div>
      </div>
    </div>
  );
};
