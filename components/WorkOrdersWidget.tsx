import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
const WORK_ORDERS_STORAGE_KEY = 'gmao-workorders';

export type WorkOrderItem = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  workType?: string;
  assignee?: string;
  categories?: string[];
  equipment?: string;
  location?: string;
  dueDate?: string;
  recurrence?: string;
  procedure?: string;
  updatedAt?: string;
  createdAt?: string;
};

type Props = {
  items?: WorkOrderItem[];
  isLoading?: boolean;
  onNew?: () => void;
  onSelect?: (item: WorkOrderItem) => void;
};

const defaultData: WorkOrderItem[] = [
  {
    id: '#1',
    title: 'Inspection quotidienne',
    status: 'En cours',
    priority: 'Moyenne',
    workType: 'Préventive',
    assignee: 'Bensalem Mohamed',
    categories: ['Préventif'],
    equipment: 'rwrrewrew',
    location: 'General',
    dueDate: '28/11/2025',
    recurrence: 'Hebdo',
    procedure: '–',
    createdAt: '28/11/2025',
    updatedAt: '05/12/2025',
  },
  {
    id: '#2',
    title: 'erterterte',
    status: 'En cours',
    priority: '–',
    workType: 'Réactive',
    assignee: 'Bensalem Mohamed',
    categories: ['Électrique'],
    equipment: 'rwrrewrew',
    location: 'General',
    dueDate: '—',
    recurrence: '—',
    procedure: '—',
    createdAt: '02/12/2025',
    updatedAt: '02/12/2025',
  },
];

const WorkOrdersWidget: React.FC<Props> = ({ items, isLoading, onNew, onSelect }) => {
  const [localData, setLocalData] = useState<WorkOrderItem[]>([]);

  useEffect(() => {
    if (items?.length) {
      setLocalData(items);
      return;
    }
    try {
      const saved = localStorage.getItem(WORK_ORDERS_STORAGE_KEY);
      if (saved) {
        setLocalData(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Cannot read workorders cache', e);
    }
  }, [items]);

  const data = localData.length ? localData : defaultData;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bons de travail</div>
            <div className="text-xs text-gray-500">Suivi temps réel</div>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          onClick={onNew || (() => alert('Ouvrir le formulaire de Bon de travail'))}
        >
          <Plus size={14} />
          Nouveau BT
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Titre</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">État</th>
              <th className="px-3 py-2 text-left">Priorité</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Assigné à</th>
              <th className="px-3 py-2 text-left">Catégories</th>
              <th className="px-3 py-2 text-left">Équipement</th>
              <th className="px-3 py-2 text-left">Emplacement</th>
              <th className="px-3 py-2 text-left">Créé le</th>
              <th className="px-3 py-2 text-left">Mis à jour le</th>
              <th className="px-3 py-2 text-left">Date d’échéance</th>
              <th className="px-3 py-2 text-left">Récurrence</th>
              <th className="px-3 py-2 text-left">Procédure jointe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-100">
            {isLoading && (
              <tr>
                <td className="px-3 py-3 text-sm text-gray-500" colSpan={14}>Chargement…</td>
              </tr>
            )}
            {!isLoading && data.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                onClick={() => onSelect && onSelect(order)}
              >
                <td className="px-3 py-2 font-semibold">{order.title}</td>
                <td className="px-3 py-2">{order.id}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="px-3 py-2">{order.priority || '—'}</td>
                <td className="px-3 py-2">{order.workType || '—'}</td>
                <td className="px-3 py-2">{order.assignee || '—'}</td>
                <td className="px-3 py-2">{order.categories?.join(', ') || '—'}</td>
                <td className="px-3 py-2">{order.equipment || '—'}</td>
                <td className="px-3 py-2">{order.location || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{order.createdAt || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{order.updatedAt || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{order.dueDate || '—'}</td>
                <td className="px-3 py-2">{order.recurrence || '—'}</td>
                <td className="px-3 py-2">{order.procedure || '—'}</td>
              </tr>
            ))}
            {!isLoading && !data.length && (
              <tr>
                <td className="px-3 py-3 text-sm text-gray-500" colSpan={14}>Aucun bon de travail</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkOrdersWidget;
