// @ts-nocheck
import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { processPeruAppointment } from '../appointment-pe';
import { EventBridge } from 'aws-sdk';

// Mock dependencies
jest.mock('aws-sdk');

const mockEventBridge = EventBridge as jest.MockedClass<typeof EventBridge>;

describe('Peru Appointment Handler', () => {
  let mockContext: Context;
  let mockEventBridgeInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      awsRequestId: 'test-request-id',
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'test-arn',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      memoryLimitInMB: '128',
      getRemainingTimeInMillis: () => 1000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    mockEventBridgeInstance = {
      putEvents: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Entries: [{ EventId: 'test-event-id' }]
        })
      })
    };
    mockEventBridge.mockImplementation(() => mockEventBridgeInstance);

    // Set environment variables
    process.env.EVENT_BUS_NAME = 'test-event-bus';
  });

  afterEach(() => {
    delete process.env.EVENT_BUS_NAME;
  });

  describe('SQS Processing', () => {
    it('should process Peru appointment successfully', async () => {
      const mockAppointmentData = {
        id: 'test-id',
        insuredId: 'insured-123',
        countryISO: 'PE',
        patientName: 'Juan Pérez',
        status: 'pending',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          MessageAttributes: {
            countryISO: {
              Value: 'PE',
            },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);

      expect(mockEventBridgeInstance.putEvents).toHaveBeenCalledWith({
        Entries: [
          expect.objectContaining({
            Source: 'cita-medica.peru',
            DetailType: 'AppointmentConfirmed',
            Detail: expect.stringContaining('"appointmentId":"test-id"'),
            EventBusName: 'test-event-bus',
          }),
        ],
      });
    });

    it('should handle wrong countryISO gracefully', async () => {
      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify({ id: 'test-id', countryISO: 'CL' }),
          MessageAttributes: {
            countryISO: {
              Value: 'CL', // Wrong country for Peru queue
            },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);

      // Should not call EventBridge for wrong country
      expect(mockEventBridgeInstance.putEvents).not.toHaveBeenCalled();
    });

    it('should handle missing MessageAttributes gracefully', async () => {
      const mockAppointmentData = {
        id: 'test-id',
        countryISO: 'PE',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          // Missing MessageAttributes
        }),
        attributes: {},
        messageAttributes: {
          countryISO: {
            dataType: 'String',
            stringValue: 'PE',
          },
        },
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);

      // Should still process the message
      expect(mockEventBridgeInstance.putEvents).toHaveBeenCalled();
    });

    it('should handle EventBridge errors', async () => {
      mockEventBridgeInstance.putEvents = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('EventBridge error'))
      });

      const mockAppointmentData = {
        id: 'test-id',
        countryISO: 'PE',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          MessageAttributes: {
            countryISO: {
              Value: 'PE',
            },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await expect(processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance)).rejects.toThrow('EventBridge error');
    });

    it('should process multiple records in batch', async () => {
      const mockAppointmentData1 = { id: 'test-id-1', countryISO: 'PE' };
      const mockAppointmentData2 = { id: 'test-id-2', countryISO: 'PE' };

      const sqsRecord1: SQSRecord = {
        messageId: 'test-message-id-1',
        receiptHandle: 'test-receipt-handle-1',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData1),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5-1',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      const sqsRecord2: SQSRecord = {
        messageId: 'test-message-id-2',
        receiptHandle: 'test-receipt-handle-2',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData2),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5-2',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord1, undefined, mockEventBridgeInstance);
      await processPeruAppointment(sqsRecord2, undefined, mockEventBridgeInstance);

      expect(mockEventBridgeInstance.putEvents).toHaveBeenCalledTimes(2);
    });

    it('should handle processing errors and re-throw them', async () => {
      // Mock a processing error by making putEvents fail
      mockEventBridgeInstance.putEvents = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Processing failed'))
      });

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify({ id: 'test-id', countryISO: 'PE' }),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await expect(processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance)).rejects.toThrow('Processing failed');
    });
  });

  describe('Peru-specific Logic', () => {
    it('should apply Peru-specific business logic', async () => {
      const mockAppointmentData = {
        id: 'test-id',
        countryISO: 'PE',
        patientName: 'Juan Pérez',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      const startTime = Date.now();
      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);
      const endTime = Date.now();

      // Should have some processing time (simulated delay in processPeruSpecificLogic)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('EventBridge Integration', () => {
    it('should send correct event format to EventBridge', async () => {
      const mockAppointmentData = {
        id: 'test-id',
        insuredId: 'insured-123',
        countryISO: 'PE',
        patientName: 'Juan Pérez',
        status: 'pending',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);

      expect(mockEventBridgeInstance.putEvents).toHaveBeenCalledWith({
        Entries: [
          {
            Source: 'cita-medica.peru',
            DetailType: 'AppointmentConfirmed',
            Detail: expect.stringContaining('"appointmentId":"test-id"'),
            EventBusName: 'test-event-bus',
          },
        ],
      });
    });

    it('should use default event bus when EVENT_BUS_NAME is not set', async () => {
      delete process.env.EVENT_BUS_NAME;

      const mockAppointmentData = {
        id: 'test-id',
        countryISO: 'PE',
      };

      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          Message: JSON.stringify(mockAppointmentData),
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance);

      expect(mockEventBridgeInstance.putEvents).toHaveBeenCalledWith({
        Entries: [
          expect.objectContaining({
            EventBusName: 'default',
          }),
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: 'invalid-json',
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await expect(processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance)).rejects.toThrow();
    });

    it('should handle missing Message in SNS format', async () => {
      const sqsRecord: SQSRecord = {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify({
          // Missing Message field
          MessageAttributes: {
            countryISO: { Value: 'PE' },
          },
        }),
        attributes: {},
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:peru-queue',
        awsRegion: 'us-east-1',
      } as SQSRecord;

      await expect(processPeruAppointment(sqsRecord, undefined, mockEventBridgeInstance)).rejects.toThrow();
    });
  });
}); 