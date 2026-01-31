import * as JSONPath from 'jsonpath';
import type { Assertion, AssertionResult, HttpResponse } from './execution.types';

export class AssertionService {
  /**
   * Validate all assertions against response
   */
  validateAssertions(
    assertions: Assertion[],
    response: HttpResponse
  ): AssertionResult[] {
    return assertions.map((assertion) => this.validateAssertion(assertion, response));
  }

  /**
   * Validate single assertion
   */
  validateAssertion(assertion: Assertion, response: HttpResponse): AssertionResult {
    try {
      let actual: any;

      // Extract actual value based on assertion type
      switch (assertion.type) {
        case 'status':
          actual = response.status;
          break;

        case 'header':
          if (!assertion.field) {
            throw new Error('Header name is required');
          }
          actual = response.headers[assertion.field.toLowerCase()];
          break;

        case 'body':
          if (assertion.field) {
            actual = this.getNestedValue(response.body, assertion.field);
          } else {
            actual = response.body;
          }
          break;

        case 'jsonPath':
          if (!assertion.field) {
            throw new Error('JSONPath expression is required');
          }
          const matches = JSONPath.query(response.body, assertion.field);
          actual = matches.length > 0 ? matches[0] : undefined;
          break;

        case 'responseTime':
          actual = response.time;
          break;

        default:
          throw new Error(`Unknown assertion type: ${assertion.type}`);
      }

      // Validate based on operator
      const passed = this.evaluateOperator(
        assertion.operator,
        actual,
        assertion.value
      );

      return {
        type: assertion.type,
        field: assertion.field,
        operator: assertion.operator,
        expected: assertion.value,
        actual,
        passed,
        message: passed
          ? `✓ ${this.formatMessage(assertion, actual)}`
          : `✗ ${this.formatMessage(assertion, actual)}`,
      };
    } catch (error: any) {
      return {
        type: assertion.type,
        field: assertion.field,
        operator: assertion.operator,
        expected: assertion.value,
        actual: undefined,
        passed: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(
    operator: string,
    actual: any,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return this.deepEqual(actual, expected);

      case 'contains':
        if (typeof actual === 'string') {
          return actual.includes(String(expected));
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        if (typeof actual === 'object' && actual !== null) {
          return JSON.stringify(actual).includes(String(expected));
        }
        return false;

      case 'greaterThan':
        return Number(actual) > Number(expected);

      case 'lessThan':
        return Number(actual) < Number(expected);

      case 'exists':
        return actual !== undefined && actual !== null;

      case 'matches':
        if (typeof actual !== 'string') {
          return false;
        }
        const regex = new RegExp(expected);
        return regex.test(actual);

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Deep equality comparison
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a == null || b == null) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
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
      current = current[part];
    }

    return current;
  }

  /**
   * Format assertion message
   */
  private formatMessage(assertion: Assertion, actual: any): string {
    const field = assertion.field || assertion.type;
    const op = assertion.operator;
    const expected = JSON.stringify(assertion.value);
    const actualStr = JSON.stringify(actual);

    return `${field} ${op} ${expected} (actual: ${actualStr})`;
  }
}

export const assertionService = new AssertionService();
