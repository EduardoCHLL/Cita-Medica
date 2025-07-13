# Cita Médica Lambda

Un sistema de gestión de citas médicas construido con TypeScript y AWS Lambda usando Serverless Framework.

## 🚀 Características

- **API RESTful** para gestión de citas médicas
- **TypeScript** para type safety y mejor desarrollo
- **AWS Lambda** para serverless computing
- **DynamoDB** como base de datos NoSQL
- **Serverless Framework** para deployment y configuración
- **CORS habilitado** para integración con frontend

## 📋 Endpoints

### Citas Médicas

- `POST /appointments` - Crear nueva cita
- `GET /appointments` - Obtener todas las citas
- `GET /appointments/{id}` - Obtener cita específica
- `PUT /appointments/{id}` - Actualizar cita
- `DELETE /appointments/{id}` - Eliminar cita

### Test

- `GET /hello` - Endpoint de prueba
- `POST /hello` - Endpoint de prueba

## 📚 Documentación API

La documentación completa de la API está disponible en Swagger Hub:
**https://app.swaggerhub.com/apis/eduardo-d4f/api-de_citas_medicas/1.0.0**

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd cita-medica-lambda
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar AWS credentials**
   ```bash
   aws configure
   ```

## 🚀 Desarrollo

### Ejecutar localmente
```bash
npm run dev
```

### Compilar TypeScript
```bash
npm run build
```

### Ejecutar tests
```bash
npm test
```

## 📦 Deployment

### Deploy a desarrollo
```bash
npm run deploy:dev
```

### Deploy a producción
```bash
npm run deploy:prod
```

### Deploy general
```bash
npm run deploy
```

## 📊 Estructura del Proyecto

```
├── src/
│   ├── handlers/          # Lambda handlers
│   │   ├── hello.ts       # Handler de prueba
│   │   └── appointment.ts # Handler de citas
│   ├── services/          # Lógica de negocio
│   │   └── dynamodb.ts    # Servicio de base de datos
│   ├── types/             # Definiciones de tipos
│   │   └── index.ts       # Interfaces TypeScript
│   └── utils/             # Utilidades
│       └── response.ts    # Helpers de respuesta
├── serverless.yml         # Configuración Serverless
├── tsconfig.json          # Configuración TypeScript
├── package.json           # Dependencias y scripts
└── README.md             # Documentación
```

## 📝 Modelo de Datos

### Appointment
```typescript
interface Appointment {
  id: string;                    // ID único de la cita
  patientName: string;           // Nombre del paciente
  patientEmail: string;          // Email del paciente
  doctorName: string;            // Nombre del doctor
  specialty: string;             // Especialidad médica
  date: string;                  // Fecha de la cita (YYYY-MM-DD)
  time: string;                  // Hora de la cita (HH:MM)
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;                // Notas adicionales
  createdAt: string;             // Timestamp de creación
  updatedAt: string;             // Timestamp de última actualización
  ttl?: number;                  // Time to live para DynamoDB
}
```

## 🔧 Configuración

### Variables de Entorno
- `NODE_ENV` - Entorno de ejecución
- `APPOINTMENTS_TABLE` - Nombre de la tabla DynamoDB

### AWS Services
- **Lambda**: Ejecución serverless
- **API Gateway**: Endpoints REST
- **DynamoDB**: Base de datos NoSQL
- **CloudWatch**: Logs y monitoreo

## 📋 Ejemplos de Uso

### Crear una cita
```bash
curl -X POST https://your-api-gateway-url/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Juan Pérez",
    "patientEmail": "juan@example.com",
    "doctorName": "Dr. García",
    "specialty": "Cardiología",
    "date": "2024-01-15",
    "time": "14:30",
    "notes": "Primera consulta"
  }'
```

### Obtener todas las citas
```bash
curl -X GET https://your-api-gateway-url/dev/appointments
```

### Actualizar una cita
```bash
curl -X PUT https://your-api-gateway-url/dev/appointments/apt_1234567890_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "notes": "Cita confirmada"
  }'
```

## 🧪 Testing

El proyecto incluye configuración para Jest. Para agregar tests:

1. Crear archivos `*.test.ts` en el directorio correspondiente
2. Ejecutar `npm test` para correr los tests
3. Ejecutar `npm run test:watch` para modo watch

## 📚 Recursos Adicionales

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

