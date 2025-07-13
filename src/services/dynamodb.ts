import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '../types';

export class AppointmentService {
  private dynamodb: AWS.DynamoDB.DocumentClient;

  constructor(dynamodbClient?: AWS.DynamoDB.DocumentClient) {
    this.dynamodb = dynamodbClient || new AWS.DynamoDB.DocumentClient();
  }

  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    const now = new Date().toISOString();
    const appointment: Appointment = { 
      id: this.generateId(),
      ...appointmentData,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
    };
    const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'Appointment-Test-1';
    await this.dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: appointment,
      })
      .promise();

    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'Appointment-Test-1';
    const result = await this.dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: { id },
      })
      .promise();

    return result.Item as Appointment || null;
  }

  async getAllAppointmentsbyinsuredId(Id: string): Promise<Appointment[]> {
    const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'Appointment-Test-1';
    const result = await this.dynamodb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'insuredId = :insuredId',
        ExpressionAttributeValues: {
          ':insuredId': Id
        }
      })
      .promise();

    return (result.Items || []) as Appointment[];
  }

  async updateAppointment(id: string, updateData: UpdateAppointmentRequest): Promise<Appointment | null> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};
    const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'Appointment-Test-1';

    // Build update expression dynamically
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpression.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    // If no fields to update, return the current appointment
    if (updateExpression.length === 0) {
      return this.getAppointment(id);
    }

    // Always update the updatedAt timestamp when there are other updates
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await this.dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    return result.Attributes as Appointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'Appointment-Test-1';
    const result = await this.dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: { id },
        ReturnValues: 'ALL_OLD',
      })
      .promise();

    return !!result.Attributes;
  }

  private generateId(): string {
    return uuidv4();
  }
} 