import { useState, useEffect, useMemo, useCallback } from 'react';

// Types definition matching GMAOWidget
export type Equipment = { id: string; name: string; status?: string; description?: string };
export type Supplier = { id: string; name: string; color?: string; description?: string };
export type Category = { id: string; name: string; description?: string; icon?: string; color?: string };
export type UserType = { id: string; name: string; email?: string; role?: string };
export type WorkOrder = any; // We'll refine this if needed, keeping it loose for now to match GMAOWidget usage

const API_URL = (import.meta as any).env?.VITE_GMAO_API || 'http://localhost:4100';
const API_BASE = API_URL.replace(/\/$/, '');
const WORK_ORDERS_STORAGE_KEY = 'gmao-workorders';
const TEAMS_STORAGE_KEY = 'gmao-teams';
const API_TIMEOUT_MS = 5000;
const LAST_API_OK_KEY = 'gmao-last-api-ok';

const FALLBACK_EQUIPMENTS: Equipment[] = [
    { id: 'eq-sample-1', name: 'Pompe principale', status: 'En ligne' },
    { id: 'eq-sample-2', name: 'Groupe froid', status: 'Hors ligne' },
];
const FALLBACK_LOCATIONS = [
    { id: 'loc-sample-1', name: 'General' },
    { id: 'loc-sample-2', name: 'Batiment A / RDC' },
];
const FALLBACK_SUPPLIERS: Supplier[] = [
    { id: 'sup-sample-1', name: 'Fournisseur local' },
    { id: 'sup-sample-2', name: 'Maintenance externe' },
];
const FALLBACK_CATEGORIES: Category[] = [
    { id: 'cat-sample-1', name: 'Maintenance' },
    { id: 'cat-sample-2', name: 'Securite' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useGMAOData = () => {
    const [apiStatus, setApiStatus] = useState<'idle' | 'ok' | 'error' | 'loading' | 'offline'>('idle');
    const [apiError, setApiError] = useState<string | null>(null);

    // Data States
    const [localOrders, setLocalOrders] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [teamEquipments, setTeamEquipments] = useState<any[]>([]);
    const [teamLocations, setTeamLocations] = useState<any[]>([]);

    // Base mock orders
    const baseOrders = useMemo(
        () => [
            {
                title: 'Inspection quotidienne',
                id: '#1',
                status: 'Ouvert',
                priority: 'Moyenne',
                workType: 'Préventive',
                assignee: 'Bensalem Mohamed',
                categories: ['Préventif'],
                equipment: 'Rwrewrew',
                location: 'General',
                createdAt: '2025-12-01',
                dueDate: '2025-12-10',
            },
            {
                title: 'Vérifier le tableau électrique',
                id: '#2',
                status: 'En cours',
                priority: 'Élevée',
                workType: 'Réactive',
                assignee: 'Département CVC',
                categories: ['Dommages'],
                equipment: 'Tableau Nord',
                location: 'Bâtiment C',
                createdAt: '2025-12-03',
                dueDate: '2025-12-06',
            },
        ],
        []
    );

    const workOrders = useMemo(() => {
        const idsOverride = new Set(localOrders.map(o => o.id));
        const merged = [...baseOrders.filter(o => !idsOverride.has(o.id)), ...localOrders];
        return merged;
    }, [baseOrders, localOrders]);

    const orderStats = useMemo(() => {
        const total = workOrders.length;
        const open = workOrders.filter(o => ['Ouvert', 'En cours', 'En attente', 'Brouillon'].includes(o.status)).length;
        const closed = workOrders.filter(o => ['Terminé', 'Clôturé'].includes(o.status)).length;
        return { total, open, closed };
    }, [workOrders]);

    const persistOrders = (orders: any[]) => {
        try { localStorage.setItem(WORK_ORDERS_STORAGE_KEY, JSON.stringify(orders)); } catch (e) { }
        setLocalOrders(orders);
    };

    const updateOrder = (orderId: string, updates: any) => {
        const target = workOrders.find(o => o.id === orderId);
        if (!target) return;

        const closedStatuses = ['Terminé', 'Clôturé'];
        const isClosing = updates.status && closedStatuses.includes(updates.status);

        // If it's a base order being modified for the first time, we add it to localOrders
        const updated = {
            ...target,
            ...updates,
            updatedAt: new Date().toISOString().slice(0, 10),
            closedAt: isClosing ? new Date().toISOString().slice(0, 10) : target.closedAt,
        };

        const existingLocalIndex = localOrders.findIndex(o => o.id === orderId);

        if (existingLocalIndex >= 0) {
            // Update existing local order
            const next = [...localOrders];
            next[existingLocalIndex] = updated;
            persistOrders(next);
        } else {
            // It was a base order, now becoming a local order override
            persistOrders([...localOrders, updated]);
        }
    };

    const addOrder = (order: any) => {
        const next = [order, ...localOrders];
        persistOrders(next);
    };

    // Api utilities
    const fetchWithTimeout = async (url: string, options?: RequestInit) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            return res;
        } finally {
            clearTimeout(timer);
        }
    };

    const isHttpOk = (res: Response) => res.ok || res.status === 304;

    const checkApiHealth = async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/health`, { cache: 'no-store' });
            if (!isHttpOk(res)) throw new Error(`Health HTTP ${res.status}`);
            return true;
        } catch (e) {
            return false;
        }
    };

    const fetchJson = async (url: string) => {
        const res = await fetchWithTimeout(url, { cache: 'no-store' });
        if (!isHttpOk(res)) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    const fetchData = useCallback(async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setApiStatus('offline');
            setApiError('API GMAO indisponible (hors ligne). Mode local.');
            setEquipments(prev => prev.length ? prev : FALLBACK_EQUIPMENTS);
            setLocations(prev => prev.length ? prev : FALLBACK_LOCATIONS);
            setSuppliers(prev => prev.length ? prev : FALLBACK_SUPPLIERS);
            setCategories(prev => prev.length ? prev : FALLBACK_CATEGORIES);
            return;
        }

        setApiStatus('loading');
        setApiError(null);
        let lastErr: any = null;
        const retries = [0, 600, 1500];

        for (const delay of retries) {
            if (delay) await sleep(delay);
            try {
                // Check health first
                const health = await checkApiHealth();
                if (!health) throw new Error("Health check failed");

                const [eqRes, spRes, catRes, userRes, locRes, teamRes, memberRes, teamLocRes, teamEqRes] = await Promise.all([
                    fetchJson(`${API_BASE}/api/equipments`),
                    fetchJson(`${API_BASE}/api/suppliers`),
                    fetchJson(`${API_BASE}/api/categories`),
                    fetchJson(`${API_BASE}/api/users`),
                    fetchJson(`${API_BASE}/api/locations`),
                    fetchJson(`${API_BASE}/api/teams`),
                    fetchJson(`${API_BASE}/api/team_members`),
                    fetchJson(`${API_BASE}/api/team_locations`),
                    fetchJson(`${API_BASE}/api/team_equipments`),
                ]);

                setEquipments(eqRes);
                setSuppliers(spRes);
                setCategories(catRes);
                setUsers(userRes);
                setLocations(locRes);
                setTeams(teamRes);
                setTeamMembers(memberRes);
                setTeamLocations(teamLocRes);
                setTeamEquipments(teamEqRes);

                setApiStatus('ok');
                localStorage.setItem(LAST_API_OK_KEY, '1');
                return;
            } catch (err: any) {
                lastErr = err;
            }
        }

        console.error('GMAO API Error', lastErr);
        localStorage.removeItem(LAST_API_OK_KEY);
        setApiError('API GMAO indisponible (mode local).');
        setApiStatus('offline');

        // Use fallbacks if empty
        setEquipments(prev => prev.length ? prev : FALLBACK_EQUIPMENTS);
        setLocations(prev => prev.length ? prev : FALLBACK_LOCATIONS);
        setSuppliers(prev => prev.length ? prev : FALLBACK_SUPPLIERS);
        setCategories(prev => prev.length ? prev : FALLBACK_CATEGORIES);
    }, []);

    // Initial Load
    useEffect(() => {
        try {
            const saved = localStorage.getItem(WORK_ORDERS_STORAGE_KEY);
            if (saved) setLocalOrders(JSON.parse(saved));

            const savedTeams = localStorage.getItem(TEAMS_STORAGE_KEY);
            if (savedTeams) setTeams(JSON.parse(savedTeams));
            else setTeams(['Maintenance', 'Électricité']); // Fallback logic from GMAOWidget
        } catch (err) {
            console.warn('Cannot read workorders cache', err);
        }

        fetchData();
    }, [fetchData]);

    // Reconnection logic
    useEffect(() => {
        if (apiStatus === 'offline') {
            const interval = window.setInterval(() => {
                checkApiHealth().then(ok => {
                    if (ok) fetchData();
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [apiStatus, fetchData]);

    // CRUD operations wrappers
    const createItem = async (endpoint: string, payload: any) => {
        try {
            const res = await fetchWithTimeout(`${API_URL}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            const saved = await res.json();
            // Rafraîchit les listes mais retourne aussi l'élément créé pour un retour immédiat
            fetchData();
            return saved;
        } catch (e: any) {
            console.error(e);
            // Fallback local pour ne pas bloquer l'UX
            return { ...payload, id: `local-${Date.now()}` };
        }
    };

    return {
        workOrders,
        updateOrder,
        addOrder,
        apiStatus,
        apiError,
        equipments,
        suppliers,
        categories,
        users,
        locations,
        teams,
        teamMembers,
        teamEquipments,
        teamLocations,
        fetchData,
        createItem,
        setEquipments, // Exposed for opportunistic updates if needed
        setLocations,
        setSuppliers,
        setCategories,
        setUsers,
        setTeams,
        setTeamMembers,
        setTeamEquipments,
        setTeamLocations,
        orderStats,
    };
};
