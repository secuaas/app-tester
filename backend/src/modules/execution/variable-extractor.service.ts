import * as JSONPath from 'jsonpath';
import type { VariableExtractor, HttpResponse } from './execution.types';

export class VariableExtractorService {
  /**
   * Extract variables from response
   */
  extractVariables(
    extractors: VariableExtractor[],
    response: HttpResponse
  ): Record<string, any> {
    const variables: Record<string, any> = {};

    for (const extractor of extractors) {
      try {
        const value = this.extractVariable(extractor, response);
        if (value !== undefined) {
          variables[extractor.name] = value;
        }
      } catch (error) {
        // Log error but continue with other extractors
        console.error(`Failed to extract variable ${extractor.name}:`, error);
      }
    }

    return variables;
  }

  /**
   * Extract single variable
   */
  private extractVariable(
    extractor: VariableExtractor,
    response: HttpResponse
  ): any {
    switch (extractor.source) {
      case 'header':
        if (!extractor.path) {
          throw new Error('Header name is required');
        }
        return response.headers[extractor.path.toLowerCase()];

      case 'body':
        if (extractor.path) {
          return this.getNestedValue(response.body, extractor.path);
        }
        return response.body;

      case 'jsonPath':
        if (!extractor.path) {
          throw new Error('JSONPath expression is required');
        }
        const matches = JSONPath.query(response.body, extractor.path);
        return matches.length > 0 ? matches[0] : undefined;

      default:
        throw new Error(`Unknown extractor source: ${extractor.source}`);
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }
}

export const variableExtractorService = new VariableExtractorService();
