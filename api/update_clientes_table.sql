-- Script to add response tracking columns to the clientes table

-- Add columns for response tracking
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS response_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_message TEXT;

-- Add comments to describe the new columns
COMMENT ON COLUMN clientes.response_status IS 'Status of the response (Pendiente, En Progreso, Resuelto, Cerrado)';
COMMENT ON COLUMN clientes.responded_by IS 'User who responded to the incident';
COMMENT ON COLUMN clientes.response_date IS 'Date and time when the response was made';
COMMENT ON COLUMN clientes.response_message IS 'Response message from the support team';

-- Create an index on response_status for better query performance
CREATE INDEX IF NOT EXISTS idx_clientes_response_status ON clientes (response_status);

-- Create an index on responded_by for better query performance
CREATE INDEX IF NOT EXISTS idx_clientes_responded_by ON clientes (responded_by);

-- Optional: Create a view for incidents that need response
CREATE OR REPLACE VIEW pending_incidents AS
SELECT id, nombre, email, categoria, created_at, response_status
FROM clientes
WHERE response_status IN ('Pendiente', 'En Progreso')
ORDER BY created_at DESC;