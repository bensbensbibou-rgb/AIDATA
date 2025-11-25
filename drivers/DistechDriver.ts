import { MCPHttpClient, MCPClientConfig } from './MCPClient';
import {
  DistechDevice,
  DistechEventNotification,
  DistechObject,
} from './DistechTypes';
import { DriverNodeDetails } from './NodeDetails';

export interface DistechDriverConfig extends MCPClientConfig {
  ecyUrl?: string;
  ecyUser?: string;
  ecyPassword?: string;
  deviceEndpoint?: string;
  loadEndpoint?: string;
  eventsEndpoint?: string;
}

type DeviceSubscriber = (devices: DistechDevice[]) => void;

const DEFAULT_DISTECH_CONFIG: DistechDriverConfig = {
  url: (import.meta as any).env?.VITE_MCP_DISTECH_URL || 'http://localhost:8001',
  apiKey: (import.meta as any).env?.VITE_MCP_DISTECH_KEY || '',
  timeoutMs: 15000,
  ecyUrl: (import.meta as any).env?.VITE_DISTECH_ECY_URL || '',
  ecyUser: (import.meta as any).env?.VITE_DISTECH_ECY_USER || '',
  ecyPassword: (import.meta as any).env?.VITE_DISTECH_ECY_PASSWORD || '',
  deviceEndpoint: '/devices',
  loadEndpoint: '/devices/{deviceId}/objects',
  eventsEndpoint: '/events',
};

class DistechDriver {
  private config: DistechDriverConfig = { ...DEFAULT_DISTECH_CONFIG };
  private readonly http = new MCPHttpClient(() => this.config);
  private devices: DistechDevice[] = [];
  private subscribers = new Set<DeviceSubscriber>();
  private pollingHandle: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  configure(partial: Partial<DistechDriverConfig>) {
    this.config = { ...this.config, ...partial };
  }

  isConnectedToMCP() {
    return this.connected;
  }

  getDevices() {
    return this.devices;
  }

  subscribe(callback: DeviceSubscriber) {
    this.subscribers.add(callback);
    callback([...this.devices]);
    return () => this.subscribers.delete(callback);
  }

