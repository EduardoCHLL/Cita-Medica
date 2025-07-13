import { SQSEvent, SQSRecord, Context, SQSHandler } from 'aws-lambda';
import { EventBridge } from 'aws-sdk';
import { AppointmentService } from '../services/dynamodb';
import { Appointment } from '../types';

// Default instances for production use
const defaultAppointmentService = new AppointmentService();
const defaultEventBridge = new EventBridge();

export const handler: SQSHandler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  console.log('Processing Peru appointments from SQS', {
    messageCount: event.Records.length,
    requestId: context.awsRequestId,
    event: JSON.stringify(event),
  });

  for (const record of event.Records) {
    try {
      await processPeruAppointment(record, defaultAppointmentService, defaultEventBridge);
    } catch (error) {
      console.error('Error processing Peru appointment:', error, {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle,
      });
      // En un entorno de producción, podrías querer enviar a una DLQ o manejar el error de otra manera
      throw error; // Esto hará que el mensaje vuelva a la cola
    }
  }
};

// Export for testing with dependency injection
export async function processPeruAppointment(
  record: SQSRecord, 
  appointmentService: AppointmentService = defaultAppointmentService,
  eventBridge: EventBridge = defaultEventBridge
): Promise<void> {
  const messageBody = JSON.parse(record.body);
  
  // El mensaje SQS contiene un mensaje SNS, necesitamos extraer los MessageAttributes del SNS
  let countryISO: string | undefined;
  
  // Verificar si es un mensaje SNS (tiene MessageAttributes)
  if (messageBody.MessageAttributes && messageBody.MessageAttributes.countryISO) {
    countryISO = messageBody.MessageAttributes.countryISO.Value;
  } else {
    // Fallback: verificar en los messageAttributes del SQS (aunque estén vacíos en este caso)
    const messageAttributes = record.messageAttributes;
    countryISO = messageAttributes?.countryISO?.stringValue;
  }
  
  if (countryISO !== 'PE') {
    console.warn('Received message for Peru queue with wrong countryISO:', countryISO, {
      messageId: record.messageId,
      snsMessageAttributes: messageBody.MessageAttributes,
      sqsMessageAttributes: record.messageAttributes
    });
    return; // Procesamos el mensaje pero registramos la advertencia
  }

  console.log('Processing Peru appointment:', {
    messageId: record.messageId,
    appointmentData: messageBody,
  });

  // Aquí puedes agregar la lógica específica para Perú
  // Por ejemplo:
  // - Validaciones específicas del país
  // - Integración con sistemas de salud peruanos
  // - Notificaciones específicas
  // - Procesamiento de documentos peruanos
  
  // Ejemplo de procesamiento específico para Perú
  const infoRedord = JSON.parse(messageBody.Message);
  await processPeruSpecificLogic(infoRedord);
  
  // Enviar conformidad del agendamiento a través de EventBridge
  await sendAppointmentConfirmation(infoRedord, eventBridge);
  
  console.log('Successfully processed Peru appointment:', record.messageId);
}

async function processPeruSpecificLogic(appointmentData: any): Promise<void> {
  // Lógica específica para Perú
  console.log('Applying Peru-specific business logic');
  
  // Ejemplos de lógica específica:
  // - Validar formato de DNI peruano
  // - Verificar cobertura de ESSALUD
  // - Aplicar horarios de atención peruanos
  // - Enviar notificaciones en español peruano
  
  // Simular algún procesamiento
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('Peru-specific logic completed');
}

async function sendAppointmentConfirmation(
  appointmentData: any, 
  eventBridge: EventBridge = defaultEventBridge
): Promise<void> {
  try {
    const eventBusName = process.env.EVENT_BUS_NAME || 'default';
    
    const event = {
      Source: 'cita-medica.peru',
      DetailType: 'AppointmentConfirmed',
      Detail: JSON.stringify({
        appointmentId: appointmentData.id,
        countryISO: 'PE',
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        appointmentData: appointmentData
      }),
      EventBusName: eventBusName
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    console.log('Successfully sent appointment confirmation to EventBridge:', {
      eventId: result.Entries?.[0]?.EventId,
      appointmentId: appointmentData.id,
      countryISO: 'PE'
    });
  } catch (error) {
    console.error('Error sending appointment confirmation to EventBridge:', error);
    throw error; // Re-lanzamos el error para que el mensaje vuelva a la cola
  }
} 