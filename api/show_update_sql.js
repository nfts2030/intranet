#!/usr/bin/env node

// This script outputs the SQL commands needed to update the clientes table
// Run this script to see the SQL commands: node show_update_sql.js

console.log(`
-- SQL para actualizar la tabla clientes con columnas de seguimiento de respuestas

-- Agregar columnas para seguimiento de respuestas
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS response_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_message TEXT;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN clientes.response_status IS 'Status of the response (Pendiente, En Progreso, Resuelto, Cerrado)';
COMMENT ON COLUMN clientes.responded_by IS 'User who responded to the incident';
COMMENT ON COLUMN clientes.response_date IS 'Date and time when the response was made';
COMMENT ON COLUMN clientes.response_message IS 'Response message from the support team';

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_response_status ON clientes (response_status);
CREATE INDEX IF NOT EXISTS idx_clientes_responded_by ON clientes (responded_by);

-- Crear vista para incidentes pendientes
CREATE OR REPLACE VIEW pending_incidents AS
SELECT id, nombre, email, categoria, created_at, response_status
FROM clientes
WHERE response_status IN ('Pendiente', 'En Progreso')
ORDER BY created_at DESC;

-- Ejemplo de cómo actualizar un registro con información de respuesta
-- UPDATE clientes 
-- SET response_status = 'Resuelto',
--     responded_by = 'admin',
--     response_date = NOW(),
--     response_message = 'El problema ha sido resuelto satisfactoriamente.'
-- WHERE id = 1;
`);