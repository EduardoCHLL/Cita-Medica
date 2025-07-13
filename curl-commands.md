# Comandos CURL para API de Citas Médicas

## Configuración Base
```bash
# URL base para desarrollo local
BASE_URL="http://localhost:3000/dev"

# URL base para AWS (reemplaza con tu URL real después del deploy)
# BASE_URL="https://tu-api-gateway-url.amazonaws.com/dev"
```

## 1. Crear una Cita Médica (POST)

```bash
curl -X POST "${BASE_URL}/appointments" \
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

### Ejemplo con datos de Chile:
```bash
curl -X POST "${BASE_URL}/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "987654321",
    "scheduleId": 2001,
    "countryISO": "CL",
    "patientName": "Ana Silva Rodríguez",
    "patientEmail": "ana.silva@email.com",
    "doctorName": "Dr. Carlos Mendoza",
    "specialty": "Dermatología",
    "date": "2024-01-20",
    "time": "10:00",
    "notes": "Consulta de seguimiento"
  }'
```

## 2. Obtener Todas las Citas (GET)

```bash
curl -X GET "${BASE_URL}/appointments" \
  -H "Content-Type: application/json"
```

## 3. Obtener una Cita Específica (GET)

```bash
# Reemplaza {appointment-id} con el ID real de la cita
curl -X GET "${BASE_URL}/appointments/{appointment-id}" \
  -H "Content-Type: application/json"
```

### Ejemplo con ID específico:
```bash
curl -X GET "${BASE_URL}/appointments/abc123-def456-ghi789" \
  -H "Content-Type: application/json"
```

## 4. Actualizar una Cita (PUT)

```bash
# Reemplaza {appointment-id} con el ID real de la cita
curl -X PUT "${BASE_URL}/appointments/{appointment-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Juan Pérez García Actualizado",
    "patientEmail": "juan.nuevo@email.com",
    "doctorName": "Dr. María González",
    "specialty": "Cardiología",
    "date": "2024-01-16",
    "time": "15:00",
    "status": "confirmed",
    "notes": "Cita confirmada - paciente con antecedentes de hipertensión"
  }'
```

### Ejemplo con ID específico:
```bash
curl -X PUT "${BASE_URL}/appointments/abc123-def456-ghi789" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "notes": "Cita confirmada exitosamente"
  }'
```

## 5. Eliminar una Cita (DELETE)

```bash
# Reemplaza {appointment-id} con el ID real de la cita
curl -X DELETE "${BASE_URL}/appointments/{appointment-id}" \
  -H "Content-Type: application/json"
```

### Ejemplo con ID específico:
```bash
curl -X DELETE "${BASE_URL}/appointments/abc123-def456-ghi789" \
  -H "Content-Type: application/json"
```

## Script de Prueba Completo

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/dev"

echo "=== Creando cita médica ==="
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/appointments" \
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
  }')

echo "Respuesta de creación:"
echo "$CREATE_RESPONSE" | jq '.'

# Extraer el ID de la cita creada
APPOINTMENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.body.id // empty')
if [ -n "$APPOINTMENT_ID" ]; then
    echo "ID de cita creada: $APPOINTMENT_ID"
    
    echo -e "\n=== Obteniendo cita específica ==="
    curl -s -X GET "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json" | jq '.'
    
    echo -e "\n=== Actualizando cita ==="
    curl -s -X PUT "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json" \
      -d '{
        "status": "confirmed",
        "notes": "Cita confirmada exitosamente"
      }' | jq '.'
    
    echo -e "\n=== Eliminando cita ==="
    curl -s -X DELETE "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json" | jq '.'
else
    echo "No se pudo extraer el ID de la cita"
fi

echo -e "\n=== Obteniendo todas las citas ==="
curl -s -X GET "${BASE_URL}/appointments" \
  -H "Content-Type: application/json" | jq '.'
```

## Notas Importantes

1. **Para desarrollo local**: Usa `http://localhost:3000/dev`
2. **Para AWS**: Reemplaza con tu URL real de API Gateway
3. **Campos requeridos**: `insuredId`, `scheduleId`, `countryISO`
4. **Estados válidos**: `pending`, `scheduled`, `confirmed`, `cancelled`, `completed`
5. **Países soportados**: `PE` (Perú), `CL` (Chile)

## Instalación de jq (para formatear JSON)

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# CentOS/RHEL
sudo yum install jq
```

## Deploy y Prueba

```bash
# 1. Deploy local
npm run dev

# 2. En otra terminal, ejecutar los comandos CURL

# 3. Para deploy a AWS
npm run deploy:dev
``` 