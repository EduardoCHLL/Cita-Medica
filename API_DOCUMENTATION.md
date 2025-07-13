# Documentación API - Citas Médicas

## 📋 Descripción

Esta documentación describe la API de Citas Médicas que utiliza AWS Lambda, DynamoDB, SNS y SQS para procesar citas médicas con lógica específica por país (Perú y Chile).

## 🚀 Endpoints Disponibles

### 1. Crear Cita Médica
- **URL**: `POST /appointments`
- **Descripción**: Crea una nueva cita médica en el sistema
- **Body requerido**: `insuredId`, `scheduleId`, `countryISO`

### 2. Obtener Cita por ID
- **URL**: `GET /appointments/{id}`
- **Descripción**: Recupera una cita médica específica por su ID único
- **Parámetros**: `id` (UUID de la cita)

### 3. Obtener Citas por Cliente
- **URL**: `GET /appointments-by-client/{id}`
- **Descripción**: Recupera todas las citas de un asegurado específico
- **Parámetros**: `id` (ID del asegurado)

## 📁 Archivos de Documentación

### `swagger.yaml`
- Documentación en formato YAML
- Compatible con Swagger UI y herramientas de desarrollo
- Más legible para humanos

### `swagger.json`
- Documentación en formato JSON
- Mayor compatibilidad con herramientas y librerías
- Formato estándar para integraciones

## 🛠️ Cómo Usar la Documentación

### 1. Swagger UI Online
1. Ve a [Swagger Editor](https://editor.swagger.io/)
2. Copia y pega el contenido de `swagger.yaml`
3. Visualiza la documentación interactiva

### 2. Swagger UI Local
```bash
# Instalar Swagger UI
npm install -g swagger-ui-express

# Servir la documentación
swagger-ui-express swagger.yaml
```

### 3. Postman
1. Importa el archivo `swagger.json` en Postman
2. Las colecciones se generarán automáticamente
3. Prueba los endpoints directamente

### 4. Insomnia
1. Importa el archivo `swagger.yaml` en Insomnia
2. Genera automáticamente las peticiones
3. Prueba la API con ejemplos incluidos

## 🔧 Ejemplos de Uso

### Crear Cita (Perú)
```bash
curl -X POST "https://9wgd00k907.execute-api.us-east-1.amazonaws.com/test/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "12345666",
    "scheduleId": 100,
    "countryISO": "PE",
    "patientName": "Juan Pérez García",
    "patientEmail": "juan.perez@email.com",
    "doctorName": "Dr. María González",
    "specialty": "Cardiología",
    "date": "2024-01-15",
    "time": "14:30",
    "notes": "Paciente con antecedentes de hipertensión"
  }'
```

### Obtener Cita por ID
```bash
curl -X GET "https://9wgd00k907.execute-api.us-east-1.amazonaws.com/test/appointments/cf543683-6790-440a-9b9b-df9f36865f91"
```

### Obtener Citas por Cliente
```bash
curl -X GET "https://9wgd00k907.execute-api.us-east-1.amazonaws.com/test/appointments-by-client/12345666"
```

## 📊 Modelos de Datos

### CreateAppointmentRequest
```json
{
  "insuredId": "string (requerido)",
  "scheduleId": "integer (requerido)",
  "countryISO": "PE|CL (requerido)",
  "patientName": "string (opcional)",
  "patientEmail": "string (opcional)",
  "doctorName": "string (opcional)",
  "specialty": "string (opcional)",
  "date": "YYYY-MM-DD (opcional)",
  "time": "HH:MM (opcional)",
  "notes": "string (opcional)",
  "status": "pending|scheduled|confirmed|cancelled|completed (opcional)"
}
```

### Appointment (Respuesta)
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "insuredId": "string",
  "scheduleId": "integer",
  "countryISO": "PE|CL",
  "patientName": "string",
  "patientEmail": "string",
  "doctorName": "string",
  "specialty": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "status": "pending|scheduled|confirmed|cancelled|completed",
  "notes": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "completedAt": "ISO 8601 (opcional)",
  "ttl": "integer"
}
```

## 🔍 Códigos de Estado

- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Datos de entrada inválidos
- **404**: Recurso no encontrado
- **500**: Error interno del servidor

## 🌍 Soporte por País

### Perú (PE)
- Integración con sistemas de salud peruanos
- Validaciones específicas del país
- Notificaciones locales

### Chile (CL)
- Integración con FONASA/ISAPRE
- Validaciones específicas del país
- Notificaciones locales

## 🔐 Seguridad

Actualmente la API no requiere autenticación, pero está preparada para implementar:
- API Key authentication
- JWT tokens
- OAuth 2.0

## 📝 Notas Importantes

1. **GET sin Body**: Las peticiones GET no deben incluir body
2. **UUIDs**: Los IDs de citas son UUIDs generados automáticamente
3. **TTL**: Los registros tienen TTL de 1 año en DynamoDB
4. **Estados**: Las citas pasan por diferentes estados durante su ciclo de vida
5. **Procesamiento Asíncrono**: Las citas se procesan de forma asíncrona por país

## 🚨 Solución de Problemas

### Error 403 en GET
Si recibes un error 403 al hacer GET, asegúrate de:
- No incluir body en la petición GET
- Usar el Content-Type correcto
- Verificar que el ID existe

### Error 400 en POST
Si recibes un error 400, verifica que:
- Todos los campos requeridos estén presentes
- El formato de los datos sea correcto
- El countryISO sea "PE" o "CL"

## 📞 Soporte

Para soporte técnico:
- Email: soporte@citamedica.com
- Documentación: [GitHub Repository](https://github.com/tu-usuario/cita-medica-lambda) 