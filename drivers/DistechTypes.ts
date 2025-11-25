export interface DistechObject {
  type: string;
  instance: number;
  objectName?: string;
  description?: string;
  presentValue?: number | string | null;
  units?: string;
  priority?: number;
  status?: string;
}

export interface DistechDevice {
  deviceId: number;
  name: string;
  isLocal: boolean;
  ipAddress?: string;
  lastHeartbeat?: string;
  objects: DistechObject[];
}

export interface DistechEventNotification {
  deviceId: number;
  objectType: string;
  objectInstance: number;
  description?: string;
  acknowledged?: boolean;
  timestamp?: string;
}
