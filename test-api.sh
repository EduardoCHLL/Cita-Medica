#!/bin/bash

# Script para probar la API de Citas Médicas
# Uso: ./test-api.sh [local|aws]

set -e

# Configuración
if [ "$1" = "aws" ]; then
    echo "Usando AWS (reemplaza con tu URL real)"
    BASE_URL="https://tu-api-gateway-url.amazonaws.com/dev"
else
    echo "Usando desarrollo local"
    BASE_URL="http://localhost:3000/dev"
fi

echo "URL Base: $BASE_URL"
echo ""

# Función para mostrar respuestas
show_response() {
    echo "Status: $1"
    echo "Response:"
    echo "$2" | jq '.' 2>/dev/null || echo "$2"
    echo ""
}

# 1. Crear cita médica
echo "=== 1. Creando cita médica ==="
CREATE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "${BASE_URL}/appointments" \
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

HTTP_STATUS="${CREATE_RESPONSE: -3}"
RESPONSE_BODY="${CREATE_RESPONSE%???}"

show_response "$HTTP_STATUS" "$RESPONSE_BODY"

# Extraer el ID de la cita creada
APPOINTMENT_ID=$(echo "$RESPONSE_BODY" | jq -r '.body.id // empty' 2>/dev/null || echo "")

if [ -n "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
    echo "✅ Cita creada exitosamente con ID: $APPOINTMENT_ID"
    echo ""
    
    # 2. Obtener cita específica
    echo "=== 2. Obteniendo cita específica ==="
    GET_RESPONSE=$(curl -s -w "%{http_code}" -X GET "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json")
    
    HTTP_STATUS="${GET_RESPONSE: -3}"
    RESPONSE_BODY="${GET_RESPONSE%???}"
    
    show_response "$HTTP_STATUS" "$RESPONSE_BODY"
    
    # 3. Actualizar cita
    echo "=== 3. Actualizando cita ==="
    UPDATE_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json" \
      -d '{
        "status": "confirmed",
        "notes": "Cita confirmada exitosamente - actualizada"
      }')
    
    HTTP_STATUS="${UPDATE_RESPONSE: -3}"
    RESPONSE_BODY="${UPDATE_RESPONSE%???}"
    
    show_response "$HTTP_STATUS" "$RESPONSE_BODY"
    
    # 4. Eliminar cita
    echo "=== 4. Eliminando cita ==="
    DELETE_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "${BASE_URL}/appointments/$APPOINTMENT_ID" \
      -H "Content-Type: application/json")
    
    HTTP_STATUS="${DELETE_RESPONSE: -3}"
    RESPONSE_BODY="${DELETE_RESPONSE%???}"
    
    show_response "$HTTP_STATUS" "$RESPONSE_BODY"
    
else
    echo "❌ No se pudo extraer el ID de la cita"
    echo "Respuesta completa:"
    echo "$RESPONSE_BODY"
fi

# 5. Obtener todas las citas
echo "=== 5. Obteniendo todas las citas ==="
ALL_RESPONSE=$(curl -s -w "%{http_code}" -X GET "${BASE_URL}/appointments" \
  -H "Content-Type: application/json")

HTTP_STATUS="${ALL_RESPONSE: -3}"
RESPONSE_BODY="${ALL_RESPONSE%???}"

show_response "$HTTP_STATUS" "$RESPONSE_BODY"

echo "=== Pruebas completadas ===" 