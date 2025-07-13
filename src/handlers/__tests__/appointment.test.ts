import { APIGatewayProxyEvent, Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { createAppointment, getAppointment, getAllAppointmentsbyinsuredId, processAppointmentCompletion } from '../appointment';
import { AppointmentService } from '../../services/dynamodb';
import { SNS } from 'aws-sdk';

// Mock dependencies
jest.mock('../../services/dynamodb');
jest.mock('aws-sdk');

const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>;
const mockSNS = SNS as jest.MockedClass<typeof SNS>;

describe('Appointment Handler', () => {
  let mockContext: Context;
  let mockSNSInstance: any;
  let mockAppointmentServiceInstance: any;

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

    mockSNSInstance = {
      publish: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' })
      })
    };
    (SNS as jest.MockedClass<typeof SNS>).mockImplementation(() => mockSNSInstance);

    mockAppointmentServiceInstance = {
      createAppointment: jest.fn(),
      getAppointment: jest.fn(),
      getAllAppointmentsbyinsuredId: jest.fn(),
      updateAppointment: jest.fn(),
      deleteAppointment: jest.fn(),
    };
    mockAppointmentService.mockImplementation(() => mockAppointmentServiceInstance);

    // Set environment variables
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
    process.env.APPOINTMENTS_TABLE = 'test-appointments-table';
  });

  afterEach(() => {
    delete process.env.SNS_TOPIC_ARN;
    delete process.env.APPOINTMENTS_TABLE;
  });

  describe('HTTP API Gateway Events', () => {
    describe('POST /appointments', () => {
      it('should create an appointment successfully', async () => {
        const mockAppointment = {
          id: 'test-id',
          requestId: 'test-request-id',
          insuredId: 'insured-123',
          scheduleId: 1,
          countryISO: 'PE',
          patientName: 'John Doe',
          patientEmail: 'john@example.com',
          status: 'pending',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        mockAppointmentServiceInstance.createAppointment.mockResolvedValue(mockAppointment);

        const event: APIGatewayProxyEvent = {
          httpMethod: 'POST',
          path: '/appointments',
          body: JSON.stringify({
            insuredId: 'insured-123',
            scheduleId: 1,
            countryISO: 'PE',
            patientName: 'John Doe',
            patientEmail: 'john@example.com',
          }),
        } as any;

        const result = await createAppointment(event, mockAppointmentServiceInstance, mockSNSInstance);

        expect(result.statusCode).toBe(201);
        expect(JSON.parse(result.body)).toEqual({
          success: true,
          data: mockAppointment,
        });
        expect(mockAppointmentServiceInstance.createAppointment).toHaveBeenCalledWith(
          expect.objectContaining({
            insuredId: 'insured-123',
            scheduleId: 1,
            countryISO: 'PE',
            patientName: 'John Doe',
            patientEmail: 'john@example.com',
          })
        );
        expect(mockSNSInstance.publish).toHaveBeenCalled();
      });

      it('should return validation error for missing required fields', async () => {
        const event: APIGatewayProxyEvent = {
          httpMethod: 'POST',
          path: '/appointments',
          body: JSON.stringify({
            insuredId: 'insured-123',
            // Missing scheduleId and countryISO
          }),
        } as any;

        const result = await createAppointment(event, mockAppointmentServiceInstance, mockSNSInstance);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toEqual({
          success: false,
          error: {
            message: 'Missing required fields: scheduleId, countryISO',
            code: 'VALIDATION_ERROR',
          },
        });
      });

      it('should handle service errors gracefully', async () => {
        mockAppointmentServiceInstance.createAppointment.mockRejectedValue(
          new Error('Database error')
        );

        const event: APIGatewayProxyEvent = {
          httpMethod: 'POST',
          path: '/appointments',
          body: JSON.stringify({
            insuredId: 'insured-123',
            scheduleId: 1,
            countryISO: 'PE',
          }),
        } as any;

        const result = await createAppointment(event, mockAppointmentServiceInstance, mockSNSInstance);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({
          success: false,
          error: {
            message: 'Failed to create appointment',
            code: 'CREATE_ERROR',
          },
        });
      });
    });

    describe('GET /appointments/{id}', () => {
      it('should get an appointment by ID successfully', async () => {
        const mockAppointment = {
          id: 'test-id',
          insuredId: 'insured-123',
          scheduleId: 1,
          countryISO: 'PE',
          status: 'pending',
        };

        mockAppointmentServiceInstance.getAppointment.mockResolvedValue(mockAppointment);

        const result = await getAppointment('test-id', mockAppointmentServiceInstance);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
          success: true,
          data: mockAppointment,
        });
        expect(mockAppointmentServiceInstance.getAppointment).toHaveBeenCalledWith('test-id');
      });

      it('should return 404 when appointment not found', async () => {
        mockAppointmentServiceInstance.getAppointment.mockResolvedValue(null);

        const result = await getAppointment('non-existent-id', mockAppointmentServiceInstance);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({
          success: false,
          error: {
            message: 'Appointment with id non-existent-id not found',
            code: 'NOT_FOUND',
          },
        });
      });
    });

    describe('GET /appointments-by-client/{id}', () => {
      it('should get all appointments by insured ID successfully', async () => {
        const mockAppointments = [
          { id: 'app-1', insuredId: 'insured-123', status: 'pending' },
          { id: 'app-2', insuredId: 'insured-123', status: 'confirmed' },
        ];

        mockAppointmentServiceInstance.getAllAppointmentsbyinsuredId.mockResolvedValue(mockAppointments);

        const result = await getAllAppointmentsbyinsuredId('insured-123', mockAppointmentServiceInstance);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
          success: true,
          data: mockAppointments,
        });
        expect(mockAppointmentServiceInstance.getAllAppointmentsbyinsuredId).toHaveBeenCalledWith('insured-123');
      });

      it('should handle service errors for get appointments by insured ID', async () => {
        mockAppointmentServiceInstance.getAllAppointmentsbyinsuredId.mockRejectedValue(
          new Error('Database error')
        );

        const result = await getAllAppointmentsbyinsuredId('insured-123', mockAppointmentServiceInstance);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({
          success: false,
          error: {
            message: 'Failed to get appointments',
            code: 'GET_ERROR',
          },
        });
      });
    });
  });

  describe('SQS Events', () => {
    it('should process appointment completion from SQS successfully', async () => {
      const mockUpdatedAppointment = {
        id: 'test-id',
        status: 'completed',
        completedAt: '2023-01-01T00:00:00.000Z',
        countryISO: 'PE',
      };

      mockAppointmentServiceInstance.updateAppointment.mockResolvedValue(mockUpdatedAppointment);

      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              detail: {
                appointmentId: 'test-id',
                countryISO: 'PE',
                appointmentData: { id: 'test-id' },
              },
            }),
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      await processAppointmentCompletion(sqsEvent.Records[0], mockAppointmentServiceInstance);

      expect(mockAppointmentServiceInstance.updateAppointment).toHaveBeenCalledWith('test-id', {
        status: 'completed',
        completedAt: expect.any(String),
        countryISO: 'PE',
      });
    });

    it('should handle SQS processing errors', async () => {
      mockAppointmentServiceInstance.updateAppointment.mockRejectedValue(
        new Error('Update failed')
      );

      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              detail: {
                appointmentId: 'test-id',
                countryISO: 'PE',
              },
            }),
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      await expect(processAppointmentCompletion(sqsEvent.Records[0], mockAppointmentServiceInstance)).rejects.toThrow('Update failed');
    });

    it('should handle missing appointmentId in SQS message', async () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              detail: {
                // Missing appointmentId
                countryISO: 'PE',
              },
            }),
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      await expect(processAppointmentCompletion(sqsEvent.Records[0], mockAppointmentServiceInstance)).rejects.toThrow('appointmentId is required in the message');
    });

    it('should handle appointment not found during SQS processing', async () => {
      mockAppointmentServiceInstance.updateAppointment.mockResolvedValue(null);

      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              detail: {
                appointmentId: 'non-existent-id',
                countryISO: 'PE',
              },
            }),
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      await expect(processAppointmentCompletion(sqsEvent.Records[0], mockAppointmentServiceInstance)).rejects.toThrow('Appointment with id non-existent-id not found');
    });
  });

  describe('SNS Publishing', () => {
    it('should publish to SNS when SNS_TOPIC_ARN is configured', async () => {
      const mockAppointment = {
        id: 'test-id',
        countryISO: 'PE',
        status: 'pending',
      };

      mockAppointmentServiceInstance.createAppointment.mockResolvedValue(mockAppointment);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/appointments',
        body: JSON.stringify({
          insuredId: 'insured-123',
          scheduleId: 1,
          countryISO: 'PE',
        }),
      } as any;

      await createAppointment(event, mockAppointmentServiceInstance, mockSNSInstance);

      expect(mockSNSInstance.publish).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        Message: JSON.stringify(mockAppointment),
        MessageAttributes: {
          countryISO: {
            DataType: 'String',
            StringValue: 'PE',
          },
          appointmentId: {
            DataType: 'String',
            StringValue: 'test-id',
          },
          status: {
            DataType: 'String',
            StringValue: 'pending',
          },
        },
        Subject: 'Nueva cita médica - PE',
      });
    });

    it('should handle SNS publishing errors gracefully', async () => {
      mockSNSInstance.publish = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('SNS error'))
      });

      const mockAppointment = {
        id: 'test-id',
        countryISO: 'PE',
        status: 'pending',
      };

      mockAppointmentServiceInstance.createAppointment.mockResolvedValue(mockAppointment);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/appointments',
        body: JSON.stringify({
          insuredId: 'insured-123',
          scheduleId: 1,
          countryISO: 'PE',
        }),
      } as any;

      // Should not throw error, appointment creation should still succeed
      const result = await createAppointment(event, mockAppointmentServiceInstance, mockSNSInstance);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAppointment,
      });
    });
  });
}); 