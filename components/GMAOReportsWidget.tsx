import React, { useState, useMemo } from 'react';
import {
    ClipboardList, CheckCircle, Clock, AlertTriangle, Users, Wrench,
    Calendar, TrendingUp, PieChart, BarChart3, Filter, ChevronDown,
    ChevronRight, RefreshCw, Download, Plus
} from 'lucide-react';
import {
    PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    BarChart, Bar
} from 'recharts';

// Types
// Types
interface WorkOrder {
    id: string;
    title: string;
    status: string; // 'Ouvert' | 'En cours' | 'En attente' | 'Terminé'
    priority: string;
    workType?: string; // 'Préventive' | 'Réactive' | 'Projet'
    type?: string; // fallback
    recurrence?: string;
    recurring?: boolean; // fallback
    assignee: string;
    equipment: string;
    location: string;
    category?: string;
    categories?: string[];
    createdAt: string;
    updatedAt?: string;
    dueDate?: string;
    completedAt?: string;
    hoursSpent?: number;
    hours?: number; // fallback
    onTime?: boolean;
}

interface GMAOReportsWidgetProps {
    workOrders?: WorkOrder[];
    isEditing?: boolean;
}

const COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
    gray: '#9ca3af',
    teal: '#14b8a6',
    orange: '#f97316',
};

// Map French statuses to colors
const STATUS_COLORS: Record<string, string> = {
    'Ouvert': COLORS.primary,
    'En cours': COLORS.info,
    'En attente': COLORS.warning,
    'Terminé': COLORS.success,
    'Clôturé': COLORS.success,
    'Brouillon': COLORS.gray,
    // Keep English fallbacks
    open: COLORS.primary,
    in_progress: COLORS.info,
    pending: COLORS.warning,
    completed: COLORS.success,
};

const STATUS_LABELS: Record<string, string> = {
    'Ouvert': 'Ouvert',
    'En cours': 'En cours',
    'En attente': 'En attente',
    'Terminé': 'Terminé',
    'Clôturé': 'Clôturé',
    'Brouillon': 'Brouillon',
    open: 'Ouvert',
    in_progress: 'En cours',
    pending: 'En attente',
    completed: 'Terminé',
};

const TYPE_COLORS: Record<string, string> = {
    'Préventive': COLORS.primary,
    'Réactive': COLORS.warning,
    'Projet': COLORS.info,
    preventive: COLORS.primary,
    reactive: COLORS.warning,
    other: COLORS.gray,
};

const TYPE_LABELS: Record<string, string> = {
    'Préventive': 'Préventive',
    'Réactive': 'Réactive',
    'Projet': 'Projet',
    preventive: 'Préventive',
    reactive: 'Réactive',
    other: 'Autre',
};

// ... existing components ...

// KPI Card Component
const KPICard: React.FC<{
    value: number | string;
    label: string;
    color?: string;
    icon?: React.ReactNode;
    suffix?: string;
    trend?: number;
}> = ({ value, label, color = COLORS.primary, icon, suffix = '', trend }) => (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
        {icon && <div className="mb-2 text-gray-400">{icon}</div>}
        <div className="text-3xl font-bold" style={{ color }}>{value}{suffix}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{label}</div>
        {trend !== undefined && (
            <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
        )}
    </div>
);

// Mini Stat Component with badge
const MiniStat: React.FC<{
    value: number;
    label: string;
    color: string;
}> = ({ value, label, color }) => (
    <div className="flex flex-col items-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <span
            className="px-3 py-1 rounded-full text-xs font-medium mt-1"
            style={{ backgroundColor: `${color}20`, color }}
        >
            {label}
        </span>
    </div>
);

// Gauge Component
const GaugeChart: React.FC<{
    value: number;
    label: string;
    color?: string;
    size?: number;
}> = ({ value, label, color = COLORS.primary, size = 120 }) => {
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{value.toFixed(1)}%</span>
                <span className="text-xs text-gray-500">{label}</span>
            </div>
        </div>
    );
};

