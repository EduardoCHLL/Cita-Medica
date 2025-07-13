# Pruebas con CURL - API de Citas Médicas

## 🚀 Inicio Rápido

### 1. Iniciar el servidor local
```bash
npm run dev
```

### 2. Ejecutar pruebas automáticas
```bash
./test-api.sh
```

### 3. Ver comandos disponibles
```bash
./quick-curl.sh
```

## 📋 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/appointments` | Crear nueva cita |
| GET | `/appointments` | Obtener todas las citas |
| GET | `/appointments/{id}` | Obtener cita específica |
| PUT | `/appointments/{id}` | Actualizar cita |
| DELETE | `/appointments/{id}` | Eliminar cita |

## 🔧 Comandos CURL Básicos

### Crear Cita (POST)
```bash
curl -X POST "http://localhost:3000/dev/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "123456789",
    "scheduleId": 1001,
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

### Obtener Todas las Citas (GET)
```bash
curl -X GET "http://localhost:3000/dev/appointments" \
  -H "Content-Type: application/json"
```

### Obtener Cita Específica (GET)
```bash
curl -X GET "http://localhost:3000/dev/appointments/{ID-DE-LA-CITA}" \
  -H "Content-Type: application/json"
```

### Actualizar Cita (PUT)
```bash
curl -X PUT "http://localhost:3000/dev/appointments/{ID-DE-LA-CITA}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "notes": "Cita confirmada exitosamente"
  }'
```

### Eliminar Cita (DELETE)
```bash
curl -X DELETE "http://localhost:3000/dev/appointments/{ID-DE-LA-CITA}" \
  -H "Content-Type: application/json"
```

## 📝 Campos Requeridos

Para crear una cita, estos campos son **obligatorios**:
- `insuredId`: ID del asegurado
- `scheduleId`: ID del horario
- `countryISO`: Código del país (PE, CL)

## 🌍 Países Soportados

- `PE`: Perú
- `CL`: Chile

## 📊 Estados de Cita

- `pending`: Pendiente
- `scheduled`: Programada
- `confirmed`: Confirmada
- `cancelled`: Cancelada
- `completed`: Completada

## 🛠️ Herramientas Útiles

### Instalar jq (formateador JSON)
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# CentOS/RHEL
sudo yum install jq
```

### Ejemplo con jq
```bash
curl -X GET "http://localhost:3000/dev/appointments" | jq '.'
```

## 🔍 Debugging

### Ver respuesta completa
```bash
curl -v -X POST "http://localhost:3000/dev/appointments" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Ver solo headers
```bash
curl -I -X GET "http://localhost:3000/dev/appointments"
```

## 🚀 Deploy a AWS

### 1. Deploy a desarrollo
```bash
npm run deploy:dev
```

### 2. Obtener URL de API Gateway
```bash
aws apigateway get-rest-apis --region us-east-1
```

### 3. Actualizar URL en scripts
Reemplaza `http://localhost:3000/dev` con tu URL de API Gateway.

## 📁 Archivos de Prueba

- `test-api.sh`: Script completo de pruebas automáticas
- `quick-curl.sh`: Comandos CURL de referencia
- `curl-commands.md`: Documentación detallada
- `CURL_TESTING.md`: Esta guía

## ⚠️ Notas Importantes

1. **Desarrollo local**: Usa `http://localhost:3000/dev`
2. **AWS**: Usa tu URL de API Gateway
3. **CORS**: Está habilitado para todos los orígenes
4. **Timeouts**: Configurados para 30 segundos
5. **Logs**: Revisa CloudWatch para debugging en AWS

## 🐛 Solución de Problemas

### Error 500
- Verifica que DynamoDB esté configurado
- Revisa los logs en CloudWatch

### Error 400
- Verifica que todos los campos requeridos estén presentes
- Valida el formato JSON

### Error 404
- Verifica que el endpoint esté correcto
- Confirma que el ID de la cita existe

### Error de CORS
- Verifica que CORS esté habilitado en serverless.yml
- Confirma que estés usando el método HTTP correcto 