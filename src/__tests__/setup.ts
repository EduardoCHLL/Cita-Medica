// Test setup file
process.env.NODE_ENV = 'test';
process.env.APPOINTMENTS_TABLE = 'test-appointments-table';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      put: jest.fn().mockReturnValue({ promise: jest.fn() }),
      get: jest.fn().mockReturnValue({ promise: jest.fn() }),
      scan: jest.fn().mockReturnValue({ promise: jest.fn() }),
      update: jest.fn().mockReturnValue({ promise: jest.fn() }),
      delete: jest.fn().mockReturnValue({ promise: jest.fn() }),
    })),
  },
})); 