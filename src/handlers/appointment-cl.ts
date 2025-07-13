import { SQSEvent, SQSRecord, Context, SQSHandler } from 'aws-lambda';
import { EventBridge } from 'aws-sdk';
import { AppointmentService } from '../services/dynamodb';
import { Appointment } from '../types';

const appointmentService = new AppointmentService();
const eventBridge = new EventBridge();

export const handler: SQSHandler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  console.log('Processing Chile appointments from SQS', {
    messageCount: event.Records.length,
    requestId: context.awsRequestId,
  });

  for (const record of event.Records) {
    try {
      await processChileAppointment(record);
    } catch (error) {
      console.error('Error processing Chile appointment:', error, {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle,
      });
      // En un entorno de producción, podrías querer enviar a una DLQ o manejar el error de otra manera
      throw error; // Esto hará que el mensaje vuelva a la cola
    }
  }
};

async function processChileAppointment(record: SQSRecord): Promise<void> {
  const messageBody = JSON.parse(record.body);
  
  // Verificar que el mensaje tiene el atributo countryISO = CL
  const messageAttributes = record.messageAttributes;
  const countryISO = messageAttributes?.countryISO?.stringValue;
  
  if (countryISO !== 'CL') {
    console.warn('Received message for Chile queue with wrong countryISO:', countryISO);
    return; // Procesamos el mensaje pero registramos la advertencia
  }

  console.log('Processing Chile appointment:', {
    messageId: record.messageId,
    appointmentData: messageBody,
  });

  // Aquí puedes agregar la lógica específica para Chile
  // Por ejemplo:
  // - Validaciones específicas del país
  // - Integración con FONASA o ISAPRE
  // - Notificaciones específicas
  // - Procesamiento de documentos chilenos
  const infoRedord = JSON.parse(messageBody.Message);
  // Ejemplo de procesamiento específico para Chile
  await processChileSpecificLogic(infoRedord);
  
  // Enviar conformidad del agendamiento a través de EventBridge
  await sendAppointmentConfirmation(infoRedord);
  
  console.log('Successfully processed Chile appointment:', record.messageId);
}

async function processChileSpecificLogic(appointmentData: any): Promise<void> {
  // Lógica específica para Chile
  console.log('Applying Chile-specific business logic');
  
  // Ejemplos de lógica específica:
  // - Validar formato de RUT chileno
  // - Verificar cobertura de FONASA o ISAPRE
  // - Aplicar horarios de atención chilenos
  // - Enviar notificaciones en español chileno
  // - Integrar con sistemas de salud chilenos
  
  // Simular algún procesamiento
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('Chile-specific logic completed');
}

async function sendAppointmentConfirmation(appointmentData: any): Promise<void> {
  try {
    const eventBusName = process.env.EVENT_BUS_NAME || 'default';
    
    const event = {
      Source: 'cita-medica.chile',
      DetailType: 'AppointmentConfirmed',
      Detail: JSON.stringify({
        appointmentId: appointmentData.id,
        countryISO: 'CL',
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
      countryISO: 'CL'
    });
  } catch (error) {
    console.error('Error sending appointment confirmation to EventBridge:', error);
    throw error; // Re-lanzamos el error para que el mensaje vuelva a la cola
  }
} 