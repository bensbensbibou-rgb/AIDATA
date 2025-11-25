import { MCPHttpClient, MCPClientConfig } from './MCPClient';

export interface BACnetDriverConfig extends MCPClientConfig {
  deviceEndpoint?: string;
  objectEndpoint?: string;
}

export interface BACnetObject {
  id: string;
  name: string;
  type: string;
  presentValue?: number | string | null;
  units?: string;
  description?: string;
  statusFlags?: string[];
}

export interface BACnetDevice {
  deviceId: number;
  name: string;
  vendor?: string;
  address?: string;
  lastSeen?: string;
  objects: BACnetObject[];
}

type DeviceSubscriber = (devices: BACnetDevice[]) => void;

const DEFAULT_BACNET_CONFIG: BACnetDriverConfig = {
  url: (import.meta as any).env?.VITE_MCP_BACNET_URL || 'http://localhost:8000',
  apiKey: (import.meta as any).env?.VITE_MCP_BACNET_KEY || '',
  timeoutMs: 12000,
  deviceEndpoint: '/devices',
  objectEndpoint: '/devices/{deviceId}/objects',
};

class BACnetDriver {
  private config: BACnetDriverConfig = { ...DEFAULT_BACNET_CONFIG };
  private readonly http = new MCPHttpClient(() => this.config);
  private devices: BACnetDevice[] = [];
  private subscribers = new Set<DeviceSubscriber>();
  private pollingHandle: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  configure(partial: Partial<BACnetDriverConfig>) {
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

  startPolling(interval = 10000) {
    if (this.pollingHandle) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }

    if (interval <= 0) {
      return;
    }

    this.pollingHandle = setInterval(() => {
      if (!this.connected) return;
      this.refreshDevices().catch((error) =>
        console.warn('BACnet polling failed:', error)
      );
    }, interval);
  }

  async getObjectList(deviceId: number) {
    if (!deviceId && deviceId !== 0) {
      throw new Error('Device ID is required to load objects.');
    }

    const endpointTemplate = this.config.objectEndpoint ?? DEFAULT_BACNET_CONFIG.objectEndpoint!;
    const path = endpointTemplate.replace('{deviceId}', String(deviceId));
    const payload = await this.http.request<any>(path, { method: 'GET' });

    const objects: BACnetObject[] = Array.isArray(payload?.objects)
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

  private async ping() {
    await this.http.request('/health', { method: 'GET' });
  }

  private async refreshDevices() {
    const endpoint = this.config.deviceEndpoint ?? DEFAULT_BACNET_CONFIG.deviceEndpoint!;
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

  private normalizeDevice(raw: any): BACnetDevice {
    const deviceId =
      typeof raw?.deviceId === 'number'
        ? raw.deviceId
        : typeof raw?.device_instance === 'number'
          ? raw.device_instance
          : parseInt(raw?.deviceId ?? raw?.device_instance ?? raw?.id ?? '0', 10) || Date.now();

    const name =
      raw?.name ||
      raw?.deviceName ||
      raw?.objectName ||
      `Device ${deviceId}`;

    const objects = Array.isArray(raw?.objects)
      ? raw.objects.map((obj: any) => this.normalizeObject(obj))
      : [];

    return {
      deviceId,
      name,
      vendor: raw?.vendor || raw?.vendorName,
      address: raw?.address || raw?.ip || raw?.mac,
      lastSeen: raw?.lastSeen || raw?.last_seen,
      objects,
    };
  }

  private normalizeObject(raw: any): BACnetObject {
    const type = raw?.type || raw?.objectType || raw?.object_type || 'unknown';
    const instance = raw?.instance ?? raw?.objectInstance ?? raw?.object_instance;
    const id = raw?.id || (instance !== undefined ? `${type}:${instance}` : String(Date.now()));

    return {
      id,
      name: raw?.name || raw?.objectName || raw?.object_name || id,
      type,
      presentValue:
        raw?.presentValue ?? raw?.present_value ?? raw?.value ?? raw?.state ?? null,
      units: raw?.units || raw?.unit || raw?.engineeringUnits,
      description: raw?.description,
      statusFlags: raw?.statusFlags || raw?.status_flags,
    };
  }

  private emit() {
    const snapshot = [...this.devices];
    this.subscribers.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('BACnet subscriber failed:', error);
      }
    });
  }
}

export const bacnetDriver = new BACnetDriver();