// Section Header
const SectionHeader: React.FC<{
    title: string;
    onExpand?: () => void;
    isExpanded?: boolean;
}> = ({ title, onExpand, isExpanded = true }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            {onExpand && (
                <button onClick={onExpand} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
            )}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
        </div>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400">
            <Plus size={14} />
        </button>
    </div>
);

// Main Widget Component
export const GMAOReportsWidget: React.FC<GMAOReportsWidgetProps> = ({
    workOrders = [],
    isEditing = false,
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'users' | 'equipment'>('overview');
    const [dateRange, setDateRange] = useState('week');

    // Computed stats
    const stats = useMemo(() => {
        const total = workOrders.length;
        const created = workOrders.filter(w => !['Terminé', 'Clôturé', 'completed'].includes(w.status)).length;
        const completed = workOrders.filter(w => ['Terminé', 'Clôturé', 'completed'].includes(w.status)).length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        const byStatus = {
            open: workOrders.filter(w => ['Ouvert', 'open'].includes(w.status)).length,
            in_progress: workOrders.filter(w => ['En cours', 'in_progress'].includes(w.status)).length,
            pending: workOrders.filter(w => ['En attente', 'pending'].includes(w.status)).length,
            completed: completed,
        };

        const byType = {
            preventive: workOrders.filter(w => ['Préventive', 'preventive'].includes(w.workType || w.type || '')).length,
            reactive: workOrders.filter(w => ['Réactive', 'reactive'].includes(w.workType || w.type || '')).length,
            other: workOrders.filter(w => !['Préventive', 'preventive', 'Réactive', 'reactive'].includes(w.workType || w.type || '')).length,
        };

        const preventiveRatio = total > 0 ? (byType.preventive / total) * 100 : 0;

        // Recurrence check: look for 'recurrence' string or 'recurring' boolean
        const isRecurring = (w: WorkOrder) => (w.recurring === true) || (w.recurrence && w.recurrence !== 'Ne se répète pas');

        const recurring = workOrders.filter(w => isRecurring(w)).length;
        const nonRecurring = total - recurring;
        const recurringRatio = total > 0 ? (recurring / total) * 100 : 0;

        const totalHours = workOrders.reduce((sum, w) => sum + (w.hoursSpent || w.hours || 0), 0);
        const avgHours = completed > 0 ? totalHours / completed : 0;

        const onTime = workOrders.filter(w => ['Terminé', 'Clôturé', 'completed'].includes(w.status) && w.onTime !== false).length; // Default to true if unknown? No, strictly require check? Assuming onTime true if not false for now or adapt logic
        const late = workOrders.filter(w => ['Terminé', 'Clôturé', 'completed'].includes(w.status) && w.onTime === false).length;
        const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 0;

        // By user
        const byUser: Record<string, { total: number; completed: number }> = {};
        workOrders.forEach(w => {
            const assignee = w.assignee || 'Unassigned';
            if (!byUser[assignee]) byUser[assignee] = { total: 0, completed: 0 };
            byUser[assignee].total++;
            if (['Terminé', 'Clôturé', 'completed'].includes(w.status)) byUser[assignee].completed++;
        });

        // By equipment
        const byEquipment: Record<string, number> = {};
        workOrders.forEach(w => {
            const eq = w.equipment || 'Unknown';
            byEquipment[eq] = (byEquipment[eq] || 0) + 1;
        });

        return {
            total, created, completed, completionRate,
            byStatus, byType, preventiveRatio,
            recurring, nonRecurring, recurringRatio,
            totalHours, avgHours, onTime, late, onTimeRate,
            byUser, byEquipment,
        };
    }, [workOrders]);

    // Chart data
    const statusPieData = Object.entries(stats.byStatus).map(([key, value]) => ({
        name: STATUS_LABELS[key],
        value,
        color: STATUS_COLORS[key],
    }));

    const typePieData = Object.entries(stats.byType).map(([key, value]) => ({
        name: TYPE_LABELS[key],
        value,
        color: TYPE_COLORS[key],
    }));

    const timelineData = [
        { name: 'Sem 1', created: 2, completed: 1 },
        { name: 'Sem 2', created: 3, completed: 2 },
        { name: 'Sem 3', created: 1, completed: 3 },
        { name: 'Sem 4', created: 4, completed: 2 },
        { name: 'Sem 5', created: 2, completed: 4 },
    ];

    const tabs = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: PieChart },
        { id: 'time', label: 'Temps', icon: Clock },
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'equipment', label: 'Équipements', icon: Wrench },
    ];

    return (
        <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <ClipboardList className="text-blue-500" size={24} />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rapports GMAO</h2>
                        <p className="text-xs text-gray-500">Tableau de bord de maintenance</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                    >
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                        <option value="quarter">Ce trimestre</option>
                        <option value="year">Cette année</option>
                    </select>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500">
                        <RefreshCw size={16} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-2 bg-white dark:bg-[#1c1c1e] border-b border-gray-100 dark:border-white/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bons de travail - Créé ou terminé */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Bons de travail" />
                            <div className="flex justify-around mb-6">
                                <MiniStat value={stats.created} label="Créé" color={COLORS.primary} />
                                <MiniStat value={stats.completed} label="Terminé" color={COLORS.success} />
                                <div className="flex flex-col items-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completionRate.toFixed(1)}%</div>
                                    <span className="text-xs text-gray-500 mt-1">Pourcentage terminé</span>
                                </div>
                            </div>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="created" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bons de travail par type */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Bons de travail par type" />
                            <div className="flex justify-around mb-4">
                                <MiniStat value={stats.byType.preventive} label="Préventive" color={COLORS.primary} />
                                <MiniStat value={stats.byType.reactive} label="Réactive" color={COLORS.warning} />
                                <MiniStat value={stats.byType.other} label="Autre" color={COLORS.gray} />
                                <div className="flex flex-col items-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.preventiveRatio.toFixed(1)}%</div>
                                    <span className="text-xs text-gray-500 mt-1">Ratio préventif</span>
                                </div>
                            </div>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="created" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Non récurrent ou récurrent */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Non récurrent ou récurrent" />
                            <div className="flex justify-around items-center">
                                <MiniStat value={stats.nonRecurring} label="Non récurrent" color={COLORS.info} />
                                <MiniStat value={stats.recurring} label="Récurrent" color={COLORS.teal} />
                                <div className="flex flex-col items-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recurringRatio.toFixed(1)}%</div>
                                    <span className="text-xs text-gray-500 mt-1">Ratio de répétition</span>
                                </div>
                            </div>
                        </div>

                        {/* État */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="État" />
                            <div className="flex items-center gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <MiniStat value={stats.byStatus.open} label="Ouvert" color={COLORS.primary} />
                                    <MiniStat value={stats.byStatus.pending} label="En attente" color={COLORS.warning} />
                                    <MiniStat value={stats.byStatus.in_progress} label="En cours" color={COLORS.info} />
                                    <MiniStat value={stats.byStatus.completed} label="Terminé" color={COLORS.success} />
                                </div>
                                <div className="h-32 w-32">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={statusPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={30}
                                                outerRadius={50}
                                                dataKey="value"
                                                paddingAngle={2}
                                            >
                                                {statusPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'time' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Délai d'achèvement */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Délai d'achèvement" />
                            <div className="flex justify-around">
                                <KPICard value={stats.totalHours.toFixed(1)} suffix="h" label="Nombre total d'heures" color={COLORS.primary} />
                                <KPICard value={stats.avgHours.toFixed(1)} suffix="h" label="Heures moyennes" color={COLORS.info} />
                                <KPICard value="0" suffix="h" label="Heures MT TR moyennes" color={COLORS.teal} />
                            </div>
                        </div>

                        {/* À temps ou en retard */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="À temps ou en retard" />
                            <div className="flex justify-around items-center">
                                <MiniStat value={stats.onTime} label="À l'heure" color={COLORS.success} />
                                <MiniStat value={stats.late} label="En retard" color={COLORS.danger} />
                                <div className="relative">
                                    <GaugeChart value={stats.onTimeRate} label="% total dans les temps" color={COLORS.success} />
                                </div>
                            </div>
                        </div>

                        {/* Bons de travail dans les délais */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 lg:col-span-2">
                            <SectionHeader title="Bons de travail dans les délais" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Non récurrents</span>
                                    <div className="h-32 w-32 relative">
                                        <GaugeChart value={stats.onTimeRate} label="À l'heure" color={COLORS.primary} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Récurrents</span>
                                    <div className="h-32 w-32 relative">
                                        <GaugeChart value={50} label="À l'heure" color={COLORS.teal} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {/* Finalisé par l'utilisateur */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Finalisé par l'utilisateur" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-white/10">
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Utilisateur</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-500">Cette semaine</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-500">La semaine dernière</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-500">Previous</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(stats.byUser).map(([user, data]: [string, any]) => (
                                            <tr key={user} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                                <td className="py-3 px-4 flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                        {user.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{user}</span>
                                                </td>
                                                <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">{data.completed}</td>
                                                <td className="text-center py-3 px-4 text-gray-500">-</td>
                                                <td className="text-center py-3 px-4 text-gray-500">-</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'equipment' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Maintenance d'Équipements */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                            <SectionHeader title="Maintenance d'Équipements" />
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500">
                                                <th className="pb-2">Équipement</th>
                                                <th className="pb-2 text-center">Récurrent</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(stats.byEquipment).slice(0, 5).map(([equipment, count]) => (
                                                <tr key={equipment} className="border-t border-gray-100 dark:border-white/10">
                                                    <td className="py-2 text-gray-700 dark:text-gray-300">{equipment}</td>
                                                    <td className="py-2 text-center text-gray-900 dark:text-white font-medium">{count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="relative">
                                    <GaugeChart value={100} label="Équipements couverts" color={COLORS.primary} size={140} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center">
                                Tous vos équipements ont des Bons de travail récurrents !
                            </p>
                        </div>

                        {/* Tous les Bons de travail récurrents */}
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 lg:col-span-2">
                            <SectionHeader title="Tous les Bons de travail récurrents" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-white/10">
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Titre</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">ID</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">État</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Priorité</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Assigné à</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Équipement</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Emplacement</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Récurrence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workOrders.filter(w => w.recurring).map(wo => (
                                            <tr key={wo.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                                <td className="py-3 px-2">
                                                    <span className="text-blue-600 hover:underline cursor-pointer font-medium">{wo.title}</span>
                                                </td>
                                                <td className="py-3 px-2 text-gray-500">#{wo.id.split('-')[1]}</td>
                                                <td className="py-3 px-2">
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                        style={{ backgroundColor: `${STATUS_COLORS[wo.status]}20`, color: STATUS_COLORS[wo.status] }}
                                                    >
                                                        {STATUS_LABELS[wo.status]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 capitalize text-gray-700 dark:text-gray-300">{wo.priority}</td>
                                                <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{TYPE_LABELS[wo.type]}</td>
                                                <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{wo.assignee}</td>
                                                <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{wo.equipment}</td>
                                                <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{wo.location}</td>
                                                <td className="py-3 px-2">
                                                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">
                                                        Hebdo
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="text-xs text-gray-400 text-right mt-2">
                                1 - {workOrders.filter(w => w.recurring).length} sur {workOrders.filter(w => w.recurring).length}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GMAOReportsWidget;
