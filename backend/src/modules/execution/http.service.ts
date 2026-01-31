import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { HttpRequest, HttpResponse } from './execution.types';

export class HttpService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000, // 30 seconds default
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 5,
    });
  }

  /**
   * Execute HTTP request
   */
  async executeRequest(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();

    try {
      const config: AxiosRequestConfig = {
        method: request.method.toLowerCase() as any,
        url: request.url,
        headers: request.headers,
        data: request.body,
        timeout: request.timeout || 30000,
      };

      const response = await this.client.request(config);

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
        body: response.data,
        time: duration,
      };
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Network errors, timeouts, etc.
      throw {
        status: 0,
        statusText: error.code || 'Network Error',
        headers: {},
        body: {
          error: error.message,
          code: error.code,
        },
        time: duration,
      };
    }
  }

  /**
   * Build full URL with base URL and endpoint
   */
  buildUrl(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from baseUrl
    const base = baseUrl.replace(/\/$/, '');
    // Add leading slash to endpoint if missing
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${base}${path}`;
  }

  /**
   * Merge headers from multiple sources
   */
  mergeHeaders(...headerSets: Record<string, string>[]): Record<string, string> {
    const merged: Record<string, string> = {};

    for (const headers of headerSets) {
      if (headers) {
        Object.assign(merged, headers);
      }
    }

    return merged;
  }

  /**
   * Apply credential to request headers
   */
  applyCredential(
    headers: Record<string, string>,
    credentialType: string,
    credentialData: any
  ): Record<string, string> {
    const result = { ...headers };

    switch (credentialType) {
      case 'API_KEY':
        const headerName = credentialData.headerName || 'X-API-Key';
        result[headerName] = credentialData.apiKey;
        break;

      case 'BASIC_AUTH':
        const credentials = Buffer.from(
          `${credentialData.username}:${credentialData.password}`
        ).toString('base64');
        result['Authorization'] = `Basic ${credentials}`;
        break;

      case 'BEARER_TOKEN':
        result['Authorization'] = `Bearer ${credentialData.token}`;
        break;

      case 'OAUTH2':
        if (credentialData.accessToken) {
          result['Authorization'] = `Bearer ${credentialData.accessToken}`;
        }
        break;

      case 'CUSTOM_HEADERS':
        Object.assign(result, credentialData.headers);
        break;
    }

    return result;
  }

  /**
   * Replace variables in string (e.g., {{variable}})
   */
  replaceVariables(
    value: any,
    variables: Record<string, any>
  ): any {
    if (typeof value === 'string') {
      let result = value;
      for (const [key, val] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(val));
      }
      return result;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.replaceVariables(item, variables));
    }

    if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.replaceVariables(val, variables);
      }
      return result;
    }

    return value;
  }

  /**
   * Normalize headers to lowercase keys
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        normalized[key.toLowerCase()] = value.join(', ');
      }
    }

    return normalized;
  }
}

export const httpService = new HttpService();
