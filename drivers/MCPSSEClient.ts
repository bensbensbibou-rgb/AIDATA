/**
 * MCP SSE Client for connecting to MCP servers via Server-Sent Events
 */

export interface MCPSSEClientConfig {
    url: string;
    apiKey?: string;
    timeoutMs?: number;
}

export interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}

export interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export class MCPSSEClient {
    private eventSource: EventSource | null = null;
    private pendingRequests = new Map<string | number, {
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
    }>();
    private requestId = 0;

    constructor(private readonly getConfig: () => MCPSSEClientConfig) { }

    async connect(): Promise<void> {
        const config = this.getConfig();
        if (!config?.url) {
            throw new Error('MCP server URL is not configured.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.eventSource = new EventSource(config.url);

                this.eventSource.onopen = () => {
                    console.log('MCP SSE connection established');
                    resolve();
                };

                this.eventSource.onerror = (error) => {
                    console.error('MCP SSE connection error:', error);
                    reject(new Error('Failed to connect to MCP server'));
                };

                this.eventSource.onmessage = (event) => {
                    try {
                        const response: MCPResponse = JSON.parse(event.data);
                        this.handleResponse(response);
                    } catch (err) {
                        console.error('Failed to parse MCP response:', err);
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
        const config = this.getConfig();
        const id = ++this.requestId;

        const mcpRequest: MCPRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`MCP request timeout: ${method}`));
            }, config.timeoutMs ?? 15000);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            // Send request via POST
            this.sendRequest(mcpRequest).catch((err) => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            });
        });
    }

    private async sendRequest(request: MCPRequest): Promise<void> {
        const config = this.getConfig();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(config.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
        }
    }

    private handleResponse(response: MCPResponse): void {
        const pending = this.pendingRequests.get(response.id);
        if (!pending) {
            console.warn('Received response for unknown request ID:', response.id);
            return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);

        if (response.error) {
            pending.reject(new Error(`MCP error: ${response.error.message}`));
        } else {
            pending.resolve(response.result);
        }
    }

    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('MCP connection closed'));
        }
        this.pendingRequests.clear();
    }

    isConnected(): boolean {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }
}
