# Arquitectura de Citas Médicas por País

## Descripción General

Esta arquitectura implementa un sistema de procesamiento de citas médicas con filtrado por país utilizando AWS SNS, SQS y Lambda. Los mensajes se enrutan automáticamente a colas específicas según el país de la cita.

## Componentes de la Arquitectura

### 1. SNS Topic (`sns_medical`)
- **Nombre**: `sns_medical`
- **Descripción**: Topic central para notificaciones de citas médicas
- **Función**: Recibe todos los mensajes de citas y los distribuye según filtros

### 2. Colas SQS

#### Cola de Perú (`sqs_pe`)
- **Nombre**: `sqs_pe`
- **Filtro**: Solo mensajes con `countryISO = "PE"`
- **Dead Letter Queue**: `sqs_pe_dlq`
- **Configuración**:
  - Visibility Timeout: 30 segundos
  - Message Retention: 14 días
  - Max Receive Count: 3

#### Cola de Chile (`sqs_cl`)
- **Nombre**: `sqs_cl`
- **Filtro**: Solo mensajes con `countryISO = "CL"`
- **Dead Letter Queue**: `sqs_cl_dlq`
- **Configuración**:
  - Visibility Timeout: 30 segundos
  - Message Retention: 14 días
  - Max Receive Count: 3

### 3. Lambdas

#### Lambda Principal (`Appointment`)
- **Handler**: `src/handlers/appointment.handler`
- **Trigger**: API Gateway (POST /appointments)
- **Función**: 
  - Crea citas médicas en DynamoDB
  - Publica mensajes al SNS Topic con atributos de filtrado

#### Lambda de Perú (`AppointmentPE`)
- **Handler**: `src/handlers/appointment-pe.handler`
- **Trigger**: SQS (`sqs_pe`)
- **Función**: Procesa citas específicas de Perú

#### Lambda de Chile (`AppointmentCL`)
- **Handler**: `src/handlers/appointment-cl.handler`
- **Trigger**: SQS (`sqs_cl`)
- **Función**: Procesa citas específicas de Chile

## Flujo de Datos

```
1. Cliente → API Gateway → Lambda Appointment
2. Lambda Appointment → DynamoDB (crear cita)
3. Lambda Appointment → SNS Topic (con atributos)
4. SNS Topic → Filtros → SQS específica (PE/CL)
5. SQS → Lambda específica (PE/CL)
```

## Filtros de Suscripción

### Para Perú
```json
{
  "countryISO": ["PE"]
}
```

### Para Chile
```json
{
  "countryISO": ["CL"]
}
```

## Atributos de Mensaje SNS

Los mensajes publicados al SNS incluyen los siguientes atributos:

```json
{
  "countryISO": "PE|CL",
  "appointmentId": "uuid",
  "status": "pending|scheduled|confirmed|cancelled|completed"
}
```

## Permisos IAM

### Lambda Principal
- DynamoDB: CRUD operations
- SNS: Publish

### Lambdas de País
- SQS: ReceiveMessage, DeleteMessage, GetQueueAttributes

## Despliegue

```bash
# Desplegar en desarrollo
serverless deploy --stage dev

# Desplegar en producción
serverless deploy --stage prod
```

## Testing

### Crear cita para Perú
```bash
curl -X POST https://your-api-gateway-url/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "12345678",
    "scheduleId": 1,
    "countryISO": "PE",
    "patientName": "Juan Pérez",
    "patientEmail": "juan@example.com"
  }'
```

### Crear cita para Chile
```bash
curl -X POST https://your-api-gateway-url/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "87654321",
    "scheduleId": 2,
    "countryISO": "CL",
    "patientName": "María González",
    "patientEmail": "maria@example.com"
  }'
```

## Monitoreo

### CloudWatch Logs
- Cada lambda tiene su propio grupo de logs
- Los logs incluyen información de procesamiento por país

### Métricas SQS
- Número de mensajes en cola
- Tiempo de procesamiento
- Mensajes en DLQ

### Métricas SNS
- Número de mensajes publicados
- Número de mensajes entregados
- Número de mensajes fallidos

## Escalabilidad

- Las colas SQS se escalan automáticamente
- Las lambdas se ejecutan en paralelo para múltiples mensajes
- El filtrado en SNS reduce la carga en las colas específicas

## Consideraciones de Producción

1. **Dead Letter Queues**: Configuradas para manejar mensajes fallidos
2. **Retry Logic**: Implementada en las lambdas de procesamiento
3. **Logging**: Logs detallados para debugging y monitoreo
4. **Error Handling**: Manejo robusto de errores sin pérdida de mensajes
5. **Security**: Políticas IAM mínimas necesarias 