#!/bin/bash

# Comandos CURL rápidos para API de Citas Médicas
# Copia y pega estos comandos según necesites

BASE_URL="http://localhost:3000/dev"

echo "=== Comandos CURL para API de Citas Médicas ==="
echo ""
echo "1. CREAR CITA (POST):"
echo "curl -X POST \"$BASE_URL/appointments\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"insuredId\": \"123456789\","
echo "    \"scheduleId\": 1001,"
echo "    \"countryISO\": \"PE\","
echo "    \"patientName\": \"Juan Pérez García\","
echo "    \"patientEmail\": \"juan.perez@email.com\","
echo "    \"doctorName\": \"Dr. María González\","
echo "    \"specialty\": \"Cardiología\","
echo "    \"date\": \"2024-01-15\","
echo "    \"time\": \"14:30\","
echo "    \"notes\": \"Paciente con antecedentes de hipertensión\""
echo "  }'"
echo ""

echo "2. OBTENER TODAS LAS CITAS (GET):"
echo "curl -X GET \"$BASE_URL/appointments\" \\"
echo "  -H \"Content-Type: application/json\""
echo ""

echo "3. OBTENER CITA ESPECÍFICA (GET):"
echo "curl -X GET \"$BASE_URL/appointments/{ID-DE-LA-CITA}\" \\"
echo "  -H \"Content-Type: application/json\""
echo ""

echo "4. ACTUALIZAR CITA (PUT):"
echo "curl -X PUT \"$BASE_URL/appointments/{ID-DE-LA-CITA}\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"status\": \"confirmed\","
echo "    \"notes\": \"Cita confirmada exitosamente\""
echo "  }'"
echo ""

echo "5. ELIMINAR CITA (DELETE):"
echo "curl -X DELETE \"$BASE_URL/appointments/{ID-DE-LA-CITA}\" \\"
echo "  -H \"Content-Type: application/json\""
echo ""

echo "=== Para AWS, reemplaza la URL base con tu endpoint real ==="
echo "BASE_URL=\"https://tu-api-gateway-url.amazonaws.com/dev\"" 