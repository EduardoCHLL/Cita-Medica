// @ts-nocheck
// Test setup file for Jest
import { jest } from '@jest/globals';

// Mock AWS SDK
const mockSNS = {
  publish: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' })
  })
};

const mockEventBridge = {
  putEvents: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Entries: [{ EventId: 'test-event-id' }]
    })
  })
};

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

jest.mock('aws-sdk', () => ({
  SNS: jest.fn().mockImplementation(() => mockSNS),
  EventBridge: jest.fn().mockImplementation(() => mockEventBridge),
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => mockDynamoDB)
  }
}));

// Mock uuid with unique IDs
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => `test-uuid-${++uuidCounter}`)
}));

// Set default environment variables for tests
process.env.NODE_ENV = 'test';
process.env.APPOINTMENTS_TABLE = 'test-appointments-table';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
process.env.EVENT_BUS_NAME = 'test-event-bus';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up environment variables after each test
afterEach(() => {
  // Reset to default test values
  process.env.APPOINTMENTS_TABLE = 'test-appointments-table';
  process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
  process.env.EVENT_BUS_NAME = 'test-event-bus';
}); 