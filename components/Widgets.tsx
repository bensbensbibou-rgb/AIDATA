import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Maximize2, Download, Upload, ArrowLeftRight, Minimize2, GripHorizontal, Scaling, X, Link2, Lock, Send, Sparkles, User, Bot, PaintBucket, Palette, Database, Gauge, Zap, Leaf, Map, Info, Plus, Image as ImageIcon, Layers, MoreHorizontal, FileImage, Folder, ArrowLeft, Check, Settings, Trash2, Activity, Move, Eye, EyeOff, AlertTriangle, Clock, ArrowRight, ChevronsUpDown, Save, Calendar, SlidersHorizontal, List, TrendingUp, PlayCircle, StopCircle, MousePointerClick, Bell, Search, Filter, ArrowDownUp, Volume2, CheckSquare, Square, MoreVertical, Cloud, CloudRain, CloudSnow, Sun, Wind, Droplets, Fan as FanIcon, Thermometer as ThermometerIcon, Power, Disc, Settings2, Monitor, Flame, Snowflake, PenTool, MousePointer, Workflow, Siren, Waves, CloudSun, ZoomIn, ZoomOut, Hand, Minus, Type, ChevronDown, ChevronRight, BellRing, VolumeX, Maximize, LayoutTemplate, BoxSelect, Eraser, Unlock, File, MousePointer2, Pencil } from 'lucide-react';
import { Period, FloorPlanLayer, FloorPlanObject, ChatMessage, Alarm, DataboxNode, HVACSymbolType, SynopticConfig, ZoneConfig, LogicConfig, FloorPlanConfig, FloorPlanObjectType, Language } from '../types';
import { HVACSymbol } from './HVACSymbols';
import { SynopticEditor } from './SynopticEditor';
import { DataboxWidget } from './Databox';
import { LogicEditorWidget } from './LogicEditor';
import { MiniSparkline } from './Charts';
import { TRANSLATIONS } from '../constants';

// Re-export specific widgets
export { DataboxWidget };
export const SynopticWidget = SynopticEditor;
export const LogicWidget = LogicEditorWidget;

// --- Interfaces ---

interface ChartToolbarProps {
    onRefresh?: () => void;
    onExpand?: () => void;
    onExport?: () => void;
    onImport?: (file: File) => void;
    onWiden?: () => void;
    onExtend?: () => void;
}

interface PeriodSelectorProps {
    current: Period;
    onChange: (p: Period) => void;
}

interface EditableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    isEditing: boolean;
    value: string;
    onChangeValue: (val: string) => void;
    className?: string;
    placeholder?: string;
}

interface CardProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    action?: ReactNode;
    tools?: ChartToolbarProps;
    isEditing?: boolean;
    onResize?: (width: number, height: number) => void;
    onRemove?: () => void;
    onSwap?: () => void;
    dragHandleProps?: any;
    onReorderDragOver?: (e: React.DragEvent) => void;
    onTitleChange?: (val: string) => void;
    onSubtitleChange?: (val: string) => void;
    isLocked?: boolean;
    colorTheme?: string;
    backgroundColor?: string;
    onColorChange?: (color: string) => void;
    onBackgroundChange?: (color: string) => void;
    onDataDrop?: (variableId: string) => void;
    noPadding?: boolean;
    variables?: { id: string, label: string, unit?: string, color?: string, fontSize?: string, fontFamily?: string }[];
    onRemoveVariable?: (id: string) => void;
    onVariableStyleChange?: (id: string, style: { color?: string, fontSize?: string, fontFamily?: string }) => void;
    language?: Language;
}

export interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    trend?: number;
    trendType?: 'up' | 'down' | 'flat';
    className?: string;
    onClick?: () => void;
    isEditing?: boolean;
    onLabelChange?: (v: string) => void;
    onValueChange?: (v: string) => void;
    onSubChange?: (v: string) => void;
    isLocked?: boolean;
    colorTheme?: string;
    backgroundColor?: string;
    onColorChange?: (color: string) => void;
    onBackgroundChange?: (color: string) => void;
    variableConfig?: { id: string, label: string, unit?: string, color?: string, fontSize?: string, fontFamily?: string };
    chartData?: any[];
    language?: Language;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
    size?: 'sm' | 'md' | 'icon';
}

// --- Helper Components ---

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseStyle = "rounded-xl font-medium transition-colors flex items-center justify-center gap-2 active:scale-95 duration-200";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20",
        secondary: "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20",
        ghost: "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5",
        accent: "bg-indigo-600 text-white hover:bg-indigo-700",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
    };
    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        icon: "p-2"
    };
    return <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

export const EditableInput: React.FC<EditableInputProps> = ({ isEditing, value, onChangeValue, className = '', ...props }) => {
    if (isEditing) {
        return (
            <input
                value={value}
                onChange={(e) => onChangeValue(e.target.value)}
                className={`border-b border-dashed border-gray-300 dark:border-gray-600 px-1 outline-none ${className}`}
                onClick={(e) => e.stopPropagation()}
                {...props}
            />
        );
    }
    return <span className={className}>{value}</span>;
};

