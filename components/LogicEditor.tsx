
import React, { useState, useRef, useEffect } from 'react';
import {
    Play, Square, Save, Trash2, Plus, X,
    ToggleLeft, Hash, Type, Clock, ArrowRight, Workflow, CheckSquare,
    ZoomIn, ZoomOut, Maximize, Copy, Clipboard, Activity, Edit2, Zap
} from 'lucide-react';
import { LogicConfig, LogicBlockInstance, LogicConnection, LogicBlockType, LogicPort } from '../types';

// --- DEFINITIONS ---

const TYPE_COLORS: Record<string, string> = {
    number: '#3b82f6', // Blue
    boolean: '#8b5cf6', // Violet
    string: '#f97316', // Orange
    any: '#9ca3af',    // Gray
};

const BLOCK_TYPES: LogicBlockType[] = [
    // Constants
    { type: 'CONST_NUM', label: 'Number', category: 'numeric', inputs: [], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'CONST_BOOL', label: 'Boolean', category: 'boolean', inputs: [], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },

    // IO
    { type: 'VAR_READ', label: 'Read Var', category: 'io', inputs: [], outputs: [{ id: 'out', type: 'output', dataType: 'any' }] },
    { type: 'VAR_WRITE_NUM', label: 'Write Num', category: 'io', inputs: [{ id: 'in', type: 'input', dataType: 'number' }], outputs: [] },
    { type: 'VAR_WRITE_BOOL', label: 'Write Bool', category: 'io', inputs: [{ id: 'in', type: 'input', dataType: 'boolean' }], outputs: [] },
    { type: 'VAR_WRITE_STR', label: 'Write Str', category: 'io', inputs: [{ id: 'in', type: 'input', dataType: 'string' }], outputs: [] },
    // Priority Array (style Niagara BinaryWritable simulation)
    { type: 'PRIORITY_SET', label: 'Priority Set', category: 'io', inputs: [{ id: 'in', type: 'input', dataType: 'any' }], outputs: [] },
    { type: 'PRIORITY_RELEASE', label: 'Priority Release', category: 'io', inputs: [], outputs: [] },

    // Boolean
    { type: 'AND', label: 'AND', category: 'boolean', inputs: [{ id: 'a', type: 'input', dataType: 'boolean' }, { id: 'b', type: 'input', dataType: 'boolean' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'OR', label: 'OR', category: 'boolean', inputs: [{ id: 'a', type: 'input', dataType: 'boolean' }, { id: 'b', type: 'input', dataType: 'boolean' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'NOT', label: 'NOT', category: 'boolean', inputs: [{ id: 'in', type: 'input', dataType: 'boolean' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'XOR', label: 'XOR', category: 'boolean', inputs: [{ id: 'a', type: 'input', dataType: 'boolean' }, { id: 'b', type: 'input', dataType: 'boolean' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'EQ_BOOL', label: 'Equal', category: 'boolean', inputs: [{ id: 'a', type: 'input', dataType: 'boolean' }, { id: 'b', type: 'input', dataType: 'boolean' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },

    // Numeric
    { type: 'ADD', label: 'Add', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'SUB', label: 'Subtract', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'MUL', label: 'Multiply', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'DIV', label: 'Divide', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'GT', label: 'Greater >', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'LT', label: 'Less <', category: 'numeric', inputs: [{ id: 'a', type: 'input', dataType: 'number' }, { id: 'b', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'boolean' }] },
    { type: 'ROUND', label: 'Round', category: 'numeric', inputs: [{ id: 'in', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },

    // String
    { type: 'CONCAT', label: 'Concat', category: 'string', inputs: [{ id: 'a', type: 'input', dataType: 'string' }, { id: 'b', type: 'input', dataType: 'string' }], outputs: [{ id: 'out', type: 'output', dataType: 'string' }] },
    { type: 'LEN', label: 'Length', category: 'string', inputs: [{ id: 'in', type: 'input', dataType: 'string' }], outputs: [{ id: 'out', type: 'output', dataType: 'number' }] },
    { type: 'NUM2STR', label: 'Num to Str', category: 'string', inputs: [{ id: 'in', type: 'input', dataType: 'number' }], outputs: [{ id: 'out', type: 'output', dataType: 'string' }] },

    // Time
    { type: 'CLOCK', label: 'Clock', category: 'time', inputs: [], outputs: [{ id: 'out', type: 'output', dataType: 'string' }] },
];

const getPortType = (block: LogicBlockInstance, portId: string, type: 'input' | 'output'): string => {
    const def = BLOCK_TYPES.find(t => t.type === block.type);
    if (!def) return 'any';
    // Dynamic typing for priority set based on variable type
    if (block.type === 'PRIORITY_SET' && portId === 'in') {
        const v = variables.find(v => v.id === block.config?.variableId);
        if (v?.type === 'number' || typeof v?.value === 'number') return 'number';
        if (v?.type === 'boolean' || typeof v?.value === 'boolean') return 'boolean';
    }
    const list = type === 'input' ? def.inputs : def.outputs;
    const port = list.find(p => p.id === portId);
    return port ? port.dataType : 'any';
};

const areTypesCompatible = (sourceType: string, targetType: string): boolean => {
    if (sourceType === 'any' || targetType === 'any') return true;
    return sourceType === targetType;
};

// --- EDITOR COMPONENT ---

interface LogicEditorProps {
    config: LogicConfig;
    isEditing: boolean;
    onConfigChange: (cfg: LogicConfig) => void;
    variables: { id: string, label: string, value: any, type?: string, unit?: string, alarmActive?: boolean, alarmPriority?: string }[];
    onUpdateVariable: (id: string, value: any, label: string, type: 'number' | 'string' | 'boolean', unit?: string) => void;
    autoFit?: boolean;
}

export const LogicEditorWidget: React.FC<LogicEditorProps> = ({
    config, isEditing, onConfigChange, variables, onUpdateVariable
}) => {
    const [blocks, setBlocks] = useState<LogicBlockInstance[]>(config.blocks || []);
    const [connections, setConnections] = useState<LogicConnection[]>(config.connections || []);

    // View State
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isSimulating, setIsSimulating] = useState(true);
    const [priorityMap, setPriorityMap] = useState<Record<string, (any | null | undefined)[]>>({});

    // Interaction State
    const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
    const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [connectingSource, setConnectingSource] = useState<{ blockId: string, portId: string, x: number, y: number } | null>(null);
    const [hoveredPort, setHoveredPort] = useState<{ blockId: string, portId: string, type: 'input' | 'output' } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const [showLabelConfig, setShowLabelConfig] = useState<string | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const blocksRef = useRef(blocks);
    const connectionsRef = useRef(connections);

    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { connectionsRef.current = connections; }, [connections]);
    const getVarById = (id?: string) => variables.find(v => v.id === id);
    const applyPriority = (variableId: string, level: number, value: any | null | undefined) => {
        setPriorityMap(prev => {
            const current = prev[variableId] || Array(16).fill(null);
            const next = [...current];
            next[Math.min(15, Math.max(0, level - 1))] = value;
            // Compute effective
            let effective: any = undefined;
            for (let i = 0; i < next.length; i++) {
                const v = next[i];
                if (v !== null && v !== undefined) { effective = v; break; }
            }
            if (effective === undefined) {
                const original = getVarById(variableId)?.value;
                effective = original;
            }
            if (effective !== undefined) {
                const bound = getVarById(variableId);
                const t = (bound?.type as any) || (typeof effective === 'number' ? 'number' : typeof effective === 'boolean' ? 'boolean' : 'any');
                onUpdateVariable(variableId, effective, bound?.label || variableId, t as any, bound?.unit);
            }
            return { ...prev, [variableId]: next };
        });
    };

    const SNAP = 10;
    const snap = (v: number) => Math.round(v / SNAP) * SNAP;

    const getEventWorldCoords = (e: MouseEvent | React.MouseEvent | React.DragEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - panOffset.x) / scale,
            y: (e.clientY - rect.top - panOffset.y) / scale
        };
    };

    // --- GLOBAL EVENTS ---
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (draggingBlock) {
                const worldPos = getEventWorldCoords(e);
                setBlocks(prev => prev.map(b => b.id === draggingBlock ? { ...b, x: snap(worldPos.x - dragOffset.x), y: snap(worldPos.y - dragOffset.y) } : b));
                setMousePos(worldPos);
            }
            if (connectingSource) {
                setMousePos(getEventWorldCoords(e));
            }
            if (isPanning) {
                setPanOffset({
                    x: e.clientX - panStart.x,
                    y: e.clientY - panStart.y
                });
            }
        };

        const handleWindowMouseUp = () => {
            if (draggingBlock) {
                onConfigChange({ blocks: blocksRef.current, connections: connectionsRef.current });
                setDraggingBlock(null);
            }
            if (connectingSource) {
                setConnectingSource(null);
                setHoveredPort(null);
            }
            setIsPanning(false);
        };

        if (draggingBlock || connectingSource || isPanning) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [draggingBlock, connectingSource, isPanning, dragOffset, panStart, scale, panOffset]);

    // --- SIMULATION ENGINE ---
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            const nextBlocks = [...blocksRef.current];

            nextBlocks.forEach(b => {
                if (b.type === 'VAR_READ' && b.config?.variableId) {
                    const v = variables.find(v => v.id === b.config?.variableId);
                    b.outputs['out'] = v ? v.value : 0;
                } else if (b.type === 'CLOCK') {
                    b.outputs['out'] = new Date().toLocaleTimeString();
                } else if (b.type === 'CONST_NUM') {
                    b.outputs['out'] = parseFloat(b.config?.value) || 0;
                } else if (b.type === 'CONST_BOOL') {
                    b.outputs['out'] = b.config?.value === true || b.config?.value === 'true';
                } else if (b.type === 'PRIORITY_SET') {
                    // No direct output, handled in computeBlock
                } else if (b.type === 'PRIORITY_RELEASE') {
                    // handled in computeBlock
                }
            });

            // Propagate (Multi-pass for stability)
            for (let pass = 0; pass < 3; pass++) {
                connectionsRef.current.forEach(conn => {
                    const src = nextBlocks.find(b => b.id === conn.sourceBlockId);
                    const tgt = nextBlocks.find(b => b.id === conn.targetBlockId);
                    if (src && tgt) {
                        tgt.inputs[conn.targetPortId] = src.outputs[conn.sourcePortId];
                    }
                });
                nextBlocks.forEach(b => {
                    try { computeBlock(b); } catch (e) { }
                });
            }

            nextBlocks.forEach(b => {
                if (b.type.startsWith('VAR_WRITE_') && b.config?.variableName) {
                    const val = b.inputs['in'];
                    if (val !== undefined) {
                        let type: any = 'number';
                        if (b.type.includes('BOOL')) type = 'boolean';
                        if (b.type.includes('STR')) type = 'string';
                        onUpdateVariable(b.config.variableName, val, b.config.variableName, type, b.config.unit);
                    }
                }
            });

            setBlocks([...nextBlocks]);
        }, 200);

        return () => clearInterval(interval);
    }, [isSimulating, variables]);

    const computeBlock = (b: LogicBlockInstance) => {
        const i = b.inputs; const o = b.outputs;
        const na = Number(i.a) || 0; const nb = Number(i.b) || 0;
        switch (b.type) {
            case 'AND': o.out = !!(i.a && i.b); break;
            case 'OR': o.out = !!(i.a || i.b); break;
            case 'NOT': o.out = !i.in; break;
            case 'XOR': o.out = !!(i.a ? !i.b : i.b); break;
            case 'EQ_BOOL': o.out = (i.a === i.b); break;
            case 'ADD': o.out = na + nb; break;
            case 'SUB': o.out = na - nb; break;
            case 'MUL': o.out = na * nb; break;
            case 'DIV': o.out = nb === 0 ? 0 : na / nb; break;
            case 'GT': o.out = na > nb; break;
            case 'LT': o.out = na < nb; break;
            case 'ROUND': o.out = Math.round(Number(i.in) || 0); break;
            case 'CONCAT': o.out = String(i.a || '') + String(i.b || ''); break;
            case 'LEN': o.out = String(i.in || '').length; break;
            case 'NUM2STR': o.out = String(i.in || ''); break;
            case 'PRIORITY_SET': {
                const varId = b.config?.variableId;
                const level = Math.min(16, Math.max(1, Number(b.config?.level) || 1));
                if (varId && b.inputs['in'] !== undefined) {
                    applyPriority(varId, level, !!b.inputs['in']);
                }
                break;
            }
            case 'PRIORITY_RELEASE': {
                const varId = b.config?.variableId;
                const level = Math.min(16, Math.max(1, Number(b.config?.level) || 1));
                if (varId) {
                    applyPriority(varId, level, null);
                }
                break;
            }
        }
    };

    const deleteBlock = (id: string) => {
        const newBlocks = blocks.filter(b => b.id !== id);
        const newConns = connections.filter(c => c.sourceBlockId !== id && c.targetBlockId !== id);
        setBlocks(newBlocks);
        setConnections(newConns);
        setSelectedBlockIds(prev => prev.filter(pid => pid !== id));
        onConfigChange({ blocks: newBlocks, connections: newConns });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!isEditing) return;

        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (data.type === 'logic_palette' && data.blockType) {
                const def = BLOCK_TYPES.find(t => t.type === data.blockType);
                if (def) {
                    const world = getEventWorldCoords(e);
                    const newBlock: LogicBlockInstance = {
                        id: `b_${Date.now()}`, type: def.type, x: snap(world.x - 70), y: snap(world.y - 30),
                        inputs: {}, outputs: {}, config: {}
                    };
                    // Init config
                    if (newBlock.type === 'CONST_NUM') newBlock.config = { value: 0 };
                    if (newBlock.type === 'CONST_BOOL') newBlock.config = { value: false };

                    const newBlocks = [...blocks, newBlock];
                    setBlocks(newBlocks);
                    setSelectedBlockIds([newBlock.id]);
                    onConfigChange({ blocks: newBlocks, connections });
                }
            }
        } catch (err) { }
    };

    const handlePortMouseDown = (e: React.MouseEvent, blockId: string, portId: string, type: 'input' | 'output') => {
        e.stopPropagation(); e.preventDefault();
        if (!isEditing) return;
        if (type === 'output') {
            const world = getEventWorldCoords(e);
            setConnectingSource({ blockId, portId, x: world.x, y: world.y });
        } else {
            // Disconnect existing input
            const exists = connections.find(c => c.targetBlockId === blockId && c.targetPortId === portId);
            if (exists) {
                const newConns = connections.filter(c => c.id !== exists.id);
                setConnections(newConns);
                onConfigChange({ blocks, connections: newConns });
            }
        }
    };

    const handlePortMouseUp = (e: React.MouseEvent, blockId: string, portId: string, type: 'input' | 'output') => {
        e.stopPropagation(); e.preventDefault();
        if (!isEditing || !connectingSource) return;

        if (type === 'input') {
            const srcBlock = blocks.find(b => b.id === connectingSource.blockId);
            const tgtBlock = blocks.find(b => b.id === blockId);

            if (srcBlock && tgtBlock && srcBlock.id !== tgtBlock.id) {
                const srcType = getPortType(srcBlock, connectingSource.portId, 'output');
                const tgtType = getPortType(tgtBlock, portId, 'input');
                if (areTypesCompatible(srcType, tgtType)) {
                    const newConn: LogicConnection = {
                        id: `c_${Date.now()}`,
                        sourceBlockId: connectingSource.blockId, sourcePortId: connectingSource.portId,
                        targetBlockId: blockId, targetPortId: portId
                    };
                    // Remove any existing connection to this input
                    const cleanConns = connections.filter(c => !(c.targetBlockId === blockId && c.targetPortId === portId));
                    const finalConns = [...cleanConns, newConn];
                    setConnections(finalConns);
                    onConfigChange({ blocks, connections: finalConns });
                }
            }
        }
        setConnectingSource(null);
    };

    return (
        <div className="flex w-full h-full bg-gray-50 dark:bg-[#121212] overflow-hidden select-none">
            {/* Palette */}
            {isEditing && (
                <div className="w-40 bg-white dark:bg-[#1c1c1e] border-r border-gray-200 dark:border-white/10 flex flex-col shrink-0 z-10 overflow-y-auto custom-scrollbar">
                    <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">Logic Blocks</div>
                    {['numeric', 'boolean', 'io', 'string', 'time'].map(cat => (
                        <div key={cat} className="mb-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/5 uppercase">{cat}</div>
                            {BLOCK_TYPES.filter(t => t.category === cat).map(t => (
                                <div
                                    key={t.type} draggable
                                    onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setData("application/json", JSON.stringify({ type: 'logic_palette', blockType: t.type }));
                                        e.dataTransfer.effectAllowed = "copy";
                                    }}
                                    className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-grab active:cursor-grabbing border-b border-gray-100 dark:border-white/5 flex items-center gap-2 group transition-colors"
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.outputs[0]?.dataType || 'any'] }} />
                                    <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Toolbar */}
                <div className="h-10 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/10 flex items-center px-4 justify-between shrink-0 z-10">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500"><ZoomIn size={14} /></button>
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500"><ZoomOut size={14} /></button>
                        <button onClick={() => { setScale(1); setPanOffset({ x: 0, y: 0 }); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500"><Maximize size={14} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedBlockIds.length > 0 && isEditing && (
                            <button onClick={() => { deleteBlock(selectedBlockIds[0]); }} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded text-xs font-bold flex gap-1 items-center px-2">
                                <Trash2 size={12} /> Delete
                            </button>
                        )}
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${isSimulating ? 'bg-green-100 text-green-700 ring-1 ring-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <Activity size={12} className={isSimulating ? "animate-pulse" : ""} /> {isSimulating ? 'Active' : 'Paused'}
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div
                    className="flex-1 relative overflow-hidden bg-[#f8fafc] dark:bg-[#000]"
                    onMouseDown={(e) => {
                        if (e.button === 1 || e.shiftKey) {
                            setIsPanning(true);
                            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                        } else {
                            setSelectedBlockIds([]);
                        }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
                    onDrop={handleDrop}
                    style={{ cursor: isPanning ? 'grabbing' : 'default' }}
                >
                    {/* Grid */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20"
                        style={{
                            backgroundImage: `radial-gradient(#64748b 1px, transparent 1px)`,
                            backgroundSize: `${20 * scale}px ${20 * scale}px`,
                            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
                        }}
                    />

                    <svg
                        ref={svgRef}
                        className="w-full h-full absolute inset-0 touch-none"
                        onMouseDown={(e) => e.stopPropagation()} // Stop propagation from SVG background? No, we need it for panning.
                    >
                        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${scale})`}>

                            {/* Connections */}
                            {connections.map(conn => {
                                const src = blocks.find(b => b.id === conn.sourceBlockId);
                                const tgt = blocks.find(b => b.id === conn.targetBlockId);
                                if (!src || !tgt) return null;
                                const srcDef = BLOCK_TYPES.find(t => t.type === src.type);
                                const tgtDef = BLOCK_TYPES.find(t => t.type === tgt.type);
                                if (!srcDef || !tgtDef) return null;

                                const outIdx = srcDef.outputs.findIndex(p => p.id === conn.sourcePortId);
                                const inIdx = tgtDef.inputs.findIndex(p => p.id === conn.targetPortId);

                                const x1 = src.x + 140;
                                const y1 = src.y + 40 + (outIdx * 24);
                                const x2 = tgt.x;
                                const y2 = tgt.y + 40 + (inIdx * 24);

                                const cp1x = x1 + Math.abs(x2 - x1) * 0.5;
                                const cp2x = x2 - Math.abs(x2 - x1) * 0.5;
                                const color = TYPE_COLORS[getPortType(src, conn.sourcePortId, 'output')];

                                return (
                                    <g key={conn.id}>
                                        <path d={`M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`} stroke="transparent" strokeWidth="12" fill="none" className="cursor-pointer" onDoubleClick={() => isEditing && setConnections(prev => prev.filter(c => c.id !== conn.id))} />
                                        <path d={`M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`} stroke={color} strokeWidth="2" fill="none" />
                                    </g>
                                );
                            })}

                            {/* Drag Line */}
                            {connectingSource && (
                                <path d={`M ${connectingSource.x} ${connectingSource.y} L ${mousePos.x} ${mousePos.y}`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 5" fill="none" className="pointer-events-none" />
                            )}

                            {/* Blocks */}
                            {blocks.map(b => {
                                const def = BLOCK_TYPES.find(t => t.type === b.type);
                                if (!def) return null;
                                const isSelected = selectedBlockIds.includes(b.id);
                                const h = Math.max(60, 40 + Math.max(def.inputs.length, def.outputs.length) * 24);
                                const boundVar = b.type.startsWith('VAR_') && b.config?.variableId ? variables.find(v => v.id === b.config?.variableId) : undefined;
                                const alarmActive = !!boundVar?.alarmActive;
                                const alarmPri = (boundVar?.alarmPriority || '').toLowerCase();
                                const alarmColor = alarmPri === 'critical' ? 'red' : alarmPri === 'warning' ? 'orange' : 'blue';

                                return (
                                    <foreignObject key={b.id} x={b.x} y={b.y} width="140" height={h + 40} className="overflow-visible">
                                        <div
                                            className={`w-[140px] rounded-lg bg-white dark:bg-[#2c2c2e] shadow-lg border-2 transition-all flex flex-col relative ${alarmActive ? '' : isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-white/10'}`}
                                            style={{ height: h, borderColor: alarmActive ? alarmColor : undefined, boxShadow: alarmActive ? `0 0 0 2px ${alarmColor === 'red' ? '#f87171' : alarmColor === 'orange' ? '#fb923c' : '#60a5fa'}55` : undefined }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                if (!isEditing) return;
                                                setSelectedBlockIds([b.id]);
                                                setDraggingBlock(b.id);
                                                const world = getEventWorldCoords(e);
                                                setDragOffset({ x: world.x - b.x, y: world.y - b.y });
                                            }}
                                        >
                                            {/* Header */}
                                            <div className={`h-6 w-full rounded-t-md px-2 flex items-center justify-between ${def.category === 'boolean' ? 'bg-purple-500' : def.category === 'numeric' ? 'bg-blue-500' : def.category === 'io' ? 'bg-green-600' : 'bg-gray-500'}`}>
                                                <span className="text-[10px] font-bold text-white uppercase truncate">{def.label}</span>
                                                {isEditing && <X size={10} className="text-white/70 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }} />}
                                            </div>

                                            {/* Ports */}
                                            <div className="flex-1 relative">
                                                {alarmActive && (
                                                    <div className="absolute right-1 top-1 text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse font-semibold uppercase">
                                                        Alarm {boundVar?.alarmPriority || ''}
                                                    </div>
                                                )}
                                                {def.inputs.map((p, i) => (
                                                    <div key={p.id} className="absolute left-[-6px] flex items-center" style={{ top: 10 + i * 24 }}>
                                                        <div
                                                            className="w-3 h-3 rounded-full border border-gray-400 bg-white hover:scale-125 transition-transform"
                                                            style={{ backgroundColor: TYPE_COLORS[p.dataType] }}
                                                            onMouseDown={(e) => handlePortMouseDown(e, b.id, p.id, 'input')}
                                                            onMouseUp={(e) => handlePortMouseUp(e, b.id, p.id, 'input')}
                                                        />
                                                    </div>
                                                ))}
                                                {def.outputs.map((p, i) => (
                                                    <div key={p.id} className="absolute right-[-6px] flex items-center justify-end" style={{ top: 10 + i * 24 }}>
                                                        <div
                                                            className="w-3 h-3 rounded-full border border-gray-400 bg-white hover:scale-125 transition-transform"
                                                            style={{ backgroundColor: TYPE_COLORS[p.dataType] }}
                                                            onMouseDown={(e) => handlePortMouseDown(e, b.id, p.id, 'output')}
                                                        />
                                                    </div>
                                                ))}

                                                {/* Config Inputs */}
                                                {b.type === 'CONST_NUM' && (
                                                    <input type="number" className="absolute left-2 top-8 w-28 h-6 text-xs border rounded px-1" value={b.config?.value || 0} onChange={e => setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, config: { ...x.config, value: e.target.value } } : x))} onMouseDown={e => e.stopPropagation()} />
                                                )}
                                                {b.type === 'CONST_BOOL' && (
                                                    <div className="absolute left-2 top-8 w-28 h-6 flex items-center border rounded px-1 cursor-pointer bg-gray-50" onClick={(e) => { e.stopPropagation(); setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, config: { ...x.config, value: !x.config?.value } } : x)); }} onMouseDown={e => e.stopPropagation()}>
                                                        {b.config?.value ? <CheckSquare size={12} className="text-green-500 mr-2" /> : <Square size={12} className="text-gray-400 mr-2" />} <span className="text-xs">{b.config?.value ? 'TRUE' : 'FALSE'}</span>
                                                    </div>
                                                )}
                                                {(b.type.startsWith('VAR_') || b.type.startsWith('PRIORITY_')) && (
                                                    <div className="absolute left-2 top-8 w-28">
                                                        <select className="w-full h-6 text-[10px] border rounded" value={b.config?.variableId || ''} onChange={(e) => { setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, config: { ...x.config, variableId: e.target.value } } : x)); }} onMouseDown={e => e.stopPropagation()}>
                                                            <option value="">Select...</option>
                                                            {variables.map(v => <option key={v.id} value={v.id}>{v.label}{v.alarmActive ? ' 🔴 ALARM' : ''}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                {(b.type === 'PRIORITY_SET' || b.type === 'PRIORITY_RELEASE') && (
                                                    <div className="absolute left-2 top-16 w-28">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={16}
                                                            className="w-full h-6 text-[10px] border rounded px-1"
                                                            value={b.config?.level || 1}
                                                            onChange={(e) => { const val = Math.min(16, Math.max(1, Number(e.target.value) || 1)); setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, config: { ...x.config, level: val } } : x)); }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                )}

                                                {/* Value Preview */}
                                                {isSimulating && (
                                                    <div className="absolute right-2 bottom-1 text-[9px] font-mono text-gray-400 bg-white/80 dark:bg-black/80 px-1 rounded border border-gray-100 dark:border-white/5">
                                                        {b.outputs['out'] !== undefined ? String(b.outputs['out']).substring(0, 6) : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </foreignObject>
                                );
                            })}
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
};
