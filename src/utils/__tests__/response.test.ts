import {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createInternalError,
} from '../response';

describe('Response Utils', () => {
  describe('createResponse', () => {
    it('should create a basic response with default headers', () => {
      const data = { message: 'Success' };
      const result = createResponse(200, data);

      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should create a response with custom headers', () => {
      const data = { message: 'Success' };
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Cache-Control': 'no-cache',
      };
      const result = createResponse(200, data, customHeaders);

      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'X-Custom-Header': 'custom-value',
          'Cache-Control': 'no-cache',
        },
      });
    });

    it('should handle complex data structures', () => {
      const data = {
        appointments: [
          { id: '1', status: 'pending' },
          { id: '2', status: 'confirmed' },
        ],
        total: 2,
        page: 1,
      };
      const result = createResponse(200, data);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(data);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response with default status code', () => {
      const data = { id: '123', name: 'Test' };
      const result = createSuccessResponse(data);

      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should create a success response with custom status code', () => {
      const data = { id: '123', name: 'Test' };
      const result = createSuccessResponse(data, 201);

      expect(result).toEqual({
        statusCode: 201,
        body: JSON.stringify({
          success: true,
          data,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should handle null and undefined data', () => {
      const result1 = createSuccessResponse(null);
      const result2 = createSuccessResponse(undefined);

      expect(JSON.parse(result1.body)).toEqual({
        success: true,
        data: null,
      });
      expect(JSON.parse(result2.body)).toEqual({
        success: true,
        data: undefined,
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with default status code', () => {
      const error = {
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        details: { field: 'test' },
      };
      const result = createErrorResponse(error);

      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should create an error response with custom status code', () => {
      const error = {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      };
      const result = createErrorResponse(error, 401);

      expect(result).toEqual({
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should handle error without code', () => {
      const error = {
        message: 'Simple error message',
      };
      const result = createErrorResponse(error);

      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Simple error message',
        },
      });
    });
  });

  describe('createValidationError', () => {
    it('should create a validation error response', () => {
      const message = 'Invalid input data';
      const details = { field: 'email', issue: 'Invalid format' };
      const result = createValidationError(message, details);

      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            message,
            code: 'VALIDATION_ERROR',
            details,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should create a validation error without details', () => {
      const message = 'Missing required fields';
      const result = createValidationError(message);

      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message,
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('createNotFoundError', () => {
    it('should create a not found error response', () => {
      const message = 'Appointment not found';
      const result = createNotFoundError(message);

      expect(result).toEqual({
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: {
            message,
            code: 'NOT_FOUND',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });
  });

  describe('createInternalError', () => {
    it('should create an internal error response with default message', () => {
      const result = createInternalError();

      expect(result).toEqual({
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });

    it('should create an internal error response with custom message', () => {
      const message = 'Database connection failed';
      const result = createInternalError(message);

      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message,
          code: 'INTERNAL_ERROR',
        },
      });
    });
  });

  describe('CORS Headers', () => {
    it('should always include CORS headers in all responses', () => {
      const successResult = createSuccessResponse({ data: 'test' });
      const errorResult = createErrorResponse({ message: 'error' });
      const validationResult = createValidationError('validation error');

      const expectedHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      };

      expect(successResult.headers).toEqual(expectedHeaders);
      expect(errorResult.headers).toEqual(expectedHeaders);
      expect(validationResult.headers).toEqual(expectedHeaders);
    });
  });

  describe('JSON Serialization', () => {
    it('should properly serialize complex objects', () => {
      const complexData = {
        appointment: {
          id: '123',
          patient: {
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              language: 'es',
              notifications: true,
            },
          },
          schedule: {
            date: '2023-12-01',
            time: '10:00',
            duration: 30,
          },
          metadata: {
            createdAt: new Date('2023-01-01').toISOString(),
            updatedAt: new Date('2023-01-02').toISOString(),
          },
        },
        array: [1, 2, 3, { nested: 'value' }],
        nullValue: null,
        undefinedValue: undefined,
      };

      const result = createSuccessResponse(complexData);
      const parsedBody = JSON.parse(result.body);

      expect(parsedBody.success).toBe(true);
      expect(parsedBody.data).toEqual(complexData);
    });

    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // JSON.stringify throws an error with circular references
      expect(() => {
        createSuccessResponse(circularObj);
      }).toThrow('Converting circular structure to JSON');
    });
  });
}); 