export const ChartToolbar: React.FC<ChartToolbarProps> = ({ onRefresh, onExpand, onExport, onImport, onWiden, onExtend }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && onImport) {
            onImport(e.target.files[0]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex items-center gap-1">
            {onImport && (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,.json,.csv"
                        onChange={handleFileChange}
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Import">
                        <Upload size={14} />
                    </button>
                </>
            )}
            {onExport && <button onClick={onExport} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Export"><Download size={14} /></button>}
            {onWiden && <button onClick={onWiden} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Widen"><ArrowLeftRight size={14} /></button>}
            {onExtend && <button onClick={onExtend} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Extend Height"><ChevronsUpDown size={14} /></button>}
            {onRefresh && <button onClick={onRefresh} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Refresh"><RefreshCw size={14} /></button>}
            {onExpand && <button onClick={onExpand} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5" title="Expand"><Maximize2 size={14} /></button>}
        </div>
    );
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ current, onChange }) => {
    const periods: { id: Period, label: string }[] = [
        { id: 'j', label: 'Day' },
        { id: 'm', label: 'Month' },
        { id: 'a', label: 'Year' },
        { id: 'd', label: 'All' }
    ];

    return (
        <div className="flex bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-1 shadow-sm items-center">
            {periods.map((p) => (
                <button
                    key={p.id}
                    onClick={() => onChange(p.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${current === p.id
                            ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
};

// --- DRAGGABLE FLOATING PANEL ---
const DraggableFloatingPanel: React.FC<{
    title: string;
    onClose: () => void;
    children: ReactNode;
    initialX?: number;
    initialY?: number;
    width?: string;
}> = ({ title, onClose, children, initialX = window.innerWidth / 2 - 128, initialY = window.innerHeight / 2 - 150, width = "w-64" }) => {
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    return createPortal(
        <div
            className={`fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col ${width} animate-in zoom-in-95 duration-150`}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/10 cursor-move bg-gray-50 dark:bg-white/5 rounded-t-xl"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
                }}
            >
                <span className="text-xs font-bold uppercase text-gray-500">{title}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
                {children}
            </div>
        </div>,
        document.body
    );
};

const FONT_FAMILIES = [
    { label: 'Default', value: '' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Impact', value: 'Impact, sans-serif' },
];

const FONT_SIZES = [
    8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72, 96
];

const VariableSettings: React.FC<{
    variable: { id: string, label: string, color?: string, fontSize?: string, fontFamily?: string };
    onChange: (updates: { color?: string, fontSize?: string, fontFamily?: string }) => void;
    onRemove: () => void;
}> = ({ variable, onChange, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentSize = variable.fontSize ? parseInt(variable.fontSize) : 18;

    return (
        <>
            <div
                className="flex items-center gap-2 text-xs bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 px-2 py-1 rounded-md cursor-pointer hover:border-blue-400 transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
            >
                <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: variable.color || '#000' }} />
                <span className="truncate max-w-[80px]">{variable.label}</span>
                <Settings2 size={10} className="text-gray-400" />
            </div>

            {isOpen && (
                <DraggableFloatingPanel
                    title={`Edit: ${variable.label}`}
                    onClose={() => setIsOpen(false)}
                    initialX={window.innerWidth / 2 - 128}
                    initialY={window.innerHeight / 2 - 100}
                >
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Color</label>
                        <div className="flex flex-wrap gap-1">
                            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#111827', '#6b7280', '#ffffff'].map(c => (
                                <button
                                    key={c}
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange({ color: c }); }}
                                    className={`w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110 ${variable.color === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Font</label>
                            <div className="relative">
                                <select
                                    className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 appearance-none outline-none focus:border-blue-500 dark:text-white"
                                    value={variable.fontFamily || ''}
                                    onChange={(e) => onChange({ fontFamily: e.target.value })}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {FONT_FAMILIES.map(f => (
                                        <option key={f.label} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Size</label>
                            <div className="relative">
                                <select
                                    className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 appearance-none outline-none focus:border-blue-500 dark:text-white"
                                    value={currentSize}
                                    onChange={(e) => onChange({ fontSize: `${e.target.value}px` })}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {FONT_SIZES.map(s => (
                                        <option key={s} value={s}>{s}px</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); setIsOpen(false); }}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 size={12} /> Remove Variable
                    </button>
                </DraggableFloatingPanel>
            )}
        </>
    );
};

export const Card: React.FC<CardProps> = ({
    children, className = '', style, onClick, title, subtitle, icon, action, tools, isEditing,
    onResize, onRemove, onSwap, dragHandleProps, onReorderDragOver, onTitleChange, onSubtitleChange,
    colorTheme = 'default', backgroundColor = 'default', onColorChange, onBackgroundChange,
    onDataDrop, noPadding, variables, onRemoveVariable, onVariableStyleChange, language = 'en'
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const t = TRANSLATIONS[language];

    const handleDrop = (e: React.DragEvent) => {
        // Allow 'new-widget' type to bubble up to grid container
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) {
            // If no data, allow default/bubble
            setIsHovered(false);
            return;
        }

        try {
            const data = JSON.parse(raw);
            // Only consume the event if it's a variable drop that this card handles
            if (data.type === 'variable' && onDataDrop) {
                e.preventDefault();
                e.stopPropagation();
                onDataDrop(data.id);
                setIsHovered(false);
                return;
            }
        } catch (e) {
            // Parsing error, ignore and let bubble
        }
        setIsHovered(false);
    };

    const bgColors: Record<string, string> = {
        default: 'bg-white dark:bg-[#1c1c1e]',
        blue: 'bg-blue-50 dark:bg-blue-900/10',
        green: 'bg-green-50 dark:bg-green-900/10',
        red: 'bg-red-50 dark:bg-red-900/10',
        orange: 'bg-orange-50 dark:bg-orange-900/10',
        dark: 'bg-gray-900 text-white',
    };

    // Map theme colors to a "header" styling effect if desired
    const headerColors: Record<string, string> = {
        default: '',
        blue: 'text-blue-600 dark:text-blue-400',
        green: 'text-green-600 dark:text-green-400',
        red: 'text-red-600 dark:text-red-400',
        orange: 'text-orange-600 dark:text-orange-400',
        dark: 'text-white'
    };

    return (
        <div
            className={`relative group rounded-3xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col transition-all duration-300 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${bgColors[backgroundColor] || bgColors.default} ${className} ${isEditing ? 'ring-2 ring-transparent hover:ring-blue-500/50' : ''} ${isEditing && isHovered ? 'ring-2 ring-blue-500 z-50' : ''}`}
            style={style}
            onClick={onClick}
            onDragOver={(e) => {
                // Only process reorder if we are editing and this is a reorder drag
                if (isEditing) {
                    e.preventDefault();
                    setIsHovered(true);
                    if (onReorderDragOver) onReorderDragOver(e);
                }
            }}
            onDragLeave={() => setIsHovered(false)}
            onDrop={(e) => {
                if (isEditing) {
                    handleDrop(e);
                }
            }}
        >
            <div
                className={`px-5 py-4 flex justify-between items-start shrink-0 relative z-20 ${isEditing ? 'cursor-move' : ''}`}
                draggable={isEditing}
                onDragStart={dragHandleProps?.onDragStart}
                onDragEnd={dragHandleProps?.onDragEnd}
            >
                <div className="flex gap-3 items-start min-w-0 flex-1 pointer-events-none">
                    {icon && <div className={`mt-1 ${colorTheme !== 'default' ? `text-${colorTheme}-500` : 'text-gray-400'}`}>{icon}</div>}
                    <div className="min-w-0 flex-1 pointer-events-auto">
                        {isEditing ? (
                            <EditableInput isEditing={true} value={title || ''} onChangeValue={v => onTitleChange?.(v)} className={`font-bold text-lg w-full bg-transparent ${headerColors[colorTheme] || ''}`} placeholder="Title" />
                        ) : (
                            <h3 className={`font-bold text-lg truncate leading-tight tracking-tight text-gray-800 dark:text-gray-100 ${headerColors[colorTheme] || ''}`}>{title}</h3>
                        )}
                        {isEditing ? (
                            <EditableInput isEditing={true} value={subtitle || ''} onChangeValue={v => onSubtitleChange?.(v)} className="text-xs text-gray-400 w-full bg-transparent" placeholder="Subtitle" />
                        ) : (
                            subtitle && <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">{subtitle}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                    {tools && !isEditing && <ChartToolbar {...tools} />}
                    {isEditing && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSwap?.(); }}
                                className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md bg-gray-50 dark:bg-white/5 hover:bg-blue-50"
                                title="Swap Widget"
                            >
                                <ArrowLeftRight size={14} />
                            </button>
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md bg-gray-50 dark:bg-white/5 hover:bg-blue-50"><Palette size={14} /></button>
                                {showPalette && (
                                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 p-3 z-50 w-64">
                                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">{t.background || 'Background'}</div>
                                        <div className="flex gap-1 mb-4">
                                            {['default', 'blue', 'green', 'orange', 'red', 'dark'].map(c => (
                                                <button key={c} onClick={(e) => { e.stopPropagation(); onBackgroundChange?.(c); }} className={`w-6 h-6 rounded-full border border-gray-200 ${c === 'default' ? 'bg-white' : c === 'dark' ? 'bg-gray-900' : `bg-${c}-100`} ${backgroundColor === c ? 'ring-2 ring-blue-500' : ''}`} />
                                            ))}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Header Color</div>
                                        <div className="flex gap-1">
                                            {['default', 'blue', 'green', 'orange', 'red'].map(c => (
                                                <button key={c} onClick={(e) => { e.stopPropagation(); onColorChange?.(c); setShowPalette(false); }} className={`w-6 h-6 rounded-full border border-gray-200 bg-${c === 'default' ? 'gray' : c}-500 ${colorTheme === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"><X size={16} /></button>}
                        </>
                    )}
                </div>
            </div>

            {isEditing && variables && variables.length > 0 && !className.includes('zone-widget') && !className.includes('alarm-widget') && !className.includes('weather-widget') && !className.includes('hvac-widget') && !className.includes('synoptic-widget') && !className.includes('logic-widget') && !className.includes('kpi-widget') && !className.includes('floorplan') && (
                <div className="px-5 pb-2 flex flex-wrap gap-2 relative z-20">
                    {variables.map(v => (
                        <VariableSettings
                            key={v.id}
                            variable={v}
                            onChange={(updates) => onVariableStyleChange?.(v.id, updates)}
                            onRemove={() => onRemoveVariable?.(v.id)}
                        />
                    ))}
                </div>
            )}

            <div className={`flex-1 min-h-0 relative z-10 ${noPadding ? '' : 'px-5 pb-5'} h-full ${noPadding ? 'overflow-hidden rounded-b-3xl' : ''} flex flex-col`}>
                {children}
            </div>

            {isEditing && onResize && (
                <div className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-30 flex items-end justify-end p-2 opacity-30 hover:opacity-100"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startW = (e.target as HTMLElement).parentElement!.offsetWidth;
                        const startH = (e.target as HTMLElement).parentElement!.offsetHeight;
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            onResize(startW + (moveEvent.clientX - startX), startH + (moveEvent.clientY - startY));
                        };
                        const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                    }}
                >
                    <Scaling size={16} className="text-gray-500" />
                </div>
            )}
        </div>
    );
};

export const KpiCard: React.FC<KpiCardProps> = ({
    label, value, sub, trend, trendType, className = '', onClick, isEditing,
    onLabelChange, onValueChange, onSubChange, isLocked, colorTheme = 'default',
    backgroundColor = 'default', variableConfig, chartData
}) => {
    const bgColors: Record<string, string> = {
        default: 'bg-white dark:bg-[#1c1c1e]',
        blue: 'bg-blue-50 dark:bg-blue-900/10',
        green: 'bg-green-50 dark:bg-green-900/10',
        red: 'bg-red-50 dark:bg-red-900/10',
        orange: 'bg-orange-50 dark:bg-orange-900/10',
        dark: 'bg-gray-900 text-white',
    };

    const themeColor = colorTheme === 'default' ? 'blue' : colorTheme;

    return (
        <div
            className={`relative p-6 rounded-3xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${bgColors[backgroundColor]} ${className} ${isEditing ? 'ring-2 ring-transparent hover:ring-blue-500/50 cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div>
                    {isEditing ? (
                        <EditableInput isEditing={true} value={label} onChangeValue={v => onLabelChange?.(v)} className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 block" />
                    ) : (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">{label}</span>
                    )}
                    {isEditing ? (
                        <EditableInput isEditing={true} value={value} onChangeValue={v => onValueChange?.(v)} className={`text-3xl font-extrabold text-${themeColor}-600 dark:text-${themeColor}-400 block`} />
                    ) : (
                        <span className={`text-3xl font-extrabold text-${themeColor}-600 dark:text-${themeColor}-400 block`}>{value}</span>
                    )}
                </div>
                {variableConfig && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500">
                        {variableConfig.unit || ''}
                    </div>
                )}
            </div>

            {chartData && chartData.length > 0 && (
                <div className="h-12 mt-4 -mx-2">
                    <MiniSparkline data={chartData} color={themeColor === 'blue' ? '#3b82f6' : themeColor === 'green' ? '#10b981' : themeColor === 'orange' ? '#f97316' : '#ef4444'} />
                </div>
            )}

            <div className="mt-4 flex items-center gap-2">
                {trend !== undefined && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
                {isEditing ? (
                    <EditableInput isEditing={true} value={sub || ''} onChangeValue={v => onSubChange?.(v)} className="text-xs text-gray-400" />
                ) : (
                    <span className="text-xs text-gray-400">{sub}</span>
                )}
            </div>
        </div>
    );
};

export const ChatBubble: React.FC<{ message: ChatMessage, isTyping?: boolean }> = ({ message, isTyping }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-[#2c2c2e] shadow-sm border border-gray-100 dark:border-white/5 rounded-bl-none'}`}>
                {isTyping ? (
                    <div className="flex gap-1 h-6 items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                )}
                {!isTyping && <div className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            </div>
        </div>
    );
};

export const ChatInput: React.FC<{ onSend: (text: string) => void, disabled?: boolean }> = ({ onSend, disabled }) => {
    const [val, setVal] = useState('');
    const handleSend = () => { if (val.trim() && !disabled) { onSend(val); setVal(''); } };
    return (
        <div className="relative">
            <input
                className="w-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-full pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50"
                placeholder="Ask AI..."
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={disabled}
            />
            <button onClick={handleSend} disabled={disabled || !val.trim()} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Send size={16} />
            </button>
        </div>
    );
};

export const EnergyLabelWidget: React.FC<{ value: number, unit?: string, isEditing?: boolean, onValueChange?: (v: number) => void }> = ({ value, unit, isEditing, onValueChange }) => {
    // Simplified DPE visual
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-[200px] flex flex-col gap-1">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade, i) => {
                    const colors = ['#10b981', '#34d399', '#a3e635', '#facc15', '#fb923c', '#f87171', '#ef4444'];
                    const width = 100 + (i * 15);
                    // Logic to determine if this grade is active based on value could be complex, simplifying
                    const isActive = (value < 50 && grade === 'A') || (value < 90 && grade === 'B') || (value < 150 && grade === 'C') || (value < 230 && grade === 'D') || (value < 330 && grade === 'E') || (value < 450 && grade === 'F') || (value >= 450 && grade === 'G');

                    return (
                        <div key={grade} className="flex items-center gap-2">
                            <div
                                className={`h-6 rounded-r flex items-center pl-2 text-white font-bold text-xs shadow-sm transition-all ${isActive ? 'opacity-100 scale-105 ring-2 ring-black/20' : 'opacity-30'}`}
                                style={{ width: `${width}px`, backgroundColor: colors[i] }}
                            >
                                {grade}
                            </div>
                            {isActive && <div className="text-xs font-bold text-gray-800 dark:text-white ml-2">{value} {unit}</div>}
                        </div>
                    )
                })}
            </div>
            {isEditing && (
                <div className="mt-4 w-full px-4">
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Value Override</label>
                    <input type="range" min="0" max="600" value={value} onChange={e => onValueChange?.(parseInt(e.target.value))} className="w-full" />
                </div>
            )}
        </div>
    );
};

export const GaugeWidget: React.FC<{ value: number, min: number, max: number, unit: string, isEditing?: boolean, onConfigChange?: (cfg: any) => void }> = ({ value, min, max, unit, isEditing, onConfigChange }) => {
    const angle = 180 * ((value - min) / (max - min));
    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="relative w-40 h-20 overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[16px] border-gray-100 dark:border-white/10 box-border"></div>
                <div
                    className="absolute top-0 left-0 w-40 h-40 rounded-full border-[16px] border-blue-500 box-border origin-center transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${angle - 180}deg)` }}
                ></div>
            </div>
            <div className="mt-[-10px] text-center">
                <div className="text-2xl font-bold">{Math.round(value)}</div>
                <div className="text-xs text-gray-400">{unit}</div>
            </div>
            {isEditing && (
                <div className="mt-4 w-full px-4 grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Min</label>
                        <input type="number" value={min} onChange={e => onConfigChange?.({ min: parseInt(e.target.value) })} className="w-full text-xs border rounded px-1" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Max</label>
                        <input type="number" value={max} onChange={e => onConfigChange?.({ max: parseInt(e.target.value) })} className="w-full text-xs border rounded px-1" />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MOCK GLOBAL ASSETS (In-Memory persistence for session) ---
const GLOBAL_FILES: Record<string, { name: string, url: string }[]> = {
    'Dashboard': [],
    'Shared Assets': [
        { name: 'Office Layout', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Warehouse', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Logo', url: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' }
    ]
};

export const ImageManager: React.FC<{
    onSelect: (url: string) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [activeFolder, setActiveFolder] = useState<'Dashboard' | 'Shared Assets'>('Shared Assets');
    const [files, setFiles] = useState(GLOBAL_FILES);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let fileList: FileList | null = null;
        if ('dataTransfer' in e) {
            e.preventDefault();
            setIsDragOver(false);
            fileList = e.dataTransfer.files;
        } else {
            fileList = e.target.files;
        }

        if (fileList && fileList[0]) {
            const file = fileList[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const newFile = { name: file.name, url: ev.target.result as string };
                    const newFiles = { ...files, [activeFolder]: [...files[activeFolder], newFile] };
                    setFiles(newFiles);
                    GLOBAL_FILES[activeFolder] = newFiles[activeFolder]; // Update cache
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 dark:bg-black/20 border-r border-gray-200 dark:border-white/10 flex flex-col">
                    <div className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Folders</div>
                    <div className="flex-1 space-y-1 p-2">
                        {(['Dashboard', 'Shared Assets'] as const).map(folder => (
                            <button
                                key={folder}
                                onClick={() => setActiveFolder(folder)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeFolder === folder ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Folder size={16} className={activeFolder === folder ? "fill-blue-400" : ""} />
                                    {folder}
                                </div>
                                <span className="text-xs opacity-50">{files[folder].length}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1c1c1e]">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                        <h3 className="font-bold text-lg dark:text-white">{activeFolder}</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"><X size={20} /></button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-4">
                            {/* Upload Tile */}
                            <div
                                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-white/10 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleUpload}
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Upload size={20} />
                                </div>
                                <span className="text-xs font-bold text-gray-500">Upload File</span>
                            </div>

                            {/* Files */}
                            {files[activeFolder].map((file, i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded-xl border border-gray-200 dark:border-white/10 p-2 relative group cursor-pointer hover:shadow-lg transition-all hover:border-blue-500 overflow-hidden bg-gray-50 dark:bg-black/40 flex flex-col"
                                >
                                    <div className="flex-1 w-full bg-contain bg-center bg-no-repeat mb-2" style={{ backgroundImage: `url(${file.url})` }} />
                                    <div className="text-xs font-medium truncate text-gray-700 dark:text-gray-300 px-1 text-center">{file.name}</div>
                                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => onSelect(file.url)} className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-transform">Select</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- FLOOR PLAN WIDGET ---

const DEFAULT_GRADIENTS: Record<string, string[]> = {
    'blue-red': ['#0000ff', '#ff0000'],
    'green-red': ['#00ff00', '#ffff00', '#ff0000'],
    'grayscale': ['#ffffff', '#000000'],
    'heatmap': ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'],
};

const getDefaultGradientColors = (gradient: string): string[] => {
    return DEFAULT_GRADIENTS[gradient] || ['#3b82f6', '#ef4444'];
};

const hexToRgb = (hex: string) => {
    const sanitized = hex.replace('#', '');
    const value = sanitized.length === 3
        ? sanitized.split('').map(ch => ch + ch).join('')
        : sanitized.padEnd(6, '0');
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    if ([r, g, b].some(isNaN)) return null;
    return { r, g, b };
};

const interpolateHexColor = (colorA: string, colorB: string, ratio: number) => {
    const rgbA = hexToRgb(colorA);
    const rgbB = hexToRgb(colorB);
    if (!rgbA || !rgbB) return null;
    const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * ratio);
    const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * ratio);
    const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * ratio);
    return { r, g, b };
};

// Gradient Helper
const getColorFromGradient = (
    value: number,
    min: number,
    max: number,
    gradient: string,
    customStops?: string[]
): string => {
    if (gradient === 'none') return 'transparent';

    // Normalize value
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    const stops = customStops && customStops.length >= 2
        ? customStops
        : getDefaultGradientColors(gradient);

    if (stops.length >= 2) {
        const segment = ratio * (stops.length - 1);
        const index = Math.floor(segment);
        const localRatio = segment - index;
        const start = stops[index];
        const end = stops[Math.min(index + 1, stops.length - 1)];
        const rgb = interpolateHexColor(start, end, localRatio);
        if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
    }

    // Simple Gradients (Can be expanded)
    if (gradient === 'blue-red') {
        // Blue (0,0,255) to Red (255,0,0)
        const r = Math.round(ratio * 255);
        const b = Math.round((1 - ratio) * 255);
        return `rgba(${r}, 0, ${b}, 0.6)`;
    }
    if (gradient === 'green-red') {
        // Green (0,255,0) to Red (255,0,0) via Yellow
        const r = ratio < 0.5 ? Math.round(ratio * 2 * 255) : 255;
        const g = ratio < 0.5 ? 255 : Math.round((1 - ratio) * 2 * 255);
        return `rgba(${r}, ${g}, 0, 0.6)`;
    }
    if (gradient === 'grayscale') {
        const v = Math.round((1 - ratio) * 200); // 200 to 0 (Darker as value increases)
        return `rgba(${v}, ${v}, ${v}, 0.6)`;
    }
    if (gradient === 'heatmap') {
        // Blue -> Cyan -> Green -> Yellow -> Red
        // 0.0 -> 0.25 -> 0.5 -> 0.75 -> 1.0
        // Map ratio (0-1) to Hue (240-0)
        const h = (1.0 - ratio) * 240;
        return `hsla(${h}, 100%, 50%, 0.6)`;
    }

    return 'rgba(59, 130, 246, 0.3)'; // Default Blue
};

// Searchable Variable Dropdown Component
const VariableSelector: React.FC<{
    value?: string,
    onChange: (id: string) => void,
    variables?: any[]
}> = ({ value, onChange, variables }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter variables based on search
    const filteredVars = variables?.filter(v =>
    (v.label?.toLowerCase().includes(search.toLowerCase()) ||
        v.id?.toLowerCase().includes(search.toLowerCase()))
    ) || [];

    const selectedVar = variables?.find(v => v.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <div
                className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 dark:bg-white/5 dark:border-white/10 flex items-center justify-between cursor-pointer hover:border-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">{selectedVar ? selectedVar.label : <span className="text-gray-400">Select Variable...</span>}</span>
                <ChevronDown size={14} className="text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">
                            <Search size={12} className="text-gray-400" />
                            <input
                                autoFocus
                                className="w-full bg-transparent text-xs outline-none"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        <div
                            className="px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded cursor-pointer italic"
                            onClick={() => { onChange(''); setIsOpen(false); }}
                        >
                            None
                        </div>
                        {filteredVars.map(v => (
                            <div
                                key={v.id}
                                className={`px-2 py-1.5 text-xs rounded cursor-pointer flex justify-between items-center ${value === v.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'}`}
                                onClick={() => { onChange(v.id); setIsOpen(false); setSearch(''); }}
                            >
                                <span className="font-medium truncate">{v.label}</span>
                                <span className="text-[10px] text-gray-400 ml-2">{v.value} {v.unit}</span>
                            </div>
                        ))}
                        {filteredVars.length === 0 && (
                            <div className="p-2 text-center text-xs text-gray-400">No matches found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const FloorPlanWidget: React.FC<{
    config: FloorPlanConfig,
    variables?: any[],
    isEditing?: boolean,
    onConfigChange?: (cfg: FloorPlanConfig) => void,
    language?: Language
}> = ({ config, variables, isEditing, onConfigChange, language = 'en' }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'draw_rect' | 'draw_poly' | 'draw_free' | 'text' | 'icon'>('select');
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<{ id: string, type: 'move' | 'resize' | 'create', startX: number, startY: number, initialObj: FloorPlanObject } | null>(null);
    const [showImageManager, setShowImageManager] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [showProperties, setShowProperties] = useState(true);
    const t = TRANSLATIONS[language];

    // Polygon / Freehand drawing state
    const [polyPoints, setPolyPoints] = useState<{ x: number, y: number }[]>([]);
    const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);

    // Ensure layers exists and is not empty to prevent undefined activeLayer
    const layers = (config.layers && config.layers.length > 0)
        ? config.layers
        : [{ id: 'default', name: 'Base', visible: true, gradient: 'none' as const }];

    const activeLayerId = layers.find(l => l.visible)?.id || layers[0].id;
    // We use a local state for editing active layer to allow switching which layer we are editing properties for
    const [editingLayerId, setEditingLayerId] = useState<string>(activeLayerId);

    useEffect(() => {
        if (!layers.find(l => l.id === editingLayerId) && layers.length > 0) {
            setEditingLayerId(layers[0].id);
        }
    }, [layers, editingLayerId]);

    const activeLayer = layers.find(l => l.id === editingLayerId) || layers[0];
    const [editTab, setEditTab] = useState<'widget' | 'layer'>('widget'); // Start with Widget to see list by default

    const objects = config.objects || [];

    const getLayerGradientStops = (layer: FloorPlanLayer) => {
        if (layer.gradientColors && layer.gradientColors.length >= 2) {
            return layer.gradientColors;
        }
        return getDefaultGradientColors(layer.gradient || 'none');
    };

    useEffect(() => {
        if (selectedId) {
            const obj = objects.find(o => o.id === selectedId);
            if (!obj || obj.layerId !== editingLayerId) {
                setSelectedId(null);
            }
        }
    }, [editingLayerId, objects, selectedId]);

    const updateGradientStop = (layerId: string, index: number, color: string) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        const base = (layer.gradientColors && layer.gradientColors.length >= 2)
            ? [...layer.gradientColors]
            : [...getDefaultGradientColors(layer.gradient || 'none')];
        base[index] = color;
        updateLayer(layerId, { gradientColors: base });
    };

    const addGradientStop = (layerId: string) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        const base = (layer.gradientColors && layer.gradientColors.length >= 2)
            ? [...layer.gradientColors]
            : [...getDefaultGradientColors(layer.gradient || 'none')];
        const last = base[base.length - 1] || '#ffffff';
        base.push(last);
        updateLayer(layerId, { gradientColors: base });
    };

    const removeGradientStop = (layerId: string, index: number) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        const base = layer.gradientColors ? [...layer.gradientColors] : [...getDefaultGradientColors(layer.gradient || 'none')];
        if (base.length <= 2) return;
        base.splice(index, 1);
        updateLayer(layerId, { gradientColors: base });
    };

    // Helper for bounding box
    const getBoundingBox = (obj: FloorPlanObject) => {
        if (obj.shape === 'polygon' && obj.points && obj.points.length > 0) {
            const xs = obj.points.map(p => p.x);
            const ys = obj.points.map(p => p.y);
            return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys)
            };
        } else if (obj.type === 'zone' || obj.type === 'icon' || obj.type === 'text') {
            // For rects/icons/text, x/y is the anchor/center
            // For rects in this app, x/y seems to be center based on handleMouseMove 'create' logic
            const w = obj.width || 0;
            const h = obj.height || 0;
            // Text doesn't have width/height usually set correctly for bbox, treat as point
            if (obj.type === 'text') {
                return { minX: obj.x, maxX: obj.x, minY: obj.y, maxY: obj.y };
            }
            return {
                minX: obj.x - w / 2,
                maxX: obj.x + w / 2,
                minY: obj.y - h / 2,
                maxY: obj.y + h / 2
            };
        }
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    };

    // --- Actions ---

    // Add Object (Generic)
    const addObject = (type: FloorPlanObjectType, partial?: Partial<FloorPlanObject>) => {
        const newObj: FloorPlanObject = {
            id: `${type}_${Date.now()}`,
            type,
            layerId: editingLayerId,
            x: 50, y: 50,
            width: type === 'text' ? undefined : 15,
            height: type === 'text' ? undefined : 10,
            label: type === 'text' ? 'New Label' : 'New Zone',
            shape: 'rect',
            points: [],
            fontSize: 14,
            ...partial
        };
        onConfigChange?.({ ...config, objects: [...objects, newObj] });
        setSelectedId(newObj.id);
        setActiveTool('select');
        return newObj;
    };

    const updateObject = (id: string, updates: Partial<FloorPlanObject>) => {
        const newObjects = objects.map(o => o.id === id ? { ...o, ...updates } : o);
        onConfigChange?.({ ...config, objects: newObjects });
    };

    const removeObject = (id: string) => {
        const newObjects = objects.filter(o => o.id !== id);
        onConfigChange?.({ ...config, objects: newObjects });
        setSelectedId(null);
    };

    const updateLayer = (id: string, updates: Partial<FloorPlanLayer>) => {
        const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
        onConfigChange?.({ ...config, layers: newLayers });
    };

    const addLayer = () => {
        const newLayer: FloorPlanLayer = {
            id: `l_${Date.now()}`,
            name: 'New Layer',
            visible: true,
            gradient: 'blue-red',
            minValue: 0,
            maxValue: 100,
            units: '%',
            defaultColor: 'rgba(59, 130, 246, 0.3)'
        };
        const newLayers = [...layers, newLayer];
        onConfigChange?.({ ...config, layers: newLayers });
        setEditingLayerId(newLayer.id);
        setEditTab('layer');
    };

    const handleLayerDelete = (id: string) => {
        if (layers.length <= 1) return;
        const newLayers = layers.filter(l => l.id !== id);
        const newObjects = objects.filter(o => o.layerId !== id);
        onConfigChange?.({ ...config, layers: newLayers, objects: newObjects });
        if (editingLayerId === id) setEditingLayerId(newLayers[0].id);
    };

    const handleLayerVisibility = (id: string, visible: boolean) => {
        const newLayers = layers.map(l => l.id === id ? { ...l, visible } : l);
        onConfigChange?.({ ...config, layers: newLayers });
    };

    // --- Helpers ---

    const getSvgCoords = (e: React.MouseEvent | MouseEvent | React.DragEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
    };

    // --- Events ---

    const handleSvgClick = (e: React.MouseEvent) => {
        if (!isEditing) return;
        const coords = getSvgCoords(e);

        if (activeTool === 'select') {
            // Clicking background no longer deselects objects to prevent persistent panel from closing accidentally
            // To deselect, users should use the close button on the panel or select another object
        }
        else if (activeTool === 'draw_poly') {
            setPolyPoints(prev => [...prev, coords]);
        }
        else if (activeTool === 'text') {
            addObject('text', { x: coords.x, y: coords.y, label: 'Text Label' });
        }
        else if (activeTool === 'icon') {
            addObject('icon', { x: coords.x, y: coords.y });
        }
    };

    const handleSvgMouseDown = (e: React.MouseEvent) => {
        if (!isEditing) return;

        if (activeTool === 'draw_rect') {
            const coords = getSvgCoords(e);
            const newObj = addObject('zone', { x: coords.x, y: coords.y, width: 0, height: 0, shape: 'rect' });
            setDragState({
                id: newObj.id,
                type: 'create',
                startX: coords.x,
                startY: coords.y,
                initialObj: newObj
            });
        }
        else if (activeTool === 'draw_free') {
            const coords = getSvgCoords(e);
            setIsDrawingFreehand(true);
            setPolyPoints([coords]);
        }
    };

    const handleObjectMouseDown = (e: React.MouseEvent, obj: FloorPlanObject, type: 'move' | 'resize' = 'move') => {
        if (!isEditing || activeTool !== 'select') return;
        const layer = layers.find(l => l.id === obj.layerId);
        if (layer?.locked) return;

        e.stopPropagation(); // Stop background click logic
        e.preventDefault(); // Prevent text selection etc
        setSelectedId(obj.id);
        setShowProperties(true); // Open properties if closed

        const coords = getSvgCoords(e);

        setDragState({
            id: obj.id,
            type,
            startX: coords.x,
            startY: coords.y,
            initialObj: { ...obj }
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const currentMouse = getSvgCoords(e);

        if (isDrawingFreehand && activeTool === 'draw_free') {
            setPolyPoints(prev => [...prev, currentMouse]);
            return;
        }

        if (!dragState) return;

        const dx = currentMouse.x - dragState.startX;
        const dy = currentMouse.y - dragState.startY;

        if (dragState.type === 'move') {
            if (dragState.initialObj.shape === 'polygon' && dragState.initialObj.points) {
                // Move all points
                const newPoints = dragState.initialObj.points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                updateObject(dragState.id, { points: newPoints });
            } else {
                updateObject(dragState.id, {
                    x: dragState.initialObj.x + dx,
                    y: dragState.initialObj.y + dy
                });
            }
        } else if (dragState.type === 'resize') {
            updateObject(dragState.id, {
                width: Math.max(1, dragState.initialObj.width! + dx),
                height: Math.max(1, dragState.initialObj.height! + dy)
            });
        } else if (dragState.type === 'create') {
            // Creating new rect zone
            const newW = Math.abs(currentMouse.x - dragState.startX);
            const newH = Math.abs(currentMouse.y - dragState.startY);
            const newX = Math.min(currentMouse.x, dragState.startX);
            const newY = Math.min(currentMouse.y, dragState.startY);

            // Rect center logic for SVG rect
            updateObject(dragState.id, {
                x: newX + newW / 2,
                y: newY + newH / 2,
                width: newW,
                height: newH
            });
        }
    };

    const handleMouseUp = () => {
        if (dragState?.type === 'create') {
            setActiveTool('select');
        }
        if (isDrawingFreehand && activeTool === 'draw_free') {
            // Simplify points slightly? For now just take them all
            if (polyPoints.length > 2) {
                addObject('zone', {
                    shape: 'polygon',
                    points: [...polyPoints],
                    x: 0, y: 0, width: 0, height: 0
                });
            }
            setIsDrawingFreehand(false);
            setPolyPoints([]);
            setActiveTool('select');
        }
        setDragState(null);
    };

    const finishPolygon = () => {
        if (polyPoints.length >= 3) {
            addObject('zone', {
                shape: 'polygon',
                points: polyPoints,
                x: 0, y: 0, width: 0, height: 0 // Not used for polygon
            });
            setPolyPoints([]);
            setActiveTool('select');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isEditing) return;
        if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
            removeObject(selectedId);
        }
        if (e.key === 'Enter' && activeTool === 'draw_poly') {
            finishPolygon();
        }
        if (e.key === 'Escape') {
            setPolyPoints([]);
            setActiveTool('select');
            setSelectedId(null);
        }
    };

    const handleWidgetDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isEditing) return;

        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (data.type === 'variable') {
                const coords = getSvgCoords(e);

                // Check for hit
                // We iterate in reverse to hit top-most elements first
                const hitObj = [...objects].reverse().find(obj => {
                    if (obj.layerId !== editingLayerId) return false;

                    const bbox = getBoundingBox(obj);
                    return coords.x >= bbox.minX && coords.x <= bbox.maxX &&
                        coords.y >= bbox.minY && coords.y <= bbox.maxY;
                });

                if (hitObj) {
                    updateObject(hitObj.id, { variableId: data.id });
                    // Instantly link without further confirmation/selection popup
                } else {
                    // Create text label at drop location
                    addObject('text', { x: coords.x, y: coords.y, label: data.label, variableId: data.id });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- Rendering Helpers ---

    const getVariableValue = (varId?: string) => {
        if (!varId) return null;
        const v = variables?.find(v => v.id === varId);
        return v ? v.value : null;
    };

    const renderObject = (obj: FloorPlanObject) => {
        if (obj.layerId !== editingLayerId) return null;

        const layer = layers.find(l => l.id === obj.layerId);
        if (!layer) return null;

        const isSelected = isEditing && selectedId === obj.id;
        const val = getVariableValue(obj.variableId);

        // Calculate Dynamic Color
        let fill = obj.backgroundColor || layer.defaultColor || 'rgba(59, 130, 246, 0.3)';
        if (fill === 'transparent') fill = 'transparent'; // Ensure transparent string is respected

        // Instant update: Use current layer settings if no override on object
        // If object has NO background override, use layer. If layer has gradient, calculate it.
        if (!obj.backgroundColor && layer.gradient && layer.gradient !== 'none' && val !== null && typeof val === 'number') {
            fill = getColorFromGradient(
                val,
                layer.minValue || 0,
                layer.maxValue || 100,
                layer.gradient,
                layer.gradientColors
            );
        }

        const stroke = isSelected ? '#3b82f6' : (obj.color || 'transparent');
        const strokeWidth = isSelected ? 0.5 : (obj.strokeWidth || 0.2);

        if (obj.type === 'zone') {
            if (obj.shape === 'polygon' && obj.points) {
                const pointsStr = obj.points.map(p => `${p.x},${p.y}`).join(' ');
                return (
                    <g key={obj.id}
                        onMouseDown={(e) => handleObjectMouseDown(e, obj, 'move')}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(obj.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="cursor-pointer group"
                    >
                        <polygon points={pointsStr} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className="transition-colors duration-200" />
                    </g>
                );
            } else {
                // Rect
                return (
                    <g key={obj.id}
                        onMouseDown={(e) => handleObjectMouseDown(e, obj, 'move')}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(obj.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="cursor-pointer group"
                    >
                        <rect
                            x={obj.x - (obj.width || 0) / 2}
                            y={obj.y - (obj.height || 0) / 2}
                            width={obj.width}
                            height={obj.height}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            className="transition-colors duration-200"
                        />
                        {/* Resize handle (only bottom right for simplicity in rect) */}
                        {isSelected && !layer.locked && (
                            <rect
                                x={obj.x + (obj.width || 0) / 2 - 2}
                                y={obj.y + (obj.height || 0) / 2 - 2}
                                width={4} height={4} fill="#3b82f6"
                                onMouseDown={(e) => handleObjectMouseDown(e, obj, 'resize')}
                                className="cursor-se-resize"
                            />
                        )}
                    </g>
                )
            }
        } else if (obj.type === 'text') {
            return (
                <text
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    fill={obj.color || 'black'}
                    fontSize={obj.fontSize ? obj.fontSize / 3 : 4} // SVG scale adjustment
                    textAnchor="middle"
                    className={`select-none cursor-pointer ${isSelected ? 'font-bold' : ''}`}
                    onMouseDown={(e) => handleObjectMouseDown(e, obj, 'move')}
                    onClick={(e) => e.stopPropagation()}
                >
                    {obj.label} {val !== null && `${val} ${layer.units || ''}`}
                </text>
            );
        } else if (obj.type === 'icon') {
            // Simple circle placeholder for icon in SVG
            return (
                <g key={obj.id} onMouseDown={(e) => handleObjectMouseDown(e, obj, 'move')} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                    <circle cx={obj.x} cy={obj.y} r={2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <text x={obj.x} y={obj.y} fontSize="2" textAnchor="middle" dominantBaseline="middle" fill="white">Icon</text>
                </g>
            );
        }
        return null;
    };

    const selectedObject = objects.find(o => o.id === selectedId);

    // Legend priority: Active Editing Layer > First Visible Gradient Layer
    const visibleGradientLayer = (activeLayer?.gradient && activeLayer.gradient !== 'none')
        ? activeLayer
        : layers.find(l => l.visible && l.gradient && l.gradient !== 'none');

    if (!activeLayer) return <div className="p-4 text-red-500">{t.noData || 'No Active Layer'}</div>;

    return (
        <div
            className="flex w-full h-full bg-gray-100 dark:bg-black/20 overflow-hidden relative outline-none"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onDrop={handleWidgetDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >

            {/* SVG CONTAINER - FULL WIDTH/HEIGHT */}
            <div
                ref={containerRef}
                className={`absolute inset-0 z-0 ${activeTool === 'draw_poly' || activeTool === 'draw_rect' || activeTool === 'draw_free' ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleSvgClick}
                onMouseDown={handleSvgMouseDown}
            >
                {/* SVG Canvas - 0-100 coordinate space */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full block touch-none">
                    {/* Background Image */}
                    {config.imageUrl && (
                        <image href={config.imageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
                    )}

                    {/* Objects */}
                    {objects.map(renderObject)}

                    {/* Drawing Polygon Preview */}
                    {polyPoints.length > 0 && (
                        <>
                            <polyline
                                points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="0.5"
                                strokeDasharray="1 1"
                            />
                            {polyPoints.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={0.5} fill="#3b82f6" />
                            ))}
                        </>
                    )}
                </svg>

                {/* Floating Tooltip (Hover) */}
                {hoveredId && (
                    (() => {
                        const obj = objects.find(o => o.id === hoveredId);
                        if (!obj) return null;
                        const layer = layers.find(l => l.id === obj.layerId);
                        const val = getVariableValue(obj.variableId);

                        const bbox = getBoundingBox(obj);
                        const centerX = (bbox.minX + bbox.maxX) / 2;
                        const topY = bbox.minY;

                        const containerRect = containerRef.current?.getBoundingClientRect();
                        if (!containerRect) return null;

                        const style = {
                            left: (centerX / 100) * containerRect.width,
                            top: (topY / 100) * containerRect.height - 10,
                        };

                        return (
                            <div
                                className="absolute z-50 bg-black/90 text-white text-xs px-3 py-2 rounded shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-white/20 flex flex-col items-center whitespace-nowrap"
                                style={style}
                            >
                                <div className="font-bold mb-0.5">{obj.label || 'Zone'}</div>
                                {val !== null ? (
                                    <div className="text-blue-300 font-mono text-sm">{val} {layer?.units}</div>
                                ) : (
                                    <div className="text-gray-400 italic text-[10px]">{t.noData || 'No Data'}</div>
                                )}
                                <div className="w-2 h-2 bg-black/90 absolute -bottom-1 rotate-45 border-b border-r border-white/20"></div>
                            </div>
                        );
                    })()
                )}
            </div>

            {/* Legend Overlay */}
            {visibleGradientLayer && (
                (() => {
                    const gradientStops = getLayerGradientStops(visibleGradientLayer);
                    const gradientCss = `linear-gradient(to right, ${gradientStops.join(', ')})`;
                    return (
                        <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur p-3 rounded-lg border border-gray-200 dark:border-white/10 shadow-lg text-xs animate-in fade-in duration-300 pointer-events-none">
                            <div className="font-bold mb-1 text-gray-700 dark:text-gray-200">{visibleGradientLayer.name}</div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-500">{visibleGradientLayer.minValue}</span>
                                <div className="w-24 h-3 rounded-full shadow-inner border border-black/5 dark:border-white/10" style={{ background: gradientCss }} />
                                <span className="font-mono text-gray-500">{visibleGradientLayer.maxValue}</span>
                            </div>
                            <div className="text-center text-gray-400 mt-0.5 text-[10px]">{visibleGradientLayer.units}</div>
                        </div>
                    );
                })()
            )}

            {/* FLOATING TOOLBAR (Bottom Center) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1c1c1e] rounded-full shadow-xl border border-gray-200 dark:border-white/10 p-1 flex gap-1 z-20">
                <div className="flex items-center gap-2 px-2 border-r border-gray-200 dark:border-white/10 mr-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{t.layers || 'Layer'}</span>
                    <select
                        value={editingLayerId}
                        onChange={(e) => setEditingLayerId(e.target.value)}
                        className="text-xs font-bold bg-transparent outline-none cursor-pointer text-gray-800 dark:text-gray-100"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                {isEditing && (
                    <>
                        <button onClick={() => setActiveTool('select')} className={`p-2 rounded-full transition-colors ${activeTool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600'}`} title="Select"><MousePointer2 size={16} /></button>
                        <button onClick={() => setActiveTool('draw_rect')} className={`p-2 rounded-full transition-colors ${activeTool === 'draw_rect' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600'}`} title="Draw Rectangle"><BoxSelect size={16} /></button>
                        <button onClick={() => setActiveTool('draw_poly')} className={`p-2 rounded-full transition-colors ${activeTool === 'draw_poly' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600'}`} title="Draw Polygon"><PenTool size={16} /></button>
                        <button onClick={() => setActiveTool('draw_free')} className={`p-2 rounded-full transition-colors ${activeTool === 'draw_free' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600'}`} title="Pencil (Freehand)"><Pencil size={16} /></button>
                        <button onClick={() => setActiveTool('text')} className={`p-2 rounded-full transition-colors ${activeTool === 'text' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600'}`} title="Add Text"><Type size={16} /></button>
                    </>
                )}
                {activeTool === 'draw_poly' && polyPoints.length > 0 && (
                    <button onClick={finishPolygon} className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600 ml-2">Finish</button>
                )}
            </div>

            {/* PROPERTIES SIDEBAR (Right) */}
            {isEditing && (
                <div
                    className={`absolute right-4 top-4 bottom-4 w-72 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden z-30 transition-transform duration-300 ${showProperties ? 'translate-x-0' : 'translate-x-[110%]'}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex border-b border-gray-200 dark:border-white/10 shrink-0">
                        <button
                            onClick={() => setEditTab('widget')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${editTab === 'widget' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            {t.properties || 'Properties'}
                        </button>
                        <button
                            onClick={() => setEditTab('layer')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${editTab === 'layer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            {t.layers || 'Layers'}
                        </button>
                        <button onClick={() => setShowProperties(false)} className="px-3 text-gray-400 hover:text-red-500"><X size={14} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 flex flex-col">
                        {editTab === 'widget' && (
                            <>
                                <div>
                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2 tracking-wider">{t.background || 'Background'}</h4>
                                    <button onClick={() => setShowImageManager(true)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                        <ImageIcon size={14} /> {t.changeImage || 'Change Image'}
                                    </button>
                                </div>

                                {selectedObject ? (
                                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-center pb-2">
                                            <h4 className="font-bold text-sm uppercase text-blue-600 flex items-center gap-2"><Settings size={14} /> {selectedObject.label || 'Selected Object'}</h4>
                                            <button
                                                onClick={() => setSelectedId(null)}
                                                className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                            >
                                                <ArrowLeft size={12} /> {t.back || 'Back'}
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.label || 'Label'}</label>
                                            <input
                                                className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 dark:bg-white/5 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={selectedObject.label || ''}
                                                onChange={(e) => updateObject(selectedObject.id, { label: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.variable || 'Variable'}</label>
                                            <VariableSelector
                                                value={selectedObject.variableId}
                                                variables={variables}
                                                onChange={(id) => updateObject(selectedObject.id, { variableId: id })}
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                            <h5 className="font-bold text-[10px] uppercase text-gray-500 mb-2">{t.style || 'Style'}</h5>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 mb-1 block">{t.fillColor || 'Fill Color'}</label>
                                                    <div className="flex items-center gap-1">
                                                        <input type="color" className="w-6 h-6 rounded cursor-pointer border-none" value={selectedObject.backgroundColor === 'transparent' ? '#ffffff' : selectedObject.backgroundColor || activeLayer.defaultColor || '#3b82f6'} onChange={(e) => updateObject(selectedObject.id, { backgroundColor: e.target.value })} />
                                                        <button
                                                            onClick={() => updateObject(selectedObject.id, {
                                                                backgroundColor: 'transparent',
                                                                // Ensure we have a visible border if fill is transparent
                                                                color: (selectedObject.color && selectedObject.color !== 'transparent') ? selectedObject.color : '#000000',
                                                                strokeWidth: selectedObject.strokeWidth || 1
                                                            })}
                                                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border rounded text-[10px] transition-colors"
                                                        >
                                                            {t.transparent || 'Transp.'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 mb-1 block">{t.strokeColor || 'Stroke'}</label>
                                                    <div className="flex items-center gap-1">
                                                        <input type="color" className="w-6 h-6 rounded cursor-pointer border-none" value={selectedObject.color || '#000000'} onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })} />
                                                        <button onClick={() => updateObject(selectedObject.id, { color: 'transparent' })} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border rounded text-[10px] transition-colors">{t.none || 'None'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedObject.type === 'text' && (
                                                <div>
                                                    <label className="text-[10px] text-gray-400 mb-1 block">{t.fontSize || 'Font Size'}</label>
                                                    <input type="number" className="w-full text-xs p-2 border rounded" value={selectedObject.fontSize || 14} onChange={(e) => updateObject(selectedObject.id, { fontSize: parseInt(e.target.value) })} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-4 flex flex-col gap-2">
                                            <button
                                                onClick={() => removeObject(selectedObject.id)}
                                                className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                                title="Delete Selected Object"
                                            >
                                                <Trash2 size={14} /> {t.delete || 'Delete'}
                                            </button>
                                            <button
                                                onClick={() => { setShowProperties(false); setSelectedId(null); }}
                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Save size={16} /> {t.save || 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col">
                                        <div className="text-gray-400 text-xs italic mb-4">
                                            {t.selectObject || 'Select an object on the map or from the list below.'}
                                        </div>

                                        <div className="border-t border-gray-100 dark:border-white/5 pt-2 flex-1 flex flex-col min-h-0">
                                            <h4 className="font-bold text-xs uppercase text-gray-500 mb-2 tracking-wider">{t.objects || 'Objects'} ({objects.length})</h4>
                                            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                                                {objects.map((obj, i) => {
                                                    const layerName = layers.find(l => l.id === obj.layerId)?.name || 'Unknown Layer';
                                                    return (
                                                        <div
                                                            key={obj.id}
                                                            onClick={() => setSelectedId(obj.id)}
                                                            className="flex items-center justify-between p-2 rounded text-xs hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 group"
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-medium truncate text-gray-700 dark:text-gray-200">{obj.label || `Object ${i + 1}`}</span>
                                                                    <span className="text-[9px] text-gray-400 truncate">{layerName}</span>
                                                                </div>
                                                            </div>
                                                            <span className="opacity-0 group-hover:opacity-100 text-gray-400"><ChevronRight size={12} /></span>
                                                        </div>
                                                    );
                                                })}
                                                {objects.length === 0 && (
                                                    <div className="text-center py-4 text-xs text-gray-400">
                                                        No objects found. Use tools to add.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {editTab === 'layer' && (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider">{t.layers || 'All Layers'}</h4>
                                        <button onClick={addLayer} className="p-1 hover:bg-blue-50 text-blue-500 rounded transition-colors" title="Add Layer"><Plus size={14} /></button>
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-100 dark:border-white/10 rounded-lg p-1">
                                        {layers.map(l => (
                                            <div
                                                key={l.id}
                                                className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer group ${l.id === editingLayerId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
                                                onClick={() => setEditingLayerId(l.id)}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleLayerVisibility(l.id, !l.visible); }}
                                                    className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${l.visible ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}`}
                                                >
                                                    {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                                </button>
                                                <span className="flex-1 truncate font-medium">{l.name}</span>
                                                {layers.length > 1 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleLayerDelete(l.id); }}
                                                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200 dark:bg-white/10 my-2" />

                                <div className="flex-1 overflow-y-auto pr-1">
                                    <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-3">Selected: {activeLayer.name}</h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.label || 'Name'}</label>
                                            <input
                                                value={activeLayer.name}
                                                onChange={(e) => updateLayer(activeLayer.id, { name: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.fillColor || 'Default Color'}</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(239, 68, 68, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(107, 114, 128, 0.3)'].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => updateLayer(activeLayer.id, { defaultColor: c })}
                                                        className={`w-8 h-8 rounded-full border border-gray-300 shadow-sm ${activeLayer.defaultColor === c ? 'ring-2 ring-blue-500' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                                <button
                                                    onClick={() => updateLayer(activeLayer.id, { defaultColor: 'transparent' })}
                                                    className={`w-auto px-2 h-8 rounded-full border border-gray-300 shadow-sm flex items-center justify-center text-[10px] bg-white ${activeLayer.defaultColor === 'transparent' ? 'ring-2 ring-blue-500' : ''}`}
                                                >
                                                    {t.transparent || 'Transp.'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.metricConfig || 'Metric Visualization'}</label>
                                            <select
                                                value={activeLayer.gradient || 'none'}
                                                onChange={(e) => updateLayer(activeLayer.id, { gradient: e.target.value as any })}
                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mb-2"
                                            >
                                                <option value="none">{t.none || 'None (Solid Color)'}</option>
                                                <option value="blue-red">Blue (Cold) to Red (Hot)</option>
                                                <option value="green-red">Green (Good) to Red (Bad)</option>
                                                <option value="grayscale">Grayscale</option>
                                                <option value="heatmap">Heatmap (Spectrum)</option>
                                            </select>

                                            {activeLayer.gradient !== 'none' && (
                                                (() => {
                                                    const gradientStops = getLayerGradientStops(activeLayer);
                                                    const gradientCss = `linear-gradient(to right, ${gradientStops.join(', ')})`;
                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="w-full h-4 rounded opacity-80"
                                                                style={{ background: gradientCss }}
                                                            />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] text-gray-400">{t.min || 'Min'}</label>
                                                                    <input type="number" value={activeLayer.minValue} onChange={(e) => updateLayer(activeLayer.id, { minValue: parseFloat(e.target.value) })} className="w-full text-xs p-1 border rounded" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-400">{t.max || 'Max'}</label>
                                                                    <input type="number" value={activeLayer.maxValue} onChange={(e) => updateLayer(activeLayer.id, { maxValue: parseFloat(e.target.value) })} className="w-full text-xs p-1 border rounded" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-gray-400">{t.units || 'Units'}</label>
                                                                <input type="text" value={activeLayer.units} onChange={(e) => updateLayer(activeLayer.id, { units: e.target.value })} className="w-full text-xs p-1 border rounded" />
                                                            </div>
                                                            <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                                                                <label className="text-[10px] text-gray-400 uppercase font-semibold">{t.colors || 'Couleurs'}</label>
                                                                <div className="flex flex-col gap-2">
                                                                    {gradientStops.map((color, idx) => (
                                                                        <div key={`${activeLayer.id}-stop-${idx}`} className="flex items-center gap-2">
                                                                            <input
                                                                                type="color"
                                                                                value={color}
                                                                                onChange={(e) => updateGradientStop(activeLayer.id, idx, e.target.value)}
                                                                                className="w-10 h-10 rounded cursor-pointer border border-gray-200 dark:border-white/10"
                                                                            />
                                                                            <span className="text-xs text-gray-500">Stop {idx + 1}</span>
                                                                            {gradientStops.length > 2 && (
                                                                                <button
                                                                                    onClick={() => removeGradientStop(activeLayer.id, idx)}
                                                                                    className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                                                                                >
                                                                                    {t.delete || 'Suppr.'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {gradientStops.length < 5 && (
                                                                        <button
                                                                            onClick={() => addGradientStop(activeLayer.id)}
                                                                            className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 w-fit"
                                                                        >
                                                                            + {t.color || 'Couleur'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })()
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => { setShowProperties(false); setSelectedId(null); }}
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> {t.save || 'Save'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Show Properties Toggle Button (When hidden) */}
            {isEditing && !showProperties && (
                <button
                    onClick={() => setShowProperties(true)}
                    className="absolute right-4 top-4 p-2 bg-white dark:bg-[#1c1c1e] rounded-lg shadow-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-blue-500 z-20"
                >
                    <Settings size={20} />
                </button>
            )}

            {showImageManager && (
                <ImageManager
                    onSelect={(url) => { onConfigChange?.({ ...config, imageUrl: url }); setShowImageManager(false); }}
                    onClose={() => setShowImageManager(false)}
                />
            )}
        </div>
    );
};

// --- NEW WIDGETS ---

export const PredictiveAlarmsWidget: React.FC<{ alarms: any[] }> = ({ alarms }) => {
    if (!alarms || alarms.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No predictive alerts active</div>;

    return (
        <div className="h-full overflow-y-auto p-4 space-y-3">
            {alarms.map((alarm, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{alarm.asset || 'System'} - {alarm.issue}</div>
                        <div className="text-xs text-gray-500 mt-1">Probability: {alarm.prob || 'Unknown'} • Risk: {alarm.risk}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SliderWidget: React.FC<{ value: number, min: number, max: number, unit: string, isEditing?: boolean, onValueChange?: (v: number) => void }> = ({ value, min, max, unit, isEditing, onValueChange }) => {
    return (
        <div className="h-full flex flex-col justify-center px-6">
            <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Control</span>
                <span className="text-sm font-bold">{value} {unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onValueChange?.(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                disabled={!isEditing && !onValueChange} // If not editing but provided handler (operator mode), enable
            />
            <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>{min} {unit}</span>
                <span>{max} {unit}</span>
            </div>
        </div>
    );
};

export const ScheduleWidget: React.FC<{ config: any, isEditing?: boolean, onConfigChange?: (cfg: any) => void }> = ({ config }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
        <div className="h-full p-4 flex flex-col">
            <div className="flex-1 grid grid-cols-7 gap-1">
                {days.map(d => (
                    <div key={d} className="flex flex-col items-center gap-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">{d}</div>
                        <div className={`flex-1 w-full rounded-md ${['Sat', 'Sun'].includes(d) ? 'bg-gray-100 dark:bg-white/5' : 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30'}`}>
                            {/* Mock bars */}
                            {!['Sat', 'Sun'].includes(d) && (
                                <div className="w-full h-full p-1 flex flex-col justify-center items-center">
                                    <div className="w-1.5 h-3/4 bg-green-500 rounded-full opacity-50"></div>
                                </div>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-500">{['Sat', 'Sun'].includes(d) ? 'Off' : '08-18'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AlarmConsoleWidget: React.FC<{ config: any }> = () => {
    const mockAlarms = [
        { id: 1, time: '10:23', msg: 'AHU-01 Filter High DP', pri: 'Warning' },
        { id: 2, time: '09:45', msg: 'Chiller Flow Low', pri: 'Critical' },
        { id: 3, time: 'Yesterday', msg: 'Boiler 2 Comm Lost', pri: 'Info' },
    ];
    return (
        <div className="h-full overflow-y-auto">
            <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-white/5 sticky top-0">
                    <tr>
                        <th className="p-2 font-bold text-gray-500">Time</th>
                        <th className="p-2 font-bold text-gray-500">Message</th>
                        <th className="p-2 font-bold text-gray-500">Priority</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {mockAlarms.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="p-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{a.time}</td>
                            <td className="p-2 font-medium">{a.msg}</td>
                            <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${a.pri === 'Critical' ? 'bg-red-100 text-red-600' : a.pri === 'Warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {a.pri}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const WeatherWidget: React.FC<{ config: { location: string, units: string } }> = ({ config }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <CloudSun size={48} className="text-yellow-500 mb-2" />
            <div className="text-3xl font-light">22°{config.units}</div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">{config.location}</div>
            <div className="text-xs text-gray-400 mt-2">Partly Cloudy • H:24 L:18</div>
        </div>
    );
};

export const HVACWidget: React.FC<{
    config: { symbol: HVACSymbolType, orientation: any, showValue: boolean, animate: boolean };
    variables?: any[];
    isEditing?: boolean;
    onConfigChange?: (cfg: any) => void;
}> = ({ config, variables, isEditing, onConfigChange }) => {
    const val = variables && variables.length > 0 ? variables[0].value : 0;
    const unit = variables && variables.length > 0 ? variables[0].unit : '';

    return (
        <div className="h-full flex items-center justify-center relative">
            <div className="w-32 h-32">
                <HVACSymbol
                    type={config.symbol || 'fan'}
                    value={val}
                    unit={unit}
                    orientation={config.orientation}
                    showValue={config.showValue}
                    animate={config.animate}
                />
            </div>
            {isEditing && (
                <div className="absolute top-2 right-2 bg-white/90 p-2 rounded shadow border text-xs">
                    <label className="block text-[10px] uppercase text-gray-500">Symbol</label>
                    <select value={config.symbol} onChange={e => onConfigChange?.({ symbol: e.target.value })} className="mb-1 w-full">
                        <option value="fan">Fan</option>
                        <option value="pump">Pump</option>
                        <option value="valve_3way">Valve 3-Way</option>
                        <option value="filter">Filter</option>
                        <option value="coil_cool">Cooling Coil</option>
                    </select>
                    <label className="block text-[10px] uppercase text-gray-500">Orient</label>
                    <select value={config.orientation} onChange={e => onConfigChange?.({ orientation: e.target.value })} className="w-full">
                        <option value="up">Up</option>
                        <option value="down">Down</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                    </select>
                </div>
            )}
        </div>
    );
};

export const ZoneWidget: React.FC<{
    config: ZoneConfig;
    variables?: any[];
    isEditing?: boolean;
    onConfigChange?: (cfg: ZoneConfig) => void;
}> = ({ config, variables, isEditing, onConfigChange }) => {
    // Helper to find value from variables list passed to widget
    const getVal = (id?: string) => variables?.find(v => v.id === id)?.value;

    const temp = getVal(config.tempId) ?? 21.5;
    const sp = getVal(config.setpointId) ?? 22.0;
    const co2 = getVal(config.co2Id);

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-40 h-40 rounded-full border-4 border-gray-100 dark:border-white/10 flex items-center justify-center mb-4">
                <div className="text-center">
                    <div className="text-4xl font-light text-gray-800 dark:text-white">{temp}°</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Current</div>
                </div>
                <div className="absolute bottom-[-10px] bg-white dark:bg-[#1c1c1e] px-2 py-1 rounded-full border border-gray-200 dark:border-white/10 text-xs font-bold flex items-center gap-1 shadow-sm">
                    <span className="text-gray-400">SET</span>
                    <span className="text-blue-600 dark:text-blue-400">{sp}°</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
                {co2 !== undefined && (
                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded text-center">
                        <div className="text-xs text-gray-400 uppercase">CO2</div>
                        <div className={`font-bold ${co2 > 1000 ? 'text-red-500' : 'text-green-500'}`}>{co2} ppm</div>
                    </div>
                )}
                {isEditing ? (
                    <div className="col-span-2 bg-yellow-50 p-2 rounded text-xs border border-yellow-200">
                        <div className="font-bold text-yellow-700 mb-1">Mapping Config</div>
                        <div className="grid grid-cols-2 gap-1">
                            <input placeholder="Temp ID" value={config.tempId || ''} onChange={e => onConfigChange?.({ tempId: e.target.value })} className="border p-1" />
                            <input placeholder="Setpt ID" value={config.setpointId || ''} onChange={e => onConfigChange?.({ setpointId: e.target.value })} className="border p-1" />
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded text-center">
                        <div className="text-xs text-gray-400 uppercase">Mode</div>
                        <div className="font-bold text-blue-500">Auto</div>
                    </div>
                )}
            </div>
        </div>
    );
};
