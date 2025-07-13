# Guía de Despliegue - Arquitectura SNS/SQS

## Problema Resuelto

El error de dependencias circulares se ha resuelto separando el despliegue en dos fases:

1. **Fase 1**: Despliegue de recursos básicos (SNS Topic, SQS Queues, Lambdas)
2. **Fase 2**: Configuración de suscripciones SNS con filtros

## Despliegue Automático

### Opción 1: Despliegue Completo (Recomendado)

```bash
# Desplegar en desarrollo
npm run deploy:dev

# Desplegar en test
npm run deploy:test

# Desplegar en producción
npm run deploy:prod
```

Estos comandos ejecutan automáticamente:
1. Build del proyecto
2. Despliegue con Serverless Framework
3. Configuración de suscripciones SNS

### Opción 2: Despliegue Manual

```bash
# Paso 1: Desplegar recursos básicos
npm run build
serverless deploy --stage test

# Paso 2: Configurar suscripciones SNS
npm run setup-sns:test
```

## Configuración de Variables de Entorno

Antes del despliegue, asegúrate de tener configurado:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=tu-account-id
export STAGE=test  # o dev, prod
```

## Verificación del Despliegue

### 1. Verificar Recursos Creados

```bash
# Verificar SNS Topic
aws sns list-topics --query 'Topics[?contains(TopicArn, `sns_medical`)]'

# Verificar SQS Queues
aws sqs list-queues --queue-name-prefix "cita-medica-lambda-test"

# Verificar Lambdas
aws lambda list-functions --query 'Functions[?contains(FunctionName, `cita-medica-lambda-test`)]'
```

### 2. Verificar Suscripciones SNS

```bash
# Obtener ARN del topic
TOPIC_ARN=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `sns_medical`)].TopicArn' --output text)

# Listar suscripciones
aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN
```

### 3. Probar la Arquitectura

```bash
# Crear cita para Perú
curl -X POST https://your-api-gateway-url/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "12345678",
    "scheduleId": 1,
    "countryISO": "PE",
    "patientName": "Juan Pérez"
  }'

# Crear cita para Chile
curl -X POST https://your-api-gateway-url/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "87654321",
    "scheduleId": 2,
    "countryISO": "CL",
    "patientName": "María González"
  }'
```

## Monitoreo

### CloudWatch Logs

```bash
# Logs de la lambda principal
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/cita-medica-lambda-test-Appointment"

# Logs de la lambda de Perú
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/cita-medica-lambda-test-AppointmentPE"

# Logs de la lambda de Chile
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/cita-medica-lambda-test-AppointmentCL"
```

### Métricas SQS

```bash
# Verificar mensajes en cola de Perú
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT/cita-medica-lambda-test-PerusQueue-XXX \
  --attribute-names All

# Verificar mensajes en cola de Chile
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT/cita-medica-lambda-test-ChileQueue-XXX \
  --attribute-names All
```

## Solución de Problemas

### Error: VisibilityTimeoutSeconds

Si ves el error "extraneous key [VisibilityTimeoutSeconds] is not permitted":

- **Solución**: Ya está corregido en el código. La propiedad correcta es `VisibilityTimeout` (sin "Seconds")

### Error: Dependencias Circulares

Si vuelves a ver el error de dependencias circulares:

1. Elimina las suscripciones SNS existentes:
```bash
aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN --query 'Subscriptions[].SubscriptionArn' --output text | xargs -I {} aws sns unsubscribe --subscription-arn {}
```

2. Ejecuta el script de configuración:
```bash
npm run setup-sns:test
```

### Error: Permisos SQS

Si las colas SQS no reciben mensajes:

1. Verificar políticas de SQS:
```bash
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names Policy
```

2. Reconfigurar políticas:
```bash
npm run setup-sns:test
```

### Error: Filtros SNS

Si los filtros no funcionan:

1. Verificar suscripciones:
```bash
aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN
```

2. Verificar atributos de mensaje en CloudWatch Logs

## Limpieza

```bash
# Eliminar todos los recursos
serverless remove --stage test

# Limpiar archivos locales
npm run clean
```

## Notas Importantes

1. **Filtros SNS**: Los filtros funcionan con `MessageAttributes`, no con el cuerpo del mensaje
2. **Políticas SQS**: Se configuran automáticamente para permitir SNS
3. **Dead Letter Queues**: Configuradas para manejar mensajes fallidos
4. **Logs**: Cada lambda tiene logs separados para debugging
5. **VisibilityTimeout**: Propiedad correcta para SQS (no VisibilityTimeoutSeconds)

## Arquitectura Final

```
API Gateway → Lambda Appointment → DynamoDB
                    ↓
              SNS Topic (sns_medical)
                    ↓
            [Filtros por countryISO]
                    ↓
        ┌─────────┴─────────┐
        ↓                   ↓
    SQS (PE)           SQS (CL)
        ↓                   ↓
  Lambda (PE)        Lambda (CL)
``` 