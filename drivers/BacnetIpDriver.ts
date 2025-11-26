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
}

type ScanSubscriber = (devices: BacnetIPDevice[], busy: boolean) => void;

const DEFAULT_SCAN_CONFIG: BacnetIPScanConfig = {
  scanUrl: (import.meta as any).env?.VITE_BACNET_IP_SCAN_URL || '',
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
      let results: BacnetIPDevice[];
      if (this.config.scanUrl) {
        results = await this.performRemoteScan(params);
      } else {
        results = this.generateMockResults(params);
      }
      this.devices = results;
      this.emit();
      return results;
    } catch (error) {
      console.warn('BACnet IP scan failed:', error);
      this.devices = this.generateMockResults(params);
      this.emit();
      return this.devices;
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

  private generateMockResults(params: BacnetIPScanParams): BacnetIPDevice[] {
    const endpoints = params.ipRange.split('-');
    const baseIp = endpoints[0]?.trim() || '192.168.1.10';
    const mockPoints = params.objectTypes.map((type, index) => ({
      objectType: type,
      instance: index + 1,
      name: `${type} ${index + 1}`,
      presentValue: Math.round(Math.random() * 100) / 10,
      units: type.includes('temperature') ? '°C' : type.includes('binary') ? 'bool' : '',
    }));
    return [
      {
        deviceId: Math.floor(Math.random() * 1000) + 100,
        address: baseIp,
        description: 'Mock BACnet/IP device',
        vendor: 'Demo Vendor',
        lastSeen: new Date().toISOString(),
        points: mockPoints,
      },
    ];
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
