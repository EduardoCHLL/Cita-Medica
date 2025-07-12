import { ApiResponse, ApiError } from '../types';

export const createResponse = (
  statusCode: number,
  body: any,
  headers?: { [key: string]: string }
): ApiResponse => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { ...defaultHeaders, ...headers },
  };
};

export const createSuccessResponse = (data: any, statusCode = 200): ApiResponse => {
  return createResponse(statusCode, {
    success: true,
    data,
  });
};

export const createErrorResponse = (error: ApiError, statusCode = 400): ApiResponse => {
  return createResponse(statusCode, {
    success: false,
    error,
  });
};

export const createValidationError = (message: string, details?: any): ApiResponse => {
  return createErrorResponse(
    {
      message,
      code: 'VALIDATION_ERROR',
      details,
    },
    400
  );
};

export const createNotFoundError = (message: string): ApiResponse => {
  return createErrorResponse(
    {
      message,
      code: 'NOT_FOUND',
    },
    404
  );
};

export const createInternalError = (message = 'Internal server error'): ApiResponse => {
  return createErrorResponse(
    {
      message,
      code: 'INTERNAL_ERROR',
    },
    500
  );
}; 