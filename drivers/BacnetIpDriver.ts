export interface BacnetIPScanConfig {
  scanUrl?: string;
  timeoutMs?: number;
}

export interface BacnetIPPoint {
  objectType: string;
  instance: number;
  name: string;
  presentValue?: number | string | null;
  units?: string;
}

export interface BacnetIPDevice {
  deviceId: number;
  address: string;
  description?: string;
  vendor?: string;
  lastSeen?: string;
  points: BacnetIPPoint[];
}

export interface BacnetIPScanParams {
  ipRange: string;
  port: number;
  objectTypes: string[];
  limitPerDevice?: number;
  interfaceIp?: string;
}

type ScanSubscriber = (devices: BacnetIPDevice[], busy: boolean) => void;

const DEFAULT_SCAN_CONFIG: BacnetIPScanConfig = {
  // Connexion directe au serveur BACnet (bypass proxy)
  scanUrl:
    (import.meta as any).env?.VITE_BACNET_IP_SCAN_URL ||
    (import.meta as any).env?.VITE_MCP_BACNET_URL ||
    'http://localhost:8100',
  timeoutMs: 15000,
};

class BacnetIPDriver {
  private config: BacnetIPScanConfig = { ...DEFAULT_SCAN_CONFIG };
  private devices: BacnetIPDevice[] = [];
  private subscribers = new Set<ScanSubscriber>();
  private scanning = false;

  configure(partial: Partial<BacnetIPScanConfig>) {
    this.config = { ...this.config, ...partial };
  }

  subscribe(callback: ScanSubscriber) {
    this.subscribers.add(callback);
    callback([...this.devices], this.scanning);
    return () => this.subscribers.delete(callback);
  }

  getDevices() {
    return this.devices;
  }

  isScanning() {
    return this.scanning;
  }

  async scan(params: BacnetIPScanParams) {
    this.scanning = true;
    this.emit();
    try {
      if (!this.config.scanUrl) {
        throw new Error('BACnet IP scanUrl not configured');
      }

      const results = await this.performRemoteScan(params);
      this.devices = results || [];
      this.emit();
      return results;
    } catch (error) {
      console.warn('BACnet IP scan failed:', error);
      this.devices = [];
      this.emit();
      throw error;
    } finally {
      this.scanning = false;
      this.emit();
    }
  }

  private async performRemoteScan(params: BacnetIPScanParams): Promise<BacnetIPDevice[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15000);
    try {
      const response = await fetch(`${this.config.scanUrl}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Scan failed (${response.status})`);
      }
      const payload = await response.json();
      if (Array.isArray(payload?.devices)) {
        return payload.devices.map((dev: any, index: number) => this.normalizeDevice(dev, index));
      }
      if (Array.isArray(payload)) {
        return payload.map((dev: any, index: number) => this.normalizeDevice(dev, index));
      }
      throw new Error('Unexpected scan payload');
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeDevice(raw: any, fallbackIndex: number): BacnetIPDevice {
    const points = Array.isArray(raw?.points)
      ? raw.points.map((pt: any, idx: number) => ({
        objectType: pt.objectType || pt.type || 'analogValue',
        instance:
          typeof pt.instance === 'number'
            ? pt.instance
            : parseInt(pt.instance ?? idx, 10) || idx,
        name: pt.name || `${pt.objectType || pt.type || 'Point'} ${pt.instance ?? idx}`,
        presentValue: pt.presentValue ?? pt.value ?? null,
        units: pt.units || pt.unit,
      }))
      : [];

    return {
      deviceId:
        typeof raw?.deviceId === 'number'
          ? raw.deviceId
          : parseInt(raw?.deviceId ?? fallbackIndex, 10) || 1000 + fallbackIndex,
      address: raw?.address || raw?.ip || raw?.host || '0.0.0.0',
      description: raw?.description,
      vendor: raw?.vendor,
      lastSeen: raw?.lastSeen ?? new Date().toISOString(),
      points,
    };
  }

  private emit() {
    const snapshot = [...this.devices];
    const flag = this.scanning;
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot, flag);
      } catch (error) {
        console.error('BacnetIP subscriber failed:', error);
      }
    });
  }
}

export const bacnetIPDriver = new BacnetIPDriver();
