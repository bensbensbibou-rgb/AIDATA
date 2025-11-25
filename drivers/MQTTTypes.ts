export interface MQTTTopic {
  topic: string;
  qos?: number;
  lastMessage?: string;
  lastUpdated?: string;
}

export interface MQTTBroker {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  status: 'Connected' | 'Disconnected' | 'Unknown';
  topics: MQTTTopic[];
}

export interface MQTTMessage {
  broker: string;
  topic: string;
  message: string;
  timestamp: Date;
  direction: 'in' | 'out';
}
