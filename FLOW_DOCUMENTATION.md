# Flujo de Confirmación de Agendamientos

## Descripción General

Este documento describe el flujo completo para la confirmación de agendamientos médicos, desde la creación inicial hasta la actualización del estado a "completed".

## Arquitectura del Flujo

```
1. Creación de Cita → 2. SNS → 3. SQS (PE/CL) → 4. Lambda País → 5. EventBridge → 6. SQS Completion → 7. Lambda Completion → 8. DynamoDB
```

## Componentes del Flujo

### 1. Creación de Cita (`appointment.ts`)
- **Función**: Lambda HTTP que recibe solicitudes de creación de citas
- **Acción**: Crea el registro en DynamoDB con estado `pending`
- **Salida**: Publica mensaje al SNS Topic con filtros por país

### 2. SNS Topic (`MedicalAppointmentsTopic`)
- **Función**: Distribuye mensajes a las colas SQS según el país
- **Filtros**: 
  - `countryISO = 'PE'` → `PeruQueue`
  - `countryISO = 'CL'` → `ChileQueue`

### 3. Colas SQS por País
- **PeruQueue**: Recibe mensajes para Perú
- **ChileQueue**: Recibe mensajes para Chile
- **Configuración**: 
  - Visibility Timeout: 30 segundos
  - Dead Letter Queue configurada
  - Max Receive Count: 3

### 4. Lambdas de País (`appointment-pe.ts`, `appointment-cl.ts`)
- **Función**: Procesan lógica específica de cada país
- **Acciones**:
  - Validaciones específicas del país
  - Integración con sistemas de salud locales
  - Notificaciones específicas
- **Salida**: Envían evento de confirmación a EventBridge

### 5. EventBridge (`AppointmentEventBus`)
- **Función**: Captura eventos de confirmación de agendamientos
- **Reglas**:
  - `peru-appointment-confirmed`: Captura eventos de Perú
  - `chile-appointment-confirmed`: Captura eventos de Chile
- **Salida**: Envía eventos a `CompletionQueue`

### 6. Cola SQS de Completado (`CompletionQueue`)
- **Función**: Recibe eventos de confirmación de EventBridge
- **Configuración**: Similar a las colas de país
- **Salida**: Alimenta al lambda de completado

### 7. Lambda de Completado (`appointment-completion.ts`)
- **Función**: Actualiza el estado del agendamiento a "completed"
- **Acciones**:
  - Extrae información del evento EventBridge
  - Actualiza el registro en DynamoDB
  - Establece `status = 'completed'`
  - Establece `completedAt = timestamp`

### 8. DynamoDB (`AppointmentsTable`)
- **Función**: Almacena el estado final del agendamiento
- **Campos actualizados**:
  - `status`: "completed"
  - `completedAt`: Timestamp de completado
  - `updatedAt`: Timestamp de última actualización

## Formato de Eventos

### Evento EventBridge (Perú)
```json
{
  "Source": "cita-medica.peru",
  "DetailType": "AppointmentConfirmed",
  "Detail": {
    "appointmentId": "apt_1234567890_abc123",
    "countryISO": "PE",
    "status": "confirmed",
    "confirmedAt": "2024-01-15T10:30:00.000Z",
    "appointmentData": { ... }
  }
}
```

### Evento EventBridge (Chile)
```json
{
  "Source": "cita-medica.chile",
  "DetailType": "AppointmentConfirmed",
  "Detail": {
    "appointmentId": "apt_1234567890_abc123",
    "countryISO": "CL",
    "status": "confirmed",
    "confirmedAt": "2024-01-15T10:30:00.000Z",
    "appointmentData": { ... }
  }
}
```

## Estados del Agendamiento

1. **pending**: Estado inicial al crear la cita
2. **scheduled**: Cita programada (opcional)
3. **confirmed**: Cita confirmada por el país
4. **completed**: Cita procesada completamente
5. **cancelled**: Cita cancelada

## Manejo de Errores

### Dead Letter Queues
- Cada cola SQS tiene su DLQ correspondiente
- Mensajes fallidos se envían a DLQ después de 3 intentos
- Permite reprocesamiento manual de mensajes fallidos

### Logging
- Todos los lambdas incluyen logging detallado
- Información de contexto: `messageId`, `appointmentId`, `countryISO`
- Errores se registran con contexto completo

### Retry Logic
- Los lambdas re-lanzan errores para que los mensajes vuelvan a la cola
- EventBridge maneja reintentos automáticamente
- SQS proporciona garantías de entrega al menos una vez

## Configuración de Variables de Entorno

```yaml
environment:
  NODE_ENV: ${self:provider.stage}
  APPOINTMENTS_TABLE: ${self:service}-${self:provider.stage}
  SNS_TOPIC_ARN: !Ref MedicalAppointmentsTopic
  EVENT_BUS_NAME: !Ref AppointmentEventBus
```

## Permisos IAM

Los lambdas requieren permisos para:
- DynamoDB: CRUD operations
- SNS: Publish
- SQS: ReceiveMessage, DeleteMessage, GetQueueAttributes
- EventBridge: PutEvents

## Monitoreo y Métricas

### CloudWatch Metrics
- Invocaciones de lambdas
- Duración de ejecución
- Errores y timeouts
- Mensajes en colas SQS

### Logs Estructurados
- Cada paso del flujo genera logs con contexto
- Facilita debugging y monitoreo
- Incluye IDs de correlación

## Consideraciones de Producción

1. **Escalabilidad**: El flujo es stateless y puede escalar horizontalmente
2. **Resiliencia**: Múltiples capas de retry y DLQs
3. **Monitoreo**: Logs detallados en cada paso
4. **Seguridad**: Permisos mínimos necesarios
5. **Costo**: Pay-per-request para DynamoDB, uso eficiente de recursos 