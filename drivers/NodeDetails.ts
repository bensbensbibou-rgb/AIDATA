export type DriverKind = 'bacnet' | 'distech' | 'mqtt';

export interface DriverNodeDetails {
  driver: DriverKind;
  id: string;
  label: string;
  objectType?: string;
  presentValue?: any;
  units?: string;
  status?: string;
  device?: {
    id: string | number;
    label?: string;
  };
  locationPath?: string;
  lastUpdated?: string;
  properties: Record<string, string | number | boolean | null | undefined>;
}
