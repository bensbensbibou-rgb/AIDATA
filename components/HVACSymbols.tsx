
import React from 'react';
import { HVACSymbolType } from '../types';
import { 
  Home, Settings, AlertTriangle, Info, HelpCircle, TrendingUp, 
  Calendar, Clock, ArrowRight, Plus, Minus, RefreshCw, StopCircle, Play, Globe
} from 'lucide-react';

interface HVACSymbolProps {
  type: HVACSymbolType;
  value: number | string | boolean; // Input value driving the state
  orientation?: 'up' | 'down' | 'left' | 'right' | number; // Allow numeric rotation
  showValue?: boolean;
  unit?: string;
  animate?: boolean; // Force animation if applicable
  className?: string;
  customColor?: string; // Override state color (for editor palette)
  strokeWidth?: number;
}

export const HVACSymbol: React.FC<HVACSymbolProps> = ({ 
  type, 
  value, 
  orientation = 'up', 
  showValue, 
  unit, 
  animate = true,
  className = '',
  customColor,
  strokeWidth = 2
}) => {
  
  // --- State Logic ---
  let state: 'off' | 'on' | 'alarm' = 'off';
  let analogValue = 0;

  // Robust handling of value types
  if (typeof value === 'boolean') {
      state = value ? 'on' : 'off';
      analogValue = value ? 100 : 0;
  } else if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['on', 'run', 'active', 'true', 'open', 'yes', '2'].includes(lower)) state = 'on';
      else if (['alarm', 'fault', 'error', 'failure', '1', 'critical'].includes(lower)) state = 'alarm';
      else state = 'off';
  } else if (typeof value === 'number') {
      if (value === 1) state = 'alarm';
      else if (value >= 2) {
          state = 'on';
          analogValue = value <= 100 ? value : 100;
      } else {
          state = 'off';
      }
  }

  // --- Colors ---
  const getFillColor = () => {
      if (customColor) return customColor; // Override for editor
      switch(state) {
          case 'on': return '#22c55e'; // Green-500
          case 'alarm': return '#ef4444'; // Red-500
          default: return '#f3f4f6'; // Gray-100 (Neutral fill)
      }
  };

  const getStrokeColor = () => {
      if (customColor) return '#374151'; // Darker border for custom fill
      switch(state) {
        case 'on': return '#15803d'; // Green-700
        case 'alarm': return '#b91c1c'; // Red-700
        default: return '#6b7280'; // Gray-500
      }
  };

  // --- Rotation ---
  const getRotation = () => {
      if (typeof orientation === 'number') return orientation;
      switch(orientation) {
          case 'right': return 90;
          case 'down': return 180;
          case 'left': return 270;
          default: return 0;
      }
  };

  // --- SVG Renderers ---
  const renderSymbol = () => {
      const fill = getFillColor();
      const stroke = getStrokeColor();
      const isAnimated = animate && state === 'on';
      const sw = strokeWidth;

      switch(type) {
          // --- PUMPS & FANS ---
          case 'pump':
          case 'pump_circulator':
          case 'pump_vacuum':
              return (
                  <g>
                      <circle cx="50" cy="50" r="40" fill="white" stroke={stroke} strokeWidth={sw} />
                      {/* Triangle pointing up */}
                      <path 
                        d="M30 70 L50 25 L70 70 Z" 
                        fill={fill} 
                        stroke={stroke} 
                        strokeWidth={sw}
                        style={isAnimated ? { transformOrigin: 'center', animation: 'pulse 2s ease-in-out infinite' } : {}}
                      />
                      {type === 'pump_circulator' && (
                          // Inner circle for circulator
                          <circle cx="50" cy="50" r="12" fill="white" stroke={stroke} strokeWidth={sw} />
                      )}
                      {type === 'pump_vacuum' && (
                          <text x="50" y="95" textAnchor="middle" fontSize="16" fontWeight="bold" fill={stroke}>VAC</text>
                      )}
                  </g>
              );

          case 'fan':
          case 'fan_axial':
              return (
                  <g>
                      <circle cx="50" cy="50" r="40" fill="white" stroke={stroke} strokeWidth={sw} />
                      <g className={isAnimated ? "origin-center animate-spin-slow" : ""}>
                         <path d="M50 50 L50 15 L55 25 L50 50 L80 65 L75 70 L50 50 L20 65 L25 70 Z" fill={fill} stroke={stroke} strokeWidth="1" />
                         <path d="M50 50 L50 10 C65 10 80 20 85 35 L50 50" fill={fill} fillOpacity="0.5" stroke="none" />
                         <path d="M50 50 L85 70 C75 85 60 90 45 90 L50 50" fill={fill} fillOpacity="0.5" stroke="none" />
                         <path d="M50 50 L15 70 C15 55 20 40 35 25 L50 50" fill={fill} fillOpacity="0.5" stroke="none" />
                         <circle cx="50" cy="50" r="5" fill={stroke} />
                      </g>
                  </g>
              );
          
          case 'compressor':
          case 'compressor_piston':
              return (
                  <g>
                     <circle cx="50" cy="50" r="40" fill="white" stroke={stroke} strokeWidth={sw} />
                     <path d="M30 70 L40 30 L60 30 L70 70 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                     {type === 'compressor_piston' && (
                         <path d="M40 70 L60 70 L60 80 L40 80 Z" fill={fill} stroke={stroke} strokeWidth="1" />
                     )}
                  </g>
              );

          case 'compressor_scroll':
              return (
                  <g>
                      <circle cx="50" cy="50" r="40" fill="white" stroke={stroke} strokeWidth={sw} />
                      <path d="M50 50 m-20 0 a 10 10 0 0 1 20 -10 a 15 15 0 0 1 20 20 a 20 20 0 0 1 -30 25" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                  </g>
              );

          // --- VALVES ---
          case 'valve_2way':
          case 'valve_solenoid':
              return (
                  <g>
                      <path d="M10 25 L50 50 L10 75 V25 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <path d="M90 25 L50 50 L90 75 V25 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <line x1="50" y1="50" x2="50" y2={type === 'valve_solenoid' ? 0 : 10} stroke={stroke} strokeWidth={sw} />
                      {type === 'valve_solenoid' ? (
                          <rect x="35" y="0" width="30" height="15" fill="white" stroke={stroke} strokeWidth={sw} />
                      ) : (
                          <path d="M30 10 A20 20 0 0 1 70 10" fill="white" stroke={stroke} strokeWidth={sw} />
                      )}
                  </g>
              );
          
          case 'valve_3way':
              return (
                  <g>
                      <path d="M10 25 L50 50 L10 75 V25 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <path d="M90 25 L50 50 L90 75 V25 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <path d="M30 90 L50 50 L70 90 H30 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <circle cx="50" cy="50" r="4" fill={stroke} />
                  </g>
              );

          case 'valve_ball':
               return (
                   <g>
                       <circle cx="50" cy="50" r="20" fill={fill} stroke={stroke} strokeWidth={sw} />
                       <line x1="10" y1="50" x2="30" y2="50" stroke={stroke} strokeWidth={sw+1} />
                       <line x1="70" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw+1} />
                       <line x1="50" y1="50" x2="50" y2="20" stroke={stroke} strokeWidth={sw} />
                       <rect x="30" y="10" width="40" height="10" fill="white" stroke={stroke} strokeWidth={sw} />
                   </g>
               );
          
          case 'valve_check':
               return (
                   <g>
                       <line x1="10" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw} />
                       <path d="M60 30 L40 50 L60 70" fill="none" stroke={stroke} strokeWidth={sw+1} />
                       <line x1="40" y1="30" x2="40" y2="70" stroke={stroke} strokeWidth={sw+1} />
                   </g>
               );

          // --- DAMPERS ---
          case 'damper_rect':
              const bladeRot = analogValue ? (analogValue / 100) * 90 : (state === 'on' ? 0 : 90);
              return (
                  <g>
                      <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                      <line x1="10" y1="10" x2="90" y2="90" stroke={stroke} strokeWidth="1" strokeOpacity="0.2" />
                      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `rotate(${bladeRot}deg)`, transition: 'transform 1s' }}>
                          <line x1="50" y1="15" x2="50" y2="85" stroke={stroke} strokeWidth={sw+1} />
                          <line x1="25" y1="25" x2="75" y2="75" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
                      </g>
                  </g>
              );
          
          case 'damper_round':
              const roundRot = analogValue ? (analogValue / 100) * 90 : (state === 'on' ? 0 : 90);
              return (
                  <g>
                      <circle cx="50" cy="50" r="40" fill="white" stroke={stroke} strokeWidth={sw} />
                      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `rotate(${roundRot}deg)`, transition: 'transform 1s' }}>
                          <line x1="50" y1="10" x2="50" y2="90" stroke={stroke} strokeWidth={sw+1} />
                      </g>
                  </g>
              );

          case 'damper_louver':
               return (
                   <g>
                       <rect x="15" y="10" width="70" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <line x1="20" y1="25" x2="80" y2="25" stroke={stroke} strokeWidth={sw} />
                       <line x1="20" y1="40" x2="80" y2="40" stroke={stroke} strokeWidth={sw} />
                       <line x1="20" y1="55" x2="80" y2="55" stroke={stroke} strokeWidth={sw} />
                       <line x1="20" y1="70" x2="80" y2="70" stroke={stroke} strokeWidth={sw} />
                       {state === 'alarm' && <path d="M15 10 L85 90" stroke={stroke} strokeWidth="2" strokeOpacity="0.5" />}
                   </g>
               );

          case 'fire_damper':
               return (
                  <g>
                      <rect x="10" y="10" width="80" height="80" fill={state === 'alarm' ? '#fee2e2' : 'white'} stroke={stroke} strokeWidth={sw} />
                      <line x1="10" y1="90" x2="90" y2="10" stroke={stroke} strokeWidth={sw} />
                      <rect x="40" y="40" width="20" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="1" />
                  </g>
               );

          case 'vav_box':
               return (
                   <g>
                       <rect x="10" y="25" width="80" height="50" fill="white" stroke={stroke} strokeWidth={sw} />
                       <line x1="30" y1="25" x2="70" y2="75" stroke={stroke} strokeWidth={sw} />
                       <rect x="35" y="5" width="30" height="20" fill={fill} stroke={stroke} strokeWidth="1" />
                   </g>
               );

          // --- HEAT EXCHANGERS & PLANT ---
          case 'coil_heat':
          case 'coil_cool':
          case 'heater_electric':
               const isHeat = type === 'coil_heat' || type === 'heater_electric';
               const coilStroke = state === 'on' ? (isHeat ? '#ef4444' : '#3b82f6') : stroke;
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path 
                         d="M20 20 L30 80 L40 20 L50 80 L60 20 L70 80 L80 20" 
                         fill="none" 
                         stroke={coilStroke} 
                         strokeWidth={sw} 
                         strokeLinecap="round"
                         strokeLinejoin="round"
                       />
                       {type === 'heater_electric' && (
                           <path d="M45 40 L55 40 L50 60" stroke="orange" strokeWidth="2" fill="none" />
                       )}
                   </g>
               );
          
          case 'heat_recovery':
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <line x1="10" y1="10" x2="90" y2="90" stroke={stroke} strokeWidth="1" />
                       <line x1="90" y1="10" x2="10" y2="90" stroke={stroke} strokeWidth="1" />
                       <polygon points="50,20 80,50 50,80 20,50" fill={state==='on' ? '#e0f2fe' : 'none'} stroke={stroke} strokeWidth="1" />
                   </g>
               );

          case 'heat_exchanger_rotary':
               return (
                   <g>
                       <rect x="5" y="10" width="90" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <circle cx="50" cy="50" r="35" fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="4 2" className={isAnimated ? "origin-center animate-spin-slow" : ""} />
                       <line x1="50" y1="10" x2="50" y2="90" stroke={stroke} strokeWidth="1" />
                       {state === 'on' && <circle cx="50" cy="50" r="10" fill={fill} opacity="0.5"/>}
                   </g>
               );

          case 'radiator':
               return (
                   <g>
                       <rect x="10" y="20" width="80" height="60" rx="2" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path d="M20 20 V80 M30 20 V80 M40 20 V80 M50 20 V80 M60 20 V80 M70 20 V80 M80 20 V80" stroke={stroke} strokeWidth="1" />
                   </g>
               );

          case 'boiler':
               return (
                   <g>
                       <rect x="15" y="15" width="70" height="70" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path d="M50 70 Q35 50 50 30 Q65 50 50 70" fill={state === 'on' ? 'orange' : 'none'} stroke={stroke} strokeWidth={sw} />
                       <rect x="10" y="70" width="30" height="15" fill={stroke} />
                   </g>
               );

          case 'tank':
               return (
                   <g>
                       <rect x="25" y="15" width="50" height="70" rx="10" fill={fill} stroke={stroke} strokeWidth={sw} />
                       <line x1="25" y1="30" x2="75" y2="30" stroke={stroke} strokeWidth="1" strokeOpacity="0.5" />
                       <line x1="25" y1="70" x2="75" y2="70" stroke={stroke} strokeWidth="1" strokeOpacity="0.5" />
                   </g>
               );

          case 'cooling_tower':
               return (
                   <g>
                       <path d="M20 80 L30 20 L70 20 L80 80 Z" fill="white" stroke={stroke} strokeWidth={sw} />
                       <rect x="35" y="10" width="30" height="10" fill={stroke} />
                       <line x1="25" y1="60" x2="75" y2="60" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
                   </g>
               );
          
          case 'chiller':
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path d="M20 40 L80 40 M20 60 L80 60" stroke={stroke} strokeWidth="1" />
                       <path d="M50 20 L50 35 M50 65 L50 80" stroke={stroke} strokeWidth="1" />
                       <circle cx="50" cy="50" r="10" fill="none" stroke={stroke} />
                       <path d="M50 45 L50 55 M45 50 L55 50" stroke={stroke} strokeWidth="1" /> {/* Snowflake center */}
                   </g>
               );

          case 'condenser':
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path d="M20 20 L80 80 M20 80 L80 20" stroke={stroke} strokeWidth="1" opacity="0.3" />
                       <circle cx="50" cy="50" r="25" fill="none" stroke={stroke} strokeWidth={sw} />
                       <path d="M50 50 L50 30 M50 50 L65 60 M50 50 L35 60" stroke={stroke} strokeWidth={sw} />
                   </g>
               );

          // --- AIR TREATMENT & FILTERS ---
          case 'filter':
          case 'filter_bag':
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill={state === 'alarm' ? '#fee2e2' : 'white'} stroke={stroke} strokeWidth={sw} />
                       <line x1="50" y1="10" x2="50" y2="90" stroke={stroke} strokeWidth={sw+1} strokeDasharray="4 4" />
                       {type === 'filter_bag' && (
                           <path d="M30 10 Q40 50 30 90 M70 10 Q60 50 70 90" fill="none" stroke={stroke} strokeWidth="1" />
                       )}
                   </g>
               );

          case 'humidifier':
               return (
                   <g>
                       <rect x="10" y="10" width="80" height="80" fill="white" stroke={stroke} strokeWidth={sw} />
                       {/* Spray nozzle schematic */}
                       <line x1="40" y1="80" x2="40" y2="40" stroke={stroke} strokeWidth={sw} />
                       <circle cx="40" cy="40" r="5" fill={stroke} />
                       {/* Spray / Steam */}
                       <g className={isAnimated ? "animate-pulse" : ""}>
                           <line x1="40" y1="40" x2="20" y2="20" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2 2" />
                           <line x1="40" y1="40" x2="40" y2="15" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2 2" />
                           <line x1="40" y1="40" x2="60" y2="20" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2 2" />
                       </g>
                   </g>
               );

          case 'silencer':
               return (
                   <g>
                       <rect x="10" y="20" width="80" height="60" fill="white" stroke={stroke} strokeWidth={sw} />
                       <path d="M20 30 Q30 25 40 30 T60 30 T80 30" fill="none" stroke={stroke} strokeWidth="1" />
                       <path d="M20 50 Q30 45 40 50 T60 50 T80 50" fill="none" stroke={stroke} strokeWidth="1" />
                       <path d="M20 70 Q30 65 40 70 T60 70 T80 70" fill="none" stroke={stroke} strokeWidth="1" />
                   </g>
               );

          // --- SENSORS & SWITCHES ---
          case 'sensor_temp':
          case 'sensor_humidity':
          case 'sensor_pressure':
          case 'sensor_flow':
          case 'sensor_co2':
          case 'sensor_air_quality':
          case 'sensor_velocity':
          case 'sensor_light':
          case 'sensor_heat_meter':
          case 'switch_pressure':
          case 'switch_flow':
              const letter = 
                  type.includes('temp') ? 'T' : 
                  type.includes('humidity') ? 'H' : 
                  type.includes('pressure') ? 'P' : 
                  type.includes('flow') ? 'F' :
                  type.includes('co2') ? 'CO2' : 
                  type.includes('velocity') ? 'v' :
                  type.includes('light') ? 'Lux' :
                  type.includes('heat') ? 'Q' : 'Q';
              
              const fontSize = letter.length > 2 ? '20' : '30';
              const isSwitch = type.startsWith('switch');
              
              return (
                  <g>
                      {isSwitch ? (
                          <rect x="15" y="15" width="70" height="70" fill="white" stroke={stroke} strokeWidth={sw} />
                      ) : (
                          <circle cx="50" cy="50" r="35" fill="white" stroke={stroke} strokeWidth={sw} />
                      )}
                      
                      <text x="50" y="60" textAnchor="middle" fontSize={fontSize} fontWeight="bold" fill={stroke}>{letter}</text>
                      
                      {/* Line stem */}
                      <line x1="50" y1={isSwitch ? 85 : 85} x2="50" y2="100" stroke={stroke} strokeWidth={sw} />
                      
                      {/* Switch indicator (diagonal) */}
                      {isSwitch && (
                          <line x1="20" y1="80" x2="80" y2="20" stroke={stroke} strokeWidth="1" strokeOpacity="0.5" />
                      )}
                  </g>
              );

          case 'actuator':
          case 'motor':
              return (
                  <g>
                      <circle cx="50" cy="50" r="35" fill="white" stroke={stroke} strokeWidth={sw} />
                      <text x="50" y="62" textAnchor="middle" fontSize="35" fontWeight="bold" fill={stroke}>M</text>
                  </g>
              );

          // --- UI ELEMENTS ---
          case 'checkbox':
              return (
                  <g>
                      <rect x="20" y="20" width="60" height="60" rx="5" fill="white" stroke={stroke} strokeWidth={sw} />
                      {state === 'on' && <path d="M30 50 L45 65 L70 35" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
                  </g>
              );

          case 'radio':
              return (
                  <g>
                      <circle cx="50" cy="50" r="30" fill="white" stroke={stroke} strokeWidth={sw} />
                      {state === 'on' && <circle cx="50" cy="50" r="15" fill={stroke} />}
                  </g>
              );

          case 'led':
              return (
                  <g>
                      <circle cx="50" cy="50" r="40" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <circle cx="50" cy="50" r="40" fill="url(#shine)" opacity="0.3" />
                      <defs>
                          <radialGradient id="shine" cx="30%" cy="30%" r="50%">
                              <stop offset="0%" stopColor="white" />
                              <stop offset="100%" stopColor="transparent" />
                          </radialGradient>
                      </defs>
                  </g>
              );

          case 'hand':
              return (
                  <g>
                      {/* Simple Hand Icon representation */}
                      <path d="M30 60 L30 40 A5 5 0 0 1 40 40 L40 60" fill="white" stroke={stroke} strokeWidth={sw} />
                      <path d="M40 60 L40 30 A5 5 0 0 1 50 30 L50 60" fill="white" stroke={stroke} strokeWidth={sw} />
                      <path d="M50 60 L50 35 A5 5 0 0 1 60 35 L60 60" fill="white" stroke={stroke} strokeWidth={sw} />
                      <path d="M60 60 L60 45 A5 5 0 0 1 70 45 L70 70 L70 80 L30 80" fill="white" stroke={stroke} strokeWidth={sw} />
                      <path d="M30 60 L20 60 L20 70 L30 80" fill="white" stroke={stroke} strokeWidth={sw} />
                  </g>
              );

          // --- NAVIGATION ---
          case 'nav_arrow':
              return (
                  <g transform={`rotate(${orientation === 'left' ? -90 : orientation === 'down' ? 180 : orientation === 'right' ? 90 : 0} 50 50)`}>
                      <circle cx="50" cy="50" r="40" fill={fill} stroke={stroke} strokeWidth={sw} />
                      <path d="M50 25 L75 55 H25 Z" fill={stroke} />
                  </g>
              );
          
          case 'nav_home':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Home size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_settings':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Settings size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_trend':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><TrendingUp size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_alarm':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-red-500"><AlertTriangle size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_info':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-blue-500"><Info size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_help':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><HelpCircle size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_plus':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Plus size={60} strokeWidth={2} /></div></foreignObject>;
          case 'nav_minus':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Minus size={60} strokeWidth={2} /></div></foreignObject>;
          case 'nav_refresh':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><RefreshCw size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_stop':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><StopCircle size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_play':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Play size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_date':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Calendar size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_clock':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-gray-600"><Clock size={60} strokeWidth={1.5} /></div></foreignObject>;
          case 'nav_internet':
              return <foreignObject x="10" y="10" width="80" height="80"><div className="w-full h-full flex items-center justify-center text-blue-500"><Globe size={60} strokeWidth={1.5} /></div></foreignObject>;

          default:
              return <circle cx="50" cy="50" r="40" fill="gray" />;
      }
  };

  return (
    <div className={`flex flex-col items-center justify-center overflow-visible ${className}`}>
       <div 
          className="relative"
          style={{ 
            width: '100%', 
            height: '100%', 
            transform: `rotate(${type.startsWith('nav_arrow') ? 0 : getRotation()}deg)`,
            transition: 'transform 0.3s ease'
          }}
       >
           <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm filter transition-all overflow-visible">
              {renderSymbol()}
           </svg>
       </div>
       {showValue && (
           <div className="mt-1 bg-white/90 dark:bg-black/80 px-2 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-white/10 shadow-sm z-10 whitespace-nowrap">
               {typeof value === 'number' ? Math.round(value * 10) / 10 : value.toString()} {unit}
           </div>
       )}
    </div>
  );
};
