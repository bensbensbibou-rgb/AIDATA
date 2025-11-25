import { MCPHttpClient, MCPClientConfig } from './MCPClient';
import { MQTTBroker, MQTTMessage, MQTTTopic } from './MQTTTypes';

export interface MQTTDriverConfig extends MCPClientConfig {
  defaultHost?: string;
  defaultPort?: number;
  brokersEndpoint?: string;
  publishEndpoint?: string;
  receiveEndpoint?: string;
}

type BrokerSubscriber = (brokers: MQTTBroker[]) => void;

const DEFAULT_MQTT_CONFIG: MQTTDriverConfig = {
  url: (import.meta as any).env?.VITE_MCP_MQTT_URL || 'http://localhost:8002',
  apiKey: (import.meta as any).env?.VITE_MCP_MQTT_KEY || '',
  timeoutMs: 12000,
  defaultHost: (import.meta as any).env?.VITE_MQTT_DEFAULT_HOST || 'localhost',
  defaultPort: parseInt((import.meta as any).env?.VITE_MQTT_DEFAULT_PORT || '1883', 10),
  brokersEndpoint: '/brokers',
  publishEndpoint: '/brokers/{brokerId}/publish',
  receiveEndpoint: '/brokers/{brokerId}/receive',
};

class MQTTDriver {
  private config: MQTTDriverConfig = { ...DEFAULT_MQTT_CONFIG };
  private readonly http = new MCPHttpClient(() => this.config);
  private brokers: MQTTBroker[] = [];
  private subscribers = new Set<BrokerSubscriber>();
  private pollingHandle: ReturnType<typeof setInterval> | null = null;
  private connected = false;
  private history: MQTTMessage[] = [];

  configure(partial: Partial<MQTTDriverConfig>) {
    this.config = { ...this.config, ...partial };
  }

  isConnectedToMCP() {
    return this.connected;
  }

  getBrokers() {
    return this.brokers;
  }

  subscribe(callback: BrokerSubscriber) {
    this.subscribers.add(callback);
    callback([...this.brokers]);
    return () => this.subscribers.delete(callback);
  }

  async connect() {
    try {
      await this.ping();
      await this.refreshBrokers();
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

  startPolling(interval = 8000) {
    if (this.pollingHandle) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }

    if (interval <= 0) return;

    this.pollingHandle = setInterval(() => {
      if (!this.connected) return;
      this.refreshBrokers().catch((error) =>
        console.warn('MQTT polling failed:', error)
      );
    }, interval);
  }

  async addBroker(
    id: string,
    name: string,
    host: string,
    port: number,
    username?: string,
    password?: string
  ) {
    const endpoint = this.config.brokersEndpoint ?? DEFAULT_MQTT_CONFIG.brokersEndpoint!;
    await this.http.request(endpoint, {
      method: 'POST',
      body: { id, name, host, port, username, password },
    });
    await this.refreshBrokers();
  }

  async publish(brokerId: string, topic: string, message: string) {
    const template = this.config.publishEndpoint ?? DEFAULT_MQTT_CONFIG.publishEndpoint!;
    const path = template.replace('{brokerId}', encodeURIComponent(brokerId));
    await this.http.request(path, {
      method: 'POST',
      body: { topic, message },
    });
    this.pushHistory({
      broker: brokerId,
      topic,
      message,
      direction: 'out',
      timestamp: new Date(),
    });
  }

  async receive(brokerId: string, topic: string, timeoutSeconds = 30) {
    const template = this.config.receiveEndpoint ?? DEFAULT_MQTT_CONFIG.receiveEndpoint!;
    const path = template.replace('{brokerId}', encodeURIComponent(brokerId));
    const payload = await this.http.request<{ message?: string }>(path, {
      method: 'POST',
      body: { topic, timeout: timeoutSeconds },
      timeoutMs: (timeoutSeconds + 5) * 1000,
    });
    const message = payload?.message ?? '';

    if (message) {
      this.pushHistory({
        broker: brokerId,
        topic,
        message,
        direction: 'in',
        timestamp: new Date(),
      });
    }

    return message;
  }

  getMessageHistory(limit = 50) {
    if (limit <= 0) return [];
    return this.history.slice(-limit);
  }

  private async ping() {
    await this.http.request('/health', { method: 'GET' });
  }

  private async refreshBrokers() {
    const endpoint = this.config.brokersEndpoint ?? DEFAULT_MQTT_CONFIG.brokersEndpoint!;
    const payload = await this.http.request<any>(endpoint, { method: 'GET' });

    let brokers: any[] = [];
    if (Array.isArray(payload)) {
      brokers = payload;
    } else if (Array.isArray(payload?.brokers)) {
      brokers = payload.brokers;
    }

    this.brokers = brokers.map((raw) => this.normalizeBroker(raw));
    this.emit();
  }

  private normalizeBroker(raw: any): MQTTBroker {
    const topics: MQTTTopic[] = Array.isArray(raw?.topics)
      ? raw.topics.map((topic: any) => ({
          topic: topic.topic || topic.name || '',
          qos: topic.qos,
          lastMessage: topic.lastMessage || topic.last_message,
          lastUpdated: topic.lastUpdated || topic.last_updated,
        }))
      : [];

    return {
      id: raw?.id || raw?.brokerId || raw?.name || `broker_${Date.now()}`,
      name: raw?.name || raw?.label || 'MQTT Broker',
      host: raw?.host || raw?.address || this.config.defaultHost || 'localhost',
      port: Number(raw?.port ?? this.config.defaultPort ?? 1883),
      username: raw?.username,
      status:
        raw?.status === 'Connected' || raw?.connected
          ? 'Connected'
          : raw?.status === 'Disconnected'
            ? 'Disconnected'
            : 'Unknown',
      topics,
    };
  }

  private emit() {
    const snapshot = [...this.brokers];
    this.subscribers.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('MQTT subscriber failed:', error);
      }
    });
  }

  private pushHistory(entry: MQTTMessage) {
    this.history = [...this.history, entry].slice(-200);
  }
}

export const mqttDriver = new MQTTDriver();
