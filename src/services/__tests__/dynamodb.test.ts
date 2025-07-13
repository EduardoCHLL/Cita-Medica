import { AppointmentService } from '../dynamodb';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../../types';

// Create a mock DynamoDB client
const mockDynamoDB = {
  put: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  get: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  scan: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  update: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  delete: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
};

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APPOINTMENTS_TABLE = 'test-appointments-table';
    appointmentService = new AppointmentService(mockDynamoDB as any);
  });

  afterEach(() => {
    delete process.env.APPOINTMENTS_TABLE;
  });

  describe('createAppointment', () => {
    it('should create an appointment successfully', async () => {
      const appointmentData: CreateAppointmentRequest = {
        requestId: 'test-request-id',
        insuredId: 'insured-123',
        scheduleId: 1,
        countryISO: 'PE',
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        doctorName: 'Dr. Smith',
        specialty: 'Cardiology',
        date: '2023-12-01',
        time: '10:00',
        notes: 'Regular checkup',
      };

      const result = await appointmentService.createAppointment(appointmentData);

      expect(result).toMatchObject({
        ...appointmentData,
        status: 'pending',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        ttl: expect.any(Number),
      });
      expect(result.id).toBeDefined();
      expect(mockDynamoDB.put).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Item: expect.objectContaining({
          ...appointmentData,
          status: 'pending',
        }),
      });
    });

    it('should use default table name when APPOINTMENTS_TABLE is not set', async () => {
      delete process.env.APPOINTMENTS_TABLE;
      appointmentService = new AppointmentService(mockDynamoDB as any);

      const appointmentData: CreateAppointmentRequest = {
        requestId: 'test-request-id',
        insuredId: 'insured-123',
        scheduleId: 1,
        countryISO: 'PE',
      };

      await appointmentService.createAppointment(appointmentData);

      expect(mockDynamoDB.put).toHaveBeenCalledWith({
        TableName: 'Appointment-Test-1',
        Item: expect.any(Object),
      });
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoDB.put = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      const appointmentData: CreateAppointmentRequest = {
        requestId: 'test-request-id',
        insuredId: 'insured-123',
        scheduleId: 1,
        countryISO: 'PE',
      };

      await expect(appointmentService.createAppointment(appointmentData)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getAppointment', () => {
    it('should get an appointment by ID successfully', async () => {
      const mockAppointment = {
        id: 'test-id',
        insuredId: 'insured-123',
        scheduleId: 1,
        countryISO: 'PE',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockDynamoDB.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: mockAppointment })
      });

      const result = await appointmentService.getAppointment('test-id');

      expect(result).toEqual(mockAppointment);
      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Key: { id: 'test-id' },
      });
    });

    it('should return null when appointment not found', async () => {
      mockDynamoDB.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null })
      });

      const result = await appointmentService.getAppointment('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoDB.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      await expect(appointmentService.getAppointment('test-id')).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getAllAppointmentsbyinsuredId', () => {
    it('should get all appointments by insured ID successfully', async () => {
      const mockAppointments = [
        { id: 'app-1', insuredId: 'insured-123', status: 'pending' },
        { id: 'app-2', insuredId: 'insured-123', status: 'confirmed' },
      ];

      mockDynamoDB.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: mockAppointments })
      });

      const result = await appointmentService.getAllAppointmentsbyinsuredId('insured-123');

      expect(result).toEqual(mockAppointments);
      expect(mockDynamoDB.scan).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        FilterExpression: 'insuredId = :insuredId',
        ExpressionAttributeValues: {
          ':insuredId': 'insured-123'
        }
      });
    });

    it('should return empty array when no appointments found', async () => {
      mockDynamoDB.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] })
      });

      const result = await appointmentService.getAllAppointmentsbyinsuredId('insured-123');

      expect(result).toEqual([]);
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoDB.scan = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      await expect(appointmentService.getAllAppointmentsbyinsuredId('insured-123')).rejects.toThrow('DynamoDB error');
    });
  });

  describe('updateAppointment', () => {
    it('should update an appointment successfully', async () => {
      const updateData: UpdateAppointmentRequest = {
        patientName: 'Jane Doe',
        patientEmail: 'jane@example.com',
        status: 'confirmed',
        notes: 'Updated notes',
      };

      const mockUpdatedAppointment = {
        id: 'test-id',
        ...updateData,
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockDynamoDB.update = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: mockUpdatedAppointment })
      });

      const result = await appointmentService.updateAppointment('test-id', updateData);

      expect(result).toEqual(mockUpdatedAppointment);
      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Key: { id: 'test-id' },
        UpdateExpression: 'SET #patientName = :patientName, #patientEmail = :patientEmail, #status = :status, #notes = :notes, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#patientName': 'patientName',
          '#patientEmail': 'patientEmail',
          '#status': 'status',
          '#notes': 'notes',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':patientName': 'Jane Doe',
          ':patientEmail': 'jane@example.com',
          ':status': 'confirmed',
          ':notes': 'Updated notes',
          ':updatedAt': expect.any(String),
        },
        ReturnValues: 'ALL_NEW',
      });
    });

    it('should handle empty update data', async () => {
      const mockAppointment = {
        id: 'test-id',
        insuredId: 'insured-123',
        status: 'pending',
      };

      mockDynamoDB.get = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: mockAppointment })
      });
      // Asegura que update sea un mock válido que nunca se llama
      mockDynamoDB.update = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await appointmentService.updateAppointment('test-id', {});

      expect(result).toEqual(mockAppointment);
      expect(mockDynamoDB.update).not.toHaveBeenCalled();
      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Key: { id: 'test-id' },
      });
    });

    it('should handle undefined values in update data', async () => {
      const updateData: UpdateAppointmentRequest = {
        patientName: 'Jane Doe',
        patientEmail: undefined,
        status: 'confirmed',
      };

      mockDynamoDB.update = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: { id: 'test-id', ...updateData } })
      });

      await appointmentService.updateAppointment('test-id', updateData);

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Key: { id: 'test-id' },
        UpdateExpression: 'SET #patientName = :patientName, #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#patientName': 'patientName',
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':patientName': 'Jane Doe',
          ':status': 'confirmed',
          ':updatedAt': expect.any(String),
        },
        ReturnValues: 'ALL_NEW',
      });
    });

    it('should return null when appointment not found', async () => {
      mockDynamoDB.update = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: null })
      });

      const result = await appointmentService.updateAppointment('non-existent-id', { status: 'confirmed' });

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoDB.update = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      await expect(appointmentService.updateAppointment('test-id', { status: 'confirmed' })).rejects.toThrow('DynamoDB error');
    });
  });

  describe('deleteAppointment', () => {
    it('should delete an appointment successfully', async () => {
      const mockDeletedAppointment = {
        id: 'test-id',
        insuredId: 'insured-123',
        status: 'pending',
      };

      mockDynamoDB.delete = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: mockDeletedAppointment })
      });

      const result = await appointmentService.deleteAppointment('test-id');

      expect(result).toBe(true);
      expect(mockDynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-appointments-table',
        Key: { id: 'test-id' },
        ReturnValues: 'ALL_OLD',
      });
    });

    it('should return false when appointment not found', async () => {
      mockDynamoDB.delete = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: null })
      });

      const result = await appointmentService.deleteAppointment('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoDB.delete = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      await expect(appointmentService.deleteAppointment('test-id')).rejects.toThrow('DynamoDB error');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', async () => {
      // Restaurar el mock de put para evitar errores de otros tests
      mockDynamoDB.put = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });
      const appointmentData: CreateAppointmentRequest = {
        requestId: 'test-request-id',
        insuredId: 'insured-123',
        scheduleId: 1,
        countryISO: 'PE',
      };

      const result1 = await appointmentService.createAppointment(appointmentData);
      const result2 = await appointmentService.createAppointment(appointmentData);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });
  });
}); 