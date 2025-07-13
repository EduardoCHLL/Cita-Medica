import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { SNS } from 'aws-sdk';
import { AppointmentService } from '../services/dynamodb';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationError, 
  createNotFoundError 
} from '../utils/response';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Default instances for production use
const defaultAppointmentService = new AppointmentService();
const defaultSNS = new SNS();

export const handler = async (
  event: any,
  context: Context
): Promise<any> => {
  // Detectar si es SQS o API Gateway
  if (event.Records && Array.isArray(event.Records) && event.Records[0]?.eventSource === 'aws:sqs') {
    // SQS batch
    console.log('Processing appointment completion from SQS', {
      messageCount: event.Records.length,
      requestId: context.awsRequestId,
      event: JSON.stringify(event),
    });
    for (const record of event.Records) {
      try {
        await processAppointmentCompletion(record, defaultAppointmentService);
      } catch (error) {
        console.error('Error processing appointment completion:', error, {
          messageId: record.messageId,
          receiptHandle: record.receiptHandle,
        });
        throw error; // Esto hará que el mensaje vuelva a la cola
      }
    }
    return;
  }
  // API Gateway
  try {
    console.log('Appointment handler called', {
      method: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
    });

    switch (event.httpMethod) {
      case 'POST':
        return await createAppointment(event, defaultAppointmentService, defaultSNS);
      case 'GET':
        console.log('GET',event.pathParameters?.id,event.path)
        if(event.pathParameters?.id){
          return event.path==('/appointments-by-client/'+event.pathParameters?.id) ?await getAllAppointmentsbyinsuredId(event.pathParameters.id, defaultAppointmentService):await getAppointment(event.pathParameters.id, defaultAppointmentService)
        } 
        return createErrorResponse({
          message: `Method ${event.httpMethod} not allowed`,
          code: 'METHOD_NOT_ALLOWED',
        }, 405);
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

// Export for testing with dependency injection
export async function processAppointmentCompletion(
  record: SQSRecord,
  appointmentService: AppointmentService = defaultAppointmentService
): Promise<void> {
  const messageBody = JSON.parse(record.body);
  
  console.log('Processing appointment completion:', {
    messageId: record.messageId,
    messageBody: messageBody,
    detail : JSON.stringify(messageBody.detail)
  });

  // Extraer la información del evento de EventBridge
  let appointmentId: string;
  let countryISO: string;
  let appointmentData: any;

  try {
    // El mensaje SQS contiene el evento de EventBridge
    if (messageBody.detail) {
      // Formato directo del evento EventBridge
      const detail = typeof messageBody.detail === 'string' 
        ? JSON.parse(messageBody.detail) 
        : messageBody.detail;
      
      appointmentId = detail.appointmentId;
      countryISO = detail.countryISO;
      appointmentData = detail.appointmentData;
    } else {
      // Fallback: intentar extraer del body directamente
      appointmentId = messageBody.appointmentId;
      countryISO = messageBody.countryISO;
      appointmentData = messageBody.appointmentData;
    }

    if (!appointmentId) {
      throw new Error('appointmentId is required in the message');
    }

    console.log('Extracted appointment data:', {
      appointmentId,
      countryISO,
      hasAppointmentData: !!appointmentData
    });

    // Actualizar el estado del agendamiento a "completed"
    const updateData = {
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      countryISO: countryISO
    };

    const updatedAppointment = await appointmentService.updateAppointment(appointmentId, updateData);
    
    if (!updatedAppointment) {
      throw new Error(`Appointment with id ${appointmentId} not found`);
    }

    console.log('Successfully updated appointment status to completed:', {
      messageId: record.messageId,
      appointmentId: appointmentId,
      countryISO: countryISO,
      newStatus: updatedAppointment.status
    });

  } catch (error) {
    console.error('Error processing appointment completion:', error, {
      messageId: record.messageId,
      messageBody: messageBody
    });
    throw error;
  }
}

// Export for testing with dependency injection
export async function createAppointment(
  event: APIGatewayProxyEvent,
  appointmentService: AppointmentService = defaultAppointmentService,
  sns: SNS = defaultSNS
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Validate required fields
    const requiredFields = ['insuredId', 'scheduleId', 'countryISO'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return createValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const appointmentData: CreateAppointmentRequest = {
      requestId: uuidv4(),
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
    await publishToSNS(appointment, sns);
    
    return createSuccessResponse(appointment, 201);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return createErrorResponse({
      message: 'Failed to create appointment',
      code: 'CREATE_ERROR',
    }, 500);
  }
}

async function publishToSNS(
  appointment: any,
  sns: SNS = defaultSNS
): Promise<void> {
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

    const subject = `Nueva cita médica - ${appointment.countryISO}`;

    const result = await sns.publish({
      TopicArn: topicArn,
      Message: message,
      MessageAttributes: messageAttributes,
      Subject: subject
    }).promise();

    console.log('Successfully published to SNS:', {
      messageId: result.MessageId,
      appointmentId: appointment.id,
      countryISO: appointment.countryISO
    });
  } catch (error) {
    console.error('Error publishing to SNS:', error);
    // No re-lanzamos el error para que la creación de la cita no falle por problemas de SNS
  }
}

// Export for testing with dependency injection
export async function getAppointment(
  id: string,
  appointmentService: AppointmentService = defaultAppointmentService
): Promise<APIGatewayProxyResult> {
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

// Export for testing with dependency injection
export async function getAllAppointmentsbyinsuredId(
  Id: string,
  appointmentService: AppointmentService = defaultAppointmentService
): Promise<APIGatewayProxyResult> {
  try {
    const appointments = await appointmentService.getAllAppointmentsbyinsuredId(Id);
    
    return createSuccessResponse(appointments);
  } catch (error) {
    console.error('Error getting appointments by insured ID:', error);
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

    const appointment = await defaultAppointmentService.updateAppointment(id, updateData);
    
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

    const deleted = await defaultAppointmentService.deleteAppointment(id);
    
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