import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Hello handler called', event);

    const message = {
      message: 'Hello from Cita Médica Lambda!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters || {},
    };

    return createSuccessResponse(message);
  } catch (error) {
    console.error('Error in hello handler:', error);
    return createErrorResponse({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
}; 