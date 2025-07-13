import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SNS } from 'aws-sdk';
import { AppointmentService } from '../services/dynamodb';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationError, 
  createNotFoundError 
} from '../utils/response';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types';

const appointmentService = new AppointmentService();
const sns = new SNS();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Appointment handler called', {
      method: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
    });

    switch (event.httpMethod) {
      case 'POST':
        return await createAppointment(event);
      case 'GET':
        return event.pathParameters?.id 
          ? await getAppointment(event.pathParameters.id)
          : await getAllAppointments();
      case 'PUT':
        return await updateAppointment(event);
      case 'DELETE':
        return await deleteAppointment(event.pathParameters?.id);
      default:
        return createErrorResponse({
          message: `Method ${event.httpMethod} not allowed`,
          code: 'METHOD_NOT_ALLOWED',
        }, 405);
    }
  } catch (error) {
    console.error('Error in appointment handler:', error);
    return createErrorResponse({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
};

async function createAppointment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate required fields
    const requiredFields = ['insuredId', 'scheduleId', 'countryISO'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return createValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const appointmentData: CreateAppointmentRequest = {
      insuredId: body.insuredId,
      scheduleId: body.scheduleId,
      countryISO: body.countryISO,
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      status : 'pending',
      doctorName: body.doctorName,
      specialty: body.specialty,
      date: body.date,
      time: body.time,
      notes: body.notes,
    };

    const appointment = await appointmentService.createAppointment(appointmentData);
    
    // Publicar mensaje al SNS Topic con filtros por país
    await publishToSNS(appointment);
    
    return createSuccessResponse(appointment, 201);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return createErrorResponse({
      message: 'Failed to create appointment',
      code: 'CREATE_ERROR',
    }, 500);
  }
}

async function publishToSNS(appointment: any): Promise<void> {
  try {
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
      console.warn('SNS_TOPIC_ARN not configured, skipping SNS publication');
      return;
    }

    const message = JSON.stringify(appointment);
    const messageAttributes = {
      countryISO: {
        DataType: 'String',
        StringValue: appointment.countryISO
      },
      appointmentId: {
        DataType: 'String',
        StringValue: appointment.id
      },
      status: {
        DataType: 'String',
        StringValue: appointment.status
      }
    };

    const params: SNS.PublishInput = {
      TopicArn: topicArn,
      Message: message,
      MessageAttributes: messageAttributes,
      Subject: `Nueva cita médica - ${appointment.countryISO}`
    };

    const result = await sns.publish(params).promise();
    console.log('Successfully published to SNS:', {
      messageId: result.MessageId,
      appointmentId: appointment.id,
      countryISO: appointment.countryISO
    });
  } catch (error) {
    console.error('Error publishing to SNS:', error);
    // No lanzamos el error para no fallar la creación de la cita
    // En producción, podrías querer manejar esto de manera diferente
  }
}

async function getAppointment(id: string): Promise<APIGatewayProxyResult> {
  try {
    const appointment = await appointmentService.getAppointment(id);
    
    if (!appointment) {
      return createNotFoundError(`Appointment with id ${id} not found`);
    }

    return createSuccessResponse(appointment);
  } catch (error) {
    console.error('Error getting appointment:', error);
    return createErrorResponse({
      message: 'Failed to get appointment',
      code: 'GET_ERROR',
    }, 500);
  }
}

async function getAllAppointments(): Promise<APIGatewayProxyResult> {
  try {
    const appointments = await appointmentService.getAllAppointments();
    return createSuccessResponse(appointments);
  } catch (error) {
    console.error('Error getting all appointments:', error);
    return createErrorResponse({
      message: 'Failed to get appointments',
      code: 'GET_ERROR',
    }, 500);
  }
}

async function updateAppointment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return createValidationError('Appointment ID is required');
    }

    const body = JSON.parse(event.body || '{}');
    const updateData: UpdateAppointmentRequest = {
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      doctorName: body.doctorName,
      specialty: body.specialty,
      date: body.date,
      time: body.time,
      status: body.status,
      notes: body.notes,
    };

    const appointment = await appointmentService.updateAppointment(id, updateData);
    
    if (!appointment) {
      return createNotFoundError(`Appointment with id ${id} not found`);
    }

    return createSuccessResponse(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return createErrorResponse({
      message: 'Failed to update appointment',
      code: 'UPDATE_ERROR',
    }, 500);
  }
}

async function deleteAppointment(id?: string): Promise<APIGatewayProxyResult> {
  try {
    if (!id) {
      return createValidationError('Appointment ID is required');
    }

    const deleted = await appointmentService.deleteAppointment(id);
    
    if (!deleted) {
      return createNotFoundError(`Appointment with id ${id} not found`);
    }

    return createSuccessResponse({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return createErrorResponse({
      message: 'Failed to delete appointment',
      code: 'DELETE_ERROR',
    }, 500);
  }
} 