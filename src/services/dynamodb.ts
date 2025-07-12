import AWS from 'aws-sdk';
import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '../types';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.APPOINTMENTS_TABLE || 'cita-medica-lambda-dev';

export class AppointmentService {
  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: this.generateId(),
      ...appointmentData,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
    };

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: appointment,
      })
      .promise();

    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: { id },
      })
      .promise();

    return result.Item as Appointment || null;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    const result = await dynamodb
      .scan({
        TableName: TABLE_NAME,
      })
      .promise();

    return (result.Items || []) as Appointment[];
  }

  async updateAppointment(id: string, updateData: UpdateAppointmentRequest): Promise<Appointment | null> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

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

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpression.length === 0) {
      return this.getAppointment(id);
    }

    const result = await dynamodb
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
    const result = await dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: { id },
        ReturnValues: 'ALL_OLD',
      })
      .promise();

    return !!result.Attributes;
  }

  private generateId(): string {
    return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 