  async connect() {
    try {
      await this.ping();
      await this.refreshDevices();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  disconnect() {
    this.connected = false;
    if (this.pollingHandle) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  startPolling(interval = 12000) {
    if (this.pollingHandle) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }

    if (interval <= 0) return;

    this.pollingHandle = setInterval(() => {
      if (!this.connected) return;
      this.refreshDevices().catch((error) =>
        console.warn('Distech polling failed:', error)
      );
    }, interval);
  }

  async loadObjects(deviceId: number, objectType: string, instances: number[]) {
    if (!instances?.length) {
      throw new Error('At least one instance is required.');
    }

    const endpointTemplate =
      this.config.loadEndpoint ?? DEFAULT_DISTECH_CONFIG.loadEndpoint!;
    const path = endpointTemplate.replace('{deviceId}', String(deviceId));

    const payload = await this.http.request<any>(path, {
      method: 'POST',
      body: {
        objectType,
        instances,
        ecy: this.getEcyCredentials(),
      },
    });

    const objects: DistechObject[] = Array.isArray(payload?.objects)
      ? payload.objects.map((obj: any) => this.normalizeObject(obj))
      : Array.isArray(payload)
        ? payload.map((obj: any) => this.normalizeObject(obj))
        : [];

    this.devices = this.devices.map((device) =>
      device.deviceId === deviceId ? { ...device, objects } : device
    );
    this.emit();
    return objects;
  }

  async getEventNotifications(): Promise<DistechEventNotification[]> {
    const endpoint = this.config.eventsEndpoint ?? DEFAULT_DISTECH_CONFIG.eventsEndpoint!;
    const payload = await this.http.request<any>(endpoint, { method: 'GET' });

    const entries = Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload)
        ? payload
        : [];

    return entries.map((entry: any) => ({
      deviceId: this.parseNumber(entry.deviceId ?? entry.device_id),
      objectType: entry.objectType ?? entry.type ?? 'unknown',
      objectInstance: this.parseNumber(
        entry.objectInstance ?? entry.instance ?? entry.object_instance
      ),
      description: entry.description,
      acknowledged: Boolean(entry.acknowledged ?? entry.isAcknowledged),
      timestamp: entry.timestamp ?? entry.time,
    }));
  }

  private async ping() {
    await this.http.request('/health', { method: 'GET' });
  }

  private async refreshDevices() {
    const endpoint =
      this.config.deviceEndpoint ?? DEFAULT_DISTECH_CONFIG.deviceEndpoint!;
    const payload = await this.http.request<any>(endpoint, { method: 'GET' });

    let devices: any[] = [];
    if (Array.isArray(payload)) {
      devices = payload;
    } else if (Array.isArray(payload?.devices)) {
      devices = payload.devices;
    }

    this.devices = devices.map((raw) => this.normalizeDevice(raw));
    this.emit();
  }

  private normalizeDevice(raw: any): DistechDevice {
    const deviceId = this.parseNumber(
      raw?.deviceId ?? raw?.device_id ?? raw?.id ?? Date.now()
    );

    return {
      deviceId,
      name: raw?.name || raw?.deviceName || raw?.objectName || `Device ${deviceId}`,
      isLocal: Boolean(raw?.isLocal ?? raw?.local ?? false),
      ipAddress: raw?.ip || raw?.address,
      lastHeartbeat: raw?.lastHeartbeat || raw?.lastSeen,
      objects: Array.isArray(raw?.objects)
        ? raw.objects.map((obj: any) => this.normalizeObject(obj))
        : [],
    };
  }

  private normalizeObject(raw: any): DistechObject {
    return {
      type: raw?.type || raw?.objectType || 'unknown',
      instance: this.parseNumber(
        raw?.instance ?? raw?.objectInstance ?? raw?.object_instance ?? 0
      ),
      objectName: raw?.objectName || raw?.name,
      description: raw?.description,
      presentValue:
        raw?.presentValue ?? raw?.present_value ?? raw?.value ?? raw?.state,
      units: raw?.units || raw?.unit,
      priority: raw?.priority,
      status: raw?.status,
    };
  }

  private emit() {
    const snapshot = [...this.devices];
    this.subscribers.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Distech subscriber failed:', error);
      }
    });
  }

  private parseNumber(value: any, fallback = 0): number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    const parsed = parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private getEcyCredentials() {
    const { ecyUrl, ecyUser, ecyPassword } = this.config;
    if (!ecyUrl || !ecyUser || !ecyPassword) {
      return undefined;
    }
    return {
      url: ecyUrl,
      username: ecyUser,
      password: ecyPassword,
    };
  }

  async getNodeDetails(nodeId: string): Promise<DriverNodeDetails | null> {
    const match = nodeId.match(/^distech_(\d+)_(\w+)_(\d+)/);
    if (!match) {
      return null;
    }
    const [, deviceIdStr, objectType, instanceStr] = match;
    const deviceId = parseInt(deviceIdStr, 10);
    const instance = parseInt(instanceStr, 10);

    let device = this.devices.find((d) => d.deviceId === deviceId);
    if (!device) {
      await this.refreshDevices();
      device = this.devices.find((d) => d.deviceId === deviceId);
      if (!device) return null;
    }

    let obj = device.objects.find(
      (o) =>
        o.type?.toLowerCase() === objectType.toLowerCase() &&
        Number(o.instance) === instance
    );

    if (!obj) {
      try {
        await this.loadObjects(deviceId, objectType, [instance]);
        device = this.devices.find((d) => d.deviceId === deviceId) ?? device;
        obj = device.objects.find(
          (o) =>
            o.type?.toLowerCase() === objectType.toLowerCase() &&
            Number(o.instance) === instance
        );
      } catch (error) {
        console.warn('Failed to load Distech object:', error);
      }
    }

    if (!obj) {
      return {
        driver: 'distech',
        id: nodeId,
        label: `${objectType} ${instance}`,
        device: { id: device.deviceId, label: device.name },
        objectType,
        properties: {
          'Device ID': device.deviceId,
          'Device Name': device.name,
          'Status': 'Objet non disponible',
        },
      };
    }

    return {
      driver: 'distech',
      id: nodeId,
      label: obj.objectName || `${objectType} ${instance}`,
      objectType: obj.type,
      presentValue: obj.presentValue,
      units: obj.units,
      status: obj.status,
      lastUpdated: new Date().toISOString(),
      device: { id: device.deviceId, label: device.name },
      properties: {
        'Device ID': device.deviceId,
        'Device Name': device.name,
        'Object Type': obj.type,
        'Instance': obj.instance,
        'Description': obj.description,
        'Units': obj.units,
        'Present Value': obj.presentValue,
        'Priority': obj.priority,
        'Status': obj.status,
        'Is Local': device.isLocal ? 'Oui' : 'Non',
        'IP': device.ipAddress,
        'Dernier Heartbeat': device.lastHeartbeat,
      },
    };
  }
}

export const distechDriver = new DistechDriver();
