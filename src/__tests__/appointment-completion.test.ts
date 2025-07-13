import { SQSEvent, SQSRecord, Context, Callback } from 'aws-lambda';
import { handler } from '../handlers/appointment-completion';
import { AppointmentService } from '../services/dynamodb';

// Mock del servicio de DynamoDB
jest.mock('../services/dynamodb');

const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>;

describe('AppointmentCompletion Lambda', () => {
  let mockUpdateAppointment: jest.MockedFunction<any>;
  let mockContext: Context;
  let mockCallback: Callback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAppointment = jest.fn();
    mockAppointmentService.prototype.updateAppointment = mockUpdateAppointment;
    
    mockContext = {
      callbackWaitsForEmptyEventLoop: true,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
    
    mockCallback = jest.fn();
  });

  it('should process appointment completion successfully', async () => {
    // Arrange
    const appointmentId = 'apt_1234567890_abc123';
    const countryISO = 'PE';
    
    const mockAppointment = {
      id: appointmentId,
      status: 'completed',
      completedAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z'
    };

    mockUpdateAppointment.mockResolvedValue(mockAppointment);

    const eventBridgeEvent = {
      source: 'cita-medica.peru',
      'detail-type': 'AppointmentConfirmed',
      detail: {
        appointmentId: appointmentId,
        countryISO: countryISO,
        status: 'confirmed',
        confirmedAt: '2024-01-15T10:30:00.000Z',
        appointmentData: {
          id: appointmentId,
          patientName: 'Juan Pérez',
          doctorName: 'Dr. García'
        }
      }
    };

    const sqsEvent: SQSEvent = {
      Records: [
        {
          messageId: 'test-message-id',
          receiptHandle: 'test-receipt-handle',
          body: JSON.stringify(eventBridgeEvent),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Act
    await handler(sqsEvent, mockContext, mockCallback);

    // Assert
    expect(mockUpdateAppointment).toHaveBeenCalledWith(
      appointmentId,
      expect.objectContaining({
        status: 'completed',
        completedAt: expect.any(String),
        countryISO: countryISO
      })
    );
  });

  it('should handle EventBridge event with string detail', async () => {
    // Arrange
    const appointmentId = 'apt_1234567890_abc123';
    const countryISO = 'CL';
    
    const mockAppointment = {
      id: appointmentId,
      status: 'completed',
      completedAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z'
    };

    mockUpdateAppointment.mockResolvedValue(mockAppointment);

    const eventBridgeEvent = {
      source: 'cita-medica.chile',
      'detail-type': 'AppointmentConfirmed',
      detail: JSON.stringify({
        appointmentId: appointmentId,
        countryISO: countryISO,
        status: 'confirmed',
        confirmedAt: '2024-01-15T10:30:00.000Z',
        appointmentData: {
          id: appointmentId,
          patientName: 'María González',
          doctorName: 'Dr. Silva'
        }
      })
    };

    const sqsEvent: SQSEvent = {
      Records: [
        {
          messageId: 'test-message-id',
          receiptHandle: 'test-receipt-handle',
          body: JSON.stringify(eventBridgeEvent),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Act
    await handler(sqsEvent, mockContext, mockCallback);

    // Assert
    expect(mockUpdateAppointment).toHaveBeenCalledWith(
      appointmentId,
      expect.objectContaining({
        status: 'completed',
        completedAt: expect.any(String),
        countryISO: countryISO
      })
    );
  });

  it('should throw error when appointmentId is missing', async () => {
    // Arrange
    const eventBridgeEvent = {
      source: 'cita-medica.peru',
      'detail-type': 'AppointmentConfirmed',
      detail: {
        countryISO: 'PE',
        status: 'confirmed',
        confirmedAt: '2024-01-15T10:30:00.000Z'
      }
    };

    const sqsEvent: SQSEvent = {
      Records: [
        {
          messageId: 'test-message-id',
          receiptHandle: 'test-receipt-handle',
          body: JSON.stringify(eventBridgeEvent),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Act & Assert
    await expect(handler(sqsEvent, mockContext, mockCallback)).rejects.toThrow('appointmentId is required in the message');
  });

  it('should throw error when appointment not found', async () => {
    // Arrange
    const appointmentId = 'apt_nonexistent';
    const countryISO = 'PE';
    
    mockUpdateAppointment.mockResolvedValue(null);

    const eventBridgeEvent = {
      source: 'cita-medica.peru',
      'detail-type': 'AppointmentConfirmed',
      detail: {
        appointmentId: appointmentId,
        countryISO: countryISO,
        status: 'confirmed',
        confirmedAt: '2024-01-15T10:30:00.000Z'
      }
    };

    const sqsEvent: SQSEvent = {
      Records: [
        {
          messageId: 'test-message-id',
          receiptHandle: 'test-receipt-handle',
          body: JSON.stringify(eventBridgeEvent),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Act & Assert
    await expect(handler(sqsEvent, mockContext, mockCallback)).rejects.toThrow(`Appointment with id ${appointmentId} not found`);
  });

  it('should handle multiple records in batch', async () => {
    // Arrange
    const appointmentId1 = 'apt_1234567890_abc123';
    const appointmentId2 = 'apt_1234567890_def456';
    
    const mockAppointment1 = {
      id: appointmentId1,
      status: 'completed',
      completedAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z'
    };

    const mockAppointment2 = {
      id: appointmentId2,
      status: 'completed',
      completedAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z'
    };

    mockUpdateAppointment
      .mockResolvedValueOnce(mockAppointment1)
      .mockResolvedValueOnce(mockAppointment2);

    const sqsEvent: SQSEvent = {
      Records: [
        {
          messageId: 'test-message-id-1',
          receiptHandle: 'test-receipt-handle-1',
          body: JSON.stringify({
            source: 'cita-medica.peru',
            'detail-type': 'AppointmentConfirmed',
            detail: {
              appointmentId: appointmentId1,
              countryISO: 'PE',
              status: 'confirmed'
            }
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        },
        {
          messageId: 'test-message-id-2',
          receiptHandle: 'test-receipt-handle-2',
          body: JSON.stringify({
            source: 'cita-medica.chile',
            'detail-type': 'AppointmentConfirmed',
            detail: {
              appointmentId: appointmentId2,
              countryISO: 'CL',
              status: 'confirmed'
            }
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'test-sender',
            ApproximateFirstReceiveTimestamp: '1234567890'
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Act
    await handler(sqsEvent, mockContext, mockCallback);

    // Assert
    expect(mockUpdateAppointment).toHaveBeenCalledTimes(2);
    expect(mockUpdateAppointment).toHaveBeenNthCalledWith(
      1,
      appointmentId1,
      expect.objectContaining({
        status: 'completed',
        countryISO: 'PE'
      })
    );
    expect(mockUpdateAppointment).toHaveBeenNthCalledWith(
      2,
      appointmentId2,
      expect.objectContaining({
        status: 'completed',
        countryISO: 'CL'
      })
    );
  });
}); 