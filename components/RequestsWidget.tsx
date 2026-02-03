import React from 'react';
import { ClipboardList, Plus } from 'lucide-react';

type RequestItem = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  equipment?: string;
  location?: string;
  requester?: string;
  createdAt?: string;
};

const SAMPLE_REQUESTS: RequestItem[] = [
  { id: 'D-101', title: 'Fuite robinet 2F', status: 'Ouvert', priority: 'Moyenne', equipment: 'Robinet 2F', location: 'Bâtiment A', requester: 'Michel', createdAt: '02/12/2025' },
  { id: 'D-102', title: 'Bruit CTA', status: 'En cours', priority: 'Haute', equipment: 'CTA-01', location: 'Toiture', requester: 'Sophie', createdAt: '01/12/2025' },
  { id: 'D-103', title: 'Ampoule HS', status: 'Ouvert', priority: 'Basse', equipment: 'Éclairage S2', location: 'Salle S2', requester: 'Karim', createdAt: '30/11/2025' },
];

type Props = {
  items?: RequestItem[];
  isLoading?: boolean;
  onNew?: () => void;
};

const RequestsWidget: React.FC<Props> = ({ items, isLoading, onNew }) => {
  const data = items?.length ? items : SAMPLE_REQUESTS;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Demandes</div>
            <div className="text-xs text-gray-500">Vue temps réel des demandes</div>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          onClick={onNew || (() => alert('Ouvrir le formulaire de demande'))}
        >
          <Plus size={14} />
          Nouvelle demande
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Titre</th>
              <th className="px-3 py-2 text-left">Équipement</th>
              <th className="px-3 py-2 text-left">Emplacement</th>
              <th className="px-3 py-2 text-left">Priorité</th>
              <th className="px-3 py-2 text-left">État</th>
              <th className="px-3 py-2 text-left">Demandé par</th>
              <th className="px-3 py-2 text-left">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-100">
            {isLoading && (
              <tr><td className="px-3 py-3 text-sm text-gray-500" colSpan={8}>Chargement…</td></tr>
            )}
            {!isLoading && data.map(req => (
              <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-3 py-2 font-semibold">{req.id}</td>
                <td className="px-3 py-2">{req.title}</td>
                <td className="px-3 py-2">{req.equipment || '—'}</td>
                <td className="px-3 py-2">{req.location || '—'}</td>
                <td className="px-3 py-2">{req.priority || '—'}</td>
                <td className="px-3 py-2">{req.status}</td>
                <td className="px-3 py-2">{req.requester || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{req.createdAt || '—'}</td>
              </tr>
            ))}
            {!isLoading && !data.length && (
              <tr><td className="px-3 py-3 text-sm text-gray-500" colSpan={8}>Aucune demande</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestsWidget;
