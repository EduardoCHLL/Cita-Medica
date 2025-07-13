import { SQSEvent, SQSRecord, Context, SQSHandler } from 'aws-lambda';
import { AppointmentService } from '../services/dynamodb';
import { Appointment } from '../types';

const appointmentService = new AppointmentService();

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
      await processPeruAppointment(record);
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

async function processPeruAppointment(record: SQSRecord): Promise<void> {
  const messageBody = JSON.parse(record.body);
  
  // Verificar que el mensaje tiene el atributo countryISO = PE
  const messageAttributes = record.messageAttributes;
  const countryISO = messageAttributes?.countryISO?.stringValue;
  
  if (countryISO !== 'PE') {
    console.warn('Received message for Peru queue with wrong countryISO:', countryISO);
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
  await processPeruSpecificLogic(messageBody);
  
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