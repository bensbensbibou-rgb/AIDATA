export interface MCPClientConfig {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface MCPRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class MCPHttpClient {
  constructor(private readonly getConfig: () => MCPClientConfig) {}

  async request<T = unknown>(path: string, options: MCPRequestOptions = {}): Promise<T> {
    const config = this.getConfig();
    if (!config?.url) {
      throw new Error('MCP server URL is not configured.');
    }

    const method = options.method ?? 'GET';
    const target = this.buildUrl(config.url, path);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers ?? {}),
    };

    const body =
      options.body instanceof FormData || typeof options.body === 'string'
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined;

    if (body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (config.apiKey && !headers.Authorization) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? config.timeoutMs ?? 15000
    );

    try {
      const response = await fetch(target, {
        method,
        headers,
        body,
        signal: options.signal ?? controller.signal,
      });

      if (!response.ok) {
        const errorText = await this.safeReadText(response);
        throw new Error(
          `MCP request failed (${response.status} ${response.statusText})${errorText ? `: ${errorText}` : ''
          }`
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await this.safeReadText(response);
      if (!text) {
        return undefined as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(base: string, path: string): string {
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}
