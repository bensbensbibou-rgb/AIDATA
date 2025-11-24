
import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle, AreaChart, Area } from 'recharts';

export const HeatmapChart: React.FC<{ data: {day: string, hour: number, value: number}[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Data</div>;

  const hours = Array.from({length: 24}, (_, i) => i);
  // Default days if not enough data
  const uniqueDays = Array.from(new Set(data.map(d => d.day)));
  const days = uniqueDays.length > 0 ? uniqueDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Find max value for normalization
  const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid divide by zero

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    // Blue scale: start from light blue to deep blue
    return `rgba(59, 130, 246, ${Math.max(0.1, intensity)})`; 
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ minHeight: '200px' }}>
       <div className="flex-1 min-h-0 relative">
         <div className="absolute inset-0 flex flex-col">
            {/* Grid Container */}
            <div className="flex-1 grid gap-px bg-gray-100 dark:bg-white/5" 
                 style={{ 
                   gridTemplateRows: `repeat(24, 1fr)`, 
                   gridTemplateColumns: `40px repeat(${days.length}, 1fr)` 
                 }}>
               
               {/* Cells and Labels */}
               {hours.map(h => (
                 <React.Fragment key={`row-${h}`}>
                   {/* Y Axis Label */}
                   <div className="text-[9px] text-gray-400 flex items-center justify-end pr-2 bg-white dark:bg-apple-cardDark">
                     {h % 4 === 0 ? `${h}h` : ''}
                   </div>
                   
                   {/* Data Cells */}
                   {days.map((d) => {
                      const point = data.find(p => p.day === d && p.hour === h);
                      const val = point ? point.value : 0;
                      return (
                        <div 
                          key={`${d}-${h}`} 
                          className="relative group flex items-center justify-center transition-all bg-white dark:bg-apple-cardDark"
                        >
                           {/* Color layer */}
                           <div 
                             className="absolute inset-0 rounded-sm"
                             style={{ backgroundColor: getColor(val) }}
                           />
                           
                           {/* Hover Info - Only visible on hover */}
                           <div className="hidden group-hover:flex absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none flex-col items-center border border-white/20">
                              <span className="font-bold">{d} {h}:00</span>
                              <span>{val.toFixed(0)} kWh</span>
                              <div className="w-2 h-2 bg-black/90 absolute -bottom-1 rotate-45 border-b border-r border-white/20"></div>
                           </div>
                        </div>
                      );
                   })}
                 </React.Fragment>
               ))}
            </div>
         </div>
       </div>
       {/* X Axis */}
       <div className="h-6 grid mt-1" style={{ gridTemplateColumns: `40px repeat(${days.length}, 1fr)` }}>
          <div /> {/* Spacer for Y axis */}
          {days.map((d: string) => (
            <div key={`lx-${d}`} className="text-[10px] text-gray-400 flex items-center justify-center font-medium">
              {d.substring(0, 3)}
            </div>
          ))}
       </div>
    </div>
  );
};

export const ThermometerChart: React.FC<{ value: number, min?: number, max?: number, unit?: string }> = ({ value, min = 0, max = 50, unit = '°C' }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  // Color based on temperature
  const color = value < 18 ? '#3b82f6' : value > 26 ? '#ef4444' : '#22c55e';

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
       <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-48 bg-gray-200 dark:bg-gray-700 rounded-full border-4 border-white dark:border-gray-600 shadow-inner flex flex-col justify-end p-1">
             <div className="w-full bg-white/50 rounded-t-full absolute top-0 bottom-0" />
             {/* Fill */}
             <div 
                className="w-full rounded-b-full rounded-t-sm relative z-10 transition-all duration-1000 ease-out"
                style={{ height: `${percentage}%`, backgroundColor: color }}
             >
                <div className="absolute -top-1 left-0 right-0 h-2 bg-white/20 rounded-full" />
             </div>
             {/* Bulb */}
             <div 
                className="absolute -bottom-6 -left-4 w-16 h-16 rounded-full border-4 border-white dark:border-gray-600 shadow-lg z-20 flex items-center justify-center"
                style={{ backgroundColor: color }}
             >
                 <span className="text-white font-bold text-lg drop-shadow-md">{value}</span>
             </div>
          </div>
          <div className="mt-4 text-center">
             <div className="text-2xl font-bold text-gray-800 dark:text-white">{value} {unit}</div>
             <div className="text-xs text-gray-400">Range: {min} - {max}</div>
          </div>
       </div>
    </div>
  );
};

export const SimpleTable: React.FC<{ data: any[] }> = ({ data }) => {
   if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">No Data</div>;
   
   const headers = Object.keys(data[0]);

   return (
      <div className="w-full h-full overflow-auto">
         <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-white/5 sticky top-0">
               <tr>
                  {headers.map(h => (
                     <th key={h} className="px-4 py-3 font-medium tracking-wider">{h}</th>
                  ))}
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
               {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                     {headers.map(h => (
                        <td key={`${i}-${h}`} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                           {typeof row[h] === 'object' ? JSON.stringify(row[h]) : row[h]}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
};

export const FlowChart: React.FC = () => {
  const data = {
    nodes: [
      { name: 'Grid Source' },
      { name: 'Solar PV' },
      { name: 'Campus Main' },
      { name: 'HVAC' },
      { name: 'Lighting' },
      { name: 'Plug Loads' },
      { name: 'Building A' },
      { name: 'Building B' }
    ],
    links: [
      { source: 0, target: 2, value: 450 }, // Grid -> Main
      { source: 1, target: 2, value: 150 }, // Solar -> Main
      { source: 2, target: 3, value: 250 }, // Main -> HVAC
      { source: 2, target: 4, value: 150 }, // Main -> Lighting
      { source: 2, target: 5, value: 200 }, // Main -> Plugs
      { source: 3, target: 6, value: 120 }, // HVAC -> Bld A
      { source: 3, target: 7, value: 130 }, // HVAC -> Bld B
      { source: 4, target: 6, value: 70 },  // Light -> Bld A
      { source: 4, target: 7, value: 80 }   // Light -> Bld B
    ]
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Sankey
        data={data}
        node={{ stroke: '#777', strokeWidth: 0 }}
        nodePadding={50}
        link={{ stroke: '#007aff', strokeOpacity: 0.3 }}
        margin={{
          left: 0,
          right: 0,
          top: 20,
          bottom: 20,
        }}
      >
        <Tooltip />
      </Sankey>
    </ResponsiveContainer>
  );
};

export const MiniSparkline: React.FC<{ data: any[], color: string, height?: number }> = ({ data, color, height = 60 }) => {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
            <stop offset="100%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#gradient-${color})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
