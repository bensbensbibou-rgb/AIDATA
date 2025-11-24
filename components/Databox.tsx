
import React, { useState } from 'react';
import { Info, Image, GripHorizontal, MoreVertical, TrendingUp, Trash2, X } from 'lucide-react';
import { DataboxNode } from '../types';

const formatNumber = (value: number, format?: string): string => {
  if (value === undefined || value === null) return '-';
  if (!format) return value.toString();
  if (format.includes('%')) {
    return (value * 100).toFixed(0) + '%';
  }
  if (format.includes('.')) {
    const decimals = format.split('.')[1].length;
    return value.toFixed(decimals);
  }
  if (format.includes(',')) {
    return value.toLocaleString();
  }
  return value.toString();
};

export const DataboxWidget: React.FC<{
  config: { showHeader?: boolean, headerText?: string, showImage?: boolean, imageUrl?: string, showLabels?: boolean, nodes: DataboxNode[] };
  variables?: { id: string, label: string, unit?: string, value?: any, color?: string, fontSize?: string, fontFamily?: string }[];
  isEditing?: boolean;
  onConfigChange?: (config: any) => void;
  onRemoveNode?: (variableId: string) => void;
}> = ({ config, variables, isEditing, onConfigChange, onRemoveNode }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const rows = config.nodes.map(nodeConfig => {
     const liveVar = variables?.find(v => v.id === nodeConfig.id);
     return {
       ...nodeConfig,
       value: liveVar ? liveVar.value : 0,
       unit: liveVar ? liveVar.unit : '',
       label: nodeConfig.labelOverride || liveVar?.label || 'Unknown',
       fontSize: liveVar?.fontSize,
       fontFamily: liveVar?.fontFamily
     };
  });

  const updateNode = (id: string, updates: Partial<DataboxNode>) => {
     const newNodes = config.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
     onConfigChange?.({ nodes: newNodes });
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
       {isEditing && (
         <div className="absolute top-2 right-2 z-30 flex gap-2">
           <div className="bg-white/90 dark:bg-black/90 backdrop-blur border border-gray-200 dark:border-white/10 p-2 rounded-lg shadow-lg text-xs">
              <div className="flex flex-col gap-2">
                 <label className="flex items-center gap-2"><input type="checkbox" checked={config.showHeader} onChange={e => onConfigChange?.({...config, showHeader: e.target.checked})} /> Show Header</label>
                 {config.showHeader && <input type="text" placeholder="Header Text" value={config.headerText || ''} onChange={e => onConfigChange?.({...config, headerText: e.target.value})} className="border rounded px-1 py-0.5 text-black" />}
                 <label className="flex items-center gap-2"><input type="checkbox" checked={config.showImage} onChange={e => onConfigChange?.({...config, showImage: e.target.checked})} /> Show Image</label>
                 {config.showImage && <input type="text" placeholder="Image URL" value={config.imageUrl || ''} onChange={e => onConfigChange?.({...config, imageUrl: e.target.value})} className="border rounded px-1 py-0.5 text-black" />}
                 <label className="flex items-center gap-2"><input type="checkbox" checked={config.showLabels} onChange={e => onConfigChange?.({...config, showLabels: e.target.checked})} /> Show Labels</label>
              </div>
           </div>
           
           {selectedNodeId && (() => {
              const node = config.nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <div className="bg-white/90 dark:bg-black/90 backdrop-blur border border-gray-200 dark:border-white/10 p-3 rounded-lg shadow-lg text-xs w-56 animate-in slide-in-from-right-2">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                       <span className="font-bold truncate">{node.labelOverride || node.id}</span>
                       <button onClick={() => setSelectedNodeId(null)}><X size={12}/></button>
                    </div>
                    <div className="space-y-2">
                       <div>
                          <label className="block text-[10px] text-gray-500">Label Override</label>
                          <input value={node.labelOverride || ''} onChange={e => updateNode(node.id, { labelOverride: e.target.value })} className="w-full border rounded px-1 text-black" />
                       </div>
                       <div>
                          <label className="block text-[10px] text-gray-500">Number Format (#.00)</label>
                          <input value={node.numberFormat || ''} onChange={e => updateNode(node.id, { numberFormat: e.target.value })} className="w-full border rounded px-1 text-black" placeholder="#.00 or # %" />
                       </div>
                       <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Color Indicator</label>
                          <div className="flex gap-1 flex-wrap">
                             {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#111827'].map(c => (
                                <button 
                                  key={c}
                                  onClick={() => updateNode(node.id, { color: c })}
                                  className={`w-4 h-4 rounded-full border border-gray-200 ${node.color === c ? 'ring-2 ring-black dark:ring-white' : ''}`}
                                  style={{ backgroundColor: c }}
                                />
                             ))}
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={node.showUnit} onChange={e => updateNode(node.id, { showUnit: e.target.checked })} /> Units</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={node.showPriority} onChange={e => updateNode(node.id, { showPriority: e.target.checked })} /> Priority</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={node.showTrend} onChange={e => updateNode(node.id, { showTrend: e.target.checked })} /> Trend</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={node.showActions} onChange={e => updateNode(node.id, { showActions: e.target.checked })} /> Actions</label>
                       </div>
                       <button onClick={() => { onRemoveNode?.(node.id); setSelectedNodeId(null); }} className="w-full bg-red-100 text-red-600 rounded py-1 mt-1 flex items-center justify-center gap-1 hover:bg-red-200"><Trash2 size={12}/> Remove Node</button>
                    </div>
                </div>
              );
           })()}
         </div>
       )}
       {config.showHeader && (
         <div className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-sm font-bold border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <span>{config.headerText || 'Parameters'}</span>
            <Info size={14} className="text-gray-400"/>
         </div>
       )}
       <div className="flex flex-col sm:flex-row h-full min-h-0">
          {config.showImage && (
             <div className="w-full sm:w-1/3 h-32 sm:h-full relative overflow-hidden bg-gray-50 dark:bg-black/20 shrink-0">
                {config.imageUrl ? (
                   <img src={config.imageUrl} alt="Databox Asset" className="w-full h-full object-cover" />
                ) : (
                   <div className="flex items-center justify-center h-full text-gray-300"><Image size={32}/></div>
                )}
             </div>
          )}
          <div className="flex-1 overflow-y-auto">
             {rows.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-4 italic p-4">Drag points here from tree</div>
             ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                   {rows.map(row => (
                      <div 
                        key={row.id} 
                        className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-default ${selectedNodeId === row.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => isEditing && setSelectedNodeId(row.id)}
                        style={{ fontFamily: row.fontFamily }}
                      >
                         <div className="flex items-center gap-3 min-w-0">
                            {isEditing && <div className="cursor-move text-gray-300 hover:text-gray-500"><GripHorizontal size={12}/></div>}
                            <div 
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/10" 
                                style={{ backgroundColor: row.color || '#3b82f6' }} 
                            />
                            <div className="flex flex-col min-w-0">
                               {config.showLabels && <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{row.label}</span>}
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            {row.showTrend && (
                               <div className="flex items-center text-green-500 text-xs font-medium bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                  <TrendingUp size={12} className="mr-0.5"/> +2%
                               </div>
                            )}
                            <div className="text-right flex items-baseline gap-1">
                               <span 
                                  className="font-bold font-mono text-sm text-gray-900 dark:text-white"
                                  style={{ fontSize: row.fontSize }}
                               >
                                  {formatNumber(row.value, row.numberFormat)}
                                </span>
                               {row.showUnit && row.unit && <span className="text-xs text-gray-500 font-medium">{row.unit}</span>}
                            </div>
                            {row.showPriority && <div className="text-[10px] text-orange-500 font-bold uppercase border border-orange-200 px-1 rounded">Pri 8</div>}
                            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                <MoreVertical size={16} />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
       </div>
    </div>
  );
};
